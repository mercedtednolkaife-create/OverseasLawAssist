import React, { useState } from 'react';
import {
  Swords,
  Shield,
  ShieldAlert,
  Scale,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Flame,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { StrategicAssessment, OutcomeBranch, RedTeamDefense } from '../../types/lawAgent';

interface CaseStrategicAssessmentCardProps {
  strategicAssessment?: StrategicAssessment;
  isUS: boolean;
  openLawDrawer: (refId: string) => void;
  openLawModal?: (law: string, enbez: string) => void;
}

export const CaseStrategicAssessmentCard: React.FC<CaseStrategicAssessmentCardProps> = ({
  strategicAssessment,
  isUS,
  openLawDrawer,
  openLawModal,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'playbook' | 'checklist'>('matrix');
  const [expandedDefenseId, setExpandedDefenseId] = useState<string | null>('D1');
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});
  const [copiedActionIndex, setCopiedActionIndex] = useState<number | null>(null);
  const [isCardCollapsed, setIsCardCollapsed] = useState<boolean>(false);

  if (!strategicAssessment) {
    return null;
  }

  const { pivotal_factors, outcome_branches, red_team_defenses, actionable_checklist } =
    strategicAssessment;

  const toggleActionCheck = (idx: number) => {
    setCheckedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopyAction = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedActionIndex(idx);
    setTimeout(() => setCopiedActionIndex(null), 2000);
  };

  const getBranchBadge = (type: OutcomeBranch['branch_type']) => {
    switch (type) {
      case 'favorable':
        return {
          label: '充分胜诉倾向 · 低风险',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          dotClass: 'bg-emerald-500',
        };
      case 'unfavorable':
        return {
          label: '驳回失权风险 · 高风险',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
          dotClass: 'bg-rose-500',
        };
      case 'uncertain':
      default:
        return {
          label: '摇摆突破路径 · 中风险',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dotClass: 'bg-amber-500',
        };
    }
  };

  const getLethalBadge = (index: RedTeamDefense['lethal_index']) => {
    switch (index) {
      case 'critical':
        return {
          label: '致命威胁 (Critical)',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
        };
      case 'high':
        return {
          label: '高威胁 (High)',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
        };
      default:
        return {
          label: '中等威胁 (Medium)',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-medium',
        };
    }
  };

  return (
    <section
      id="module-strategy"
      className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden transition-all duration-200"
    >
      {/* 模块头部条 */}
      <div className="px-6 py-4 bg-zinc-50/70 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-xs">
            03
          </span>
          <div>
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              动态胜败边界推演与红队攻防对抗手册
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              客观假定条件推演矩阵 · 对方关键抗辩预测与反制策略
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCardCollapsed(!isCardCollapsed)}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            title={isCardCollapsed ? '展开模块' : '收起模块'}
          >
            {isCardCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCardCollapsed && (
        <div className="p-6 space-y-6">
          {/* 客观中立原则警示条 */}
          <div className="rounded-lg bg-blue-50/60 border border-blue-100/90 p-3.5 flex items-start gap-3 text-xs text-zinc-700">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-semibold text-zinc-900">【客观中立原则与司法裁量防线】</span>
              <p className="text-zinc-600 text-[11px]">
                根据最高人民法院涉外商事审判指导规范，严禁输出虚假单一定量胜诉率承诺。系统采用严格的
                <strong className="text-zinc-800">“假定事实条件推演句式（If-Then 矩阵）”</strong>
                与红队极端对抗视角，助办案律师精准预判法官心证分水岭并提前补强证据链。
              </p>
            </div>
          </div>

          {/* 胜败摇摆关键变量 / 心证分水岭 (Pivotal Factors) */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wide">
              <Compass className="w-4 h-4 text-blue-600" />
              <span>胜败摇摆关键变量 · 法官心证分水岭</span>
              <span className="text-[11px] font-normal text-zinc-400">
                (直接决定裁判走向的 3 大实质要件)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {pivotal_factors.map((factor, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-zinc-200/90 bg-zinc-50/40 hover:bg-white hover:border-blue-200 hover:shadow-2xs transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 font-semibold">
                    <span className="text-blue-600">分水岭变量 #{idx + 1}</span>
                    <Scale className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <p className="text-xs text-zinc-800 font-medium leading-relaxed">{factor}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 切换子选项卡 */}
          <div className="flex items-center gap-2 border-b border-zinc-200 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'matrix'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>动态胜败边界推演矩阵 ({outcome_branches.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('playbook')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'playbook'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>红队攻防对抗手册 ({red_team_defenses.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'checklist'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>关键调取补证与防御布局清单 ({actionable_checklist.length})</span>
            </button>
          </div>

          {/* Tab 1: 动态胜败边界推演矩阵 */}
          {activeTab === 'matrix' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {outcome_branches.map((branch, idx) => {
                const badge = getBranchBadge(branch.branch_type);
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-200 bg-white p-4.5 space-y-3.5 hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* 标头 */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">分支 #{idx + 1}</span>
                      </div>

                      <h3 className="text-xs font-bold text-zinc-900 leading-snug">{branch.title}</h3>

                      {/* 假定事实条件 (Condition Precedent) */}
                      <div className="rounded-lg bg-zinc-50 p-2.5 border border-zinc-100 space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          假定事实前提 (Condition Precedent)
                        </div>
                        <p className="text-[11px] text-zinc-800 leading-relaxed font-medium">
                          {branch.condition_precedent}
                        </p>
                      </div>

                      {/* 适用法条与先例 */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          规范法源与司法判例
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {branch.substantive_basis.map((basis, bIdx) => (
                            <button
                              key={bIdx}
                              type="button"
                              onClick={() => openLawDrawer(basis)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/60 transition-colors"
                              title="点击查看法典条文与判例全文"
                            >
                              <span>{basis}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 所需关键证据 */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          关键举证证据链
                        </div>
                        <ul className="space-y-1">
                          {branch.key_evidence_required.map((ev, eIdx) => (
                            <li
                              key={eIdx}
                              className="text-[11px] text-zinc-600 flex items-start gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0 mt-1.5" />
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 裁判倾向推演 */}
                    <div className="pt-2 border-t border-zinc-100">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        裁判心证推演 (严守条件句)
                      </div>
                      <p className="text-xs text-zinc-800 font-medium leading-relaxed bg-zinc-50/80 p-2.5 rounded-lg border border-zinc-200/60">
                        {branch.outcome_summary}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: 红队攻防对抗手册 (对方三大致命抗辩与反制武器) */}
          {activeTab === 'playbook' && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-500 flex items-center justify-between">
                <span>
                  本手册全面拆解对方大律师在庭审或仲裁中最具杀伤力的三大抗辩切入点，并为我方提供法定反制武器与判例盾牌：
                </span>
                <span className="text-[11px] text-zinc-400">点击卡片展开反制推演</span>
              </div>

              <div className="space-y-3">
                {red_team_defenses.map((defense) => {
                  const lethal = getLethalBadge(defense.lethal_index);
                  const isExpanded = expandedDefenseId === defense.defense_id;

                  return (
                    <div
                      key={defense.defense_id}
                      className="rounded-xl border border-zinc-200 bg-white overflow-hidden transition-all shadow-2xs"
                    >
                      {/* 抗辩卡片标题栏 */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDefenseId(isExpanded ? null : defense.defense_id)
                        }
                        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-zinc-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center text-xs font-mono font-bold shrink-0">
                            {defense.defense_id}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] border ${lethal.badgeClass}`}
                              >
                                {lethal.label}
                              </span>
                              <span className="text-xs text-zinc-500 font-normal">
                                法源依据：{defense.opposing_basis}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-zinc-900 mt-1 truncate">
                              {defense.opposing_claim}
                            </h4>
                          </div>
                        </div>

                        <div className="shrink-0 text-zinc-400">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {/* 展开的攻防对抗详情 */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-zinc-100 bg-zinc-50/30 grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* 我方反制依据与裁判武器 */}
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                              <Shield className="w-3.5 h-3.5 text-emerald-600" />
                              <span>我方反制武器 · 先例盾牌与除外规则</span>
                            </div>
                            <div className="space-y-2">
                              {defense.counter_weapons.map((weapon, wIdx) => (
                                <div
                                  key={wIdx}
                                  className="p-2.5 rounded-lg bg-emerald-50/40 border border-emerald-100 text-xs text-zinc-800 leading-relaxed font-medium flex items-start gap-2"
                                >
                                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                    {wIdx + 1}
                                  </span>
                                  <span>{weapon}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 事实反驳突破口与关键调取补证清单 */}
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                <span>事实反驳突破口</span>
                              </div>
                              <p className="text-xs text-zinc-800 leading-relaxed bg-white p-2.5 rounded-lg border border-zinc-200">
                                {defense.factual_counter_point}
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>针对该抗辩之下一步关键调取证据清单</span>
                              </div>
                              <ul className="space-y-1.5 bg-white p-2.5 rounded-lg border border-zinc-200">
                                {defense.evidence_checklist.map((item, eIdx) => (
                                  <li
                                    key={eIdx}
                                    className="text-[11px] text-zinc-700 flex items-start gap-2"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: 下一步关键调取补证与防御布局清单 */}
          {activeTab === 'checklist' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>
                  以下为策略推演 Agent 根据本案法律漏洞梳理的实务调取补证清单，支持办案律师勾选核销与一键复制：
                </span>
                <span className="text-[11px] text-blue-600 font-medium">
                  已核验 {Object.values(checkedActions).filter(Boolean).length} /{' '}
                  {actionable_checklist.length} 项
                </span>
              </div>

              <div className="space-y-2">
                {actionable_checklist.map((action, idx) => {
                  const isChecked = Boolean(checkedActions[idx]);
                  const isCopied = copiedActionIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isChecked
                          ? 'bg-zinc-50/90 border-zinc-200 text-zinc-400 line-through'
                          : 'bg-white border-zinc-200 hover:border-blue-300 text-zinc-800'
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleActionCheck(idx)}
                          className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 shrink-0"
                        />
                        <span className="text-xs font-medium leading-relaxed select-none">
                          {action}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleCopyAction(action, idx)}
                        className="text-zinc-400 hover:text-blue-600 p-1 rounded hover:bg-zinc-100 transition-colors shrink-0"
                        title="复制该项行动内容"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
