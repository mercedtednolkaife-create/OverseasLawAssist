"""阶段 4 单元测试 (Phase 4 API Tests)
测试覆盖：
1. FastAPI 健康检查与生命周期
2. 案件增删查改 (CRUD)
3. 闸门确认与陈述逐条审核 (Confirm Gate & Statement Review)
4. 法条判例全文检索接口 (Norm & Case Search)
5. 外国法证据材料核验接口 (Material Verification)
6. 专家名录与会商流转接口 (Experts & Consults)
"""

import pytest
from fastapi.testclient import TestClient
from lawagent.api.main import app
from lawagent.core.types import CaseMeta


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_healthcheck(client):
    """测试 1: 健康检查接口"""
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_list_and_get_cases(client):
    """测试 2: 获取播种示范案件"""
    res = client.get("/api/cases")
    assert res.status_code == 200
    cases = res.json()
    assert len(cases) >= 1
    assert any(c["case_id"] == "C001" for c in cases)

    # 获取 C001 详情
    detail_res = client.get("/api/cases/C001")
    assert detail_res.status_code == 200
    c1 = detail_res.json()
    assert c1["case_id"] == "C001"
    assert len(c1["findings"]) > 0
    assert len(c1["evidence"]) > 0


def test_create_and_run_case(client):
    """测试 3: 创建新案件与预检"""
    payload = {
        "title": "测试机床质量违约案",
        "facts_zh": "原告向德方采购设备，收货后发现主轴振动超标，德方拒绝保修。",
        "claims_zh": "解除合同并退款",
        "meta": {
            "jurisdiction": "de_federal",
            "contract_type": "国际货物买卖合同",
            "parties": ["原告公司", "德方供应商"],
            "contract_date": "2023-05-01",
            "choice_of_law": "德国法",
            "cisg_excluded": True,
            "both_merchants": True
        },
        "consent_version": "v1.0"
    }
    create_res = client.post("/api/cases", json=payload)
    assert create_res.status_code == 201
    data = create_res.json()
    case_id = data["case_id"]
    assert case_id.startswith("C")
    assert len(data["initial_state"]["entry_checks"]) == 3

    # 触发运行
    run_res = client.post(f"/api/cases/{case_id}/run")
    assert run_res.status_code == 200
    assert "job_id" in run_res.json()

    # 清理测试案件，避免测试数据污染展示数据库
    del_res = client.delete(f"/api/cases/{case_id}")
    assert del_res.status_code == 204


def test_confirm_gate_and_review(client):
    """测试 4: 闸门确认与陈述审阅"""
    # 审阅 C001 陈述
    review_payload = {
        "action": "edit",
        "updated_text": "依据《德国民法典》第434条第1款，标的物在风险转移时不符合约定技术特征的，依法构成物之瑕疵（人工专家校订）。",
        "note": "强化法条款项表述精度"
    }
    patch_res = client.patch("/api/cases/C001/statements/S1", json=review_payload)
    assert patch_res.status_code == 200
    updated_c1 = patch_res.json()
    s1 = next(st for f in updated_c1["findings"] for st in f["statements"] if st["sid"] == "S1")
    assert s1["review_action"] == "edit"
    assert "人工专家校订" in s1["text_zh"]


def test_search_endpoint(client):
    """测试 5: 全文检索接口"""
    # 问句为空返回默认核心条文
    res_empty = client.get("/api/search")
    assert res_empty.status_code == 200
    items = res_empty.json()
    assert len(items) > 0
    assert any("434" in it["id"] for it in items)

    # 关键词检索
    res_q = client.get("/api/search?q=Sachmangel")
    assert res_q.status_code == 200
    assert len(res_q.json()) > 0


def test_verify_materials_endpoint(client):
    """测试 6: 外国法证据材料核验接口"""
    text = "根据当事人提交之说明，原告引用 BGB § 433 及 BGB § 434 说明德方负有交付无瑕疵标的物之义务，并参考 BGH VIII ZR 12/20 判例。"
    res = client.post("/api/verify-materials", json={"raw_text": text})
    assert res.status_code == 200
    result = res.json()
    assert result["summary"]["total"] >= 2
    assert result["summary"]["verified_count"] >= 1


def test_experts_and_consults_endpoint(client):
    """测试 7: 专家名录与会商流转接口"""
    exp_res = client.get("/api/experts")
    assert exp_res.status_code == 200
    experts = exp_res.json()
    assert len(experts) >= 3

    # 发起咨询
    consult_payload = {
        "case_id": "C001",
        "expert_id": experts[0]["expert_id"],
        "question_snapshot": "关于HGB第377条检验催告合理期限在汉堡地院的抗辩认定倾向",
        "evidence_summary": "BGB § 434, HGB § 377, BGH VIII ZR 12/20"
    }
    c_res = client.post("/api/consults", json=consult_payload)
    assert c_res.status_code == 200
    consult_data = c_res.json()
    assert consult_data["case_id"] == "C001"
    assert consult_data["status"] == "dispatched"


def test_export_docx_endpoint(client):
    """测试 8: Word (DOCX) 报告生成与导出"""
    res = client.get("/api/cases/C001/export/docx")
    assert res.status_code == 200
    assert "application/vnd.openxmlformats" in res.headers.get("content-type", "")
    assert len(res.content) > 1000  # Valid docx bytes


def test_agent_workflow_and_chat_endpoints(client):
    """测试 9: Agent 工作台协同轨迹与 Copilot 追问接口"""
    # 1. 获取 C001 的 7 大 Agent 流水线
    wf_res = client.get("/api/cases/C001/agent-workflow")
    assert wf_res.status_code == 200
    wf_data = wf_res.json()
    assert wf_data["total_steps"] == 7
    assert len(wf_data["steps"]) == 7
    step_ids = [s["step_id"] for s in wf_data["steps"]]
    assert step_ids == ["extract", "precheck", "retrieval", "subsumption", "red_team_strategist", "judge", "drafter"]
    assert wf_data["steps"][5]["model"] == "deepseek-v4-pro-0813"

    # 1.1 方案 A：获取动态胜败边界推演与红队攻防对抗评估
    strat_res = client.get("/api/cases/C001/strategic-assessment")
    assert strat_res.status_code == 200
    strat_data = strat_res.json()
    assert strat_data["case_id"] == "C001"
    assert len(strat_data["outcome_branches"]) >= 3
    assert len(strat_data["red_team_defenses"]) >= 3
    assert len(strat_data["pivotal_factors"]) >= 3

    # 2. 追问 Copilot (实务端中立研判)
    chat_payload = {
        "messages": [
            {"role": "user", "content": "德方主张 HGB § 377 逾期，我们有什么抗辩路径？"}
        ],
        "role_view": "practitioner",
        "mode": "neutral"
    }
    chat_res = client.post("/api/cases/C001/chat", json=chat_payload)
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["case_id"] == "C001"
    assert chat_data["mode"] == "neutral"
    assert len(chat_data["reply"]) > 50
    assert "377" in chat_data["reply"] or "HGB" in chat_data["reply"]

    # 3. 追问 Copilot (德方红方反击演练模式)
    red_chat_payload = {
        "messages": [
            {"role": "user", "content": "德方如何以 HGB § 377 逾期为由要求法院直接驳回我方瑕疵主张？"}
        ],
        "role_view": "practitioner",
        "mode": "red_teaming"
    }
    red_res = client.post("/api/cases/C001/chat", json=red_chat_payload)
    assert red_res.status_code == 200
    red_data = red_res.json()
    assert red_data["case_id"] == "C001"
    assert red_data["mode"] == "red_teaming"
    assert "德方" in red_data["reply"] or "反击" in red_data["reply"] or "377" in red_data["reply"]

    # 4. 一键沉淀研判成果至分析底稿 (B 包实务备忘与出庭提纲)
    insight_payload = {
        "category": "memo",
        "title": "针对德方 HGB § 377 逾期抗辩的三重进攻防线备忘",
        "content": red_data["reply"],
        "source_model": red_data["model"],
        "referenced_statutes": red_data.get("referenced_statutes", ["HGB § 377"])
    }
    ins_res = client.post("/api/cases/C001/insights", json=insight_payload)
    assert ins_res.status_code == 200
    ins_data = ins_res.json()
    assert ins_data["case_id"] == "C001"
    assert ins_data["category"] == "memo"
    assert ins_data["insight_id"].startswith("INS-")

    # 5. 获取案件已沉淀成果清单
    list_ins_res = client.get("/api/cases/C001/insights")
    assert list_ins_res.status_code == 200
    saved_list = list_ins_res.json()
    assert len(saved_list) >= 1
    assert any(i["insight_id"] == ins_data["insight_id"] for i in saved_list)

