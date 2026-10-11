/**
 * 德国联邦法域外法查明 Agent：类型定义
 * 对齐技术方案 v0.7 状态对象与 OpenAPI 契约规范
 */

export type UserRole = 'public' | 'judicial' | 'practitioner';
export type RunMode = 'full' | 'lite' | 'retrieval';

export interface CaseMeta {
  contract_type?: string;
  parties: string[];
  contract_date?: string; // ISO 日期，合同订立日 (必填)
  event_date?: string;    // 主要事实发生日 (建议填写)
  choice_of_law?: string; // 选法条款 (如：德国法)
  cisg_excluded?: boolean | null; // null 表示未确认，触发 CISG 闸门
  both_merchants?: boolean;       // 是否均为商人 (触发 HGB § 377)
}

export interface Claim {
  cid: string; // 'C1'
  party: string;
  text_zh: string;
}

export interface Fact {
  fid: string; // 'F1'
  text_zh: string;
  span?: [number, number]; // 在 facts_zh 中的字符区间
  disputed: boolean; // 各方主张对该事实不一致
}

export interface Material {
  mid: string; // 'M1'
  name: string;
  desc_zh: string;
  excerpt_zh?: string; // 粘贴摘录
  fact_ids: string[];  // 意图证明的事实 F#
}

export interface Issue {
  issue_id: string;
  kind: 'fact' | 'law'; // 事实争点或法律争点
  text_zh: string;
  claim_ids: string[];
  element_ids: string[];
}

export interface LegalQuestion {
  qid: string;
  text_zh: string;
  queries_de: string[];
  template_id?: string;
  must_norms: string[];
  status: 'draft' | 'confirmed';
  done: boolean;
}

export interface Evidence {
  eid: string; // 'E1'
  kind: 'norm' | 'case';
  role: 'law' | 'similar';
  ref_id: string; // 如 'BGB:§437' 或 'BGH:VIII ZR 12/20:2021-05-12'
  text_de: string; // 被引用片段 (不超过 1500 字)
  source_url: string;
  stand?: string;
  fetched_at: string;
  grade: 'A' | 'B' | 'C' | 'D';
}

export interface ElementEvidence {
  eid: string;
  relation: 'supports' | 'explains' | 'cited_by';
}

export interface FactSlotHit {
  slot_id: string;
  slot_name_zh: string;
  fact_ids: string[];
}

export interface ElementState {
  qid: string;
  element_id: string; // 如 'e1', 'e2', 'q'
  name_zh: string;
  status: 'covered' | 'partial' | 'missing';
  links: ElementEvidence[];
  scores: Record<string, number>; // eid -> 重排得分
  gap_note?: string;
  rounds: number;
  fact_links: string[]; // 候选关联的事实 F#
  slot_hits: Record<string, string[]>; // slot_id -> fact_ids
  material_links: string[]; // 候选关联的证据材料 M#
  match_status?: 'satisfied' | 'partial' | 'missing' | 'disputed';
  match_note?: string;
}

export type ReviewErrorType =
  | 'citation'
  | 'translation'
  | 'missing_element'
  | 'overreach'
  | 'comparative_pollution'
  | 'sufficiency'
  | 'fact_error'
  | 'other';

export interface Statement {
  sid: string;
  text_zh: string;
  type: 'quote' | 'paraphrase' | 'inference';
  evidence_ids: string[];
  part: 'A' | 'B'; // A 查明材料包，B 咨询准备包
  fact_ids?: string[]; // B 部分陈述引用的事实 F#
  material_ids?: string[]; // B 部分引用的材料 M#
  element_id?: string; // 所属要件
  quote_de?: string;
  grade?: 'A' | 'B' | 'C' | 'D';
  status: 'ok' | 'fail' | 'downgraded';
  review_action?: 'accept' | 'edit' | 'reject';
  review_note?: string;
  error_type?: ReviewErrorType;
}

export interface Finding {
  qid: string;
  statements: Statement[];
  gaps: string[];
}

export interface EntryCheckItem {
  name: string;
  status: 'satisfied' | 'unsatisfied' | 'uncertain';
  detail: string;
}

export interface SimilarCaseItem {
  case_id: string;
  eid: string;
  court: string;
  az: string;
  date: string;
  similarity_points: string[];
  difference_points: string[];
  court_view_quote_de: string;
  court_view_zh: string;
  divergence_flag: 'consistent' | 'divergent' | 'undetermined';
}

export interface CheckItem {
  code: string; // V1 - V11
  status: 'pass' | 'fail' | 'downgraded';
  qid?: string;
  sid?: string;
  eid?: string;
  reason: string;
}

export interface DashboardMetrics {
  exact_quotes_ratio: [number, number]; // [分子, 分母]
  norms_cases_exist_all: boolean;
  unresolved_refs_count: number;
  supported_statements_ratio: [number, number];
  elements_coverage: { covered: number; partial: number; missing: number };
  elements_match: { satisfied: number; partial: number; missing: number; disputed: number };
  facts_traceable_ratio: [number, number];
  entity_checks_pass_ratio: [number, number];
  comparative_law_flags_count: number;
  grades_distribution: { A: number; B: number; C: number; D: number };
  timepoint_level: 'green' | 'red' | 'yellow';
  cisg_triggered: boolean;
  snapshot_id: string;
  report_version: number;
  content_hash: string;
  mode: RunMode;
}

export type CaseWorkflowStatus =
  | 'draft'
  | 'running'
  | 'paused_cisg'
  | 'paused_s3'
  | 'paused_s8'
  | 'completed'
  | 'failed';

export interface CaseState {
  case_id: string;
  snapshot_id: string;
  mode: RunMode;
  facts_zh: string;
  claims_zh?: string;
  meta: CaseMeta;
  flags: string[];
  timepoint: {
    level: 'green' | 'red' | 'yellow';
    reasons: string[];
  };
  entry_checks: EntryCheckItem[];
  facts: Fact[];
  claims: Claim[];
  materials: Material[];
  issues: Issue[];
  questions: LegalQuestion[];
  elements: ElementState[];
  evidence: Record<string, Evidence>;
  translations: Record<string, string>; // eid -> zh
  similar_cases: SimilarCaseItem[];
  counsel_questions: string[];
  findings: Finding[];
  checks: CheckItem[];
  saved_insights?: SavedInsight[];
  dashboard: DashboardMetrics;
  unparsed_refs: { raw: string; span?: [number, number] }[];
  status: CaseWorkflowStatus;
  created_at: string;
  updated_at: string;
  current_node?: string;
}

export interface CaseSummary {
  case_id: string;
  title: string;
  contract_type: string;
  contract_date?: string;
  created_at: string;
  updated_at: string;
  status: CaseWorkflowStatus;
  mode: RunMode;
  snapshot_id: string;
  issues_count: number;
}

export interface SearchFilter {
  law?: string; // BGB | HGB | GmbHG | ZPO | EGBGB | CISG
  court?: string; // BGH | OLG | etc.
  date_from?: string;
  kind?: 'all' | 'norm' | 'case';
}

export interface NormOrCaseItem {
  id: string; // 'BGB:§433' 或 'BGH:VIII ZR 12/20'
  kind: 'norm' | 'case';
  law?: string;
  enbez?: string;
  title: string;
  heading_path?: string;
  court?: string;
  decided?: string;
  az?: string;
  text_de: string;
  text_zh_machine: string;
  stand?: string;
  has_pending_amend?: boolean;
  source_url: string;
  structure?: Array<{
    absatz: string;
    text: string;
    nummern?: Array<{ nr: string; text: string }>;
  }>;
}

export interface MaterialVerificationResult {
  raw_text: string;
  items: Array<{
    ref_id: string;
    in_db: boolean;
    is_current: boolean;
    stand_note: string;
    consistency_verdict: 'exact' | 'partial' | 'inconsistent' | 'unverified';
    has_full_text: boolean;
    quote_in_material: string;
    db_text_de: string;
    db_text_zh: string;
    note: string;
  }>;
  summary: {
    total: number;
    verified_count: number;
    unverified_count: number;
    risk_count: number;
  };
}

export interface Expert {
  expert_id: string;
  name: string;
  title: string;
  affiliation: string;
  languages: string[];
  fields: string[];
  qualification: string;
  conflict_declared: boolean;
}

export interface ConsultRecord {
  consult_id: string;
  case_id: string;
  expert_id: string;
  expert_name: string;
  status: 'draft' | 'dispatched' | 'replied' | 'accepted' | 'rejected';
  question_snapshot: string;
  evidence_summary: string;
  reply?: string;
  conflict_affirmed: boolean;
  updated_at: string;
}

export interface SearchTraceItem {
  step: number;
  query: string;
  action: string;
  hits_count: number;
  selected_ref_ids: string[];
  discarded_notes: string;
}

export interface AgentWorkflowStep {
  step_id: string;
  name: string;
  role_desc: string;
  model: string;
  status: 'completed' | 'verified' | 'delivered' | 'running' | 'idle';
  duration_ms: number;
  inputs_summary: string;
  outputs_summary: string;
  details: Record<string, any>;
  quality_checks: Array<{ rule: string; status: string }>;
}

export interface AgentWorkflowResponse {
  case_id: string;
  total_steps: number;
  active_model_primary: string;
  active_model_judge: string;
  steps: AgentWorkflowStep[];
}

export interface SavedInsight {
  insight_id: string;
  case_id: string;
  category: 'memo' | 'counsel_question' | 'trial_outline' | 'red_team_defense';
  title: string;
  content: string;
  source_model?: string;
  referenced_statutes?: string[];
  created_at: string;
}

export interface SaveInsightPayload {
  category: 'memo' | 'counsel_question' | 'trial_outline' | 'red_team_defense';
  title: string;
  content: string;
  source_model?: string;
  referenced_statutes?: string[];
}

export interface CaseChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CaseChatResponse {
  case_id: string;
  reply: string;
  model: string;
  mode?: 'neutral' | 'red_teaming';
  referenced_statutes: string[];
  referenced_issues: string[];
}

