"""FastAPI 主应用入口 (Main Application)
挂载 CORS 中间件、业务路由子模块与应用生命周期钩子
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from lawagent.api.routes import cases, search, verify, consults
from lawagent.store.db import StateDBManager
from lawagent.store.snapshots import SnapshotManager
from lawagent.core.types import (
    CaseState, CaseMeta, Fact, Claim, Material, LegalQuestion, Issue, EntryCheckItem,
    ElementState, Evidence, Finding, Statement, CheckItem, DashboardMetrics, SimilarCaseItem
)
from lawagent.flow.strategist import build_strategic_assessment


def seed_demo_cases_if_empty(db: StateDBManager):
    """当运行库缺少核心示范案时，自动播种 3 起符合真实涉外审判标准的示范案件"""
    existing_ids = {c.case_id for c in db.list_cases()}

    # Case 1: 中德精密机床物之瑕疵查明案 (全流程完成)
    if "C001" not in existing_ids:
        c1 = CaseState(
            case_id="C001",
            snapshot_id="20261010-gii-v0.7",
            mode="full",
            facts_zh="2023年4月1日，原告中国进出口公司与德方汉堡制造公司签订《精密机床采购合同》，约定德国法为准据法且有效排除CISG。货款已全额付清。2023年6月10日货物运抵中国港口，原告开箱检验即发现主轴精度偏离公差达0.15mm，存在严重瑕疵。原告于2023年6月12日以书面邮件向德方提出质量异议，并要求于15日内派员检修更换。德方逾期未予回应修复。原告遂主张解除合同并索赔损失。",
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
            ),
            flags=["CISG_CHECK", "TIME_POINT_YELLOW"],
            timepoint={
                "level": "yellow",
                "reasons": ["合同订立于2023-04-01，适用2022年1月1日重大修订后之新买卖法合并版文本"]
            },
            entry_checks=[
                EntryCheckItem(
                    name="合同是否明确约定适用德国法",
                    status="satisfied",
                    detail="合同选法条款明确约定适用德国法，且已有效排除CISG，当事人意思自治合法有效。"
                ),
                EntryCheckItem(
                    name="CISG联合国国际货物销售合同公约适用与排除状态",
                    status="satisfied",
                    detail="买卖双方在采购合同中明示排除CISG适用，直接适用《德国民法典》(BGB)及《德国商法典》(HGB)。"
                ),
                EntryCheckItem(
                    name="当事人商人身份与德国商法典适用",
                    status="satisfied",
                    detail="双方当事人均为注册商事实体（双方商行为），全面适用《德国商法典》第377条即刻检验与通知规则。"
                )
            ],
            issues=[
                Issue(
                    issue_id="ISSUE-01",
                    kind="law",
                    text_zh="《德国民法典》第434条第1款物之瑕疵认定标准，及第437条第2项所定事后履行优先与合理催告期限届满之前提要件",
                    claim_ids=["C1"],
                    element_ids=["e1", "e2"]
                ),
                Issue(
                    issue_id="ISSUE-02",
                    kind="law",
                    text_zh="《德国商法典》第377条商事买卖即刻检验与异议通知义务（Rügepflicht）的起算时点与失权法律效果",
                    claim_ids=["C1", "C2"],
                    element_ids=["e3"]
                ),
                Issue(
                    issue_id="ISSUE-03",
                    kind="fact",
                    text_zh="机床到港后2日内开箱发现主轴精度偏离公差0.15mm并发出书面邮件，是否满足商事检验通知之及时性（unverzüglich）要求",
                    claim_ids=["C1"],
                    element_ids=["e1", "e3"]
                ),
                Issue(
                    issue_id="ISSUE-04",
                    kind="fact",
                    text_zh="原告所设定的15日检修补正期，结合涉外精密机床制造特性，是否达到客观合理期限（angemessene Frist）标准",
                    claim_ids=["C1", "C2"],
                    element_ids=["e2"]
                )
            ],
            facts=[
                Fact(fid="F1", text_zh="双方于2023年4月1日签订《精密机床采购合同》，约定德国法为准据法", span=(0, 48)),
                Fact(fid="F2", text_zh="2023年6月10日收货开箱检验发现主轴精度偏离公差达0.15mm，存在严重瑕疵", span=(62, 110)),
                Fact(fid="F3", text_zh="原告于2023年6月12日书面提出质量异议并设定15日期限要求检修更换，德方逾期未履行", span=(111, 168))
            ],
            claims=[
                Claim(cid="C1", party="中国进出口公司", text_zh="请求解除买卖合同并退还货款"),
                Claim(cid="C2", party="中国进出口公司", text_zh="请求赔偿仓储及检验损失")
            ],
            materials=[
                Material(mid="M1", name="精密机床买卖合同", desc_zh="载有德国法准据法条款与技术公差附件", fact_ids=["F1"]),
                Material(mid="M2", name="到港商检检测报告", desc_zh="证明主轴公差超标0.15mm", fact_ids=["F2"]),
                Material(mid="M3", name="书面催告与催告函邮件记录", desc_zh="证明2日内即刻发出异议并给予15日补正期", fact_ids=["F3"])
            ],
            questions=[
                LegalQuestion(
                    qid="Q1",
                    text_zh="德国法下买受人因标的物存在瑕疵可主张何种救济权利，及商事检验通知义务对请求权之影响？",
                    queries_de=["Sachmangel Nacherfüllung Kaufvertrag BGB § 437", "Rügepflicht HGB § 377"],
                    must_norms=["BGB:§434", "BGB:§437", "BGB:§439", "HGB:§377"],
                    status="confirmed",
                    done=True
                )
            ],
            elements=[
                ElementState(
                    qid="Q1",
                    element_id="e1",
                    name_zh="标的物物之瑕疵认定",
                    status="covered",
                    links=[{"eid": "E1", "relation": "supports"}],
                    fact_links=["F2"],
                    match_status="satisfied",
                    match_note="商检报告与事实明确证实主轴精度偏离约定公差，构成 § 434 第1款主客观特征不符。"
                ),
                ElementState(
                    qid="Q1",
                    element_id="e2",
                    name_zh="事后履行优先原则与合理催告期限届满",
                    status="covered",
                    links=[{"eid": "E2", "relation": "supports"}, {"eid": "E3", "relation": "supports"}],
                    fact_links=["F3"],
                    match_status="satisfied",
                    match_note="买受人已明确发出书面催告并设定15日合理补正期，卖方逾期未修复，满足 § 323 合同解除法定前提。"
                ),
                ElementState(
                    qid="Q1",
                    element_id="e3",
                    name_zh="商事买卖即刻检验与通知义务 (Rügepflicht)",
                    status="covered",
                    links=[{"eid": "E4", "relation": "supports"}],
                    fact_links=["F2", "F3"],
                    match_status="satisfied",
                    match_note="标的物到港开箱检验后2日内即发出通知，符合 HGB § 377 规定的不无故迟延（unverzüglich）要求。"
                )
            ],
            evidence={
                "E1": Evidence(
                    eid="E1",
                    kind="norm",
                    ref_id="BGB:§434",
                    text_de="Die Sache ist frei von Sachmängeln, wenn sie bei Gefahrübergang den subjektiven Anforderungen, den objektiven Anforderungen und den Montageanforderungen dieser Vorschrift entspricht.",
                    source_url="https://www.gesetze-im-internet.de/bgb/__434.html",
                    stand="BGBl. I S. 2154",
                    fetched_at="2026-10-10T12:00:00Z",
                    grade="A"
                ),
                "E2": Evidence(
                    eid="E2",
                    kind="norm",
                    ref_id="BGB:§437",
                    text_de="Ist die Sache mangelhaft, kann der Käufer, wenn die Voraussetzungen der folgenden Vorschriften vorliegen und soweit nicht ein anderes bestimmt ist, nach § 439 Nacherfüllung verlangen, nach den §§ 440, 323 und 326 Abs. 5 von dem Vertrag zurücktreten oder nach § 441 den Kaufpreis mindern und nach den §§ 440, 280, 281, 283 und 311a Schadensersatz... verlangen.",
                    source_url="https://www.gesetze-im-internet.de/bgb/__437.html",
                    stand="BGBl. I S. 2154",
                    fetched_at="2026-10-10T12:00:00Z",
                    grade="A"
                ),
                "E3": Evidence(
                    eid="E3",
                    kind="norm",
                    ref_id="BGB:§323",
                    text_de="Bestimmt der Gläubiger dem Schuldner erfolglos eine angemessene Frist zur Leistung oder Nacherfüllung, so kann er vom Vertrag zurücktreten.",
                    source_url="https://www.gesetze-im-internet.de/bgb/__323.html",
                    stand="BGBl. I S. 2154",
                    fetched_at="2026-10-10T12:00:00Z",
                    grade="A"
                ),
                "E4": Evidence(
                    eid="E4",
                    kind="norm",
                    ref_id="HGB:§377",
                    text_de="Ist der Kauf für beide Teile ein Handelsgeschäft, so hat der Käufer die Ware unverzüglich nach der Ablieferung durch den Verkäufer, soweit dies nach ordnungsmäßigem Geschäftsgang tunlich ist, zu untersuchen und, wenn sich ein Mangel zeigt, dem Verkäufer unverzüglich Anzeige zu machen.",
                    source_url="https://www.gesetze-im-internet.de/hgb/__377.html",
                    stand="BGBl. I S. 2154",
                    fetched_at="2026-10-10T12:00:00Z",
                    grade="A"
                )
            },
            translations={
                "E1": "标的物在风险转移时符合本条规定的主观要求、客观要求和安装要求的，为无物之瑕疵。",
                "E2": "标的物有瑕疵的，买受人得请求事后履行；得依法解除合同或请求减价；并得请求损害赔偿。",
                "E3": "债权人向债务人指定补正履行之合理期限届满无结果的，得解除合同。",
                "E4": "买卖对双方均为商行为的，买受人应在出卖人交付后依照通常业务程序即刻检验，发现瑕疵应即刻向出卖人通知。"
            },
            similar_cases=[
                SimilarCaseItem(
                    case_id="CASE:BGH:VIII ZR 12/20:2021-05-12",
                    eid="E5",
                    court="BGH",
                    az="VIII ZR 12/20",
                    date="2021-05-12",
                    similarity_points=["均涉及买卖合同标的物技术规格瑕疵", "均涉及解除合同前合理催告期之设定"],
                    difference_points=["本案买受人开箱后2日内即行通知，判例案情中买方迟延催告近1个月"],
                    court_view_quote_de="Ein Käufer kann wegen eines Sachmangels der Kaufsache erst dann wirksam zurücktreten, wenn er dem Verkäufer zuvor eine angemessene Frist zur Nacherfüllung bestimmt hat.",
                    court_view_zh="德国联邦最高法院裁判要旨：买受人因标的物物之瑕疵有效行使解除权之前提，系事先向出卖人设定合理的事后履行期限。",
                    divergence_flag="consistent"
                )
            ],
            counsel_questions=[
                "请向德国出庭律师确认：在汉堡地方法院起诉前，本案15日催告期是否已充分达到客观合理（angemessen）标准？",
                "请评估：若德方主张异议通知未送达法定代表人的抗辩，德国判例法对此类电子送达的认定倾向。"
            ],
            findings=[
                Finding(
                    qid="Q1",
                    statements=[
                        Statement(
                            sid="S1",
                            text_zh="依据《德国民法典》第434条第1款，标的物在风险转移时不符合约定技术特征的，依法构成物之瑕疵。",
                            type="quote",
                            evidence_ids=["E1"],
                            part="A",
                            quote_de="Die Sache ist frei von Sachmängeln...",
                            grade="A",
                            status="ok"
                        ),
                        Statement(
                            sid="S2",
                            text_zh="依据《德国民法典》第437条第2项及第323条第1款，买受人享有解除合同之法定请求权，但以催告并设定合理期限无结果为前提。",
                            type="quote",
                            evidence_ids=["E2", "E3"],
                            part="A",
                            quote_de="Bestimmt der Gläubiger dem Schuldner erfolglos eine angemessene Frist...",
                            grade="A",
                            status="ok"
                        ),
                        Statement(
                            sid="S3",
                            text_zh="依据事实证据（F2、M2），机床主轴公差偏离约定达0.15mm，在买受人举证证明该技术偏差的前提下，趋向于满足德国法物之瑕疵之构成要件。",
                            type="inference",
                            evidence_ids=["E1"],
                            part="B",
                            fact_ids=["F2"],
                            material_ids=["M2"],
                            element_id="e1",
                            status="ok"
                        ),
                        Statement(
                            sid="S4",
                            text_zh="依据事实证据（F3、M3），买受人于发现瑕疵后即刻发出异议并设定15日合理补正期（HGB § 377），期满德方未修复，在法律效果上趋向于支持解除买卖合同之诉求。",
                            type="inference",
                            evidence_ids=["E3", "E4"],
                            part="B",
                            fact_ids=["F3"],
                            material_ids=["M3"],
                            element_id="e2",
                            status="ok"
                        )
                    ],
                    gaps=[]
                )
            ],
            checks=[
                CheckItem(code="V1", status="pass", reason="所有引用法条均在官方合并版快照中经检验存在"),
                CheckItem(code="V2", status="pass", reason="所有原文引用陈述均有效锚定已检验的德文证据材料"),
                CheckItem(code="V3", status="pass", reason="已完整绑定不可变法条快照指纹: 20261010-gii-v0.7"),
                CheckItem(code="V4", status="pass", reason="时点核验判定为【yellow】态：适用2022新法现行合并版"),
                CheckItem(code="V5", status="pass", reason="CISG适用状态已明确有效排除"),
                CheckItem(code="V6", status="pass", reason="已翻译全部核心规范文本，德文原始条款与专业术语对齐保存"),
                CheckItem(code="V7", status="pass", reason="咨询准备包所有事实分析陈述均精准回溯至 F# 事实编号"),
                CheckItem(code="V8", status="pass", reason="所有表述均严守条件判断与中立客观立场，未出现绝对诉讼结果预测"),
                CheckItem(code="V9", status="pass", reason="输出成果已完整包含【A包 查明材料包】与【B包 咨询准备包】"),
                CheckItem(code="V10", status="pass", reason="要件覆盖统计：covered=3, partial=0, missing=0"),
                CheckItem(code="V11", status="pass", reason="检索与生成上下文均在 Token 预算安全水位内")
            ],
            dashboard=DashboardMetrics(
                exact_quotes_ratio=(2, 4),
                norms_cases_exist_all=True,
                unresolved_refs_count=0,
                supported_statements_ratio=(4, 4),
                elements_coverage={"covered": 3, "partial": 0, "missing": 0},
                elements_match={"satisfied": 3, "partial": 0, "missing": 0, "disputed": 0},
                facts_traceable_ratio=(2, 2),
                entity_checks_pass_ratio=(1, 1),
                comparative_law_flags_count=0,
                grades_distribution={"A": 4, "B": 0, "C": 0, "D": 0},
                timepoint_level="yellow",
                cisg_triggered=False,
                snapshot_id="20261010-gii-v0.7",
                report_version=1,
                content_hash="sha256:c001ready",
                mode="full"
            ),
            status="completed",
            created_at="2026-10-10T12:00:00Z",
            updated_at="2026-10-10T12:30:00Z",
            current_node="s9_export"
        )
        c1.strategic_assessment = build_strategic_assessment(c1)
        db.save_case(c1, title="中德精密机床买卖合同物之瑕疵与救济权查明案")

    # Case 2: 中德工业机器人采购给付迟延与所失利益赔偿案
    if "C002" not in existing_ids:
        c2 = CaseState(
            case_id="C002",
            snapshot_id="20261010-gii-v0.7",
            mode="full",
            facts_zh="2022年11月10日，原告中国智能制造公司与德国斯图加特自动化股份公司签订《工业机器人产线采购合同》，约定德国法为准据法并有效排除CISG。约定交货期为2023年3月1日。德方因零部件供应链受阻迟至2023年7月15日方完成交付安装，导致原告下游新能源汽车产线停工，产生可得利益营业利润损失及迟延利息。原告此前于2023年3月5日发出书面履约催告函（Mahnung）。原告主张德方承担给付迟延损害赔偿责任。",
            claims_zh="请求赔偿给付迟延导致的可得利益损失85万欧元；请求支付自2023年3月2日起算之商事法定迟延利息",
            meta=CaseMeta(
                jurisdiction="de_federal",
                contract_type="国际货物买卖合同",
                parties=["中国智能制造公司", "斯图加特自动化股份公司"],
                contract_date="2022-11-10",
                event_date="2023-03-01",
                choice_of_law="德国法",
                cisg_excluded=True,
                both_merchants=True
            ),
            flags=["TIME_POINT_YELLOW", "COMMERCIAL_TRANSACTION"],
            timepoint={
                "level": "yellow",
                "reasons": ["合同订立于2022-11-10，适用德国债务法现代化改革后新给付迟延法定赔偿条文文本"]
            },
            entry_checks=[
                EntryCheckItem(
                    name="合同是否明确约定适用德国法",
                    status="satisfied",
                    detail="采购合同明确约定德国法为准据法，选法条款合法有效。"
                ),
                EntryCheckItem(
                    name="CISG联合国国际货物销售合同公约适用与排除状态",
                    status="satisfied",
                    detail="双方明确约定排除CISG适用，直接适用德国国内债务法及商事规范。"
                ),
                EntryCheckItem(
                    name="当事人商人身份与德国商法典适用",
                    status="satisfied",
                    detail="双方均为商事实体，涉及商事金钱报酬迟延利息规则（BGB § 288 Abs. 2 / HGB）。"
                )
            ],
            issues=[
                Issue(
                    issue_id="ISSUE-01",
                    kind="law",
                    text_zh="《德国民法典》第286条给付迟延（Schuldnerverzug）的成立要件，及德方内部供应链受阻是否构成免责事由（§ 286 Abs. 4）",
                    claim_ids=["C1"],
                    element_ids=["e1"]
                ),
                Issue(
                    issue_id="ISSUE-02",
                    kind="law",
                    text_zh="《德国民法典》第252条所失利益（entgangener Gewinn）的客观盖然性认定标准与商事法定迟延利息计付基准",
                    claim_ids=["C1", "C2"],
                    element_ids=["e2", "e3"]
                ),
                Issue(
                    issue_id="ISSUE-03",
                    kind="fact",
                    text_zh="德方迟延4个半月交付安装与原告下游新能源汽车产线停工之间是否具备直接因果关系，利润损失审计报告之证明力",
                    claim_ids=["C1"],
                    element_ids=["e2"]
                ),
                Issue(
                    issue_id="ISSUE-04",
                    kind="fact",
                    text_zh="原告于2023年3月5日发出的履约催告函（Mahnung）是否已合法送达德方并发生催告迟延效果",
                    claim_ids=["C1", "C2"],
                    element_ids=["e1"]
                )
            ],
            facts=[
                Fact(fid="F1", text_zh="双方于2022年11月10日签订采购合同，约定2023年3月1日交货并以德国法为准据法", span=(0, 52)),
                Fact(fid="F2", text_zh="德方迟至2023年7月15日方完成交付，构成4个半月履行迟延", span=(68, 108)),
                Fact(fid="F3", text_zh="原告于2023年3月5日发出书面催告函，德方逾期违约导致原告下游订单停产遭受营业利润损失", span=(109, 165))
            ],
            claims=[
                Claim(cid="C1", party="中国智能制造公司", text_zh="请求赔偿给付迟延造成的可得利益损失85万欧元"),
                Claim(cid="C2", party="中国智能制造公司", text_zh="请求支付德国商事法定迟延利息")
            ],
            materials=[
                Material(mid="M1", name="工业机器人产线采购合同", desc_zh="载有准据法条款及明确交货日期", fact_ids=["F1"]),
                Material(mid="M2", name="书面履约催告函与送达凭证", desc_zh="证明原告于3月5日合法发出催告(Mahnung)", fact_ids=["F3"]),
                Material(mid="M3", name="下游整车厂索赔协议及利润损失审计评估书", desc_zh="证明产线停工导致的直接营业利润损失", fact_ids=["F3"])
            ],
            questions=[
                LegalQuestion(
                    qid="Q1",
                    text_zh="德国法下债务人给付迟延的构成要件为何，买受人因迟延给付可得主张何种损害赔偿及迟延利息？",
                    queries_de=["Schuldnerverzug Mahnung BGB § 286", "Schadensersatz wegen Verzögerung BGB § 280", "Entgangener Gewinn BGB § 252"],
                    must_norms=["BGB:§280", "BGB:§286", "BGB:§252", "BGB:§288"],
                    status="confirmed",
                    done=True
                )
            ],
            elements=[
                ElementState(
                    qid="Q1",
                    element_id="e1",
                    name_zh="给付迟延之成立要件（到期、催告、无免责事由）",
                    status="covered",
                    links=[{"eid": "E1", "relation": "supports"}, {"eid": "E2", "relation": "supports"}],
                    fact_links=["F1", "F2", "F3"],
                    match_status="satisfied",
                    match_note="约定履约期限明确且已届满，原告书面催告已有效送达，德方内部供应链事由不构成免责抗辩，满足 § 286 给付迟延。"
                ),
                ElementState(
                    qid="Q1",
                    element_id="e2",
                    name_zh="可得利益损失因果关系与举证（Entgangener Gewinn）",
                    status="covered",
                    links=[{"eid": "E3", "relation": "supports"}],
                    fact_links=["F3"],
                    match_status="satisfied",
                    match_note="依据 § 252，依通常事态发展可合理预期之利润受阻，下游整车厂直接订单及审计报告构成充分客观盖然性依据。"
                ),
                ElementState(
                    qid="Q1",
                    element_id="e3",
                    name_zh="商事买卖迟延利息计付标准（Verzugszinsen）",
                    status="covered",
                    links=[{"eid": "E4", "relation": "supports"}],
                    fact_links=["F1", "F2"],
                    match_status="satisfied",
                    match_note="双方均为商行为人且为报酬请求权，符合 § 288 第2款基准利率加9个百分点法定计息标准。"
                )
            ],
            evidence={
                "E1": Evidence(
                    eid="E1",
                    kind="norm",
                    ref_id="BGB:§280",
                    text_de="Verletzt der Schuldner eine Pflicht aus dem Schuldverhältnis, so kann der Gläubiger Ersatz des hierdurch entstehenden Schadens verlangen.",
                    source_url="https://www.gesetze-im-internet.de/bgb/__280.html",
                    stand="BGBl. I S. 2154",
                    fetched_at="2026-10-10T12:00:00Z",
                    grade="A"
                ),
                "E2": Evidence(
                    eid="E2",
                    kind="norm",
                    ref_id="BGB:§286",
                    text_de="Leistet der Schuldner auf eine Mahnung des Gläubigers nicht, die nach dem Eintritt der Fälligkeit erfolgt, so kommt er durch die Mahnung in Verzug.",
                    source_url="https://www.gesetze-im-internet.de/bgb/__286.html",
                    stand="BGBl. I S. 2154",
                    fetched_at="2026-10-10T12:00:00Z",
                    grade="A"
                ),
                "E3": Evidence(
                    eid="E3",
                    kind="norm",
                    ref_id="BGB:§252",
                    text_de="Der zu ersetzende Schaden umfasst auch den entgangenen Gewinn. Als entgangen gilt der Gewinn, welcher nach dem gewöhnlichen Lauf der Dinge oder nach den besonderen Umständen mit Wahrscheinlichkeit erwartet werden konnte.",
                    source_url="https://www.gesetze-im-internet.de/bgb/__252.html",
                    stand="BGBl. I S. 2154",
                    fetched_at="2026-10-10T12:00:00Z",
                    grade="A"
                ),
                "E4": Evidence(
                    eid="E4",
                    kind="norm",
                    ref_id="BGB:§288",
                    text_de="Eine Entgeltforderung ist während des Verzugs zu verzinsen... Bei Rechtsgeschäften, an denen ein Verbraucher nicht beteiligt ist, beträgt der Zinssatz für Entgeltforderungen neun Prozentpunkte über dem Basiszinssatz.",
                    source_url="https://www.gesetze-im-internet.de/hgb/__288.html",
                    stand="BGBl. I S. 2154",
                    fetched_at="2026-10-10T12:00:00Z",
                    grade="A"
                )
            },
            translations={
                "E1": "债务人违反债之关系所生之义务的，债权人得请求赔偿由此所生之损害。",
                "E2": "债务人在给付到期后于债权人之催告下仍未为给付的，因催告而陷于迟延。",
                "E3": "应赔偿之损害亦包括所失利益。依通常事态发展或特别情形有极大可能性合理期待取得之利益，视为所失利益。",
                "E4": "金钱报酬请求权在迟延期间应计付利息。在无消费者参与之法律行为中，利率为基准利率加九个百分点。"
            },
            similar_cases=[
                SimilarCaseItem(
                    case_id="CASE:BGH:VIII ZR 186/14:2015-08-12",
                    eid="E5",
                    court="BGH",
                    az="VIII ZR 186/14",
                    date="2015-08-12",
                    similarity_points=["均涉及大型机器设备迟延交付", "均涉及可得利益依据 § 252 之举证盖然性要求"],
                    difference_points=["本案具备下游整车厂明确供货定点协议，因果关系证据链条更为直接"],
                    court_view_quote_de="Für die Darlegung des entgangenen Gewinns genügt die Darlegung von Anknüpfungstatsachen, aus denen sich die Wahrscheinlichkeit des Gewinns ergibt.",
                    court_view_zh="德国联邦最高法院裁判要旨：就所失利益之主张，债权人仅需阐明显示利润取得具有客观盖然性之基础事实即可，无须达到绝对排除一切疑问之苛刻程度。",
                    divergence_flag="consistent"
                )
            ],
            counsel_questions=[
                "请德国律师评估：德方主张全球芯片供应链断裂构成不可归责免责事由（§ 286 Abs. 4）在德国高等法院判例中的成立概率？",
                "针对所失利益诉求，原告提供的第三方整车厂审计报告在斯图加特地方法院是否具备充分证明力？"
            ],
            findings=[
                Finding(
                    qid="Q1",
                    statements=[
                        Statement(
                            sid="S1",
                            text_zh="依据《德国民法典》第286条第1款，债务人在届期后经债权人催告仍未给付的，自催告到达时陷于给付迟延。",
                            type="quote",
                            evidence_ids=["E2"],
                            part="A",
                            quote_de="Leistet der Schuldner auf eine Mahnung des Gläubigers nicht...",
                            grade="A",
                            status="ok"
                        ),
                        Statement(
                            sid="S2",
                            text_zh="依据《德国民法典》第280条第1款、第2款及第286条，债权人有权就给付迟延所造成之全部经济损失请求损害赔偿。",
                            type="quote",
                            evidence_ids=["E1", "E2"],
                            part="A",
                            quote_de="Verletzt der Schuldner eine Pflicht aus dem Schuldverhältnis...",
                            grade="A",
                            status="ok"
                        ),
                        Statement(
                            sid="S3",
                            text_zh="依据事实证据（F3、M3），原告因产线停工导致的营业利润损失符合《德国民法典》第252条所失利益定义，在原告完成因果关系举证前提下趋向于支持赔偿主张。",
                            type="inference",
                            evidence_ids=["E3"],
                            part="B",
                            fact_ids=["F3"],
                            material_ids=["M3"],
                            element_id="e2",
                            status="ok"
                        ),
                        Statement(
                            sid="S4",
                            text_zh="依据事实证据（F1、F2），双方均为商事主体且涉及报酬迟延，趋向于支持依据《德国民法典》第288条第2款主张基准利率加9%之商事迟延利息。",
                            type="inference",
                            evidence_ids=["E4"],
                            part="B",
                            fact_ids=["F1", "F2"],
                            element_id="e3",
                            status="ok"
                        )
                    ],
                    gaps=[]
                )
            ],
            checks=[
                CheckItem(code="V1", status="pass", reason="所有引用法条均在官方合并版快照中经检验存在"),
                CheckItem(code="V2", status="pass", reason="所有原文引用陈述均有效锚定已检验的德文证据材料"),
                CheckItem(code="V3", status="pass", reason="已完整绑定不可变法条快照指纹: 20261010-gii-v0.7"),
                CheckItem(code="V4", status="pass", reason="时点核验判定为【yellow】态：适用现行债务法"),
                CheckItem(code="V5", status="pass", reason="CISG适用状态已明确有效排除"),
                CheckItem(code="V6", status="pass", reason="已翻译全部核心规范文本"),
                CheckItem(code="V7", status="pass", reason="咨询准备包所有事实分析陈述均精准回溯至 F# 事实编号"),
                CheckItem(code="V8", status="pass", reason="严格采用条件式表述，未出现胜诉绝对保证"),
                CheckItem(code="V9", status="pass", reason="输出成果已完整包含 A 包与 B 包"),
                CheckItem(code="V10", status="pass", reason="要件覆盖统计：covered=3, partial=0, missing=0"),
                CheckItem(code="V11", status="pass", reason="上下文 Token 安全受控")
            ],
            dashboard=DashboardMetrics(
                exact_quotes_ratio=(2, 4),
                norms_cases_exist_all=True,
                unresolved_refs_count=0,
                supported_statements_ratio=(4, 4),
                elements_coverage={"covered": 3, "partial": 0, "missing": 0},
                elements_match={"satisfied": 3, "partial": 0, "missing": 0, "disputed": 0},
                facts_traceable_ratio=(2, 2),
                entity_checks_pass_ratio=(1, 1),
                comparative_law_flags_count=0,
                grades_distribution={"A": 4, "B": 0, "C": 0, "D": 0},
                timepoint_level="yellow",
                cisg_triggered=False,
                snapshot_id="20261010-gii-v0.7",
                report_version=1,
                content_hash="sha256:c002ready",
                mode="full"
            ),
            status="completed",
            created_at="2026-10-10T14:00:00Z",
            updated_at="2026-10-10T14:40:00Z",
            current_node="s9_export"
        )
        c2.strategic_assessment = build_strategic_assessment(c2)
        db.save_case(c2, title="中德工业机器人采购给付迟延与所失利益赔偿案")

    # Case 3: 跨国投资并购德国有限责任公司(GmbH)股权转让合同公证形式要件查明案
    if "C003" not in existing_ids:
        c3 = CaseState(
            case_id="C003",
            snapshot_id="20261010-gii-v0.7",
            mode="full",
            facts_zh="2023年8月15日，原告中国投资控股公司与德国慕尼黑自然人股东签订《GmbH股权购买与转让协议》，约定以1200万欧元对价收购其持有的德国拜仁新能源有限公司60%股权。协议约定适用德国法管辖。签约时双方仅在中国北京由境内律师见证签署了英文私文书协议，未在德国公证人（Notar）处办理公证公证证书。德方后以股权转让未履行德国法定公证要件为由主张协议自始无效，并拒绝办理商业登记处股东名录变更。原告主张合同有效成立并要求继续履行交割。",
            claims_zh="确认股权转让合同合法有效；请求判令德方配合办理德国商业登记处股东名录变更及交割手续",
            meta=CaseMeta(
                jurisdiction="de_federal",
                contract_type="跨境股权投资与并购合同",
                parties=["中国投资控股公司", "德国自然人出让股东"],
                contract_date="2023-08-15",
                event_date="2023-08-15",
                choice_of_law="德国法",
                cisg_excluded=True,
                both_merchants=True
            ),
            flags=["FORM_REQUIREMENT_RED", "CISG_NOT_APPLICABLE"],
            timepoint={
                "level": "yellow",
                "reasons": ["适用《德国有限责任公司法》(GmbHG)第15条强制性公证要件及《德国民法典》第125条形式瑕疵无效规定"]
            },
            entry_checks=[
                EntryCheckItem(
                    name="合同是否明确约定适用德国法",
                    status="satisfied",
                    detail="SPA协议明确约定适用德国法管辖，属涉外德国目标公司股权交易。"
                ),
                EntryCheckItem(
                    name="CISG联合国国际货物销售合同公约适用与排除状态",
                    status="satisfied",
                    detail="标的物为有限责任公司股权（Geschäftsanteil），不属于CISG货物范畴，依法不适用CISG。"
                ),
                EntryCheckItem(
                    name="当事人商人身份与德国商法典适用",
                    status="satisfied",
                    detail="涉及德国公司法及公证法强行法规范，不涉及普通货物商事检验通知义务。"
                )
            ],
            issues=[
                Issue(
                    issue_id="ISSUE-01",
                    kind="law",
                    text_zh="《德国有限责任公司法》第15条第3款与第4款关于股权转让债权合同与处分行为法定公证证明形式（notarielle Form）的强制性效力",
                    claim_ids=["C1", "C2"],
                    element_ids=["e1"]
                ),
                Issue(
                    issue_id="ISSUE-02",
                    kind="law",
                    text_zh="《德国民法典》第125条形式瑕疵自始无效规定，及境外律师见证是否得视为等同于德国公证人公证（Gleichwertigkeit）",
                    claim_ids=["C1"],
                    element_ids=["e2"]
                ),
                Issue(
                    issue_id="ISSUE-03",
                    kind="fact",
                    text_zh="境外私下签署且未经公证之SPA协议，德方是否已向商业登记处递交股东变更申请，是否存在补正治愈事实",
                    claim_ids=["C1", "C2"],
                    element_ids=["e2"]
                )
            ],
            facts=[
                Fact(fid="F1", text_zh="双方于2023年8月15日签署《GmbH股权购买与转让协议》，约定适用德国法", span=(0, 48)),
                Fact(fid="F2", text_zh="协议仅在北京由律师见证签署，未在德国公证人处进行公证或同等法定公证", span=(72, 120)),
                Fact(fid="F3", text_zh="德方主张形式瑕疵合同无效，拒绝向商业登记处提交股东变更交割", span=(121, 168))
            ],
            claims=[
                Claim(cid="C1", party="中国投资控股公司", text_zh="请求确认股权购买协议具备法律约束力"),
                Claim(cid="C2", party="中国投资控股公司", text_zh="请求判令德方履行德国商业登记处变更与交割手续")
            ],
            materials=[
                Material(mid="M1", name="GmbH股权购买协议(SPA)签署文本", desc_zh="载明德国法管辖与交易对价，但仅有私文书签名", fact_ids=["F1", "F2"]),
                Material(mid="M2", name="德国商业登记处现有登记册摘录", desc_zh="证明目标公司为标准德国有限责任公司(GmbH)", fact_ids=["F3"])
            ],
            questions=[
                LegalQuestion(
                    qid="Q1",
                    text_zh="德国法下GmbH股权之负担行为与处分行为是否均以公证为法定有效形式？未经公证之私文书协议效力如何？",
                    queries_de=["GmbH Geschäftsanteil Abtretung notarielle Form GmbHG § 15", "Formmangel Nichtigkeit BGB § 125"],
                    must_norms=["GmbHG:§15", "BGB:§125"],
                    status="confirmed",
                    done=True
                )
            ],
            elements=[
                ElementState(
                    qid="Q1",
                    element_id="e1",
                    name_zh="GmbH股权转让之法定公证形式强制要件（Notarielle Form）",
                    status="covered",
                    links=[{"eid": "E1", "relation": "supports"}],
                    fact_links=["F1", "F2"],
                    match_status="satisfied",
                    match_note="依据 GmbHG § 15 第3款及第4款，承担转让义务之协议及实际转让处分均须经公证人公证证明。"
                ),
                ElementState(
                    qid="Q1",
                    element_id="e2",
                    name_zh="形式要件欠缺之法律后果（自始无效与治愈可能）",
                    status="covered",
                    links=[{"eid": "E2", "relation": "supports"}],
                    fact_links=["F2", "F3"],
                    match_status="satisfied",
                    match_note="依据 BGB § 125，欠缺法定形式之法律行为自始无效；因未完成正式变更登记，无法发生治愈补正效力。"
                )
            ],
            evidence={
                "E1": Evidence(
                    eid="E1",
                    kind="norm",
                    ref_id="GmbHG:§15",
                    text_de="Die Abtretung von Geschäftsanteilen bedarf der notariellen Form. Eine Vereinbarung, durch welche die Verpflichtung eines Gesellschafters zur Abtretung eines Geschäftsanteils begründet wird, bedarf gleichfalls der notariellen Form.",
                    source_url="https://www.gesetze-im-internet.de/gmbhg/__15.html",
                    stand="BGBl. I S. 2154",
                    fetched_at="2026-10-10T12:00:00Z",
                    grade="A"
                ),
                "E2": Evidence(
                    eid="E2",
                    kind="norm",
                    ref_id="BGB:§125",
                    text_de="Ein Rechtsgeschäft, welches der durch Gesetz vorgeschriebenen Form ermangelt, ist nichtig. Der Mangel der durch Rechtsgeschäft bestimmten Form hat im Zweifel gleichfalls Nichtigkeit zur Folge.",
                    source_url="https://www.gesetze-im-internet.de/bgb/__125.html",
                    stand="BGBl. I S. 2154",
                    fetched_at="2026-10-10T12:00:00Z",
                    grade="A"
                )
            },
            translations={
                "E1": "股份之转让须经公证人公证形式。使股东承担转让股份义务之协议，同样须经公证人公证形式。",
                "E2": "欠缺法律规定形式之法律行为，无效。欠缺法律行为所约定形式之法律行为，有疑义时同样无效。"
            },
            similar_cases=[
                SimilarCaseItem(
                    case_id="CASE:BGH:II ZR 270/07:2009-03-02",
                    eid="E3",
                    court="BGH",
                    az="II ZR 270/07",
                    date="2009-03-02",
                    similarity_points=["均涉及境外签署之德企股权转让协议", "均涉及 GmbHG § 15 强制性公证形式要件适用"],
                    difference_points=["判例涉及瑞士公证人之公证效力实质等同性审查，本案仅有普通律师见证，形式瑕疵更明确"],
                    court_view_quote_de="Die Formerfordernisse des § 15 Abs. 3 und 4 GmbHG sind zwingendes Recht und dienen dem Schutz der Beteiligten vor Übereilung sowie der Rechtssicherheit.",
                    court_view_zh="德国联邦最高法院裁判要旨：《德国有限责任公司法》第15条第3款及第4款之公证形式要求属强制性规范，其立法目的在于保护当事人免于草率行事并维护商业登记之公信力与法律确定性。",
                    divergence_flag="consistent"
                )
            ],
            counsel_questions=[
                "请向德国公司法专家咨询：中国执业律师出具的签署见证书在德国司法实践中能否被认定为实质等同于德国公证人公证（Gleichwertigkeit）？",
                "若买卖协议被认定自始无效，买方已付之定金与前期尽调支出依据不当得利（§ 812 BGB）或缔约过失责任（c.i.c. § 311 Abs. 2 BGB）追偿之可行性？"
            ],
            findings=[
                Finding(
                    qid="Q1",
                    statements=[
                        Statement(
                            sid="S1",
                            text_zh="依据《德国有限责任公司法》第15条第3款及第4款，不论是股权转让之负担协议（债权合同）还是处分行为（物权转让），均强制要求办理公证证明（notarielle Beurkundung）。",
                            type="quote",
                            evidence_ids=["E1"],
                            part="A",
                            quote_de="Die Abtretung von Geschäftsanteilen bedarf der notariellen Form...",
                            grade="A",
                            status="ok"
                        ),
                        Statement(
                            sid="S2",
                            text_zh="依据《德国民法典》第125条第1句，违反法律强制性形式要件之法律行为自始不发生法律效力（nichtig）。",
                            type="quote",
                            evidence_ids=["E2"],
                            part="A",
                            quote_de="Ein Rechtsgeschäft, welches der durch Gesetz vorgeschriebenen Form ermangelt, ist nichtig.",
                            grade="A",
                            status="ok"
                        ),
                        Statement(
                            sid="S3",
                            text_zh="依据事实证据（F2、M1），双方签署之SPA协议仅有普通律师见证而未完成德国法定公证，且未办理商业登记处生效登记，趋向于难以支持主张合同具备强制交割履行力。",
                            type="inference",
                            evidence_ids=["E1", "E2"],
                            part="B",
                            fact_ids=["F2"],
                            material_ids=["M1"],
                            element_id="e2",
                            status="ok"
                        )
                    ],
                    gaps=[]
                )
            ],
            checks=[
                CheckItem(code="V1", status="pass", reason="所有引用法条均在官方合并版快照中经检验存在"),
                CheckItem(code="V2", status="pass", reason="所有原文引用陈述均有效锚定已检验的德文证据材料"),
                CheckItem(code="V3", status="pass", reason="已完整绑定不可变法条快照指纹: 20261010-gii-v0.7"),
                CheckItem(code="V4", status="pass", reason="时点核验判定为【yellow】态：适用现行GmbHG合并版"),
                CheckItem(code="V5", status="pass", reason="CISG不适用股权交易，核验通过"),
                CheckItem(code="V6", status="pass", reason="已翻译全部核心规范文本"),
                CheckItem(code="V7", status="pass", reason="咨询准备包所有事实分析陈述均精准回溯至 F# 事实编号"),
                CheckItem(code="V8", status="pass", reason="严格采用条件式表述，未出现绝对诉讼结果断言"),
                CheckItem(code="V9", status="pass", reason="输出成果已完整包含 A 包与 B 包"),
                CheckItem(code="V10", status="pass", reason="要件覆盖统计：covered=2, partial=0, missing=0"),
                CheckItem(code="V11", status="pass", reason="上下文 Token 安全受控")
            ],
            dashboard=DashboardMetrics(
                exact_quotes_ratio=(2, 3),
                norms_cases_exist_all=True,
                unresolved_refs_count=0,
                supported_statements_ratio=(3, 3),
                elements_coverage={"covered": 2, "partial": 0, "missing": 0},
                elements_match={"satisfied": 2, "partial": 0, "missing": 0, "disputed": 0},
                facts_traceable_ratio=(1, 1),
                entity_checks_pass_ratio=(1, 1),
                comparative_law_flags_count=0,
                grades_distribution={"A": 2, "B": 0, "C": 0, "D": 0},
                timepoint_level="yellow",
                cisg_triggered=False,
                snapshot_id="20261010-gii-v0.7",
                report_version=1,
                content_hash="sha256:c003ready",
                mode="full"
            ),
            status="completed",
            created_at="2026-10-10T16:00:00Z",
            updated_at="2026-10-10T16:45:00Z",
            current_node="s9_export"
        )
        c3.strategic_assessment = build_strategic_assessment(c3)
        db.save_case(c3, title="跨国投资并购德国有限责任公司(GmbH)股权转让合同公证形式要件查明案")

    # Case 4: 中美跨国半导体晶圆检测设备买卖合同违约与 UCC 默示适销性担保争议查明案 (美国法域)
    if "C004" not in existing_ids:
        c4 = CaseState(
            case_id="C004",
            snapshot_id="20261010-gii-v0.7",
            mode="full",
            facts_zh="2023年5月10日，原告中国上海微电子科技公司与被告美国加州半导体仪器系统公司签署《高精度晶圆缺陷光学检测机台采购协议》，约定总价款280万美元，准据法明确约定为美国法律（纽约州法及统一商法典UCC），明文排除CISG。原告依约开立信用证并全额受领机台。2023年7月5日机台在净化间通电试运行，原告质检团队连续7天测试发现其亚微米级重复检测偏差达0.28微米，严重超出合同技术附件要求的0.05微米基准，导致晶圆良率判定紊乱。原告于2023年7月28日（试运行第23天）向美方出具正式书面违约通知，要求派员调试或换货。美方大律师抗辩称：买方已接收货物且投入试运行，依据 UCC § 2-607(3)(a)，买方未在合理时间内发出瑕疵通知，依法已丧失全部救济权利；且技术附件未构成明示担保。原告遂起诉请求退还货款并赔偿停机间接损失。",
            claims_zh="请求依 UCC § 2-601/§ 2-714 拒收并退还全额货款 280 万美元；请求依 UCC § 2-715 赔偿试运行净化间物料报废及停机可得利益损失 45 万美元",
            meta=CaseMeta(
                jurisdiction="us_commercial",
                contract_type="跨国半导体高精设备买卖合同",
                parties=["上海微电子科技公司", "加州半导体仪器系统公司"],
                contract_date="2023-05-10",
                event_date="2023-07-05",
                choice_of_law="美国纽约州法及统一商法典 (UCC)",
                cisg_excluded=True,
                both_merchants=True
            ),
            flags=["US_UCC_CHECK", "TIME_POINT_YELLOW"],
            timepoint={
                "level": "yellow",
                "reasons": ["合同选法纽约州法与UCC统一商法典，适用现行UCC Article 2买卖法官方文本"]
            },
            entry_checks=[
                EntryCheckItem(
                    name="合同是否明确约定适用美国法及排除CISG",
                    status="satisfied",
                    detail="合同选法条款约定适用美国纽约州法及UCC，且明确排除CISG，当事人意思自治合法有效。"
                ),
                EntryCheckItem(
                    name="双方当事人商事实体资格审查 (Merchants Under UCC)",
                    status="satisfied",
                    detail="双方均为专业从事半导体设备研发与制造的商事实体，属于 UCC § 2-104 所定义的典型商人（Merchants）。"
                ),
                EntryCheckItem(
                    name="时效与除斥期间初核 (UCC § 2-725 诉讼时效)",
                    status="satisfied",
                    detail="违约行为发生于2023年7月，未超过 UCC § 2-725 规定的4年买卖合同违约诉讼时效。"
                )
            ],
            issues=[
                Issue(
                    issue_id="IS-1",
                    kind="law",
                    text_zh="涉案机台检测重复精度偏离合同技术附件基准，是否违反《美国统一商法典》(UCC) § 2-314 默示适销性担保及 § 2-313 明示担保？",
                    claim_ids=["C1"],
                    element_ids=["e2"]
                ),
                Issue(
                    issue_id="IS-2",
                    kind="fact",
                    text_zh="买方在净化间通电试运行第23天发出违约通知，是否满足 UCC § 2-607(3)(a) '在合理时间内通知 (within a reasonable time)' 之法定要件而阻断失权抗辩？",
                    claim_ids=["C1"],
                    element_ids=["e3"]
                ),
                Issue(
                    issue_id="IS-3",
                    kind="law",
                    text_zh="买方主张的净化间物料报废及产线停工损失，是否符合 UCC § 2-715 间接损失之'可预见性'与因果关系要求？",
                    claim_ids=["C2"],
                    element_ids=["e4"]
                )
            ],
            facts=[
                Fact(fid="F1", text_zh="双方于2023年5月10日签署买卖协议并选法美国法，明确排除CISG适用", span=(0, 52)),
                Fact(fid="F2", text_zh="2023年7月5日通电试运行，经连续7天测试重复偏差达0.28微米，严重超标", span=(70, 120), disputed=True),
                Fact(fid="F3", text_zh="原告于试运行第23天发出正式书面违约整改函，美方以逾期检验为由拒绝保修", span=(130, 185))
            ],
            claims=[
                Claim(cid="C1", party="上海微电子科技公司", text_zh="拒收并退还全额货款 280 万美元"),
                Claim(cid="C2", party="上海微电子科技公司", text_zh="赔偿净化间物料报废及停工间接损失 45 万美元")
            ],
            elements=[
                ElementState(
                    qid="Q1",
                    element_id="e1",
                    name_zh="买卖合同合法有效且出卖人具备商人资质",
                    status="covered",
                    links=[{"eid": "E1", "relation": "supports"}],
                    norm_eid="E1",
                    fact_links=["F1"],
                    material_links=["M1"],
                    match_status="satisfied",
                    match_note="双方签署书面采购协议并已实际履行，符合 UCC § 2-106 及 § 2-201 形式要件。"
                ),
                ElementState(
                    qid="Q1",
                    element_id="e2",
                    name_zh="标的物存在不符合商销性品质之瑕疵",
                    status="covered",
                    links=[{"eid": "E1", "relation": "supports"}],
                    norm_eid="E1",
                    fact_links=["F2"],
                    material_links=["M1", "M2"],
                    match_status="satisfied",
                    match_note="重复检测精度达0.28微米严重超出技术协议0.05微米基准，违反 UCC § 2-314 适销性默示担保及 § 2-313 明示技术担保。"
                ),
                ElementState(
                    qid="Q1",
                    element_id="e3",
                    name_zh="买受人在受领后合理期限内履行违约通知义务",
                    status="covered",
                    links=[{"eid": "E2", "relation": "supports"}],
                    norm_eid="E2",
                    fact_links=["F3"],
                    material_links=["M3"],
                    match_status="partial",
                    match_note="美方主张23天超出合理期间失权；依第二巡回法院判例，高度复杂工业机台需连线联调，23天属于合理检验容许期间，建议补强调试日志凭证。"
                ),
                ElementState(
                    qid="Q1",
                    element_id="e4",
                    name_zh="附带损失与间接损失具备可预见性及因果关系",
                    status="covered",
                    links=[{"eid": "E3", "relation": "supports"}],
                    norm_eid="E3",
                    fact_links=["F2", "F3"],
                    material_links=["M2", "M3"],
                    match_status="satisfied",
                    match_note="净化间试机损耗属通常业务必然发生之附带损失 (UCC § 2-715(1))；停产间接损失出卖人订约时已知悉，具备可预见性。"
                )
            ],
            materials=[
                Material(
                    mid="M1",
                    name="中美双语晶圆检测机台采购协议及技术规范书 Spec-Rev3",
                    desc_zh="买卖双方签署之正本合同，包含明确选法条款、全额信用证付款凭证及技术公差保证附录。",
                    excerpt_zh="Governing Law: This Agreement shall be governed by the laws of the State of New York and the Uniform Commercial Code. CISG is expressly excluded.",
                    fact_ids=["F1"]
                ),
                Material(
                    mid="M2",
                    name="国家半导体计量检测中心出具之重复精度偏差第三方测试报告",
                    desc_zh="对涉案机台连续7日72小时运转测试数据分析，结论证实机台重复偏差0.28微米超标。",
                    excerpt_zh="测试结论：光学成像重复公差平均偏离达0.28μm，不符合合同标称之0.05μm要求。",
                    fact_ids=["F2"]
                ),
                Material(
                    mid="M3",
                    name="2023-07-28 违约整改与索赔律师函及 FedEx 国际特快送达签收底单",
                    desc_zh="原告委托涉外律师向加州半导体公司发出之正式质量异议函件，包含送达签收存根。",
                    excerpt_zh="Notice of Breach: Buyer hereby notifies Seller of material breach of implied warranty of merchantability under UCC § 2-314.",
                    fact_ids=["F3"]
                )
            ],
            evidence={
                "E1": Evidence(
                    eid="E1",
                    kind="norm",
                    ref_id="UCC:§2-314",
                    text_de="UCC § 2-314: Unless excluded or modified, a warranty that the goods shall be merchantable is implied in a contract for their sale if the seller is a merchant with respect to goods of that kind. Goods to be merchantable must be at least such as are fit for the ordinary purposes for which such goods are used.",
                    source_url="https://www.law.cornell.edu/ucc/2/2-314",
                    stand="UCC Official Text 2022",
                    fetched_at="2026-10-11T12:00:00Z",
                    grade="A"
                ),
                "E2": Evidence(
                    eid="E2",
                    kind="norm",
                    ref_id="UCC:§2-607",
                    text_de="UCC § 2-607(3)(a): Where a tender has been accepted, the buyer must within a reasonable time after he discovers or should have discovered any breach notify the seller of breach or be barred from any remedy.",
                    source_url="https://www.law.cornell.edu/ucc/2/2-607",
                    stand="UCC Official Text 2022",
                    fetched_at="2026-10-11T12:00:00Z",
                    grade="A"
                ),
                "E3": Evidence(
                    eid="E3",
                    kind="norm",
                    ref_id="UCC:§2-715",
                    text_de="UCC § 2-715: Incidental damages resulting from the seller's breach include expenses reasonably incurred in inspection, care and custody of goods rightfully rejected. Consequential damages include any loss resulting from general or particular requirements of which the seller at the time of contracting had reason to know.",
                    source_url="https://www.law.cornell.edu/ucc/2/2-715",
                    stand="UCC Official Text 2022",
                    fetched_at="2026-10-11T12:00:00Z",
                    grade="A"
                ),
                "E4": Evidence(
                    eid="E4",
                    kind="norm",
                    ref_id="USC:28:§1782",
                    text_de="28 U.S.C. § 1782: The district court of the district in which a person resides or is found may order him to give his testimony or to produce a document or other thing for use in a proceeding in a foreign or international tribunal.",
                    source_url="https://www.law.cornell.edu/uscode/text/28/1782",
                    stand="United States Code 2024",
                    fetched_at="2026-10-11T12:00:00Z",
                    grade="A"
                )
            },
            translations={
                "E1": "《美国统一商法典》第2-314条：若出卖人为该类货物的商人，合同默示出卖人担保标的物具备适销品质，至少须符合同类货物的通常用途标准及规格公差。",
                "E2": "《美国统一商法典》第2-607条第3款(a)项：受领标的物后，买方必须在发现或理应发现违约后的合理时间内通知出卖人，否则丧失任何救济权利（失权抗辩）。",
                "E3": "《美国统一商法典》第2-715条：出卖人违约时，买方有权请求赔偿合理支出的检验、保管附带损失，以及订约时出卖人知悉的产线停工可得利益间接损失。",
                "E4": "《美国法典》第28编第1782条：外国民商事诉讼利害关系人可直接向美国联邦法院申请调取位于美国境内的当事人证言或内部技术书证。"
            },
            similar_cases=[
                SimilarCaseItem(
                    case_id="CASE:SCOTUS:Intel v. AMD:2004",
                    eid="E4",
                    court="SCOTUS",
                    az="542 U.S. 241",
                    date="2004-06-21",
                    similarity_points=["均涉及境外诉讼当事人寻求调取美国公司境内研发证据", "均适用 28 U.S.C. § 1782 跨境取证协助准则"],
                    difference_points=["先例涉及反垄断调查，本案为高精度设备买卖合同违约民商事审判，境外法庭接受度更高"],
                    court_view_quote_de="Under § 1782, discovery may be ordered for use in foreign proceedings; district courts must consider whether the foreign tribunal is receptive to US federal assistance and whether the request is unduly burdensome.",
                    court_view_zh="美国联邦最高法院确立四大自由裁量原则：只要外国法院对证据具有接受度且申请并非变相规避外国证明规则，美国法院倾向支持涉外当事人跨境调取关键研发证据。",
                    divergence_flag="consistent"
                ),
                SimilarCaseItem(
                    case_id="CASE:2ND-CIR:Filanto v. Chilewich:1992",
                    eid="E2",
                    court="2nd Cir.",
                    az="789 F. Supp. 1229",
                    date="1992-04-14",
                    similarity_points=["均涉及跨国涉外大宗买卖合同项下检验通知期限与抗辩效力认定"],
                    difference_points=["先例涉及异议失权与仲裁条款合意，本案重点在精密工业设备调试期对合理检验通知时间的宽延计算"],
                    court_view_quote_de="What constitutes a reasonable time under UCC § 2-607 depends on the nature, purpose and circumstances of the transaction.",
                    court_view_zh="第二巡回法院明确判定：UCC § 2-607 所称‘合理时间’不应机械以数日为限，必须结合标的物复杂程度、商业惯例与现场调试实际环境综合权衡认定。",
                    divergence_flag="consistent"
                )
            ],
            counsel_questions=[
                "请向美国特许诉讼律师咨询：依照第二巡回法院及纽约州商业法庭判例，针对需要净化间复杂连线调试的高精晶圆机台，试运行第23天发出违约通知是否落在 UCC § 2-607(3)(a) '合理时间' 之司法认可区间？",
                "若美方主张其发货单背面印有排除间接损失（Disclaimer of Consequential Damages）条款，依据 UCC § 2-207 格式条款之战规则，在双方均为商人且原告要约已明示限制的情况下能否认定该条款不并入合同？",
                "本案能否依据 28 U.S.C. § 1782 立即向美国加利福尼亚北区联邦地区法院提起单方发现动议（Ex Parte Application for Discovery），强制调取美方机台设计缺陷与出厂校准不达标的内部邮件？"
            ],
            findings=[
                Finding(
                    qid="Q1",
                    statements=[
                        Statement(
                            sid="S1",
                            text_zh="依据《美国统一商法典》(UCC) § 2-314，出卖人作为专业半导体设备商人，标的物重复偏差超标0.28微米构成物之瑕疵，违反默示适销性担保。",
                            type="quote",
                            evidence_ids=["E1"],
                            part="A",
                            quote_de="Unless excluded or modified, a warranty that the goods shall be merchantable is implied in a contract for their sale...",
                            grade="A",
                            status="ok"
                        ),
                        Statement(
                            sid="S2",
                            text_zh="依据 UCC § 2-607(3)(a) 及第二巡回法院判例，买受人须在合理期限内通知出卖人，高精复杂设备需现场带料试机，23天发出通知具备合理抗辩理由。",
                            type="inference",
                            evidence_ids=["E2"],
                            part="B",
                            fact_ids=["F2", "F3"],
                            material_ids=["M2", "M3"],
                            element_id="e3",
                            status="ok"
                        ),
                        Statement(
                            sid="S3",
                            text_zh="依据 28 U.S.C. § 1782 及美国联邦最高法院 Intel v. AMD 先例，原告作为中国诉讼当事人，有权向美国联邦法院申请调取美方内部设计缺陷书证。",
                            type="quote",
                            evidence_ids=["E4"],
                            part="A",
                            quote_de="The district court may order a person to give testimony or produce documents for use in a foreign proceeding...",
                            grade="A",
                            status="ok"
                        )
                    ],
                    gaps=[]
                )
            ],
            checks=[
                CheckItem(code="V1", status="pass", reason="所有引用规范均在官方UCC及USC法条库中经检验存在"),
                CheckItem(code="V2", status="pass", reason="所有原文引用陈述均有效锚定已检验的英文及中文法源证据"),
                CheckItem(code="V3", status="pass", reason="已完整绑定不可变法条快照指纹: 20261010-gii-v0.7"),
                CheckItem(code="V4", status="pass", reason="时点核验判定为【yellow】态：适用现行UCC Article 2官方文本"),
                CheckItem(code="V5", status="pass", reason="CISG在合同中明文排除，准据法进入美国商事法通道"),
                CheckItem(code="V6", status="pass", reason="已翻译全部核心美国商法规范文本"),
                CheckItem(code="V7", status="pass", reason="事实分析陈述均精准回溯至 F# 事实编号"),
                CheckItem(code="V8", status="pass", reason="严格采用条件式审理表述，未出现绝对胜诉结果断言"),
                CheckItem(code="V9", status="pass", reason="输出成果已完整包含 A 包与 B 包"),
                CheckItem(code="V10", status="pass", reason="要件覆盖统计：covered=4, partial=0, missing=0"),
                CheckItem(code="V11", status="pass", reason="上下文 Token 安全受控")
            ],
            dashboard=DashboardMetrics(
                exact_quotes_ratio=(2, 3),
                norms_cases_exist_all=True,
                unresolved_refs_count=0,
                supported_statements_ratio=(3, 3),
                elements_coverage={"covered": 4, "partial": 0, "missing": 0},
                elements_match={"satisfied": 3, "partial": 1, "missing": 0, "disputed": 0},
                facts_traceable_ratio=(1, 1),
                entity_checks_pass_ratio=(1, 1),
                comparative_law_flags_count=0,
                grades_distribution={"A": 4, "B": 0, "C": 0, "D": 0},
                timepoint_level="yellow",
                cisg_triggered=False,
                snapshot_id="20261010-gii-v0.7",
                report_version=1,
                content_hash="sha256:c004ready_us",
                mode="full"
            ),
            status="completed",
            created_at="2026-10-11T10:00:00Z",
            updated_at="2026-10-11T10:45:00Z",
            current_node="s9_export"
        )
        c4.strategic_assessment = build_strategic_assessment(c4)
        db.save_case(c4, title="中美跨国半导体晶圆检测设备买卖合同违约与 UCC 默示适销性担保争议查明案")

    # 对数据库中任何历史案例，若缺少 strategic_assessment 则自动回填
    for summary in db.list_cases():
        c_state = db.get_case(summary.case_id)
        if c_state and c_state.strategic_assessment is None:
            c_state.strategic_assessment = build_strategic_assessment(c_state)
            db.save_case(c_state)



@asynccontextmanager
async def lifespan(app: FastAPI):
    # 初始化数据表并播种
    db = StateDBManager.get_instance()
    db.list_experts()  # 触发专家名录自动播种
    seed_demo_cases_if_empty(db)
    yield


app = FastAPI(
    title="涉外法查明Agent (Overseas Law Assist Agent)",
    description="涉外法查明助手：多法域与多语言扩展架构、双包成果交付、证据链溯源与客观中立咨询防线",
    version="0.7.0",
    lifespan=lifespan
)

# 配置全局跨域访问 (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载 API 子路由 (同时挂载 /api 与根路由以适配各种代理环境)
app.include_router(cases.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(verify.router, prefix="/api")
app.include_router(consults.router, prefix="/api")

app.include_router(cases.router)
app.include_router(search.router)
app.include_router(verify.router)
app.include_router(consults.router)


@app.get("/api/health")
@app.get("/health")
def healthcheck():
    return {"status": "ok", "service": "lawagent.api", "version": "0.7.0"}
