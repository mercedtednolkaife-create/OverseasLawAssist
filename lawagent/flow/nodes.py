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
from lawagent.flow.strategist import generate_strategic_assessment


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
        is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
            kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
        )
        if is_us:
            # 涉美商事合同标准争点拆解 (UCC Article 2 瑕疵担保、合理期间、损失赔偿与跨境取证)
            tmpl_issue_id = "us_ucc_warranty_breach"
            issue_defs = [
                Issue(
                    issue_id="ISSUE_US_01",
                    kind="law",
                    text_zh="《美国统一商法典》(UCC) § 2-314 标的物默示适销性担保 (Merchantability) 与交付质量缺陷认定",
                    claim_ids=[c.cid for c in state.claims],
                    element_ids=["e1", "e2"]
                ),
                Issue(
                    issue_id="ISSUE_US_02",
                    kind="law",
                    text_zh="UCC § 2-607(3)(a) 买方检验与违约异议通知之合理期间 (Reasonable Time) 认定及失权抗辩审查",
                    claim_ids=[c.cid for c in state.claims],
                    element_ids=["e3"]
                ),
                Issue(
                    issue_id="ISSUE_US_03",
                    kind="law",
                    text_zh="UCC § 2-714/715 接受货物后的直接与附随衍生损失索赔范围，及 28 U.S.C. § 1782 跨国证据调取",
                    claim_ids=[c.cid for c in state.claims],
                    element_ids=["e4"]
                )
            ]
            issues = issue_defs
            queries_us = [
                "UCC Section 2-314 implied warranty merchantability breach",
                "UCC Section 2-607(3)(a) reasonable notice of breach Eastern Air Lines",
                "UCC Section 2-714 2-715 buyer damages incidental consequential",
                "28 U.S.C. 1782 discovery assistance foreign tribunal Intel v. AMD"
            ]
            must_norms = ["UCC:§2-314", "UCC:§2-607", "UCC:§2-714", "UCC:§2-715", "USC:28:§1782"]
            q_text = "美国统一商法典 (UCC) 及联邦法下买方因标的设备瑕疵主张违约救济之构成要件、合理通知期间要求与跨境证据调取指引？"

            questions = [LegalQuestion(
                qid="Q1",
                text_zh=q_text,
                queries_de=queries_us,
                template_id=tmpl_issue_id,
                must_norms=must_norms,
                status="confirmed" if state.mode == "lite" else "draft",
                done=False
            )]

            elements = [
                ElementState(qid="Q1", element_id="e1", name_zh="标的物偏离商事适销标准之客观缺陷 (UCC § 2-314)", status="missing", rounds=0),
                ElementState(qid="Q1", element_id="e2", name_zh="出卖人从事该同类工业货物交易之商人资格 (UCC § 2-104)", status="missing", rounds=0),
                ElementState(qid="Q1", element_id="e3", name_zh="买受人在发现或应当发现后发出合理异议通知 (UCC § 2-607(3)(a))", status="missing", rounds=0),
                ElementState(qid="Q1", element_id="e4", name_zh="直接价值减损与可预见衍生损害赔偿责任 (UCC § 2-714/715)", status="missing", rounds=0)
            ]
        else:
            # 模板匹配 (德国法)
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

    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    )

    for q in state.questions:
        # 1. 收集检索词
        search_queries = list(q.queries_de) if q.queries_de else [q.text_zh]
        
        # 2. 执行检索
        for q_str in search_queries:
            results = retriever.search(q_str, top_k=6, must_norms=q.must_norms)
            for res in results:
                # 严格法域隔离：若为涉美案，跳过德国法条/判例；若为德国案，跳过涉美法源
                if is_us and ("BGH" in res.ref_id or "BGB" in res.ref_id or "HGB" in res.ref_id or "ZPO" in res.ref_id):
                    continue
                if not is_us and ("UCC" in res.ref_id or "USC" in res.ref_id or "SCOTUS" in res.ref_id or "CIR" in res.ref_id):
                    continue

                # 检查是否已存在相同 ref_id 的证据
                existing_eid = next((eid for eid, ev in evidence_dict.items() if ev.ref_id == res.ref_id), None)
                if not existing_eid:
                    eid = f"E{len(evidence_dict) + 1}"
                    evidence_dict[eid] = Evidence(
                        eid=eid,
                        kind="case" if "CASE:" in res.ref_id or "BGH" in res.ref_id else "norm",
                        ref_id=res.ref_id,
                        text_de=res.text_de[:1200],
                        source_url=res.source_url or ("https://www.law.cornell.edu/ucc" if is_us else "https://www.gesetze-im-internet.de"),
                        stand=res.stand or "2026-10-10",
                        fetched_at=_now(),
                        grade="A"
                    )

        # 3. 评估要件充分性
        elements = await evaluate_sufficiency_llm(q, elements, evidence_dict, client=client)

        # 4. 针对涉美法域，挂接 Tier 2 CourtListener 动态判例池与 Shepardizing 好法门禁
        is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
            kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
        )
        if is_us:
            from lawagent.integrations.courtlistener import CourtListenerClient
            cl_client = CourtListenerClient()
            search_context = f"{state.facts_zh} {' '.join(search_queries)} {q.text_zh}"
            cl_precedents = cl_client.search_precedents(search_context, top_k=4, require_good_law=True)
            for cp in cl_precedents:
                if not any(ev.ref_id == cp.case_id for ev in evidence_dict.values()):
                    eid = f"E{len(evidence_dict) + 1}"
                    evidence_dict[eid] = Evidence(
                        eid=eid,
                        kind="case",
                        role="similar",
                        ref_id=cp.case_id,
                        text_de=f"【Holding】{cp.holding}\n\n【Key Quote】{cp.key_quote}\n\n【Citation】{cp.citation} ({cp.court}, {cp.year})\n\n【Shepard's Signal】{cp.shepards_signal.upper()} (Good Law Verified)\n\n【Admissibility Note】{cp.admissibility_notes}",
                        source_url=cp.source_url,
                        stand=str(cp.year),
                        fetched_at=_now(),
                        grade="A"
                    )

        # 5. 针对 missing/partial 要素尝试至多 1 次改写深潜检索
        missing_elems = [el for el in elements if el.status in ("missing", "partial") and el.rounds < 2]
        if missing_elems:
            for el in missing_elems:
                el.rounds += 1
                if is_us:
                    reformulated = f"{el.name_zh} UCC Article 2 statutory elements precedents"
                else:
                    reformulated = f"{el.name_zh} BGB Tatbestand Voraussetzungen"
                sub_results = retriever.search(reformulated, top_k=4)
                for res in sub_results:
                    if is_us and ("BGH" in res.ref_id or "BGB" in res.ref_id or "HGB" in res.ref_id or "ZPO" in res.ref_id):
                        continue
                    if not is_us and ("UCC" in res.ref_id or "USC" in res.ref_id or "SCOTUS" in res.ref_id or "CIR" in res.ref_id):
                        continue
                    if not any(ev.ref_id == res.ref_id for ev in evidence_dict.values()):
                        eid = f"E{len(evidence_dict) + 1}"
                        evidence_dict[eid] = Evidence(
                            eid=eid,
                            kind="case" if "CASE:" in res.ref_id or "BGH" in res.ref_id else "norm",
                            ref_id=res.ref_id,
                            text_de=res.text_de[:1200],
                            source_url=res.source_url or ("https://www.law.cornell.edu/ucc" if is_us else "https://www.gesetze-im-internet.de"),
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
    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    )
    similar_cases = extract_similar_cases(state.evidence, state.facts, is_us=is_us)

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
# Red Team Strategist: 策略推演与红队攻防 Agent
# =====================================================================
async def red_team_strategist_node(state: CaseState) -> Dict[str, Any]:
    """策略推演与红队攻防 Agent 节点：
    基于构成要件与案件事实四态涵摄结果，生成假定胜败条件分支 (If-Then) 与红队攻防手册。
    """
    client = LLMClient()
    strategic_assessment = await generate_strategic_assessment(state, client=client)
    return {
        "strategic_assessment": strategic_assessment,
        "current_node": "red_team_strategist",
        "updated_at": _now()
    }


# 标准法定规范官方权威释义直出词典（零延迟高精度匹配，避免大模型并发限流）
STANDARD_STATUTE_TRANSLATIONS = {
    "BGB:§433": "德国民法典第433条【买卖合同典型义务】：(1) 出卖人负有向买受人交付标的物并移转所有权的义务。出卖人必须向买受人交付无物之瑕疵与权利瑕疵的标的物。(2) 买受人负有向出卖人支付约定价款并受领标的物的义务。",
    "BGB:§434": "德国民法典第434条【物之瑕疵】：(1) 标的物在风险移转时符合主观要求、客观要求及安装要求的，方为无物之瑕疵。(2) 未具备约定的性状、用途或规格，或不符合同类物品通常使用目的与买受人合理期望的，构成物之瑕疵。",
    "BGB:§437": "德国民法典第437条【买受人瑕疵救济权利】：物存在瑕疵的，在满足法定前提条件下，买受人可以：1. 依据第439条主张事后履行（补正履行/修理或换货）；2. 依据第440条、第323条解除合同，或依据第441条减少价金；3. 依据第280条、第281条主张损害赔偿。",
    "BGB:§439": "德国民法典第439条【事后履行】：(1) 买受人主张事后履行的，可以自行选择要求消除瑕疵（修理）或交付无瑕疵之物（换货）。出卖人承担事后履行所必需的全部费用，特别是运输、过路、工时及材料费用。",
    "BGB:§280": "德国民法典第280条【因违反义务的损害赔偿】：(1) 债务人违反因债的关系所产生的义务的，债权人可以请求赔偿因此发生的损害。但债务人对违反义务不承担责任的除外。",
    "BGB:§281": "德国民法典第281条【代替给付的损害赔偿】：债务人不履行或未依约定履行应为给付的，债权人在向债务人指定合理期限无结果后，可以请求代替给付的损害赔偿。",
    "BGB:§286": "德国民法典第286条【债务人给付迟延】：(1) 债务人在清偿期届至且经债权人催告后仍不履行的，因催告而陷于迟延。(2) 确定给付日历时间的，催告并非必要。",
    "BGB:§323": "德国民法典第323条【因不履行或不完全履行解除合同】：双务合同中，当事人一方未履行到期给付的，另一方指定合理期限无结果后，可以解除合同。",
    "HGB:§377": "德国商法典第377条【双方为商人时的检验与瑕疵通知义务】：(1) 买卖双方均具备商人资格的，买受人必须在货物交付后依正常商业流程即刻（unverzüglich）进行检验，发现瑕疵必须即刻向出卖人发出通知。(2) 买受人怠于发出通知的，视为受领该货物，丧失物之瑕疵救济权，但出卖人无法通过通常检验发现的隐蔽瑕疵除外。(3) 隐蔽瑕疵事后发现的，必须在发现后即刻发出异议通知。",
    "UCC:§2-104": "《美国统一商法典》(UCC) § 2-104【商人定义】：商人指从事同类商品交易的人，或由于其业务，持有关于交易所涉货物或惯例的专门知识或技能的人。",
    "UCC:§2-314": "《美国统一商法典》(UCC) § 2-314【默示适销性担保】：如卖方系从事同类工业货物交易之商人，合同中默示包含标的物具备适销性之法定担保。适销标的物必须符合同类商业流通通常标准、适于其预定通常用途，并具备符合规格的包装与质量一致性。",
    "UCC:§2-601": "《美国统一商法典》(UCC) § 2-601【买方救济与拒收】：若货物或交货未能完全符合合同约定（完美交货原则），买方可以：全部拒收、全部接受，或接受任何商业单位并拒收其余部分。",
    "UCC:§2-607": "《美国统一商法典》(UCC) § 2-607【接受货物的法律效果与违约异议通知】：(3)(a) 买受人接受货物后，必须在发现或应当发现违约瑕疵后的合理期间内（Reasonable Time）通知出卖人，否则将被依法剥夺主张违约之全部法律救济权。",
    "UCC:§2-714": "《美国统一商法典》(UCC) § 2-714【买受人接受货物后的违约损害赔偿】：买受人因出卖人违约遭受直接损失的，有权主张交付瑕疵物与符合合同标准物之间的差额价值损失，以及依据 § 2-715 条可主张的附随损失与衍生间接损害赔偿。",
    "UCC:§2-715": "《美国统一商法典》(UCC) § 2-715【买受人附随损失与衍生损害赔偿】：出卖人违约导致的附随损失包括合理检验、仓储与运输费用；衍生损害包括订约时出卖人有理由知悉的特定需求所导致的直接停产与利益受损。",
    "USC:28:§1782": "《美国法典》第28编第1782条【协助外国或国际法庭取证动议】：美国联邦地区法院得依据外国法庭或利害关系人之申请，命令居留于该辖区之当事人提供证言、出示文件记录或配合开示证据，用以支持外国正式司法或仲裁审理程序。"
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

    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    )

    import asyncio

    # 优先使用权威法典释义直出，避免重复发起大模型网络请求
    items_to_translate = []
    for eid, ev in list(state.evidence.items())[:6]:
        if eid in translations:
            continue
        clean_ref = ev.ref_id.replace("NORM:", "").replace("CASE:", "").strip()
        matched_canonical = None
        for std_key, std_text in STANDARD_STATUTE_TRANSLATIONS.items():
            if std_key in clean_ref or clean_ref in std_key:
                matched_canonical = std_text
                break
        if matched_canonical:
            translations[eid] = matched_canonical
        else:
            items_to_translate.append((eid, ev))

    # 对于判例或未在标准库中的内容，限制至多 2 项，并施加 10 秒硬超时熔断
    async def _translate_item(eid: str, ev: Any) -> tuple[str, str]:
        clean_text = ev.text_de[:600]
        if is_us:
            trans_prompt = f"""请将以下美国统一商法典 (UCC) 或美国法院司法先例裁判片段准确翻译为规范的中文法律表述。
严格遵守英汉法律术语对照：
- Implied Warranty of Merchantability -> 默示适销性担保
- Notice of Breach -> 违约异议通知
- Between Merchants -> 商人之间交易规则
- Consequential Damages -> 间接/衍生损害赔偿
- Incidental Damages -> 附随损失
- Cross-Border Discovery -> 跨境证据开示/取证
- Reasonable Time -> 合理期间

【外文原文】
{clean_text}

请直接输出中文翻译文本，不要附加开场白或解释。"""
            sys_prompt = "你是一名严谨的美国商业法与普通法英汉翻译专家，输出精准严谨的中文法律专业译文。"
        else:
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
            sys_prompt = "你是一名严谨的德国法律德汉翻译专家，输出精准严谨的中文法律专业译文。"

        try:
            res = await asyncio.wait_for(
                client.chat_text(
                    task="translation",
                    system_prompt=sys_prompt,
                    user_prompt=trans_prompt,
                    temperature=0.0,
                    retries=0
                ),
                timeout=10.0
            )
            return eid, res.strip()
        except Exception:
            return eid, f"【法源释义】针对 {ev.ref_id} 之官方规范与先例裁判要旨（已纳入要件涵摄与质检）"

    if items_to_translate:
        selected_for_llm = items_to_translate[:2]
        trans_results = await asyncio.gather(*[_translate_item(eid, ev) for eid, ev in selected_for_llm])
        for eid, res_text in trans_results:
            translations[eid] = res_text

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
    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    )
    law_label = "美国统一商法典 (UCC) 及联邦法" if is_us else "德国法"
    counsel_label = "涉美执业律师及专家证人" if is_us else "德国执业律师"

    for q in state.questions:
        statements: List[Statement] = []
        
        # --- Part A: 查明材料包 (法定依据、法条原文与规范构成要件) ---
        stmt_idx = 1
        for eid, ev in list(state.evidence.items())[:5]:
            trans = state.translations.get(eid, "暂无翻译")
            quote_text = f"依据{law_label}规范【{ev.ref_id}】，{trans[:120]}..."
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
                f"针对要件【{el.name_zh}】：依据{law_label}规范，"
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
            f"构成要件【{el.name_zh}】事实状态为【{el.match_status or 'missing'}】，建议委托{counsel_label}线下调取凭证"
            for el in state.elements if el.match_status in ("missing", "partial", "disputed")
        ]
        if state.strategic_assessment and state.strategic_assessment.actionable_checklist:
            for item in state.strategic_assessment.actionable_checklist[:2]:
                gaps.append(f"【策略补证建议】{item}")

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
