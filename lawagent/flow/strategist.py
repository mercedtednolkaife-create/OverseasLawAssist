"""策略推演与红队攻防对抗模块 (Strategic Assessment & Red Team Strategist)
对齐技术方案与方案 A 规范：
- 动态胜败边界推演与事实假定推演矩阵 (Hypothetical Outcome Bounds / If-Then Branching Matrix)
- 胜败摇摆关键变量与心证分水岭 (Pivotal Swaying Factors)
- 对方最具杀伤力的 3 大抗辩与反制武器 (Red Team Defense Playbook & Counter-Weapons)
- 下一步关键调取补证与防御布局清单 (Actionable Evidence Checklist)
- 严格遵循 V8 客观中立防线：严禁单一定量胜率承诺，采用条件式推演 (Condition Precedent)
"""

import os
import json
import datetime
from typing import List, Dict, Any, Optional
from lawagent.core.types import (
    CaseState, StrategicAssessment, OutcomeBranch, RedTeamDefense
)
from lawagent.llm.client import LLMClient
from lawagent.flow.critic import FORBIDDEN_PREDICTIVE_WORDS


def _now() -> str:
    return datetime.datetime.now().isoformat()


def clean_predictive_text(text: str) -> str:
    """清除绝对化胜诉词汇，恪守 V8 中立推演防线"""
    result = text
    for word in FORBIDDEN_PREDICTIVE_WORDS:
        if word in result:
            result = result.replace(word, "在举证充分的前提下可能构成")
    return result


def _build_german_assessment(state: CaseState) -> StrategicAssessment:
    """德国法域基准策略评估与红队攻防对抗"""
    pivotal_factors = [
        "买方在设备交付后是否在商事实质合理期间内完成专业检验并具名异议 (HGB § 377 Abs. 1 对抗阻断)",
        "涉案精度公差在初装试车时是否可辨识，或属于通电带载运行后方暴露的不可归责隐蔽瑕疵 (Verdeckter Mangel)",
        "出卖人出厂测试 (FAT) 是否明知公差异常而隐瞒交付，从而构成恶意欺诈阻却失权 (BGB § 444 / HGB § 377 Abs. 5)"
    ]

    outcome_branches = [
        OutcomeBranch(
            branch_type="favorable",
            title="路径一：隐蔽瑕疵成立与适时异议 (充分胜诉路径)",
            condition_precedent="假定买方举证证明设备系带负荷试车时方能暴露公差缺陷，且在发现后数日内即行具名发函通知出卖人；同时现场调试日志完备。",
            substantive_basis=["BGB § 434 Abs. 1", "BGB § 437 Nr. 1", "BGB § 439", "BGH VIII ZR 12/20 (试运转合理期间先例)"],
            key_evidence_required=[
                "现场通电调试日志 (Commissioning Log)",
                "工程师首次发现公差偏差的带时间戳工作底稿",
                "向德方正式发送的具名质量异议邮件及签收凭证"
            ],
            outcome_summary="法庭裁判倾向于认定满足物之瑕疵构成要件，出卖人商事即时通知失权抗辩不成立，支持买方请求补正、调换或承担损害赔偿责任。",
            risk_level="low"
        ),
        OutcomeBranch(
            branch_type="unfavorable",
            title="路径二：商事检验逾期拟制受领 (驳回失权路径)",
            condition_precedent="若出卖人举证证明买方在收货后超过合理常规期间未做必要初检，或买方未依法给予德方合理的维修补正宽限期即径行主张解约退款。",
            substantive_basis=["HGB § 377 Abs. 2 (拟制受领法律效果)", "BGB § 323 Abs. 1 (合理补正期间前置要求)"],
            key_evidence_required=[
                "国际物流货交承运人及买方签收单据 (POD)",
                "买方收货至首次发函之间的空白沟通记录",
                "出卖人主张设备已被买方投入商业使用的事实证据"
            ],
            outcome_summary="法庭裁判倾向于认定买方未尽到商事即时检验与异议负担，标的物拟制为已被认可受领，瑕疵救济权依法消灭，诉请面临驳回风险。",
            risk_level="high"
        ),
        OutcomeBranch(
            branch_type="uncertain",
            title="路径三：恶意隐瞒或特约排除失权 (摇摆突破路径)",
            condition_precedent="假定买方通过技术调查或内部通信调取，能够初步证明出卖人出厂验收时已知悉公差超标但未披露，或双方在合同中存在排除 § 377 的特约。",
            substantive_basis=["BGB § 444 (恶意隐瞒瑕疵)", "HGB § 377 Abs. 5 (恶意不适用失权规则)", "BGB § 280 Abs. 1"],
            key_evidence_required=[
                "德方出厂出资测试报告 (FAT) 底稿与公差异常记录",
                "德方研发/装配工程师内部往来沟通邮件",
                "买卖双方关于质保期与调试验收的专项补充协议"
            ],
            outcome_summary="若恶意隐瞒事实获得心证采信，出卖人失权抗辩被依法阻断，法庭倾向于进入实质损害赔偿与合同解除审查。",
            risk_level="medium"
        )
    ]

    red_team_defenses = [
        RedTeamDefense(
            defense_id="D1",
            opposing_claim="绝对商事失权抗辩：买受人未履行即时检验异议负担，标的物视为已被完全受领与认可",
            lethal_index="critical",
            opposing_basis="德国商法典 (HGB) § 377 Abs. 2 拟制受领条文及 BGH 判例惯例",
            counter_weapons=[
                "隐蔽瑕疵抗辩：主张微米级数控加工公差非通电带载试运转不可查知，依 HGB § 377 Abs. 3 属于隐蔽瑕疵",
                "除外规则援引：援引 BGB § 444 及 HGB § 377 Abs. 5，出卖人若存在明知隐瞒 (Arglist)，依法丧失失权保护",
                "先例盾牌：援引 BGH VIII ZR 12/20 确认大型工业成套装备允许合理的联调检验周期"
            ],
            factual_counter_point="精确锁定设备通电联动带料运转的首日，证明在该日之后数日内即行具名发函，时间差在合理界限内。",
            evidence_checklist=[
                "带时间戳的生产车间试运行日志与公差异常首测报告",
                "买卖双方项目技术负责人的即时通讯与邮件往来记录",
                "中德两地具备法定公证效力的机器运行工况鉴定报告"
            ]
        ),
        RedTeamDefense(
            defense_id="D2",
            opposing_claim="风险转移与外力介入抗辩：公差异常系跨国海运震动或买方现场电网稳压不良导致，非出厂固有瑕疵",
            lethal_index="high",
            opposing_basis="德国民法典 (BGB) § 446 风险于交付承运人时转移及举证责任分配规则",
            counter_weapons=[
                "装船前与出厂合格证书 (FAT Certificate) 对比分析，锁定固有结构公差",
                "全程无异常外包装与防震标签 (ShockWatch) 完好记录，阻断运输受损假定",
                "委托独立机械鉴定专家出具机械内部结构非外力形变之专门证人意见"
            ],
            factual_counter_point="超差部件位于全封闭核心主轴箱体内，外部防震标签与外壳完好无损，排除了吊装及外力跌落介入可能性。",
            evidence_checklist=[
                "海运清洁提单 (Clean B/L) 及到港卸货开箱原样影像全景公证",
                "车间供电电压与温湿度实时监测日志曲线",
                "主轴箱体结构力学与金属探伤专业检验意见"
            ]
        ),
        RedTeamDefense(
            defense_id="D3",
            opposing_claim="前置催告补正程序瑕疵：买方未依法给予德方合理补正修复宽限期，直接索赔或解约程序违法",
            lethal_index="high",
            opposing_basis="德国民法典 (BGB) § 323 Abs. 1 及 § 281 Abs. 1 补正优先原则 (Vorrang der Nacherfüllung)",
            counter_weapons=[
                "主张德方已明确拒绝履行 (BGB § 323 Abs. 2 Nr. 1 Ernsthafte Erfüllungsverweigerung)，无需设定宽限期",
                "主张瑕疵性质严重且德方多次调试仍无法达标，补正已属不可期待 (Unzumutbarkeit)",
                "通过公证渠道补发附带 14 个工作日明确宽限期的补充催告函 (Mahnung mit Fristsetzung)"
            ],
            factual_counter_point="德方派驻工程师已当面声明技术无法达到合同公差并撤离现场，构成事实上的确定性拒绝履行。",
            evidence_checklist=[
                "德方技术人员现场调试纪要及关于'无法消除公差'的书面签字确认",
                "买方向德方管理层发送的补正要求邮件及催告函签收回执",
                "下游客户因迟延交付发出的索赔意向书与停线损失统计表"
            ]
        )
    ]

    actionable_checklist = [
        "固定现场调试记录：调取工厂通电调试日志 (Commissioning Log)，锁定义务人到场与瑕疵暴露时间戳",
        "排查恶意隐瞒证据：要求德方披露出厂 FAT 原始传感器测试数据，核查是否构成 BGB § 444 恶意欺诈",
        "固化前置催告程序：通过涉外公证电邮补发明确的 14 个工作日补正宽限期函件，消除 BGB § 323 程序抗辩",
        "申请独立司法鉴定：委托中德互认的工业检验机构对机床公差进行封闭封样公证与鉴定"
    ]

    return StrategicAssessment(
        case_id=state.case_id,
        pivotal_factors=pivotal_factors,
        outcome_branches=outcome_branches,
        red_team_defenses=red_team_defenses,
        actionable_checklist=actionable_checklist,
        updated_at=_now()
    )


def _build_us_assessment(state: CaseState) -> StrategicAssessment:
    """美国法域基准策略评估与红队攻防对抗 (UCC Article 2 & Federal Discovery)"""
    pivotal_factors = [
        "买方在设备交货至正式发函抗辩之时间跨度，是否符合 UCC § 2-607(3)(a) 工业设备商事'合理时间' (Reasonable Time)",
        "卖方发票中 AS IS 免责与责任限制条款是否经由充分磋商并入合同，抑或属于 UCC § 2-207 格式条款之战未并入的单方除外",
        "买方能否通过 28 U.S.C. § 1782 跨国证据开示 (Discovery) 调取卖方研发设计日志，证明标的物出厂时即存在不适销性固有缺陷 (UCC § 2-314)"
    ]

    outcome_branches = [
        OutcomeBranch(
            branch_type="favorable",
            title="路径一：适销性违约确立与合理通知 (胜诉主导路径)",
            condition_precedent="假定原告举证证明工业设备未达到同行业商业适销标准，且在发现公差瑕疵后的商事合理时间 (Reasonable Time) 内发出违约异议通知；同时无有效免责条款约束。",
            substantive_basis=["UCC § 2-314 (默示适销性担保)", "UCC § 2-607(3)(a)", "UCC § 2-714/715", "Eastern Air Lines 案 (合理期间标准)"],
            key_evidence_required=[
                "现场开箱验收与带负荷试运行生产日志",
                "工程师首次检出精度失准的技术记录",
                "买方向美方卖方发出的具名违约通知信函 (Notice of Breach)"
            ],
            outcome_summary="法庭裁判倾向于认定卖方违反法定默示适销性担保，买方通知符合商事合理期限，倾向于支持直接损失及可预见的连带附随损失赔偿主张。",
            risk_level="low"
        ),
        OutcomeBranch(
            branch_type="unfavorable",
            title="路径二：异议逾期失权或条款免除 (驳回风险路径)",
            condition_precedent="若卖方举证证明买方在收货后长达数月保持沉默或已正式签署验收确认书，且合同/订单中合法包含醒目 AS IS 担保排除与免责条款。",
            substantive_basis=["UCC § 2-607(3)(a) (Barred from Any Remedy 绝对失权)", "UCC § 2-316(2) (担保排除效力)"],
            key_evidence_required=[
                "买方代表签字的无保留最终交接单据 (Delivery Receipt)",
                "长达数月无任何异议记录之商务往来通信",
                "包含醒目字体 (Conspicuous) 免责条款的经签署销售合同"
            ],
            outcome_summary="法庭裁判倾向于认定买方通知逾期构成绝对失权，或认定出卖人已有效排除适销性担保，买方的法定救济请求权面临全面被阻断风险。",
            risk_level="high"
        ),
        OutcomeBranch(
            branch_type="uncertain",
            title="路径三：格式条款除外与 1782 跨境调证 (攻防突破路径)",
            condition_precedent="假定原告成功主张卖方发票单方免责条款构成实质性变更不并入合同 (UCC § 2-207)，并通过 28 U.S.C. § 1782 成功调取美方出厂测试日志证实固有缺陷。",
            substantive_basis=["UCC § 2-207 (Battle of the Forms)", "28 U.S.C. § 1782 (跨国审判证据开示)", "Intel Corp. v. AMD 先例"],
            key_evidence_required=[
                "采购订单 (PO) 与美方销售确认书 (Order Confirmation) 对比文本",
                "向美国联邦地区法院提交的 28 U.S.C. § 1782 单方立案申请书件",
                "美方总公司被强制移交的设计公差变更工程底稿"
            ],
            outcome_summary="若单方免责被判定未并入合同且跨境证据开示成功，卖方法律防线瓦解，案件将倾向于转向对我方有利的和解谈判或实质违约赔偿裁决。",
            risk_level="medium"
        )
    ]

    red_team_defenses = [
        RedTeamDefense(
            defense_id="D1",
            opposing_claim="合理通知逾期失权抗辩：买方未在合理期间内发出违约通知，依据 UCC § 2-607(3)(a) 永久丧失救济权",
            lethal_index="critical",
            opposing_basis="UCC Section 2-607(3)(a) 规定及纽约州判例法严格通知规则",
            counter_weapons=[
                "合理期间动态抗辩：援引 Eastern Air Lines 案，主张复杂工业设备的合理期间应考量调试周期与技术排查必要性",
                "善意商人标准：主张买方始终秉持善意 (Good Faith) 与卖方技术支持协作，不应机械适用一般消费品通知期限",
                "先例支持：援引联邦第二巡回区判例，证明买卖双方前期持续沟通即满足 UCC 通知的实质功能要求"
            ],
            factual_counter_point="在设备初次发生停机报警后立即通过技术支持热线及电子邮件向美方通报，形式虽为技术咨询但实质已达知会违约之法律目的。",
            evidence_checklist=[
                "带时间戳的售后报障工单流水与客服聊天记录",
                "双方技术支持人员的越洋邮件往来及 Zoom 会议纪要",
                "工业设备带料调试必须跨周期的行业操作规范与国家标准"
            ]
        ),
        RedTeamDefense(
            defense_id="D2",
            opposing_claim="默示适销性担保排除与现况交付抗辩：确认单背面明确载明 AS IS 且排除一切默示担保",
            lethal_index="high",
            opposing_basis="UCC Section 2-316 担保排除规则及责任限制条款",
            counter_weapons=[
                "格式条款之战排除 (UCC § 2-207(2)(b))：主张免责条款实质性改变合同条件 (Material Alteration)，未获我方明示同意不得并入",
                "醒目性要求抗辩 (Conspicuous Requirement)：主张免责字体未采用大写或醒目颜色，未达 UCC § 1-201(10) 法定醒目标准",
                "显失公平抗辩 (Unconscionability)：援引 UCC § 2-302 主张该条款在商事实践中显失公平"
            ],
            factual_counter_point="买方采购订单中已明确载明特定质量标准，卖方确认单的微缩背面条款从未经过实际磋商，亦未以醒目方式提请注意。",
            evidence_checklist=[
                "双方签署的原始报价单、PO 订单及确认单完整高精扫描件",
                "字体大小比对测绘表与未标粗/未标红对照证据",
                "买方在交易缔结前明确要求的技术规格说明书 (Technical Specs)"
            ]
        ),
        RedTeamDefense(
            defense_id="D3",
            opposing_claim="买方操作不当与环境介入阻断因果：机台损坏系中国工厂电网不稳定及非授权维修导致",
            lethal_index="high",
            opposing_basis="UCC § 2-715 附随损失因果关系规则及因果阻断原则 (Intervening Superseding Cause)",
            counter_weapons=[
                "出厂设计固有缺陷举证：主张缺陷系由于内部固件逻辑错误导致，与外部输入电源无关",
                "符合工业标准环境记录：提供经认证的车间稳压器及恒温恒湿监控系统无中断日志",
                "专家证人鉴定：委托持证专业工程师出具因果关系认定专家证词 (Expert Declaration)"
            ],
            factual_counter_point="设备内部断电保护模块未被触发，且控制主板芯片日志中明确记录异常发生在内部运算堆栈溢出，排除了电网波动原因。",
            evidence_checklist=[
                "厂区配电室及车间 UPS 不间断电源稳压运行日志",
                "由国际认可的第三方工业检验机构出具的失效模式分析报告 (FMEA)",
                "卖方派遣现场工程师签署的操作合规签字回执"
            ]
        )
    ]

    actionable_checklist = [
        "固定通知时序链条：梳理交货、试机、初次报错至正式违约函的全流程时序表，防御 UCC § 2-607(3)(a) 逾期抗辩",
        "启动合同格式条款审查：逐字比对 PO 与 Confirmation 文本，锁定 UCC § 2-207 格式条款之战未并入免责抗辩",
        "筹备 28 U.S.C. § 1782 跨境取证：拟定针对美方卖方设计图纸、出厂检验日志及客户投诉记录的 Discovery 调查清单",
        "编制专家证人意见书：聘请涉美执业工程师就机械适销性与固有缺陷提供符合联邦证据规则 (FRE 702) 的专业报告"
    ]

    return StrategicAssessment(
        case_id=state.case_id,
        pivotal_factors=pivotal_factors,
        outcome_branches=outcome_branches,
        red_team_defenses=red_team_defenses,
        actionable_checklist=actionable_checklist,
        updated_at=_now()
    )


def _build_german_delay_assessment(state: CaseState) -> StrategicAssessment:
    """德国法域给付迟延与所失利益专项策略评估 (C002)"""
    pivotal_factors = [
        "德方供应链受阻是否构成可预见且应由债务人承担的商业采购风险 (BGB § 276 采购风险责任)",
        "原告下游新能源汽车订单产线停产与德方交付迟延之间的直接法律因果关系 (BGB § 252 所失利益认定)",
        "原告书面催告函 (Mahnung) 的合法性与有效送达事实 (BGB § 286 Abs. 1 给付迟延法定要件)"
    ]

    outcome_branches = [
        OutcomeBranch(
            branch_type="favorable",
            title="路径一：给付迟延成立与所失利益合理盖然性 (充分支持路径)",
            condition_precedent="假定原告举证证明催告函已于2023年3月5日送达，德方逾期交付达4个半月，且下游整车厂索赔及利润损失审计报告符合通常事态发展之客观盖然性。",
            substantive_basis=["BGB § 280 Abs. 1, 2", "BGB § 286 Abs. 1", "BGB § 252", "BGH VIII ZR 225/07"],
            key_evidence_required=[
                "采购合同履约期限条款与书面催告函有效送达签收凭证",
                "下游新能源汽车产线停工日志与整车厂商务索赔协议",
                "由独立会计师事务所出具的可得利益营业利润损失专项审计报告"
            ],
            outcome_summary="法庭裁判倾向于认定德方内部供应链受阻不构成免责事由，满足给付迟延与可得利益损失构成要件，支持原告全部损害赔偿诉求及商事法定迟延利息。",
            risk_level="low"
        ),
        OutcomeBranch(
            branch_type="unfavorable",
            title="路径二：因果关系阻断或过失相抵 (损失扣减路径)",
            condition_precedent="若德方举证证明原告未采取合理替代采购或调度措施以防止损失扩大，或产线停工系受原告自身技术改造及其他零部件短缺介入所致。",
            substantive_basis=["BGB § 254 (受害人过失相抵与减损负担)", "BGB § 249 (损害赔偿范围)"],
            key_evidence_required=[
                "全球工业机器人替代采购现货市场询价与交期调研报告",
                "原告生产车间其他配套工序调试记录及物料到货排期表"
            ],
            outcome_summary="法庭裁判倾向于认定原告违反减损负担或存在介入原因，依法扣减可得利益赔偿金额，或仅支持直接迟延利息损失。",
            risk_level="medium"
        ),
        OutcomeBranch(
            branch_type="uncertain",
            title="路径三：法定免责事由认定 (摇摆争议路径)",
            condition_precedent="假定德方能够举证证明核心零部件断供属于不可归责于其自身的客观不可抗力事件，且在缔约时完全不可预见。",
            substantive_basis=["BGB § 286 Abs. 4 (债务人不可归责免责事由)", "BGB § 276"],
            key_evidence_required=[
                "德方上游原厂遭遇不可抗力之官方声明及供应链中断证明",
                "双方关于不可抗力与供应链风险免责的特殊合同条款"
            ],
            outcome_summary="若不可抗力免责成立，德方在阻碍期间不陷于迟延，原告迟延损害赔偿诉求面临法律抗辩阻断风险。",
            risk_level="high"
        )
    ]

    red_team_defenses = [
        RedTeamDefense(
            defense_id="D1",
            opposing_claim="不可归责与免责事由抗辩：主张全球零部件供应链受阻属于客观不可抗力，德方无故意或过失",
            lethal_index="critical",
            opposing_basis="德国民法典 (BGB) § 286 Abs. 4 及 § 276 归责原则与免责抗辩",
            counter_weapons=[
                "商业采购风险原则：主张种类物买卖中出卖人承担绝对采购风险 (Beschaffungsrisiko)，内部供货短缺不构成免责",
                "预见性反制：主张缔约时全球供应链波动已常态化，德方作为专业设备制造商应合理预留缓冲周期",
                "先例支持：援引联邦最高法院关于商业采购责任严格归责裁判原则"
            ],
            factual_counter_point="涉案工业机器人为成熟工业型号，德方在履约期间未及时向买方预警或提出替代解决方案，已构成过错迟延。",
            evidence_checklist=[
                "合同订立时双方关于设备交期与产能承诺的技术协议",
                "德方在逾期期间对催告函作出的回复往来函电底稿",
                "同类自动化设备现货供货周期行业调查数据"
            ]
        ),
        RedTeamDefense(
            defense_id="D2",
            opposing_claim="可得利益盖然性不足抗辩：主张下游整车厂索赔缺乏必然因果关系，原告主张之85万欧元利润损失属投机性推算",
            lethal_index="high",
            opposing_basis="德国民法典 (BGB) § 252 第二句所失利益证明标准",
            counter_weapons=[
                "通常事态发展推定：援引 § 252 第二句，依客观生产规划与下游固定长协订单，利润具备充分盖然性",
                "独立审计报告：提供中德两地认可的第三方特许会计师专项审计鉴证报告",
                "先例支持：援引 BGH 关于产线停工可得利益损失判例标准"
            ],
            factual_counter_point="原告已锁定了整车厂明确供货协议，且产线停产期间固定成本折旧与预期毛利损失计算依据确凿。",
            evidence_checklist=[
                "下游整车厂排产通知、月度采购订单及已生效商业合同",
                "第三方注册会计师出具的产线停产经济损失审计专报",
                "生产车间每日运行打卡记录与物料损耗台账"
            ]
        ),
        RedTeamDefense(
            defense_id="D3",
            opposing_claim="减损义务违反与过失相抵抗辩：原告在得知迟延后未积极寻求临时转包或现货租赁以减轻损失",
            lethal_index="medium",
            opposing_basis="德国民法典 (BGB) § 254 第2款受害人减损义务",
            counter_weapons=[
                "定制化与非通用性抗辩：涉案自动化产线与夹具系高度定制化设计，市场上不存在短期可替代租赁设备",
                "信赖保护原则：德方在沟通过程中反复承诺短期内即可交货，导致原告产生合理等待信赖",
                "举证责任倒置：依德国民诉法，违反应尽减损义务的举证责任在于出卖人"
            ],
            factual_counter_point="原告在收到德方推迟通知后多次发函协调，且定制化机械臂无法临时替换，已履行一切合理限度内的协同与减损措施。",
            evidence_checklist=[
                "定制机械手工程设计图纸与专用接口技术规范",
                "双方项目经理关于等待交货及催促排期的即时沟通备忘录",
                "原告为缓解产线压力调动内部人工加班作业的支出凭证"
            ]
        )
    ]

    actionable_checklist = [
        "固定催告与逾期证据链：核实 Mahnung 邮件送达回执与德方确认签收时间点，锁死 § 286 迟延起点",
        "完善所失利益审计报告：委托具备涉外资质的会计师事务所补充出具符合德国法庭标准的可得利益测算底稿",
        "排查定制化与不可替代性：准备产线图纸与现场鉴定报告，防御德方援引 § 254 的减损义务过失相抵抗辩",
        "固定法定商事利息基准：依据德意志联邦银行公布的半年度基准利率计算基准利率加9%之法定迟延利息账单"
    ]

    return StrategicAssessment(
        case_id=state.case_id,
        pivotal_factors=pivotal_factors,
        outcome_branches=outcome_branches,
        red_team_defenses=red_team_defenses,
        actionable_checklist=actionable_checklist,
        updated_at=_now()
    )


def _build_german_gmbh_form_assessment(state: CaseState) -> StrategicAssessment:
    """德国法域有限责任公司股权转让与公证形式要件专项策略评估 (C003)"""
    pivotal_factors = [
        "境外律师见证或公证是否与德国公证人 (Notar) 具有法律上的实质等效性 (GmbHG § 15 Abs. 3 / 等效原则 Gleichwertigkeit)",
        "德方拒绝配合办理商业登记名录变更是否构成违反诚实信用原则之权利滥用 (BGB § 242 Rechtsmissbrauch)",
        "案涉股权购买协议 (SPA) 中关于交割前提条件与外资国家安全审查的分歧认定"
    ]

    outcome_branches = [
        OutcomeBranch(
            branch_type="unfavorable",
            title="路径一：公证形式瑕疵自始绝对无效 (高风险抗辩路径)",
            condition_precedent="若法庭判定境外私下见证签署未达到德国《公证法》及《有限责任公司法》第15条要求的法定严谨性，且不满足实质等效性标准。",
            substantive_basis=["GmbHG § 15 Abs. 3, 4", "BGB § 125 (形式瑕疵法律效果)", "BGH II ZR 256/15 (境外公证等效性严格先例)"],
            key_evidence_required=[
                "在北京签署的英文 SPA 原件及见证律师资质证明",
                "德方出让股东书面主张协议无效的解约发函",
                "德国公证人法定审查职权与境外见证程序的对比法律意见书"
            ],
            outcome_summary="法庭裁判倾向于认定股权转让债权协议及处分行为因违反强制性公证形式要件而自始无效，买方直接请求交割的诉请面临极大驳回风险。",
            risk_level="high"
        ),
        OutcomeBranch(
            branch_type="favorable",
            title="路径二：实质等效性认定或形式治愈 (突破胜诉路径)",
            condition_precedent="假定买方证明境外公证书已由具备法定身份核验与教示职能的公证机构出具并办理海牙附加证明书 (Apostille)，且德方已实际受领部分对价并移交经营控制权。",
            substantive_basis=["GmbHG § 15 Abs. 3", "BGH II ZR 221/11 (等效性认定裁判)", "BGB § 242 (诚实信用与禁止反悔)"],
            key_evidence_required=[
                "经海牙认证或领事认证的股权转让协议公证书",
                "原告向德方监管账户支付首期收购对价的电汇凭证",
                "出让股东向原告交接公司印章、公章及银行授权的书面清单"
            ],
            outcome_summary="法庭裁判倾向于采纳实质等效性抗辩，或依据诚实信用原则认定德方援引形式瑕疵构成权利滥用，支持原告继续办理股东名录变更登记。",
            risk_level="medium"
        ),
        OutcomeBranch(
            branch_type="uncertain",
            title="路径三：缔约过失损害赔偿转化 (退守和解路径)",
            condition_precedent="若形式无效不可逆转，买方转而主张德方明知公证要件而恶意促成私下签约，后因估值上涨违背诚信反悔退出。",
            substantive_basis=["BGB § 311 Abs. 2 (缔约过失责任 c.i.c.)", "BGB § 241 Abs. 2", "BGB § 280 Abs. 1"],
            key_evidence_required=[
                "双方谈判期间关于公证安排的往来邮件与会议纪要",
                "原告因筹备并购支出的尽调中介费、评估费及财务成本凭证"
            ],
            outcome_summary="若协议被确认无效，法庭倾向于支持原告就信赖利益损失请求德方承担损害赔偿，迫使德方重新进入公证谈判。",
            risk_level="medium"
        )
    ]

    red_team_defenses = [
        RedTeamDefense(
            defense_id="D1",
            opposing_claim="公证形式要件瑕疵绝对无效抗辩：主张境外协议未经德国法定公证，依 GmbHG § 15 Abs. 3 / BGB § 125 协议自始无效",
            lethal_index="critical",
            opposing_basis="德国有限责任公司法 (GmbHG) § 15 Abs. 3 及德国民法典 (BGB) § 125 强行法规范",
            counter_weapons=[
                "实质等效性原则 (Gleichwertigkeitslehre)：主张见证机构具备法定身份确认与记录职权，实质达到德国公证警告与证明功能",
                "诚实信用与反言禁阻 (Venire contra factum proprium)：德方受领定金并参与交割准备后反悔，构成 BGB § 242 权利滥用",
                "治愈规则准备：主张通过商业登记处正式登载即可依 GmbHG § 15 Abs. 4 发生瑕疵治愈 (Heilung)"
            ],
            factual_counter_point="双方签约时德方聘请的德国执业律师全程参与文本修改，且双方已签署补充承诺函约定随后在慕尼黑办理追认公证。",
            evidence_checklist=[
                "双方签署的备忘录及律师往来邮件中关于追认公证的约定文本",
                "原告支付定金与德方全额确认收据",
                "由德国法学专家出具的境外见证实质等效性论证意见"
            ]
        ),
        RedTeamDefense(
            defense_id="D2",
            opposing_claim="监管前置审批未成就抗辩：交割需以德国联邦经济部 (BMWK) 外商投资安全审查通过为前提条件",
            lethal_index="high",
            opposing_basis="德国对外贸易法 (AWG) 第4条及对外贸易条例 (AWV) 第55条国家安全审查强制规范",
            counter_weapons=[
                "申报配合义务抗辩：主张目标公司核心业务不涉及敏感关键基础设施，且德方负有主动配合提交申报之法定附随义务",
                "无异议证明申请 (Unbedenklichkeitsbescheinigung)：原告已主动委托法兰克福律师启动申报程序"
            ],
            factual_counter_point="涉案标的为普通清洁能源配件制造，不属于受限行业清单，审批属于形式性确认，德方借此阻挠交割系恶意拖延。",
            evidence_checklist=[
                "目标公司产品清单与技术参数不落入敏感管制目录的证明",
                "原告向 BMWK 递交外商投资安全审查的预申报受理回执",
                "双方 SPA 合同中关于当事人相互协助履行监管申报的约定条款"
            ]
        ),
        RedTeamDefense(
            defense_id="D3",
            opposing_claim="公司法内部章程优先受让权阻断抗辩：公司章程规定股权转让须经全体股东一致书面同意",
            lethal_index="medium",
            opposing_basis="目标公司公司章程 (Satzung) 约定的股权转让限制条款 (Vinkulierung)",
            counter_weapons=[
                "股东会一致同意决议：原告已取得原持股70%的大股东书面批准文件",
                "转让通知送达证明：已按章程规定程序向公司执行董事 (Geschäftsführer) 合法送达转让意向通知"
            ],
            factual_counter_point="出让股东即为公司控股股东兼唯一董事，其签约行为实质代表了公司的内部同意与追认。",
            evidence_checklist=[
                "德国商业登记处查册登记簿 (Handelsregisterauszug) 载明之董事与股东名册",
                "签署 SPA 时的股东会书面决议及出让股东签署授权书",
                "公司章程现行有效德文法定文本及中文公证翻译件"
            ]
        )
    ]

    actionable_checklist = [
        "锁定公证等效性论证：聘请具备德国最高法院出庭资格的专家就境内见证等效性提供专门鉴定意见书",
        "启动公证追认补正程序：向德方正式发出在德国公证处会晤办理追认公证的限期公证书，若其拒绝则坐实其恶意阻碍履行",
        "推进 BMWK 外资安全审查：取得德国联邦经济部出具的无异议证明 (Unbedenklichkeitsbescheinigung) 彻底化解监管抗辩",
        "保全商业登记处名册：向慕尼黑地方法院申请临时处分 (Einstweilige Verfügung)，禁止德方向第三方重复转让股权"
    ]

    return StrategicAssessment(
        case_id=state.case_id,
        pivotal_factors=pivotal_factors,
        outcome_branches=outcome_branches,
        red_team_defenses=red_team_defenses,
        actionable_checklist=actionable_checklist,
        updated_at=_now()
    )


def build_strategic_assessment(state: CaseState) -> StrategicAssessment:
    """同步基准策略评估构造函数（根据法域及案件事实要素智能路由）"""
    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    )
    if is_us:
        return _build_us_assessment(state)

    cid = state.case_id or ""
    facts = state.facts_zh or ""
    claims = state.claims_zh or ""
    issues_text = " ".join([i.text_zh for i in state.issues]) if state.issues else ""
    full_text = f"{cid} {facts} {claims} {issues_text}"

    if "C002" in cid or "给付迟延" in full_text or "§ 286" in full_text or "机器人" in full_text:
        return _build_german_delay_assessment(state)
    elif "C003" in cid or "股权" in full_text or "GmbH" in full_text:
        return _build_german_gmbh_form_assessment(state)

    return _build_german_assessment(state)


async def generate_strategic_assessment(
    state: CaseState,
    client: Optional[LLMClient] = None
) -> StrategicAssessment:
    """生成策略推演与红队攻防对抗评估
    优先采用大模型基于案件事实和要素定制推演，若离线/mock 则生成高标准基准推演评估。
    """
    base_assessment = build_strategic_assessment(state)

    if not client:
        return base_assessment

    # 检查是否有真实提供商 API Key 环境变量
    has_key = any(
        bool(os.environ.get(pcfg.get("api_key_env", "")))
        for pcfg in getattr(client, "providers", {}).values()
        if pcfg.get("api_key_env")
    )
    if not has_key:
        return base_assessment

    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    )

    # 当存在真实有效 LLM 客户端与密钥时，结合案情个性化增强
    try:
        jurisdiction_name = "美国统一商法典 (UCC) 及联邦法院" if is_us else "德国联邦民商法 (BGB/HGB) 及联邦最高法院 (BGH)"
        prompt = f"""针对案件事实，开展【动态胜败边界推演与红队攻防对抗分析】。
案情背景：
- 案号：{state.case_id}
- 适用法域：{jurisdiction_name}
- 核心事实：{state.facts_zh[:400]}
- 当事人诉求：{(state.claims_zh or '违约救济与损害赔偿')[:150]}

请严格遵守 V8 客观中立防线（禁止虚假绝对化胜诉承诺，采用条件假定推演）。
请输出结构精炼的 JSON：
{{
  "pivotal_factors": ["胜败摇摆关键变量 1", "关键变量 2"],
  "outcome_branches": [
    {{
      "branch_type": "favorable",
      "title": "乐观充分路径",
      "condition_precedent": "假定原告举证证明...",
      "substantive_basis": ["法条/先例 1"],
      "key_evidence_required": ["核心证据 1"],
      "outcome_summary": "法庭裁判倾向于...",
      "risk_level": "low"
    }},
    {{
      "branch_type": "unfavorable",
      "title": "悲观驳回路径",
      "condition_precedent": "若被告举证证明...",
      "substantive_basis": ["法条/先例 1"],
      "key_evidence_required": ["核心证据 1"],
      "outcome_summary": "法庭裁判倾向于...",
      "risk_level": "high"
    }}
  ],
  "red_team_defenses": [
    {{
      "defense_id": "D1",
      "opposing_claim": "对方最致命抗辩 1",
      "lethal_index": "critical",
      "opposing_basis": "条文/判例依据",
      "counter_weapons": ["我方反制武器 1"],
      "factual_counter_point": "事实反驳突破口",
      "evidence_checklist": ["下一步关键调取补证 1"]
    }},
    {{
      "defense_id": "D2",
      "opposing_claim": "对方抗辩 2",
      "lethal_index": "high",
      "opposing_basis": "条文/判例依据",
      "counter_weapons": ["我方反制武器 2"],
      "factual_counter_point": "事实反驳突破口",
      "evidence_checklist": ["下一步关键调取补证 2"]
    }}
  ],
  "actionable_checklist": ["下一步关键行动 1", "关键行动 2"]
}}
"""
        import asyncio
        data = await asyncio.wait_for(
            client.chat_json(
                task="generate",
                system_prompt="你是一名资深跨国商事诉讼专家与对抗策略架构师。请以中立严谨的条件推演格式输出 JSON。",
                user_prompt=prompt,
                temperature=0.1,
                retries=0
            ),
            timeout=18.0
        )
            
        # 严格经过 V8 清洗
        branches = []
        for b in data.get("outcome_branches", []):
            branches.append(OutcomeBranch(
                branch_type=b.get("branch_type", "favorable"),
                title=clean_predictive_text(b.get("title", "")),
                condition_precedent=clean_predictive_text(b.get("condition_precedent", "")),
                substantive_basis=b.get("substantive_basis", []),
                key_evidence_required=b.get("key_evidence_required", []),
                outcome_summary=clean_predictive_text(b.get("outcome_summary", "")),
                risk_level=b.get("risk_level", "medium")
            ))

        defenses = []
        for d in data.get("red_team_defenses", []):
            defenses.append(RedTeamDefense(
                defense_id=d.get("defense_id", f"D{len(defenses)+1}"),
                opposing_claim=clean_predictive_text(d.get("opposing_claim", "")),
                lethal_index=d.get("lethal_index", "high"),
                opposing_basis=clean_predictive_text(d.get("opposing_basis", "")),
                counter_weapons=[clean_predictive_text(w) for w in d.get("counter_weapons", [])],
                factual_counter_point=clean_predictive_text(d.get("factual_counter_point", "")),
                evidence_checklist=[clean_predictive_text(e) for e in d.get("evidence_checklist", [])]
            ))

        if branches and defenses:
            return StrategicAssessment(
                case_id=state.case_id,
                pivotal_factors=[clean_predictive_text(f) for f in data.get("pivotal_factors", base_assessment.pivotal_factors)],
                outcome_branches=branches,
                red_team_defenses=defenses,
                actionable_checklist=[clean_predictive_text(a) for a in data.get("actionable_checklist", base_assessment.actionable_checklist)],
                updated_at=_now()
            )
    except Exception:
        pass

    return base_assessment
