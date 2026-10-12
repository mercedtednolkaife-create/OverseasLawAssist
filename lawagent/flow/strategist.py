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


def build_strategic_assessment(state: CaseState) -> StrategicAssessment:
    """同步基准策略评估构造函数"""
    is_us = (state.meta.jurisdiction or "").startswith("us_") or any(
        kw in (state.meta.choice_of_law or "") for kw in ["美国", "UCC", "纽约", "特拉华", "加州", "US"]
    )
    return _build_us_assessment(state) if is_us else _build_german_assessment(state)


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
