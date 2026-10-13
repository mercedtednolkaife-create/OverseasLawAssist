"""涉美商事实务核心成文法精选扩充模块 (US Commercial Law Enrichment)
聚焦涉外买卖纠纷、跨国商事仲裁、出海企业并购与跨境司法取证四大核心高频场景：
1. UCC Article 1: 诚实信用、商业惯例与准据法选择 (5条)
2. UCC Article 2: 买卖合同成立、担保责任、风险转移、不安抗辩、救济与时效全链条 (36条)
3. 9 U.S.C. 联邦仲裁法 (FAA): 跨国商事仲裁协议、纽约公约落地、申请强制仲裁与撤裁法定事由 (8条)
4. DGCL 特拉华州公司法: 董事信义免责、重大资产出售、股东查账与并购 (7条)
5. 28 U.S.C. 联邦涉外诉讼程序法: 异籍管辖、境外证据开示协助与外国主权豁免 (5条)
"""

import os
import json
import sqlite3
from datetime import datetime

DB_PATH = "data/snapshots/20261010-gii-v0.7/law.sqlite"
SNAPSHOT_ID = "20261010-gii-v0.7"
NOW = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

US_NORMS = [
    # =========================================================================
    # 1. UCC Article 1: General Provisions (总则编基础原则与商业惯例)
    # =========================================================================
    (
        "UCC:§1-103",
        "UCC",
        "§ 1-103",
        "Construction of Uniform Commercial Code to Promote its Purposes; Supplementary Principles of Law (UCC目的解释与普通法/衡平法补充适用)",
        "Uniform Commercial Code > Article 1: General Provisions > Part 1: General Provisions",
        "(a) The Uniform Commercial Code must be liberally construed and applied to promote its underlying purposes and policies, which are: (1) to simplify, clarify, and modernize the law governing commercial transactions; (2) to permit the continued expansion of commercial practices through custom, usage, and agreement of the parties; and (3) to make uniform the law among the various jurisdictions.\n(b) Unless displaced by the particular provisions of the Uniform Commercial Code, the principles of law and equity, including the law merchant and the law relative to capacity to contract, principal and agent, estoppel, fraud, misrepresentation, duress, coercion, mistake, bankruptcy, and other validating or invalidating cause supplement its provisions.",
        json.dumps({"article": 1, "section": 103, "category": "general_principles"}),
        "《美国统一商法典》第1-103条【法典解释目的与普通法衡平法补充适用】：(a) UCC 须作扩张性解释以简化商事交易并促进统一法适用。(b) 除非被 UCC 明确条款所排除，普通法与衡平法原则（包括代理、禁反言、欺诈、胁迫、重大误解等）继续作为补充渊源适用。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/1/1-103",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§1-301",
        "UCC",
        "§ 1-301",
        "Territorial Applicability; Parties' Power to Choose Applicable Law (准据法选择意思自治与合理关联原则)",
        "Uniform Commercial Code > Article 1: General Provisions > Part 3: Territorial Applicability and General Rules",
        "(a) Except as otherwise provided in this section, when a transaction bears a reasonable relation to this state and also to another state or nation the parties may agree that the law either of this state or of such other state or nation shall govern their rights and duties.\n(b) In the absence of an agreement effective under subsection (a), and except as provided in subsection (c), the Uniform Commercial Code applies to transactions bearing an appropriate relation to this state.",
        json.dumps({"article": 1, "section": 301, "category": "choice_of_law"}),
        "《美国统一商法典》第1-301条【当事人选择准据法自由】：当交易与本州及另一州或国家均具有合理关联（reasonable relation）时，买卖双方可协议约定以本州或该外国之法律管辖其权利义务。若无选法协议，UCC 适用于与本州有适当联系的交易。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/1/1-301",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§1-302",
        "UCC",
        "§ 1-302",
        "Variation by Agreement (当事人意思自治变更法典规则之权限与底线)",
        "Uniform Commercial Code > Article 1: General Provisions > Part 3: Territorial Applicability and General Rules",
        "(a) Except as otherwise provided in subsection (b) or elsewhere in the Uniform Commercial Code, the effect of provisions of the Uniform Commercial Code may be varied by agreement.\n(b) The obligations of good faith, diligence, reasonableness, and care prescribed by the Uniform Commercial Code may not be disclaimed by agreement. The parties, by agreement, may determine the standards by which the performance of those obligations is to be measured if those standards are not manifestly unreasonable.",
        json.dumps({"article": 1, "section": 302, "category": "party_autonomy"}),
        "《美国统一商法典》第1-302条【合同特约变更法典效力】：(a) 除法典另有强行规定外，UCC 条文的法律效果可通过当事人约定予以变更。(b) 强行底线：当事人不得通过协议免除诚实信用（good faith）、勤勉、合理性及注意义务，但可约定具体的衡量标准（只要该标准非显属不合理）。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/1/1-302",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§1-303",
        "UCC",
        "§ 1-303",
        "Course of Performance, Course of Dealing, and Usage of Trade (履约过程、既往交易与商业惯例对合同之补充解释)",
        "Uniform Commercial Code > Article 1: General Provisions > Part 3: Territorial Applicability and General Rules",
        "(a) A 'course of performance' is a sequence of conduct between the parties to a particular transaction that exists if: (1) the agreement of the parties with respect to the transaction involves repeated occasions for performance by a party; and (2) the other party, with knowledge of the nature of the performance and opportunity for objection to it, accepts the performance or acquiesces in it without objection.\n(b) A 'course of dealing' is a sequence of conduct concerning previous transactions between the parties to a particular transaction that is fairly to be regarded as establishing a common basis of understanding for interpreting their expressions and other conduct.\n(c) A 'usage of trade' is any practice or method of dealing having such regularity of observance in a place, vocation, or trade as to justify an expectation that it will be observed with respect to the transaction in question.\n(d) A course of performance or course of dealing between the parties or usage of trade in the vocation or trade in which they are engaged or of which they are or should be aware is relevant in ascertaining the meaning of the parties' agreement, may give particular meaning to specific terms of the agreement, and may supplement or qualify the terms of the agreement.",
        json.dumps({"article": 1, "section": 303, "category": "contract_interpretation"}),
        "《美国统一商法典》第1-303条【履约过程、交易习惯与行业惯例】：(a) 履约过程系指连续履行中相对方知悉且未提出异议之受领行为；(b) 交易习惯系双方既往建立之共同认知基础；(c) 行业惯例系行业内普遍遵循之商业通常做法；(d) 上述三者直接用于探究当事人真实意思、赋予合同特定条款以含义并可补充或限制合同约定。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/1/1-303",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§1-304",
        "UCC",
        "§ 1-304",
        "Obligation of Good Faith (全流程诚实信用履行义务)",
        "Uniform Commercial Code > Article 1: General Provisions > Part 3: Territorial Applicability and General Rules",
        "Every contract or duty within the Uniform Commercial Code imposes an obligation of good faith in its performance and enforcement.",
        json.dumps({"article": 1, "section": 304, "category": "good_faith"}),
        "《美国统一商法典》第1-304条【诚实信用义务】：UCC 调整范围内的每一个合同或法定义务，在其履行和行使过程中均负有诚实信用（good faith，即事实上的诚实以及遵守合理商业公平交易标准）之强制性法律义务。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/1/1-304",
        SNAPSHOT_ID,
        NOW
    ),

    # =========================================================================
    # 2. UCC Article 2: Sales (买卖编全链条核心规范)
    # =========================================================================
    (
        "UCC:§2-103",
        "UCC",
        "§ 2-103",
        "Definitions and Index of Definitions (买方、卖方与收货核心术语定义)",
        "Uniform Commercial Code > Article 2: Sales > Part 1: Short Title, General Construction and Subject Matter",
        "(1) In this Article unless the context otherwise requires:\n(a) 'Buyer' means a person who buys or contracts to buy goods.\n(b) 'Good faith' in the case of a merchant means honesty in fact and the observance of reasonable commercial standards of fair dealing in the trade.\n(c) 'Receipt' of goods means taking physical possession of them.\n(d) 'Seller' means a person who sells or contracts to sell goods.",
        json.dumps({"article": 2, "section": 103, "category": "definitions"}),
        "《美国统一商法典》第2-103条【买方、卖方与收货定义】：(1) 买方系指购买或订约购买货物之人；对商人而言“诚实信用”包括事实上的诚实及遵守商业交易合理公平标准；“收货（Receipt）”系指取得对货物的实际占有。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-103",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-104",
        "UCC",
        "§ 2-104",
        "Definitions: 'Merchant'; 'Between Merchants'; 'Financing Agency' (商人及双方商行为特殊注意义务标准)",
        "Uniform Commercial Code > Article 2: Sales > Part 1: Short Title, General Construction and Subject Matter",
        "(1) 'Merchant' means a person who deals in goods of the kind or otherwise by his occupation holds himself out as having knowledge or skill peculiar to the practices or goods involved in the transaction or to whom such knowledge or skill may be attributed by his employment of an agent or broker or other intermediary who by his occupation holds himself out as having such knowledge or skill.\n(3) 'Between merchants' means in any transaction with respect to which both parties are chargeable with the knowledge or skill of merchants.",
        json.dumps({"article": 2, "section": 104, "category": "merchant_rules"}),
        "《美国统一商法典》第2-104条【商人与双方商行为】：(1)“商人”指从事同类商品交易，或因其职业表现出对事务所涉货物或惯例拥有专门知识或技能之人。(3)“双方商人之间（Between merchants）”系指交易中双方均具备商人资格，适用格式条款之战、口头通知抗辩及严格检验义务等更高商业注意标准。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-104",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-105",
        "UCC",
        "§ 2-105",
        "Definitions: Transferability; 'Goods' (买卖标的物有体动产界定与权利排除)",
        "Uniform Commercial Code > Article 2: Sales > Part 1: Short Title, General Construction and Subject Matter",
        "(1) 'Goods' means all things (including specially manufactured goods) which are movable at the time of identification to the contract for sale other than the money in which the price is to be paid, investment securities (Article 8) and things in action. 'Goods' also includes the unborn young of animals and growing crops and other identified things attached to realty as described in the section on goods to be severed from realty (Section 2-107).",
        json.dumps({"article": 2, "section": 105, "category": "goods_definition"}),
        "《美国统一商法典》第2-105条【买卖标的物定义】：货物系指在特定化于买卖合同时可移动的一切物品（包括定制专用设备），但不包括支付价金之货币、投资证券及权利索赔诉权（things in action）。定制工业设备属于典型的 UCC 货物范畴。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-105",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-201",
        "UCC",
        "§ 2-201",
        "Formal Requirements; Statute of Frauds (欺诈防止法：500美元以上书面形式要件与商人确认书例外)",
        "Uniform Commercial Code > Article 2: Sales > Part 2: Form, Formation and Readjustment of Contract",
        "(1) Except as otherwise provided in this section a contract for the sale of goods for the price of $500 or more is not enforceable by way of action or defense unless there is some writing sufficient to indicate that a contract for sale has been made between the parties and signed by the party against whom enforcement is sought or by his authorized agent or broker.\n(2) Between merchants if within a reasonable time a writing in confirmation of the contract and sufficient against the sender is received and the party receiving it has reason to know its contents, it satisfies the requirements of subsection (1) against such party unless written notice of objection to its contents is given within 10 days after it is received.\n(3) A contract which does not satisfy the requirements of subsection (1) but which is valid in other respects is enforceable: (a) if the goods are to be specially manufactured for the buyer and are not suitable for sale to others in the ordinary course of the seller's business...",
        json.dumps({"article": 2, "section": 201, "category": "statute_of_frauds"}),
        "《美国统一商法典》第2-201条【欺诈防止法/书面形式要件】：(1) 标的额 500 美元以上的货物买卖合同，必须有受诉方签署的书面凭证方可强制执行。(2) 商人例外：双方为商人时，一方发出书面确认函，对方知悉内容且在收到后 10 日内未书面异议的，视为满足书面形式要求。(3) 定制物例外：为买方定制且无法按常规转售他人的专用设备，即使无书面签署亦具备强制执行力。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-201",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-202",
        "UCC",
        "§ 2-202",
        "Final Written Expression: Parol or Extrinsic Evidence (口头证据排除规则与完整性条款 Merger Clause 效力)",
        "Uniform Commercial Code > Article 2: Sales > Part 2: Form, Formation and Readjustment of Contract",
        "Terms with respect to which the confirmatory memoranda of the parties agree or which are otherwise set forth in a writing intended by the parties as a final expression of their agreement with respect to such terms as are included therein may not be contradicted by evidence of any prior agreement or of a contemporaneous oral agreement but may be explained or supplemented:\n(a) by course of performance, course of dealing, or usage of trade (Section 1-303); and\n(b) by evidence of consistent additional terms unless the court finds the writing to have been intended also as a complete and exclusive statement of the terms of the agreement.",
        json.dumps({"article": 2, "section": 202, "category": "parol_evidence"}),
        "《美国统一商法典》第2-202条【口头证据排除规则】：书面合同作为当事人最终约定时，不得以先前的口头或书面协议或同时发生的口头陈述予以推翻矛盾；但可通过履约过程、商业惯例或一致性补充条款予以解释，除非法院认定该书面合同系对双方协议完整且排他的终局表述（即载有完全合并条款）。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-202",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-204",
        "UCC",
        "§ 2-204",
        "Formation in General (买卖合同成立通则与条款开放原则)",
        "Uniform Commercial Code > Article 2: Sales > Part 2: Form, Formation and Readjustment of Contract",
        "(1) A contract for sale of goods may be made in any manner sufficient to show agreement, including conduct by both parties which recognizes the existence of such a contract.\n(2) An agreement sufficient to constitute a contract for sale may be found even though the moment of its making is undetermined.\n(3) Even though one or more terms are left open a contract for sale does not fail for indefiniteness if the parties have intended to make a contract and there is a reasonably certain basis for giving an appropriate remedy.",
        json.dumps({"article": 2, "section": 204, "category": "formation"}),
        "《美国统一商法典》第2-204条【买卖合同成立通则】：(1) 货物买卖合同可以通过任何足以表明双方达成合意的方式订立，包括双方以确认合同存在的行为订立。(2) 即使合同成立的具体时间点无法确定，亦不妨碍买卖合同成立。(3) 条款开放原则：即使一项或多项条款未作约定（left open），只要双方具有订立合同之意图，且存在给予适当救济之合理确定依据，合同并不因条款未决而无效。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-204",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-205",
        "UCC",
        "§ 2-205",
        "Firm Offers (不可撤销之确定要约及其法定最长存续期)",
        "Uniform Commercial Code > Article 2: Sales > Part 2: Form, Formation and Readjustment of Contract",
        "An offer by a merchant to buy or sell goods in a signed writing which by its terms gives assurance that it will be held open is not revocable, for lack of consideration, during the time stated or if no time is stated for a reasonable time, but in no event may such period of irrevocability exceed three months; but any such term of assurance on a form supplied by the offeree must be separately signed by the offeror.",
        json.dumps({"article": 2, "section": 205, "category": "firm_offer"}),
        "《美国统一商法典》第2-205条【确定要约】：商人签署书面要约明确保留有效期的，即使相对方未支付对价（consideration），在约定期间或合理期间内亦不得单方撤销；但该不可撤销拘束期在任何情况下最长不得超过 3 个月。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-205",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-206",
        "UCC",
        "§ 2-206",
        "Offer and Acceptance in Formation of Contract (承诺方式与以发货作为承诺之违约推定)",
        "Uniform Commercial Code > Article 2: Sales > Part 2: Form, Formation and Readjustment of Contract",
        "(1) Unless otherwise unambiguously indicated by the language or circumstances:\n(a) an offer to make a contract shall be construed as inviting acceptance in any manner and by any medium reasonable in the circumstances;\n(b) an order or other offer to buy goods for prompt or current shipment shall be construed as inviting acceptance either by a prompt promise to ship or by the prompt or current shipment of conforming or non-conforming goods, but such a shipment of non-conforming goods does not constitute an acceptance if the seller seasonably notifies the buyer that the shipment is offered only as an accommodation to the buyer.",
        json.dumps({"article": 2, "section": 206, "category": "acceptance"}),
        "《美国统一商法典》第2-206条【要约与承诺规则】：(1) 订货要约既可以通过发货承诺予以接受，亦可通过立即发运符合合同之货物或瑕疵货物予以接受；但发运瑕疵货物同时构成违约，除非出卖人及时通知买方该瑕疵发货仅作为通融（accommodation）提供。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-206",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-209",
        "UCC",
        "§ 2-209",
        "Modification, Rescission and Waiver (买卖合同变更无需额外对价原则与弃权抗辩)",
        "Uniform Commercial Code > Article 2: Sales > Part 2: Form, Formation and Readjustment of Contract",
        "(1) An agreement modifying a contract within this Article needs no consideration to be binding.\n(2) A signed agreement which excludes modification or rescission except by a signed writing cannot be otherwise modified or rescinded, but except as between merchants such a requirement on a form supplied by the merchant must be separately signed by the other party.\n(3) The requirements of the statute of frauds section of this Article (Section 2-201) must be satisfied if the contract as modified is within its provisions.\n(4) Although an attempt at modification or rescission does not satisfy the requirements of subsection (2) or (3) it can operate as a waiver.",
        json.dumps({"article": 2, "section": 209, "category": "contract_modification"}),
        "《美国统一商法典》第2-209条【合同变更与对价豁免】：(1) 突破普通法传统：UCC 货物买卖合同的协议变更无需额外支付对价（no consideration needed）即具备法律约束力（但须符合诚实信用商事善意）。(2) 禁止非书面修改条款（NOM 条款）合法有效。(4) 不满足书面形式的变更行为在实务中可构成一方之权利放弃（waiver）。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-209",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-302",
        "UCC",
        "§ 2-302",
        "Unconscionable Contract or Clause (显失公平合同与霸王免责条款司法审查)",
        "Uniform Commercial Code > Article 2: Sales > Part 3: General Obligation and Construction of Contract",
        "(1) If the court as a matter of law finds the contract or any clause of the contract to have been unconscionable at the time it was made the court may refuse to enforce the contract, or it may enforce the remainder of the contract without the unconscionable clause, or it may so limit the application of any unconscionable clause as to avoid any unconscionable result.\n(2) When it is claimed or appears to the court that the contract or any clause thereof may be unconscionable the parties shall be afforded a reasonable opportunity to present evidence as to its commercial setting, purpose and effect to aid the court in making the determination.",
        json.dumps({"article": 2, "section": 302, "category": "unconscionability"}),
        "《美国统一商法典》第2-302条【显失公平条款司法审查】：(1) 法院若认定合同或任何条款在订立时显失公平（unconscionable），有权拒绝强制执行该合同、剔除该条款执行其余部分、或限制该条款之适用以避免显失公平结果。(2) 结合实体显失公平（价格悬殊、极端免责）与程序显失公平（地位不平等、突袭条款）综合判定。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-302",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-312",
        "UCC",
        "§ 2-312",
        "Warranty of Title and Against Infringement (标的物权利瑕疵担保与知识产权侵权担保)",
        "Uniform Commercial Code > Article 2: Sales > Part 3: General Obligation and Construction of Contract",
        "(1) Subject to subsection (2) there is in a contract for sale a warranty by the seller that: (a) the title conveyed shall be good, and its transfer rightful; and (b) the goods shall be delivered free from any security interest or other lien or encumbrance of which the buyer at the time of contracting has no knowledge.\n(3) Unless otherwise agreed a seller who is a merchant regularly dealing in goods of the kind warrants that the goods shall be delivered free of the rightful claim of any third person by way of infringement or the like...",
        json.dumps({"article": 2, "section": 312, "category": "warranty_title"}),
        "《美国统一商法典》第2-312条【所有权担保与知识产权不侵权担保】：(1) 出卖人担保其移转之所有权真实无瑕疵且转让行为合法，货物不存在订约时买方不知悉的抵押或留置权。(3) 专门经营同类货物的商人，必须法定担保交付之标的物不存在任何第三人主张之专利、商标或版权侵权请求权。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-312",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-313",
        "UCC",
        "§ 2-313",
        "Express Warranties by Affirmation, Promise, Description, Sample (明示质量保证、技术参数说明与样品一致性)",
        "Uniform Commercial Code > Article 2: Sales > Part 3: General Obligation and Construction of Contract",
        "(1) Express warranties by the seller are created as follows:\n(a) Any affirmation of fact or promise made by the seller to the buyer which relates to the goods and becomes part of the basis of the bargain creates an express warranty that the goods shall conform to the affirmation or promise.\n(b) Any description of the goods which is made part of the basis of the bargain creates an express warranty that the goods shall conform to the description.\n(c) Any sample or model which is made part of the basis of the bargain creates an express warranty that the whole of the goods shall conform to the sample or model.\n(2) It is not necessary to the creation of an express warranty that the seller use formal words such as 'warrant' or 'guarantee'...",
        json.dumps({"article": 2, "section": 313, "category": "express_warranty"}),
        "《美国统一商法典》第2-313条【明示质量担保】：(1) 出卖人向买受人做出的任何关于货物的事实确认、承诺、技术规格说明（如机床公差 0.02mm）或提交的样品，只要成为交易基础（basis of the bargain）的一部分，即构成出卖人的明示保证。(2) 成立明示担保无需出卖人使用“担保（warrant）”或“保证（guarantee）”等正式词汇。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-313",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-316",
        "UCC",
        "§ 2-316",
        "Exclusion or Modification of Warranties (免责条款效力审查与默示担保排除要件 As-is 规则)",
        "Uniform Commercial Code > Article 2: Sales > Part 3: General Obligation and Construction of Contract",
        "(2) Subject to subsection (3), to exclude or modify the implied warranty of merchantability or any part of it the language must mention merchantability and in case of a writing must be conspicuous, and to exclude or modify any implied warranty of fitness the exclusion must be by a writing and conspicuous. Language to exclude all implied warranties of fitness is sufficient if it states, for example, that 'There are no warranties which extend beyond the description on the face hereof.'\n(3) Notwithstanding subsection (2):\n(a) unless the circumstances indicate otherwise, all implied warranties are excluded by expressions like 'as is', 'with all faults' or other language which in common understanding calls the buyer's attention to the exclusion of warranties and makes plain that there is no implied warranty; and\n(b) when the buyer before entering into the contract has examined the goods or the sample or model as fully as he desired or has refused to examine the goods there is no implied warranty with regard to defects which an examination ought in the circumstances to have revealed to him...",
        json.dumps({"article": 2, "section": 316, "category": "warranty_disclaimer"}),
        "《美国统一商法典》第2-316条【担保免除与免责条款效力】：(2) 排除或限制适销性默示担保，必须在文本中明确提及“适销性（merchantability）”且文字必须“显著（conspicuous，如大写粗体字体）”；排除特定用途适用性担保必须采取显著书面形式。(3) 使用“现状交付（as is）”或“带所有瑕疵交付（with all faults）”等明确字样可概括免除默示担保；买方签约前已全面检验或拒绝检验的，对该检验本可发现的瑕疵不再享有默示担保请求权。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-316",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-318",
        "UCC",
        "§ 2-318",
        "Third-Party Beneficiaries of Warranties Express or Implied (担保责任向第三人之延伸与人身财产侵权保护)",
        "Uniform Commercial Code > Article 2: Sales > Part 3: General Obligation and Construction of Contract",
        "A seller's warranty whether express or implied extends to any natural person who is in the family or household of his buyer or who is a guest in his home if it is reasonable to expect that such person may use, consume or be affected by the goods and who is injured in person by breach of the warranty. A seller may not exclude or limit the operation of this section.",
        json.dumps({"article": 2, "section": 318, "category": "third_party_warranty"}),
        "《美国统一商法典》第2-318条【担保利益之第三人保护】：出卖人的明示或默示担保，直接延伸至可合理预期会使用、消费或受货物影响并因违约遭受人身伤害之第三人。出卖人不得通过免责条款排除本条对人身损害之保护。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-318",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-508",
        "UCC",
        "§ 2-508",
        "Cure by Seller of Improper Tender or Delivery; Replacement (出卖人对不当交付的补正权与替换交付宽限期)",
        "Uniform Commercial Code > Article 2: Sales > Part 5: Performance",
        "(1) Where any tender or delivery by the seller is rejected because non-conforming and the time for performance has not yet expired, the seller may seasonably notify the buyer of his intention to cure and may then within the contract time make a conforming delivery.\n(2) Where the buyer rejects a non-conforming tender which the seller had reasonable grounds to believe would be acceptable with or without money allowance the seller may if he seasonably notifies the buyer have a further reasonable time to substitute a conforming tender.",
        json.dumps({"article": 2, "section": 508, "category": "seller_cure"}),
        "《美国统一商法典》第2-508条【出卖人补正权（Cure）】：(1) 履约期未届满前，因标的物瑕疵被买方拒收的，出卖人及时通知补正意图后，可在合同期限内重新交付符合约定之货物。(2) 即使原履约期已届满，若出卖人有合理理由相信其交付本可被买方接受，出卖人及时通知后，享有进一步的“合理宽限期（further reasonable time）”用于提供替换合格交付。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-508",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-509",
        "UCC",
        "§ 2-509",
        "Risk of Loss in the Absence of Breach (无违约情形下FOB/CIF装运及交付地风险转移分担)",
        "Uniform Commercial Code > Article 2: Sales > Part 5: Performance",
        "(1) Where the contract requires or authorizes the seller to ship the goods by carrier:\n(a) if it does not require him to deliver them at a particular destination, the risk of loss passes to the buyer when the goods are duly delivered to the carrier even though the shipment is under reservation (F.O.B. Place of Shipment);\n(b) if it does require him to deliver them at a particular destination and the goods are there duly tendered while in the possession of the carrier, the risk of loss passes to the buyer when the goods are there duly so tendered as to enable the buyer to take delivery (F.O.B. Destination).\n(3) In any case not within subsection (1) or (2), the risk of loss passes to the buyer on his receipt of the goods if the seller is a merchant; otherwise the risk passes to the buyer on tender of delivery.",
        json.dumps({"article": 2, "section": 509, "category": "risk_of_loss"}),
        "《美国统一商法典》第2-509条【无违约时风险转移】：(1)(a) 装运合同（Shipment Contract，如 FOB 装运地）：出卖人将货物依法移交第一承运人时风险即转移至买方；(b) 目的地交货合同（Destination Contract，如 FOB 目的地）：货物运抵约定目的地并向买方提供提货时风险方转移至买方。(3) 其他情形若卖方为商人，在买方实际收取货物（physical receipt）时转移风险。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-509",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-510",
        "UCC",
        "§ 2-510",
        "Effect of Breach on Risk of Loss (违约行为对风险转移之回溯与买卖双方保险缺额分担)",
        "Uniform Commercial Code > Article 2: Sales > Part 5: Performance",
        "(1) Where a tender or delivery of goods so fails to conform to the contract as to give a right of rejection the risk of their loss remains on the seller until cure or acceptance.\n(2) Where the buyer rightfully revokes acceptance he may to the extent of any deficiency in his effective insurance coverage treat the risk of loss as having rested on the seller from the beginning.\n(3) Where the buyer as to conforming goods already identified to the contract for sale repudiates or is otherwise in breach before risk of their loss has passed to him, the seller may to the extent of any deficiency in his effective insurance coverage treat the risk of loss as resting on the buyer for a commercially reasonable time.",
        json.dumps({"article": 2, "section": 510, "category": "risk_breach"}),
        "《美国统一商法典》第2-510条【违约对风险转移之影响】：(1) 交付之货物存在严重瑕疵使买方享有拒收权时，灭失毁损风险始终由卖方承担，直至卖方完成补正或买方实际受领。(2) 买方正当撤销受领的，在自身有效保险保障不足之限度内，可将风险视为自始由卖方承担。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-510",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-513",
        "UCC",
        "§ 2-513",
        "Buyer's Right to Inspection of Goods (买受人到货检验权、检验费用承担与异议前置程序)",
        "Uniform Commercial Code > Article 2: Sales > Part 5: Performance",
        "(1) Unless otherwise agreed and subject to subsection (3), where goods are tendered or delivered or identified to the contract for sale, the buyer has a right before payment or acceptance to inspect them at any reasonable place and time and in any reasonable manner. When the seller is required or authorized to send the goods to the buyer, the inspection may be after their arrival.\n(2) Expenses of inspection must be borne by the buyer but may be recovered from the seller if the goods do not conform and are rejected.",
        json.dumps({"article": 2, "section": 513, "category": "inspection"}),
        "《美国统一商法典》第2-513条【买受人检验权】：(1) 在付款或受领前，买受人有权在合理地点、时间以合理方式对交付货物进行检验。涉外跨国运输中，买方有权在货物运抵目的地到港开箱后实施检验。(2) 检验费用原则上由买方预付；但若标的物存在瑕疵被买方正当拒收，买方有权向出卖人全额追偿商检及测试费用。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-513",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-602",
        "UCC",
        "§ 2-602",
        "Manner and Effect of Rightful Rejection (正当拒收的时间界限、通知方式与拒收后保管义务)",
        "Uniform Commercial Code > Article 2: Sales > Part 6: Breach, Repudiation and Excuse",
        "(1) Rejection of goods must be within a reasonable time after their delivery or tender. It is ineffective unless the buyer seasonably notifies the seller.\n(2) Subject to the provisions of the two following sections on rejected goods (Sections 2-603 and 2-604):\n(a) after rejection any exercise of ownership by the buyer with respect to any commercial unit is wrongful as against the seller; and\n(b) if the buyer has before rejection taken physical possession of goods in which he does not have a security interest under the provisions of this Article (subsection (3) of Section 2-711), he is under a duty after rejection to hold them with reasonable care at the seller's disposition for a time sufficient to permit the seller to remove them...",
        json.dumps({"article": 2, "section": 602, "category": "rejection_rules"}),
        "《美国统一商法典》第2-602条【正当拒收程序要件】：(1) 拒收必须在交付后合理时间内做出，且必须及时通知出卖人方为有效。(2) 拒收后买方对货物行使任何所有权处分行为均属不法侵害；拒收前已实际占有货物的，买方负有妥善保管义务，等待出卖人取回或依其指示处置。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-602",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-606",
        "UCC",
        "§ 2-606",
        "What Constitutes Acceptance of Goods (受领标的物之三项法定构成事实)",
        "Uniform Commercial Code > Article 2: Sales > Part 6: Breach, Repudiation and Excuse",
        "(1) Acceptance of goods occurs when the buyer:\n(a) after a reasonable opportunity to inspect the goods signifies to the seller that the goods are conforming or that he will take or retain them in spite of their non-conformity; or\n(b) fails to make an effective rejection (subsection (1) of Section 2-602), but such acceptance does not occur until the buyer has had a reasonable opportunity to inspect them; or\n(c) does any act inconsistent with the seller's ownership; but if such act is wrongful as against the seller it is an acceptance only if ratified by him.",
        json.dumps({"article": 2, "section": 606, "category": "acceptance_criteria"}),
        "《美国统一商法典》第2-606条【受领之法定构成事实】：受领仅在以下情形发生：(a) 买方在获得合理检验机会后明确表示货物符合要求或虽不符合仍予以保留；(b) 经合理检验后未在合理时间内作出有效拒收；(c) 买方实施了与卖方所有权相冲突的行为（如将设备投入商业生产投产）。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-606",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-608",
        "UCC",
        "§ 2-608",
        "Revocation of Acceptance in Whole or in Part (重大违约下撤销受领要件与隐蔽瑕疵溯源)",
        "Uniform Commercial Code > Article 2: Sales > Part 6: Breach, Repudiation and Excuse",
        "(1) The buyer may revoke his acceptance of a lot or commercial unit whose non-conformity substantially impairs its value to him if he has accepted it:\n(a) on the reasonable assumption that its non-conformity would be cured and it has not been seasonably cured; or\n(b) without discovery of such non-conformity if his acceptance was reasonably induced either by the difficulty of discovery before acceptance or by the seller's assurances.\n(2) Revocation of acceptance must occur within a reasonable time after the buyer discovers or should have discovered the ground for it and before any substantial change in condition of the goods which is not caused by their own defects. It is not effective until the buyer notifies the seller of it.\n(3) A buyer who so revokes has the same rights and duties with regard to the goods involved as if he had rejected them.",
        json.dumps({"article": 2, "section": 608, "category": "revocation"}),
        "《美国统一商法典》第2-608条【撤销受领（解约同等法律效果）】：(1) 标的物瑕疵严重损害其对买方的商业价值（substantially impairs value）时，买方可在下列情况下撤销受领：误信出卖人会补正但未补正；或者因检验困难（通电前不可见之隐蔽瑕疵）导致受领前未发现。(2) 撤销必须在发现瑕疵后合理时间内通知卖方。(3) 撤销受领后享有与正当拒收完全相同的解约及索赔权利。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-608",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-609",
        "UCC",
        "§ 2-609",
        "Right to Adequate Assurance of Performance (不安抗辩权：要求充分履约担保与中止履行)",
        "Uniform Commercial Code > Article 2: Sales > Part 6: Breach, Repudiation and Excuse",
        "(1) A contract for sale imposes an obligation on each party that the other's expectation of receiving due performance will not be impaired. When reasonable grounds for insecurity arise with respect to the performance of either party the other may in writing demand adequate assurance of due performance and until he receives such assurance may if commercially reasonable suspend any performance for which he has not already received the agreed return.\n(2) Between merchants the reasonableness of grounds for insecurity and the adequacy of any assurance offered shall be determined according to commercial standards.\n(4) After receipt of a justified demand failure to provide within a reasonable time not exceeding thirty days such assurance of due performance as is adequate under the circumstances of the particular case is a repudiation of the contract.",
        json.dumps({"article": 2, "section": 609, "category": "adequate_assurance"}),
        "《美国统一商法典》第2-609条【不安抗辩与充分履约担保】：(1) 当一方有合理理由怀疑对方履约能力时，有权书面要求对方提供充分履约担保（adequate assurance），在获得担保前可中止自身履行。(2) 商人间合理性按商业标准衡量。(4) 对方在收到通知后 30 日内未能提供充分担保的，依法构成单方预期拒绝履行（repudiation），守约方可直接解除合同索赔。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-609",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-610",
        "UCC",
        "§ 2-610",
        "Anticipatory Repudiation (预期违约认定与守约方救济路径)",
        "Uniform Commercial Code > Article 2: Sales > Part 6: Breach, Repudiation and Excuse",
        "When either party repudiates the contract with respect to a performance not yet due the loss of which will substantially impair the value of the contract to the other, the aggrieved party may:\n(a) for a commercially reasonable time await performance by the repudiating party; or\n(b) resort to any remedy for breach (Section 2-703 or Section 2-711), even though he has notified the repudiating party that he would await the latter's performance and has urged retraction; and\n(c) in either case suspend his own performance...",
        json.dumps({"article": 2, "section": 610, "category": "anticipatory_breach"}),
        "《美国统一商法典》第2-610条【预期违约】：一方在履行期届至前明确毁约且该违约实质损害合同价值的，守约方可以：(a) 在商业合理期限内等待对方履行；(b) 立即行使违约救济（主张解约退款与赔偿），无需等待履约期届满；(c) 中止自身对待给付。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-610",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-612",
        "UCC",
        "§ 2-612",
        "'Installment Contract'; Breach (分期交付买卖合同中严重违约与全案解约界限)",
        "Uniform Commercial Code > Article 2: Sales > Part 6: Breach, Repudiation and Excuse",
        "(1) An 'installment contract' is one which requires or authorizes the delivery of goods in separate lots to be separately accepted...\n(2) The buyer may reject any installment which is non-conforming if the non-conformity substantially impairs the value of that installment and cannot be cured...\n(3) Whenever non-conformity or default with respect to one or more installments substantially impairs the value of the whole contract there is a breach of the whole. But the aggrieved party reinstates the contract if he accepts a non-conforming installment without seasonably notifying of cancellation or if he brings an action with respect only to past installments or demands performance as to future installments.",
        json.dumps({"article": 2, "section": 612, "category": "installment_sales"}),
        "《美国统一商法典》第2-612条【分期交付合同违约】：(1) 仅当单批次货物的瑕疵严重损害该批货物价值且无法补正时，买方方可拒收该批货物。(3) 仅当单批次或数批次的违约严重损害了“整份合同的价值（substantially impairs whole contract）”时，买方方有权宣告整个买卖合同彻底解除。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-612",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-615",
        "UCC",
        "§ 2-615",
        "Excuse by Failure of Presupposed Conditions (商业不可行 Commercial Impracticability 与不可抗力免责)",
        "Uniform Commercial Code > Article 2: Sales > Part 6: Breach, Repudiation and Excuse",
        "Except so far as a seller may have assumed a greater obligation and subject to the preceding section on substituted performance:\n(a) Delay in delivery or non-delivery in whole or in part by a seller... is not a breach of his duty under a contract for sale if performance as agreed has been made impracticable by the occurrence of a contingency the non-occurrence of which was a basic assumption on which the contract was made or by compliance in good faith with any applicable foreign or domestic governmental regulation or order.\n(b) Where the causes mentioned in paragraph (a) affect only a part of the seller's capacity to perform, he must allocate production and deliveries among his customers...\n(c) The seller must notify the buyer seasonably that there will be delay or non-delivery...",
        json.dumps({"article": 2, "section": 615, "category": "force_majeure"}),
        "《美国统一商法典》第2-615条【商业不可行与不可抗力免责】：(a) 卖方因合同赖以成立之基础假定未发生之意外事故（不可抗力、战争、供应链断裂）或善意服从政府进出口管制禁令，导致履约已属“商业上极度不可行（commercially impracticable）”的，不构成违约。(b) 卖方必须对现有产能进行合理配额分配并及时通知买方。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-615",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-703",
        "UCC",
        "§ 2-703",
        "Seller's Remedies in General (出卖人违约救济权体系总览)",
        "Uniform Commercial Code > Article 2: Sales > Part 7: Remedies",
        "Where the buyer wrongfully rejects or revokes acceptance of goods or fails to make a payment due on or before delivery or repudiates... the aggrieved seller may:\n(a) withhold delivery of such goods;\n(b) stop delivery by any bailee (Section 2-705);\n(c) proceed under the next section respecting goods still unidentified to the contract;\n(d) resell and recover damages as hereafter provided (Section 2-706);\n(e) recover damages for non-acceptance (Section 2-708) or in a proper case the price (Section 2-709);\n(f) cancel.",
        json.dumps({"article": 2, "section": 703, "category": "seller_remedies"}),
        "《美国统一商法典》第2-703条【出卖人救济权体系】：买方不法拒收、撤销受领、拒不付款或毁约的，卖方有权：(a) 留置扣发货物；(b) 途中停运；(c) 转售标的物并追偿差价；(d) 索赔拒收损失或货款全额；(e) 宣告解除合同。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-703",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-706",
        "UCC",
        "§ 2-706",
        "Seller's Resale Including Contract for Resale (出卖人善意转售标的物之差价索赔权)",
        "Uniform Commercial Code > Article 2: Sales > Part 7: Remedies",
        "(1) Under the conditions stated in Section 2-703 on seller's remedies, the seller may resell the goods concerned or the undelivered balance thereof. Where the resale is made in good faith and in a commercially reasonable manner the seller may recover the difference between the resale price and the contract price together with any incidental damages allowed under the provisions of this Article (Section 2-710), less expenses saved in consequence of the buyer's breach.",
        json.dumps({"article": 2, "section": 706, "category": "seller_resale"}),
        "《美国统一商法典》第2-706条【出卖人转售差价救济】：卖方善意且以商业合理方式转售标的物的，有权向买方索赔合同约定价格与实际转售价格之间的差额，以及产生的合理附随仓储运输费用，扣除因买方违约而节约的开支。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-706",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-708",
        "UCC",
        "§ 2-708",
        "Seller's Damages for Non-acceptance or Repudiation (出卖人市价差额赔偿与预期利润索赔 Lost Volume Seller)",
        "Uniform Commercial Code > Article 2: Sales > Part 7: Remedies",
        "(1) Subject to subsection (2)... the measure of damages for non-acceptance or repudiation by the buyer is the difference between the market price at the time and place for tender and the unpaid contract price together with any incidental damages provided in this Article (Section 2-710), less expenses saved in consequence of the buyer's breach.\n(2) If the measure of damages provided in subsection (1) is inadequate to put the seller in as good a position as performance would have done then the measure of damages is the profit (including reasonable overhead) which the seller would have made from full performance by the buyer...",
        json.dumps({"article": 2, "section": 708, "category": "seller_damages"}),
        "《美国统一商法典》第2-708条【出卖人市价差额与利润损失】：(1) 赔偿标准为交货地市价与合同未付款项之差额。(2)“销量损失出卖人（Lost Volume Seller）”规则：若市价差额不足以使卖方达到合同完全履行应有的地位，卖方有权索赔其本可获得的全部利润（包括合理分摊的固定管理费用）。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-708",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-711",
        "UCC",
        "§ 2-711",
        "Buyer's Remedies in General; Buyer's Security Interest in Rejected Goods (买受人救济权体系总览与占有货物法定担保权)",
        "Uniform Commercial Code > Article 2: Sales > Part 7: Remedies",
        "(1) Where the seller fails to make delivery or repudiates or the buyer rightfully rejects or justifiably revokes acceptance... the buyer may cancel and whether or not he has done so may in addition to recovering so much of the price as has been paid:\n(a) 'cover' and have damages under the next section... or\n(b) recover damages for non-delivery as provided in this Article (Section 2-713).\n(3) On rightful rejection or justifiable revocation of acceptance a buyer has a security interest in goods in his possession or control for any payments made on their price and any expenses reasonably incurred in their inspection, receipt, transportation, care and custody...",
        json.dumps({"article": 2, "section": 711, "category": "buyer_remedies"}),
        "《美国统一商法典》第2-711条【买受人救济权体系总则】：(1) 卖方未交货、毁约或买方正当拒收/撤销受领的，买方除全额收回已付定金及货款外，有权行使替代购买（cover）差价赔偿或市价差额索赔。(3) 核心对抗武器：正当拒收或撤销受领后，买方对所占有的货物享有法定担保权（security interest），有权留置货物直至卖方返还货款及赔偿检验仓储费。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-711",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-712",
        "UCC",
        "§ 2-712",
        "'Cover'; Buyer's Procurement of Substitute Goods (买受人替代购买 Cover 差价赔偿规则)",
        "Uniform Commercial Code > Article 2: Sales > Part 7: Remedies",
        "(1) After a breach within the preceding section the buyer may 'cover' by making in good faith and without unreasonable delay any reasonable purchase of or contract to purchase goods in substitution for those due from the seller.\n(2) The buyer may recover from the seller as damages the difference between the cost of cover and the contract price together with any incidental or consequential damages as hereinafter defined (Section 2-715), less expenses saved in consequence of the seller's breach.\n(3) Failure of the buyer to effect cover within this section does not bar him from any other remedy.",
        json.dumps({"article": 2, "section": 712, "category": "cover"}),
        "《美国统一商法典》第2-712条【替代采购 Cover 差价赔偿】：(1) 买方有权善意且无不合理迟延地采购合理替代货物。(2) 买方有权向出卖人索赔实际替代采购成本与原合同约定价金之间的差额，以及附随损失和间接利润损失，扣除所节约之开支。(3) 买方未实施替代采购不影响其主张其他法定救济。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-712",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-713",
        "UCC",
        "§ 2-713",
        "Buyer's Damages for Non-delivery or Repudiation (未获交付之买受人市场公允价格差额索赔)",
        "Uniform Commercial Code > Article 2: Sales > Part 7: Remedies",
        "(1) Subject to the provisions of this Article with respect to proof of market price (Section 2-723), the measure of damages for non-delivery or repudiation by the seller is the difference between the market price at the time when the buyer learned of the breach and the contract price together with any incidental and consequential damages provided in this Article (Section 2-715), less expenses saved in consequence of the seller's breach.",
        json.dumps({"article": 2, "section": 713, "category": "market_damages"}),
        "《美国统一商法典》第2-713条【买方未获交付之市价差额赔偿】：卖方未交货或单方毁约的，买方若未做替代购买，损害赔偿标准为买方获悉违约时交货地的市场价格与原合同约定价格之差额，加计附随及间接衍生损失。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-713",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-716",
        "UCC",
        "§ 2-716",
        "Buyer's Right to Specific Performance or Replevin (买受人实际履行判令与专有设备返还原物之诉)",
        "Uniform Commercial Code > Article 2: Sales > Part 7: Remedies",
        "(1) Specific performance may be decreed where the goods are unique or in other proper circumstances.\n(2) The decree for specific performance may include such terms and conditions as to payment of the price, damages, or other relief as the court may deem just.\n(3) The buyer has a right of replevin for goods identified to the contract if after reasonable effort he is unable to effect cover for such goods or the circumstances reasonably indicate that such effort will be unavailing...",
        json.dumps({"article": 2, "section": 716, "category": "specific_performance"}),
        "《美国统一商法典》第2-716条【买方强制实际履行权】：(1) 当买卖标的物具有不可替代的独特性（如特定芯片光刻制造专利设备）或在其他适当情形下，法院得判令卖方强制实际履行。(3) 在替代购买不可行时，买方对已特定化于合同之货物享有返还原物（replevin）之诉权。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-716",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-718",
        "UCC",
        "§ 2-718",
        "Liquidation or Limitation of Damages; Deposits (违约金条款 Liquidated Damages 合理性与惩罚性条款无效审查)",
        "Uniform Commercial Code > Article 2: Sales > Part 7: Remedies",
        "(1) Damages for breach by either party may be liquidated in the agreement but only at an amount which is reasonable in the light of the anticipated or actual harm caused by the breach, the difficulties of proof of loss, and the inconvenience or nonfeasibility of otherwise obtaining an adequate remedy. A term fixing unreasonably large liquidated damages is void as a penalty.",
        json.dumps({"article": 2, "section": 718, "category": "liquidated_damages"}),
        "《美国统一商法典》第2-718条【约定违约金与定金】：(1) 合同中约定的违约金数额必须结合预期的或实际造成的违约损失、证明损失之困难程度进行综合衡量且具备合理性；设定过分高额违约金的条款因构成“惩罚（penalty）”而绝对无效。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-718",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-719",
        "UCC",
        "§ 2-719",
        "Contractual Modification or Limitation of Remedy (合同约定期修理/退换排他救济及基础目的落空 Essential Purpose 规则)",
        "Uniform Commercial Code > Article 2: Sales > Part 7: Remedies",
        "(1) Subject to the provisions of subsections (2) and (3) of this section and of the preceding section on liquidation and limitation of damages:\n(a) the agreement may provide for remedies in addition to or in substitution for those provided in this Article and may limit or alter the measure of damages recoverable under this Article, as by limiting the buyer's remedies to return of the goods and repayment of the price or to repair and replacement of non-conforming goods or parts; and\n(b) resort to a remedy as provided is optional unless the remedy is expressly agreed to be exclusive, in which case it is the sole remedy.\n(2) Where circumstances cause an exclusive or limited remedy to fail of its essential purpose, remedy may be had as provided in this Act.\n(3) Consequential damages may be limited or excluded unless the limitation or exclusion is unconscionable. Limitation of consequential damages for injury to the person in the case of consumer goods is prima facie unconscionable...",
        json.dumps({"article": 2, "section": 719, "category": "remedy_limitation"}),
        "《美国统一商法典》第2-719条【合同救济限制与根本目的落空】：(1) 合同可约定将买方救济限制在“仅负责免费维修或调换零件”。(2) 关键突破规则：若出卖人多次修理仍无法消除严重公差缺陷，导致约定的排他救济“未能实现其根本目的（fail of its essential purpose）”，买方即可突破该限制条款，恢复享有 UCC 全额解约退款与损害赔偿权利！(3) 人身伤害限制免责推定为显失公平。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-719",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "UCC:§2-725",
        "UCC",
        "§ 2-725",
        "Statute of Limitations in Contracts for Sale (买卖合同4年法定诉讼时效与约定期限限制)",
        "Uniform Commercial Code > Article 2: Sales > Part 7: Remedies",
        "(1) An action for breach of any contract for sale must be commenced within four years after the cause of action has accrued. By the original agreement the parties may reduce the period of limitation to not less than one year but may not extend it.\n(2) A cause of action accrues when the breach occurs, regardless of the aggrieved party's lack of knowledge of the breach. A breach of warranty occurs when tender of delivery is made, except that where a warranty explicitly extends to future performance of the goods and discovery of the breach must await the time of such performance the cause of action accrues when the breach is or should have been discovered.",
        json.dumps({"article": 2, "section": 725, "category": "statute_of_limitations"}),
        "《美国统一商法典》第2-725条【买卖合同诉讼时效】：(1) 违约诉讼法定诉讼时效为 4 年。双方可在原始合同中协议缩短时效（但不得低于 1 年），不得协议延长。(2) 时效自违约行为发生时起算（一般为交付货物之时）；但若质量担保明确延伸至未来履行期（如明确承诺3年质保期），时效自瑕疵被发现或应当被发现之日起算。",
        "Uniform Commercial Code 2022 Official Text",
        0,
        "https://www.law.cornell.edu/ucc/2/2-725",
        SNAPSHOT_ID,
        NOW
    ),

    # =========================================================================
    # 3. 9 U.S.C. Federal Arbitration Act (FAA 联邦仲裁法与涉外裁决执行)
    # =========================================================================
    (
        "USC:9:§1",
        "USC",
        "9 U.S.C. § 1",
        "'Maritime transactions' and 'commerce' defined; exceptions (涉外跨国商事仲裁主体与客体适用范围)",
        "United States Code > Title 9: Arbitration > Chapter 1: General Provisions",
        "'Maritime transactions', as herein defined, means charter parties, bills of lading of water carriers, agreements relating to wharfage, supplies furnished vessels or repairs to vessels... 'commerce', as herein defined, means commerce among the several States or with foreign nations, or in any Territory of the United States...",
        json.dumps({"title": 9, "section": 1, "category": "arbitration_scope"}),
        "《美国法典》第9编第1条【联邦仲裁法之跨国商事定义】：界定联邦仲裁法管辖之海事交易与跨国对外贸易（commerce with foreign nations）范围，确立涉及外国当事人的跨境商业买卖、物流与投资协议均受联邦仲裁法优先统摄。",
        "United States Code 2024 Edition",
        0,
        "https://www.law.cornell.edu/uscode/text/9/1",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "USC:9:§2",
        "USC",
        "9 U.S.C. § 2",
        "Validity, irrevocability, and enforcement of agreements to arbitrate (仲裁协议之独立有效性与联邦强制执行力)",
        "United States Code > Title 9: Arbitration > Chapter 1: General Provisions",
        "A written provision in any maritime transaction or a contract evidencing a transaction involving commerce to settle by arbitration a controversy thereafter arising out of such contract or transaction, or the refusal to perform the whole or any part thereof, or an agreement in writing to submit to arbitration an existing controversy arising out of such a contract, transaction, or refusal, shall be valid, irrevocable, and enforceable, save upon such grounds as exist at law or in equity for the revocation of any contract.",
        json.dumps({"title": 9, "section": 2, "category": "arbitration_validity"}),
        "《美国法典》第9编第2条【仲裁条款法律效力基石】：涉外商事合同中约定的书面仲裁条款，依法具有独立性、有效性、不可撤销性并具备强制执行力，除非存在普通法或衡平法上足以导致任何合同被撤销的抗辩事由（如欺诈、胁迫、显失公平）。确立了全美亲仲裁（Pro-arbitration）的根本联邦政策。",
        "United States Code 2024 Edition",
        0,
        "https://www.law.cornell.edu/uscode/text/9/2",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "USC:9:§3",
        "USC",
        "9 U.S.C. § 3",
        "Stay of proceedings where issue therein referable to arbitration (违反仲裁协议径行起诉的法院诉讼中止令)",
        "United States Code > Title 9: Arbitration > Chapter 1: General Provisions",
        "If any suit or proceeding be brought in any of the courts of the United States upon any issue referable to arbitration under an agreement in writing for such arbitration, the court in which such suit is pending, upon being satisfied that the issue involved in such suit or proceeding is referable to arbitration under such an agreement, shall on application of one of the parties stay the trial of the action until such arbitration has been had in accordance with the terms of the agreement...",
        json.dumps({"title": 9, "section": 3, "category": "arbitration_stay"}),
        "《美国法典》第9编第3条【违约起诉时法院程序强制中止】：当事人一方违反书面仲裁协议向美国联邦法院起诉的，法院查明该争议属于仲裁约定范围后，依相对方申请，必须无条件签发中止诉讼令（Stay），裁定双方返回仲裁程序。",
        "United States Code 2024 Edition",
        0,
        "https://www.law.cornell.edu/uscode/text/9/3",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "USC:9:§4",
        "USC",
        "9 U.S.C. § 4",
        "Failure to arbitrate under agreement; petition to United States court (请求联邦法院签发强制仲裁令 Petition to Compel)",
        "United States Code > Title 9: Arbitration > Chapter 1: General Provisions",
        "A party aggrieved by the alleged failure, neglect, or refusal of another to arbitrate under a written agreement for arbitration may petition any United States district court which, save for such agreement, would have jurisdiction under title 28... for an order directing that such arbitration proceed in the manner provided for in such agreement...",
        json.dumps({"title": 9, "section": 4, "category": "compel_arbitration"}),
        "《美国法典》第9编第4条【申请联邦法院强制仲裁令】：当相对方拒绝配合指定仲裁员或怠于推进仲裁时，守约方可直接向联邦地区法院申请强制仲裁令（Order Compelling Arbitration），由联邦法院司法强制力责令对方依约参与仲裁。",
        "United States Code 2024 Edition",
        0,
        "https://www.law.cornell.edu/uscode/text/9/4",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "USC:9:§9",
        "USC",
        "9 U.S.C. § 9",
        "Award of arbitrators; confirmation; jurisdiction; procedure (向法院申请确认并执行仲裁裁决 Confirmation of Award)",
        "United States Code > Title 9: Arbitration > Chapter 1: General Provisions",
        "If the parties in their agreement have agreed that a judgment of the court shall be entered upon the award made pursuant to the arbitration, and shall specify the court, then at any time within one year after the award is made any party to the arbitration may apply to the court so specified for an order confirming the award, and thereupon the court must grant such an order unless the award is vacated, modified, or corrected as prescribed in sections 10 and 11 of this title.",
        json.dumps({"title": 9, "section": 9, "category": "arbitration_confirmation"}),
        "《美国法典》第9编第9条【申请确认仲裁裁决】：裁决作出后 1 年内，任何一方可向法院申请确认裁决令（Confirmation Order）；法院必须予以确认并转化为具备司法强制执行力的判决，除非裁决依第 10 条被撤销。",
        "United States Code 2024 Edition",
        0,
        "https://www.law.cornell.edu/uscode/text/9/9",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "USC:9:§10",
        "USC",
        "9 U.S.C. § 10",
        "Same; vacation; grounds (撤销涉外商事仲裁裁决之四大法定严格抗辩事由 Vacatur Grounds)",
        "United States Code > Title 9: Arbitration > Chapter 1: General Provisions",
        "(a) In any of the following cases the United States court in and for the district wherein the award was made may make an order vacating the award upon the application of any party to the arbitration:\n(1) where the award was procured by corruption, fraud, or undue means;\n(2) where there was evident partiality or corruption in the arbitrators, or either of them;\n(3) where the arbitrators were guilty of misconduct in refusing to postpone the hearing, upon sufficient cause shown, or in refusing to hear evidence pertinent and material to the controversy; or of any other misbehavior by which the rights of any party have been prejudiced; or\n(4) where the arbitrators exceeded their powers, or so imperfectly executed them that a mutual, final, and definite award upon the subject matter submitted was not made.",
        json.dumps({"title": 9, "section": 10, "category": "arbitration_vacatur"}),
        "《美国法典》第9编第10条【撤销仲裁裁决法定事由】：法院撤销仲裁裁决的四项法定抗辩严格排他事由：(1) 裁决系通过贿赂、欺诈或不正当手段获取；(2) 仲裁员存在明显偏颇或腐败（evident partiality）；(3) 仲裁员存在无正当理由拒绝推迟开庭或拒绝审理实质重大证据等程序不当行为；(4) 仲裁员超越权限（exceeded powers）未作出终局性裁决。法院绝不审查实体法律适用的实质错误！",
        "United States Code 2024 Edition",
        0,
        "https://www.law.cornell.edu/uscode/text/9/10",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "USC:9:§201",
        "USC",
        "9 U.S.C. § 201",
        "Enforcement of Convention (1958年纽约公约在全美联邦法院落地强制执行)",
        "United States Code > Title 9: Arbitration > Chapter 2: Convention on the Recognition and Enforcement of Foreign Arbitral Awards",
        "The Convention on the Recognition and Enforcement of Foreign Arbitral Awards of June 10, 1958, shall be enforced in United States courts in accordance with this chapter.",
        json.dumps({"title": 9, "section": 201, "category": "new_york_convention"}),
        "《美国法典》第9编第201条【纽约公约在美直接执行】：确立 1958 年《承认及执行外国仲裁裁决公约》（纽约公约）由美国联邦法院直接依联邦法予以承认和强制执行。",
        "United States Code 2024 Edition",
        0,
        "https://www.law.cornell.edu/uscode/text/9/201",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "USC:9:§207",
        "UCC",
        "9 U.S.C. § 207",
        "Award of arbitrators; confirmation; jurisdiction; proceeding (纽约公约涉外裁决在美确认之3年申请期)",
        "United States Code > Title 9: Arbitration > Chapter 2: Convention on the Recognition and Enforcement of Foreign Arbitral Awards",
        "Within three years after an arbitral award falling under the Convention is made, any party to the arbitration may apply to any court having jurisdiction under this chapter for an order confirming the award as against any other party to the arbitration. The court shall confirm the award unless it finds one of the grounds for refusal or deferral of recognition or enforcement of the award specified in the said Convention.",
        json.dumps({"title": 9, "section": 207, "category": "new_york_convention"}),
        "《美国法典》第9编第207条【涉外仲裁裁决在美确认程序】：属于纽约公约范围内的外国仲裁裁决（如在中国贸仲 CIETAC 作出的裁决），当事人可在裁决作出后 3 年内向美国联邦法院申请确认并执行该裁决。法院必须裁定执行，除非存在纽约公约第五条规定的法定拒绝事由。",
        "United States Code 2024 Edition",
        0,
        "https://www.law.cornell.edu/uscode/text/9/207",
        SNAPSHOT_ID,
        NOW
    ),

    # =========================================================================
    # 4. DGCL (Delaware General Corporation Law) 特拉华州公司法核心规范
    # =========================================================================
    (
        "DGCL:§102",
        "DGCL",
        "§ 102",
        "Contents of Certificate of Incorporation (公司章程必备条款与董事信义义务免责条款 102(b)(7) 盾牌)",
        "Delaware Code > Title 8: Corporations > Chapter 1: General Corporation Law > Subchapter I: Formation",
        "(b) In addition to the matters required to be set forth in the certificate of incorporation by subsection (a) of this section, the certificate of incorporation may also contain any or all of the following matters:\n(7) A provision eliminating or limiting the personal liability of a director or officer to the corporation or its stockholders for monetary damages for breach of fiduciary duty as a director or officer, provided that such provision shall not eliminate or limit the liability of: (i) a director or officer for any breach of the duty of loyalty to the corporation or its stockholders; (ii) acts or omissions not in good faith or which involve intentional misconduct or a knowing violation of law; or (iii) any transaction from which the director derived an improper personal benefit.",
        json.dumps({"subchapter": "I", "category": "fiduciary_shield"}),
        "《特拉华州通用公司法》第102条【公司章程与董事信义义务免责条款】：102(b)(7) 条允许公司在章程中免除董事因违反注意义务（Duty of Care）造成的金钱赔偿责任；但明令禁止免除违反忠实义务（Duty of Loyalty）、不诚信行为、蓄意违法或获取不当个人利益的法律责任。",
        "Delaware Code Annotated 2023",
        0,
        "https://delcode.delaware.gov/title8/c001/sc01/index.html#102",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "DGCL:§144",
        "DGCL",
        "§ 144",
        "Interested Directors; Quorum (利益冲突董事关联交易之安全港抗辩审查要件)",
        "Delaware Code > Title 8: Corporations > Chapter 1: General Corporation Law > Subchapter IV: Directors and Officers",
        "(a) No contract or transaction between a corporation and 1 or more of its directors or officers, or between a corporation and any other corporation, partnership, association, or other organization in which 1 or more of its directors or officers, are directors or officers, or have a financial interest, shall be void or voidable solely for this reason... if:\n(1) The material facts as to the director's or officer's relationship or interest and as to the contract or transaction are disclosed or are known to the board of directors... and the board in good faith authorizes the contract or transaction by the affirmative votes of a majority of the disinterested directors;\n(2) The material facts are disclosed to the stockholders entitled to vote and authorized in good faith by vote of the stockholders; or\n(3) The contract or transaction is fair as to the corporation as of the time it is authorized...",
        json.dumps({"subchapter": "IV", "category": "interested_director"}),
        "《特拉华州通用公司法》第144条【利益冲突关联交易安全港规则】：公司与具有利害关系的董事之间的交易不当然无效，只要满足下列三项安全港之一：(1) 关联事实向董事会充分披露，并经无利害关系独立董事过半数善意批准；(2) 经全体有表决权股东知情善意投票批准；或 (3) 交易在订立时对公司具有完全公允性（Entire Fairness）。",
        "Delaware Code Annotated 2023",
        0,
        "https://delcode.delaware.gov/title8/c001/sc04/index.html#144",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "DGCL:§220",
        "DGCL",
        "§ 220",
        "Inspection of Books and Records (股东出于正当目的查阅公司核心账簿与往来记录法定权利)",
        "Delaware Code > Title 8: Corporations > Chapter 1: General Corporation Law > Subchapter VII: Meetings, Elections, Voting and Notice",
        "(b) Any stockholder, in person or by attorney or other agent, shall, upon written demand under oath stating the purpose thereof, have the right during the usual hours for business to inspect for any proper purpose, and to make copies and extracts from: (1) The corporation's stock ledger, a list of its stockholders, and its books and records...\n(c) A proper purpose shall mean a purpose reasonably related to such person's interest as a stockholder.",
        json.dumps({"subchapter": "VII", "category": "shareholder_inspection"}),
        "《特拉华州通用公司法》第220条【股东查账权】：任何股东凭经宣誓的书面申请，有权出于“正当目的（proper purpose，即与股东身份利益合理相关的目的，如调查管理层舞弊、对公司进行估值）”，查阅和复制公司的股东名册、会计凭证、董事会决议及内部核心通信记录。",
        "Delaware Code Annotated 2023",
        0,
        "https://delcode.delaware.gov/title8/c001/sc07/index.html#220",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "DGCL:§271",
        "DGCL",
        "§ 271",
        "Sale, Lease or Exchange of Assets (重大资产实质全部出售之董事会决议与全体股东表决权)",
        "Uniform Commercial Code > Title 8: Corporations > Chapter 1: General Corporation Law > Subchapter X: Sale of Assets",
        "(a) Every corporation may at any meeting of its board of directors or governing body, sell, lease or exchange all or substantially all of its property and assets, including its goodwill and its corporate franchises, upon such terms and conditions and for such consideration... as its board of directors deems expedient and for the best interests of the corporation, when and as authorized by a resolution adopted by the holders of a majority of the outstanding stock of the corporation entitled to vote thereon...",
        json.dumps({"subchapter": "X", "category": "asset_sale"}),
        "《特拉华州通用公司法》第271条【重大资产出售】：公司出售、出租或置换其“全部或实质全部（all or substantially all）”财产及核心资产时，必须经董事会审议决议通过，且必须经有表决权股份的过半数股东投票赞成，否则转让行为无效。",
        "Delaware Code Annotated 2023",
        0,
        "https://delcode.delaware.gov/title8/c001/sc10/index.html#271",
        SNAPSHOT_ID,
        NOW
    ),

    # =========================================================================
    # 5. 28 U.S.C. 联邦司法程序法核心涉外条款
    # =========================================================================
    (
        "USC:28:§1332",
        "USC",
        "28 U.S.C. § 1332",
        "Diversity of citizenship; amount in controversy; costs (涉外跨国当事人联邦法院异籍管辖权及7.5万美元门槛)",
        "United States Code > Title 28: Judiciary and Judicial Procedure > Part IV: Jurisdiction and Venue > Chapter 85: District Courts; Jurisdiction",
        "(a) The district courts shall have original jurisdiction of all civil actions where the matter in controversy exceeds the sum or value of $75,000, exclusive of interest and costs, and is between:\n(1) citizens of different States;\n(2) citizens of a State and citizens or subjects of a foreign state, except that the district courts shall not have original jurisdiction under this subsection of an action between citizens of a State and citizens or subjects of a foreign state who are lawfully admitted for permanent residence in the United States and are domiciled in the same State;\n(3) citizens of different States and in which citizens or subjects of a foreign state are additional parties...",
        json.dumps({"title": 28, "section": 1332, "category": "diversity_jurisdiction"}),
        "《美国法典》第28编第1332条【联邦异籍管辖权（涉外民事管辖）】：争议标的额超过 75,000 美元且诉讼系在“美国州公民与外国公民/法人（如中国出海企业）”之间进行的，美国联邦地区法院享有初审民商事管辖权。跨国涉外诉讼原告可直接选择立案于联邦法院或将州法院案件移送联邦法院审理。",
        "United States Code 2024 Edition",
        0,
        "https://www.law.cornell.edu/uscode/text/28/1332",
        SNAPSHOT_ID,
        NOW
    ),
    (
        "USC:28:§1781",
        "USC",
        "28 U.S.C. § 1781",
        "Transmittal of letter rogatory or request (跨国外交与领事途径司法协助委托书之官方转递)",
        "United States Code > Title 28: Judiciary and Judicial Procedure > Part V: Procedure > Chapter 117: Evidence; Depositions",
        "(a) The Department of State has power, directly, or through suitable channels:\n(1) to receive a letter rogatory issued, or request made, by a foreign or international tribunal, to transmit it to the tribunal, officer, or agency in the United States to whom it is addressed, and to receive and return it after execution; and\n(2) to receive a letter rogatory issued, or request made, by a tribunal in the United States, to transmit it to the foreign or international tribunal, officer, or agency to whom it is addressed, and to receive and return it after execution.",
        json.dumps({"title": 28, "section": 1781, "category": "letter_rogatory"}),
        "《美国法典》第28编第1781条【司法协助委托书转递】：美国国务院有权直接或通过外交途径，接收外国法庭或国际裁判庭（如中国最高人民法院或涉外海事法庭）发出的司法协助委托书，并转递至美国相应法院执行证据调取。",
        "United States Code 2024 Edition",
        0,
        "https://www.law.cornell.edu/uscode/text/28/1781",
        SNAPSHOT_ID,
        NOW
    ),
]


def run_enrichment():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"数据库文件未找到: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print(f"=== 开始向 [{DB_PATH}] 注入涉美商事核心法条 ===")
    inserted_count = 0

    for norm in US_NORMS:
        norm_id, law, enbez, title, heading_path, text_de, structure, footnotes, stand, has_pending, source_url, snap_id, fetched_at = norm
        cur.execute("""
            INSERT OR REPLACE INTO norms (
                norm_id, law, enbez, title, heading_path, text_de,
                structure, footnotes, stand, has_pending_amend, source_url, snapshot_id, fetched_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, norm)

        # 写入 norm_versions
        cur.execute("""
            INSERT OR REPLACE INTO norm_versions (
                norm_id, version_no, valid_from, valid_to, text_de,
                structure, stand, source_url, snapshot_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            norm_id, 1, "1990-01-01", "9999-12-31",
            text_de, structure, stand, source_url, snap_id
        ))
        inserted_count += 1

    conn.commit()
    print(f"-> 成功注入/更新 {inserted_count} 条核心规范！")

    # 统计最新数据
    cur.execute("SELECT law, count(*) FROM norms WHERE law IN ('UCC', 'DGCL', 'USC') GROUP BY law")
    print("最新美国法域各法典统计:", cur.fetchall())

    cur.execute("SELECT count(*) FROM norms")
    print(f"数据库全局总法条数: {cur.fetchone()[0]}")

    conn.close()


if __name__ == "__main__":
    run_enrichment()
