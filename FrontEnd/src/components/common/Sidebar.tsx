import React, { useState, useRef, useEffect } from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import { UserRole } from '../../types/lawAgent';
import {
  Scale,
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
      title: '查明工作台',
      items: [
        { id: 'workspace', label: 'Agent 工作台', icon: <Bot className="w-4 h-4" /> },
        { id: 'analysis', label: '案情深度分析', icon: <Scale className="w-4 h-4" /> },
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
      title: '台账管理',
      items: [{ id: 'cases', label: '案件台账列表', icon: <FolderOpen className="w-4 h-4" /> }],
    },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 bg-[#0c162d] border-r border-blue-950/60 flex flex-col justify-between transition-[width] duration-200 ease-in-out z-30 select-none overflow-x-hidden ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* 顶部区域：品牌、折叠按钮与新建操作 */}
      <div className="p-3 space-y-3">
        {/* 品牌与折叠操作区 */}
        {collapsed ? (
          <div className="flex flex-col items-center justify-center py-1">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="展开侧边栏"
              className="w-10 h-10 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-400/30 text-blue-200 hover:text-white flex items-center justify-center transition-colors duration-150 shadow-xs group active:scale-95 cursor-pointer"
            >
              <PanelLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-1 py-1">
            <div
              onClick={() => setCurrentView('cases')}
              className="flex items-center gap-2.5 cursor-pointer group min-w-0"
              title="返回案件台账"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/20 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Scale className="w-4 h-4 text-blue-200" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white tracking-tight block truncate">
                  涉外法查明Agent
                </span>
                <span className="text-[10px] text-blue-300/50 font-mono block -mt-0.5">
                  v0.7 · 域外法查明辅助 Agent
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              title="收起侧边栏"
              className="p-1.5 rounded-lg text-blue-300/60 hover:text-white hover:bg-white/10 transition-colors duration-150 shrink-0 cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 新建查明按钮 (Apple 风格蓝色强调胶囊) */}
        {!collapsed ? (
          <button
            onClick={() => setCurrentView('entry')}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors duration-150 shadow-sm shadow-blue-500/25 border border-blue-400/30 active:scale-[0.99] cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              <span>新建查明案情</span>
            </span>
            <kbd className="text-[10px] bg-blue-700/80 text-blue-100 px-1.5 py-0.2 rounded font-mono border border-blue-500/30">
              S0
            </kbd>
          </button>
        ) : (
          <button
            onClick={() => setCurrentView('entry')}
            title="新建查明案情 (S0)"
            className="w-10 h-10 mx-auto flex items-center justify-center text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors duration-150 shadow-sm shadow-blue-500/25 border border-blue-400/30 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* 当前活跃案件快速选择器 (带下拉切换) */}
        {!collapsed && currentCase && (
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setCasesMenuOpen(!casesMenuOpen)}
              className="px-2.5 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-xs cursor-pointer transition-all duration-150 backdrop-blur-md"
            >
              <div className="flex items-center justify-between text-[10px] text-blue-300/60 mb-0.5">
                <span>当前活跃案件</span>
                <span className="font-mono text-[10px] text-blue-300/70">{currentCase.mode}</span>
              </div>
              <div className="font-medium text-white flex items-center justify-between">
                <span className="truncate font-mono">{currentCase.case_id}</span>
                <ChevronDown className="w-3 h-3 text-blue-300/60 shrink-0 ml-1" />
              </div>
            </div>

            {casesMenuOpen && (
              <div className="absolute left-0 mt-1 w-full bg-[#0d1833] rounded-xl border border-blue-800/40 shadow-2xl py-1.5 z-50 text-xs backdrop-blur-xl">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-blue-300/60 uppercase tracking-wider border-b border-blue-900/40">
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
                        className={`px-2.5 py-1.5 flex items-center justify-between gap-1.5 hover:bg-white/5 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-600/30 font-semibold text-white border-l-2 border-blue-400' : 'text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs block truncate text-slate-100">{c.case_id}</span>
                          <span className="text-[10px] text-blue-200/50 truncate block">
                            {c.title}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-blue-400 shrink-0" />}
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
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-blue-300/40">
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
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <span className={isActive ? 'text-white' : 'text-blue-200/60'}>
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
      <div className="p-3 border-t border-blue-900/40 bg-[#091122]/60 space-y-2.5">
        {/* 角色切换 (Segmented Control - Apple 磨砂风格) */}
        {!collapsed ? (
          <div>
            <div className="text-[10px] font-semibold text-blue-300/40 uppercase tracking-wider px-1 mb-1">
              操作角色
            </div>
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-black/30 border border-white/10 rounded-lg text-[11px] backdrop-blur-md">
              {(['practitioner', 'judicial', 'public'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-1 rounded-md transition-all duration-150 text-center font-medium ${
                    role === r
                      ? 'bg-white/20 text-white shadow-xs font-semibold border border-white/15 backdrop-blur-sm'
                      : 'text-slate-400 hover:text-slate-200'
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
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-blue-200">
              {roleConfigs[role].icon}
            </div>
          </div>
        )}

        {/* 快照与合规指示 */}
        {!collapsed ? (
          <div className="px-1 text-[11px] text-blue-300/40 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-blue-300/40" />
              <span className="truncate max-w-[120px]">
                {currentCase?.snapshot_id || '20261008-gii'}
              </span>
            </span>
            <span className="text-[10px] bg-white/5 px-1 py-0.2 rounded border border-white/10 text-blue-200/60">
              WAL只读
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  );
};

