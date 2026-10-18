"""SQLite 数据库连接与建表管理
实现技术方案第 4.2 节的只读快照库与读写运行库（WAL）分离架构
"""

import sqlite3
import os
import threading
import datetime
from typing import Optional, Dict, Any, List


# 快照库 DDL (只读，每个 snapshot 一份 law.sqlite)
SNAPSHOT_DB_SCHEMA = """
CREATE TABLE IF NOT EXISTS norms(
  norm_id TEXT PRIMARY KEY,
  law TEXT,
  enbez TEXT,
  title TEXT,
  heading_path TEXT,
  text_de TEXT,
  structure TEXT,
  footnotes TEXT,
  stand TEXT,
  has_pending_amend INT DEFAULT 0,
  source_url TEXT,
  snapshot_id TEXT,
  fetched_at TEXT
);

CREATE TABLE IF NOT EXISTS norm_versions(
  norm_id TEXT,
  version_no INT,
  valid_from TEXT,
  valid_to TEXT,
  text_de TEXT,
  structure TEXT,
  stand TEXT,
  source_url TEXT,
  snapshot_id TEXT,
  PRIMARY KEY (norm_id, version_no)
);

CREATE TABLE IF NOT EXISTS cases(
  case_id TEXT PRIMARY KEY,
  court TEXT,
  senate TEXT,
  decided TEXT,
  az TEXT,
  ecli TEXT,
  doctype TEXT,
  leitsatz TEXT,
  tenor TEXT,
  tatbestand TEXT,
  gruende TEXT,
  norms_meta TEXT,
  source_url TEXT,
  snapshot_id TEXT,
  fetched_at TEXT
);

CREATE TABLE IF NOT EXISTS chunks(
  chunk_id TEXT PRIMARY KEY,
  kind TEXT,
  ref_id TEXT,
  seq INT,
  text TEXT,
  ctx_prefix TEXT
);

CREATE TABLE IF NOT EXISTS edges(
  src TEXT,
  dst TEXT,
  rel TEXT,
  source TEXT,
  span TEXT,
  confidence REAL,
  reviewed INT DEFAULT 0,
  snapshot_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src, rel);
CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst, rel);

CREATE TABLE IF NOT EXISTS edges_top(
  src TEXT,
  dst TEXT,
  rel TEXT,
  source TEXT,
  reviewed INT,
  rk INT
);
CREATE INDEX IF NOT EXISTS idx_top_src ON edges_top(src, rel);

CREATE TABLE IF NOT EXISTS hot_norm_cases(
  norm_id TEXT,
  case_id TEXT,
  rank INT,
  PRIMARY KEY (norm_id, case_id)
);

CREATE TABLE IF NOT EXISTS unparsed_refs(
  owner_id TEXT,
  raw TEXT,
  span TEXT,
  snapshot_id TEXT
);
"""


# 运行库 DDL (读写，开启 WAL 与 busy_timeout，位于 data/state/state.sqlite)
STATE_DB_SCHEMA = """
CREATE TABLE IF NOT EXISTS case_registry(
  case_id TEXT PRIMARY KEY,
  owner TEXT,
  role TEXT,
  snapshot_id TEXT,
  mode TEXT DEFAULT 'full',
  status TEXT,
  created_at TEXT,
  updated_at TEXT,
  retention_until TEXT,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_case_owner ON case_registry(owner, created_at);

CREATE TABLE IF NOT EXISTS consents(
  case_id TEXT,
  version TEXT,
  accepted_at TEXT,
  role TEXT
);

CREATE TABLE IF NOT EXISTS report_versions(
  case_id TEXT,
  version INT,
  created_at TEXT,
  trigger TEXT,
  content_hash TEXT,
  snapshot_id TEXT,
  path TEXT,
  PRIMARY KEY (case_id, version)
);

CREATE TABLE IF NOT EXISTS usage_counters(
  principal TEXT,
  day TEXT,
  n_requests INT DEFAULT 0,
  n_llm_calls INT DEFAULT 0,
  n_tokens INT DEFAULT 0,
  PRIMARY KEY (principal, day)
);

CREATE TABLE IF NOT EXISTS feedback(
  fid INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT,
  case_id TEXT,
  sid TEXT,
  element_id TEXT,
  action TEXT,
  error_type TEXT,
  before_text TEXT,
  after_text TEXT,
  note TEXT,
  role TEXT,
  actor TEXT,
  run_id TEXT,
  snapshot_id TEXT,
  model TEXT,
  prompt_hash TEXT
);

CREATE TABLE IF NOT EXISTS data_sources(
  source_id TEXT PRIMARY KEY,
  name TEXT,
  base_url TEXT,
  license_note TEXT,
  license_checked_at TEXT,
  fetch_method TEXT,
  update_freq TEXT,
  last_ok_at TEXT,
  parser_version TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS update_runs(
  run_id TEXT PRIMARY KEY,
  started_at TEXT,
  source_id TEXT,
  old_snapshot TEXT,
  new_snapshot TEXT,
  gate_result TEXT,
  gate_detail TEXT,
  n_added INT,
  n_removed INT,
  n_changed INT,
  switched_at TEXT,
  regression_run_id TEXT
);

CREATE TABLE IF NOT EXISTS norm_changes(
  run_id TEXT,
  norm_id TEXT,
  change_type TEXT,
  old_hash TEXT,
  new_hash TEXT,
  detected_at TEXT,
  timepoint_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS report_lineage(
  case_id TEXT,
  run_id TEXT,
  snapshot_id TEXT,
  index_version TEXT,
  parser_version TEXT,
  model TEXT,
  prompt_hash TEXT
);

CREATE TABLE IF NOT EXISTS events(
  ts TEXT,
  case_id TEXT,
  step TEXT,
  model TEXT,
  prompt_hash TEXT,
  input_ref TEXT,
  output_ref TEXT,
  actor TEXT
);

CREATE TABLE IF NOT EXISTS cases(
  case_id TEXT PRIMARY KEY,
  snapshot_id TEXT,
  mode TEXT DEFAULT 'full',
  status TEXT,
  title TEXT,
  contract_type TEXT,
  contract_date TEXT,
  state_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS experts(
  expert_id TEXT PRIMARY KEY,
  name TEXT,
  title TEXT,
  affiliation TEXT,
  langs TEXT,
  fields TEXT,
  qualification TEXT,
  conflict_declared INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS consults(
  consult_id TEXT PRIMARY KEY,
  case_id TEXT,
  expert_id TEXT,
  expert_name TEXT,
  status TEXT,
  question_snapshot TEXT,
  evidence_summary TEXT,
  reply TEXT,
  conflict_affirmed INT DEFAULT 1,
  updated_at TEXT
);
"""


def init_snapshot_db(db_path: str) -> sqlite3.Connection:
    """初始化并建表快照库"""
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.executescript(SNAPSHOT_DB_SCHEMA)
    conn.commit()
    return conn


def init_state_db(db_path: str = "data/state/state.sqlite") -> None:
    """初始化并配置运行库（开启 WAL 与 busy_timeout）"""
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=30.0, check_same_thread=False)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=30000")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.executescript(STATE_DB_SCHEMA)

        # 动态迁移补充缺失字段
        migrations = [
            "ALTER TABLE experts ADD COLUMN title TEXT",
            "ALTER TABLE experts ADD COLUMN affiliation TEXT",
            "ALTER TABLE consults ADD COLUMN expert_name TEXT",
            "ALTER TABLE consults ADD COLUMN evidence_summary TEXT",
            "ALTER TABLE consults ADD COLUMN conflict_affirmed INT DEFAULT 1"
        ]
        for sql in migrations:
            try:
                conn.execute(sql)
            except Exception:
                pass

        conn.commit()
    finally:
        conn.close()


class StateDBManager:
    """运行库线程安全单例与写操作串行化锁管理器"""
    _instance: Optional["StateDBManager"] = None
    _lock = threading.Lock()

    def __init__(self, db_path: str = "data/state/state.sqlite"):
        self.db_path = db_path
        self._write_lock = threading.Lock()
        init_state_db(self.db_path)

    @classmethod
    def get_instance(cls, db_path: str = "data/state/state.sqlite") -> "StateDBManager":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls(db_path)
            return cls._instance

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=30000")
        conn.execute("PRAGMA synchronous=NORMAL")
        return conn

    def execute_write(self, func, *args, **kwargs):
        """将写操作串行化，防止 SQLite 锁竞争并强制关闭连接"""
        with self._write_lock:
            conn = self.get_connection()
            try:
                with conn:
                    res = func(conn, *args, **kwargs)
                return res
            finally:
                conn.close()

    def save_case(self, state: Any, title: Optional[str] = None):
        """保存或更新案件状态"""
        from lawagent.core.types import CaseState
        state_obj = state if isinstance(state, CaseState) else CaseState.model_validate(state)
        case_id = state_obj.case_id
        snapshot_id = state_obj.snapshot_id
        mode = state_obj.mode
        status = state_obj.status
        contract_type = state_obj.meta.contract_type or "涉外商事合同"
        contract_date = state_obj.meta.contract_date
        state_json = state_obj.model_dump_json()
        now = datetime.datetime.now().isoformat()
        created_at = state_obj.created_at or now
        updated_at = now

        resolved_title = title or (state_obj.facts_zh[:40] + "..." if len(state_obj.facts_zh) > 40 else state_obj.facts_zh) or f"涉外法查明案件-{case_id}"

        def _do_save(conn):
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO cases(case_id, snapshot_id, mode, status, title, contract_type, contract_date, state_json, created_at, updated_at)
                   VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(case_id) DO UPDATE SET
                     snapshot_id=excluded.snapshot_id,
                     mode=excluded.mode,
                     status=excluded.status,
                     title=COALESCE(?, cases.title),
                     contract_type=excluded.contract_type,
                     contract_date=excluded.contract_date,
                     state_json=excluded.state_json,
                     updated_at=excluded.updated_at""",
                (case_id, snapshot_id, mode, status, resolved_title, contract_type, contract_date, state_json, created_at, updated_at, title)
            )

        self.execute_write(_do_save)

    def get_case(self, case_id: str) -> Optional[Any]:
        """获取指定案件完整状态（严格保障释放数据库句柄）"""
        from lawagent.core.types import CaseState
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT title, state_json FROM cases WHERE case_id = ?", (case_id,))
            row = cur.fetchone()
            if not row or not row["state_json"]:
                return None
            state = CaseState.model_validate_json(row["state_json"])
            if row["title"]:
                state.title = row["title"]
                if state.meta:
                    state.meta.title = row["title"]
            return state
        finally:
            conn.close()

    def list_cases(self, role: Optional[str] = None) -> List[Any]:
        """列出案件概要清单（严格保障释放数据库句柄）"""
        from lawagent.core.types import CaseSummary
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT case_id, snapshot_id, mode, status, title, contract_type, contract_date, created_at, updated_at, state_json FROM cases ORDER BY updated_at DESC")
            rows = cur.fetchall()
            summaries = []
            for r in rows:
                issues_cnt = 1
                try:
                    import json
                    sdata = json.loads(r["state_json"])
                    issues_cnt = len(sdata.get("issues", [])) or 1
                except Exception:
                    pass
                summaries.append(CaseSummary(
                    case_id=r["case_id"],
                    title=r["title"] or f"涉外法查明案件-{r['case_id']}",
                    contract_type=r["contract_type"] or "国际货物买卖合同",
                    contract_date=r["contract_date"],
                    created_at=r["created_at"] or "",
                    updated_at=r["updated_at"] or "",
                    status=r["status"] or "draft",
                    mode=r["mode"] or "full",
                    snapshot_id=r["snapshot_id"] or "",
                    issues_count=issues_cnt
                ))
            return summaries
        finally:
            conn.close()

    def delete_case(self, case_id: str) -> bool:
        """删除案件"""
        def _do_del(conn):
            cur = conn.cursor()
            cur.execute("DELETE FROM cases WHERE case_id = ?", (case_id,))
        self.execute_write(_do_del)
        return True

    def list_experts(self) -> List[Dict[str, Any]]:
        """获取专家名录（严格保障释放数据库句柄）"""
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM experts")
            rows = cur.fetchall()
            if not rows:
                self._seed_experts()
                cur.execute("SELECT * FROM experts")
                rows = cur.fetchall()
            result = []
            for r in rows:
                result.append({
                    "expert_id": r["expert_id"],
                    "name": r["name"],
                    "title": r["title"] or "德国法特聘专家",
                    "affiliation": r["affiliation"] or "马克斯·普朗克研究所 / 汉堡大学",
                    "languages": [s.strip() for s in (r["langs"] or "德语, 英语, 中文").split(",")],
                    "fields": [s.strip() for s in (r["fields"] or "德国民商法, CISG, 国际私法").split(",")],
                    "qualification": r["qualification"] or "德国第二次国家司法考试合格 (Assessor iur.)",
                    "conflict_declared": bool(r["conflict_declared"])
                })
            return result
        finally:
            conn.close()

    def _seed_experts(self):
        experts = [
            ("EXP-001", "Dr. Hans Weber", "法学博士 / 德国执业律师", "法兰克福国际仲裁院 / 某知名涉外律所", "德语, 英语, 中文", "买卖合同法, 瑕疵担保, CISG", "德国法学博士、德国联邦最高法院诉讼出庭资格", 1),
            ("EXP-002", "Prof. Dr. Elena Schmidt", "终身教授", "马克斯·普朗克外国私法与国际私法研究所", "德语, 英语", "国际私法, 欧洲合同法, HGB 商法", "德国汉堡大学法学终身教授", 1),
            ("EXP-003", "Klaus Müller, LL.M.", "德国公证人 / 资深法律顾问", "慕尼黑商事法院出庭律师公会", "德语, 英语, 中文", "商法典第377条, 给付迟延与违约损害赔偿", "德国第二次司法考试合格、国际商会仲裁员", 1),
        ]
        def _do_seed(conn):
            cur = conn.cursor()
            for exp in experts:
                cur.execute(
                    """INSERT OR IGNORE INTO experts(expert_id, name, title, affiliation, langs, fields, qualification, conflict_declared)
                       VALUES(?, ?, ?, ?, ?, ?, ?, ?)""",
                    exp
                )
        self.execute_write(_do_seed)

    def list_consults(self, case_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取咨询流转记录（严格保障释放数据库句柄）"""
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            if case_id:
                cur.execute("SELECT * FROM consults WHERE case_id = ? ORDER BY updated_at DESC", (case_id,))
            else:
                cur.execute("SELECT * FROM consults ORDER BY updated_at DESC")
            rows = cur.fetchall()
            result = []
            for r in rows:
                result.append({
                    "consult_id": r["consult_id"],
                    "case_id": r["case_id"],
                    "expert_id": r["expert_id"],
                    "expert_name": r["expert_name"] or "德国法专家",
                    "status": r["status"] or "dispatched",
                    "question_snapshot": r["question_snapshot"] or "",
                    "evidence_summary": r["evidence_summary"] or "",
                    "reply": r["reply"] or "",
                    "conflict_affirmed": bool(r["conflict_affirmed"]),
                    "updated_at": r["updated_at"] or ""
                })
            return result
        finally:
            conn.close()

    def save_consult(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """保存或新增咨询流转记录"""
        consult_id = data.get("consult_id") or f"CON-{int(datetime.datetime.now().timestamp()*1000)}"
        case_id = data.get("case_id", "")
        expert_id = data.get("expert_id", "")
        expert_name = data.get("expert_name", "德国法专家")
        status = data.get("status", "dispatched")
        question_snapshot = data.get("question_snapshot", "")
        evidence_summary = data.get("evidence_summary", "")
        reply = data.get("reply", "")
        conflict_affirmed = 1 if data.get("conflict_affirmed", True) else 0
        updated_at = datetime.datetime.now().isoformat()

        def _do_save(conn):
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO consults(consult_id, case_id, expert_id, expert_name, status, question_snapshot, evidence_summary, reply, conflict_affirmed, updated_at)
                   VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(consult_id) DO UPDATE SET
                     status=excluded.status,
                     reply=excluded.reply,
                     updated_at=excluded.updated_at""",
                (consult_id, case_id, expert_id, expert_name, status, question_snapshot, evidence_summary, reply, conflict_affirmed, updated_at)
            )

        self.execute_write(_do_save)
        data["consult_id"] = consult_id
        data["updated_at"] = updated_at
        return data
