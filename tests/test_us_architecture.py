"""三位一体分层协同架构单元测试 (Trinity US Law Architecture Tests)
测试覆盖：
1. Tier 2: CourtListener 动态判例检索、法院层级加权与 Shepardizing 好法门禁核验
2. Tier 3: 中国涉外司法实务定向校准器 (USAdmissibilityCalibrator) 入口清单、举证责任分配与《司法解释（二）》合规性
3. 端到端涉美法律 Multi-Agent 流水线协同执行 (S1 -> S9)
"""

import pytest
from lawagent.core.types import CaseState, CaseMeta
from lawagent.integrations.courtlistener import (
    CourtListenerClient, ShepardizingValidator, CourtTier, ShepardsSignal
)
from lawagent.flow.us_admissibility_calibrator import USAdmissibilityCalibrator
from lawagent.flow.graph import LawWorkflowRunner


def test_courtlistener_precedents_and_shepardizing():
    """测试 Tier 2: CourtListener 检索、法院层级加权与 Shepardizing 坏法拦截"""
    client = CourtListenerClient()

    # 1. 正常检索好法
    res = client.search_precedents("UCC 2-607 notice of breach", top_k=3, require_good_law=True)
    assert len(res) > 0
    # 验证命中 Eastern Air Lines 先例
    case_ids = [c.case_id for c in res]
    assert any("Eastern-Air-Lines" in cid for cid in case_ids)

    # 验证先例属性与好法校验
    target = next(c for c in res if "Eastern-Air-Lines" in c.case_id)
    assert target.court_tier == CourtTier.CIRCUIT_APPEALS
    assert target.tier_weight == 0.85
    assert target.shepards_signal == ShepardsSignal.POSITIVE
    assert target.precedential_status == "Published"

    is_valid, reason = ShepardizingValidator.validate(target)
    assert is_valid is True
    assert "有效好法" in reason

    # 2. Shepardizing 坏法拦截测试 (Roto-Lith 旧判例已被推翻)
    shep_bad = client.shepardize("CASE:1ST-CIR:Roto-Lith-v-Bartlett:1962")
    assert shep_bad["found"] is True
    assert shep_bad["is_good_law"] is False
    assert "坏法拦截" in shep_bad["validation_note"]

    # 验证在 require_good_law=True 时自动从检索结果中过滤掉
    bad_search_res = client.search_precedents("Roto-Lith condition acceptance", require_good_law=True)
    assert not any("Roto-Lith" in c.case_id for c in bad_search_res)

    # 3. 验证 SCOTUS 1782 跨境取证先例
    shep_scotus = client.shepardize("CASE:SCOTUS:Intel v. AMD:2004")
    assert shep_scotus["found"] is True
    assert shep_scotus["court_tier"] == CourtTier.SCOTUS
    assert shep_scotus["is_good_law"] is True


def test_us_admissibility_calibrator():
    """测试 Tier 3: 中国涉外司法实务定向校准器"""
    meta = CaseMeta(
        jurisdiction="us_commercial",
        contract_type="高精工业半导体设备买卖合同",
        parties=["上海微电子科技公司", "美方半导体系统公司"],
        contract_date="2023-05-10",
        event_date="2023-07-05",
        choice_of_law="纽约州 UCC",
        cisg_excluded=True,
        both_merchants=True
    )

    # 1. 涉美入口检查清单 (5项要素)
    checks = USAdmissibilityCalibrator.calibrate_entry_checks(meta)
    assert len(checks) == 5
    assert checks[0].status == "satisfied"  # 准据法选法
    assert checks[1].status == "satisfied"  # CISG 排除
    assert checks[2].status == "satisfied"  # UCC § 2-104 商人
    assert checks[3].status == "satisfied"  # UCC § 2-725 时效
    assert checks[4].status == "satisfied"  # 公证认证/海牙附加证明书

    # 2. 司法举证与要件指引
    guidance = USAdmissibilityCalibrator.get_judicial_guidance(meta)
    assert "statutory_chain" in guidance
    assert len(guidance["statutory_chain"]) >= 4
    assert "burden_of_proof" in guidance
    assert len(guidance["burden_of_proof"]["plaintiff_burden"]) > 0
    assert len(guidance["burden_of_proof"]["defendant_defense"]) > 0

    # 3. 《司法解释（二）》第三条八项要素合规报告
    sample_state = CaseState(
        case_id="C004_TEST",
        snapshot_id="20261010-gii-v0.7",
        mode="full",
        facts_zh="涉美半导体设备买卖纠纷",
        meta=meta
    )
    report = USAdmissibilityCalibrator.generate_admissibility_report(sample_state)
    assert report["admissibility_score"] >= 90
    assert len(report["eight_elements_compliance"]) == 8
    assert "Apostille" in report["apostille_recommendation"]


@pytest.mark.asyncio
async def test_us_end_to_end_workflow():
    """测试端到端涉美 Multi-Agent 流水线协同运行 (S1 -> S9)"""
    state = CaseState(
        case_id="case_us_test_run",
        snapshot_id="20261010-gii-v0.7",
        mode="lite",  # lite 模式全自动跑通 S1-S9
        facts_zh="2023年5月10日，原告中国微电子公司与被告美方芯片系统公司签订高精晶圆检测设备采购协议，约定纽约州UCC为准据法并排除CISG。2023年7月5日货物到港开箱测试发现激光波长偏离超差，买方于2023年7月28日（第23天）发出正式违约通知并要求排查修复。美方抗辩称买方未在合理期间内通知且已失权。",
        claims_zh="依 UCC § 2-714 请求退货退款并赔偿停机损失45万美元",
        meta=CaseMeta(
            jurisdiction="us_commercial",
            contract_type="高精设备买卖合同",
            parties=["中国微电子公司", "美方芯片系统公司"],
            contract_date="2023-05-10",
            event_date="2023-07-05",
            choice_of_law="纽约州 UCC",
            cisg_excluded=True,
            both_merchants=True
        )
    )

    runner = LawWorkflowRunner(in_memory=True)
    res = await runner.run(state)

    # 验证生命周期完成
    assert res.status == "completed"
    assert res.current_node == "s9_export"

    # 验证 S3 争点拆解为 UCC 瑕疵担保与合理通知
    assert len(res.issues) >= 3
    assert any("UCC" in iss.text_zh for iss in res.issues)

    # 验证 S4 检索纳入 UCC 法条与 CourtListener 判例
    assert len(res.evidence) > 0
    ref_ids = [ev.ref_id for ev in res.evidence.values()]
    assert any("UCC:" in ref for ref in ref_ids)
    assert any("CASE:" in ref for ref in ref_ids)

    # 验证 S5 判例比对自动适配美国法院
    assert len(res.similar_cases) > 0
    assert any("美国" in sc.court for sc in res.similar_cases)

    # 验证 S7 双包起草与规范陈述
    assert len(res.findings) > 0
    p_a_stmts = [s for f in res.findings for s in f.statements if s.part == "A"]
    assert len(p_a_stmts) > 0
    assert any("美国统一商法典" in s.text_zh for s in p_a_stmts)

    # 验证 Critic 门禁与报告指纹
    assert len(res.checks) == 11
    assert res.dashboard.content_hash != ""
