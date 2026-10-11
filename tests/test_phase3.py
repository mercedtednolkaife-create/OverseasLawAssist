"""阶段 3 单元测试 (Phase 3 Unit Tests)
测试覆盖：
1. 预检与时点核验 (Entry checks, CISG gate & Timepoint red/yellow)
2. 要素充分性评估 (Sufficiency rule & LLM evaluation)
3. 要件事实涵摄与判例比对 (Matcher subsumption, Fact trace & Case analogy)
4. 质量门禁全套校验 (Critic V1-V11 & Dashboard metrics)
5. 端到端 LangGraph 工作流编排执行 (S1 -> S9)
"""

import pytest
import os
import asyncio
from lawagent.core.types import (
    CaseState, CaseMeta, Fact, Claim, Material, LegalQuestion,
    ElementState, Evidence, Finding, Statement
)
from lawagent.flow.checks import generate_entry_checks, timepoint_level
from lawagent.flow.sufficiency import evaluate_sufficiency_rule
from lawagent.flow.matcher import match_facts_and_elements, check_fact_trace, check_entities, extract_similar_cases
from lawagent.flow.critic import run_critic_checks
from lawagent.flow.graph import build_law_graph, LawWorkflowRunner


@pytest.fixture
def sample_state():
    return CaseState(
        case_id="case_test_p3_001",
        snapshot_id="20261010-gii-v0.7",
        mode="lite",
        facts_zh="2023年4月1日，原告中国进出口公司与德方汉堡制造公司签订《精密机床采购合同》，约定德国法为准据法。货款已全额付清。2023年6月10日货物运抵中国港口，原告开箱检验即发现主轴精度偏离公差达0.15mm，存在严重瑕疵。原告于2023年6月12日以书面邮件向德方提出质量异议，并要求于15日内派员检修更换。德方逾期未予回应修复。原告遂主张解除合同并索赔损失。",
        claims_zh="请求解除买卖合同；请求退还全额货款并赔偿仓储及检验损失",
        meta=CaseMeta(
            jurisdiction="de_federal",
            contract_type="国际货物买卖合同",
            parties=["中国进出口公司", "汉堡制造公司"],
            contract_date="2023-04-01",
            event_date="2023-06-10",
            choice_of_law="德国法",
            cisg_excluded=True,
            both_merchants=True
        )
    )


def test_entry_checks_and_timepoints(sample_state):
    """测试 1: 预检清单与时点红黄两态规则"""
    checks = generate_entry_checks(sample_state.meta)
    assert len(checks) == 3
    # 法律选择
    assert checks[0].status == "satisfied"
    # CISG 排除
    assert checks[1].status == "satisfied"
    # 商人身份
    assert checks[2].status == "satisfied"

    # 时点核验：2023-04-01 晚于 2022-01-01 买卖法重大修订，应为 yellow 态
    level, reasons = timepoint_level(sample_state.meta, ["NORM:BGB:§434", "NORM:BGB:§437"])
    assert level == "yellow"
    assert len(reasons) > 0

    # 时点核验：若合同订立日早于 2022-01-01，触发 red 态
    old_meta = sample_state.meta.model_copy()
    old_meta.contract_date = "2021-05-01"
    old_level, old_reasons = timepoint_level(old_meta, ["NORM:BGB:§434"])
    assert old_level == "red"
    assert any("2022-01-01" in r for r in old_reasons)


def test_sufficiency_evaluation():
    """测试 2: 要素充分性评估规则"""
    q = LegalQuestion(
        qid="Q1",
        text_zh="买受人物之瑕疵救济权构成要件",
        must_norms=["BGB:§434", "BGB:§437"]
    )
    elements = [
        ElementState(qid="Q1", element_id="e1", name_zh="物之瑕疵认定"),
        ElementState(qid="Q1", element_id="e2", name_zh="事后履行优先与催告")
    ]
    # 模拟包含 §434 的证据
    evidence_dict = {
        "E1": Evidence(
            eid="E1",
            kind="norm",
            ref_id="NORM:BGB:§434",
            text_de="Die Sache ist frei von Sachmängeln...",
            source_url="https://www.gesetze-im-internet.de",
            stand="2026-10-10",
            fetched_at="2026-10-10T18:00:00"
        )
    }

    evaluated = evaluate_sufficiency_rule(q, elements, evidence_dict)
    assert len(evaluated) == 2
    # e1 关联了 must_norms 之一，应为 covered
    assert evaluated[0].status == "covered"
    assert len(evaluated[0].links) > 0
    assert evaluated[0].links[0].eid == "E1"


@pytest.mark.asyncio
async def test_fact_matcher_and_cases(sample_state):
    """测试 3: 事实溯源、实体一致性核查与判例提取"""
    facts = [
        Fact(fid="F1", text_zh="中国进出口公司与汉堡制造公司签订合同", span=(0, 20), disputed=False),
        Fact(fid="F2", text_zh="主轴精度偏离公差达0.15mm，存在严重瑕疵", span=(80, 110), disputed=False)
    ]
    
    # 溯源核查
    valid, errors = check_fact_trace(facts, ["F1", "F2"])
    assert valid is True
    assert len(errors) == 0

    invalid, bad_errors = check_fact_trace(facts, ["F99"])
    assert invalid is False

    # 实体一致性核查
    ent_ok, ent_errs = check_entities(sample_state.meta, facts)
    assert ent_ok is True

    # 判例提取
    evidence_dict = {
        "E1": Evidence(
            eid="E1",
            kind="case",
            ref_id="CASE:BGH:VIII ZR 12/20:2021-05-12",
            text_de="Der Bundesgerichtshof hat entschieden...",
            source_url="https://juris.bundesgerichtshof.de",
            stand="2021-05-12",
            fetched_at="2026-10-10T18:00:00"
        )
    }
    cases = extract_similar_cases(evidence_dict, facts)
    assert len(cases) == 1
    assert cases[0].court == "BGH"
    assert cases[0].az == "VIII ZR 12/20"


def test_critic_quality_gates(sample_state):
    """测试 4: Critic V1-V11 全套质量门禁与防线核验"""
    sample_state.evidence = {
        "E1": Evidence(
            eid="E1",
            kind="norm",
            ref_id="NORM:BGB:§433",
            text_de="Durch den Kaufvertrag wird der Verkäufer verpflichtet...",
            source_url="https://www.gesetze-im-internet.de",
            stand="2026-10-10",
            fetched_at="2026-10-10T18:00:00",
            grade="A"
        ),
        "E2": Evidence(
            eid="E2",
            kind="norm",
            ref_id="NORM:BGB:§434",
            text_de="Die Sache ist frei von Sachmängeln...",
            source_url="https://www.gesetze-im-internet.de",
            stand="2026-10-10",
            fetched_at="2026-10-10T18:00:00",
            grade="A"
        )
    }
    sample_state.translations = {
        "E1": "出卖人有义务向买受人交付标的物并转移所有权。",
        "E2": "标的物在风险转移时不具备约定的特征，即构成物之瑕疵。"
    }
    sample_state.facts = [
        Fact(fid="F1", text_zh="双方签订买卖合同", span=(0, 10)),
        Fact(fid="F2", text_zh="货物存在瑕疵", span=(20, 30))
    ]
    sample_state.elements = [
        ElementState(qid="Q1", element_id="e1", name_zh="物之瑕疵", status="covered", match_status="satisfied")
    ]
    sample_state.findings = [
        Finding(
            qid="Q1",
            statements=[
                Statement(
                    sid="S1",
                    text_zh="依据德国民法典第433条，买卖合同成立。",
                    type="quote",
                    part="A",
                    evidence_ids=["E1"],
                    quote_de="Durch den Kaufvertrag..."
                ),
                Statement(
                    sid="S2",
                    text_zh="依据德国民法典第434条，若买受人举证证明瑕疵存在，则趋向于构成物之瑕疵。",
                    type="inference",
                    part="B",
                    evidence_ids=["E2"],
                    fact_ids=["F2"],
                    element_id="e1"
                )
            ]
        )
    ]

    checks, dashboard = run_critic_checks(sample_state)
    assert len(checks) == 11
    # V1 (规范存在性) 应通过
    v1 = next(c for c in checks if c.code == "V1")
    assert v1.status == "pass"

    # V2 (无幻觉) 应通过
    v2 = next(c for c in checks if c.code == "V2")
    assert v2.status == "pass"

    # V8 (中立性防线) 应通过
    v8 = next(c for c in checks if c.code == "V8")
    assert v8.status == "pass"

    # V9 (双包结构) 应通过
    v9 = next(c for c in checks if c.code == "V9")
    assert v9.status == "pass"

    assert dashboard.content_hash != ""


@pytest.mark.asyncio
async def test_workflow_execution(sample_state):
    """测试 5: 端到端工作流编排执行 (S1 -> S9)"""
    runner = LawWorkflowRunner(in_memory=True)
    res_state = await runner.run(sample_state)

    assert res_state.status == "completed"
    assert res_state.current_node == "s9_export"
    assert len(res_state.facts) > 0
    assert len(res_state.claims) > 0
    assert len(res_state.issues) > 0
    assert len(res_state.questions) > 0
    assert len(res_state.elements) > 0
    assert len(res_state.evidence) > 0
    assert len(res_state.findings) > 0
    assert len(res_state.checks) == 11
    assert res_state.dashboard.content_hash != ""
