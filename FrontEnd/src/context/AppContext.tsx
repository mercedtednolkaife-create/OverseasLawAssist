import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, CaseState, CaseSummary, Evidence } from '../types/lawAgent';
import { lawAgentApi } from '../api/lawAgentApi';

export type ActiveView =
  | 'home'
  | 'cases'
  | 'entry'
  | 'workspace'
  | 'analysis'
  | 'review'
  | 'dashboard'
  | 'search'
  | 'verification'
  | 'consults';

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;
  currentCaseId: string | null;
  setCurrentCaseId: (id: string | null) => void;
  currentCase: CaseState | null;
  setCurrentCase: (c: CaseState | null) => void;
  casesList: CaseSummary[];
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  toasts: Toast[];
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  loadCase: (caseId: string, force?: boolean) => Promise<boolean>;
  refreshCurrentCase: () => Promise<void>;
  // 3D 景深查明推演动画弹窗状态
  isPipelineAnimationOpen: boolean;
  setIsPipelineAnimationOpen: (open: boolean) => void;
  openPipelineAnimation: () => void;
  closePipelineAnimation: () => void;
  // 检索默认过滤类型 (成文法 / 判例 / 全部) 与关键词
  searchDefaultKind: 'all' | 'norm' | 'case';
  setSearchDefaultKind: (kind: 'all' | 'norm' | 'case') => void;
  searchDefaultQuery: string;
  setSearchDefaultQuery: (query: string) => void;
  // 右侧抽屉 / 对照窗状态
  selectedEvidenceEid: string | null;
  setSelectedEvidenceEid: (eid: string | null) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  openLawDrawer: (eid?: string) => void;
  closeLawDrawer: () => void;
  // 浮层法条小弹窗状态 (用于原地查看条文，不强制滑到顶部或折叠右侧栏)
  lawModalEid: string | null;
  isLawModalOpen: boolean;
  openLawModal: (eid: string) => void;
  // 新建查明案情弹窗状态
  isCaseEntryModalOpen: boolean;
  setIsCaseEntryModalOpen: (open: boolean) => void;
  openCaseEntryModal: () => void;
  closeCaseEntryModal: () => void;
  // 侧边栏折叠状态 (全局响应式与定位)
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('practitioner'); // 默认实务专业端
  const [currentView, setCurrentView] = useState<ActiveView>('home'); // 默认进入查明 Agent 主页
  const [currentCaseId, setCurrentCaseId] = useState<string | null>('C001');
  const [currentCase, setCurrentCase] = useState<CaseState | null>(null);
  const [casesList, setCasesList] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 保持 currentCase 最新引用的 Ref，供 loadCase 闭包读取，避免 useCallback 依赖 currentCase 引发死循环重渲染
  const currentCaseRef = useRef<CaseState | null>(null);
  currentCaseRef.current = currentCase;

  // 3D 景深查明推演动画弹窗状态
  const [isPipelineAnimationOpen, setIsPipelineAnimationOpen] = useState<boolean>(false);
  const openPipelineAnimation = useCallback(() => setIsPipelineAnimationOpen(true), []);
  const closePipelineAnimation = useCallback(() => setIsPipelineAnimationOpen(false), []);

  // 检索默认过滤类型 (成文法 / 判例 / 全部) 与关键词
  const [searchDefaultKind, setSearchDefaultKind] = useState<'all' | 'norm' | 'case'>('all');
  const [searchDefaultQuery, setSearchDefaultQuery] = useState<string>('');

  // 权威法源抽屉 / 对照窗
  const [selectedEvidenceEid, setSelectedEvidenceEid] = useState<string | null>('E1');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // 侧边栏折叠状态 (全局响应式与定位)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // 浮层法条小弹窗状态
  const [lawModalEid, setLawModalEid] = useState<string | null>(null);
  const [isLawModalOpen, setIsLawModalOpen] = useState<boolean>(false);

  // 新建查明案情弹窗状态
  const [isCaseEntryModalOpen, setIsCaseEntryModalOpen] = useState<boolean>(false);
  const openCaseEntryModal = useCallback(() => setIsCaseEntryModalOpen(true), []);
  const closeCaseEntryModal = useCallback(() => setIsCaseEntryModalOpen(false), []);

  const handleSetCurrentView = useCallback((view: ActiveView) => {
    if (view === 'entry') {
      setIsCaseEntryModalOpen(true);
      return;
    }
    setCurrentView(view);
  }, []);

  const openLawDrawer = useCallback((eid?: string) => {
    if (eid) {
      setSelectedEvidenceEid(eid);
    }
    setIsDrawerOpen(true);
  }, []);

  const closeLawDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const openLawModal = useCallback((eid: string) => {
    setLawModalEid(eid);
    setIsLawModalOpen(true);
  }, []);

  const closeLawModal = useCallback(() => {
    setIsLawModalOpen(false);
  }, []);

  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const id = String(Date.now()) + Math.random().toString(36).slice(2, 5);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (newRole === 'public') {
      if (['consults', 'verification'].includes(currentView)) {
        setCurrentView('search');
      }
    }
  };

  const loadCase = useCallback(
    async (caseId: string, force?: boolean): Promise<boolean> => {
      if (!force && currentCaseRef.current && currentCaseRef.current.case_id !== caseId && currentCaseRef.current.status === 'running') {
        showToast('当前案件正在执行 Multi-Agent 流式协同研判，请等待完成后再切换', 'warning');
        return false;
      }
      setLoading(true);
      setError(null);
      // 仅在切换到不同案件时才重置 currentCase，避免刷新同一案件时产生白屏闪烁
      if (currentCaseRef.current && currentCaseRef.current.case_id !== caseId) {
        setCurrentCase(null);
      }
      setCurrentCaseId(caseId);
      try {
        const data = await lawAgentApi.getCase(caseId);
        setCurrentCase(data);
        return true;
      } catch (err: any) {
        setError(err.message || '加载案件数据失败');
        showToast(err.message || '加载案件数据失败', 'error');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const refreshCurrentCase = useCallback(async () => {
    const targetCaseId = currentCaseRef.current?.case_id || currentCaseId;
    if (!targetCaseId) return;
    try {
      const data = await lawAgentApi.getCase(targetCaseId);
      setCurrentCase(data);
      const summaries = await lawAgentApi.getCases();
      if (Array.isArray(summaries)) {
        setCasesList(summaries);
      }
    } catch (err: any) {
      setError(err.message || '刷新案件数据失败');
    }
  }, [currentCaseId]);

  useEffect(() => {
    lawAgentApi.getCases().then((list) => {
      if (Array.isArray(list)) {
        setCasesList(list);
      }
    }).catch(() => {});
  }, []);

  // 初次挂载或外部改变 currentCaseId 且尚未加载该案件时执行
  useEffect(() => {
    if (currentCaseId && currentCaseRef.current?.case_id !== currentCaseId) {
      loadCase(currentCaseId);
    }
  }, [currentCaseId, loadCase]);

  // 当案件处于 running 状态时，自动挂接 SSE 实时更新状态
  useEffect(() => {
    if (!currentCaseId || currentCase?.status !== 'running') return;
    const unsub = lawAgentApi.subscribeEvents(currentCaseId, (event, data) => {
      if (event === 'state_update') {
        setCurrentCase(data);
      } else if (event === 'done') {
        refreshCurrentCase();
      }
    });
    return () => unsub();
  }, [currentCaseId, currentCase?.status, refreshCurrentCase]);


  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        currentView,
        setCurrentView: handleSetCurrentView,
        currentCaseId,
        setCurrentCaseId,
        currentCase,
        setCurrentCase,
        casesList,
        loading,
        error,
        setError,
        toasts,
        showToast,
        removeToast,
        loadCase,
        refreshCurrentCase,
        isPipelineAnimationOpen,
        setIsPipelineAnimationOpen,
        openPipelineAnimation,
        closePipelineAnimation,
        searchDefaultKind,
        setSearchDefaultKind,
        searchDefaultQuery,
        setSearchDefaultQuery,
        selectedEvidenceEid,
        setSelectedEvidenceEid,
        isDrawerOpen,
        setIsDrawerOpen,
        openLawDrawer,
        closeLawDrawer,
        lawModalEid,
        isLawModalOpen,
        openLawModal,
        closeLawModal,
        isCaseEntryModalOpen,
        setIsCaseEntryModalOpen,
        openCaseEntryModal,
        closeCaseEntryModal,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
