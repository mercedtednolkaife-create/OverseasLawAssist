"""核心数据模型与状态对象定义
严格对齐技术方案 v0.7 第 5.1 节与前端 TypeScript 契约 (FrontEnd/src/types/lawAgent.ts)
"""

from typing import List, Dict, Tuple, Optional, Literal, Any
from pydantic import BaseModel, Field


UserRole = Literal["public", "judicial", "practitioner"]
RunMode = Literal["full", "lite", "retrieval"]
CaseWorkflowStatus = Literal[
    "draft", "running", "paused_cisg", "paused_s3", "paused_s8", "completed", "failed"
]


class CaseMeta(BaseModel):
    jurisdiction: str = "de_federal"     # 默认德国联邦法，支持多法域拓展
    contract_type: Optional[str] = None
    parties: List[str] = Field(default_factory=list)
    contract_date: Optional[str] = None  # ISO 日期，合同订立日 (必填)
    event_date: Optional[str] = None     # 主要事实发生日 (建议填写)
    choice_of_law: Optional[str] = None  # 选法条款 (如：德国法)
    cisg_excluded: Optional[bool] = None # None 表示未确认，触发 CISG 闸门
    both_merchants: Optional[bool] = None# 是否均为商人 (触发 HGB § 377)


class Claim(BaseModel):
    cid: str                             # 'C1'
    party: str
    text_zh: str


class Fact(BaseModel):
    fid: str                             # 'F1'
    text_zh: str
    span: Optional[Tuple[int, int]] = None  # 在 facts_zh 中的字符区间，用于 V10 溯源
    disputed: bool = False               # 各方主张对该事实不一致；S3 人工确认


class Material(BaseModel):
    mid: str                             # 'M1'
    name: str
    desc_zh: str
    excerpt_zh: Optional[str] = None     # 粘贴摘录
    fact_ids: List[str] = Field(default_factory=list)  # 意图证明的事实 F#


class Issue(BaseModel):
    issue_id: str
    kind: Literal["fact", "law"]         # 事实争点或法律争点
    text_zh: str
    claim_ids: List[str] = Field(default_factory=list)
    element_ids: List[str] = Field(default_factory=list)


class LegalQuestion(BaseModel):
    qid: str
    text_zh: str
    queries_de: List[str] = Field(default_factory=list)
    template_id: Optional[str] = None
    must_norms: List[str] = Field(default_factory=list)
    status: Literal["draft", "confirmed"] = "draft"
    done: bool = False                   # 已完成 S4–S7


class Evidence(BaseModel):
    eid: str                             # 'E1'
    kind: Literal["norm", "case"]
    role: Literal["law", "similar"] = "law"
    ref_id: str                          # 如 'BGB:§437' 或 'BGH:VIII ZR 12/20:2021-05-12'
    text_de: str                         # 被引用片段 (不超过 1500 字)
    source_url: str
    stand: Optional[str] = None
    fetched_at: str
    grade: Literal["A", "B", "C", "D"] = "A"


class ElementEvidence(BaseModel):
    eid: str
    relation: Literal["supports", "explains", "cited_by"] = "supports"


class ElementState(BaseModel):
    qid: str
    element_id: str                      # 如 'e1', 'e2', 'q'
    name_zh: str
    status: Literal["covered", "partial", "missing"] = "missing"
    links: List[ElementEvidence] = Field(default_factory=list)
    scores: Dict[str, float] = Field(default_factory=dict)  # eid -> 重排得分
    gap_note: Optional[str] = None
    rounds: int = 0                      # 改写检索轮数 (上限 2)
    fact_links: List[str] = Field(default_factory=list)     # 候选关联的事实 F#
    slot_hits: Dict[str, List[str]] = Field(default_factory=dict)  # slot_id -> fact_ids
    material_links: List[str] = Field(default_factory=list) # 候选关联的证据材料 M#
    match_status: Optional[Literal["satisfied", "partial", "missing", "disputed"]] = None
    match_note: Optional[str] = None


ReviewErrorType = Literal[
    "citation", "translation", "missing_element", "overreach",
    "comparative_pollution", "sufficiency", "fact_error", "other"
]


class Statement(BaseModel):
    sid: str
    text_zh: str
    type: Literal["quote", "paraphrase", "inference"]
    evidence_ids: List[str] = Field(default_factory=list)
    part: Literal["A", "B"] = "A"        # A 查明材料包，B 咨询准备包
    fact_ids: List[str] = Field(default_factory=list)       # B 部分陈述引用的事实 F#
    material_ids: List[str] = Field(default_factory=list)   # B 部分陈述引用的证据材料 M#
    element_id: Optional[str] = None     # 所属要件
    quote_de: Optional[str] = None
    grade: Optional[Literal["A", "B", "C", "D"]] = None
    status: Literal["ok", "fail", "downgraded"] = "ok"
    review_action: Optional[Literal["accept", "edit", "reject"]] = None
    review_note: Optional[str] = None
    error_type: Optional[ReviewErrorType] = None


class Finding(BaseModel):
    qid: str
    statements: List[Statement] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)


class EntryCheckItem(BaseModel):
    name: str
    status: Literal["satisfied", "unsatisfied", "uncertain"]
    detail: str


class SimilarCaseItem(BaseModel):
    case_id: str
    eid: str
    court: str
    az: str
    date: str
    similarity_points: List[str] = Field(default_factory=list)
    difference_points: List[str] = Field(default_factory=list)
    court_view_quote_de: str
    court_view_zh: str
    divergence_flag: Literal["consistent", "divergent", "undetermined"] = "undetermined"


class CheckItem(BaseModel):
    code: str                            # V1 - V11
    status: Literal["pass", "fail", "downgraded"]
    qid: Optional[str] = None
    sid: Optional[str] = None
    eid: Optional[str] = None
    reason: str


class DashboardMetrics(BaseModel):
    exact_quotes_ratio: Tuple[int, int] = (0, 0)
    norms_cases_exist_all: bool = True
    unresolved_refs_count: int = 0
    supported_statements_ratio: Tuple[int, int] = (0, 0)
    elements_coverage: Dict[str, int] = Field(default_factory=lambda: {"covered": 0, "partial": 0, "missing": 0})
    elements_match: Dict[str, int] = Field(default_factory=lambda: {"satisfied": 0, "partial": 0, "missing": 0, "disputed": 0})
    facts_traceable_ratio: Tuple[int, int] = (0, 0)
    entity_checks_pass_ratio: Tuple[int, int] = (0, 0)
    comparative_law_flags_count: int = 0
    grades_distribution: Dict[str, int] = Field(default_factory=lambda: {"A": 0, "B": 0, "C": 0, "D": 0})
    timepoint_level: Literal["green", "red", "yellow"] = "yellow"
    cisg_triggered: bool = False
    snapshot_id: str = ""
    report_version: int = 1
    content_hash: str = ""
    mode: RunMode = "full"


class SavedInsight(BaseModel):
    insight_id: str
    case_id: str
    category: Literal["memo", "counsel_question", "trial_outline", "red_team_defense"] = "memo"
    title: str
    content: str
    source_model: Optional[str] = None
    referenced_statutes: List[str] = Field(default_factory=list)
    created_at: str = ""


class OutcomeBranch(BaseModel):
    branch_type: Literal["favorable", "unfavorable", "uncertain"] = "favorable"
    title: str
    condition_precedent: str          # 假定事实/前提要件
    substantive_basis: List[str] = Field(default_factory=list) # 适用法条/权威先例
    key_evidence_required: List[str] = Field(default_factory=list) # 所需关键证据
    outcome_summary: str              # 裁判倾向推演 (严守条件句)
    risk_level: Literal["low", "medium", "high"] = "medium"


class RedTeamDefense(BaseModel):
    defense_id: str                   # 'D1', 'D2', 'D3'
    opposing_claim: str               # 对方可能主张的抗辩切入点
    lethal_index: Literal["high", "critical", "medium"] = "high" # 威胁烈度
    opposing_basis: str               # 对方依据之条文/判例
    counter_weapons: List[str] = Field(default_factory=list) # 我方反制依据与裁判武器 (先例、除外例外规则)
    factual_counter_point: str        # 事实反驳突破口
    evidence_checklist: List[str] = Field(default_factory=list) # 下一步关键调取证据清单


class StrategicAssessment(BaseModel):
    case_id: str
    pivotal_factors: List[str] = Field(default_factory=list) # 胜败摇摆关键变量 / 心证分水岭
    outcome_branches: List[OutcomeBranch] = Field(default_factory=list)
    red_team_defenses: List[RedTeamDefense] = Field(default_factory=list)
    actionable_checklist: List[str] = Field(default_factory=list)
    updated_at: str = ""


class CaseState(BaseModel):
    case_id: str
    snapshot_id: str
    mode: RunMode = "full"
    facts_zh: str
    claims_zh: Optional[str] = None
    meta: CaseMeta = Field(default_factory=CaseMeta)
    flags: List[str] = Field(default_factory=list)
    timepoint: Dict[str, Any] = Field(default_factory=lambda: {"level": "yellow", "reasons": []})
    entry_checks: List[EntryCheckItem] = Field(default_factory=list)
    facts: List[Fact] = Field(default_factory=list)
    claims: List[Claim] = Field(default_factory=list)
    materials: List[Material] = Field(default_factory=list)
    issues: List[Issue] = Field(default_factory=list)
    questions: List[LegalQuestion] = Field(default_factory=list)
    elements: List[ElementState] = Field(default_factory=list)
    evidence: Dict[str, Evidence] = Field(default_factory=dict)
    translations: Dict[str, str] = Field(default_factory=dict)  # eid -> zh
    similar_cases: List[SimilarCaseItem] = Field(default_factory=list)
    counsel_questions: List[str] = Field(default_factory=list)
    findings: List[Finding] = Field(default_factory=list)
    checks: List[CheckItem] = Field(default_factory=list)
    saved_insights: List[SavedInsight] = Field(default_factory=list)
    strategic_assessment: Optional[StrategicAssessment] = None  # 方案A：胜败边界推演与红队攻防对抗
    unparsed_refs: List[Dict[str, Any]] = Field(default_factory=list)
    dashboard: DashboardMetrics = Field(default_factory=DashboardMetrics)
    status: CaseWorkflowStatus = "draft"
    created_at: str = ""
    updated_at: str = ""
    current_node: Optional[str] = None
    retry: Dict[str, int] = Field(default_factory=dict)          # qid -> retry_count


class CaseSummary(BaseModel):
    case_id: str
    title: str
    contract_type: str
    contract_date: Optional[str] = None
    created_at: str
    updated_at: str
    status: CaseWorkflowStatus
    mode: RunMode
    snapshot_id: str
    issues_count: int
