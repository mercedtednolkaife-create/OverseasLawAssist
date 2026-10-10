import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { CaseSummary, CaseWorkflowStatus } from '../../types/lawAgent';
import {
  FolderOpen,
  Plus,
  Play,
  Trash2,
  Search,
  Clock,
  Database,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  FileText,
  Scale,
} from 'lucide-react';

export const CaseListView: React.FC = () => {
  const { role, setCurrentView, loadCase, showToast } = useApp();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await lawAgentApi.getCases(role);
      setCases(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast('获取案件列表失败', 'error');
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [role]);

  const handleDelete = async (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定彻底删除案件 [${caseId}] 吗？相关输入事实与血缘快照将被同步清理。`)) {
      return;
    }
    try {
      await lawAgentApi.deleteCase(caseId);
      showToast(`案件 ${caseId} 已安全清理`, 'success');
      fetchList();
    } catch (err) {
      showToast('删除案件失败', 'error');
    }
  };

  const handleSelectCase = async (caseId: string, targetView: 'review' | 'analysis' = 'review') => {
    const success = await loadCase(caseId);
    if (success) {
      setCurrentView(targetView);
    }
  };

  const getStatusBadge = (status: CaseWorkflowStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-zinc-900 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
            <CheckCircle2 className="w-3 h-3 text-zinc-700" />
            查明就绪 · 可导出
          </span>
        );
      case 'paused_cisg':
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
            <PauseCircle className="w-3 h-3 text-amber-600" />
            S2 待确认 CISG
          </span>
        );
      case 'paused_s3':
        return (
          <span className="inline-flex items-center gap-1.5 text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
            <PauseCircle className="w-3 h-3 text-zinc-500" />
            S3 待核验争点
          </span>
        );
      case 'paused_s8':
        return (
          <span className="inline-flex items-center gap-1.5 text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
            <PauseCircle className="w-3 h-3 text-zinc-700" />
            S8 待人工复核
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 text-zinc-700 bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded-md text-[11px] font-medium animate-pulse">
            <Clock className="w-3 h-3 text-zinc-500" />
            检索执行中...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md text-[11px]">
            草稿状态
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
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      {/* 头部标题与操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-zinc-700" />
            涉外查明案件台账
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            严格固定只读数据快照，保障查明每一步推导皆可精确复现
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索案号、案由或合同类型..."
              className="pl-8.5 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white w-64 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
            />
          </div>

          <button
            onClick={() => setCurrentView('entry')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建查明任务</span>
          </button>
        </div>
      </div>

      {/* 列表主体 (Linear 极简数据表格) */}
      {loading ? (
        <div className="p-16 text-center text-xs text-zinc-400 space-y-2 bg-white rounded-xl border border-zinc-200">
          <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mx-auto" />
          <p>正在读取案件台账...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-xl border border-zinc-200 space-y-3">
          <AlertCircle className="w-6 h-6 text-zinc-300 mx-auto" />
          <h3 className="text-xs font-semibold text-zinc-900">暂无符合条件的案件</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            点击“新建查明任务”，录入涉外案情客观事实，启动德意志联邦法智能查明流程。
          </p>
          <button
            onClick={() => setCurrentView('entry')}
            className="mt-2 px-3.5 py-1.5 text-xs font-medium text-zinc-900 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            录入第一起案件
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3 bg-zinc-50 text-xs font-semibold text-zinc-500 grid grid-cols-12 gap-4">
            <span className="col-span-4">案件编号与题名</span>
            <span className="col-span-2">合同类型 / 订立日</span>
            <span className="col-span-2">工作流状态</span>
            <span className="col-span-2">只读快照版本</span>
            <span className="col-span-2 text-right">操作</span>
          </div>

          {filteredCases.map((item) => (
            <div
              key={item.case_id}
              onClick={() => handleSelectCase(item.case_id, 'review')}
              className="px-5 py-3.5 hover:bg-zinc-50/80 transition-colors duration-150 grid grid-cols-12 gap-4 items-center cursor-pointer group"
            >
              <div className="col-span-4 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-zinc-900">
                    {item.case_id}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    · {item.mode}
                  </span>
                </div>
                <h4 className="text-xs font-medium text-zinc-800 mt-0.5 group-hover:text-zinc-950 truncate">
                  {item.title}
                </h4>
                <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                  <span>更新于 {item.updated_at}</span>
                  <span>·</span>
                  <span>{item.issues_count} 个争点</span>
                </div>
              </div>

              <div className="col-span-2 text-xs">
                <span className="font-medium text-zinc-800 block truncate">
                  {item.contract_type}
                </span>
                <span className="text-zinc-400 text-[11px] font-mono mt-0.5 block">
                  {item.contract_date || '未定'}
                </span>
              </div>

              <div className="col-span-2">{getStatusBadge(item.status)}</div>

              <div className="col-span-2 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-600 font-mono text-[11px]">
                  <Database className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{item.snapshot_id}</span>
                </div>
                <span className="text-[10px] text-zinc-400 block mt-0.5">固定只读快照</span>
              </div>

              <div className="col-span-2 flex items-center justify-end gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectCase(item.case_id, 'analysis');
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-md transition-colors duration-150"
                >
                  案情分析
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectCase(item.case_id, 'review');
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-150 flex items-center gap-1 shadow-2xs"
                >
                  审阅报告
                </button>
                <button
                  onClick={(e) => handleDelete(item.case_id, e)}
                  title="彻底删除案件"
                  className="p-1 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-zinc-100 transition-colors duration-150"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
