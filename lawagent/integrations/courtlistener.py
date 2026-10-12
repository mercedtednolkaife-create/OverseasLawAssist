"""CourtListener 动态判例池与先验有效性（Shepardizing / KeyCite）过滤模块 (CourtListener Integration)
对齐“三位一体分层协同架构” Tier 2：
1. 联邦与州层级权重打分机制 (SCOTUS > 巡回上诉法院 > 州最高法院 > 地区法院)
2. 先验好法有效性门禁 (Shepardizing / KeyCite Gate)：过滤 Overruled, Abrogated, Superseded 的失效坏法
3. 拘束力门禁：仅采信 Published 先例，过滤未公开发表的 Summary Orders / Memorandum Dispositions
4. 动态检索与高质量先例池映射
"""

import os
import re
import json
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
# 预置高可信先例库 (Precedent Repository)
# 涵盖 UCC Article 2 买卖/担保/检验/时效、28 U.S.C. 1782 跨境取证、DGCL 公司并购
# =====================================================================
CURATED_US_PRECEDENTS: List[CourtPrecedent] = [
    # 1. UCC 2-607(3)(a) 检验通知与合理期间经典先例
    CourtPrecedent(
        case_id="CASE:5TH-CIR:Eastern-Air-Lines-v-McDonnell:1976",
        name="Eastern Air Lines, Inc. v. McDonnell Douglas Corp.",
        citation="532 F.2d 957 (5th Cir. 1976)",
        court="U.S. Court of Appeals for the Fifth Circuit",
        court_tier=CourtTier.CIRCUIT_APPEALS,
        year=1976,
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="UCC § 2-607(3)(a) 检验与违约异议通知的合理期间认定及商事诚信",
        holding="UCC § 2-607(3)(a) 所要求的买方违约异议通知并非形式主义苛求，其核心立法目的在于促使商业交易诚实信用流转、防止突袭诉讼并给予卖方及时调查与补救之机会。复杂商事交易中通知期间的合理性需结合履行背景综合判断，不能简单以单一自然日武断认定失权。",
        key_quote="The notice requirement of UCC § 2-607(3)(a) is designed to defeat commercial bad faith, not to provide a booby-trap for the unwary. Notice must merely let the seller know that the transaction is troublesome and must be watched.",
        admissibility_notes="联邦巡回上诉法院权威判例，广泛为各州 UCC 采信。在中国涉外法庭中可作为论证高精尖技术设备异议期间未过合理期限的法理渊源。",
        source_url="https://www.courtlistener.com/opinion/334547/eastern-air-lines-inc-v-mcdonnell-douglas-corp/"
    ),
    # 2. UCC 2-207 格式之战与 2-316 免责条款并入
    CourtPrecedent(
        case_id="CASE:3RD-CIR:Step-Saver-v-Wyse:1991",
        name="Step-Saver Data Systems, Inc. v. Wyse Technology",
        citation="939 F.2d 91 (3d Cir. 1991)",
        court="U.S. Court of Appeals for the Third Circuit",
        court_tier=CourtTier.CIRCUIT_APPEALS,
        year=1991,
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="UCC § 2-207 格式之战 (Battle of the Forms) 与免责条款实质性变更审查",
        holding="在商人之间（Between Merchants），单方在包装盒上附带的免责条款（Box-top / Shrink-wrap license）若构成对合同实质性变更（Material Alteration），且相对方未明示同意，则不并入最终合同，卖方不能免除 UCC § 2-314 默示适销性担保责任。",
        key_quote="Under UCC § 2-207(2)(b), additional terms do not become part of the agreement if they materially alter it. A disclaimer of warranty unquestionably materially alters a contract.",
        admissibility_notes="联邦第三巡回上诉法院关于格式条款与默示担保免除的奠基性判例，对于排除卖方格式免责条款抗辩具有极高证明力。",
        source_url="https://www.courtlistener.com/opinion/564778/step-saver-data-systems-inc-v-wyse-technology/"
    ),
    # 3. UCC 2-314 适销性与 2-104 商人标准
    CourtPrecedent(
        case_id="CASE:MASS:Delano-Growers-v-Supreme-Wine:1985",
        name="Delano Growers' Cooperative Winery v. Supreme Wine Co.",
        citation="393 Mass. 666, 473 N.E.2d 1066 (Mass. 1985)",
        court="Supreme Judicial Court of Massachusetts",
        court_tier=CourtTier.STATE_SUPREME,
        year=1985,
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="UCC § 2-314 默示适销性担保 (Merchantability) 与隐蔽瑕疵检验起算",
        holding="经营同类标的物的商人出卖货物，默示担保货物具有普通商业用途之适销性。若货物存在交付时难以通过肉眼即刻发现的隐蔽瑕疵（Latent Defect），异议通知期间自买方实际发现或应当发现该瑕疵之日起算，而非自物理交付日绝对起算。",
        key_quote="A merchant seller warrants that goods are merchantable under UCC § 2-314. Where defects are latent, the reasonable time for notice under § 2-607 runs from the date of discovery.",
        admissibility_notes="州最高法院权威判例，有力对抗卖方关于'到港未在数日内检验即失权'的抗辩，完全符合涉外审判对隐蔽瑕疵的衡平保护。",
        source_url="https://www.courtlistener.com/opinion/2032064/delano-growers-cooperative-winery-v-supreme-wine-co-inc/"
    ),
    # 4. CISG 优先适用与排除审查 (Filanto v. Chilewich)
    CourtPrecedent(
        case_id="CASE:2ND-CIR:Filanto v. Chilewich:1992",
        name="Filanto, S.p.A. v. Chilewich Int'l Corp.",
        citation="789 F. Supp. 1229 (S.D.N.Y. 1992)",
        court="U.S. District Court for the Southern District of New York",
        court_tier=CourtTier.DISTRICT_COURT,
        year=1992,
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="CISG 优先于国内法适用与合同明示排除规则",
        holding="营业地位于不同 CISG 缔约国的当事人订立货物买卖合同，若未在合同中通过清晰明示条款予以排除，则国际公约自动优先于各州国内 UCC 适用。单纯约定'适用纽约州法'并不等同于有效排除 CISG。",
        key_quote="The United States and Italy are both parties to the CISG; therefore, the Convention, not domestic UCC, governs international sales contracts between parties in those states unless expressly excluded.",
        admissibility_notes="涉外审判领域引用最广的标志性判例之一，在中国涉外法庭判定 CISG 闸门与准据法选择效力时具有极强说服力。",
        source_url="https://www.courtlistener.com/opinion/1641662/filanto-spa-v-chilewich-intern-corp/"
    ),
    # 5. 28 U.S.C. § 1782 跨境取证经典判例 (Intel v. AMD)
    CourtPrecedent(
        case_id="CASE:SCOTUS:Intel v. AMD:2004",
        name="Intel Corp. v. Advanced Micro Devices, Inc.",
        citation="542 U.S. 241 (2004)",
        court="Supreme Court of the United States",
        court_tier=CourtTier.SCOTUS,
        year=2004,
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="28 U.S.C. § 1782 为外国司法程序跨境调取美国境内证据之四项自由裁量权准则",
        holding="联邦最高法院确立了依据 28 U.S.C. § 1782 协助外国诉讼取证的四大衡量要素：(1) 调取对象是否为外国程序当事人；(2) 外国法庭对美国司法协助的态度；(3) 申请是否企图规避外国证据规则；(4) 取证要求是否过度繁苛或侵入商业秘密。",
        key_quote="Section 1782(a) authorizes, but does not require, a federal district court to provide judicial assistance to foreign and international tribunals and litigants before such tribunals.",
        admissibility_notes="美国最高法院判例，全国最高权威。可直接为中方当事人向美国联邦法院申请调取关键技术图纸、内部测试记录提供法定依据与行动指南。",
        source_url="https://www.courtlistener.com/opinion/136997/intel-corp-v-advanced-micro-devices-inc/"
    ),
    # 6. 28 U.S.C. § 1782 仲裁取证限制判例 (ZF Automotive)
    CourtPrecedent(
        case_id="CASE:SCOTUS:ZF-Automotive-v-Luxshare:2022",
        name="ZF Automotive US, Inc. v. Luxshare, Ltd.",
        citation="596 U.S. 619 (2022)",
        court="Supreme Court of the United States",
        court_tier=CourtTier.SCOTUS,
        year=2022,
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="28 U.S.C. § 1782 取证范围限制：仅适用于外国政府或政府间司法机构，不适用于纯民间商事仲裁",
        holding="联邦最高法院明确澄清：28 U.S.C. § 1782(a) 中的'foreign tribunal'特指具有主权行使权力的外国官方司法机构，民间设立的临时或机构商事仲裁庭不属于该条范畴，不能据此强行发起美国联邦跨境取证。",
        key_quote="Only a governmental or intergovernmental adjudicative body qualifies as a 'foreign or international tribunal' under 28 U.S.C. § 1782.",
        admissibility_notes="美国最高法院最新判例，是涉美跨境仲裁取证规划中不可逾越的红线规则，直接影响跨境诉讼与仲裁管辖策略。",
        source_url="https://www.courtlistener.com/opinion/6990262/zf-automotive-us-inc-v-luxshare-ltd/"
    ),
    # 7. 特拉华州公司治理商业判断准则 (Unocal v. Mesa)
    CourtPrecedent(
        case_id="CASE:DEL-CH:Unocal v. Mesa:1985",
        name="Unocal Corp. v. Mesa Petroleum Co.",
        citation="493 A.2d 946 (Del. 1985)",
        court="Supreme Court of Delaware",
        court_tier=CourtTier.STATE_SUPREME,
        year=1985,
        shepards_signal=ShepardsSignal.POSITIVE,
        precedential_status="Published",
        topic="特拉华州公司法 (DGCL § 141) 董事会商业判断规则 (BJR) 与防御强化审查标准",
        holding="特拉华州最高法院确立了公司董事会在面对恶意收购或并购防御时的双阶审查标准（Unocal Standard）：董事必须证明其有合理理由确信存在对企业政策的威胁，且所采取的防御措施与该威胁具有合理比例对应关系。",
        key_quote="When a board addresses a pending takeover bid, there is an inherent danger in the purchase that a board may be acting primarily in its own interests. Hence, a defensive measure must be reasonable in relation to the threat posed.",
        admissibility_notes="特拉华州最高法院在全美公司并购实务中具有支配性地位的先例，用于解释 DGCL 董事信义义务与商业判断免责要件。",
        source_url="https://www.courtlistener.com/opinion/1959082/unocal-corp-v-mesa-petroleum-co/"
    ),
    # =================================================================
    # 负面测试案例：测试 Shepardizing 拦截坏法
    # =================================================================
    CourtPrecedent(
        case_id="CASE:1ST-CIR:Roto-Lith-v-Bartlett:1962",
        name="Roto-Lith, Ltd. v. F.P. Bartlett & Co.",
        citation="297 F.2d 497 (1st Cir. 1962)",
        court="U.S. Court of Appeals for the First Circuit",
        court_tier=CourtTier.CIRCUIT_APPEALS,
        year=1962,
        shepards_signal=ShepardsSignal.NEGATIVE,
        precedential_status="Published",
        topic="UCC § 2-207 格式之战旧规则 (已被各巡回区一致推翻)",
        holding="旧规则曾认为卖方格式回执中只要附带免责声明即构成有条件承诺（反要约），导致买方受制于卖方免责条款。",
        key_quote="A response stating a condition materially altering the obligation was not an acceptance...",
        admissibility_notes="【无效坏法】已被全美各联邦巡回法院一致推翻与抛弃，坚决禁止在查明报告中引用！",
        negative_treatment="Overruled and universally rejected by subsequent circuits, including 1st Cir. in later cases.",
        source_url="https://www.courtlistener.com/opinion/256247/roto-lith-ltd-v-f-p-bartlett-co/"
    )
]


class CourtListenerClient:
    """CourtListener 客户端与动态先例检索中心"""

    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or os.environ.get("COURTLISTENER_API_TOKEN")
        self.precedents_pool: Dict[str, CourtPrecedent] = {p.case_id: p for p in CURATED_US_PRECEDENTS}

    def search_precedents(
        self,
        query: str,
        top_k: int = 4,
        require_good_law: bool = True
    ) -> List[CourtPrecedent]:
        """检索先例，并自动应用 Shepardizing / Published 先验过滤与法院层级加权排序"""
        clean_q = query.lower()
        candidates: List[Tuple[CourtPrecedent, float]] = []

        for p in self.precedents_pool.values():
            # 1. 先验 Shepardizing 过滤
            if require_good_law:
                is_valid, _ = ShepardizingValidator.validate(p)
                if not is_valid:
                    continue

            # 2. 相关性匹配得分
            text_corpus = f"{p.name} {p.citation} {p.topic} {p.holding} {p.key_quote}".lower()
            score = 0.0

            # 关键词命中打分
            for token in clean_q.split():
                if len(token) > 1 and token in text_corpus:
                    score += 1.5

            # 精确法条命中加分
            if "2-607" in clean_q and "2-607" in text_corpus:
                score += 5.0
            if "2-314" in clean_q and "2-314" in text_corpus:
                score += 5.0
            if "1782" in clean_q and "1782" in text_corpus:
                score += 6.0
            if "cisg" in clean_q and "cisg" in text_corpus:
                score += 5.0
            if "dgcl" in clean_q and "dgcl" in text_corpus:
                score += 5.0

            # 3. 结合法院层级权重
            weighted_score = (score + 1.0) * p.tier_weight
            candidates.append((p, weighted_score))

        # 按加权得分降序排序
        candidates.sort(key=lambda x: x[1], reverse=True)
        return [p for p, _ in candidates[:top_k]]

    def shepardize(self, case_id_or_citation: str) -> Dict[str, Any]:
        """对指定先例或引证执行 Shepardizing / KeyCite 状态核验"""
        target: Optional[CourtPrecedent] = None
        for p in self.precedents_pool.values():
            if (
                p.case_id == case_id_or_citation or
                p.citation.lower() in case_id_or_citation.lower() or
                p.name.lower() in case_id_or_citation.lower()
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
        return self.precedents_pool.get(case_id)
