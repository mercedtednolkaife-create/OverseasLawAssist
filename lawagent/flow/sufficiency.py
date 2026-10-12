"""要素充分性核验模块 (Element Sufficiency)
对齐技术方案第 5.2 节 S5 节点与质量门禁 V10：
- 评估各法律要素（ElementState）在当前检索结果下的证据覆盖度
- 判定状态：covered（充分覆盖）、partial（部分覆盖/仅有总则）、missing（缺失核心规范）
- 提取检索缺口（gap_note），为 S4 检索改写提供针对性指导
"""

import json
from typing import List, Dict, Any, Optional
from lawagent.core.types import LegalQuestion, ElementState, Evidence
from lawagent.llm.client import LLMClient


SUFFICIENCY_SYSTEM_PROMPT = """你是一名严谨的德国联邦法域外法查明研究员。
你的任务是评估给定的法律检索证据（Evidence）是否充分覆盖了特定的德国法规范构成要件（Tatbestandsmerkmale）。

判定标准：
1. covered：检索证据中包含直接规制该要件的德国联邦法具体法条（如精确到条、款、项）或具有拘束力/参考价值的联邦最高法院（BGH）判例裁判要旨，权利基础与要件内涵明确。
2. partial：仅检索到上位法或一般性原则条款，或缺少具体效果规定（如仅有总则定义，缺少违约救济对应条款），需要进一步下钻检索。
3. missing：完全未检索到能够支撑该要件的有效规范或裁判，或检索结果与该要件无关。

请以 JSON 格式输出评估结果，格式如下：
{
  "elements": [
    {
      "element_id": "e1",
      "status": "covered" | "partial" | "missing",
      "linked_eids": ["E1", "E2"],
      "gap_note": "若为 partial 或 missing，说明具体缺少什么规范；若 covered 则为 null"
    }
  ]
}
"""


def evaluate_sufficiency_rule(
    question: LegalQuestion,
    elements: List[ElementState],
    evidence_dict: Dict[str, Evidence]
) -> List[ElementState]:
    """规则快速初筛：基于 must_norms 和 ref_id 匹配度"""
    updated_elements: List[ElementState] = []
    eids_by_norm: Dict[str, List[str]] = {}
    
    for eid, ev in evidence_dict.items():
        clean_ref = ev.ref_id.replace("NORM:", "").replace("CASE:", "").strip()
        eids_by_norm.setdefault(clean_ref, []).append(eid)
        # Also index law abbreviation and section
        parts = clean_ref.split(":")
        if len(parts) >= 2:
            eids_by_norm.setdefault(f"{parts[0]}:{parts[1]}", []).append(eid)

    for elem in elements:
        # Check if already has links or if must_norms are present
        matched_eids = []
        for must in question.must_norms:
            clean_must = must.replace("NORM:", "").strip()
            if clean_must in eids_by_norm:
                matched_eids.extend(eids_by_norm[clean_must])
            else:
                for norm_key, ev_list in eids_by_norm.items():
                    if clean_must in norm_key or norm_key in clean_must:
                        matched_eids.extend(ev_list)

        matched_eids = list(dict.fromkeys(matched_eids))
        
        # Default state based on rule
        status = "missing"
        gap_note = f"尚未检索到针对要素【{elem.name_zh}】的核心条文"
        if matched_eids:
            status = "covered"
            gap_note = None
        elif len(evidence_dict) > 0:
            status = "partial"
            gap_note = f"已检索到相关法规，但需进一步精确定位到【{elem.name_zh}】具体法条"

        elem_copy = elem.model_copy(deep=True)
        elem_copy.status = status
        elem_copy.gap_note = gap_note
        if matched_eids:
            for eid in matched_eids:
                if not any(l.eid == eid for l in elem_copy.links):
                    from lawagent.core.types import ElementEvidence
                    elem_copy.links.append(ElementEvidence(eid=eid, relation="supports"))
        updated_elements.append(elem_copy)

    return updated_elements


async def evaluate_sufficiency_llm(
    question: LegalQuestion,
    elements: List[ElementState],
    evidence_dict: Dict[str, Evidence],
    client: Optional[LLMClient] = None
) -> List[ElementState]:
    """通过大模型进行深度充分性判定与要素链接"""
    if not elements or not evidence_dict:
        return evaluate_sufficiency_rule(question, elements, evidence_dict)

    if client is None:
        client = LLMClient()

    evidence_summary = []
    for eid, ev in evidence_dict.items():
        evidence_summary.append({
            "eid": eid,
            "ref_id": ev.ref_id,
            "text_de": ev.text_de[:200] + ("..." if len(ev.text_de) > 200 else "")
        })

    elements_summary = [
        {"element_id": el.element_id, "name_zh": el.name_zh}
        for el in elements
    ]

    prompt = f"""【法律问题】
{question.text_zh} (QID: {question.qid})

【需要覆盖的构成要件】
{json.dumps(elements_summary, ensure_ascii=False, indent=2)}

【已检索到的证据片段】
{json.dumps(evidence_summary, ensure_ascii=False, indent=2)}

请根据上述判定标准，评估每个要件的覆盖情况并输出 JSON。"""

    try:
        import asyncio
        res = await asyncio.wait_for(
            client.chat_json(
                task="reasoning",
                system_prompt=SUFFICIENCY_SYSTEM_PROMPT,
                user_prompt=prompt,
                temperature=0.0,
                retries=0
            ),
            timeout=16.0
        )
        items = res.get("elements", [])
        item_map = {it["element_id"]: it for it in items if "element_id" in it}

        updated_elements: List[ElementState] = []
        for elem in elements:
            elem_copy = elem.model_copy(deep=True)
            if elem.element_id in item_map:
                eval_data = item_map[elem.element_id]
                raw_status = eval_data.get("status", "partial")
                if raw_status in ("covered", "partial", "missing"):
                    elem_copy.status = raw_status
                elem_copy.gap_note = eval_data.get("gap_note")
                linked = eval_data.get("linked_eids", [])
                for eid in linked:
                    if eid in evidence_dict and not any(l.eid == eid for l in elem_copy.links):
                        from lawagent.core.types import ElementEvidence
                        elem_copy.links.append(ElementEvidence(eid=eid, relation="supports"))
            updated_elements.append(elem_copy)
        return updated_elements
    except Exception:
        # Fallback to rule evaluation
        return evaluate_sufficiency_rule(question, elements, evidence_dict)
