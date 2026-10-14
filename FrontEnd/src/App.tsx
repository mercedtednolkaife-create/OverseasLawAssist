/**
 * 德国联邦法域外法查明 Agent 前端主入口
 * 遵循极简专业桌面端设计规范 (Linear / Claude Artifacts 风格)
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/common/Sidebar';
import { TopBar } from './components/common/TopBar';
import { LawDrawer } from './components/common/LawDrawer';
import { LawModal } from './components/common/LawModal';
import { CaseListView } from './components/cases/CaseListView';
import { CaseEntryForm } from './components/cases/CaseEntryForm';
import { ReportReviewView } from './components/review/ReportReviewView';
import { CaseAnalysisView } from './components/analysis/CaseAnalysisView';
import { VerificationDashboardView } from './components/dashboard/VerificationDashboardView';
import { NormSearchEngineView } from './components/search/NormSearchEngineView';
import { MaterialVerificationView } from './components/verification/MaterialVerificationView';
import { ExpertConsultsView } from './components/consults/ExpertConsultsView';
import { AgentWorkspaceView } from './components/workspace/AgentWorkspaceView';
import { Scale, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentView, toasts, removeToast, isDrawerOpen, closeLawDrawer } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'cases':
        return <CaseListView />;
      case 'entry':
        return <CaseEntryForm />;
      case 'workspace':
        return <AgentWorkspaceView />;
      case 'review':
        return <ReportReviewView />;
      case 'analysis':
        return <CaseAnalysisView />;
      case 'dashboard':
        return <VerificationDashboardView />;
      case 'search':
        return <NormSearchEngineView />;
      case 'verification':
        return <MaterialVerificationView />;
      case 'consults':
        return <ExpertConsultsView />;
      default:
        return <CaseAnalysisView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-mesh-canvas text-zinc-900 antialiased font-sans">
      {/* 左侧可折叠导航边栏 (Linear / Claude 风格) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 右侧主工作区 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* 工作区画布主体 (支持分栏与抽屉并排工作台) */}
        <div className="flex-1 flex min-w-0 overflow-hidden relative">
          {/* 主视口工作流画布 */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {renderCurrentView()}

            {/* 底部法治合规备案与说明条 (极简克制) */}
            <footer className="border-t border-zinc-200/80 bg-white/70 backdrop-blur-md py-4 px-6 text-xs text-zinc-400 mt-12">
              <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-medium text-zinc-700">
                    涉外法查明Agent
                  </span>
                  <span>·</span>
                  <span className="font-mono text-[11px]">gesetze-im-internet.de / courtlistener.com / ali.org</span>
                </div>
              </div>
            </footer>
          </main>

          {/* 右侧抽屉 / 对照窗 (Drawer / Split Pane) - 桌面端右侧分栏 */}
          {isDrawerOpen && (
            <div className="hidden lg:block w-[420px] xl:w-[460px] shrink-0 h-full border-l border-zinc-200 bg-white z-20 transition-all duration-150">
              <LawDrawer variant="docked" onClose={closeLawDrawer} />
            </div>
          )}

          {/* 移动端/窄屏下的抽屉遮罩与侧滑抽屉 */}
          {isDrawerOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-black/40">
              <div className="w-full max-w-md h-full bg-white shadow-2xl">
                <LawDrawer variant="drawer" onClose={closeLawDrawer} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 浮层法条小弹窗 (点击任意条文或法源时原地弹出查看，避免滚屏迷失) */}
      <LawModal />

      {/* 全局 Toast 通知容器 (极简精致卡片) */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3 rounded-xl border shadow-md text-xs flex items-start justify-between gap-3 transition-all ${
              t.type === 'success'
                ? 'bg-white text-zinc-900 border-zinc-200'
                : t.type === 'error'
                ? 'bg-white text-zinc-900 border-rose-200'
                : t.type === 'warning'
                ? 'bg-white text-zinc-900 border-amber-200'
                : 'bg-white text-zinc-900 border-zinc-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {t.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-zinc-800 shrink-0 mt-0.5" />
              )}
              {t.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              {t.type === 'warning' && (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              {t.type === 'info' && (
                <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-zinc-400 hover:text-zinc-700 p-0.5 shrink-0 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
