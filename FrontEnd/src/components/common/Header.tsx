import React from 'react';
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
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { role, setRole, currentView, setCurrentView, currentCase } = useApp();

  const roleLabels: Record<UserRole, { name: string; tag: string }> = {
    practitioner: { name: '实务专业端', tag: '涉外律师与企业法务' },
    judicial: { name: '司法辅助端', tag: '涉外民商事法官与法官助理' },
    public: { name: '公共服务端', tag: '社会公众与学术检索' },
  };

  const navItems: Array<{ id: ActiveView; label: string; icon: React.ReactNode; hidden?: boolean }> = [
    { id: 'cases', label: '案件列表', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'review', label: '报告审阅与比对', icon: <FileSearch className="w-4 h-4" /> },
    { id: 'analysis', label: '案情深度分析', icon: <Scale className="w-4 h-4" /> },
    { id: 'dashboard', label: '校验仪表盘', icon: <Activity className="w-4 h-4" /> },
    { id: 'search', label: '德国法检索库', icon: <Search className="w-4 h-4" /> },
    {
      id: 'verification',
      label: '外方法料核验',
      icon: <ShieldCheck className="w-4 h-4" />,
      hidden: role === 'public',
    },
    {
      id: 'consults',
      label: '专家会商',
      icon: <Users className="w-4 h-4" />,
      hidden: role === 'public',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      {/* 顶部主导航栏：严格遵循 3-Zone 规范 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand 区域 */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCurrentView('cases')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded bg-neutral-900 text-white flex items-center justify-center font-bold tracking-tight shadow-xs">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-base font-bold text-neutral-900 tracking-tight block whitespace-nowrap">
                涉外法查明Agent
              </span>
              <span className="text-xs text-neutral-500 block -mt-0.5">
                Foreign Law Ascertainment Agent
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: 导航链接 */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
          {navItems
            .filter((item) => !item.hidden)
            .map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-neutral-100 text-neutral-900 font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        {/* Zone 3: 角色切换与主操作 */}
        <div className="flex items-center gap-3 shrink-0">
          {/* 三角色切换器 */}
          <div className="flex items-center p-0.5 bg-neutral-100 rounded text-xs">
            {(['practitioner', 'judicial', 'public'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                  role === r
                    ? 'bg-white text-neutral-900 shadow-xs font-medium'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title={roleLabels[r].tag}
              >
                {roleLabels[r].name}
              </button>
            ))}
          </div>

          {/* 新建案件主动作 */}
          <button
            onClick={() => setCurrentView('entry')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors whitespace-nowrap shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>录入新案情</span>
          </button>
        </div>
      </div>

      {/* 状态与合规提示条 */}
      <div className="bg-neutral-50 border-t border-neutral-200/80 px-4 sm:px-6 lg:px-8 py-1.5 text-xs text-neutral-600 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-medium text-neutral-800">
            当前案件：{currentCase?.case_id || '未选择'}
          </span>
          <span className="text-neutral-300">|</span>
          <span className="font-mono text-neutral-500">
            快照ID: {currentCase?.snapshot_id || '20261008-gii-v0.7'}
          </span>
          <span className="text-neutral-300">|</span>
          <span>
            模式:{' '}
            <span className="font-medium text-neutral-800">
              {currentCase?.mode === 'full' ? '完整查明' : currentCase?.mode === 'lite' ? '精简分析' : '仅检索'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-4 text-neutral-500">
          <span className="hidden sm:inline text-neutral-400">
            客观中立：不输出片面胜诉概率预测 · 逐条绑定官方权威出处
          </span>
        </div>
      </div>
    </header>
  );
};
