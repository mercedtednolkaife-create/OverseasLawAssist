import React, { useState, useRef, useEffect } from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import {
  FolderOpen,
  Download,
  BookOpen,
  ChevronDown,
  Check,
  Briefcase,
  Gavel,
  Globe,
  SlidersHorizontal,
  ExternalLink,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';

interface TopBarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ collapsed, onToggleCollapse }) => {
  const {
    currentView,
    setCurrentView,
    currentCase,
    casesList,
    loadCase,
    role,
    isDrawerOpen,
    setIsDrawerOpen,
    showToast,
  } = useApp();

  const [caseMenuOpen, setCaseMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCaseMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const viewTitles: Record<ActiveView, string> = {
    cases: '案件台账列表',
    entry: 'S0 案情要素与法源参数录入',
    workspace: 'Agent 工作台 (Multi-Agent 协同流与法律追问)',
    review: '双语查明报告与审阅留痕 (解释二规范)',
    analysis: '案情深度分析 (争点·要件·证据链·类案)',
    dashboard: '可核验计数校验仪表盘',
    search: '域外法律法规与判例检索库',
    verification: '当事人外国法材料核验',
    consults: '专家会商流转与资质管理',
  };

  const roleLabels = {
    practitioner: '实务专业端',
    judicial: '司法辅助端',
    public: '公共服务端',
  };

  const handleSelectCase = async (id: string) => {
    setCaseMenuOpen(false);
    const success = await loadCase(id);
    if (success) {
      showToast(`已切换至案件 ${id}`, 'info');
    }
  };

  return (
    <header className="h-12 glass-panel border-b border-zinc-200/80 px-5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
      {/* 左侧：边栏折叠开关、面包屑与案件即时切换器 */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 min-w-0">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            className="p-1.5 -ml-1.5 mr-0.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80 transition-colors duration-150 cursor-pointer shrink-0"
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}

        <button
          onClick={() => setCurrentView('cases')}
          className="hover:text-zinc-900 transition-colors duration-150 flex items-center gap-1.5 shrink-0 font-medium"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>案件</span>
        </button>
        <span className="text-zinc-300">/</span>

        {/* 快速案件下拉切换菜单 */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setCaseMenuOpen(!caseMenuOpen)}
            className="flex items-center gap-1.5 font-mono text-zinc-800 hover:text-zinc-950 px-2 py-0.5 rounded-lg hover:bg-zinc-100/90 transition-all duration-150 truncate max-w-[220px] border border-zinc-200/60 bg-white/60 shadow-2xs"
            title="点击切换当前案件"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span className="truncate font-semibold">{currentCase?.case_id || '未选择案件'}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
          </button>

          {caseMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-72 glass-panel-elevated rounded-xl border border-zinc-200/90 shadow-elevation-3 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                切换案件工作台
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {casesList.map((c) => {
                  const isCurrent = c.case_id === currentCase?.case_id;
                  return (
                    <button
                      key={c.case_id}
                      onClick={() => handleSelectCase(c.case_id)}
                      className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 transition-colors duration-150 ${
                        isCurrent ? 'bg-zinc-100 font-semibold text-zinc-900' : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">{c.case_id}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans ${
                            c.status === 'completed'
                              ? 'bg-zinc-200 text-zinc-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {c.status === 'completed' ? '已就绪' : '中断确认'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {c.title}
                        </p>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-zinc-900 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
              <div className="p-2 border-t border-zinc-100">
                <button
                  onClick={() => {
                    setCaseMenuOpen(false);
                    setCurrentView('entry');
                  }}
                  className="w-full text-center py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-xs"
                >
                  + 新建查明案情
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="text-zinc-300">/</span>
        <span className="font-semibold text-zinc-900 truncate">
          {viewTitles[currentView]}
        </span>
      </div>

      {/* 右侧：状态指示与快捷操作 */}
      <div className="flex items-center gap-2.5 shrink-0 text-xs">
        {/* 工作流运行中动态指示 */}
        {currentCase?.status === 'running' && (
          <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            <span>工作流执行中 · {currentCase.current_node || '推理推进'}</span>
          </span>
        )}

        {/* 角色标识徽标 */}
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200 text-[11px] font-medium hidden sm:inline-flex items-center gap-1">
          {roleLabels[role]}
        </span>

        {/* 权威法源抽屉开关按钮 (Drawer Trigger) */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-150 border cursor-pointer ${
            isDrawerOpen
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
          title="打开/关闭右侧权威法源对照窗"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>法源对照窗</span>
          {isDrawerOpen && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </button>
      </div>
    </header>
  );
};
