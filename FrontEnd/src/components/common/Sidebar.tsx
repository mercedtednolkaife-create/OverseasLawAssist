import React, { useState, useRef, useEffect } from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import { UserRole } from '../../types/lawAgent';
import {
  Layers,
  FolderOpen,
  FileSearch,
  Activity,
  Search,
  ShieldCheck,
  Users,
  Plus,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  Database,
  Briefcase,
  Gavel,
  Globe,
  Check,
  BookOpen,
  Bot,
  Compass,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const {
    role,
    setRole,
    currentView,
    setCurrentView,
    currentCase,
    casesList,
    loadCase,
    showToast,
    openCaseEntryModal,
  } = useApp();

  const [casesMenuOpen, setCasesMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCasesMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleConfigs: Record<UserRole, { name: string; short: string; icon: React.ReactNode }> = {
    practitioner: {
      name: '实务专业端',
      short: '实务端',
      icon: <Briefcase className="w-3.5 h-3.5" />,
    },
    judicial: {
      name: '司法辅助端',
      short: '司法端',
      icon: <Gavel className="w-3.5 h-3.5" />,
    },
    public: {
      name: '公共服务端',
      short: '公共端',
      icon: <Globe className="w-3.5 h-3.5" />,
    },
  };

  const navGroups: Array<{
    title: string;
    items: Array<{ id: ActiveView; label: string; icon: React.ReactNode; hidden?: boolean }>;
  }> = [
    {
      title: '主导航',
      items: [
        { id: 'home', label: '查明 Agent 主页', icon: <Compass className="w-4 h-4" /> },
      ],
    },
    {
      title: '查明工作台',
      items: [
        { id: 'analysis', label: '案情深度分析', icon: <Layers className="w-4 h-4" /> },
        { id: 'workspace', label: '查明Agent咨询', icon: <Bot className="w-4 h-4" /> },
        { id: 'review', label: '双语报告与核验', icon: <FileSearch className="w-4 h-4" /> },
        { id: 'dashboard', label: '可核验计数仪表盘', icon: <Activity className="w-4 h-4" /> },
      ],
    },
    {
      title: '检索与工具',
      items: [
        { id: 'search', label: '域外法律检索库', icon: <Search className="w-4 h-4" /> },
        {
          id: 'verification',
          label: '当事人材料核验',
          icon: <ShieldCheck className="w-4 h-4" />,
          hidden: role === 'public',
        },
        {
          id: 'consults',
          label: '专家会商流转',
          icon: <Users className="w-4 h-4" />,
          hidden: role === 'public',
        },
      ],
    },
    {
      title: '历史与归档',
      items: [{ id: 'cases', label: '历史查明案件', icon: <FolderOpen className="w-4 h-4" /> }],
    },
  ];

  return (
    <aside
      className={`h-[calc(100vh-1.5rem)] sticky top-3 my-3 ml-3 rounded-[28px] apple-sidebar-panel flex flex-col justify-between transition-[width] duration-200 ease-in-out z-30 select-none overflow-x-hidden ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* 顶部区域：品牌、折叠按钮与新建操作 */}
      <div className="p-3.5 space-y-3">
        {/* 品牌与折叠操作区 */}
        {collapsed ? (
          <div className="flex flex-col items-center justify-center py-1">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="展开侧边栏"
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 flex items-center justify-center transition-colors duration-150 shadow-2xs group active:scale-95 cursor-pointer"
            >
              <PanelLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-1 py-1">
            <div
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-2.5 cursor-pointer group min-w-0"
              title="返回查明 Agent 主页"
            >
              <div className="w-7 h-7 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 tracking-tight block truncate group-hover:text-blue-600 transition-colors">
                  涉外法查明Agent
                </span>
                <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">
                  v2.0 · Apple VIA 架构
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              title="收起侧边栏"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150 shrink-0 cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 新建查明按钮 (Apple 风格蓝色胶囊) */}
        {!collapsed ? (
          <button
            onClick={openCaseEntryModal}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-150 shadow-sm shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              <span>新建查明案情</span>
            </span>
            <kbd className="text-[10px] bg-blue-700 text-blue-100 px-1.5 py-0.2 rounded-md font-mono border border-blue-500/40">
              S0
            </kbd>
          </button>
        ) : (
          <button
            onClick={openCaseEntryModal}
            title="新建查明案情 (S0)"
            className="w-10 h-10 mx-auto flex items-center justify-center text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-all duration-150 shadow-sm shadow-blue-500/25 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* 当前活跃案件快速选择器 (带下拉切换) */}
        {!collapsed && currentCase && (
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setCasesMenuOpen(!casesMenuOpen)}
              className="px-3 py-2 bg-slate-100/70 hover:bg-slate-100 rounded-xl border border-slate-200/60 text-xs cursor-pointer transition-all duration-150"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                <span>当前活跃案件</span>
                <span className="font-mono text-[10px] text-slate-500">{currentCase.mode}</span>
              </div>
              <div className="font-semibold text-slate-900 flex items-center justify-between">
                <span className="truncate font-mono">{currentCase.case_id}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
              </div>
            </div>

            {casesMenuOpen && (
              <div className="absolute left-0 mt-1 w-full bg-white/95 rounded-2xl border border-slate-200/80 shadow-xl py-1.5 z-50 text-xs backdrop-blur-xl">
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  快速切换案件
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {casesList.map((c) => {
                    const isSelected = c.case_id === currentCase.case_id;
                    return (
                      <div
                        key={c.case_id}
                        onClick={async () => {
                          if (currentCase?.status === 'running' && c.case_id !== currentCase.case_id) {
                            showToast('当前案件正在执行协同研判，请稍候再切换', 'warning');
                            return;
                          }
                          setCasesMenuOpen(false);
                          const success = await loadCase(c.case_id);
                          if (success) {
                            showToast(`已切换至案件 ${c.case_id}`, 'info');
                          }
                        }}
                        className={`px-3 py-2 flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 font-semibold text-blue-700 border-l-2 border-blue-600' : 'text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs block truncate text-slate-900">{c.case_id}</span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {c.title}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 中部导航区：信息架构 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items
                .filter((item) => !item.hidden)
                .map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* 底部系统与角色控制面板 */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
        {/* 角色切换 (Segmented Control - Apple 磨砂风格) */}
        {!collapsed ? (
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1">
              操作角色
            </div>
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-200/70 rounded-xl text-[11px]">
              {(['practitioner', 'judicial', 'public'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-1 rounded-lg transition-all duration-150 text-center font-medium cursor-pointer ${
                    role === r
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={roleConfigs[r].name}
                >
                  {roleConfigs[r].short}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={`当前角色：${roleConfigs[role].name}`}>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              {roleConfigs[role].icon}
            </div>
          </div>
        )}

        {/* 快照与合规指示 */}
        {!collapsed ? (
          <div className="px-1 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[120px]">
                {currentCase?.snapshot_id || '20261008-gii'}
              </span>
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/60 font-sans font-medium">
              在线
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  );
};
