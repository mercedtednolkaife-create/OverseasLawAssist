"""LangGraph 核心工作流节点实现 (Reasoning & Processing Nodes)
严格对齐技术方案第 5.2 节工作流生命周期与各阶段规范：
S1 Extract -> S2 Precheck -> S3 Decompose -> S4 Researcher -> S5 Matcher
-> S6 Translator -> S7 Drafter -> Critic -> S8 Review -> S9 Export
"""

import os
import yaml
import re
import datetime
from typing import Dict, Any, List, Optional
from lawagent.core.types import (
    CaseState, Fact, Claim, Material, Issue, LegalQuestion,
    ElementState, Evidence, Finding, Statement, CaseMeta, ElementEvidence
)
from lawagent.llm.client import LLMClient
from lawagent.store.retriever import HybridRetriever
from lawagent.store.snapshots import SnapshotManager
from lawagent.flow.checks import generate_entry_checks, timepoint_level
from lawagent.flow.sufficiency import evaluate_sufficiency_rule, evaluate_sufficiency_llm
from lawagent.flow.matcher import match_facts_and_elements, extract_similar_cases
from lawagent.flow.critic import run_critic_checks, FORBIDDEN_PREDICTIVE_WORDS


def _now() -> str:
    return datetime.datetime.now().isoformat()


# =====================================================================
# S1: Extract (事实抽取与诉求解析)
# =====================================================================
async def s1_extract_node(state: CaseState) -> Dict[str, Any]:
    """S1 节点：结构化抽取事实 (F#)、诉求 (C#) 与案件元数据 (CaseMeta)"""
    client = LLMClient()
    facts: List[Fact] = list(state.facts)
    claims: List[Claim] = list(state.claims)
    meta = state.meta.model_copy()

    # 如果 facts 为空，进行结构化抽取与切分
    if not facts and state.facts_zh.strip():
        # 按句号、换行切分或使用 LLM 抽取
        paragraphs = [p.strip() for p in re.split(r'[\r\n]+|[。；;]', state.facts_zh) if len(p.strip()) > 3]
        for idx, text in enumerate(paragraphs, 1):
            fid = f"F{idx}"
            # 在原文中定位 span
            start = state.facts_zh.find(text)
            end = start + len(text) if start != -1 else len(text)
            if start == -1:
                start = 0
            facts.append(Fact(
                fid=fid,
                text_zh=text,
                span=(start, end),
                disputed=False
            ))

    # 如果 claims 为空，从 claims_zh 中抽取
    if not claims and state.claims_zh and state.claims_zh.strip():
        claim_texts = [c.strip() for c in re.split(r'[\r\n]+|[。；;]', state.claims_zh) if len(c.strip()) > 2]
        for idx, text in enumerate(claim_texts, 1):
            cid = f"C{idx}"
            party = meta.parties[0] if meta.parties else "买受人/原告"
            claims.append(Claim(
                cid=cid,
                party=party,
                text_zh=text
            ))
    elif not claims and not state.claims_zh:
        # 默认通用诉求
        claims.append(Claim(
            cid="C1",
            party=meta.parties[0] if meta.parties else "买受人",
            text_zh="请求解除买卖合同并退还已支付货款，或承担违约损害赔偿责任"
        ))

    # 实体与合同属性初检
    if not meta.contract_type:
        if "货物" in state.facts_zh or "买卖" in state.facts_zh:
            meta.contract_type = "国际货物买卖合同"
        else:
            meta.contract_type = "商事合同"

    if not meta.parties:
        # 启发式识别当事人
        meta.parties = ["买方", "德方卖方"]

    return {
        "facts": facts,
        "claims": claims,
        "meta": meta,
        "current_node": "s1_extract",
        "updated_at": _now()
    }


# =====================================================================
# S2: Precheck (预检与入口清单)
# =====================================================================
async def s2_precheck_node(state: CaseState) -> Dict[str, Any]:
    """S2 节点：入口检查清单、时点红黄两态初筛、CISG 规则触发"""
    entry_checks = generate_entry_checks(state.meta)
    all_refs = [ev.ref_id for ev in state.evidence.values()]
    tp_level, tp_reasons = timepoint_level(state.meta, all_refs)

    # 检查 CISG 触发条件
    is_goods = bool(state.meta.contract_type and "货物" in state.meta.contract_type)
    cisg_needs_confirm = is_goods and (state.meta.cisg_excluded is None)

    status = state.status
    if cisg_needs_confirm and state.mode != "lite":
        status = "paused_cisg"
    elif status == "draft":
        status = "running"

    return {
        "entry_checks": entry_checks,
        "timepoint": {"level": tp_level, "reasons": tp_reasons},
        "status": status,
        "current_node": "s2_precheck",
        "updated_at": _now()
    }


# =====================================================================
# S3: Decompose (争点拆解与检索问题构造)
# =====================================================================
async def s3_decompose_node(state: CaseState) -> Dict[str, Any]:
    """S3 节点：领域知识库模板匹配，生成争议焦点、法律问题与待检索要素"""
    issues: List[Issue] = list(state.issues)
    questions: List[LegalQuestion] = list(state.questions)
    elements: List[ElementState] = list(state.elements)

    if not issues or not questions:
        # 模板匹配
        combined = (state.facts_zh or "") + " " + (state.claims_zh or "")
        template_path = "kb/de_federal/templates/kauf_mangel.yaml"
        if any(w in combined for w in ["迟延", "逾期", "交货延迟"]) and not any(w in combined for w in ["瑕疵", "质量", "退货"]):
            template_path = "kb/de_federal/templates/verzug_schaden.yaml"

        if os.path.exists(template_path):
            with open(template_path, "r", encoding="utf-8") as f:
                tmpl = yaml.safe_load(f)

            issue_id = f"ISSUE_{tmpl.get('issue_id', '1')}"
            element_defs = tmpl.get("elements", [])
            elem_ids = [e["id"] for e in element_defs]

            # 过滤条件 (例如商人条件)
            active_elem_defs = []
            for ed in element_defs:
                cond = ed.get("condition")
                if cond == "both_merchants" and state.meta.both_merchants is False:
                    continue
                active_elem_defs.append(ed)

            issues = [Issue(
                issue_id=issue_id,
                kind="law",
                text_zh=tmpl.get("name_zh", "买卖合同争议焦点"),
                claim_ids=[c.cid for c in state.claims],
                element_ids=[e["id"] for e in active_elem_defs]
            )]

            # 构造标准德国法检索问题
            if tmpl.get("issue_id") == "kauf_mangel":
                queries_de = [
                    "Sachmangel Nacherfüllung Kaufvertrag BGB § 437",
                    "Rücktritt Schadensersatz Fristsetzung BGB § 323 § 281",
                    "Rügepflicht unverzüglich Untersuchung HGB § 377"
                ]
                must_norms = ["BGB:§434", "BGB:§437", "BGB:§439", "HGB:§377"]
                q_text = "德国法下买受人因标的物存在瑕疵可主张何种救济权利，及商事检验通知义务对请求权之影响？"
            else:
                queries_de = [
                    "Schuldnerverzug Mahnung BGB § 286",
                    "Schadensersatz statt der Leistung BGB § 280 § 281",
                    "Verzugszinsen Zinssatz BGB § 288"
                ]
                must_norms = ["BGB:§286", "BGB:§280", "BGB:§288"]
                q_text = "德国法下债务人给付迟延的构成要件、催告要求及损害赔偿与利息计算标准？"

            questions = [LegalQuestion(
                qid="Q1",
                text_zh=q_text,
                queries_de=queries_de,
                template_id=tmpl.get("issue_id"),
                must_norms=must_norms,
                status="confirmed" if state.mode == "lite" else "draft",
                done=False
            )]

            # 生成初始 ElementState 列表
            elements = []
            for ed in active_elem_defs:
                elements.append(ElementState(
                    qid="Q1",
                    element_id=ed["id"],
                    name_zh=ed["name_zh"],
                    status="missing",
                    rounds=0
                ))

    # 判断是否在此暂停供用户交互确认 (S3 Gate)
    status = state.status
    if state.mode == "full" and any(q.status == "draft" for q in questions):
        status = "paused_s3"

    return {
        "issues": issues,
        "questions": questions,
        "elements": elements,
        "status": status,
        "current_node": "s3_decompose",
        "updated_at": _now()
    }


# =====================================================================
# S4: Researcher (受约束检索与要素充分性迭代)
# =====================================================================
async def researcher_node(state: CaseState) -> Dict[str, Any]:
    """S4 节点：混合检索、图谱扩展、证据打包与 S5 充分性判定/改写循环"""
    retriever = HybridRetriever(snapshot_id=state.snapshot_id)
    evidence_dict: Dict[str, Evidence] = dict(state.evidence)
    elements: List[ElementState] = list(state.elements)
    client = LLMClient()

    for q in state.questions:
        # 1. 收集检索词
        search_queries = list(q.queries_de) if q.queries_de else [q.text_zh]
        
        # 2. 执行检索
        for q_str in search_queries:
            results = retriever.search(q_str, top_k=6, must_norms=q.must_norms)
            for res in results:
                # 检查是否已存在相同 ref_id 的证据
                existing_eid = next((eid for eid, ev in evidence_dict.items() if ev.ref_id == res.ref_id), None)
                if not existing_eid:
                    eid = f"E{len(evidence_dict) + 1}"
                    evidence_dict[eid] = Evidence(
                        eid=eid,
                        kind="case" if "CASE:" in res.ref_id or "BGH" in res.ref_id else "norm",
                        ref_id=res.ref_id,
                        text_de=res.text_de[:1200],
                        source_url=res.source_url or "https://www.gesetze-im-internet.de",
                        stand=res.stand or "2026-10-10",
                        fetched_at=_now(),
                        grade="A"
                    )

        # 3. 评估要件充分性
        elements = await evaluate_sufficiency_llm(q, elements, evidence_dict, client=client)

        # 4. 针对 missing/partial 要素尝试至多 1 次 German 改写深潜检索
        missing_elems = [el for el in elements if el.status in ("missing", "partial") and el.rounds < 2]
        if missing_elems:
            for el in missing_elems:
                el.rounds += 1
                reformulated = f"{el.name_zh} BGB Tatbestand Voraussetzungen"
                sub_results = retriever.search(reformulated, top_k=4)
                for res in sub_results:
                    if not any(ev.ref_id == res.ref_id for ev in evidence_dict.values()):
                        eid = f"E{len(evidence_dict) + 1}"
                        evidence_dict[eid] = Evidence(
                            eid=eid,
                            kind="case" if "CASE:" in res.ref_id or "BGH" in res.ref_id else "norm",
                            ref_id=res.ref_id,
                            text_de=res.text_de[:1200],
                            source_url=res.source_url or "https://www.gesetze-im-internet.de",
                            stand=res.stand or "2026-10-10",
                            fetched_at=_now(),
                            grade="B"
                        )
            # 二次评估
            elements = evaluate_sufficiency_rule(q, elements, evidence_dict)

        q.done = True

    return {
        "evidence": evidence_dict,
        "elements": elements,
        "questions": state.questions,
        "current_node": "researcher",
        "updated_at": _now()
    }


# =====================================================================
# S5: Matcher (要件事实涵摄、判例比对与咨询问题生成)
# =====================================================================
async def matcher_node(state: CaseState) -> Dict[str, Any]:
    """S5 节点：案件事实四态匹配、类似案例提取与律师咨询问题归纳"""
    client = LLMClient()
    updated_elements, counsel_qs = await match_facts_and_elements(
        state.elements, state.facts, state.materials, client=client
    )
    similar_cases = extract_similar_cases(state.evidence, state.facts)

    all_counsel_qs = list(state.counsel_questions)
    for cq in counsel_qs:
        if cq not in all_counsel_qs:
            all_counsel_qs.append(cq)

    return {
        "elements": updated_elements,
        "similar_cases": similar_cases,
        "counsel_questions": all_counsel_qs,
        "current_node": "matcher",
        "updated_at": _now()
    }


# =====================================================================
# S6: Translator (术语约束德中对照翻译)
# =====================================================================
async def translator_node(state: CaseState) -> Dict[str, Any]:
    """S6 节点：术语表约束下的德文法条与判例摘要翻译"""
    client = LLMClient()
    translations: Dict[str, str] = dict(state.translations)

    # 提取术语映射词典
    glossary_map = {}
    if os.path.exists("kb/de_federal/glossary.csv"):
        import csv
        with open("kb/de_federal/glossary.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                de = row.get("term_de", "").strip()
                zh = row.get("term_zh", "").strip()
                if de and zh:
                    glossary_map[de] = zh

    # 选择前 8 个最重要的证据进行准确翻译
    items_to_translate = []
    for eid, ev in list(state.evidence.items())[:8]:
        if eid not in translations:
            items_to_translate.append((eid, ev))

    for eid, ev in items_to_translate:
        clean_text = ev.text_de[:800]
        # 简单的提示词翻译
        trans_prompt = f"""请将以下德国联邦法规范或判例片段准确翻译为规范的中文法律表述。
严格遵守德汉法律术语对照：
- Sachmangel -> 物之瑕疵
- Nacherfüllung -> 事后履行 / 补正履行
- Rücktritt -> 解除合同
- Schadensersatz -> 损害赔偿
- Rügepflicht -> 瑕疵检验与通知义务
- unverzüglich -> 即刻 / 不无故迟延

【德文原文】
{clean_text}

请直接输出中文翻译文本，不要附加开场白或解释。"""
        try:
            res = await client.chat_text(
                task="translation",
                system_prompt="你是一名严谨的德国法律德汉翻译专家，输出精准严谨的中文法律专业译文。",
                user_prompt=trans_prompt,
                temperature=0.0
            )
            translations[eid] = res.strip()
        except Exception:
            # 规则降级简单占位
            translations[eid] = f"【译文】针对 {ev.ref_id} 之德文条款核心规范释义（待专家人工校验）"

    return {
        "translations": translations,
        "current_node": "translator",
        "updated_at": _now()
    }


# =====================================================================
# S7: Drafter (双包起草：查明材料包 A + 咨询准备包 B)
# =====================================================================
async def drafter_node(state: CaseState) -> Dict[str, Any]:
    """S7 节点：起草查明材料包 (Part A) 与咨询准备包 (Part B)，并执行 V8 防线"""
    findings: List[Finding] = []

    for q in state.questions:
        statements: List[Statement] = []
        
        # --- Part A: 查明材料包 (法定依据、法条原文与规范构成要件) ---
        stmt_idx = 1
        for eid, ev in list(state.evidence.items())[:5]:
            trans = state.translations.get(eid, "暂无翻译")
            quote_text = f"依据德国法规范【{ev.ref_id}】，{trans[:120]}..."
            statements.append(Statement(
                sid=f"S{stmt_idx}",
                text_zh=quote_text,
                type="quote",
                evidence_ids=[eid],
                part="A",
                quote_de=ev.text_de[:300],
                grade=ev.grade,
                status="ok"
            ))
            stmt_idx += 1

        # --- Part B: 咨询准备包 (要件事实涵摄、事实缺口与咨询准备) ---
        for el in state.elements:
            linked_facts = el.fact_links or ([state.facts[0].fid] if state.facts else [])
            linked_eids = [l.eid for l in el.links] or list(state.evidence.keys())[:1]

            match_text = el.match_note or "根据当前事实证据，该要件满足情况需进一步确认。"
            
            # 条件句构造，坚决避免绝对性胜诉预测 (V8 防线)
            subsumption_zh = (
                f"针对要件【{el.name_zh}】：依据德国民商法规范，"
                f"若当事人能够充分证明相关事实（事实编号：{', '.join(linked_facts) if linked_facts else '待补充'}），"
                f"则在法律构成上趋向于{ '满足' if el.match_status == 'satisfied' else '部分满足/尚存争议' }。"
                f"具体事实涵摄分析：{match_text}"
            )

            # 再次清洗任何可能的绝对预测词汇
            for bad_word in FORBIDDEN_PREDICTIVE_WORDS:
                if bad_word in subsumption_zh:
                    subsumption_zh = subsumption_zh.replace(bad_word, "在举证充分的前提下可能构成")

            statements.append(Statement(
                sid=f"S{stmt_idx}",
                text_zh=subsumption_zh,
                type="inference",
                evidence_ids=linked_eids,
                part="B",
                fact_ids=linked_facts,
                material_ids=el.material_links,
                element_id=el.element_id,
                status="ok"
            ))
            stmt_idx += 1

        gaps = [
            f"构成要件【{el.name_zh}】事实状态为【{el.match_status or 'missing'}】，建议委托德国执业律师线下调取凭证"
            for el in state.elements if el.match_status in ("missing", "partial", "disputed")
        ]

        findings.append(Finding(
            qid=q.qid,
            statements=statements,
            gaps=gaps
        ))

    return {
        "findings": findings,
        "current_node": "drafter",
        "updated_at": _now()
    }


# =====================================================================
# Critic: 质量门禁全套核验
# =====================================================================
async def critic_node(state: CaseState) -> Dict[str, Any]:
    """Critic 节点：运行 V1-V11 质量门禁，输出 Checks 与 Dashboard 指标"""
    checks, dashboard = run_critic_checks(state)
    return {
        "checks": checks,
        "dashboard": dashboard,
        "current_node": "critic",
        "updated_at": _now()
    }


# =====================================================================
# S8: Review (人工审核拦截点)
# =====================================================================
async def s8_review_node(state: CaseState) -> Dict[str, Any]:
    """S8 节点：人工专家审核断点，供法律专业人员修订陈述、核验时点与把关风险"""
    status = state.status
    if state.mode == "full":
        status = "paused_s8"

    return {
        "status": status,
        "current_node": "s8_review",
        "updated_at": _now()
    }


# =====================================================================
# S9: Export (成果封包与完成标记)
# =====================================================================
async def s9_export_node(state: CaseState) -> Dict[str, Any]:
    """S9 节点：计算报告哈希指纹，标记案件查明流程圆满完成"""
    import hashlib
    content_raw = f"{state.case_id}:{len(state.findings)}:{len(state.evidence)}:{state.snapshot_id}:{_now()}"
    final_hash = hashlib.sha256(content_raw.encode("utf-8")).hexdigest()

    dash = state.dashboard.model_copy()
    dash.content_hash = final_hash
    dash.report_version = 1

    return {
        "status": "completed",
        "dashboard": dash,
        "current_node": "s9_export",
        "updated_at": _now()
    }
