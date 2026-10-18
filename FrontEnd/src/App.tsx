/**
 * 涉外法查明辅助 Agent 前端主入口
 * 遵循现代法律科技与 AI 融合设计规范 (Linear / Claude / Gemini 风格)
 */

import React, { useState, useRef, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/common/Sidebar';
import { TopBar } from './components/common/TopBar';
import { LawDrawer } from './components/common/LawDrawer';
import { LawModal } from './components/common/LawModal';
import { HomeLandingView } from './components/home/HomeLandingView';
import { CaseListView } from './components/cases/CaseListView';
import { CaseEntryForm } from './components/cases/CaseEntryForm';
import { ReportReviewView } from './components/review/ReportReviewView';
import { CaseAnalysisView } from './components/analysis/CaseAnalysisView';
import { VerificationDashboardView } from './components/dashboard/VerificationDashboardView';
import { NormSearchEngineView } from './components/search/NormSearchEngineView';
import { MaterialVerificationView } from './components/verification/MaterialVerificationView';
import { ExpertConsultsView } from './components/consults/ExpertConsultsView';
import { AgentWorkspaceView } from './components/workspace/AgentWorkspaceView';
import { CasePipelineAnimationModal } from './components/workspace/CasePipelineAnimationModal';
import { CaseEntryModal } from './components/cases/CaseEntryModal';
import { ShieldCheck, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    currentView,
    toasts,
    removeToast,
    isDrawerOpen,
    closeLawDrawer,
    isPipelineAnimationOpen,
    closePipelineAnimation,
    openPipelineAnimation,
    setCurrentView,
    currentCase,
    sidebarCollapsed,
    setSidebarCollapsed,
    isCaseEntryModalOpen,
    closeCaseEntryModal,
  } = useApp();

  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);

  const isUS =
    currentCase?.meta?.jurisdiction === 'us_commercial' ||
    Boolean(currentCase?.meta?.choice_of_law?.includes('美国')) ||
    Boolean(currentCase?.meta?.choice_of_law?.includes('UCC'));

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomeLandingView />;
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
        return <HomeLandingView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F6F8FA] text-zinc-900 antialiased font-sans">
      {/* 左侧可折叠导航边栏 */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 右侧主工作区 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {currentView !== 'analysis' && currentView !== 'home' && (
          <TopBar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* 工作区画布主体 (支持分栏与抽屉并排工作台) */}
        <div className="flex-1 flex min-w-0 overflow-hidden relative">
          {/* 主视口工作流画布 */}
          <main
            ref={mainScrollRef}
            className={`flex-1 min-w-0 ${
              currentView === 'workspace' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
            }`}
          >
            <div
              key={currentView}
              className={`apple-page-pane ${
                currentView === 'workspace' ? 'flex-1 flex flex-col h-full min-h-0' : 'min-h-full'
              }`}
            >
              {renderCurrentView()}
            </div>

            {/* 底部法治合规备案与说明条 (极简克制) */}
            {currentView !== 'workspace' && (
              <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-md py-4 px-6 text-xs text-slate-500 mt-12">
                <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-slate-800">
                      OverseasLawAssist 域外法查明与深度研判智能工作台
                    </span>
                    <span>·</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      gesetze-im-internet.de / courtlistener.com / ali.org (UCC)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    最高院《涉外民事关系法律适用法解释（二）》形式规范 · V8 客观中立假定推演防线
                  </div>
                </div>
              </footer>
            )}
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

      {/* 全局 3D 景深查明推演动画弹窗 */}
      <CasePipelineAnimationModal
        isOpen={isPipelineAnimationOpen}
        onClose={closePipelineAnimation}
        onComplete={() => {
          closePipelineAnimation();
          setCurrentView('analysis');
        }}
        caseMeta={{
          title: currentCase?.meta?.title || (isUS ? '中美高精半导体芯片检测设备买卖物之瑕疵与合理通知案' : '中德高精工业设备跨境买卖物之瑕疵解约与检验通知失权案'),
          buyerCountry: isUS ? '中国 · 上海' : '中国 · 浙江',
          sellerCountry: isUS ? '美国 · 纽约州' : '德国 · 巴登-符腾堡',
          criticalDate: currentCase?.meta?.signing_date || (isUS ? '2023-05-10' : '2023-04-01'),
          jurisdiction: isUS ? 'us_commercial' : 'de_federal',
          cisgClause: 'excluded',
        }}
      />

      {/* 浮层法条小弹窗 (点击任意条文或法源时原地弹出查看，避免滚屏迷失) */}
      <LawModal />

      {/* 全局新建案件查明弹窗 (Apple Bento 动效) */}
      <CaseEntryModal
        isOpen={isCaseEntryModalOpen}
        onClose={closeCaseEntryModal}
      />

      {/* 全局 Toast 通知容器 */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border shadow-lg text-xs flex items-start justify-between gap-3 transition-all ${
              t.type === 'success'
                ? 'bg-white text-zinc-900 border-emerald-200'
                : t.type === 'error'
                ? 'bg-white text-zinc-900 border-rose-200'
                : t.type === 'warning'
                ? 'bg-white text-zinc-900 border-amber-200'
                : 'bg-white text-zinc-900 border-zinc-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {t.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {t.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              {t.type === 'warning' && (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              {t.type === 'info' && (
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-zinc-400 hover:text-zinc-700 p-0.5 shrink-0 rounded transition-colors cursor-pointer"
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
