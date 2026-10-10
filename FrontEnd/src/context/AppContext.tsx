import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, CaseState, CaseSummary, Evidence } from '../types/lawAgent';
import { lawAgentApi } from '../api/lawAgentApi';
import { DEMO_CASE_C01, MOCK_CASE_SUMMARIES } from '../api/mockData';

export type ActiveView =
  | 'cases'
  | 'entry'
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
  loadCase: (caseId: string) => Promise<boolean>;
  refreshCurrentCase: () => Promise<void>;
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
  closeLawModal: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('practitioner'); // 默认实务专业端
  const [currentView, setCurrentView] = useState<ActiveView>('analysis'); // 默认展示深度分析与法源对照
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(DEMO_CASE_C01.case_id);
  const [currentCase, setCurrentCase] = useState<CaseState | null>(DEMO_CASE_C01);
  const [casesList, setCasesList] = useState<CaseSummary[]>(MOCK_CASE_SUMMARIES);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 权威法源抽屉 / 对照窗
  const [selectedEvidenceEid, setSelectedEvidenceEid] = useState<string | null>('E1');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // 浮层法条小弹窗状态
  const [lawModalEid, setLawModalEid] = useState<string | null>(null);
  const [isLawModalOpen, setIsLawModalOpen] = useState<boolean>(false);

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
    async (caseId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const data = await lawAgentApi.getCase(caseId);
        setCurrentCaseId(caseId);
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
    if (!currentCaseId) return;
    try {
      const data = await lawAgentApi.getCase(currentCaseId);
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

  useEffect(() => {
    if (currentCaseId) {
      loadCase(currentCaseId);
    }
  }, [currentCaseId, loadCase]);

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        currentView,
        setCurrentView,
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
