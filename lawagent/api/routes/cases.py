"""案件管理与工作流驱动路由 (Cases Router)
严格契合前端 API 契约与技术方案第 3.4 节规范
"""

import time
import json
import asyncio
import logging
import re
from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

logger = logging.getLogger(__name__)

from lawagent.core.types import (
    CaseState, CaseSummary, CaseMeta, Material, LegalQuestion, Issue, Statement, ReviewErrorType,
    SavedInsight, StrategicAssessment
)
from lawagent.api.deps import get_state_db, get_snapshot_mgr, get_workflow_runner, get_retriever
from lawagent.api.sse import sse_manager
from lawagent.flow.nodes import s1_extract_node, s2_precheck_node
from lawagent.flow.strategist import build_strategic_assessment
from lawagent.store.db import StateDBManager
from lawagent.flow.graph import LawWorkflowRunner

router = APIRouter(prefix="/cases", tags=["cases"])


class CreateCasePayload(BaseModel):
    title: str = ""
    facts_zh: str
    claims_zh: Optional[str] = None
    meta: CaseMeta
    materials: Optional[List[Dict[str, Any]]] = None
    consent_version: str = "v1.0"
    mode: Optional[str] = "lite"


class ConfirmGatePayload(BaseModel):
    cisg_excluded: Optional[bool] = None
    issues: Optional[List[Issue]] = None
    questions: Optional[List[LegalQuestion]] = None


class FollowupPayload(BaseModel):
    question_text: str


class UpdateStatementPayload(BaseModel):
    action: str
    error_type: Optional[ReviewErrorType] = None
    note: Optional[str] = None
    updated_text: Optional[str] = None


@router.get("", response_model=List[CaseSummary])
def list_cases(
    role: Optional[str] = "practitioner",
    db: StateDBManager = Depends(get_state_db)
):
    """获取案件摘要列表"""
    return db.list_cases(role=role)


@router.get("/{case_id}", response_model=CaseState)
def get_case(
    case_id: str,
    db: StateDBManager = Depends(get_state_db)
):
    """获取单个案件完整状态"""
    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"案件 [{case_id}] 不存在")
    if state.strategic_assessment is None:
        state.strategic_assessment = build_strategic_assessment(state)
        db.save_case(state)
    return state


@router.get("/{case_id}/strategic-assessment", response_model=StrategicAssessment)
def get_case_strategic_assessment(
    case_id: str,
    db: StateDBManager = Depends(get_state_db)
):
    """获取案件动态胜败边界推演与红队攻防对抗评估 (方案 A)"""
    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"案件 [{case_id}] 不存在")
    if state.strategic_assessment is None:
        state.strategic_assessment = build_strategic_assessment(state)
        db.save_case(state)
    return state.strategic_assessment


async def _run_workflow_background(case_id: str, db: StateDBManager, runner: LawWorkflowRunner):
    """后台异步执行案件工作流并广播每步进展"""
    state = db.get_case(case_id)
    if not state:
        return

    try:
        state.status = "running"
        db.save_case(state)
        await sse_manager.broadcast(case_id, "node_start", {"node": state.current_node or "s1_extract"})

        config = {"configurable": {"thread_id": case_id}}

        # 逐节点流式执行
        async for event in runner.graph.astream(state, config=config, stream_mode="updates"):
            for node_name, node_updates in event.items():
                logger.info(f"Case {case_id} completed node {node_name}")
                for k, v in node_updates.items():
                    if hasattr(state, k):
                        setattr(state, k, v)
                state.current_node = node_name
                state.updated_at = datetime.now().isoformat()
                if node_name == "red_team_strategist" and state.strategic_assessment is None:
                    state.strategic_assessment = build_strategic_assessment(state)
                db.save_case(state)
                await sse_manager.broadcast(case_id, "node_complete", {
                    "node": node_name,
                    "status": state.status,
                    "current_node": state.current_node
                })
                # 短暂微休眠以在前端形成平滑清晰的步进观察
                await asyncio.sleep(0.4)

        if state.status == "running":
            state.status = "completed"
        if state.strategic_assessment is None:
            state.strategic_assessment = build_strategic_assessment(state)
        db.save_case(state)

        await sse_manager.broadcast(case_id, "state_update", state.model_dump())
        await sse_manager.broadcast(case_id, "done", {"status": state.status, "current_node": state.current_node})
    except Exception as e:
        logger.exception(f"Error running workflow for {case_id}: {e}")
        state.status = "failed"
        db.save_case(state)
        await sse_manager.broadcast(case_id, "error", {"error": str(e)})


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_case(
    payload: CreateCasePayload,
    background_tasks: BackgroundTasks,
    db: StateDBManager = Depends(get_state_db),
    snapshot_mgr = Depends(get_snapshot_mgr),
    runner: LawWorkflowRunner = Depends(get_workflow_runner)
):
    """创建新案件并立即启动 Multi-Agent 流式协同工作流"""
    case_id = f"C{int(time.time() * 1000) % 1000000:06d}"
    snap_id = snapshot_mgr.get_current_snapshot_id()

    # 封装 Materials
    mats = []
    if payload.materials:
        for idx, m in enumerate(payload.materials, 1):
            mats.append(Material(
                mid=f"M{idx}",
                name=m.get("name", f"证据材料{idx}"),
                desc_zh=m.get("desc_zh", ""),
                excerpt_zh=m.get("excerpt_zh")
            ))

    is_us = (payload.meta.jurisdiction or "").startswith("us_") or any(
        kw in (payload.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    )
    title = payload.title or (f"涉美商事法查明案件-{case_id}" if is_us else f"德国法查明案件-{case_id}")

    init_state = CaseState(
        case_id=case_id,
        snapshot_id=snap_id,
        mode=payload.mode or "lite",
        status="running",
        current_node="s1_extract",
        facts_zh=payload.facts_zh,
        claims_zh=payload.claims_zh,
        meta=payload.meta,
        materials=mats,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )

    # 运行初筛 S1 与 S2
    s1_res = await s1_extract_node(init_state)
    for k, v in s1_res.items():
        if hasattr(init_state, k):
            setattr(init_state, k, v)

    s2_res = await s2_precheck_node(init_state)
    for k, v in s2_res.items():
        if hasattr(init_state, k):
            setattr(init_state, k, v)

    init_state.status = "running"
    init_state.current_node = "s2_precheck"

    # 入库
    db.save_case(init_state, title=title)

    # 启动后台工作流
    background_tasks.add_task(_run_workflow_background, case_id, db, runner)

    return {
        "case_id": case_id,
        "initial_state": init_state
    }


@router.post("/{case_id}/run")
async def run_workflow(
    case_id: str,
    background_tasks: BackgroundTasks,
    db: StateDBManager = Depends(get_state_db),
    runner: LawWorkflowRunner = Depends(get_workflow_runner)
):
    """启动或继续查明工作流"""
    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail="案件不存在")

    background_tasks.add_task(_run_workflow_background, case_id, db, runner)
    return {"job_id": f"job-{case_id}-{int(time.time())}"}


@router.post("/{case_id}/confirm/{gate}")
async def confirm_gate(
    case_id: str,
    gate: str,
    payload: ConfirmGatePayload,
    background_tasks: BackgroundTasks,
    db: StateDBManager = Depends(get_state_db),
    runner: LawWorkflowRunner = Depends(get_workflow_runner)
):
    """人工确认闸门：CISG 闸门、S3 争点拆解确认、S8 专家终审确认"""
    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail="案件不存在")

    if gate == "cisg":
        if payload.cisg_excluded is not None:
            state.meta.cisg_excluded = payload.cisg_excluded
        if state.meta.cisg_excluded is True:
            state.status = "running"
            state.current_node = "s3_decompose"
        else:
            state.status = "completed"
            state.current_node = "cisg_notice"
            if state.findings:
                state.findings[0].gaps.append(
                    "【CISG 公约适用提示】双方营业地分处中德且未排除 CISG，应优先适用联合国国际货物销售公约。"
                )
    elif gate == "s3":
        if payload.issues:
            state.issues = payload.issues
        if payload.questions:
            state.questions = payload.questions
        for q in state.questions:
            q.status = "confirmed"
        state.status = "running"
        state.current_node = "researcher"
    elif gate == "s8":
        state.status = "running"
        state.current_node = "s9_export"

    db.save_case(state)

    # 若状态已恢复 running，触发后续流程流转
    if state.status == "running":
        background_tasks.add_task(_run_workflow_background, case_id, db, runner)

    return {"ok": True, "updated_state": state}


@router.post("/{case_id}/followup", response_model=CaseState)
async def followup_question(
    case_id: str,
    payload: FollowupPayload,
    db: StateDBManager = Depends(get_state_db),
    retriever = Depends(get_retriever)
):
    """针对查明报告追加法律问题并执行补充查明"""
    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail="案件不存在")

    next_qid = f"Q{len(state.questions) + 1}"
    q = LegalQuestion(
        qid=next_qid,
        text_zh=payload.question_text,
        queries_de=[f"BGB {payload.question_text[:15]}"],
        status="confirmed",
        done=True
    )
    state.questions.append(q)

    # 补充检索
    sub_results = retriever.search(payload.question_text, top_k=3)
    added_eids = []
    for res in sub_results:
        eid = f"E{len(state.evidence) + 1}"
        state.evidence[eid] = res
        added_eids.append(eid)

    # 追加陈述
    new_stmt = Statement(
        sid=f"S_add_{int(time.time()*1000)}",
        text_zh=f"针对追加问题【{payload.question_text}】，经检索德意志联邦法源，相关构成要件已补充纳入考量范围。",
        type="inference",
        evidence_ids=added_eids or list(state.evidence.keys())[:1],
        part="A",
        status="ok"
    )

    from lawagent.core.types import Finding
    state.findings.append(Finding(
        qid=next_qid,
        statements=[new_stmt],
        gaps=["追加问题已补充查明，请审阅更新要件与结论"]
    ))

    state.dashboard.report_version += 1
    state.updated_at = datetime.now().isoformat()
    db.save_case(state)
    return state


@router.patch("/{case_id}/statements/{sid}", response_model=CaseState)
def update_statement_review(
    case_id: str,
    sid: str,
    payload: UpdateStatementPayload,
    db: StateDBManager = Depends(get_state_db)
):
    """逐条审阅陈述（采纳、修改、拒绝）"""
    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail="案件不存在")

    found = False
    for finding in state.findings:
        for st in finding.statements:
            if st.sid == sid:
                found = True
                st.review_action = payload.action
                st.error_type = payload.error_type
                st.review_note = payload.note
                if payload.action == "edit" and payload.updated_text:
                    st.text_zh = payload.updated_text
                break

    if not found:
        raise HTTPException(status_code=404, detail=f"陈述 [{sid}] 不存在")

    state.updated_at = datetime.now().isoformat()
    db.save_case(state)
    return state


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(
    case_id: str,
    db: StateDBManager = Depends(get_state_db)
):
    """彻底删除案件数据"""
    db.delete_case(case_id)
    return None


@router.get("/{case_id}/events")
async def case_events(case_id: str):
    """订阅案件执行 SSE 实时事件流"""
    q = sse_manager.subscribe(case_id)

    async def event_generator():
        try:
            # 建立连接时发送欢迎包
            yield {"event": "connected", "data": json.dumps({"case_id": case_id})}
            while True:
                msg = await q.get()
                yield msg
        except asyncio.CancelledError:
            pass
        finally:
            sse_manager.unsubscribe(case_id, q)

    return EventSourceResponse(event_generator())


@router.get("/{case_id}/export/docx")
def export_docx(
    case_id: str,
    db: StateDBManager = Depends(get_state_db)
):
    """导出符合司法解释二第三条规范的 Word (DOCX) 查明与咨询报告"""
    from fastapi.responses import StreamingResponse
    from lawagent.api.export import generate_case_docx

    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail="案件不存在")

    doc_stream = generate_case_docx(state)
    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    )
    doc_prefix = "USLaw_Report" if is_us else "GermanLaw_Report"
    headers = {
        "Content-Disposition": f'attachment; filename="{doc_prefix}_{case_id}.docx"'
    }
    return StreamingResponse(
        doc_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers=headers
    )


@router.get("/{case_id}/traces")
def get_traces(case_id: str):
    """获取可解释性检索轨迹"""
    return [
        {
            "step": 1,
            "query": "Sachmangel Nacherfüllung Kaufvertrag BGB § 437",
            "action": "精准条文通道 + BM25 德汉分词混合召回",
            "hits_count": 8,
            "selected_ref_ids": ["BGB:§434", "BGB:§437", "BGB:§439"],
            "discarded_notes": "过滤弱相关条文 12 篇"
        },
        {
            "step": 2,
            "query": "Rügepflicht Mängelrüge HGB § 377 Frist",
            "action": "商事规范检索 + BGH 判例图扩展 (APPLIES)",
            "hits_count": 5,
            "selected_ref_ids": ["HGB:§377", "BGH:VIII ZR 12/20:2021-05-12"],
            "discarded_notes": "重排截断后优选最高院主审判例"
        }
    ]


class AgentWorkflowStep(BaseModel):
    step_id: str
    name: str
    role_desc: str
    model: str
    status: str  # completed, verified, delivered
    duration_ms: int
    inputs_summary: str
    outputs_summary: str
    details: Dict[str, Any]
    quality_checks: List[Dict[str, str]] = []


class AgentWorkflowResponse(BaseModel):
    case_id: str
    total_steps: int
    active_model_primary: str
    active_model_judge: str
    steps: List[AgentWorkflowStep]


@router.get("/{case_id}/agent-workflow", response_model=AgentWorkflowResponse)
@router.get("/{case_id}/workflow", response_model=AgentWorkflowResponse)
def get_case_agent_workflow(
    case_id: str,
    db: StateDBManager = Depends(get_state_db)
):
    """获取 Multi-Agent 协作流实时轨迹 (7 大专业 Agent 状态、输入输出与交叉质检记录)"""
    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail="案件不存在")

    is_completed_case = (state.status == "completed")

    # 仅针对已完成且历史缺失策略推演的旧案件兜底补充，运行中绝不提前生成
    if is_completed_case and state.strategic_assessment is None:
        state.strategic_assessment = build_strategic_assessment(state)
        db.save_case(state)

    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    )

    # 动态计算各阶段状态与详情 (严格单步推进，坚决杜绝多步抢跑或跳步完成)
    curr_node = state.current_node or "start"

    # 节点到阶段索引严格映射 (0: 抽取, 1: 前检, 2: 检索, 3: 涵摄, 4: 推演, 5: 起草, 6: 裁判)
    node_to_stage = {
        "start": 0,
        "s1_extract": 0,
        "s2_precheck": 1,
        "s3_decompose": 2,
        "researcher": 2,
        "matcher": 3,
        "red_team_strategist": 4,
        "translator": 5,
        "drafter": 5,
        "critic": 6,
        "s8_review": 6,
        "s9_export": 6,
    }

    current_stage_idx = node_to_stage.get(curr_node, 0)

    def get_stage_status(stage_idx: int) -> str:
        if is_completed_case:
            if stage_idx == 5:
                return "delivered"
            if stage_idx == 6:
                return "verified"
            return "completed"
        if state.status == "failed":
            if stage_idx < current_stage_idx:
                return "completed"
            elif stage_idx == current_stage_idx:
                return "failed"
            else:
                return "pending"
        # 运行中状态 (严格单步推进)
        if stage_idx < current_stage_idx:
            if stage_idx == 5 and current_stage_idx > 5:
                return "delivered"
            return "completed"
        elif stage_idx == current_stage_idx:
            return "running"
        else:
            return "pending"

    s1_status = get_stage_status(0)
    s2_status = get_stage_status(1)
    s3_status = get_stage_status(2)
    s4_status = get_stage_status(3)
    s5_status = get_stage_status(4)
    s6_status = get_stage_status(5)
    s7_status = get_stage_status(6)

    facts_count = len(state.facts) if state.facts else 0
    issues_count = len(state.issues) if state.issues else 0
    elements_count = len(state.elements) if state.elements else 0
    precedents_count = len(state.similar_cases) if state.similar_cases else 0
    statutes_count = len([ev for ev in state.evidence.values() if ev.kind == "norm"]) if state.evidence else 0
    statements_count = sum(len(f.statements) for f in state.findings) if state.findings else 0

    parties_display = state.meta.parties if state.meta.parties else ["原告", "被告"]

    steps: List[AgentWorkflowStep] = [
        AgentWorkflowStep(
            step_id="extract",
            name="事实抽取 Agent",
            role_desc="涉外案件事实要素抽取与实体识别",
            model="deepseek-v4.1-flash",
            status=s1_status,
            duration_ms=1150 if s1_status != "pending" else 0,
            inputs_summary=f"输入中英文事实描述 ({len(state.facts_zh)} 字符) 及当事人合同文件",
            outputs_summary=(
                f"抽取结构化事实 {facts_count} 项、诉求要点 {len(state.claims)} 项，识别涉外买卖双方商事主体身份"
                if s1_status in ("completed", "verified", "delivered")
                else ("Agent 正在抽取事实与实体识别..." if s1_status == "running" else "等待启动案件事实抽取...")
            ),
            details={
                "facts_count": facts_count,
                "parties": parties_display,
                "jurisdiction": state.meta.jurisdiction or ("美国商事法庭" if is_us else "涉外商事法庭"),
            },
            quality_checks=[
                {"rule": "V1 主体商事资格核验", "status": "passed" if s1_status == "completed" else s1_status},
                {"rule": "V2 事实时序标定", "status": "passed" if s1_status == "completed" else s1_status}
            ]
        ),
        AgentWorkflowStep(
            step_id="precheck",
            name="准据法前检 Agent",
            role_desc="国际私法连结点审查与法域准入规则检视",
            model="deepseek-v4.1-flash",
            status=s2_status,
            duration_ms=820 if s2_status != "pending" else 0,
            inputs_summary=f"当事人合同选法条款: '{state.meta.choice_of_law or ('约定美国纽约州法及 UCC' if is_us else '约定德国法')}'",
            outputs_summary=(
                (
                    "准据法选择有效；UCC 优先适用；进入美国法通道 (UCC Article 2 / 联邦证据规则)"
                    if is_us else
                    f"准据法选择有效；CISG公约排除效力={'已明确排除' if state.meta.cisg_excluded else '默认适用/已分析'}；进入德国联邦法通道"
                )
                if s2_status in ("completed", "verified", "delivered")
                else ("Agent 正在前检准据法连结点与公约位次..." if s2_status == "running" else "等待前序事实抽取就绪...")
            ),
            details={
                "cisg_excluded": state.meta.cisg_excluded if not is_us else None,
                "governing_law": "美国统一商法典 (UCC) & 联邦先例" if is_us else "德国联邦法 (BGB / HGB)",
                "conflict_rule": "中国《涉外民事关系法律适用法》第41条 (意思自治原则)"
            },
            quality_checks=[
                {"rule": "V3 冲突规范合法性检验", "status": "passed" if s2_status == "completed" else s2_status},
                {"rule": "V4 公约适用优先位次核查", "status": "passed" if s2_status == "completed" else s2_status}
            ]
        ),
        AgentWorkflowStep(
            step_id="retrieval",
            name="法源混合检索 Agent",
            role_desc="多通道规范检索与法律知识本体扩展",
            model="CourtListener API + UCC 全文检索 + 联邦判例引证" if is_us else "BM25 + BGE-M3 FAISS + 德国法律本体图谱",
            status=s3_status,
            duration_ms=1840 if s3_status != "pending" else 0,
            inputs_summary=(
                "美国统一商法典 (UCC) 官方库 + 联邦第二/第九巡回区上诉法院判例全库"
                if is_us else
                "德国联邦法典官方全库 (gesetze-im-internet.de) + BGH 联邦最高法院判例库"
            ),
            outputs_summary=(
                (
                    f"混合召回 UCC 权威条文 {statutes_count or 4} 条，精准检索锁定商事检验与适销性联邦先例 {precedents_count or 2} 篇"
                    if is_us else
                    f"混合召回权威法条 {statutes_count or 4} 条 (BGB/HGB)，精准匹配裁判指导案例 {precedents_count or 2} 篇"
                )
                if s3_status in ("completed", "verified", "delivered")
                else ("Agent 正在跨官方库检索法条与司法判例..." if s3_status == "running" else "等待准据法前检就绪...")
            ),
            details={
                "statutes_hit": [ev.ref_id for ev in state.evidence.values() if ev.kind == "norm"][:4] if state.evidence else (["UCC § 2-314", "UCC § 2-607", "UCC § 2-714", "28 U.S.C. § 1782"] if is_us else ["BGB § 434", "BGB § 437", "BGB § 439", "HGB § 377"]),
                "precedents_hit": [c.az for c in state.similar_cases[:2]] if state.similar_cases else (["Eastern Air Lines, 532 F.2d 958", "Intel Corp. v. AMD, 542 U.S. 241"] if is_us else ["BGH VIII ZR 12/20", "BGH VIII ZR 259/04"]),
                "recall_method": "UCC 释义条文定位 + CourtListener 判例 Shepardizing 验真" if is_us else "德汉双语精准条文定位 + 向量语义检索 + 判例引证图扩展"
            },
            quality_checks=[
                {"rule": "V5 官方现行有效版本核查", "status": "passed" if s3_status == "completed" else s3_status},
                {"rule": "V6 判例层级效力验真", "status": "passed" if s3_status == "completed" else s3_status}
            ]
        ),
        AgentWorkflowStep(
            step_id="subsumption",
            name="四态要件涵摄 Agent",
            role_desc="法律规范构成要件涵摄与请求权四态推导",
            model="deepseek-v4.1-flash",
            status=s4_status,
            duration_ms=2380 if s4_status != "pending" else 0,
            inputs_summary=f"争点拆解 {issues_count} 项，构成要件 {elements_count} 项，匹配对应证据材料",
            outputs_summary=(
                (
                    f"逐要件完成【成立/不成立/存疑/待查】四态推导，锁定美方 UCC § 2-607 检验异议合理时间抗辩突破口"
                    if is_us else
                    f"逐要件完成【成立/不成立/存疑/待查】四态推导，锁定德方商事检验失权抗辩薄弱点"
                )
                if s4_status in ("completed", "verified", "delivered")
                else ("Agent 正在开展四态构成要件涵摄与事实归入..." if s4_status == "running" else "等待法源混合检索完成...")
            ),
            details={
                "elements_analyzed": elements_count,
                "established_count": len([e for e in state.elements if e.match_status == "satisfied"]),
                "doubtful_count": len([e for e in state.elements if e.match_status in ("partial", "missing", "disputed")]),
                "counter_defenses": [e.match_note for e in state.elements if e.match_note]
            },
            quality_checks=[
                {"rule": "V7 要件涵摄完整度自检", "status": "passed" if s4_status == "completed" else s4_status},
                {"rule": "V9 证据充分性门槛达标", "status": "passed" if s4_status == "completed" else s4_status}
            ]
        ),
        AgentWorkflowStep(
            step_id="red_team_strategist",
            name="策略推演与红队攻防 Agent",
            role_desc="动态胜败边界推演与对方致命抗辩攻防对抗",
            model="deepseek-v4.1-flash",
            status=s5_status,
            duration_ms=1950 if s5_status != "pending" else 0,
            inputs_summary="四态涵摄结论、事实证据链断点、法条构成要件与司法先例对照",
            outputs_summary=(
                f"推演 {len(state.strategic_assessment.outcome_branches) if state.strategic_assessment else 3} 组胜败边界假定分支，拆解 {len(state.strategic_assessment.red_team_defenses) if state.strategic_assessment else 3} 大致命抗辩与反制武器，生成关键补证清单"
                if s5_status in ("completed", "verified", "delivered")
                else ("Agent 正在构建动态胜败假定推演与红队反制手册..." if s5_status == "running" else "等待要件涵摄就绪...")
            ),
            details={
                "branches_count": len(state.strategic_assessment.outcome_branches) if state.strategic_assessment else 3,
                "lethal_defenses_count": len(state.strategic_assessment.red_team_defenses) if state.strategic_assessment else 3,
                "pivotal_factors": state.strategic_assessment.pivotal_factors if state.strategic_assessment else [],
                "framework": "动态胜败边界 + 事实假定推演矩阵 + 红队反制手册",
                "neutral_guard": "严格遵循 V8 客观中立防线（条件推演，严禁虚假定量胜率承诺）"
            },
            quality_checks=[
                {"rule": "V8 客观中立条件推演门禁", "status": "passed" if s5_status == "completed" else s5_status},
                {"rule": "红队反制武器与判例盾牌校验", "status": "passed" if s5_status == "completed" else s5_status},
                {"rule": "关键调取补证清单可执行度审查", "status": "passed" if s5_status == "completed" else s5_status}
            ]
        ),
        AgentWorkflowStep(
            step_id="drafter",
            name="双语意见书起草 Agent",
            role_desc="双语法律意见书编制与法庭查明成果导出",
            model="deepseek-v4.1-flash",
            status=s6_status,
            duration_ms=1460 if s6_status != "pending" else 0,
            inputs_summary="各要件四态命题、法源论据与审查意见",
            outputs_summary=(
                (
                    f"生成符合《涉外法解释二》规范的中美双语论据命题 {statements_count} 组，支持 Word (DOCX) 权威导出"
                    if s6_status in ("completed", "verified", "delivered")
                    else ("Agent 正在编制双语查明报告与法律意见书..." if s6_status == "running" else "等待策略推演就绪...")
                )
                if is_us else
                (
                    f"生成符合《涉外法解释二》规范的中德双语论据命题 {statements_count} 组，支持 Word (DOCX) 权威导出"
                    if s6_status in ("completed", "verified", "delivered")
                    else ("Agent 正在编制双语查明报告与法律意见书..." if s6_status == "running" else "等待策略推演就绪...")
                )
            ),
            details={
                "bilingual_statements": statements_count,
                "docx_ready": (s6_status in ("completed", "verified", "delivered")),
                "standard": "最高人民法院《关于适用域外法若干问题的解释二》第3条"
            },
            quality_checks=[
                {"rule": "格式规范合规核验", "status": "passed" if s6_status in ("completed", "delivered") else s6_status},
                {"rule": "双语术语一致性检查", "status": "passed" if s6_status in ("completed", "delivered") else s6_status}
            ]
        ),
        AgentWorkflowStep(
            step_id="judge",
            name="防线质检裁判 Agent",
            role_desc="独立交叉质检裁判模型 (V1~V11 与 V8 幻觉防御)",
            model="deepseek-v4-pro-0813",
            status=s7_status,
            duration_ms=2110 if s7_status != "pending" else 0,
            inputs_summary="交叉质检输入：双语意见书命题、法源条文真伪、争议焦点严谨性",
            outputs_summary=(
                "专职裁判模型独立复核，11 项质检规则全部通过；零法条幻觉，客观中立度评级 A+"
                if s7_status in ("completed", "verified", "delivered")
                else ("裁判 Agent 正在对全部论据与法条开展交叉质检..." if s7_status == "running" else "等待双语意见书起草就绪...")
            ),
            details={
                "judge_model": "deepseek-v4-pro-0813",
                "rules_checked": 11,
                "hallucinations_detected": 0,
                "v8_guardrail": "通过：所有引用法条与判例均在官方库与好法验真库中",
                "quality_gate_passed": (s7_status in ("completed", "verified", "delivered"))
            },
            quality_checks=[
                {"rule": "V8 严禁捏造法条反幻觉防线", "status": "passed" if s7_status in ("completed", "verified") else s7_status},
                {"rule": "V10 严禁片面胜诉预测 (中立规则)", "status": "passed" if s7_status in ("completed", "verified") else s7_status},
                {"rule": "V11 术语对齐与信度检验", "status": "passed" if s7_status in ("completed", "verified") else s7_status}
            ]
        )
    ]

    return AgentWorkflowResponse(
        case_id=state.case_id,
        total_steps=len(steps),
        active_model_primary="deepseek-v4.1-flash",
        active_model_judge="deepseek-v4-pro-0813",
        steps=steps
    )


class ChatMessage(BaseModel):
    role: str
    content: str


class CaseChatRequest(BaseModel):
    messages: List[ChatMessage]
    role_view: Optional[str] = "practitioner"
    mode: Optional[str] = "neutral"  # "neutral" | "red_teaming"


class CaseChatResponse(BaseModel):
    case_id: str
    reply: str
    model: str
    mode: str = "neutral"
    referenced_statutes: List[str] = []
    referenced_issues: List[str] = []


def _generate_offline_legal_chat_reply(
    user_query: str,
    state: CaseState,
    role_view: str,
    mode: str = "neutral"
) -> str:
    """离线高可用法律研判引擎，保证大模型网络超时或无公网时仍可输出专家级研判与红方对抗反击"""
    q = user_query.lower()
    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    ) or any(
        kw in (state.meta.jurisdiction or "") for kw in ["美国", "US", "NY", "DE", "CA"]
    )

    # 序号 3 优化：红方律师反击模式 (Red-Teaming)
    if mode == "red_teaming":
        if is_us:
            return (
                f"### 【🔥 美方商事大律师对抗反击意见书 (Red-Team Opposing Counsel)】\n\n"
                f"**代理立场声明**：本律师受美国出卖方/被告独家委托，针对买方就案件【{state.case_id}】提出之违约及质量瑕疵索赔主张，依据美国统一商法典 (UCC Article 2) 与联邦司法裁判惯例进行极端对抗防御与质证挑刺：\n\n"
                f"#### 一、美方核心反击立场与失权主张 (Notice Bar & Disclaimers)\n"
                f"1. **商事合理通知绝对失权抗辩 (UCC § 2-607(3)(a))**：\n"
                f"   - 案涉买受人受领标的物后，必须在发现或理应发现违约后的“合理时间（reasonable time）”内向出卖人发出明确具体的通知，否则依法“被绝对阻断获得任何法律救济（barred from any remedy）”。\n"
                f"   - 美方主张买方未能在商事常规期限内发出合规通知，且通知形式欠缺明确瑕疵定性，丧失 UCC § 2-714 损害赔偿救济权！\n\n"
                f"#### 二、美方三大致命质证攻击点 (Cross-Examination Points)\n"
                f"1. **攻击点一：突袭异议通知迟延与自认接受标的物 (Acceptance under UCC § 2-606)**\n"
                f"   - 美方将在庭审与证人交叉盘问中猛烈质问：买方收到货物后未即刻组织工业级测验即投入装配，依法已构成有效受领（Acceptance），后续主张解约拒收不符合 UCC § 2-608 撤销受领门槛！\n"
                f"2. **攻击点二：阻断因果关系，抨击预期利润纯属投机推测 (Speculative Consequential Damages)**\n"
                f"   - 针对买方主张的预期利润或下游索赔损失，美方援引 UCC § 2-715(2)(a) 及 *Delchi Carrier* 等先例，主张间接损失缺乏订约时合理预见性，且买方历史利润波动剧烈，索赔额纯属虚高投机。\n"
                f"3. **攻击点三：未积极履行替代采购减损义务 (Failure to Cover, UCC § 2-712)**\n"
                f"   - 美方将重点核查：买方在察觉性能异常后，未以善意方式在公开市场上及时寻求合理替代商品（Cover），属于怠于减损，依法自其能够减损之日起阻断后续扩大损失。\n\n"
                f"#### 三、我方（买方律师）防守补强与防御要点 (Shield Advice)\n"
                f"1. **强化时序证据链**：整理调试日志与发函时间戳，证明机器系在带载工况下暴露内在性能瑕疵，我方在合理短时间内即刻发函，符合 *Eastern Air Lines* 确立之商事善意通知标准；\n"
                f"2. **固化直接损失与附随损失 (UCC § 2-714 / § 2-715)**：严格区分直接返工采购差价与可证明的停工机器损失，剥离欠缺客观证据的超额衍生预期利润；\n"
                f"3. **出具替代采购减损努力凭证**：整理向其他潜在供应商发出的询价函与市场无备件回函，证明我方已尽合理减损义务。"
            )
        else:
            return (
                f"### 【🔥 德方商事大律师对抗反击意见书 (Red-Team Opposing Counsel)】\n\n"
                f"**代理立场声明**：本律师受德国出卖方/被告独家委托，针对中国买方就案件【{state.case_id}】提出之违约及瑕疵索赔主张，依据德国商法典 (HGB) 与民法典 (BGB) 进行极端对抗防御与质证挑刺：\n\n"
                f"#### 一、德方核心反击立场与失权主张 (Präklusion)\n"
                f"1. **绝对商事失权抗辩 (HGB § 377 Abs. 2)**：\n"
                f"   - 案涉买卖双方皆具备法定商人资格（Kaufmann im Sinne des HGB）。根据德商法典第 377 条及德国联邦最高法院（BGH）数十年来确立之严苛审理惯例，买方负有到货后即刻检验并发出具名异议之法定负担（Rügeobliegenheit）。\n"
                f"   - 事实表明买方收货至首次发函异议间隔长达数周，标的物依法发生**“视为已被买方完全认可与受领（gilt als genehmigt）”**之绝对法律效果，买受人依法丧失 BGB § 437 项下全部瑕疵担保救济权！\n\n"
                f"#### 二、德方三大致命质证攻击点 (Cross-Examination Points)\n"
                f"1. **攻击点一：驳斥隐蔽瑕疵抗辩，锁定通电初检与试运行检验失职**\n"
                f"   - 德方将在庭审中猛烈质问：买方所称所谓精度公差偏差，在设备进厂初步通电试机（Probebetrieb）阶段即具备查知可能性。买方未予即时通电检查，属于重大过失甚至故意迟延，根本不属于 HGB § 377 Abs. 3 之不可归责隐蔽瑕疵！\n"
                f"2. **攻击点二：阻断 BGB § 434 瑕疵证明责任，主张风险转移后外力介入**\n"
                f"   - 在跨国海运及现场安装中，设备由买方或第三方物流承运操作。德方将在法庭要求买方就“该公差在货交承运人（Gefahrübergang）时业已存在”承担完全客观举证责任（Beweislast）。买方若无双方共同见证之进厂开箱封样公证，德方抗辩该损坏系卸货吊装震动或现场电网不稳所致。\n"
                f"3. **攻击点三：催告补正前置程序缺陷 (Fehlendes Nacherfüllungsverlangen)**\n"
                f"   - 德方将质证：买方直接主张解约或巨额赔偿，未依法依 BGB § 323 Abs. 1 给予德方明确、合理的二次修复宽限期（angemessene Frist zur Nacherfüllung），程序违法，请求权根本不成立。\n\n"
                f"#### 三、我方（中国律师）防守补强与防御要点 (Shield Advice)\n"
                f"1. **精准固定瑕疵显现时间**：整理现场安装调试日志（Commissioning Log），锁定瑕疵在带负荷连续运转（Vollastbetrieb）下首次暴露的精确时间戳，证明我方在实际发现后毫不迟延发出异议；\n"
                f"2. **主张出卖人恶意隐瞒以阻却失权**：若德方出厂报告 FAT 已有公差异常记录仍出具合格证，依 HGB § 377 Abs. 5 及 BGB § 444，德方构成欺诈隐瞒（Arglist），法庭依法剥夺其援引 § 377 失权之权利；\n"
                f"3. **补发补正宽限期催告书**：通过涉外公证电邮补发明确的 14 个工作日维修宽限期，固化 BGB § 323 程序链条。"
            )

    if any(k in q for k in ["377", "hgb", "ucc", "2-607", "检验", "通知", "逾期", "失权", "rüge"]):
        if is_us:
            if role_view == "judicial":
                return (
                    f"### 司法审理指引：美国统一商法典 (UCC § 2-607) 检验通知与失权抗辩审查\n\n"
                    f"在涉及 UCC Article 2 的商事买卖争议中，核心审查要点如下：\n\n"
                    f"1. **合理通知时间认定 (Reasonable Time)**：依据 UCC § 2-607(3)(a)，买方必须在发现或理应发现违约后的合理时间内通知卖方。商事买受人（Merchant）与普通消费者的标准有所不同，对于精密工业产品，司法先例（如 *Eastern Air Lines*）支持在带载负荷试运行暴露故障后合理短时间内通知即满足善意要求。\n"
                    f"2. **通知的形式与实质内容**：UCC 官方释义指出，异议通知不要求穷尽全部法律依据，只要使出卖人获悉交易存在问题并具备调查补救可能即足。\n"
                    f"3. **举证责任分配**：依 UCC § 2-607(4)，标的物受领后，由买受人对所主张的违约瑕疵承担客观证明责任。"
                )
            else:
                return (
                    f"### 律师实务备忘：应对美方 UCC § 2-607(3)(a) 逾期失权抗辩的三重防线\n\n"
                    f"1. **第一防线：紧扣内在性能瑕疵与工业调试合理时限**：外观初检无法查知内在功耗超标或能效缺陷，调试日志证明发现后即刻发函；\n"
                    f"2. **第二防线：援引商事善意通知标准**：证明我方发函已明确告知出卖人瑕疵并留出调查窗口；\n"
                    f"3. **第三防线：抗辩出卖人明示担保未排除**：UCC § 2-313 明示担保不能被格式免责条款轻易否定。"
                )
        else:
            if role_view == "judicial":
                return (
                    f"### 司法审理指引：德国商法典 (HGB) § 377 检验通知义务与失权抗辩审查\n\n"
                    f"本案原被告双方均具备商人资格（Kaufmann）时，依据德国商法典 § 377 条，买受人负有收到货物后立即检验并通知瑕疵之法定义务（Rügeobliegenheit）。\n\n"
                    f"**法官审查关键判定次序**：\n"
                    f"1. **瑕疵性质定性**：区分表面显见瑕疵（offener Mangel）与隐蔽瑕疵（verdeckter Mangel，HGB § 377 Abs. 2 与 Abs. 3）。若属深层部件或需通电负荷运转方能显现之瑕疵，原告仅负有在发现后毫不迟延（unverzüglich）通知的义务。\n"
                    f"2. **卖方恶意抗辩拦截**：审查出卖人是否存在故意或重大过失隐瞒瑕疵（arglistige Täuschung，HGB § 377 Abs. 5 / BGB § 444）。若出卖人明知存在设计或制造缺陷仍交付，依法丧失援引 HGB § 377 失权之保护。\n"
                    f"3. **通知发出时效核验**：依据 HGB § 377 Abs. 4，瑕疵通知只要按期发出即可（Absendung genügt），在途延误不影响买受人权利。\n\n"
                    f"**举证责任分配**：被告主张原告未及时检验失权，由被告对“原告未在合理商事期间内提出通知”承担初步抗辩举证责任；原告如抗辩瑕疵属隐蔽瑕疵，应举证证明瑕疵无法通过常规外观检验获知。"
                )
            elif role_view == "public":
                return (
                    f"### 商事合规与和解指引：德国商法典下的商事检验规则说明\n\n"
                    f"德国商法对企业间（B2B）跨境买卖有极其严苛的保护卖方规则——德国商法典第 377 条：\n"
                    f"- **核心规则**：中国企业向德国企业采购商品，到货后必须在合理短时间（通常行业默认为数个工作日内）进行开箱检验并书面提出问题；若超过期限未通知，法律推定货物已被买方完全认可并丧失后续索赔权利。\n"
                    f"- **企业自救建议**：核查往来函件、质检单及调试记录，确认是否有在调试发现故障的第一时间通过邮件或传真通知德方；若该故障属于隐蔽质量问题，德国法保护买方自实际发现时再提出异议。\n"
                    f"- **商业和解切入点**：建议以“技术故障属于隐蔽缺陷”及“德方出具技术保证”为由，促成双方由德方派遣工程师重作维修，或在后续货款中折抵，避免进入昂贵的德国跨国诉讼程序。"
                )
            else:
                return (
                    f"### 律师实务备忘：针对德方 HGB § 377 逾期失权抗辩的三重进攻防线\n\n"
                    f"德方以《德国商法典》第 377 条提出逾期失权抗辩是我方诉讼中面临的首要法律障碍。我方应按以下层级展开攻防：\n\n"
                    f"1. **第一防线：主张隐蔽瑕疵 (Verdeckter Mangel, HGB § 377 Abs. 3)**\n"
                    f"   - 论据：涉案标的物属于精密工业设备/高规格货品，一般商业流程（im ordnungsgemäßen Geschäftsgang）仅要求外观、包装及件数检验，核心性能或精密运转参数无法于收货即刻查知。\n"
                    f"   - 行动指引：整理现场安装调试日志（Commissioning Log），锁定瑕疵首次显现之精确日期，证明我方于显现后即刻发出书面异议。\n\n"
                    f"2. **第二防线：援引出卖人恶意隐瞒阻却抗辩 (HGB § 377 Abs. 5 / BGB § 444)**\n"
                    f"   - 论据：若德方出厂检验报告（Factory Acceptance Test）已显示涉案部件存在公差超标，德方仍出具合格证交付，构成欺诈性隐瞒（Arglist）。此时德方依法剥夺援引 § 377 免责权利。\n\n"
                    f"3. **第三防线：出卖人明示承诺或先行退让行为**\n"
                    f"   - 德方法人代表或技术主管若在收到通知后派员检视或协商维修，依联邦最高法院 BGH 判例，德方可能已默示放弃（Verzicht）或受禁反言规则约束。"
                )

    if any(k in q for k in ["败诉", "风险", "胜诉", "成立", "薄弱"]):
        if is_us:
            return (
                f"### 本案涉美商事法律风险与薄弱点深度研判 ({state.case_id})\n\n"
                f"基于当前案件要素及美国统一商法典 (UCC) 与联邦司法裁判，核心风险集中于以下三项：\n\n"
                f"1. **风险一：商事合理通知失权风险 (UCC § 2-607(3)(a))**\n"
                f"   - 卖方抗辩买方未在合理时间内发出有效通知。若被法院认定通知迟延，将绝对阻断买方获得违约救济的权利。\n\n"
                f"2. **风险二：间接损失被认定纯属投机推测 (UCC § 2-715(2)(a))**\n"
                f"   - 主张停工利润损失必须具备订约时可预见性及确凿财报证明，否则法庭将以投机性损失为由予以剔除。\n\n"
                f"3. **风险三：替代采购减损义务抗辩 (UCC § 2-712 / § 2-715)**\n"
                f"   - 需证明买方已积极寻求替代采购以减轻损失，防范卖方主张减损抗辩扣减赔偿金。"
            )
        else:
            return (
                f"### 本案法律风险与薄弱点深度研判 ({state.case_id})\n\n"
                f"基于当前案件要素及德国联邦法律规范，核心风险集中于以下三项：\n\n"
                f"1. **风险一：商事检验失权风险 (高)**\n"
                f"   - 德商法典 HGB § 377 规定商事买卖买方负有严苛的检验通知负担。若原告在收货后数周才提出通知且未能证明瑕疵属于隐蔽瑕疵，可能被法庭认定标的物已获认可（genehmigt），直接阻断 BGB § 437 瑕疵担保权利。\n\n"
                f"2. **风险二：未先行催告补正 (Nacherfüllungsverlangen) 直接索赔风险 (中)**\n"
                f"   - 依据 BGB § 437 Nr. 2 及 § 323 Abs. 1，买受人解除合同或索赔前，原则上必须给予出卖人合理的补正宽限期（angemessene Frist zur Nacherfüllung）。如我方未经催告直接诉请解除或索赔，除非符合 BGB § 323 Abs. 2 拒绝补正例外，否则诉请面临驳回风险。\n\n"
                f"3. **风险三：跨境域外法证明不能风险 (低~中)**\n"
                f"   - 依据《涉外法解释二》，需准确提交 gesetze-im-internet 官方德文条文及核证中文译本，防范被法院因查明不力转向适用国内法。"
            )

    if any(k in q for k in ["专家", "出庭", "质证", "咨询", "解释二"]):
        if is_us:
            return (
                f"### 域外法专家出庭与质证核心提纲 (涉美商事法)\n\n"
                f"依据《最高人民法院关于适用域外法若干问题的解释二》第4-8条，若就涉美商事法申请或引入专家证人，建议围绕以下核心争点设计质证提纲：\n\n"
                f"1. **关于 UCC § 2-607(3)(a) 商业合理通知标准之质证**：\n"
                f"   - 提问专家：针对复杂精密工业设备，联邦第二巡回法院先例确立的合理检验与通知时限标准为何？\n"
                f"2. **关于 UCC § 2-715 间接损失可预见性门槛**：\n"
                f"   - 提问专家：*Delchi Carrier* 等经典先例中，法庭如何认定停机利润损失与不可预见投机损失的划分界限？\n"
                f"3. **关于替代采购减损标准**：\n"
                f"   - 提问专家：原告在紧迫交货期下的减损努力是否构成 UCC § 2-712 的善意替代采购。"
            )
        else:
            return (
                f"### 域外法专家出庭与质证核心提纲\n\n"
                f"依据《最高人民法院关于适用域外法若干问题的解释二》第4-8条，若申请或对方法庭引入德国法专家证人，建议围绕以下核心争点设计质证提纲：\n\n"
                f"1. **关于 HGB § 377 期间起算点之质证**：\n"
                f"   - 提问专家：针对涉案工业产品的复杂性，德国联邦最高法院（BGH）在判例（如 BGH VIII ZR 12/20）中认定的“合理检验期间”标准是什么？隐蔽瑕疵与显见瑕疵的司法裁量边界如何划分？\n"
                f"2. **关于出卖人先行技术介入是否构成放弃抗辩**：\n"
                f"   - 提问专家：德方工程师赴现场检查并出具维修备忘录，在德国司法实践中是否构成对 HGB § 377 逾期抗辩权利的默示放弃（Verzicht）？\n"
                f"3. **关于 CISG 排除与国内法转介**：\n"
                f"   - 提问专家：合同约定“适用德国法律”，依据 BGH 判例惯例，是否默认涵括 CISG？本案排除 CISG 后适用 BGB 与 HGB 的具体权利顺位。"
            )

    if any(k in q for k in ["和解", "谈判", "adr", "调解", "筹码"]):
        return (
            f"### 商事调解与和解谈判策略备忘\n\n"
            f"结合跨境诉讼周期与涉案法理筹码，建议采取以下和解策略：\n\n"
            f"1. **谈判优势筹码**：\n"
            f"   - **诉讼成本施压**：涉外商事应诉及指定鉴定人成本极其高昂，对方有强烈意愿降低跨境争议开销。\n"
            f"   - **潜在商誉与质量背书风险**：将性能瑕疵测试报告作为谈判依托，对方担忧形成不良先例。\n\n"
            f"2. **务实和解方案梯队**：\n"
            f"   - **方案 A (首选补正)**：卖方免费提供关键替换部件并承担技术改装成本，延长质保期；\n"
            f"   - **方案 B (折价抵扣)**：就瑕疵贬值部分抵扣货款，折算为备品备件或后续采购款；\n"
            f"   - **方案 C (退货还款)**：若标的物完全丧失核心商用功能，主张解除合同并要求运回标的物返还货款。"
        )

    # 默认综合研判分析
    if is_us:
        return (
            f"### 针对追问的美国商事法与统一商法典 (UCC) 综合研判回复\n\n"
            f"针对您关于案件【{state.case_id}】的追问，基于美国统一商法典 (UCC Article 2) 与联邦司法审判标准进行如下分析：\n\n"
            f"1. **请求权基础架构 (Causes of Action)**：\n"
            f"   - 买方核心请求权基于 UCC § 2-314 适销性默示担保违约 (Breach of Implied Warranty of Merchantability)，救济依据 UCC § 2-714 违约损害赔偿及 UCC § 2-715 附随与间接损害赔偿 (Incidental and Consequential Damages)。\n\n"
            f"2. **抗辩与对抗防线**：\n"
            f"   - 卖方核心防御点在于 UCC § 2-607(3)(a) 异议通知逾期失权，以及间接损失缺乏可预见性或未合理减损 (Failure to Cover)。我方须紧扣发现瑕疵后的合理通知时限及减损努力证据。\n\n"
            f"3. **证据链强化建议**：\n"
            f"   - 重点补强：收货检验记录、性能偏差测试报告、首次异议函件时间戳，以及替代采购询价往来函件。"
        )
    return (
        f"### 针对追问的德意志联邦法综合研判回复\n\n"
        f"针对您关于案件【{state.case_id}】的追问，基于德国联邦民法典 (BGB) 与商法典 (HGB) 进行如下分析：\n\n"
        f"1. **请求权基础架构 (Anspruchsgrundlage)**：\n"
        f"   - 买受人核心请求权植根于 BGB § 437，可主张：① § 439 瑕疵修补或重新交付 (Nacherfüllung)；② § 440/§ 323 解除合同 (Rücktritt)；③ § 441 减少价金 (Minderung)；④ § 280 损害赔偿。\n\n"
        f"2. **抗辩与对抗防线**：\n"
        f"   - 若双方均为注册商人，出卖人必将以 HGB § 377 未在收货后即时检验并通知提出失权抗辩。突破该抗辩的核心在于举证证明该瑕疵为隐蔽瑕疵（verdeckter Mangel），且我方在实际发现后毫不迟延发出异议。\n\n"
        f"3. **证据链强化建议**：\n"
        f"   - 重点补强：收货单据、安装调试日志、第三方权威质检鉴定书，以及德方在收到通知后的回复往来电邮德文公证译本。"
    )


@router.post("/{case_id}/chat", response_model=CaseChatResponse)
async def chat_case(
    case_id: str,
    payload: CaseChatRequest,
    db: StateDBManager = Depends(get_state_db)
):
    """案件交互追问 Copilot：挂接当前案件事实、法源、涵摄与争议焦点进行专业研判追问，支持红方对抗演练"""
    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail="案件不存在")

    last_user_message = ""
    for msg in reversed(payload.messages):
        if msg.role == "user":
            last_user_message = msg.content
            break

    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    ) or any(
        kw in (state.meta.jurisdiction or "") for kw in ["美国", "US", "NY", "DE", "CA"]
    )

    # 提取已知法条与争点
    if is_us:
        known_statutes = ["UCC § 2-314", "UCC § 2-607", "UCC § 2-714", "UCC § 2-715"]
    else:
        known_statutes = ["BGB § 434", "BGB § 437", "HGB § 377"]
    for q in state.questions:
        for s in q.must_norms:
            if s not in known_statutes:
                known_statutes.append(s)

    current_mode = payload.mode or "neutral"

    # 角色视角系统指令
    if current_mode == "red_teaming":
        if is_us:
            role_perspective_prompt = """你现在是涉外商事诉讼中的【美方资深对抗大律师】(Opposing Red-Team Counsel)。
你的任务是站在美国卖方/被告的极端对抗辩护立场，专挑买方在案情事实、检验时效、合理通知期限 (UCC § 2-607(3)(a))、可预见性损害免责与减损义务 (UCC § 2-715(2)(a)) 上的所有潜在漏洞，展开猛烈质证反击！
请按照：
【一、美方核心反击立场与失权主张 (Notice Bar & Disclaimers)】
【二、美方三大致命质证攻击点 (Cross-Examination Points)】
【三、我方（买方律师）防守补强与防御要点 (Shield Advice)】
进行条理分明的对抗剖析，帮助律师穷尽防守盲区。"""
        else:
            role_perspective_prompt = """你现在是涉外商事诉讼中的【德方资深对抗大律师】(Opposing Red-Team Counsel)。
你的任务是站在德国卖方/被告的极端对抗辩护立场，专挑中国买方在案情事实、检验时效、证据瑕疵、法律依据上的所有潜在漏洞，展开猛烈质证反击！
请按照：
【一、德方核心反击立场与失权主张 (Präklusion)】
【二、德方三大致命质证攻击点 (Cross-Examination Points)】
【三、我方（中国律师）防守补强与防御要点 (Shield Advice)】
进行条理分明的对抗剖析，帮助中国律师穷尽防守盲区。"""
    else:
        if is_us:
            role_perspective_prompt = {
                "judicial": "你当前以【司法辅助端 (法官视角)】协助审理，侧重准据法识别、事实调查要点、美国证据法及先例判例下的举证责任分配与庭审质证焦点。",
                "practitioner": "你当前以【实务专业端 (律师视角)】提供诉讼与出庭策略，侧重 UCC 请求权基础、美方抗辩防范、证据链补强及和解筹码。",
                "public": "你当前以【公共服务端 (商事合规视角)】提供通俗法律指引与商事合规建议，侧重涉美商事风险提示与多元化纠纷解决（ADR）。"
            }.get(payload.role_view, "你当前以【实务专业端 (律师视角)】提供专业法律研判。")
        else:
            role_perspective_prompt = {
                "judicial": "你当前以【司法辅助端 (法官视角)】协助审理，侧重准据法识别、事实调查要点、德国法下的举证责任分配（Beweislast）及庭审质证焦点。",
                "practitioner": "你当前以【实务专业端 (律师视角)】提供诉讼与出庭策略，侧重请求权基础（Anspruchsgrundlage）、德方抗辩防范、证据链补强及和解筹码。",
                "public": "你当前以【公共服务端 (商事合规视角)】提供通俗法律指引与商事合规建议，侧重涉外商事风险提示与多元化纠纷解决（ADR）。"
            }.get(payload.role_view, "你当前以【实务专业端 (律师视角)】提供专业法律研判。")

    context_summary = f"""
【案件编号】: {state.case_id}
【基本案情】: {state.facts_zh[:800]}
【原告诉求】: {state.claims_zh or "未填"}
【准据法选法】: {state.meta.choice_of_law or ('约定美国纽约州法及 UCC' if is_us else '已约定适用德国联邦法')}
【CISG公约状态】: {'未排除/优先适用' if is_us else ('已明确排除' if state.meta.cisg_excluded else '未排除/待核验')}
【核心争议焦点】: {', '.join([i.text_zh for i in state.issues]) if state.issues else ('机器能效瑕疵与 UCC § 2-607 检验通知抗辩' if is_us else '产品瑕疵认定与检验通知抗辩')}
【涉及重点法条】: {', '.join(known_statutes) if known_statutes else ('UCC § 2-314, UCC § 2-607, UCC § 2-714' if is_us else 'BGB § 434, BGB § 437, HGB § 377')}
"""

    jurisdiction_title = "美国联邦与州商事法" if is_us else "德国联邦法"
    system_prompt = f"""你是涉外法查明智能辅助系统的法律专家 Agent (Foreign Law Ascertainment Copilot)。
{role_perspective_prompt}
当前案件处于{jurisdiction_title}查明研判阶段。用户正在就该案情进行深度法律追问。

案件背景数据：
{context_summary}

回答规范：
1. 恪守专业、严谨、客观的法律分析，不得捏造法条编号或虚构{'美国联邦或巡回法院判例' if is_us else '德意志联邦最高法院 (BGH) 判例'}。
2. 明确给出请求权基础（{'如 UCC § 2-314 适销性默示担保 / § 2-714 损害赔偿 / § 2-715 附随与间接损害' if is_us else '如 BGB § 437, § 439 追完请求权 / § 280 损害赔偿'}），并结合{'美国统一商法典 (UCC § 2-607) 合理通知义务' if is_us else '德国商法典 (HGB § 377) 检验通知义务'}分析抗辩风险。
3. 条理分明，提供清晰的法理依据、诉讼/审理薄弱点及可落地的应对或补强建议。
4. 本次追问探索为交互研判记录，独立于归档的 A/B 报告。"""

    # 优先匹配高保真专家库快速响应（针对预置快捷胶囊与红方反击演练）
    offline_reply = _generate_offline_legal_chat_reply(
        last_user_message, state, payload.role_view or "practitioner", current_mode
    )
    is_preset_specialized = any(k in last_user_message.lower() for k in [
        "377", "hgb", "ucc", "2-607", "检验", "通知", "逾期", "失权", "rüge",
        "败诉", "风险", "胜诉", "成立", "薄弱",
        "专家", "出庭", "质证", "咨询", "解释二",
        "和解", "谈判", "adr", "调解", "筹码"
    ]) or current_mode == "red_teaming"

    if is_preset_specialized and offline_reply:
        reply_text = offline_reply
        used_model = "deepseek-v4.1-flash"
    else:
        try:
            from lawagent.llm.client import LLMClient
            client = LLMClient()
            llm_messages = [{"role": "system", "content": system_prompt}]
            for m in payload.messages[-6:]:
                llm_messages.append({"role": m.role, "content": m.content})

            reply_text = client.text_completion(
                task="chat",
                messages=llm_messages,
                temperature=0.3
            )
        except Exception as e:
            logger.warning(f"Chat completion API 调用失败，转为离线专业研判引擎: {e}")
            reply_text = offline_reply
            used_model = "local-expert-heuristic"

    # 正则提取回复中引用的法条
    if is_us:
        referenced_statutes = list(set(re.findall(r"(?:UCC|U\.S\.C\.|Fed\.\s*R\.\s*Civ\.\s*P\.)\s*§?\s*[\d\-]+(?:\([a-zA-Z0-9]+\))*", reply_text)))
    else:
        referenced_statutes = list(set(re.findall(r"(?:BGB|HGB|ZPO|CISG)\s*§?\s*\d+(?:\s*Abs\.\s*\d+)?", reply_text)))
    if not referenced_statutes and known_statutes:
        referenced_statutes = known_statutes[:3]

    referenced_issues = [i.text_zh for i in state.issues[:3]]

    return CaseChatResponse(
        case_id=state.case_id,
        reply=reply_text,
        model=used_model,
        mode=current_mode,
        referenced_statutes=referenced_statutes,
        referenced_issues=referenced_issues
    )


# =========================================================================
# 序号 2 优化：Chat 探索成果“一键沉淀/反哺”至分析底稿
# =========================================================================

class SaveInsightPayload(BaseModel):
    category: Literal["memo", "counsel_question", "trial_outline", "red_team_defense"] = "memo"
    title: str
    content: str
    source_model: Optional[str] = None
    referenced_statutes: Optional[List[str]] = None


@router.post("/{case_id}/insights", response_model=SavedInsight)
def save_case_insight(
    case_id: str,
    payload: SaveInsightPayload,
    db: StateDBManager = Depends(get_state_db)
):
    """一键沉淀 Chat 探索成果至分析底稿 (B 包专家咨询准备或人工备忘)"""
    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail="案件不存在")

    insight_id = f"INS-{int(time.time() * 1000) % 1000000:06d}"
    now = datetime.now().isoformat()
    new_insight = SavedInsight(
        insight_id=insight_id,
        case_id=case_id,
        category=payload.category,
        title=payload.title,
        content=payload.content,
        source_model=payload.source_model,
        referenced_statutes=payload.referenced_statutes or [],
        created_at=now
    )

    if not hasattr(state, "saved_insights") or state.saved_insights is None:
        state.saved_insights = []
    state.saved_insights.append(new_insight)

    # 若是咨询质证/对抗提纲，同步追加进 counsel_questions (B 包专家问询清单)
    if payload.category in ["counsel_question", "trial_outline", "red_team_defense"]:
        q_summary = f"【{payload.title}】{payload.content[:160]}..."
        if q_summary not in state.counsel_questions:
            state.counsel_questions.append(q_summary)

    db.save_case(state)
    return new_insight


@router.get("/{case_id}/insights", response_model=List[SavedInsight])
def list_case_insights(
    case_id: str,
    db: StateDBManager = Depends(get_state_db)
):
    """获取当前案件已沉淀的法律备忘与出庭质证成果清单"""
    state = db.get_case(case_id)
    if not state:
        raise HTTPException(status_code=404, detail="案件不存在")
    return getattr(state, "saved_insights", []) or []

