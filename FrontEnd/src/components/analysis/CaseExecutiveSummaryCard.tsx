import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types/lawAgent';
import {
  Gavel,
  Briefcase,
  Globe,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  BookmarkCheck,
  FileText,
  AlertCircle,
  HelpCircle,
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

  const case_id = currentCase?.case_id || 'C001';
  const facts_zh = currentCase?.facts_zh || '';
  const claims_zh = currentCase?.claims_zh || '';
  const choice_of_law = currentCase?.meta?.choice_of_law || '德国联邦法';
  const cisg_excluded = currentCase?.meta?.cisg_excluded;
  const issues = currentCase?.issues || [];
  const elements = currentCase?.elements || [];

  // 综合研判内容按三重视角定制
  const summaryContent = useMemo(() => {
    const isC001 = case_id === 'C001';
    const isC002 = case_id === 'C002';

    if (activeTab === 'judicial') {
      return {
        roleTitle: '司法端审理指引 (法官/合议庭视点)',
        roleTag: '审理提纲与举证责任',
        color: 'indigo',
        statutes: ['BGB § 434 (物之瑕疵)', 'BGB § 437 Nr. 1, § 439 (补正请求权)', 'HGB § 377 (商事检验与通知义务)'],
        qualitativeConclusion:
          '本案当事人合意选择德国实体法，且明确排除《联合国国际货物销售合同公约》(CISG)，准据法适用确定为德国联邦民法典及商法典。审理核心聚焦于买受人是否受 HGB § 377 逾期失权规制，以及涉案瑕疵是否属于隐蔽瑕疵。',
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
        roleTitle: '公共端商事合规与和解指引 (企业法务与纠纷化解视点)',
        roleTag: '风险提示与多元化解 (ADR)',
        color: 'emerald',
        statutes: ['德国商法典第377条 (检验失权规则)', '德国民法典第439条 (维修重作)', '德国民事诉讼法 (跨境诉讼周期)'],
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
        roleTitle: '实务端律师研判备忘 (诉讼代理与出庭策略视点)',
        roleTag: '请求权基础与抗辩攻防',
        color: 'blue',
        statutes: ['BGB § 437 (买受人权利束)', 'BGB § 439 (追完请求权)', 'HGB § 377 Abs. 3 (隐蔽瑕疵例外)'],
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
  }, [activeTab, case_id]);

  const handleCopy = () => {
    const textToCopy = `【涉外法查明Agent · 全景案件研判总结】\n案件编号: ${case_id}\n视角: ${summaryContent.roleTitle}\n研判定性: ${summaryContent.qualitativeConclusion}\n核心规范: ${summaryContent.statutes.join('、')}\n核心争点逻辑:\n${summaryContent.issuesContext.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n出庭与行动指引:\n${summaryContent.trialDirectives.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      showToast('研判总结已复制至剪贴板', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      id="module-summary"
      className="bg-white rounded-xl border border-zinc-200/90 shadow-sm overflow-hidden mb-6 transition-all"
    >
      {/* 顶部标题栏与三重视角切换 Tab */}
      <div className="border-b border-zinc-100 bg-zinc-50/70 p-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
                全景案件总结与法律研判
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 font-medium">
                {summaryContent.roleTag}
              </span>
            </div>
          </div>
        </div>

        {/* 角色视角选择器 (司法端 / 实务端 / 公共端) */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 rounded-lg self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('judicial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'judicial'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Gavel className="w-3.5 h-3.5 text-indigo-600" />
            <span>司法端视角</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('practitioner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'practitioner'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span>实务端视角</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('public')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'public'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>公共端视角</span>
          </button>
        </div>
      </div>

      {/* 核心内容区 */}
      <div className="p-6 space-y-5">
        {/* 定性概要条 */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs leading-relaxed text-zinc-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-semibold text-zinc-900 flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-blue-600" />
              <span>综合法律定性与冲突法入口结论</span>
            </div>
            <p className="text-zinc-600 max-w-4xl">{summaryContent.qualitativeConclusion}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg shadow-2xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              <span>{copied ? '已复制' : '复制研判要旨'}</span>
            </button>
          </div>
        </div>

        {/* 关键要素网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 左侧：争点逻辑与举证脉络 */}
          <div className="p-4 rounded-xl border border-zinc-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>核心争议焦点与分析脉络</span>
              </h3>
              <button
                type="button"
                onClick={() => onScrollToModule('module-b1')}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
              >
                <span>跳转争点</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <ul className="space-y-2 text-xs text-zinc-600">
              {summaryContent.issuesContext.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-700 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 右侧：出庭与实务行动指引 */}
          <div className="p-4 rounded-xl border border-zinc-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>实务应对与出庭质证建议</span>
              </h3>
              <button
                type="button"
                onClick={() => onScrollToModule('module-b2')}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
              >
                <span>跳转要件</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <ul className="space-y-2 text-xs text-zinc-600">
              {summaryContent.trialDirectives.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-50 text-amber-700 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 底部：涉及法规与快捷直达模块 */}
        <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-zinc-400 font-mono text-[11px]">关键涉案规范:</span>
            {summaryContent.statutes.map((s, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono text-[11px] border border-zinc-200/60"
              >
                {s}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">快捷直达:</span>
            <button
              type="button"
              onClick={() => onScrollToModule('module-b1')}
              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-[11px] transition-colors"
            >
              争议焦点
            </button>
            <button
              type="button"
              onClick={() => onScrollToModule('module-b2')}
              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-[11px] transition-colors"
            >
              要件事实
            </button>
            <button
              type="button"
              onClick={() => onScrollToModule('module-b4')}
              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-[11px] transition-colors"
            >
              类案判例
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
