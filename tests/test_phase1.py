"""阶段 1 单元测试套件 (Phase 1 Unit Tests)
测试覆盖：
1. 核心状态对象与数据类型校验 (CaseState, CaseMeta, Fact F#, Claim C#, Evidence E#)
2. 多法域注册中心 (JurisdictionRegistry) 扩展性
3. 只读快照库与运行库 (SnapshotManager, StateDBManager)
4. 德语法条精确查找 (BGB:§433, HGB:§377) 与判例查找
5. 大模型客户端结构化 JSON 输出
"""

import os
import pytest
from pydantic import ValidationError
from lawagent.core.types import (
    CaseMeta, Fact, Claim, Material, Evidence, Statement, CaseState, CaseSummary
)
from lawagent.core.jurisdiction import JurisdictionRegistry, JurisdictionMetadata
from lawagent.store.snapshots import SnapshotManager
from lawagent.store.db import StateDBManager
from lawagent.llm.client import LLMClient


def test_core_types_validation():
    """测试状态模型契约与字段验证"""
    meta = CaseMeta(
        contract_type="机械设备买卖",
        parties=["中国某机械出口公司", "德国汉堡工业采购有限公司"],
        contract_date="2021-06-01",
        choice_of_law="德国法",
        cisg_excluded=True,
        both_merchants=True,
    )
    assert meta.contract_date == "2021-06-01"
    assert meta.jurisdiction == "de_federal"

    fact = Fact(fid="F1", text_zh="买方于2021年9月15日签收设备", span=(0, 20), disputed=False)
    assert fact.fid == "F1"

    ev = Evidence(
        eid="E1",
        kind="norm",
        ref_id="BGB:§433",
        text_de="Durch den Kaufvertrag...",
        source_url="https://gesetze-im-internet.de",
        fetched_at="2026-10-10T12:00:00Z",
        grade="A",
    )
    assert ev.grade == "A"


def test_jurisdiction_registry():
    """测试多法域注册与插拔协议"""
    de_meta = JurisdictionRegistry.get("de_federal")
    assert de_meta is not None
    assert de_meta.name_zh == "德国联邦法"
    assert "BGB" in de_meta.default_laws

    # 测试扩展注册新法域
    JurisdictionRegistry.register(
        JurisdictionMetadata(
            code="test_cn",
            name_zh="中国涉外民商法",
            primary_language="zh",
            citation_standard="prc_laws",
            default_laws=["民法典", "涉外民事关系法律适用法"],
        )
    )
    cn_meta = JurisdictionRegistry.get("test_cn")
    assert cn_meta is not None
    assert cn_meta.code == "test_cn"


def test_snapshot_db_and_lookup():
    """测试快照数据库中实际入库的法条与判例精确检索"""
    mgr = SnapshotManager()
    cur_id = mgr.get_current_snapshot_id()
    assert cur_id is not None

    # 验证 BGB § 433
    bgb433 = mgr.norm_lookup("BGB", "§ 433")
    assert bgb433 is not None
    assert bgb433["norm_id"] == "BGB:§433"
    assert "Kaufvertrag" in bgb433["title"] or "Kauf" in bgb433["title"]

    # 验证 HGB § 377 (商事检验通知)
    hgb377 = mgr.norm_lookup("HGB", "§ 377")
    assert hgb377 is not None
    assert hgb377["norm_id"] == "HGB:§377"

    # 验证 金标准判例检索
    case1 = mgr.case_lookup("BGH:VIII ZR 12/20:2021-05-12")
    assert case1 is not None
    assert case1["az"] == "VIII ZR 12/20"
    assert "Nacherfüllung" in case1["leitsatz"]


def test_state_db_manager():
    """测试运行库 WAL 模式与写入串行化"""
    state_mgr = StateDBManager.get_instance("data/state/state.sqlite")
    conn = state_mgr.get_connection()
    row = conn.execute("PRAGMA journal_mode;").fetchone()
    assert row[0].lower() == "wal"

    def write_op(c):
        c.execute(
            """INSERT OR REPLACE INTO case_registry
               (case_id, owner, role, snapshot_id, mode, status, created_at, updated_at)
               VALUES ('test_c01', 'test_owner', 'practitioner', '20261010-gii-v0.7', 'full', 'draft', '2026-10-10', '2026-10-10')"""
        )

    state_mgr.execute_write(write_op)
    check_row = conn.execute("SELECT status FROM case_registry WHERE case_id = 'test_c01'").fetchone()
    assert check_row["status"] == "draft"


def test_llm_client_extract_and_judge():
    """测试大模型客户端对 Qwen 与 DeepSeek 两个厂商接口的结构化调用"""
    client = LLMClient()
    res_extract = client.json_completion(
        task="extract",
        system_prompt="你是一个结构化数据提取助手，严格输出合法 JSON 包含 key: 'greeting'",
        user_prompt="你好",
    )
    assert isinstance(res_extract, dict)
    assert "greeting" in res_extract

    res_judge = client.json_completion(
        task="judge",
        system_prompt="你是一个法律论断质检助手，严格输出合法 JSON 包含 key: 'verdict'",
        user_prompt="评估：物之瑕疵要求标的物不符合主观或客观标准。",
    )
    assert isinstance(res_judge, dict)
    assert "verdict" in res_judge
