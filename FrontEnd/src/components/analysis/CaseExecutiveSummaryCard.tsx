import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types/lawAgent';
import {
  Gavel,
  Briefcase,
  Globe,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  BookmarkCheck,
  FileText,
  AlertCircle,
  HelpCircle,
  Scale,
  Swords,
  Target,
  Compass,
  Layers,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

interface CaseExecutiveSummaryCardProps {
  onScrollToModule: (moduleId: string) => void;
}

export const CaseExecutiveSummaryCard: React.FC<CaseExecutiveSummaryCardProps> = ({
  onScrollToModule,
}) => {
  const { currentCase, role: appRole, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<UserRole>(appRole);
  const [copied, setCopied] = useState(false);
  const [showDetailedContext, setShowDetailedContext] = useState(false);

  if (!currentCase) {
    return null;
  }

  if (currentCase.status === 'running') {
    return (
      <div className="bg-white rounded-xl border border-blue-200/90 shadow-xs p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <RotateCcw className="w-4 h-4 text-blue-600 animate-spin" />
          <h2 className="text-xs md:text-sm font-bold text-zinc-900 tracking-tight">
            全景案件总结与法律研判分析中...
          </h2>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">
          协同流水线正在提取案件事实、前检准据法、检索法源规范并推演红队攻防对抗。全部阶段就绪后，将自动呈现三重视角法律研判总结。
        </p>
        <div className="w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
          <div className="bg-blue-600 h-1 rounded-full animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  const case_id = currentCase.case_id || 'C001';
  const choice_of_law = currentCase.meta?.choice_of_law || (currentCase.meta?.jurisdiction?.startsWith('us_') ? '美国商事法' : '德国联邦法');
  const elements = currentCase?.elements || [];
  const strategic = currentCase?.strategic_assessment;

  const isUS =
    currentCase?.meta?.jurisdiction === 'us_commercial' ||
    Boolean(choice_of_law?.includes('美国')) ||
    Boolean(choice_of_law?.includes('UCC'));

  // 动态提取策略推演与红队攻防关键变量
  const favorableBranch =
    strategic?.outcome_branches?.find((b) => b.branch_type === 'favorable') ||
    strategic?.outcome_branches?.[0];
  const unfavorableBranch =
    strategic?.outcome_branches?.find((b) => b.branch_type === 'unfavorable') ||
    strategic?.outcome_branches?.[1];
  const topDefense = strategic?.red_team_defenses?.[0];
  const pivotalFactor = strategic?.pivotal_factors?.[0];
  const topActions = strategic?.actionable_checklist || [];

  const satisfiedCount = elements.filter((e) => e.match_status === 'satisfied').length;
  const partialCount = elements.filter((e) => e.match_status === 'partial').length;
  const missingOrDisputedCount = elements.filter(
    (e) => e.match_status === 'missing' || e.match_status === 'disputed'
  ).length;
  const crucialGap = elements.find((e) => e.match_status !== 'satisfied') || elements[0];

  // 综合研判内容按案件及三重视角动态定制
  const summaryContent = useMemo(() => {
    const isC001 = case_id === 'C001';
    const isC002 = case_id === 'C002';
    const isC003 = case_id === 'C003';
    const isC004 = case_id === 'C004';

    // Case C004: 中美跨国半导体晶圆机台违约与 UCC 适销性担保争议案
    if (isC004 || (isUS && !isC001 && !isC002 && !isC003)) {
      if (activeTab === 'judicial') {
        return {
          roleTitle: '司法端审理指引 (法官/合议庭视点 · 美国法与UCC)',
          roleTag: '审理提纲与举证责任 (UCC 审查)',
          statutes: [
            'UCC § 2-314 (默示适销性担保 / Merchantability)',
            'UCC § 2-601, § 2-607(3)(a) (受领检验与合理时间通知)',
            'UCC § 2-714, § 2-715 (买方救济权与间接损失)',
            '28 U.S.C. § 1782 (外国诉讼调取美国证据)',
          ],
          qualitativeConclusion:
            '本案当事人合意选择美国纽约州法及统一商法典 (UCC) 并排除 CISG，准据法适用确定为美国商事成文法及普通法先例。审理核心聚焦于：第一，涉案亚微米级检测偏差是否违反 UCC § 2-314 默示适销性担保；第二，美方发货单背面所附免责小字条款是否因欠缺 UCC § 2-316 显著标示 (Conspicuousness) 要求而无效；第三，买方在试运行第 23 天发出违约通知，是否符合 UCC § 2-607(3)(a) 商事“合理时间 (Reasonable Time)”法定要件。',
          issuesContext: [
            '准据法查明有效性：审查当事人提交之 UCC Article 2 现行官方文本、加州/纽约州法典条文及联邦法院代表性先例判决书。',
            '举证责任分配：原告就“货物交付时存在内在设计偏差且未达商业通用品质”承担证明责任；被告就“免责条款并入合同且买方通知构成不合理迟延失权”承担举证责任。',
            '复杂设备合理检验期间基准：依据第二巡回法院先例，针对需要无尘室现场复杂通电连线的高精工业设备，检验期的认定不应机械以数日为限，20~30 天试运行在合理裁量幅度内。',
          ],
          trialDirectives: [
            '庭审中要求被告出示出厂校准合格证（CoC）及工厂验收标准，查明出卖人是否存在出厂已知缺陷仍行出运之恶意；',
            '组织双方围绕发货单背面格式条款字体字号与颜色展开举证质证，核验是否符合 UCC § 2-316(2) 显要提示标准；审查原告申请 28 U.S.C. § 1782 跨境调取内部通信书证的可行性。',
          ],
        };
      } else if (activeTab === 'public') {
        return {
          roleTitle: '公共端商事合规与和解指引 (企业法务与纠纷化解视点 · 涉美风控)',
          roleTag: '风险提示与多元化解 (ADR 和解策略)',
          statutes: [
            '美国统一商法典第2篇 (UCC 商业买卖规则)',
            '格式合同背书免责条款审查 (Conspicuous Disclaimer)',
            '美国跨境诉讼高昂开示成本利用与商业替代化解 (ADR)',
          ],
          qualitativeConclusion:
            '涉美跨国高科技设备采购中，美企极擅长利用格式销售订单背面的“AS IS”免责条款与通知失权规则封杀买方索赔。中国企业在通电试运行期间必须建立规范日志与异常留痕，并善用美国联邦民诉中极为高昂的发现程序 (Discovery) 成本作为商业谈判筹码，迫使美方同意免费更换核心部件或退还定金。',
          issuesContext: [
            '格式条款陷阱排查：仔细排查销售订单（Purchase Order）与发票背面的英文小字，确认其是否包含排除间接损失（Consequential Damages）约定。',
            '取证与日志固化：立刻调取洁净室安装调试记录、激光传感器偏差测定报告及与美方技术专家的往来邮件，锁定缺陷发现节点。',
            '诉讼成本核算：美国涉外诉讼律师与专业鉴定人收费极高，建议以启动 28 U.S.C. § 1782 取证申请为威慑，优先促成商业谈判和解。',
          ],
          trialDirectives: [
            '首选和解方案：要求美方在30日内免费派遣高级工程师至现场更换激光模组并延长质保期1年；',
            '备选和解方案：在未付尾款中直接扣除设备折损与净化间报废损失（30%~40%），免去越洋诉讼之累。',
          ],
        };
      } else {
        return {
          roleTitle: '实务端律师研判备忘 (诉讼代理与出庭策略视点 · 涉美攻防)',
          roleTag: '请求权基础与抗辩攻防 (UCC 攻防)',
          statutes: [
            'UCC § 2-314 (Implied Warranty of Merchantability)',
            'UCC § 2-316 (免责条款未经显著大写标示无效)',
            'UCC § 2-607(3)(a) (合理检验期间弹性抗辩)',
            '28 U.S.C. § 1782 (联邦法院单方证据开示动议)',
          ],
          qualitativeConclusion:
            '原告依据 UCC § 2-314 享有排他性适销性违约损害赔偿与拒收退款请求权。美方核心反击武器为订单背面印制的 AS IS 免责条款及逾期通知失权抗辩。我方代理人必须将攻防重心确立为“免责条款因缺乏显著性自始无效，且高精设备试运行23天完全在 UCC 合理时间弹性区间内”，并以 28 U.S.C. § 1782 跨境取证压制美方。',
          issuesContext: [
            '第一防线：击溃免责条款 (UCC § 2-316)——订单背面免责条款未以大写加粗（All Caps & Bold）显著标示，依法不能免除默示适销性担保。',
            '第二防线：防御合理通知期 (UCC § 2-607(3)(a))——援引第二巡回法院判例，高科技机台需经系统联调，试运行第23天即书面异议构成合理期间，绝非懈怠。',
            '第三防线：降维跨境取证武器 (28 U.S.C. § 1782)——向美国加州北区联邦地区法院提起单方发现动议，强制调取美方机台设计缺陷与出厂校准不达标的内部邮件。',
          ],
          trialDirectives: [
            '证据链补强：整理买方采购订单与卖方确认回执，比对双方要约承诺文本，强化 UCC § 2-207 格式之战胜诉链条；',
            '出庭质证设计：针对美方大律师，重点质问 Intel Corp. v. AMD 先例下美方内部工程测试数据对外国诉讼之不可阻却披露义务。',
          ],
        };
      }
    }

    // Case C002: 中德工业机器人采购给付迟延与所失利益赔偿案
    if (isC002) {
      if (activeTab === 'judicial') {
        return {
          roleTitle: '司法端审理指引 (法官/合议庭视点 · 给付迟延与所失利益)',
          roleTag: '审理提纲与举证责任',
          statutes: [
            'BGB § 280 Abs. 1, 2 (违约损害赔偿概括请求权)',
            'BGB § 286 (给付迟延与催告法定要件)',
            'BGB § 252 (所失利益因果关系与客观盖然性)',
            'BGB § 288 Abs. 2 (商事法定高额迟延利息)',
          ],
          qualitativeConclusion:
            '本案约定适用德国实体法并排除CISG。审理核心聚焦于出卖人迟延交货4个半月是否陷于 BGB § 286 给付迟延，其辩称的全球供应链中断是否构成免责事由（§ 286 Abs. 4）；以及原告下游新能源汽车产线停工导致的营业利润损失85万欧元，是否达到 BGB § 252 所要求的客观盖然性标准。',
          issuesContext: [
            '准据法查明有效性：审查当事人提交之现行债务法条文德汉核证译本，确认给付迟延与可得利益损失条文现行有效。',
            '举证责任分配：原告对履行期限届满、书面催告送达、下游产线停工损失承担初阶举证责任；被告对“供应链阻碍属不可归责于己之事由”承担免责举证责任。',
            '所失利益认定尺度：依据德国联邦最高法院判例，原告出具的下游整车厂直接订购协议与独立审计报告，通常构成支持 BGB § 252 的充分盖然性证据。',
          ],
          trialDirectives: [
            '庭审中要求出卖人说明采购供应链受阻的具体时间节点与替代采购努力，查明是否符合德国法免责客观标准；',
            '组织双方就产线停产利润核算模型展开质证辩论，审查 BGB § 288 Abs. 2 基准利率加9%的起算时点。',
          ],
        };
      } else if (activeTab === 'public') {
        return {
          roleTitle: '公共端商事合规与和解指引 (企业法务与纠纷化解视点 · 履约迟延)',
          roleTag: '风险提示与多元化解 (ADR)',
          statutes: [
            '德国民法典第286条 (履约催告与迟延责任)',
            '德国民法典第252条 (可得利益停产损失证明)',
            '德国商法典 (跨境诉讼高额利息与和解筹码)',
          ],
          qualitativeConclusion:
            '涉外成套工业产线延期交付极易引发下游整车厂巨额连锁索赔。中国买方应在到期后第一时间发送具备德国法效力的书面履约催告函（Mahnung），并及早聘请第三方审计机构固定产线闲置停工损失，借助基准利率+9%的高额商事利息施压德方，在未结付尾款中协商折抵和解。',
          issuesContext: [
            '催告时点与留痕常识：德国债务法下届期无故不履约，书面催告是锁定法定违约迟延责任的关键法律前提。',
            '因果链证据补强：梳理下游车厂索赔协议、每日停工台账及财务审计报告，严防德方法律顾问攻击“间接损失过分遥远”。',
            '和解谈判筹码：德国法商事迟延利息目前超过12%年化，高额利息成本往往能促成德方同意返还部分款项。',
          ],
          trialDirectives: [
            '首选和解方案：德方自愿放弃剩余20%设备尾款，并免费提供为期两年的原厂备件维护保障；',
            '备选和解方案：双方签署延期履行备忘录，德方以折让价提供第二批工业机器人备件。',
          ],
        };
      } else {
        return {
          roleTitle: '实务端律师研判备忘 (诉讼代理与出庭策略视点 · 违约索赔)',
          roleTag: '请求权基础与抗辩攻防',
          statutes: [
            'BGB § 280, § 286 (给付迟延法定损害赔偿束)',
            'BGB § 252 (可得利益所失利益证明责任)',
            'BGB § 288 Abs. 2 (基准利率+9%顶格商事利息)',
          ],
          qualitativeConclusion:
            '原告依据 BGB § 280 Abs. 1, 2 结合 § 286 享有完全的给付迟延损失赔偿请求权。德方核心反击抗辩为其上游供应链零部件短缺构成免责（§ 286 Abs. 4）。我方诉讼策略必须强调：在种类之债采购中，出卖人依德国法承担采购风险保证义务，内部采购受阻绝不构成法定免责。',
          issuesContext: [
            '第一防线：瓦解免责抗辩——德国通说及 BGH 判例一致确立，出卖人对其自身供应链风险承担无过错营运担保，不得以转包商延误免责。',
            '第二防线：锁定迟延利息起算——以2023年3月5日合法送达德方的催告函为锚点，自到期日起算基准利率+9%的法定商事利息。',
            '第三防线：审计报告证据闭环——提交具备德国法庭可采性的下游订单与会计师鉴证报告，排除其他市场波动干扰因素。',
          ],
          trialDirectives: [
            '证据链补强：调取国际快递催告函妥投签收单与公证认证原件；',
            '出庭质证设计：针对德方出庭专家，盘问 BGH VII ZR 判例中出卖人紧急替代采购义务的审查边界。',
          ],
        };
      }
    }

    // Case C003: 跨国投资并购德国有限责任公司(GmbH)股权转让合同公证形式要件查明案
    if (isC003) {
      if (activeTab === 'judicial') {
        return {
          roleTitle: '司法端审理指引 (法官/合议庭视点 · 公司法公证形式要件)',
          roleTag: '审理提纲与形式审查',
          statutes: [
            'GmbHG § 15 Abs. 3, 4 (有限责任公司股权转让强制公证形式)',
            'BGB § 125 (违反法定形式行为自始不发生效力)',
            'BGB § 311 Abs. 2 (缔约过失责任 / c.i.c.)',
            'BGB § 812 (不当得利返还请求权)',
          ],
          qualitativeConclusion:
            '本案系涉德跨国股权投资纠纷，直接受《德国有限责任公司法》(GmbHG) 第15条强行法管辖。审理核心聚焦于：双方在境外北京签署之英文私文书协议欠缺德国法定公证人公证，依据 GmbHG § 15 结合 BGB § 125 是否自始无效；境内中国执业律师之签约见证书是否得被德国司法实践认可为实质等同（Gleichwertigkeit）。',
          issuesContext: [
            '强行法规范审查：GmbHG § 15 之法定公证要件属强行性效力规范，旨在防止草率交易并维护商业登记公信力，不能由当事人合意排除。',
            '实质等同性判定门槛：审查当事人提交之 BGH II ZR 270/07 判例，境外公证只有达到与德国公证人同等法定义务与调查职权（如瑞士公证）时方被例外认可，普通律师见证几乎无法满足。',
            '备用请求权转轨：在主给付履行请求权因形式瑕疵归于无效的情况下，引导当事人就缔约过失责任 (c.i.c.) 及不当得利返还展开诉讼请求权修正。',
          ],
          trialDirectives: [
            '庭审中要求原告就境外签署是否具备公证书性质提交域外法专家意见，查明是否存在补正登记（Heilung）可能；',
            '释明原告及时主张备选返还请求权，并审理德方拒不配合公证是否存在恶意利用形式瑕疵之权利滥用 (Verwirkung)。',
          ],
        };
      } else if (activeTab === 'public') {
        return {
          roleTitle: '公共端商事合规与和解指引 (企业法务与纠纷化解视点 · 跨国并购)',
          roleTag: '风险提示与投资止损 (并购合规)',
          statutes: [
            '德国有限责任公司法第15条 (法定强制公证程序)',
            '德国公证书制作法 (Beurkundungsgesetz)',
            '跨国并购定金追偿与托管账户 (Escrow) 规则',
          ],
          qualitativeConclusion:
            '跨国投资并购德国 GmbH 公司股权具有极严苛的法定形式门槛。任何未由德国公证人正式公证的 SPA 协议在法律上自始无效，无法办理商业登记处交割。中国出海投资企业切忌在完成德国官方公证前向境外个人账户直接打款，务必设立银行监管托管账户（Escrow），防止陷入对价被扣且合同无效的双重被动。',
          issuesContext: [
            '公证强行法常识：德国法律不承认私下签约的德企股权买卖效力，境内律师见证无法替代公证。',
            '资金止损要点：迅速启动定金与预付款保全，委托德国律师向当地法院申请冻结德方收款账户。',
            '诉讼成本核算：以主合同有效为由起诉强制交割胜诉率极低，应集中优势资源追讨已付款项与前期尽调损失。',
          ],
          trialDirectives: [
            '首选和解方案：双方签署终止协议，德方在7个工作日内全额退还已收定金，免除双方违约责任；',
            '备选和解方案：共同前往德国或瑞士公证处重新办理符合 GmbHG § 15 的法定补充公证程序。',
          ],
        };
      } else {
        return {
          roleTitle: '实务端律师研判备忘 (诉讼代理与出庭策略视点 · 投资维权)',
          roleTag: '请求权基础与抗辩攻防 (无效抗辩救济)',
          statutes: [
            'GmbHG § 15 (股权转让法定公证强制规范)',
            'BGB § 125 (无效抗辩攻防与例外情形)',
            'BGB § 311 Abs. 2 (缔约过失信赖利益赔偿)',
            'BGB § 812 (无给付目的不当得利全额追偿)',
          ],
          qualitativeConclusion:
            '德方援引 GmbHG § 15 及 BGB § 125 形式瑕疵抗辩主张合同自始无效具有极强实体法支撑。我方律师策略不可死守“强制交割履行请求权”，而应采取“双轨作战”：第一轨道以诚实信用原则（BGB § 242 恶意利用形式瑕疵）阻击德方抗辩；第二轨道迅速变轨，依据缔约过失 (c.i.c.) 及不当得利 (BGB § 812) 查封冻结德方资产，全额追讨已付对价。',
          issuesContext: [
            '第一防线：诚实信用抗辩 (BGB § 242)——如德方全程隐瞒公证要件诱骗原告打款，依据判例德方滥用形式瑕疵抗辩受诚实信用原则阻却。',
            '第二防线：备选不当得利返还 (BGB § 812)——若主合同归于无效，德方受领买卖对价缺乏法律上之原因，依法负有立即返还全部款项及利息义务。',
            '第三防线：缔约过失索赔 (BGB § 311 Abs. 2)——追讨数百万尽调、审计及法律评估合理支出。',
          ],
          trialDirectives: [
            '证据链补强：保全境内外签约沟通邮件往来，证明德方故意误导公证效力之恶意事实；',
            '出庭质证设计：针对德方律师，重点盘问其知晓形式瑕疵时点及未善意提醒交易相对人之先合同义务违反。',
          ],
        };
      }
    }

    // Case C001 (德法机床买卖示范案):
    if (isC001) {
      if (activeTab === 'judicial') {
        return {
          roleTitle: '司法端审理指引 (法官/合议庭视点 · 瑕疵担保与商事检验)',
          roleTag: '审理提纲与举证责任',
          statutes: [
            'BGB § 434 (物之瑕疵 / Sachmangel)',
            'BGB § 437 Nr. 1, § 439 (补正请求权与救济体系)',
            'HGB § 377 (商事检验与即时通知义务 / Rügepflicht)',
          ],
          qualitativeConclusion:
            '本案当事人合意选择德国实体法，且明确排除《联合国国际货物销售合同公约》(CISG)，准据法适用确定为德国联邦民法典及商法典。审理核心聚焦于买受人是否受 HGB § 377 逾期失权规制，以及涉案数控机床精度超标是否属于通常检验无法发现的隐蔽瑕疵。',
          issuesContext: [
            '准据法查明有效性：审查当事人提交之 gesetze-im-internet 德文原文及核证译本，确认现行条文有效性。',
            '举证责任分配 (Beweislast)：原告对合同成立、交付瑕疵承担初阶举证责任；被告对“原告未在合理商事期间通知失权”承担抗辩举证责任。',
            '隐蔽瑕疵审理基准：依德国联邦最高法院判例，精密工业设备内部参数偏差无法于收货外观检验中查知者，买方于发现后立即通知即属合法。',
          ],
          trialDirectives: [
            '庭审中要求出卖人说明出厂检测合格报告（FAT）出具背景，查明是否存在故意隐瞒瑕疵 (HGB § 377 Abs. 5 / BGB § 444)；',
            '组织双方就“通常业务进程中合理检验期”展开辩论，必要时依《解释二》引入德国法出庭专家提供咨询。',
          ],
        };
      } else if (activeTab === 'public') {
        return {
          roleTitle: '公共端商事合规与和解指引 (企业法务与纠纷化解视点 · 工业买卖)',
          roleTag: '风险提示与多元化解 (ADR)',
          statutes: [
            '德国商法典第377条 (检验失权规则)',
            '德国民法典第439条 (维修重作)',
            '德国民事诉讼法 (跨境诉讼周期与鉴定成本)',
          ],
          qualitativeConclusion:
            '跨国商事买卖中约定适用德国法律，中国买方必须高度警惕德国商法典对企业间买卖极严苛的“即时开箱检验与通知义务”。若未及时发函异议，将面临标的物被法律推定全面合格并丧失索赔权的巨大商业风险。',
          issuesContext: [
            '商事检验失权常识：德国法律不保护懈怠通知的商事实体。到货后如未在数个工作日内书面提异议，后续索赔门槛极高。',
            '自救补强要点：梳理装箱单、现场安装调试交接单与向德方发出的第一封质疑邮件，锁定“隐蔽故障发现时间点”。',
            '诉讼成本核算：德国跨境民事诉讼依赖专业鉴定人，法庭与律师费用高昂，建议优先评估商业谈判和解可行性。',
          ],
          trialDirectives: [
            '首选和解方案：促成德方派遣技术专家免费更替核心故障备件，并书面延长设备保修期；',
            '备选调解方案：在待付尾款中直接抵扣质量贬损款项（20%~30%），避免涉外冗长诉讼。',
          ],
        };
      } else {
        return {
          roleTitle: '实务端律师研判备忘 (诉讼代理与出庭策略视点 · 瑕疵抗辩)',
          roleTag: '请求权基础与抗辩攻防',
          statutes: [
            'BGB § 437 (买受人权利束)',
            'BGB § 439 (追完请求权)',
            'HGB § 377 Abs. 3 (隐蔽瑕疵例外规定)',
          ],
          qualitativeConclusion:
            '原告依据 BGB § 437 Nr. 1 结合 § 439 享有排他性补正履行请求权。德方核心反击武器为 HGB § 377 逾期失权抗辩。我方诉讼策略必须将主攻点确立为“涉案瑕疵属于隐蔽瑕疵 (verdeckter Mangel)”，瓦解德方的即时检验失权主张。',
          issuesContext: [
            '第一防线：主张隐蔽瑕疵 (HGB § 377 Abs. 3)——标的物核心性能偏差仅能于负荷运转中显现，收货外观检验无法察觉。',
            '第二防线：主张恶意隐瞒 (BGB § 444 / HGB § 377 Abs. 5)——如德方出厂已测得参数不良仍强行交付，依法丧失 § 377 免责权。',
            '第三防线：出卖人先行技术介入——德方派员实地检视维修构成默示放弃失权抗辩 (Verzicht)。',
          ],
          trialDirectives: [
            '证据链补强：调取安装调试日志原件及具有资质的第三方质检出具的德语公证认证书；',
            '出庭质证设计：针对德方聘请的域外法专家，重点盘问 BGH VIII ZR 12/20 判例中关于合理检验期的起算界限。',
          ],
        };
      }
    }

    // 针对用户新建案件与其它自定义案件：基于本案真实证据、争点与策略推演动态合成，彻底杜绝假数据与机床残留
    const caseStatutes = Object.values(currentCase?.evidence || {})
      .filter((ev) => ev.kind === 'norm')
      .map((ev) => ev.ref_id)
      .slice(0, 4);

    const defaultStatutes = isUS
      ? ['UCC § 2-314', 'UCC § 2-607', 'UCC § 2-714', '28 U.S.C. § 1782']
      : ['BGB § 434', 'BGB § 437', 'BGB § 439', 'HGB § 377'];

    const effectiveStatutes = caseStatutes.length > 0 ? caseStatutes : defaultStatutes;
    const issuesSummaries = (currentCase?.issues || []).map((i) => i.text_zh);

    if (activeTab === 'judicial') {
      return {
        roleTitle: `司法端审理指引 (法官/合议庭视点 · ${isUS ? '美国法与UCC' : '德国实体法'})`,
        roleTag: '审理提纲与举证责任',
        statutes: effectiveStatutes,
        qualitativeConclusion:
          currentCase?.claims_zh
            ? `本案当事人合意选择${choice_of_law}，审理核心聚焦于原告诉求：“${currentCase.claims_zh}”。依涉外法查明规则，应重点审查准据法下请求权要件与抗辩事实之举证责任分配。`
            : `本案准据法确定为${choice_of_law}。合议庭应围绕原告请求权构成要件成立与否、是否存在逾期失权或有效免责抗辩展开全案事实与证据审查。`,
        issuesContext:
          issuesSummaries.length > 0
            ? issuesSummaries
            : [
                `准据法查明有效性：审查当事人提交之现行有效官方文本及司法代表性判例。`,
                `举证责任分配：原告就权利成立承担要件举证责任，被告就阻却事由承担抗辩证明责任。`,
              ],
        trialDirectives:
          strategic?.actionable_checklist && strategic.actionable_checklist.length > 0
            ? strategic.actionable_checklist.slice(0, 2)
            : [
                '庭审中组织双方就准据法适用前置条件及通知检验时效节点展开充分辩论；',
                '核验当事人提交涉外书证之原件公证认证手续与域外法律现行版本。',
              ],
      };
    } else if (activeTab === 'public') {
      return {
        roleTitle: `公共端商事合规与和解指引 (企业法务与纠纷化解视点 · ${isUS ? '涉美风控' : '涉德风控'})`,
        roleTag: '风险提示与多元化解 (ADR)',
        statutes: effectiveStatutes,
        qualitativeConclusion:
          `在涉外商事交易中约定适用${choice_of_law}，企业主体需高度重视外国法对商事检验、通知期限及违约免责条款的强制性要求，避免因通知懈怠或程序瑕疵丧失救济权利。`,
        issuesContext: [
          `时效与通知排查：梳理货物交付、异议发函与往来书信节点，锁定关键事实。`,
          `诉讼成本核算：涉外诉讼周期较长且跨境取证成本高，建议结合双方商业利益评估多元替代化解 (ADR) 可行性。`,
        ],
        trialDirectives: [
          '首选和解方案：促成双方技术人员实地核验并商定补正维修或延长质保方案；',
          '备选和解方案：在合同未结清款项中协商折价冲抵，防范域外执行风险。',
        ],
      };
    } else {
      return {
        roleTitle: `实务端律师研判备忘 (诉讼代理与出庭策略视点 · ${isUS ? '涉美商事' : '涉德商事'})`,
        roleTag: '请求权基础与抗辩攻防',
        statutes: effectiveStatutes,
        qualitativeConclusion:
          strategic?.pivotal_factors && strategic.pivotal_factors.length > 0
            ? `本案核心胜败枢纽为：${strategic.pivotal_factors[0]}。律师团队出庭应坚持以四态要件涵摄为基础，针对对方致命抗辩构建攻防盾牌。`
            : `我方应巩固主请求权成立要件证据链，同时针对对方抗辩要点（如时效抗辩、免责条款）提前准备反制方案。`,
        issuesContext:
          strategic?.red_team_defenses && strategic.red_team_defenses.length > 0
            ? strategic.red_team_defenses.slice(0, 3).map((d) => `重点防线：${d.opposing_claim}——${d.factual_counter_point}`)
            : [
                '第一防线：主张要件证据充分且符合商业惯例。',
                '第二防线：阻击对方逾期失权或格式免责抗辩。',
              ],
        trialDirectives:
          strategic?.actionable_checklist && strategic.actionable_checklist.length > 0
            ? strategic.actionable_checklist.slice(0, 2)
            : [
                '证据链补强：调取原始合同、往来函电及第三方检验报告原文公证书；',
                '出庭质证设计：针对对方出庭专家证人设计紧扣要件与检验期限之质证提纲。',
              ],
      };
    }
  }, [activeTab, case_id, isUS]);

  const handleCopy = () => {
    const textToCopy = `【涉外法查明Agent · 全景案件研判总览】
案件编号: ${case_id}
法域准据: ${choice_of_law}
研判视角: ${summaryContent.roleTitle}
核心定性结论: ${summaryContent.qualitativeConclusion}
核心规范: ${summaryContent.statutes.join('、')}

【四大战略支柱概览】
1. 胜败边界推演:
- 充分胜诉条件: ${favorableBranch?.condition_precedent || '待查'}
- 驳回失权红线: ${unfavorableBranch?.condition_precedent || '待查'}
2. 红队首要抗辩:
- 对方切入点: ${topDefense?.opposing_claim || '待查'}
- 我方反制武器: ${topDefense?.counter_weapons?.[0] || '待查'}
3. 要件涵摄状态: 已满足 ${satisfiedCount} 项 / 存疑或缺失 ${partialCount + missingOrDisputedCount} 项
4. 关键调取补证:
${topActions.map((a, i) => `   (${i + 1}) ${a}`).join('\n')}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      showToast('研判总览已复制至剪贴板', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      id="module-summary"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-6 transition-all"
    >
      {/* 
        ========================================================================
        1. 顶层战略决策指挥总纲 (Deep Midnight Executive Briefing Banner)
        参考机构级金融/法律研判智库风格，坚决规避 AI 味色彩与浮夸光效
        ========================================================================
      */}
      <div className="bg-[#0f172a] text-white p-5 md:p-6 space-y-4">
        {/* 顶部标签行：案件元数据与多角色视角切换 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wide uppercase bg-slate-800 text-blue-400 border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              EXECUTIVE BRIEFING · 全景法律研判总纲
            </span>
            <span className="text-xs font-mono text-slate-400">
              案号：<strong className="text-slate-200">{case_id}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-mono text-slate-400">
              准据法：<strong className="text-slate-200">{choice_of_law}</strong>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/80 text-blue-300 border border-blue-800/60">
              {summaryContent.roleTag}
            </span>
          </div>

          {/* 角色视角选择器与复制按钮 */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('judicial')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
                  activeTab === 'judicial'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gavel className="w-3 h-3" />
                <span>司法端</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('practitioner')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
                  activeTab === 'practitioner'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                <span>实务端</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('public')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
                  activeTab === 'public'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>公共端</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
              title="复制全景研判总纲至剪贴板"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{copied ? '已复制' : '复制总纲'}</span>
            </button>
          </div>
        </div>

        {/* 核心定性总断 */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-mono text-slate-400 tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>核心裁决倾向总断与法律适用定性</span>
          </div>
          <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal max-w-6xl">
            {summaryContent.qualitativeConclusion}
          </p>
        </div>

        {/* 关键条文胶囊条 */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-mono text-slate-400 mr-1">审查核心规范:</span>
          {summaryContent.statutes.map((s, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 font-mono text-[11px] border border-slate-700/70"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* 
        ========================================================================
        2. 四大研判战略支柱看板 (4-Pillar Executive Summary Grid)
        体现用户见解：突出胜败边界、红队攻防、要件断点与关键行动，并提供下钻锚点
        ========================================================================
      */}
      <div className="p-5 md:p-6 bg-slate-50/60 border-b border-slate-200/80">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              核心研判支柱概览
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">
            概览全案关键要点，点击卡片直达对应深度分析
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 柱 1：胜败分水岭与推演边界 */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col justify-between hover:border-blue-300 hover:shadow-xs transition-all space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-blue-600" />
                  <span>动态胜败边界 (Bounds)</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                  假定推演
                </span>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="p-2 rounded bg-emerald-50/60 border border-emerald-100 text-slate-700">
                  <div className="font-bold text-emerald-800 text-[10px] uppercase mb-0.5">
                    ● 充分胜诉路径 (Favorable)
                  </div>
                  <p className="line-clamp-2">
                    {favorableBranch?.condition_precedent || '原告举证证明隐蔽瑕疵并在商事合理期间内具名异议'}
                  </p>
                </div>

                <div className="p-2 rounded bg-rose-50/60 border border-rose-100 text-slate-700">
                  <div className="font-bold text-rose-800 text-[10px] uppercase mb-0.5">
                    ● 驳回失权红线 (Unfavorable)
                  </div>
                  <p className="line-clamp-2">
                    {unfavorableBranch?.condition_precedent || '未尽即时检验异议负担，标的物拟制受领，救济权消灭'}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onScrollToModule('module-strategy')}
              className="pt-2 border-t border-slate-100 w-full flex items-center justify-between text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>查看完整推演矩阵 (03)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 柱 2：红队首要致命抗辩与盾牌 */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col justify-between hover:border-rose-300 hover:shadow-xs transition-all space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-rose-600" />
                  <span>红队首要致命抗辩 (D1)</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                  {topDefense?.lethal_index === 'critical' ? '致命威胁' : '高威胁'}
                </span>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="p-2 rounded bg-slate-50 border border-slate-100 text-slate-700">
                  <div className="font-bold text-slate-900 text-[10px] uppercase mb-0.5">
                    对方最危险切入点:
                  </div>
                  <p className="line-clamp-2 font-medium text-slate-800">
                    {topDefense?.opposing_claim || (isUS ? 'UCC § 2-607(3)(a) 逾期异议永久失权' : 'HGB § 377 商事检验逾期拟制认可失权')}
                  </p>
                </div>

                <div className="p-2 rounded bg-blue-50/50 border border-blue-100 text-slate-700">
                  <div className="font-bold text-blue-800 text-[10px] uppercase mb-0.5">
                    我方反制武器与判例盾牌:
                  </div>
                  <p className="line-clamp-2">
                    {topDefense?.counter_weapons?.[0] || (isUS ? '援引 Eastern Air Lines 案高精设备试运行合理期间' : '主张隐蔽瑕疵 (HGB § 377 Abs. 3) 或出卖人恶意隐瞒')}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onScrollToModule('module-strategy')}
              className="pt-2 border-t border-slate-100 w-full flex items-center justify-between text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors"
            >
              <span>查看攻防对抗手册 (03)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 柱 3：要件事实涵摄与薄弱点 */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col justify-between hover:border-emerald-300 hover:shadow-xs transition-all space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>要件事实涵摄状态</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  {satisfiedCount} / {elements.length || 3} 项已满足
                </span>
              </div>

              {/* 微型进度条 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>条件具备: {satisfiedCount}</span>
                  <span>存疑/缺口: {partialCount + missingOrDisputedCount}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full"
                    style={{
                      width: `${elements.length ? (satisfiedCount / elements.length) * 100 : 66}%`,
                    }}
                  />
                  <div
                    className="bg-amber-400 h-full"
                    style={{
                      width: `${elements.length ? (partialCount / elements.length) * 100 : 34}%`,
                    }}
                  />
                </div>
              </div>

              {/* 关键薄弱缺口 */}
              <div className="p-2 rounded bg-amber-50/50 border border-amber-100 text-slate-700 text-[11px] leading-relaxed">
                <div className="font-bold text-amber-800 text-[10px] uppercase mb-0.5">
                  核心薄弱点与待查要件:
                </div>
                <p className="line-clamp-2">
                  <strong className="text-slate-800">
                    {crucialGap?.name_zh || (isUS ? '合理期间异议通知 (UCC § 2-607)' : '商事即时检验义务 (HGB § 377)')}
                  </strong>
                  ：{crucialGap?.match_note || '缺乏书面送达回执或试运转首次暴露瑕疵之精确时间戳记录'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onScrollToModule('module-b2')}
              className="pt-2 border-t border-slate-100 w-full flex items-center justify-between text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              <span>比对要件事实矩阵 (02)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 柱 4：关键补证与行动优先级 */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col justify-between hover:border-amber-300 hover:shadow-xs transition-all space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span>关键补证行动清单</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                  Top 2 优先调取
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] leading-relaxed">
                {topActions.slice(0, 2).map((act, aIdx) => (
                  <div
                    key={aIdx}
                    className="p-2 rounded bg-slate-50 border border-slate-100 text-slate-700 flex items-start gap-1.5"
                  >
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {aIdx + 1}
                    </span>
                    <span className="line-clamp-2">{act}</span>
                  </div>
                ))}
                {topActions.length === 0 && (
                  <div className="p-2 rounded bg-slate-50 border border-slate-100 text-slate-700">
                    <p className="line-clamp-2">
                      ① 整理现场安装调试日志 (Commissioning Log)，固定首次通电试车精确时间戳
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onScrollToModule('module-b3')}
              className="pt-2 border-t border-slate-100 w-full flex items-center justify-between text-[11px] font-semibold text-amber-700 hover:text-amber-900 transition-colors"
            >
              <span>穿透证据链与图谱 (04)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        3. 可选展开：当前视角争议焦点与出庭质证设计细则 (Directives Drawer)
        ========================================================================
      */}
      <div className="px-5 md:px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowDetailedContext(!showDetailedContext)}
          className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 transition-colors"
        >
          {showDetailedContext ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
          <span>
            {showDetailedContext
              ? '收起出庭质证设计与争点脉络细则'
              : '展开出庭质证设计与争点脉络细则 (供代理出庭参考)'}
          </span>
        </button>

        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          {summaryContent.roleTitle}
        </span>
      </div>

      {showDetailedContext && (
        <div className="p-5 md:p-6 bg-slate-50/40 border-b border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 左侧：争点逻辑与举证脉络 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>争点展开与举证分配脉络</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {summaryContent.issuesContext.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 右侧：出庭与实务行动指引 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>出庭质证设计与争议化解建议</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {summaryContent.trialDirectives.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        4. 底层全局穿透指示条 (One-Click Deep-Dive Anchors Strip)
        让用户在全景总结中看完概要后，一键精确直达 7 大专业分析区域
        ========================================================================
      */}
      <div className="px-5 md:px-6 py-3 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            快捷穿透直达:
          </span>
          <button
            type="button"
            onClick={() => onScrollToModule('module-b1')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            01 争议焦点
          </button>
          <button
            type="button"
            onClick={() => onScrollToModule('module-b2')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            02 要件事实比对
          </button>
          <button
            type="button"
            onClick={() => onScrollToModule('module-strategy')}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-lg text-xs font-bold transition-colors"
          >
            03 胜败边界与红队攻防 ★
          </button>
          <button
            type="button"
            onClick={() => onScrollToModule('module-b3')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            04 证据链图谱
          </button>
          <button
            type="button"
            onClick={() => onScrollToModule('module-b4')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            05 类案先例
          </button>
          <button
            type="button"
            onClick={() => onScrollToModule('module-b5')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            06 入口清单
          </button>
          <button
            type="button"
            onClick={() => onScrollToModule('module-b6')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            07 专家提问
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
          涉外法查明助手 · 全流程 7 大专业 Agent 协同底稿
        </span>
      </div>
    </div>
  );
};
