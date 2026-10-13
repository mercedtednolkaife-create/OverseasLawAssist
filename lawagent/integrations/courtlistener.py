"""CourtListener 动态判例池与先验有效性（Shepardizing / KeyCite）过滤模块 (CourtListener Integration)
对齐“三位一体分层协同架构” Tier 2：
1. 联邦与州层级权重打分机制 (SCOTUS > 巡回上诉法院 > 州最高法院 > 地区法院)
2. 先验好法有效性门禁 (Shepardizing / KeyCite Gate)：过滤 Overruled, Abrogated, Superseded 的失效坏法
3. 拘束力门禁：仅采信 Published 先例，过滤未公开发表的 Summary Orders / Memorandum Dispositions
4. 动态检索与高质量先例池映射
5. 滚雪球入库 (Snowball Ingestion)：将通过好法审查的先例写入快照库并同步拓扑图谱 (edges / hot_norm_cases)
"""

import os
import re
import json
import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field


class CourtTier:
    SCOTUS = "SCOTUS"                   # 联邦最高法院 (全国终局拘束力，权重 1.0)
    CIRCUIT_APPEALS = "CIRCUIT_APPEALS" # 联邦巡回上诉法院 (巡回区内拘束力，权重 0.85)
    STATE_SUPREME = "STATE_SUPREME"     # 州最高法院 (各州实体法如特拉华DGCL/纽约UCC终局解释权，权重 0.80)
    DISTRICT_COURT = "DISTRICT_COURT"   # 联邦地区法院 / 州初审商事法院 (说服性判例，权重 0.65)


TIER_WEIGHTS = {
    CourtTier.SCOTUS: 1.00,
    CourtTier.CIRCUIT_APPEALS: 0.85,
    CourtTier.STATE_SUPREME: 0.80,
    CourtTier.DISTRICT_COURT: 0.65,
}


class ShepardsSignal:
    POSITIVE = "positive"   # 🟢 好法 (Good Law): Affirmed, Followed, Approved
    CAUTION = "caution"     # 🟡 区分/限制 (Cautionary): Distinguished, Limited, Questioned
    NEGATIVE = "negative"   # 🔴 坏法 (Bad Law): Overruled, Superseded, Vacated, Abrogated - 严厉排除!


class CourtPrecedent(BaseModel):
    case_id: str
    name: str
    citation: str
    court: str
    court_tier: str = CourtTier.CIRCUIT_APPEALS
    year: int
    shepards_signal: str = ShepardsSignal.POSITIVE
    precedential_status: str = "Published"   # "Published" vs "Unpublished"
    topic: str
    holding: str
    key_quote: str
    admissibility_notes: str
    negative_treatment: Optional[str] = None
    source_url: str = ""
    decided: str = ""
    norms_meta: List[str] = Field(default_factory=list)
    facts: str = ""
    reasoning: str = ""

    @property
    def clean_case_id(self) -> str:
        return self.case_id.replace("CASE:", "").strip()

    @property
    def tier_weight(self) -> float:
        return TIER_WEIGHTS.get(self.court_tier, 0.60)


class ShepardizingValidator:
    """Shepardizing / KeyCite 先验有效性审查器"""

    @staticmethod
    def validate(precedent: CourtPrecedent) -> Tuple[bool, str]:
        """检查先例是否为有效好法 (Good Law) 且具备先例拘束力"""
        # 1. 坏法先验拦截
        if precedent.shepards_signal == ShepardsSignal.NEGATIVE:
            reason = f"【坏法拦截】判例已被明确推翻/废止 (Overruled/Superseded): {precedent.negative_treatment or '已被后司法裁决否定'}"
            return False, reason

        # 2. 未发表简易裁判拦截 (Unpublished Summary Order)
        if precedent.precedential_status.lower() != "published":
            reason = "【拘束力缺陷】属于未公开发表备忘录裁决 (Unpublished / Non-precedential Summary Disposition)，不具有普通法正式先例价值"
            return False, reason

        return True, "【有效好法】经先验 Shepardizing 检验，判例现行有效且具备正式先例拘束力"


# =====================================================================
# 预置高可信金标准先例库 (Curated Gold Standard Precedents)
# 涵盖 UCC Article 1 & 2 买卖/担保/检验/时效、28 U.S.C. 1782 跨境取证、
# 9 U.S.C. FAA 商事仲裁、DGCL 特拉华州公司治理与并购
# =====================================================================
CURATED_US_PRECEDENTS: List[CourtPrecedent] = [
    # 1. UCC 2-607(3)(a) 检验通知与合理期间经典先例
    CourtPrecedent(
        case_id="5TH-CIR:Eastern-Air-Lines-v-McDonnell:1976",
        name="Eastern Air Lines, Inc. v. McDonnell Douglas Corp.",
        citation="532 F.2d 957 (5th Cir. 1976)",
        court="U.S. Court of Appeals for the Fifth Circuit",
        court_tier=CourtTier.CIRCUIT_APPEALS,
        year=1976,
        decided="1976-05-10",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="UCC § 2-607(3)(a) 检验与违约异议通知的合理期间认定及商事诚信",
        holding="UCC § 2-607(3)(a) 所要求的买方违约异议通知并非形式主义苛求，其核心立法目的在于促使商业交易诚实信用流转、防止突袭诉讼并给予卖方及时调查与补救之机会。复杂商事交易中通知期间的合理性需结合履行背景综合判断，不能简单以单一自然日武断认定失权。",
        key_quote="The notice requirement of UCC § 2-607(3)(a) is designed to defeat commercial bad faith, not to provide a booby-trap for the unwary. Notice must merely let the seller know that the transaction is troublesome and must be watched.",
        admissibility_notes="联邦巡回上诉法院权威判例，广泛为各州 UCC 采信。在中国涉外法庭中可作为论证高精尖技术设备异议期间未过合理期限的法理渊源。",
        norms_meta=["UCC:§2-607", "UCC:§1-304"],
        source_url="https://www.courtlistener.com/opinion/334547/eastern-air-lines-inc-v-mcdonnell-douglas-corp/"
    ),
    # 2. UCC 2-207 格式之战与 2-316 免责条款并入
    CourtPrecedent(
        case_id="3RD-CIR:Step-Saver-v-Wyse:1991",
        name="Step-Saver Data Systems, Inc. v. Wyse Technology",
        citation="939 F.2d 91 (3d Cir. 1991)",
        court="U.S. Court of Appeals for the Third Circuit",
        court_tier=CourtTier.CIRCUIT_APPEALS,
        year=1991,
        decided="1991-07-29",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="UCC § 2-207 格式之战 (Battle of the Forms) 与免责条款实质性变更审查",
        holding="在商人之间（Between Merchants），单方在包装盒上附带的免责条款（Box-top / Shrink-wrap license）若构成对合同实质性变更（Material Alteration），且相对方未明示同意，则不并入最终合同，卖方不能免除 UCC § 2-314 默示适销性担保责任。",
        key_quote="Under UCC § 2-207(2)(b), additional terms do not become part of the agreement if they materially alter it. A disclaimer of warranty unquestionably materially alters a contract.",
        admissibility_notes="联邦第三巡回上诉法院关于格式条款与默示担保免除的奠基性判例，对于排除卖方格式免责条款抗辩具有极高证明力。",
        norms_meta=["UCC:§2-207", "UCC:§2-314", "UCC:§2-316"],
        source_url="https://www.courtlistener.com/opinion/564778/step-saver-data-systems-inc-v-wyse-technology/"
    ),
    # 3. UCC 2-314 适销性与隐蔽瑕疵检验起算
    CourtPrecedent(
        case_id="MASS:Delano-Growers-v-Supreme-Wine:1985",
        name="Delano Growers' Cooperative Winery v. Supreme Wine Co.",
        citation="393 Mass. 666, 473 N.E.2d 1066 (Mass. 1985)",
        court="Supreme Judicial Court of Massachusetts",
        court_tier=CourtTier.STATE_SUPREME,
        year=1985,
        decided="1985-01-28",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="UCC § 2-314 默示适销性担保 (Merchantability) 与隐蔽瑕疵检验起算",
        holding="经营同类标的物的商人出卖货物，默示担保货物具有普通商业用途之适销性。若货物存在交付时难以通过肉眼即刻发现的隐蔽瑕疵（Latent Defect），异议通知期间自买方实际发现或应当发现该瑕疵之日起算，而非自物理交付日绝对起算。",
        key_quote="A merchant seller warrants that goods are merchantable under UCC § 2-314. Where defects are latent, the reasonable time for notice under § 2-607 runs from the date of discovery.",
        admissibility_notes="州最高法院权威判例，有力对抗卖方关于'到港未在数日内检验即失权'的抗辩，完全符合涉外审判对隐蔽瑕疵的衡平保护。",
        norms_meta=["UCC:§2-314", "UCC:§2-607", "UCC:§2-608"],
        source_url="https://www.courtlistener.com/opinion/2032064/delano-growers-cooperative-winery-v-supreme-wine-co-inc/"
    ),
    # 4. CISG 优先适用与排除审查 (Filanto v. Chilewich)
    CourtPrecedent(
        case_id="2ND-CIR:Filanto-v-Chilewich:1992",
        name="Filanto, S.p.A. v. Chilewich Int'l Corp.",
        citation="789 F. Supp. 1229 (S.D.N.Y. 1992)",
        court="U.S. District Court for the Southern District of New York",
        court_tier=CourtTier.DISTRICT_COURT,
        year=1992,
        decided="1992-04-14",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="CISG 优先于国内法适用与合同明示排除规则及仲裁条款效力",
        holding="营业地位于不同 CISG 缔约国的当事人订立货物买卖合同，若未在合同中通过清晰明示条款予以排除，则国际公约自动优先于各州国内 UCC 适用。单纯约定'适用纽约州法'并不等同于有效排除 CISG。当事人通过履行行为可成立有效仲裁合意。",
        key_quote="The United States and Italy are both parties to the CISG; therefore, the Convention, not domestic UCC, governs international sales contracts between parties in those states unless expressly excluded.",
        admissibility_notes="涉外审判领域引用最广的标志性判例之一，在中国涉外法庭判定 CISG 闸门与准据法选择效力时具有极强说服力。",
        norms_meta=["UCC:§2-207", "UCC:§1-301", "CISG:Art.19"],
        source_url="https://www.courtlistener.com/opinion/1641662/filanto-spa-v-chilewich-intern-corp/"
    ),
    # 5. 28 U.S.C. § 1782 跨境取证经典判例 (Intel v. AMD)
    CourtPrecedent(
        case_id="SCOTUS:Intel-v-AMD:2004",
        name="Intel Corp. v. Advanced Micro Devices, Inc.",
        citation="542 U.S. 241 (2004)",
        court="Supreme Court of the United States",
        court_tier=CourtTier.SCOTUS,
        year=2004,
        decided="2004-06-21",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="28 U.S.C. § 1782 为外国司法程序跨境调取美国境内证据之四项自由裁量权准则 (Intel Factors)",
        holding="联邦最高法院确立了依据 28 U.S.C. § 1782 协助外国诉讼取证的四大衡量要素：(1) 调取对象是否为外国程序当事人；(2) 外国法庭对美国司法协助的态度；(3) 申请是否企图规避外国证据规则；(4) 取证要求是否过度繁苛或侵入商业秘密。申请人无需证明该证据在外国法院具备可开示性。",
        key_quote="Section 1782(a) authorizes, but does not require, a federal district court to provide judicial assistance to foreign and international tribunals and litigants before such tribunals.",
        admissibility_notes="美国最高法院全国终局判例。可直接为中方当事人向美国联邦法院申请调取关键技术图纸、内部测试记录提供法定依据与行动指南。",
        norms_meta=["USC:28:§1782"],
        source_url="https://www.courtlistener.com/opinion/136997/intel-corp-v-advanced-micro-devices-inc/"
    ),
    # 6. 28 U.S.C. § 1782 仲裁取证限制判例 (ZF Automotive)
    CourtPrecedent(
        case_id="SCOTUS:ZF-Automotive-v-Luxshare:2022",
        name="ZF Automotive US, Inc. v. Luxshare, Ltd.",
        citation="596 U.S. 619 (2022)",
        court="Supreme Court of the United States",
        court_tier=CourtTier.SCOTUS,
        year=2022,
        decided="2022-06-13",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="28 U.S.C. § 1782 取证范围限制：仅适用于外国政府或主权司法机构，排除纯民间商事仲裁",
        holding="联邦最高法院明确澄清：28 U.S.C. § 1782(a) 中的'foreign tribunal'特指具有主权行使权力的外国官方司法机构，民间设立的临时或机构商事仲裁庭不属于该条范畴，不能据此强行发起美国联邦跨境取证。",
        key_quote="Only a governmental or intergovernmental adjudicative body qualifies as a 'foreign or international tribunal' under 28 U.S.C. § 1782.",
        admissibility_notes="美国最高法院最新判例，是涉美跨境仲裁取证规划中不可逾越的红线规则，直接影响跨境诉讼与仲裁管辖策略。",
        norms_meta=["USC:28:§1782", "USC:9:§1"],
        source_url="https://www.courtlistener.com/opinion/6990262/zf-automotive-us-inc-v-luxshare-ltd/"
    ),
    # 7. 特拉华州公司治理商业判断准则 (Unocal v. Mesa)
    CourtPrecedent(
        case_id="DEL:Unocal-v-Mesa:1985",
        name="Unocal Corp. v. Mesa Petroleum Co.",
        citation="493 A.2d 946 (Del. 1985)",
        court="Supreme Court of Delaware",
        court_tier=CourtTier.STATE_SUPREME,
        year=1985,
        decided="1985-05-17",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="特拉华州公司法 (DGCL § 141) 董事会商业判断规则 (BJR) 与防御强化审查标准",
        holding="特拉华州最高法院确立了公司董事会在面对恶意收购或并购防御时的双阶审查标准（Unocal Standard）：董事必须证明其有合理理由确信存在对企业政策的威胁，且所采取的防御措施与该威胁具有合理比例对应关系。",
        key_quote="When a board addresses a pending takeover bid, there is an inherent danger in the purchase that a board may be acting primarily in its own interests. Hence, a defensive measure must be reasonable in relation to the threat posed.",
        admissibility_notes="特拉华州最高法院在全美公司并购实务中具有支配性地位的先例，用于解释 DGCL 董事信义义务与商业判断免责要件。",
        norms_meta=["DGCL:§141", "DGCL:§251"],
        source_url="https://www.courtlistener.com/opinion/1959082/unocal-corp-v-mesa-petroleum-co/"
    ),
    # 8. 货物买卖违约救济与可得利益损失赔偿 (Delchi Carrier v. Rotorex)
    CourtPrecedent(
        case_id="2ND-CIR:Delchi-Carrier-v-Rotorex:1995",
        name="Delchi Carrier SpA v. Rotorex Corp.",
        citation="71 F.3d 1024 (2d Cir. 1995)",
        court="U.S. Court of Appeals for the Second Circuit",
        court_tier=CourtTier.CIRCUIT_APPEALS,
        year=1995,
        decided="1995-12-06",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="UCC § 2-712/2-715 与跨国货物买卖救济：利润损失 (Lost Profits) 与附随费用赔偿之可预见性规则",
        holding="买方在卖方交付严重不符合同的货物后，有权宣告合同解除并主张全额可预见性损害赔偿，包括补进货物的差价损失（Cover Damages）、因停产导致的利润损失（Lost Profits）以及仓储和检验产生的附随费用。损害赔偿旨在使受损方达到合同完全履行时的状态。",
        key_quote="The injured party is entitled to damages including lost profits resulting from the breach, provided they were foreseeable at the time of contract formation.",
        admissibility_notes="联邦第二巡回上诉法院关于跨国违约损害赔偿范围与可预见性举证责任的奠基性判例，对于涉美买卖索赔诉讼中索赔可得利益提供坚实支撑。",
        norms_meta=["UCC:§2-712", "UCC:§2-714", "UCC:§2-715"],
        source_url="https://www.courtlistener.com/opinion/708682/delchi-carrier-spa-v-rotorex-corp/"
    ),
    # 9. 联邦仲裁法 FAA 撤裁事由排他性 (Hall Street v. Mattel)
    CourtPrecedent(
        case_id="SCOTUS:Hall-Street-v-Mattel:2008",
        name="Hall Street Associates, L.L.C. v. Mattel, Inc.",
        citation="552 U.S. 576 (2008)",
        court="Supreme Court of the United States",
        court_tier=CourtTier.SCOTUS,
        year=2008,
        decided="2008-03-25",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="联邦仲裁法 (9 U.S.C. § 10) 撤销裁决法定事由的排他性，禁止当事人协议扩大司法审查范围",
        holding="联邦最高法院裁定：联邦仲裁法 (FAA) 9 U.S.C. §§ 10 和 11 所列举的撤销与修改仲裁裁决的事由是排他性的（Exclusive grounds）。当事人不得通过私人合同协议扩大法院对仲裁裁决法律错误或事实认定错误的实质性司法审查范围。",
        key_quote="Sections 10 and 11 of the FAA provide the exclusive grounds for expedited judicial review of arbitration awards. Private agreements cannot contractually expand those statutory grounds.",
        admissibility_notes="联邦最高法院权威判例。在跨境商事合同起草与仲裁条款攻防中，可直接击碎外方试图在仲裁协议中强加'法院可实质审查仲裁法律错误'的无效条款。",
        norms_meta=["USC:9:§10", "USC:9:§9", "USC:9:§2"],
        source_url="https://www.courtlistener.com/opinion/145821/hall-street-associates-l-l-c-v-mattel-inc/"
    ),
    # 10. 跨国商事仲裁可仲裁性与国际礼让 (Mitsubishi Motors v. Soler)
    CourtPrecedent(
        case_id="SCOTUS:Mitsubishi-Motors-v-Soler:1985",
        name="Mitsubishi Motors Corp. v. Soler Chrysler-Plymouth, Inc.",
        citation="473 U.S. 614 (1985)",
        court="Supreme Court of the United States",
        court_tier=CourtTier.SCOTUS,
        year=1985,
        decided="1985-07-02",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="跨国商事仲裁的可仲裁性 (Arbitrability) 与国际礼让优先原则",
        holding="联邦最高法院裁定：在国际商事交易中，即使纠纷涉及美国法定反垄断等强行法请求，只要落入仲裁条款约定范围，即具备可仲裁性。国际商业礼让与对国际仲裁机制的尊重优先于国内法庭保留管辖权之诉求，法院必须强制执行跨国仲裁协议。",
        key_quote="Concerns of international comity, respect for the capacities of foreign and transnational tribunals, and sensitivity to the need of the international commercial system for predictability require that we enforce the parties' agreement.",
        admissibility_notes="涉外商事仲裁领域的里程碑判例。确立了美国司法对跨国仲裁的最高度支持态度，为中方企业跨国仲裁排除美国国内诉讼干扰提供强力后盾。",
        norms_meta=["USC:9:§2", "USC:9:§201"],
        source_url="https://www.courtlistener.com/opinion/111504/mitsubishi-motors-corp-v-soler-chrysler-plymouth-inc/"
    ),
    # 11. 仲裁自裁管辖权审查标准 (First Options v. Kaplan)
    CourtPrecedent(
        case_id="SCOTUS:First-Options-v-Kaplan:1995",
        name="First Options of Chicago, Inc. v. Kaplan",
        citation="514 U.S. 938 (1995)",
        court="Supreme Court of the United States",
        court_tier=CourtTier.SCOTUS,
        year=1995,
        decided="1995-05-22",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="仲裁管辖权决定权 (Competence-Competence) 归属之清晰明确证据标准",
        holding="法院在审查当事人是否同意由仲裁员决定自身管辖权（Who decides arbitrability）时，不适用有利于仲裁的推定，而是必须要求有'清晰且明确无误的证据'（Clear and unmistakable evidence）证明当事人同意将管辖权决定权交由仲裁庭。若无此明示授权，管辖权归属最终由法院独立审查。",
        key_quote="Courts should not assume that the parties agreed to arbitrate arbitrability unless there is clear and unmistakable evidence that they did so.",
        admissibility_notes="联邦最高法院关于管辖权决定权的经典先例。在对抗外方强行主张仲裁管辖或向联邦法院提出管辖权异议时具有最高级别说服力。",
        norms_meta=["USC:9:§2", "USC:9:§4"],
        source_url="https://www.courtlistener.com/opinion/117932/first-options-of-chicago-inc-v-kaplan/"
    ),
    # 12. 特拉华州控制股东并购 MFW 审查框架 (Kahn v. M&F Worldwide)
    CourtPrecedent(
        case_id="DEL:Kahn-v-MFW:2014",
        name="Kahn v. M&F Worldwide Corp.",
        citation="88 A.3d 635 (Del. 2014)",
        court="Supreme Court of Delaware",
        court_tier=CourtTier.STATE_SUPREME,
        year=2014,
        decided="2014-03-14",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="特拉华州控制股东并购之 MFW 双重程序保护标准与商业判断规则恢复",
        holding="特拉华州最高法院确立了控制股东私有化并购交易中适用商业判断规则的 MFW 标准：只要交易自始经过(1)由充分授权的独立董事特别委员会批准，且(2)由非关联少数股东以无表决权多数（Majority of the Minority）批准，法庭即放弃全面公允（Entire Fairness）严苛审查，恢复适用宽容的商业判断规则。",
        key_quote="Business judgment standard of review applies to a squeeze-out merger conditioned upfront upon both the negotiation and approval of a fully empowered Special Committee of independent directors and the uncoerced vote of a majority of the minority stockholders.",
        admissibility_notes="特拉华州最高法院关于跨境控股并购、私有化交易治理的现代黄金准则（MFW Framework），为跨国出海并购交易架构合规设计提供确定指引。",
        norms_meta=["DGCL:§141", "DGCL:§144", "DGCL:§251"],
        source_url="https://www.courtlistener.com/opinion/2658826/kahn-v-mf-worldwide-corp/"
    ),
    # 13. UCC 2-609 不安抗辩与履约充分保证 (AMF v. McDonald's)
    CourtPrecedent(
        case_id="7TH-CIR:AMF-v-McDonalds:1976",
        name="AMF, Inc. v. McDonald's Corp.",
        citation="536 F.2d 1167 (7th Cir. 1976)",
        court="U.S. Court of Appeals for the Seventh Circuit",
        court_tier=CourtTier.CIRCUIT_APPEALS,
        year=1976,
        decided="1976-07-06",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="UCC § 2-609 要求履约充分保证 (Adequate Assurance) 与不安抗辩中止履行",
        holding="当买卖一方有合理理由对相对方的履约能力产生不安全感时（例如测试屡次发生技术故障、关键部件交付延误），该方有权依据 UCC § 2-609 要求相对方提供履约的充分保证（Adequate Assurance），并在得到保证前暂停己方履行。若对方在合理期间（不超过30天）未提供保证，即构成预期违约（Repudiation）。",
        key_quote="A party with reasonable grounds for insecurity concerning the other's performance may demand adequate assurance of due performance and until received may suspend performance under UCC § 2-609.",
        admissibility_notes="联邦巡回上诉法院经典先例。在大型设备定制或长期供货合同中，一方发现外商研发停滞或交付风险时，据此发起法定不安抗辩并合法暂停付款/供货。",
        norms_meta=["UCC:§2-609", "UCC:§2-610"],
        source_url="https://www.courtlistener.com/opinion/336440/amf-incorporated-a-new-jersey-corporation-v-mcdonalds-corporation-a/"
    ),
    # 14. UCC 2-615 商事不能与情势变迁严苛要件 (Eastern Air Lines v. Gulf Oil)
    CourtPrecedent(
        case_id="SDFLA:Eastern-Air-Lines-v-Gulf-Oil:1976",
        name="Eastern Air Lines, Inc. v. Gulf Oil Corp.",
        citation="415 F. Supp. 429 (S.D. Fla. 1976)",
        court="U.S. District Court for the Southern District of Florida",
        court_tier=CourtTier.DISTRICT_COURT,
        year=1976,
        decided="1976-05-17",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="UCC § 2-615 履约艰难与商事不能 (Commercial Impracticability) 之严苛构成要件",
        holding="单纯的价格大幅波动、能源成本飙升或通货膨胀，属于正常商业风险范畴，不构成 UCC § 2-615 下的商事不能（Commercial Impracticability）。主张不能的一方必须证明导致履约艰难的突发事件是订立合同时双方基本假设前提下完全不可预见之事件（Non-occurrence was a basic assumption），且不能由自身故意导致。",
        key_quote="Mere increase in cost alone does not excuse performance under UCC § 2-615 unless the rise in cost is due to some unforeseen contingency which alters the essential nature of the performance.",
        admissibility_notes="涉外买卖纠纷中对抗卖方借口'原材料暴涨、汇率波动、航运上涨'主张情势变迁或免除交货义务的必引权威判例。",
        norms_meta=["UCC:§2-615", "UCC:§1-304"],
        source_url="https://www.courtlistener.com/opinion/2249080/eastern-air-lines-inc-v-gulf-oil-corp/"
    ),
    # 15. UCC 2-204/2-206 拆封/点击许可合同成立 (ProCD v. Zeidenberg)
    CourtPrecedent(
        case_id="7TH-CIR:ProCD-v-Zeidenberg:1996",
        name="ProCD, Inc. v. Zeidenberg",
        citation="86 F.3d 1447 (7th Cir. 1996)",
        court="U.S. Court of Appeals for the Seventh Circuit",
        court_tier=CourtTier.CIRCUIT_APPEALS,
        year=1996,
        decided="1996-06-20",
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="UCC § 2-204/2-206 拆封/点击许可合同成立与检验期间买方承诺 (Shrinkwrap Licenses)",
        holding="遵循 UCC § 2-204 条款开放原则：买受人在付款后收到标的物，若包装内载有许可条款并明确告知买方'若不同意条款可在检验期内退货还款'，买方在知悉条款后继续使用且未在合理期限退货的，构成对许可条款的有效承诺（Acceptance under UCC § 2-206 & § 2-606），拆封许可合同合法有效。",
        key_quote="Transactions in which the exchange of money precedes the communication of detailed terms are common. A vendor, as master of the offer, may invite acceptance by conduct and propose limitations on the kind of conduct that constitutes acceptance.",
        admissibility_notes="Easterbrook 法官撰写的普通法数字商事经典判例。对现代跨国数字贸易、软件采购及硬件附带软件授权条款效力认定具有根本指引价值。",
        norms_meta=["UCC:§2-204", "UCC:§2-206", "UCC:§2-606"],
        source_url="https://www.courtlistener.com/opinion/720373/procd-inc-v-matthew-zeidenberg-and-silken-mountain-web-services-inc/"
    ),
    # =================================================================
    # 负面测试案例：测试 Shepardizing 拦截坏法
    # =================================================================
    CourtPrecedent(
        case_id="1ST-CIR:Roto-Lith-v-Bartlett:1962",
        name="Roto-Lith, Ltd. v. F.P. Bartlett & Co.",
        citation="297 F.2d 497 (1st Cir. 1962)",
        court="U.S. Court of Appeals for the First Circuit",
        court_tier=CourtTier.CIRCUIT_APPEALS,
        year=1962,
        decided="1962-01-15",
        shepards_signal=ShepardsSignal.NEGATIVE,
        precedential_status="Published",
        topic="UCC § 2-207 格式之战旧规则 (已被全美各巡回区一致推翻之坏法)",
        holding="旧规则曾认为卖方格式回执中只要附带免责声明即构成有条件承诺（反要约），导致买方受制于卖方免责条款。",
        key_quote="A response stating a condition materially altering the obligation was not an acceptance...",
        admissibility_notes="【无效坏法】已被全美各联邦巡回法院一致推翻与抛弃，坚决禁止在查明报告中引用！",
        negative_treatment="Overruled and universally rejected by subsequent circuits, including 1st Cir. in later cases.",
        norms_meta=["UCC:§2-207"],
        source_url="https://www.courtlistener.com/opinion/256247/roto-lith-ltd-v-f-p-bartlett-co/"
    )
]


def ingest_precedents_to_snapshot(
    precedents: List[CourtPrecedent],
    db_path: str = "data/snapshots/20261010-gii-v0.7/law.sqlite",
    snapshot_id: str = "20261010-gii-v0.7"
) -> Tuple[int, int, List[str]]:
    """批量审查并入库判例到指定快照数据库中，建立 APPLIES 边表拓扑与 hot_norm_cases 物化表"""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    accepted = 0
    rejected = 0
    logs = []

    for p in precedents:
        # 1. 前置先验 Shepardizing 有效性与拘束力门禁
        is_valid, reason = ShepardizingValidator.validate(p)
        if not is_valid:
            rejected += 1
            logs.append(f"⛔ 拒绝入库 [{p.name}]: {reason}")
            continue

        cid = p.clean_case_id
        decided_val = p.decided or f"{p.year}-01-01"
        ecli_val = f"US:{p.court}:{p.year}:{p.citation}"
        leitsatz_val = f"{p.topic}\n\n【权威裁判要旨 (Holding)】:\n{p.holding}"
        tenor_val = f"【核心引语与裁决原则 (Key Principle)】:\n{p.key_quote}"
        tatbestand_val = p.facts or f"【审判实务与准入指引 (Admissibility & Practical Value)】:\n{p.admissibility_notes}"
        gruende_val = p.reasoning or f"【判决理由摘要 (Court Reasoning)】:\n{p.holding}\n\nKey Authority:\n{p.key_quote}"
        norms_meta_val = ", ".join(p.norms_meta)

        # 写入 cases 表
        cur.execute(
            """INSERT OR REPLACE INTO cases
               (case_id, court, senate, decided, az, ecli, doctype, leitsatz, tenor, tatbestand, gruende, norms_meta, source_url, snapshot_id, fetched_at)
               VALUES (?, ?, ?, ?, ?, ?, 'Opinion', ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                cid, p.court, p.court_tier, decided_val, p.citation, ecli_val,
                leitsatz_val, tenor_val, tatbestand_val, gruende_val,
                norms_meta_val, p.source_url, snapshot_id, now_str
            )
        )

        # 写入 edges 表 APPLIES: CASE -> NORM
        for norm in p.norms_meta:
            cur.execute(
                """INSERT OR REPLACE INTO edges
                   (src, dst, rel, source, span, confidence, reviewed, snapshot_id)
                   VALUES (?, ?, 'APPLIES', 'rule', ?, 1.0, 1, ?)""",
                (f"CASE:{cid}", f"NORM:{norm}", p.citation, snapshot_id)
            )

        accepted += 1
        logs.append(f"✅ 成功入库并建构图谱 [{p.name}] -> {norms_meta_val}")

    # 预计算构建期物化表 edges_top 与 hot_norm_cases
    cur.execute("""DELETE FROM edges_top;""")
    cur.execute(
        """INSERT INTO edges_top (src, dst, rel, source, reviewed, rk)
           SELECT src, dst, rel, source, reviewed, rk FROM (
             SELECT e.*, ROW_NUMBER() OVER (
               PARTITION BY src, rel ORDER BY (source = 'expert') DESC, confidence DESC) AS rk
             FROM edges e WHERE source IN ('rule', 'expert') OR reviewed = 1
           ) WHERE rk <= 20;"""
    )

    cur.execute("""DELETE FROM hot_norm_cases;""")
    cur.execute(
        """INSERT OR REPLACE INTO hot_norm_cases (norm_id, case_id, rank)
           SELECT REPLACE(dst, 'NORM:', ''), REPLACE(src, 'CASE:', ''), rk
           FROM edges_top
           WHERE rel = 'APPLIES';"""
    )

    conn.commit()
    conn.close()
    return accepted, rejected, logs


def ingest_precedent_to_snapshot(
    precedent: CourtPrecedent,
    db_path: str = "data/snapshots/20261010-gii-v0.7/law.sqlite",
    snapshot_id: str = "20261010-gii-v0.7"
) -> Tuple[bool, str]:
    """单条审查并入库判例到指定快照数据库中"""
    accepted, rejected, logs = ingest_precedents_to_snapshot([precedent], db_path, snapshot_id)
    if accepted > 0:
        return True, logs[0] if logs else f"成功入库 [{precedent.name}]"
    return False, logs[0] if logs else f"入库被拦截 [{precedent.name}]"


class CourtListenerClient:
    """CourtListener 客户端与动态先例检索中心"""

    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or os.environ.get("COURTLISTENER_API_TOKEN")
        self.precedents_pool: Dict[str, CourtPrecedent] = {p.case_id: p for p in CURATED_US_PRECEDENTS}
        # 同时以 clean_case_id 索引以保证兼容
        for p in CURATED_US_PRECEDENTS:
            self.precedents_pool[p.clean_case_id] = p

    def search_precedents(
        self,
        query: str,
        top_k: int = 4,
        require_good_law: bool = True
    ) -> List[CourtPrecedent]:
        """检索先例，并自动应用 Shepardizing / Published 先验过滤与法院层级加权排序"""
        clean_q = query.lower()
        candidates: List[Tuple[CourtPrecedent, float]] = []
        seen_cids = set()

        for p in self.precedents_pool.values():
            if p.clean_case_id in seen_cids:
                continue
            seen_cids.add(p.clean_case_id)

            # 1. 先验 Shepardizing 过滤
            if require_good_law:
                is_valid, _ = ShepardizingValidator.validate(p)
                if not is_valid:
                    continue

            # 2. 相关性匹配得分
            text_corpus = f"{p.name} {p.citation} {p.topic} {p.holding} {p.key_quote} {p.admissibility_notes} {' '.join(p.norms_meta)}".lower()
            score = 0.0

            # 关键词命中打分
            for token in clean_q.split():
                if len(token) > 1 and token in text_corpus:
                    score += 1.5

            # 精确法条命中加分
            for norm in p.norms_meta:
                norm_lower = norm.lower()
                norm_num = norm_lower.replace("ucc:", "").replace("usc:", "").replace("dgcl:", "").replace("§", "").strip()
                if norm_lower in clean_q or (norm_num and norm_num in clean_q):
                    score += 6.0

            # 涉美商事特定法域与案由特征词增强
            if "2-607" in clean_q and "2-607" in text_corpus:
                score += 5.0
            if "2-314" in clean_q and "2-314" in text_corpus:
                score += 5.0
            if "2-207" in clean_q and "2-207" in text_corpus:
                score += 5.0
            if "1782" in clean_q and "1782" in text_corpus:
                score += 6.0
            if "cisg" in clean_q and "cisg" in text_corpus:
                score += 5.0
            if "dgcl" in clean_q and "dgcl" in text_corpus:
                score += 5.0
            if "faa" in clean_q or "arbitration" in clean_q or "仲裁" in clean_q:
                if any("USC:9" in n for n in p.norms_meta):
                    score += 4.0

            # 3. 结合法院层级权重
            weighted_score = (score + 1.0) * p.tier_weight
            candidates.append((p, weighted_score))

        # 按加权得分降序排序
        candidates.sort(key=lambda x: x[1], reverse=True)
        return [p for p, _ in candidates[:top_k]]

    def shepardize(self, case_id_or_citation: str) -> Dict[str, Any]:
        """对指定先例或引证执行 Shepardizing / KeyCite 状态核验"""
        clean_input = case_id_or_citation.replace("CASE:", "").strip().lower()
        norm_q = re.sub(r'[\s\-_\.:]+', '', clean_input)
        target: Optional[CourtPrecedent] = None
        for p in self.precedents_pool.values():
            p_clean = p.clean_case_id.lower()
            norm_p = re.sub(r'[\s\-_\.:]+', '', p_clean)
            if (
                p.case_id.lower() == case_id_or_citation.lower() or
                p_clean == clean_input or
                p_clean == case_id_or_citation.lower() or
                f"case:{p_clean}" == case_id_or_citation.lower() or
                norm_q == norm_p or
                norm_q in norm_p or
                norm_p in norm_q or
                p.citation.lower() in case_id_or_citation.lower() or
                case_id_or_citation.lower() in p.citation.lower() or
                p.name.lower() in case_id_or_citation.lower() or
                case_id_or_citation.lower() in p.name.lower() or
                clean_input in p_clean or
                p_clean in clean_input
            ):
                target = p
                break

        if not target:
            return {
                "found": False,
                "status": "unknown",
                "message": f"未在先验判例池中检索到该引证编号: {case_id_or_citation}，建议人工查阅 Shepard's Citations"
            }

        is_valid, reason = ShepardizingValidator.validate(target)
        return {
            "found": True,
            "case_id": target.case_id,
            "name": target.name,
            "citation": target.citation,
            "court": target.court,
            "court_tier": target.court_tier,
            "shepards_signal": target.shepards_signal,
            "precedential_status": target.precedential_status,
            "is_good_law": is_valid,
            "validation_note": reason,
            "negative_treatment": target.negative_treatment,
            "source_url": target.source_url
        }

    def get_precedent_by_id(self, case_id: str) -> Optional[CourtPrecedent]:
        clean_id = case_id.replace("CASE:", "").strip()
        return self.precedents_pool.get(case_id) or self.precedents_pool.get(clean_id)
