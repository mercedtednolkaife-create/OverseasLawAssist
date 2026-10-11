import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { Statement, Evidence, ReviewErrorType, SearchTraceItem } from '../../types/lawAgent';
import { GradeBadge } from '../common/GradeBadge';
import { CisgGateModal } from '../cases/CisgGateModal';
import { DecompositionModal } from '../cases/DecompositionModal';
import {
  FileText,
  ExternalLink,
  Check,
  Edit3,
  X,
  MessageSquarePlus,
  Download,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  BookOpen,
  Scale,
} from 'lucide-react';

export const ReportReviewView: React.FC = () => {
  const { currentCase, refreshCurrentCase, showToast, setCurrentView, openLawModal } = useApp();

  const [activeTab, setActiveTab] = useState<'side_by_side' | 'matrix' | 'trace'>('side_by_side');
  const [selectedEid, setSelectedEid] = useState<string | null>('E1');
  const [editingSid, setEditingSid] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editErrorType, setEditErrorType] = useState<ReviewErrorType>('translation');
  const [editNote, setEditNote] = useState('');
  const [followupText, setFollowupText] = useState('');
  const [showFollowup, setShowFollowup] = useState(false);
  const [showCisgModal, setShowCisgModal] = useState(false);
  const [showDecompModal, setShowDecompModal] = useState(false);
  const [traces, setTraces] = useState<SearchTraceItem[]>([]);
  const [exporting, setExporting] = useState(false);

  const allStatements = useMemo(
    () => (currentCase?.findings || []).flatMap((f) => f.statements || []),
    [currentCase?.findings]
  );
  const evidenceList = useMemo(
    () => Object.values(currentCase?.evidence || {}),
    [currentCase?.evidence]
  );
  const selectedEvidence: Evidence | undefined = useMemo(
    () => (selectedEid ? currentCase?.evidence?.[selectedEid] : evidenceList[0]),
    [selectedEid, currentCase?.evidence, evidenceList]
  );

  if (!currentCase) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-3">
        <p className="text-zinc-500 text-xs">请先在案件列表中选择或录入一个查明案件。</p>
        <button
          onClick={() => setCurrentView('cases')}
          className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
        >
          查看案件台账
        </button>
      </div>
    );
  }

  const handleSelectStatement = (st: Statement) => {
    if (st.evidence_ids && st.evidence_ids.length > 0) {
      setSelectedEid(st.evidence_ids[0]);
    }
  };

  const handleReviewAction = async (
    sid: string,
    action: 'accept' | 'edit' | 'reject',
    errorType?: ReviewErrorType,
    note?: string,
    updatedText?: string
  ) => {
    try {
      await lawAgentApi.updateStatementReview(
        currentCase.case_id,
        sid,
        action,
        errorType,
        note,
        updatedText
      );
      await refreshCurrentCase();
      showToast(
        action === 'accept' ? '已采纳该条查明陈述' : action === 'edit' ? '已保存修改并留痕' : '已标记拒绝该陈述',
        'info'
      );
      setEditingSid(null);
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const handleFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupText.trim()) return;
    try {
      await lawAgentApi.followupQuestion(currentCase.case_id, followupText.trim());
      await refreshCurrentCase();
      showToast('追加待查明问题已成功登记', 'success');
      setFollowupText('');
      setShowFollowup(false);
    } catch (err: any) {
      showToast(err.message || '追加问题失败', 'error');
    }
  };

  const handleExport = async (format: 'docx' | 'md' | 'json') => {
    setExporting(true);
    try {
      const reportVer = currentCase.dashboard?.report_version || 1;
      const contentHash = currentCase.dashboard?.content_hash || '';
      const filename = `German_Law_Report_${currentCase.case_id}_v${reportVer}.${format}`;

      if (format === 'docx') {
        const blob = await lawAgentApi.exportDocx(currentCase.case_id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`已生成并下载最高院标准 Word 报告 ${filename}`, 'success');
      } else {
        const content =
          format === 'json'
            ? JSON.stringify(currentCase, null, 2)
            : `# 德意志联邦法域外法查明材料包 (解释二规范报告)\n\n案件编号: ${currentCase.case_id}\n快照版本: ${currentCase.snapshot_id}\n生成时间: ${currentCase.updated_at}\n\n## 一、法源具体规定与德汉对照\n${Object.values(currentCase.evidence || {})
                .map((e) => `### ${e.ref_id}\n原文: ${e.text_de}\n译文: ${currentCase.translations?.[e.eid] || ''}\n来源: ${e.source_url}\n`)
                .join('\n')}\n\n## 二、核心查明陈述\n${(currentCase.findings || [])
                .flatMap((f) => f.statements || [])
                .map((s) => `- [${s.grade}级] ${s.text_zh} (出处: ${(s.evidence_ids || []).join(',')})`)
                .join('\n')}\n\n---\nAI辅助生成 · 须经人工与专家复核 · 不预测裁判结果 · 内容哈希: ${contentHash}`;

        const blob = new Blob([content], {
          type: format === 'json' ? 'application/json' : 'text/markdown',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`已生成并下载 ${filename}`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || '报告生成导出失败', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      {/* 顶部案件基本信息与查明状态卡片 (Linear / Claude 风格，白底带冷蓝微强调条) */}
      <div className="bg-white rounded-xl border border-zinc-200/90 shadow-xs relative overflow-hidden transition-all">
        {/* 左侧专业冷蓝强调条 */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />

        <div className="p-5 pl-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs px-2 py-0.5 bg-zinc-100 text-zinc-700 font-semibold rounded border border-zinc-200/80">
                [{currentCase.case_id}]
              </span>
              <h1 className="text-base font-bold text-zinc-900 tracking-tight">
                {(currentCase.meta?.parties && currentCase.meta.parties.length > 0
                  ? currentCase.meta.parties.join(' vs ')
                  : null) ||
                  currentCase.meta?.contract_type ||
                  '涉德跨境商事合同与履行瑕疵争议'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                双语报告与审阅 (Review Canvas)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span>当事人: {currentCase.meta?.parties?.join(' vs ') || '中国卖方 vs 德国买方'}</span>
              <span>·</span>
              <span>准据法: {currentCase.meta?.choice_of_law || '德国实体法'}</span>
              <span>·</span>
              <span className="font-mono text-[11px]">快照库: {currentCase.snapshot_id}</span>
              <span>·</span>
              <span>CISG排除: {currentCase.meta?.cisg_excluded ? '已明示排除' : '待确认'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setCurrentView('analysis')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>切换至案情深度分析包</span>
            </button>
          </div>
        </div>
      </div>

      {/* 闸门中断警示条 (严格符合 zinc + amber 风格) */}
      {currentCase.status === 'paused_cisg' && (
        <div className="p-3.5 bg-amber-50/80 rounded-lg border border-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>S2 国际私法闸门中断：</strong>
              本案尚未确认是否明示排除《联合国国际货物销售合同公约》(CISG)。依国际私法优先规则，需先确认公约排除状态。
            </span>
          </div>
          <button
            onClick={() => setShowCisgModal(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shrink-0 shadow-2xs"
          >
            立即确认 CISG
          </button>
        </div>
      )}

      {currentCase.status === 'paused_s3' && (
        <div className="p-3.5 bg-zinc-100/90 rounded-lg border border-zinc-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-900">
            <Clock className="w-4 h-4 text-zinc-600 shrink-0" />
            <span>
              <strong>S3 争点需求单中断：</strong>
              争点拆解与待查明问题已初步就绪，请人工核验争议事实标记及德语检索式。
            </span>
          </div>
          <button
            onClick={() => setShowDecompModal(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shrink-0 shadow-2xs"
          >
            核验争点需求单
          </button>
        </div>
      )}

      {/* 头部控制区：视图 Tab 切换与操作按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        {/* 左侧 Segmented Control */}
        <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('side_by_side')}
            className={`px-3 py-1.5 rounded-md transition-colors duration-150 font-medium ${
              activeTab === 'side_by_side'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            并排比对视图 (Canvas)
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-md transition-colors duration-150 font-medium ${
              activeTab === 'matrix'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            要件—证据矩阵
          </button>
          <button
            onClick={async () => {
              setActiveTab('trace');
              const t = await lawAgentApi.getSearchTraces(currentCase.case_id);
              setTraces(t);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors duration-150 font-medium ${
              activeTab === 'trace'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            检索轨迹回溯
          </button>
        </div>

        {/* 右侧动作条 */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowFollowup(!showFollowup)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors duration-150 shadow-xs"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-zinc-500" />
            <span>追加待查明问题</span>
          </button>

          {/* 导出按钮组合 */}
          <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-xs">
            <button
              onClick={() => handleExport('docx')}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition-colors duration-150 border-r border-zinc-200"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>导出材料包 (DOCX)</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              title="导出 JSON"
              className="px-2.5 py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors duration-150 border-r border-zinc-200"
            >
              JSON
            </button>
            <button
              onClick={() => handleExport('md')}
              title="导出 Markdown"
              className="px-2.5 py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors duration-150"
            >
              MD
            </button>
          </div>
        </div>
      </div>

      {/* 追加问题面板 */}
      {showFollowup && (
        <form
          onSubmit={handleFollowup}
          className="p-4 bg-white rounded-lg border border-zinc-200 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-900">
              追加待查明问题 (沿用当前快照沙箱，不影响已确认结果)
            </h4>
            <span className="text-[11px] text-zinc-400">最多可追加5项</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={followupText}
              onChange={(e) => setFollowupText(e.target.value)}
              placeholder="例如：若买方要求减少价款 (Minderung)，德国法计算公式及比例如何确定？"
              className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-zinc-50/50 focus:bg-white focus:outline-none focus:border-zinc-400"
            />
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              提交查明
            </button>
          </div>
        </form>
      )}

      {/* 视图1：并排比对视图 (Side-by-side Canvas) */}
      {activeTab === 'side_by_side' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 左侧：中文查明陈述与审阅采纳 (7列) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
              <span className="font-semibold text-zinc-900">
                中文查明陈述与认定依据 ({allStatements.length}条)
              </span>
              <span className="text-[11px] text-zinc-400">点击语句即可于右侧联动定位德语出处</span>
            </div>

            <div className="space-y-3">
              {allStatements.map((st) => {
                const isSelected = (st.evidence_ids || []).includes(selectedEid || '');
                const isEditing = editingSid === st.sid;

                return (
                  <div
                    key={st.sid}
                    onClick={() => handleSelectStatement(st)}
                    className={`p-4 rounded-xl border text-xs transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-white ring-2 ring-blue-500/15 shadow-xs'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    {/* 陈述头部：编号、等级、所属要件 */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-900">{st.sid}</span>
                        <GradeBadge grade={st.grade || 'A'} />
                        {st.element_id && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                            要件: {st.element_id}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400">
                          {st.part === 'A' ? 'A部·法规材料' : 'B部·咨询准备'}
                        </span>
                      </div>

                      {/* 审阅状态 */}
                      <div>
                        {st.review_action === 'accept' && (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                            已采纳
                          </span>
                        )}
                        {st.review_action === 'edit' && (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-200">
                            已修正
                          </span>
                        )}
                        {st.review_action === 'reject' && (
                          <span className="text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded text-[11px] font-medium border border-zinc-200">
                            已拒绝
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 正文或编辑模式 */}
                    {isEditing ? (
                      <div className="space-y-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          rows={3}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-zinc-500 block mb-0.5">
                              修改错误分类
                            </label>
                            <select
                              value={editErrorType}
                              onChange={(e) =>
                                setEditErrorType(e.target.value as ReviewErrorType)
                              }
                              className="w-full px-2 py-1 text-xs border border-zinc-300 rounded-lg bg-white"
                            >
                              <option value="translation">译文不准 (translation)</option>
                              <option value="citation">引注错误 (citation)</option>
                              <option value="missing_element">遗漏要件 (missing_element)</option>
                              <option value="overreach">过度推断 (overreach)</option>
                              <option value="comparative_pollution">
                                比较法污染 (comparative_pollution)
                              </option>
                              <option value="fact_error">事实认定偏差 (fact_error)</option>
                              <option value="other">其他问题 (other)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 block mb-0.5">
                              人工审改批注
                            </label>
                            <input
                              type="text"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              placeholder="说明修正理由..."
                              className="w-full px-2 py-1 text-xs border border-zinc-300 rounded-lg bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingSid(null)}
                            className="px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleReviewAction(
                                st.sid,
                                'edit',
                                editErrorType,
                                editNote,
                                editText
                              )
                            }
                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-xs"
                          >
                            保存修改并留痕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-zinc-800 leading-relaxed text-xs">
                        {st.text_zh}
                      </p>
                    )}

                    {/* 引证徽标与审阅操作 */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-zinc-400 text-[11px]">引用依据:</span>
                        {(st.evidence_ids || []).map((eid) => {
                          const ev = currentCase.evidence?.[eid];
                          return (
                            <div key={eid} className="inline-flex items-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEid(eid);
                                }}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors duration-150 ${
                                  selectedEid === eid
                                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                }`}
                              >
                                [{eid}] {ev?.ref_id || ''}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLawModal(eid);
                                }}
                                title="查阅法条全文"
                                className="p-1 text-zinc-400 hover:text-blue-600 transition-colors ml-0.5"
                              >
                                <BookOpen className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* 审阅按钮组 */}
                      {!isEditing && (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleReviewAction(st.sid, 'accept')}
                            title="采纳该条结论"
                            className="p-1 text-zinc-400 hover:text-emerald-600 rounded hover:bg-zinc-100 transition-colors duration-150"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSid(st.sid);
                              setEditText(st.text_zh);
                              setEditNote(st.review_note || '');
                              setEditErrorType(st.error_type || 'translation');
                            }}
                            title="修正陈述"
                            className="p-1 text-zinc-400 hover:text-blue-600 rounded hover:bg-zinc-100 transition-colors duration-150"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleReviewAction(
                                st.sid,
                                'reject',
                                'overreach',
                                '人工复核标记拒绝'
                              )
                            }
                            title="拒绝该条"
                            className="p-1 text-zinc-400 hover:text-rose-600 rounded hover:bg-zinc-100 transition-colors duration-150"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {st.review_note && (
                      <div className="mt-2 text-[11px] text-zinc-500 bg-zinc-50 p-1.5 rounded-md border border-zinc-200/60">
                        <strong>复核批注：</strong> {st.review_note} ({st.error_type})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右侧：德语官方原文与核验译文 (5列) */}
          <div className="lg:col-span-5 sticky top-16 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
              <span className="font-semibold text-zinc-900">德语官方原文与出处核验</span>
              <span className="font-mono text-[11px]">
                {selectedEvidence ? `[${selectedEvidence.eid}] ${selectedEvidence.ref_id}` : ''}
              </span>
            </div>

            {selectedEvidence ? (
              <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs">
                {/* 法律条款元数据 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-900">
                      {selectedEvidence.ref_id}
                    </span>
                    <GradeBadge grade={selectedEvidence.grade} />
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>
                      {selectedEvidence.kind === 'norm' ? '德意志联邦成文法规范' : '联邦最高法院权威判决'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openLawModal(selectedEvidence.eid)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-mono transition-colors text-[11px] font-semibold"
                      >
                        <BookOpen className="w-3 h-3" />
                        查阅法条
                      </button>
                      <a
                        href={selectedEvidence.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-600 hover:text-zinc-900 flex items-center gap-1 font-mono transition-colors"
                      >
                        官方网页
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* 德语官方原文代码块 */}
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Amtlicher Wortlaut (德语官方正文)
                  </label>
                  <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-900 font-mono leading-relaxed whitespace-pre-wrap">
                    {selectedEvidence.text_de}
                  </div>
                </div>

                {/* 机器翻译对照 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      忠实中译对照 (术语库约束)
                    </label>
                    <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded font-mono">
                      非官方译文
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 text-xs text-zinc-800 leading-relaxed">
                    {currentCase.translations?.[selectedEvidence.eid] || '正在检索忠实对齐译文...'}
                  </div>
                </div>

                {/* 效力与 Stand 标注 (解释二要素) */}
                <div className="p-2.5 bg-zinc-100/60 rounded-lg text-[11px] text-zinc-600 space-y-1 font-mono">
                  <div>
                    <strong>效力情况 (Stand)：</strong>{' '}
                    {selectedEvidence.stand || '官方最新现行文本'}
                  </div>
                  <div>
                    <strong>抓取时间：</strong> {selectedEvidence.fetched_at}
                  </div>
                  <div>
                    <strong>快照库标识：</strong> {currentCase.snapshot_id}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-lg border border-zinc-200 text-xs text-zinc-400">
                请在左侧点击任一条查明陈述以展开德文出处对照
              </div>
            )}
          </div>
        </div>
      )}

      {/* 视图2：要件—证据矩阵 (Element-Evidence Matrix) */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-700 grid grid-cols-12 gap-4">
            <span className="col-span-2">要件编号与名称</span>
            <span className="col-span-2">法源充分性 (S5)</span>
            <span className="col-span-3">关联法源证据 (E#)</span>
            <span className="col-span-2">改写检索轮次</span>
            <span className="col-span-3">证据链缺口说明 (Gaps)</span>
          </div>

          <div className="divide-y divide-zinc-200 text-xs">
            {(currentCase.elements || []).map((el) => (
              <div key={el.element_id} className="px-5 py-4 grid grid-cols-12 gap-4 items-start">
                <div className="col-span-2">
                  <span className="font-mono font-bold text-zinc-900 block">
                    [{el.element_id}]
                  </span>
                  <span className="text-zinc-800 font-medium block mt-0.5">
                    {el.name_zh}
                  </span>
                </div>

                <div className="col-span-2">
                  {el.status === 'covered' && (
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md font-medium border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      证据充分 (Covered)
                    </span>
                  )}
                  {el.status === 'partial' && (
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md font-medium border border-amber-200">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      部分支撑 (Partial)
                    </span>
                  )}
                  {el.status === 'missing' && (
                    <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md font-medium border border-rose-200">
                      <X className="w-3 h-3 text-rose-500" />
                      证据缺失 (Missing)
                    </span>
                  )}
                </div>

                <div className="col-span-3 space-y-1">
                  {(el.links || []).map((link) => {
                    const ev = currentCase.evidence?.[link.eid];
                    return (
                      <div
                        key={link.eid}
                        className="flex items-center gap-1.5 font-mono text-[11px]"
                      >
                        <button
                          type="button"
                          onClick={() => openLawModal(link.eid)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-semibold transition-colors"
                          title="查阅该法源全文"
                        >
                          {link.eid}
                        </button>
                        <span className="text-zinc-600 truncate">{ev?.ref_id}</span>
                        <span className="text-[10px] text-zinc-400">({link.relation})</span>
                      </div>
                    );
                  })}
                </div>

                <div className="col-span-2 text-[11px] font-mono text-zinc-600">
                  <span>已执行 {el.rounds} / 2 轮改写</span>
                </div>

                <div className="col-span-3 text-zinc-600 text-xs leading-relaxed">
                  {el.gap_note ? (
                    <span className="text-amber-800 bg-amber-50/60 p-1.5 rounded-md block border border-amber-200/50">
                      {el.gap_note}
                    </span>
                  ) : (
                    <span className="text-zinc-400">核心法条与判例齐备，无显著缺口</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 视图3：检索轨迹 (Search Trace) */}
      {activeTab === 'trace' && (
        <div className="bg-white rounded-lg border border-zinc-200 p-6 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-600" />
              检索轨迹与候选舍弃原因回溯 (可解释性审计)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              记录 Researcher 节点在德意志联邦法律库中混合检索 (BM25 + BGE-M3 + RRF 重排) 的每步执行轨迹
            </p>
          </div>

          <div className="space-y-3">
            {traces.map((tr) => (
              <div key={tr.step} className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-zinc-900">
                    Step {tr.step}: {tr.action}
                  </span>
                  <span className="text-zinc-500">命中候选数: {tr.hits_count}</span>
                </div>
                <div className="font-mono text-[11px] text-zinc-700 bg-white p-2 rounded-md border border-zinc-200">
                  Query: {tr.query}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-400 text-[11px]">入选证据:</span>
                  {(tr.selected_ref_ids || []).map((ref) => (
                    <span key={ref} className="font-mono bg-zinc-200 px-1.5 py-0.5 rounded text-[11px] font-medium text-zinc-800">
                      {ref}
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-zinc-500">
                  <strong>候选过滤/舍弃考量：</strong> {tr.discarded_notes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 闸门弹窗 */}
      <CisgGateModal isOpen={showCisgModal} onClose={() => setShowCisgModal(false)} />
      <DecompositionModal isOpen={showDecompModal} onClose={() => setShowDecompModal(false)} />
    </div>
  );
};
