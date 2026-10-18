import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { CaseSummary, CaseWorkflowStatus } from '../../types/lawAgent';
import {
  FolderOpen,
  Plus,
  Trash2,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  ShieldCheck,
  ArrowRight,
  FileText,
} from 'lucide-react';

export const CaseListView: React.FC = () => {
  const { role, setCurrentView, loadCase, showToast, currentCase, openCaseEntryModal } = useApp();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await lawAgentApi.getCases(role);
      if (Array.isArray(data)) {
        setCases(data);
      }
    } catch {
      showToast('获取案件列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [role]);

  const handleDelete = async (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定彻底删除案件 [${caseId}] 吗？`)) {
      return;
    }
    try {
      await lawAgentApi.deleteCase(caseId);
      showToast(`案件 ${caseId} 已成功删除`, 'success');
      fetchList();
    } catch {
      showToast('删除案件失败', 'error');
    }
  };

  const handleSelectCase = async (caseId: string, targetView: 'review' | 'analysis' = 'analysis') => {
    if (currentCase?.status === 'running' && caseId !== currentCase.case_id) {
      showToast('当前案件正在执行协同研判，请稍候再切换', 'warning');
      return;
    }
    const success = await loadCase(caseId);
    if (success) {
      setCurrentView(targetView);
    }
  };

  const getStatusBadge = (status: CaseWorkflowStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2.5 py-0.5 rounded-lg text-xs font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
            <span>查明就绪</span>
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2.5 py-0.5 rounded-lg text-xs font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
            <span>推演中...</span>
          </span>
        );
      case 'paused_cisg':
      case 'paused_s3':
      case 'paused_s8':
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50/80 border border-amber-200/70 px-2.5 py-0.5 rounded-lg text-xs font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>待确认</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100/80 border border-slate-200/80 px-2.5 py-0.5 rounded-lg text-xs font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            <span>草稿</span>
          </span>
        );
    }
  };

  const safeCases = Array.isArray(cases) ? cases : [];
  const filteredCases = safeCases.filter(
    (c) =>
      c &&
      ((c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.case_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.contract_type || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="apple-page-pane max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* 头部标题与新建操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              历史查明案件
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              记录您过往查明的涉外案件，支持随时回顾深度法理分析与导出双语报告
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索案号、案由或合同类型..."
              className="pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white w-64 focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400 transition-all shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={openCaseEntryModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新建案件查明</span>
          </button>
        </div>
      </div>

      {/* 列表主体 (Apple Bento 卡片流) */}
      {loading ? (
        <div className="apple-bento-card rounded-[28px] p-16 text-center text-xs text-slate-400 space-y-3">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p>正在读取历史查明案件...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="apple-bento-card rounded-[28px] p-16 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">暂无符合条件的案件</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              点击“新建案件查明”，录入涉外案件事实要素与准据法，启动智能查明流程。
            </p>
          </div>
          <button
            type="button"
            onClick={openCaseEntryModal}
            className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs shadow-blue-500/25 cursor-pointer active:scale-[0.98]"
          >
            新建第一起案件
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredCases.map((item) => {
            const isUSCase =
              item.case_id === 'C004' ||
              (item.title || '').includes('UCC') ||
              (item.title || '').includes('美国');

            return (
              <div
                key={item.case_id}
                onClick={() => handleSelectCase(item.case_id, 'analysis')}
                className="group apple-bento-card rounded-[28px] hover:border-slate-300 p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2.5 flex-1 min-w-0">
                  {/* 顶栏徽标 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {item.case_id}
                    </span>
                    {isUSCase ? (
                      <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 rounded-lg font-medium">
                        🇺🇸 美国商事法 (UCC)
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 rounded-lg font-medium">
                        🇩🇪 德国联邦法
                      </span>
                    )}
                    {getStatusBadge(item.status)}
                  </div>

                  {/* 案件题名 */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-800 transition-colors leading-snug line-clamp-1">
                    {item.title}
                  </h3>

                  {/* 案情副信息 */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{item.contract_type}</span>
                    <span className="text-slate-300">·</span>
                    <span>{item.contract_date ? `订立日 ${item.contract_date}` : '合同订立日未定'}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-slate-700">{item.issues_count} 项争议焦点</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400 font-mono">更新于 {item.updated_at?.slice(0, 10)}</span>
                  </div>
                </div>

                {/* 右侧操作按钮 */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectCase(item.case_id, 'analysis');
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all shadow-2xs hover:border-slate-300 active:scale-[0.98] cursor-pointer"
                  >
                    案情深度分析
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectCase(item.case_id, 'review');
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs shadow-blue-500/25 cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
                  >
                    <span>查阅双语报告</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.case_id, e)}
                    title="删除案件"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
