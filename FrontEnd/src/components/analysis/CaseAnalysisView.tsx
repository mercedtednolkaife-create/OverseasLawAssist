import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Scale,
  AlertTriangle,
  HelpCircle,
  BookOpen,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MinusCircle,
  Bookmark,
  Compass,
  Network,
  List,
  ArrowRight,
  Layers,
  FileCheck2,
  GitCommit,
  AlertCircle,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { SimilarCaseItem, EntryCheckItem } from '../../types/lawAgent';
import { CaseExecutiveSummaryCard } from './CaseExecutiveSummaryCard';
import { CaseStrategicAssessmentCard } from './CaseStrategicAssessmentCard';

export const CaseAnalysisView: React.FC = () => {
  const { currentCase, openLawModal, openLawDrawer, setCurrentView, isDrawerOpen } = useApp();
  const [activeFactHighlight, setActiveFactHighlight] = useState<string | null>(null);
  const [copiedQuestionIndex, setCopiedQuestionIndex] = useState<number | null>(null);
  const [filterIssueKind, setFilterIssueKind] = useState<'all' | 'law' | 'fact'>('all');
  const [filterElementStatus, setFilterElementStatus] = useState<string>('all');

  // B3 证据链视图模式：流程图谱模式 (graph) vs 矩阵清单模式 (list)
  const [b3ViewMode, setB3ViewMode] = useState<'graph' | 'list'>('graph');
  const [hoveredTraceChainId, setHoveredTraceChainId] = useState<string | null>(null);

  // 当前滚动高亮的模块 ID
  const [activeNavId, setActiveNavId] = useState<string>('module-b1');

  // 折叠卡片状态集合 (保存大模块折叠状态)
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // B2 构成要件各个要件折叠状态 (默认全折叠，长内容精简概览，支持一键全部展开/收起)
  const [expandedElements, setExpandedElements] = useState<Record<string, boolean>>({});

  // 右侧轨道智能悬浮 / 展开 / 固定状态 (避免遮挡主体内容，鼠标悬停时平滑滑出)
  const [isRailHovered, setIsRailHovered] = useState(false);
  const [isRailPinned, setIsRailPinned] = useState(false);

  const toggleCardCollapse = (key: string) => {
    setCollapsedCards((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleElementExpand = (elId: string) => {
    setExpandedElements((prev) => ({
      ...prev,
      [elId]: !prev[elId],
    }));
  };

  const navItems = [
    { id: 'module-summary', label: '全景研判总结' },
    { id: 'module-b1', label: '争议焦点' },
    { id: 'module-b2', label: '构成要件比对' },
    { id: 'module-strategy', label: '胜败推演与红队攻防' },
    { id: 'module-b3', label: '证据链溯源' },
    { id: 'module-b4', label: '类案判例对照' },
    { id: 'module-b5', label: '入口检查清单' },
    { id: 'module-b6', label: '专家提问清单' },
  ];

  const case_id = currentCase?.case_id || '';
  const issues = useMemo(() => currentCase?.issues || [], [currentCase?.issues]);
  const elements = useMemo(() => currentCase?.elements || [], [currentCase?.elements]);
  const materials = useMemo(() => currentCase?.materials || [], [currentCase?.materials]);
  const facts = useMemo(() => currentCase?.facts || [], [currentCase?.facts]);
  const similar_cases = useMemo(() => currentCase?.similar_cases || [], [currentCase?.similar_cases]);
  const entry_checks = useMemo(() => currentCase?.entry_checks || [], [currentCase?.entry_checks]);
  const counsel_questions = useMemo(() => currentCase?.counsel_questions || [], [currentCase?.counsel_questions]);
  const meta = currentCase?.meta;
  const isUS = meta?.jurisdiction === 'us_commercial' || meta?.choice_of_law?.includes('美国') || meta?.choice_of_law?.includes('UCC');
  const strategicAssessment = currentCase?.strategic_assessment;

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      if (filterIssueKind === 'all') return true;
      return i.kind === filterIssueKind;
    });
  }, [issues, filterIssueKind]);

  const filteredElements = useMemo(() => {
    return elements.filter((el) => {
      if (filterElementStatus === 'all') return true;
      return el.match_status === filterElementStatus;
    });
  }, [elements, filterElementStatus]);

  const isAllElementsExpanded = useMemo(() => {
    return (
      filteredElements.length > 0 &&
      filteredElements.every((el) => !!expandedElements[el.element_id])
    );
  }, [filteredElements, expandedElements]);

  const lawIssuesCount = useMemo(
    () => issues.filter((i) => i.kind === 'law').length,
    [issues]
  );
  const factIssuesCount = useMemo(
    () => issues.filter((i) => i.kind === 'fact').length,
    [issues]
  );

  // 采用 IntersectionObserver 监听视口可见性，性能极高且无频繁滚动重排抖动
  useEffect(() => {
    if (!currentCase) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const sorted = visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          setActiveNavId(sorted[0].target.id);
        }
      },
      {
        rootMargin: '-10% 0px -65% 0px',
        threshold: [0, 0.25],
      }
    );

    navItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [currentCase]);

  const scrollToModule = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveNavId(id);
    }
  };

  const toggleAllElements = () => {
    if (isAllElementsExpanded) {
      setExpandedElements({});
    } else {
      const all: Record<string, boolean> = {};
      filteredElements.forEach((el) => {
        all[el.element_id] = true;
      });
      setExpandedElements(all);
    }
  };

  const caseTitle =
    (meta?.parties && meta.parties.length > 0 ? meta.parties.join(' vs ') : null) ||
    meta?.contract_type ||
    '涉德跨境商事合同与履行瑕疵争议';

  const handleCopyQuestion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedQuestionIndex(idx);
    setTimeout(() => setCopiedQuestionIndex(null), 2000);
  };

  // 映射四态比对标签 (克制的中性灰底与专业语义色彩)
  const getMatchStatusBadge = (status?: string) => {
    switch (status) {
      case 'satisfied':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            条件具备 (Satisfied)
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            <Clock className="w-3 h-3 text-amber-600" />
            部分具备·存有缺口
          </span>
        );
      case 'not_satisfied':
      case 'missing':
        return (
          <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            <MinusCircle className="w-3 h-3 text-rose-600" />
            要件未满足
          </span>
        );
      case 'disputed':
        return (
          <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            <AlertTriangle className="w-3 h-3 text-blue-600" />
            双方存有争议
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md text-xs font-mono">
            待比对
          </span>
        );
    }
  };

  // 根据要件推断核心法源 ID
  const getEidForElement = (el: any) => {
    if (el?.links && el.links.length > 0 && el.links[0]?.eid) {
      return el.links[0].eid;
    }
    const elId = typeof el === 'string' ? el : el?.element_id;
    switch (elId) {
      case 'e1':
        return isUS ? 'E1' : 'E2';
      case 'e2':
        return isUS ? 'E2' : 'E6';
      case 'e3':
        return isUS ? 'E3' : 'E4';
      case 'e4':
        return isUS ? 'E4' : 'E5';
      default:
        return 'E1';
    }
  };

  // 根据法源 EID 获取规范名称
  const getNormTitleForEid = (eid: string) => {
    const ev = currentCase?.evidence?.[eid];
    if (ev?.ref_id) {
      return `${ev.ref_id}`;
    }
    const normTitles: Record<string, string> = {
      E1: isUS ? 'UCC § 2-106 (买卖定义)' : 'BGB § 433 (买卖合同之债)',
      E2: isUS ? 'UCC § 2-314 (适销性担保)' : 'BGB § 434 (物之瑕疵担保)',
      E3: isUS ? 'UCC § 2-607 (检验通知义务)' : 'BGB § 437 (买受人权利总纲)',
      E4: isUS ? '28 U.S.C. § 1782 (跨国取证)' : 'BGB § 439 (补正履行请求权)',
      E5: isUS ? 'UCC § 2-714 (损害赔偿)' : 'BGB § 323 (期限届满解除合同)',
      E6: isUS ? 'UCC § 2-715 (连带损失)' : 'HGB § 377 (商事检验即时通知失权)',
    };
    return normTitles[eid] || `适用法源 (${eid})`;
  };

  // 构建四阶因果证据链路数据 (Materials -> Facts -> Elements -> Norms)
  const evidenceChains = useMemo(() => {
    return elements.map((el, idx) => {
      const eid = getEidForElement(el);
      const normTitle = getNormTitleForEid(eid);
      const linkedFacts = facts.filter((f) => (el.fact_links || []).includes(f.fid));
      const linkedMaterials = materials.filter((m) =>
        (el.material_links || []).includes(m.mid) ||
        linkedFacts.some((f) => (m.fact_ids || []).includes(f.fid))
      );

      // 判断链路闭环状态
      const hasMaterials = linkedMaterials.length > 0;
      const hasDisputedFact = linkedFacts.some((f) => f.disputed);

      let chainStatus: 'closed' | 'warning' | 'gap' = 'closed';
      let statusDesc = '完全闭环：证据材料充分支撑事实，满足法定构成要件';

      if (!hasMaterials) {
        chainStatus = 'gap';
        statusDesc = '证据缺口：缺少直接客观书面材料支撑';
      } else if (hasDisputedFact) {
        chainStatus = 'warning';
        statusDesc = '事实存疑：双方对事实认定存在争议，面临质证挑刺';
      } else if (el.match_status === 'partial') {
        chainStatus = 'warning';
        statusDesc = '部分满足：关键时点凭证待补强 (如检验通知送达回执)';
      } else if (el.match_status === 'disputed') {
        chainStatus = 'warning';
        statusDesc = '面临阻断：德方主张法定除斥期间失权抗辩';
      }

      return {
        chainId: `CHAIN-${idx + 1}`,
        element: el,
        normEid: eid,
        normTitle,
        materials: linkedMaterials,
        facts: linkedFacts,
        status: chainStatus,
        statusDesc,
      };
    });
  }, [elements, facts, materials]);

  if (!currentCase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 mb-4">
          <Scale className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900">未选择正在处理的案件</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          请从左侧导航或顶部案卷切换器选择一个涉外查明案件以查看深度分析包。
        </p>
        <button
          type="button"
          onClick={() => setCurrentView('cases')}
          className="mt-4 px-3.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
        >
          返回案件列表
        </button>
      </div>
    );
  }

  if (currentCase.status === 'running') {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12 space-y-4">
        <div className="bg-white rounded-xl border border-blue-200/90 shadow-xs p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-bold text-zinc-900">
              案件【{case_id}】多 Agent 协同流水线正在分析中
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto">
              系统正在执行事实要素抽取、准据法检索、四态涵摄与红队攻防推演。各深度分析模块将在流水线就绪后呈现。
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setCurrentView('workspace')}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 mx-auto"
            >
              <span>前往 Agent 工作台观察实时步骤</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-8 select-text relative">
      {/* 
        2. 导航定位体系：
           A. 窄屏或右侧抽屉打开时：顶部吸顶悬浮胶囊 (Sticky Capsule Nav)
           B. 宽屏且无右侧抽屉时：右侧智能边缘停靠轨道 (Edge-Docked Smart Rail)
              - 自动隐藏，仅以极薄指示条贴靠屏幕右侧，绝不遮挡主体内容
              - 鼠标移入或悬停时平滑滑出完整导航，并支持一键固定
      */}
      {/* 方案 A: 顶部吸顶悬浮胶囊 (在展开右侧面板或屏幕小于 2xl 时生效) */}
      <div
        className={`sticky top-3 z-30 transition-all duration-200 ${
          isDrawerOpen ? 'block' : 'block 2xl:hidden'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-md rounded-full border border-zinc-200/90 shadow-md px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto max-w-full">
          <div className="flex items-center gap-1 shrink-0 text-zinc-400 pl-1">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-mono font-medium hidden sm:inline text-zinc-500">
              定位:
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = activeNavId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToModule(item.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-1.5 shrink-0 pr-1 pl-2 border-l border-zinc-200 text-[11px] text-zinc-500 font-mono">
            <span>{case_id}</span>
          </div>
        </div>
      </div>

      {/* 方案 B: 右侧智能可伸缩轨道 (Right-Rail Track Nav) - 自动隐藏，鼠标移动过去展开完整导航 */}
      {!isDrawerOpen && (
        <aside
          onMouseEnter={() => setIsRailHovered(true)}
          onMouseLeave={() => setIsRailHovered(false)}
          className={`hidden xl:block fixed right-0 top-36 z-30 transition-transform duration-300 ease-out select-none ${
            isRailPinned || isRailHovered
              ? 'translate-x-0'
              : 'translate-x-[calc(100%-12px)]'
          }`}
        >
          <div className="w-56 bg-white/95 backdrop-blur-md rounded-l-2xl border-l border-y border-zinc-200/90 shadow-xl p-3.5 space-y-2.5 relative">
            {/* 未展开时在右侧边缘露出的微指示条 (仅占12px，绝不遮挡主体内容) */}
            {!(isRailPinned || isRailHovered) && (
              <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-zinc-400 pointer-events-none">
                <Compass className="w-3 h-3 text-blue-600 animate-pulse" />
                <span className="w-1 h-1 rounded-full bg-blue-600" />
              </div>
            )}

            {/* 展开状态的完整导航面板 */}
            <div className={`transition-opacity duration-200 ${
              isRailPinned || isRailHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 text-[10px] font-mono font-semibold tracking-wider uppercase text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  <span>目录导航 · RAIL</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRailPinned(!isRailPinned)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    isRailPinned
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                  }`}
                  title={isRailPinned ? '取消固定 (移开鼠标后自动收起隐藏)' : '固定在屏幕右侧'}
                >
                  {isRailPinned ? '已固定' : '固定'}
                </button>
              </div>

              <div className="space-y-1 pt-1">
                {navItems.map((item) => {
                  const isActive = activeNavId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToModule(item.id)}
                      className={`flex items-center gap-2 text-left w-full text-xs transition-all duration-150 py-1.5 px-2 rounded-lg ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 font-medium'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 transition-all duration-150 ${
                          isActive
                            ? 'bg-blue-600 ring-2 ring-blue-100'
                            : 'bg-zinc-300'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 
        1. 顶部合规声明横幅 
        优化方案：采用优雅克制的纯白工作卡片底，配细致 border-zinc-200，
        左侧带深海军蓝/冷蓝条强调 (blue-600)，告别大黑底，视觉开阔严谨。
      */}
      <div className="glass-panel-elevated rounded-2xl border border-zinc-200/90 shadow-elevation-1 relative overflow-hidden transition-all">
        {/* 左侧专业冷蓝强调色条 */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />

        <div className="p-5 pl-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                {case_id}
              </span>
              <h1 className="text-sm md:text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                案情深度分析 (咨询准备与要件事实比对)
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                要件事实比对已就绪
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-4xl">
              争点要素拆解、事实证据映射及类案检索比对
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => openLawModal('E2')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors duration-150 shadow-xs font-medium cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>查看权威法条 (E2)</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200 font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
              <span>中立研判机制</span>
            </div>
          </div>
        </div>
      </div>

      {/* 
        全景案件总结与法律研判卡片 (三重视角：司法端 / 实务端 / 公共端)
      */}
      <CaseExecutiveSummaryCard onScrollToModule={scrollToModule} />

      {/* 
        ========================================================================
        争议焦点清单
        模块强化：低饱和蓝灰编号徽标、折叠展开控制、左右分栏、清晰内部分界
        ========================================================================
      */}
      <section
        id="module-b1"
        className="glass-panel rounded-2xl border border-zinc-200/90 shadow-elevation-1 overflow-hidden transition-all card-interactive"
      >
        {/* 模块头部条 */}
        <div className="px-6 py-4 bg-zinc-50/70 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-xs">
              01
            </span>
            <div>
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                争议焦点
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                法律适用与案件事实分歧梳理
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* 筛选切换器 */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-lg border border-zinc-200 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setFilterIssueKind('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterIssueKind === 'all'
                    ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                全部 ({issues.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterIssueKind('law')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterIssueKind === 'law'
                    ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                法律适用 ({lawIssuesCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterIssueKind('fact')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterIssueKind === 'fact'
                    ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                事实认定 ({factIssuesCount})
              </button>
            </div>

            {/* 折叠/展开模块内容 */}
            <button
              type="button"
              onClick={() => toggleCardCollapse('b1')}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title={collapsedCards['b1'] ? '展开该模块' : '收起该模块'}
            >
              {collapsedCards['b1'] ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* 模块主内容区 (双列对比卡片布局) */}
        {!collapsedCards['b1'] && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 法律规范适用争点列 */}
              {(filterIssueKind === 'all' || filterIssueKind === 'law') && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                        法律规范适用争点 (Norm Application)
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {lawIssuesCount} 项法律争点
                    </span>
                  </div>

                  <div className="space-y-3">
                    {issues
                      .filter((i) => i.kind === 'law')
                      .map((issue) => (
                        <div
                          key={issue.issue_id}
                          className="bg-zinc-50/70 hover:bg-zinc-50 rounded-xl border border-zinc-200/90 p-4 space-y-2.5 transition-colors group relative overflow-hidden"
                        >
                          {/* 左侧状态微指示线 */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />

                          <div className="flex items-center justify-between pl-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded text-[11px] font-mono font-bold">
                                {issue.issue_id}
                              </span>
                              <span className="text-[11px] font-medium text-zinc-600">
                                法律解释与适用
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {(issue.element_ids || []).map((elId) => (
                                <button
                                  key={elId}
                                  type="button"
                                  onClick={() => openLawModal(getEidForElement(elId))}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 font-mono bg-blue-50/70 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-colors shadow-2xs font-semibold"
                                  title="查阅对应条文全文"
                                >
                                  <Bookmark className="w-2.5 h-2.5 text-blue-500" />
                                  <span>要件 {elId} 条文</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 争点主干文本 */}
                          <div className="p-3 bg-white rounded-lg border border-zinc-200/80 text-xs text-zinc-900 leading-relaxed font-medium">
                            {issue.text_zh}
                          </div>

                          {/* 涉及请求权提示 */}
                          {issue.claim_ids && issue.claim_ids.length > 0 && (
                            <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 pt-0.5 pl-1">
                              <span className="text-zinc-400">对应原告/被告主张:</span>
                              <span className="text-zinc-700 font-semibold">
                                {issue.claim_ids.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 案件事实认定争点列 */}
              {(filterIssueKind === 'all' || filterIssueKind === 'fact') && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-700" />
                      <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                        案件事实认定争点 (Fact Findings)
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {factIssuesCount} 项事实争点
                    </span>
                  </div>

                  <div className="space-y-3">
                    {issues
                      .filter((i) => i.kind === 'fact')
                      .map((issue) => (
                        <div
                          key={issue.issue_id}
                          className="bg-zinc-50/70 hover:bg-zinc-50 rounded-xl border border-zinc-200/90 p-4 space-y-2.5 transition-colors group relative overflow-hidden"
                        >
                          {/* 左侧状态微指示线 */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-600" />

                          <div className="flex items-center justify-between pl-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-slate-800 text-white rounded text-[11px] font-mono font-bold">
                                {issue.issue_id}
                              </span>
                              <span className="text-[11px] font-medium text-zinc-600">
                                行为时点与举证分歧
                              </span>
                            </div>

                            <span className="text-[11px] text-zinc-400 font-mono">
                              涉及主张: {(issue.claim_ids || []).join(', ') || '全案'}
                            </span>
                          </div>

                          {/* 争点主干文本 */}
                          <div className="p-3 bg-white rounded-lg border border-zinc-200/80 text-xs text-zinc-900 leading-relaxed font-medium">
                            {issue.text_zh}
                          </div>

                          {/* 要件链接 */}
                          {issue.element_ids && issue.element_ids.length > 0 && (
                            <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 pt-0.5 pl-1">
                              <span className="text-zinc-400">直接影响要件:</span>
                              {issue.element_ids.map((elId) => (
                                <button
                                  key={elId}
                                  type="button"
                                  onClick={() => openLawModal(getEidForElement(elId))}
                                  className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors font-semibold"
                                >
                                  {elId}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 
        ========================================================================
        构成要件—案件事实涵摄比对与缺口矩阵
        优化方案：折叠卡片 + 左侧状态指示线 (Satisfied 绿条, Partial 黄条, Disputed 蓝条)
        点击条文弹出小窗口显示，不用用户滑回顶部
        ========================================================================
      */}
      <section
        id="module-b2"
        className="glass-panel rounded-2xl border border-zinc-200/90 shadow-elevation-1 overflow-hidden transition-all card-interactive"
      >
        {/* 模块头部条 */}
        <div className="px-6 py-4 bg-zinc-50/70 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-xs">
              02
            </span>
            <div>
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                构成要件比对
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                要件要素与案件事实四态涵摄比对
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* 状态过滤 */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-400 text-[11px] mr-1 hidden sm:inline">状态筛选:</span>
              <select
                value={filterElementStatus}
                onChange={(e) => setFilterElementStatus(e.target.value)}
                className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
              >
                <option value="all">全部要件 ({elements.length})</option>
                <option value="satisfied">条件具备 (Satisfied)</option>
                <option value="partial">部分具备·存缺口</option>
                <option value="disputed">双方存有争议</option>
                <option value="not_satisfied">要件未满足</option>
              </select>
            </div>

            {/* 一键全部展开 / 全部收起按钮 (满足长内容合理精简显示与一键全览需求) */}
            <button
              type="button"
              onClick={toggleAllElements}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-2xs"
            >
              {isAllElementsExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                  <span>收起全部要件</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  <span>展开全部要件</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => toggleCardCollapse('b2')}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title={collapsedCards['b2'] ? '展开该模块' : '收起该模块'}
            >
              {collapsedCards['b2'] ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* 矩阵内容卡片列表 (各要件独立成卡，间隔分明，默认折叠，绝无粘连) */}
        {!collapsedCards['b2'] && (
          <div className="p-4 sm:p-6 space-y-4 bg-zinc-50/40">
            {filteredElements.map((el) => {
              const eid = getEidForElement(el.element_id);
              const isExpanded = !!expandedElements[el.element_id];

              // 左侧状态指示线的语义颜色：
              // satisfied -> emerald-500
              // partial -> amber-500
              // disputed -> blue-600
              // not_satisfied -> rose-500
              const indicatorColor =
                el.match_status === 'satisfied'
                  ? 'bg-emerald-500'
                  : el.match_status === 'partial'
                  ? 'bg-amber-500'
                  : el.match_status === 'disputed'
                  ? 'bg-blue-600'
                  : 'bg-rose-500';

              return (
                <div
                  key={el.element_id}
                  className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition-all relative overflow-hidden"
                >
                  {/* 要件卡片头部条：编号、名称、对应法源与比对状态、折叠切换器 */}
                  <div
                    onClick={() => toggleElementExpand(el.element_id)}
                    className={`p-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50/60 transition-colors ${
                      isExpanded ? 'border-b border-zinc-100 bg-zinc-50/20' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                        title={isExpanded ? '收起详情' : '展开详情'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>

                      {/* 独立状态胶囊标记 (位于要件徽章前，独立圆角，绝不触碰卡片边缘，杜绝任何粘连感) */}
                      <span
                        className={`w-1.5 h-5 rounded-full shrink-0 ${indicatorColor}`}
                        title={`状态：${el.match_status}`}
                      />

                      {/* 醒目的冷蓝要件编号徽章 */}
                      <span className="font-mono font-bold text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-md">
                        要件 {el.element_id}
                      </span>

                      <h3 className="text-sm font-bold text-zinc-900 tracking-tight hover:text-blue-600 transition-colors">
                        {el.name_zh}
                      </h3>

                      {/* 简要指示标签 (未展开时也一眼可看概览) */}
                      <span className="text-[11px] text-zinc-400 font-mono hidden md:inline">
                        {(el.fact_links || []).length} 项事实关联
                      </span>

                      {/* 核心优化：点击"查看法源条文"触发弹出小窗口，无需滑到顶部 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLawModal(eid);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 font-mono transition-colors font-semibold shadow-2xs"
                        title="查阅法源条文全文"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>查看法源条文 ({eid})</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
                      {getMatchStatusBadge(el.match_status)}
                      <span className="text-[11px] text-zinc-400 font-medium pl-1 hidden lg:inline">
                        {isExpanded ? '收起详情' : '展开详情'}
                      </span>
                    </div>
                  </div>

                  {/* 要件详细内容区 (默认折叠，展开后展现三栏比对结构) */}
                  {isExpanded && (
                    <div className="p-5 pt-4 space-y-4">
                      {/* 要件详细内部分块：三栏网格架构 (要件要求 / 关联事实 / 要素缺口说明) */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                        {/* 左栏：规范法源与材料依据 (3列) */}
                        <div className="md:col-span-3 space-y-2.5 bg-zinc-50/70 p-3.5 rounded-xl border border-zinc-200/80">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            规范基础与材料
                          </span>
                          <div className="space-y-1.5">
                            <div className="text-zinc-700 font-medium flex items-center justify-between">
                              <span>条文定位:</span>
                              <button
                                type="button"
                                onClick={() => openLawModal(eid)}
                                className="font-mono text-blue-600 hover:underline font-bold"
                              >
                                {eid} 详情
                              </button>
                            </div>
                            <div className="text-[11px] text-zinc-500 leading-relaxed">
                              证据材料引用:
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(el.material_links || []).length > 0 ? (
                                  el.material_links.map((mid) => (
                                    <span
                                      key={mid}
                                      className="px-1.5 py-0.2 bg-white rounded border border-zinc-200 font-mono text-[10px] text-zinc-800 font-semibold"
                                    >
                                      {mid}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-zinc-400 font-mono">未单独列明</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 中栏：案件事实原样引用 F# (5列) */}
                        <div className="md:col-span-5 space-y-2 bg-zinc-50/70 p-3.5 rounded-xl border border-zinc-200/80">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            关联案件事实 (原样引用 F#)
                          </span>
                          <div className="space-y-2">
                            {(el.fact_links || []).length > 0 ? (
                              el.fact_links.map((fid) => {
                                const fact = facts.find((f) => f.fid === fid);
                                const isHighlighted = activeFactHighlight === fid;
                                return (
                                  <div
                                    key={fid}
                                    onMouseEnter={() => setActiveFactHighlight(fid)}
                                    onMouseLeave={() => setActiveFactHighlight(null)}
                                    className={`p-2.5 rounded-lg border text-[11px] leading-relaxed transition-all ${
                                      isHighlighted
                                        ? 'bg-white border-blue-400 shadow-xs ring-1 ring-blue-100'
                                        : 'bg-white/80 border-zinc-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-mono font-bold text-blue-700">
                                        [{fid}]
                                      </span>
                                      {fact?.disputed && (
                                        <span className="text-blue-700 font-semibold text-[10px] bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                          双方存有事实争议
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-zinc-800">{fact?.text_zh}</p>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-3 bg-white/60 rounded-lg border border-dashed border-zinc-200 text-zinc-400 text-[11px]">
                                本案当前经纬中未明确记载针对此项要件的直接事实陈述。
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 右栏：比对说明与补强要素说明 (4列) */}
                        <div className="md:col-span-4 space-y-2 bg-zinc-50/70 p-3.5 rounded-xl border border-zinc-200/80">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            要件命中分析与缺口补强建议
                          </span>
                          <div className="p-3 bg-white rounded-lg border border-zinc-200/80 text-[11px] text-zinc-800 leading-relaxed">
                            {el.match_note || '暂无额外比对说明'}
                          </div>

                          {el.match_status === 'partial' && (
                            <div className="p-2.5 bg-amber-50/90 rounded-lg border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                              <div className="flex items-center gap-1 font-semibold mb-0.5">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>建议补强事实要素清单：</span>
                              </div>
                              需向当事人收集更细致的时点凭证（如签收回单、检验通知送达证据）或商事往来书面函件。
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 
        ========================================================================
        方案 A：动态胜败边界推演与红队攻防对抗手册
        包含：胜败摇摆关键变量、If-Then 条件分支推演矩阵、红队致命抗辩反制武器、关键调取补证清单
        ========================================================================
      */}
      <CaseStrategicAssessmentCard
        strategicAssessment={strategicAssessment}
        isUS={Boolean(isUS)}
        openLawDrawer={openLawDrawer}
        openLawModal={openLawModal}
      />

      {/* 
        ========================================================================
        B3 证据链闭环图谱与事实溯源
        模块强化：图谱流向模式 (DAG Pipeline Flow) 与清单列表模式双视图无缝切换
        ========================================================================
      */}
      <section
        id="module-b3"
        className="glass-panel rounded-2xl border border-zinc-200/90 shadow-elevation-1 overflow-hidden transition-all card-interactive"
      >
        <div className="px-6 py-4 bg-zinc-50/70 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-xs">
              04
            </span>
            <div>
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                证据链溯源
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                四阶因果证据链路闭环审查
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 视图模式切换器 (图谱流向模式 vs 清单模式) */}
            <div className="flex items-center p-0.5 bg-zinc-200/80 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setB3ViewMode('graph')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  b3ViewMode === 'graph'
                    ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="流程图谱流向视图"
              >
                <Network className="w-3.5 h-3.5 text-blue-600" />
                <span>图谱流向视图</span>
              </button>
              <button
                type="button"
                onClick={() => setB3ViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  b3ViewMode === 'list'
                    ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="材料清单矩阵视图"
              >
                <List className="w-3.5 h-3.5 text-zinc-600" />
                <span>材料矩阵清单</span>
              </button>
            </div>

            <span className="text-xs font-mono text-zinc-400 hidden md:inline">
              {materials.length} 份材料 / {evidenceChains.length} 条推导链
            </span>

            <button
              type="button"
              onClick={() => toggleCardCollapse('b3')}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title={collapsedCards['b3'] ? '展开该模块' : '收起该模块'}
            >
              {collapsedCards['b3'] ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {!collapsedCards['b3'] && (
          <div className="p-6">
            {b3ViewMode === 'graph' ? (
              /* ================================================================= */
              /* 模式 1：因果链路闭环流程图谱 (Evidence Flow Graph View)              */
              /* ================================================================= */
              <div className="space-y-4">
                {/* 阶段引导微条 (4 阶段阶梯因果流) */}
                <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 bg-zinc-100/70 rounded-lg border border-zinc-200/80 text-[11px] font-semibold text-zinc-600">
                  <div className="col-span-3 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
                    <span>客观证据材料 (M#)</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">2</span>
                    <span>案件事实认定 (F#)</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">3</span>
                    <span>法定构成要件 (EL#)</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">4</span>
                    <span>法律规范与效果 (§)</span>
                  </div>
                </div>

                {/* 逐条闭环证据链路卡 */}
                <div className="space-y-4">
                  {evidenceChains.map((chain, cIdx) => {
                    const isClosed = chain.status === 'closed';
                    const isWarning = chain.status === 'warning';

                    return (
                      <div
                        key={chain.chainId}
                        className={`rounded-xl border transition-all overflow-hidden ${
                          isClosed
                            ? 'bg-white border-zinc-200/90 hover:border-blue-300 shadow-2xs'
                            : isWarning
                            ? 'bg-amber-50/20 border-amber-200/90 hover:border-amber-300 shadow-2xs'
                            : 'bg-rose-50/20 border-rose-200/90 hover:border-rose-300 shadow-2xs'
                        }`}
                      >
                        {/* 链路微顶栏：编号 + 要件名称 + 闭环判断 */}
                        <div className="px-4 py-2 bg-zinc-50/80 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px]">
                              链路 #{cIdx + 1}
                            </span>
                            <span className="font-semibold text-zinc-900">
                              {chain.element.name_zh}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              ({chain.element.element_id})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isClosed ? (
                              <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                证据链完整闭环
                              </span>
                            ) : isWarning ? (
                              <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                证据薄弱 / 面临抗辩
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                证据链存在断点
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 4 阶因果流向节点区 (桌面端 4 列对齐，移动端纵向流) */}
                        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                          {/* 节点 1：证据材料 (3 列) */}
                          <div className="lg:col-span-3 space-y-1.5">
                            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block lg:hidden">
                              ① 提交证据材料
                            </div>
                            {chain.materials.length > 0 ? (
                              chain.materials.map((m) => (
                                <div
                                  key={m.mid}
                                  className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-blue-700 text-[11px]">
                                      {m.mid}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-medium">
                                      客观书证
                                    </span>
                                  </div>
                                  <p className="font-medium text-zinc-900 text-xs leading-snug">
                                    {m.name}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <div className="p-2.5 rounded-lg bg-rose-50/60 border border-dashed border-rose-200 text-xs text-rose-700">
                                ⚠️ 未单独提供直接书面凭证
                              </div>
                            )}
                          </div>

                          {/* 连线 1 ➔ 2 */}
                          <div className="hidden lg:flex lg:col-span-1 justify-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-zinc-400 font-mono mb-0.5">证明</span>
                              <ArrowRight className="w-4 h-4 text-zinc-300" />
                            </div>
                          </div>

                          {/* 节点 2：客观事实认定 (3 列) */}
                          <div className="lg:col-span-3 space-y-1.5">
                            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block lg:hidden">
                              ② 案件事实认定
                            </div>
                            {chain.facts.length > 0 ? (
                              chain.facts.map((f) => (
                                <div
                                  key={f.fid}
                                  className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-blue-700 text-[11px]">
                                      [{f.fid}]
                                    </span>
                                    {f.disputed && (
                                      <span className="text-[9px] text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded">
                                        争议事实
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-zinc-800 text-[11px] leading-relaxed line-clamp-3">
                                    {f.text_zh}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <div className="p-2.5 rounded-lg bg-zinc-50 border border-dashed border-zinc-200 text-xs text-zinc-400">
                                未直接映射特定 F#
                              </div>
                            )}
                          </div>

                          {/* 连线 2 ➔ 3 */}
                          <div className="hidden lg:flex lg:col-span-1 justify-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-zinc-400 font-mono mb-0.5">涵摄</span>
                              <ArrowRight className="w-4 h-4 text-zinc-300" />
                            </div>
                          </div>

                          {/* 节点 3：法定构成要件 (2 列) */}
                          <div className="lg:col-span-2 space-y-1">
                            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block lg:hidden">
                              ③ 法定构成要件
                            </div>
                            <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200/70 text-xs space-y-1">
                              <div className="font-semibold text-zinc-900 text-xs">
                                {chain.element.name_zh}
                              </div>
                              <div className="pt-0.5">
                                {getMatchStatusBadge(chain.element.match_status)}
                              </div>
                            </div>
                          </div>

                          {/* 连线 3 ➔ 4 */}
                          <div className="hidden lg:flex lg:col-span-1 justify-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-zinc-400 font-mono mb-0.5">导出</span>
                              <ArrowRight className="w-4 h-4 text-zinc-300" />
                            </div>
                          </div>

                          {/* 节点 4：适用法律规范与请求权基础 (1 列) */}
                          <div className="lg:col-span-1 flex flex-col items-start gap-1">
                            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block lg:hidden">
                              ④ 适用法律规范
                            </div>
                            <button
                              type="button"
                              onClick={() => openLawModal(chain.normEid)}
                              className="w-full text-left p-2 rounded-lg bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-900 text-[11px] font-medium transition-colors shadow-2xs group"
                              title="点击查阅法典原文"
                            >
                              <div className="font-mono font-bold text-indigo-700 flex items-center justify-between">
                                <span>{chain.normEid}</span>
                                <BookOpen className="w-3 h-3 text-indigo-500 group-hover:scale-110 transition-transform" />
                              </div>
                              <span className="text-[10px] text-indigo-950 font-semibold block leading-tight mt-0.5">
                                {chain.normTitle.split(' ')[0]} {chain.normTitle.split(' ')[1] || ''}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* 链路底栏：闭环判定说明与防守反击提示 */}
                        <div className="px-4 py-2 bg-zinc-50/60 border-t border-zinc-200/80 text-[11px] text-zinc-600 flex items-center justify-between gap-2">
                          <span className="leading-relaxed">
                            <strong className="text-zinc-800">研判结论:</strong> {chain.statusDesc}
                          </span>
                          {chain.element.match_note && (
                            <span className="text-zinc-500 text-[10px] font-mono hidden md:inline truncate max-w-sm">
                              {chain.element.match_note}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ================================================================= */
              /* 模式 2：材料矩阵清单视图 (List View)                               */
              /* ================================================================= */
              <div className="space-y-3">
                {materials.map((mat) => (
                  <div
                    key={mat.mid}
                    className="p-4 bg-zinc-50/70 hover:bg-zinc-50 rounded-xl border border-zinc-200/90 flex flex-col md:flex-row md:items-start justify-between gap-4 text-xs transition-colors relative overflow-hidden"
                  >
                    {/* 左侧状态线 */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />

                    <div className="space-y-2 flex-1 pl-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono font-bold text-[11px]">
                          {mat.mid}
                        </span>
                        <h3 className="font-bold text-zinc-900 text-xs">{mat.name}</h3>
                        <span className="text-zinc-400 text-[11px]">证明事实:</span>
                        {(mat.fact_ids || []).map((fid) => (
                          <span
                            key={fid}
                            className="font-mono px-2 py-0.5 bg-zinc-200 rounded font-semibold text-zinc-900 text-[10px]"
                          >
                            {fid}
                          </span>
                        ))}
                      </div>

                      <p className="text-zinc-700 leading-relaxed">{mat.desc_zh}</p>

                      {mat.excerpt_zh && (
                        <div className="p-2.5 bg-white rounded-lg border border-zinc-200/80 text-[11px] text-zinc-800 font-mono italic">
                          原文摘要: “{mat.excerpt_zh}”
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 md:pt-1">
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-medium font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        已闭环归入证据链
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 
        ========================================================================
        B4 德意志联邦最高法院类似判例对照 (F31 Similar Cases)
        模块强化：清晰左右对比卡片、法院原句高亮展示、事实相同点与差异点明确划分
        ========================================================================
      */}
      <section
        id="module-b4"
        className="glass-panel rounded-2xl border border-zinc-200/90 shadow-elevation-1 overflow-hidden transition-all card-interactive"
      >
        <div className="px-6 py-4 bg-zinc-50/70 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-xs">
              05
            </span>
            <div>
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                类案判例对照
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                裁判要旨权威比对与先例要件参照
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-zinc-400">
              {similar_cases.length} 宗关联判例
            </span>
            <button
              type="button"
              onClick={() => toggleCardCollapse('b4')}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title={collapsedCards['b4'] ? '展开该模块' : '收起该模块'}
            >
              {collapsedCards['b4'] ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {!collapsedCards['b4'] && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {similar_cases.map((sc: SimilarCaseItem) => (
                <div
                  key={sc.case_id}
                  className="bg-zinc-50/70 rounded-xl border border-zinc-200/90 p-5 space-y-4 shadow-2xs relative overflow-hidden"
                >
                  {/* 左侧状态线 */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700" />

                  {/* 判决案号与审级 */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200 pl-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-blue-700 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                        {sc.az}
                      </span>
                      <h3 className="text-xs font-medium text-zinc-700 mt-1.5">
                        {sc.court}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-mono text-[11px]">
                        {sc.date}
                      </span>
                      <button
                        type="button"
                        onClick={() => openLawModal(sc.az.includes('186/14') ? 'E8' : 'E7')}
                        className="text-[11px] text-blue-700 hover:text-blue-900 font-medium bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors shadow-2xs"
                      >
                        查阅判例全文
                      </button>
                    </div>
                  </div>

                  {/* 法院核心观点代码块 (逐字原句) */}
                  <div className="p-3.5 bg-white rounded-lg border border-zinc-200 space-y-2 text-xs ml-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      {isUS ? '先例对争议焦点之确立观点 (Holding / Opinion Quote)' : '判例对法律问题之确立观点 (逐字原句 quote)'}
                    </span>
                    <p className="font-mono text-[11px] text-zinc-900 leading-relaxed italic bg-zinc-50 p-2.5 rounded border border-zinc-100">
                      "{sc.court_view_quote_de}"
                    </p>
                    <p className="text-zinc-700 leading-relaxed">
                      <strong>中译裁判要旨：</strong> {sc.court_view_zh}
                    </p>
                  </div>

                  {/* 相似与差异分栏 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs ml-2">
                    <div className="p-3 bg-white rounded-lg border border-zinc-200 space-y-1.5">
                      <span className="font-bold text-zinc-800 block text-[11px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        案件事实相似点：
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-600 leading-relaxed">
                        {(sc.similarity_points || []).map((p: string, idx: number) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-zinc-200 space-y-1.5">
                      <span className="font-bold text-zinc-800 block text-[11px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        案件事实差异点：
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-600 leading-relaxed">
                        {(sc.difference_points || []).map((p: string, idx: number) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 
        ========================================================================
        B5 & B6 适用法律入口检查与向德国法专业人士提问清单
        模块强化：并列两栏专业工作包，清晰边界与一键复制操作
        ========================================================================
      */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* B5 适用法律入口检查 */}
        <div
          id="module-b5"
          className="lg:col-span-5 glass-panel rounded-2xl border border-zinc-200/90 shadow-elevation-1 overflow-hidden flex flex-col card-interactive"
        >
          <div className="px-6 py-4 bg-zinc-50/70 border-b border-zinc-200 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-xs">
              06
            </span>
            <div>
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                入口检查清单
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                国际私法与实体法入口要件核验
              </p>
            </div>
          </div>

          <div className="p-6 space-y-3 flex-1">
            {entry_checks.map((chk: EntryCheckItem, idx: number) => (
              <div
                key={idx}
                className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 space-y-1.5 text-xs relative overflow-hidden"
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    chk.status === 'satisfied' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <div className="flex items-center justify-between pl-2">
                  <span className="font-bold text-zinc-900">{chk.name}</span>
                  {chk.status === 'satisfied' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-mono font-medium">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      已满足
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-mono font-medium">
                      <Clock className="w-2.5 h-2.5 text-amber-600" />
                      待核验
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed pl-2">{chk.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 向专业人士提问清单 */}
        <div
          id="module-b6"
          className="lg:col-span-7 glass-panel rounded-2xl border border-zinc-200/90 shadow-elevation-1 overflow-hidden flex flex-col card-interactive"
        >
          <div className="px-6 py-4 bg-zinc-50/70 border-b border-zinc-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-xs">
                07
              </span>
              <div>
                <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  专家提问清单
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  要件缺口与实务模糊地带咨询准备
                </p>
              </div>
            </div>

            <span className="text-xs font-mono text-zinc-400">
              {counsel_questions.length} 项提问
            </span>
          </div>

          <div className="p-6 space-y-3 flex-1">
            {counsel_questions.map((qText: string, idx: number) => (
              <div
                key={idx}
                className="p-3.5 bg-zinc-50/70 hover:bg-zinc-50 rounded-xl border border-zinc-200 flex items-start justify-between gap-3 text-xs group transition-colors relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                <div className="flex items-start gap-2.5 pl-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded shrink-0 shadow-2xs">
                    Q{idx + 1}
                  </span>
                  <p className="text-zinc-800 leading-relaxed font-medium pt-0.5">{qText}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyQuestion(qText, idx)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-md transition-colors duration-150 shrink-0"
                  title="复制问题文本"
                >
                  {copiedQuestionIndex === idx ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      <span>已复制</span>
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
