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
      className={`h-screen sticky top-0 bg-white border-r border-zinc-200 flex flex-col justify-between transition-all duration-200 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* 顶部区域：品牌、折叠按钮与新建操作 */}
      <div className="p-3 space-y-3">
        {/* 品牌行 */}
        <div className="flex items-center justify-between gap-2 px-1 py-1">
          <div
            onClick={() => setCurrentView('cases')}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Scale className="w-4 h-4 text-blue-200" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-xs font-semibold text-zinc-900 tracking-tight block truncate">
                  涉外法查明Agent
                </span>
                <span className="text-[10px] text-zinc-400 font-mono block -mt-0.5">
                  v0.7 · 域外法查明辅助 Agent
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors duration-150 shrink-0"
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 新建查明按钮 (Linear 风格，采用冷蓝强调) */}
        {!collapsed ? (
          <button
            onClick={() => setCurrentView('entry')}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150 shadow-xs"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              <span>新建查明案情</span>
            </span>
            <kbd className="text-[10px] bg-blue-700 text-blue-100 px-1.5 py-0.2 rounded font-mono">
              S0
            </kbd>
          </button>
        ) : (
          <button
            onClick={() => setCurrentView('entry')}
            title="新建查明案情"
            className="w-full h-8 flex items-center justify-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150 shadow-xs"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* 当前活跃案件快速选择器 (带下拉切换) */}
        {!collapsed && currentCase && (
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setCasesMenuOpen(!casesMenuOpen)}
              className="px-2.5 py-2 bg-zinc-50 hover:bg-zinc-100/80 rounded-lg border border-zinc-200 text-xs cursor-pointer transition-colors duration-150"
            >
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                <span>当前活跃案件</span>
                <span className="font-mono text-[10px]">{currentCase.mode}</span>
              </div>
              <div className="font-medium text-zinc-800 flex items-center justify-between">
                <span className="truncate font-mono">{currentCase.case_id}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0 ml-1" />
              </div>
            </div>

            {casesMenuOpen && (
              <div className="absolute left-0 mt-1 w-full bg-white rounded-xl border border-zinc-200 shadow-xl py-1.5 z-50 text-xs">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                  快速切换案件
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {casesList.map((c) => {
                    const isSelected = c.case_id === currentCase.case_id;
                    return (
                      <div
                        key={c.case_id}
                        onClick={async () => {
                          setCasesMenuOpen(false);
                          const success = await loadCase(c.case_id);
                          if (success) {
                            showToast(`已切换至案件 ${c.case_id}`, 'info');
                          }
                        }}
                        className={`px-2.5 py-1.5 flex items-center justify-between gap-1.5 hover:bg-zinc-50 cursor-pointer ${
                          isSelected ? 'bg-zinc-100 font-semibold text-zinc-900' : 'text-zinc-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs block truncate">{c.case_id}</span>
                          <span className="text-[10px] text-zinc-400 truncate block">
                            {c.title}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-zinc-900 shrink-0" />}
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
              <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
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
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 ${
                        isActive
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <span className={isActive ? 'text-zinc-900' : 'text-zinc-500'}>
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
      <div className="p-3 border-t border-zinc-200 bg-zinc-50/50 space-y-2.5">
        {/* 角色切换 (Segmented Control) */}
        {!collapsed ? (
          <div>
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-1 mb-1">
              操作角色
            </div>
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-200/70 rounded-lg text-[11px]">
              {(['practitioner', 'judicial', 'public'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-1 rounded-md transition-colors duration-150 text-center font-medium ${
                    role === r
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
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
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
              {roleConfigs[role].icon}
            </div>
          </div>
        )}

        {/* 快照与合规指示 */}
        {!collapsed ? (
          <div className="px-1 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-zinc-400" />
              <span className="truncate max-w-[120px]">
                {currentCase?.snapshot_id || '20261008-gii'}
              </span>
            </span>
            <span className="text-[10px] bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200 text-zinc-500">
              WAL只读
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  );
};
