import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Scale,
  Database,
  Cpu,
  Swords,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ChevronRight,
  X,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { AgentWorkflowResponse } from '../../types/lawAgent';
import { lawAgentApi } from '../../api/lawAgentApi';

interface AgentOrchestrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle?: string;
  jurisdiction?: 'de_federal' | 'us_commercial' | string;
  onEnterWorkspace?: () => void;
  onEnterAnalysis?: () => void;
}

interface PipelineStep {
  index: number;
  id: string;
  title: string;
  icon: React.ReactNode;
  summaryZh: string;
  detailZh: string;
}

export const AgentOrchestrationModal: React.FC<AgentOrchestrationModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  jurisdiction,
  onEnterWorkspace,
  onEnterAnalysis,
}) => {
  const [workflow, setWorkflow] = useState<AgentWorkflowResponse | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(16);
  const [logs, setLogs] = useState<Array<{ time: string; text: string }>>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const isUS =
    jurisdiction === 'us_commercial' ||
    jurisdiction?.includes('us') ||
    jurisdiction?.includes('美国');

  // 六大核心流程管道定义
  const pipelineSteps: PipelineStep[] = [
    {
      index: 1,
      id: 'extract',
      title: '事实要素抽取',
      icon: <FileText className="w-5 h-5" />,
      summaryZh: '提炼买卖合同、交货时点与瑕疵经过',
      detailZh: '已提取合同订立日、履行到货日、异议通知日等核心时空事实要素',
    },
    {
      index: 2,
      id: 'precheck',
      title: '准据法前检',
      icon: <Scale className="w-5 h-5" />,
      summaryZh: isUS ? '排除 CISG，指向美国加州 UCC' : '排除 CISG，指向德国 BGB/HGB',
      detailZh: isUS
        ? '涉外民事关系选法合法有效，明文排除 CISG，转入加州统一商法典'
        : '涉外民事关系选法合法有效，明文排除 CISG，适用德意志联邦实体法',
    },
    {
      index: 3,
      id: 'retrieval',
      title: '权威法典检索',
      icon: <Database className="w-5 h-5" />,
      summaryZh: isUS ? '检索 UCC 法条与联邦判例' : '检索 BGB/HGB 法典与 BGH 判例',
      detailZh: isUS
        ? '召回 UCC § 2-314 适销性担保、§ 2-607 检验通知与第二巡回法院先例'
        : '召回 BGB § 434 物之瑕疵、§ 437 买方权利、HGB § 377 与 BGH 判例',
    },
    {
      index: 4,
      id: 'subsumption',
      title: '构成要件涵摄',
      icon: <Cpu className="w-5 h-5" />,
      summaryZh: '四段论要件事实拟合推导',
      detailZh: '依大前提规范与小前提案件事实逐项对照，完成充分性与缺口检验',
    },
    {
      index: 5,
      id: 'red_team_strategist',
      title: '策略推演与红队',
      icon: <Swords className="w-5 h-5" />,
      summaryZh: isUS ? '模拟美方大律师失权抗辩' : '模拟德方大律师失权抗辩',
      detailZh: isUS
        ? '测算 UCC § 2-607 检验迟延失权抗辩攻防，推演证据反制破局点'
        : '测算 HGB § 377 商事检验即时通知失权抗辩攻防，推演证据反制破局点',
    },
    {
      index: 6,
      id: 'drafter',
      title: '查明意见生成',
      icon: <Sparkles className="w-5 h-5" />,
      summaryZh: '生成 B1~B6 分析看板与意见书',
      detailZh: '结构化沉淀争议焦点、构成要件比对表、证据链图谱与质证清单',
    },
  ];

  useEffect(() => {
    if (!isOpen) return;

    // 初始启动日志
    setLogs([
      {
        time: new Date().toLocaleTimeString([], { hour12: false }),
        text: `案件【${caseId}】研判流程启动，各阶段流水线按序打通中...`,
      },
    ]);

    let isMounted = true;

    const poll = async () => {
      try {
        const data = await lawAgentApi.getAgentWorkflow(caseId);
        if (!isMounted || !data) return;
        setWorkflow(data);

        const steps = data.steps || [];
        const completedCount = steps.filter((s) =>
          ['completed', 'verified', 'delivered'].includes(s.status)
        ).length;
        const total = Math.max(steps.length, 6);
        const percent = Math.min(100, Math.round((completedCount / total) * 100) || 16);
        setProgressPercent(percent);

        const allDone = steps.length > 0 && completedCount === steps.length;
        if (allDone) {
          setIsCompleted(true);
          setProgressPercent(100);
        }

        // 动态追加推进日志
        if (completedCount >= 1) {
          setLogs((prev) =>
            prev.some((l) => l.text.includes('1. 事实要素抽取'))
              ? prev
              : [
                  ...prev,
                  {
                    time: new Date().toLocaleTimeString([], { hour12: false }),
                    text: '✓ 1. 事实要素抽取已打通：完成签约主体、履行交货与瑕疵事实锚定。',
                  },
                ]
          );
        }
        if (completedCount >= 2) {
          setLogs((prev) =>
            prev.some((l) => l.text.includes('2. 准据法前检'))
              ? prev
              : [
                  ...prev,
                  {
                    time: new Date().toLocaleTimeString([], { hour12: false }),
                    text: isUS
                      ? '✓ 2. 准据法前检已打通：确认有效排除 CISG，适用加州 UCC 统一商法典。'
                      : '✓ 2. 准据法前检已打通：确认有效排除 CISG，适用德意志联邦实体法。',
                  },
                ]
          );
        }
        if (completedCount >= 3) {
          setLogs((prev) =>
            prev.some((l) => l.text.includes('3. 权威法典检索'))
              ? prev
              : [
                  ...prev,
                  {
                    time: new Date().toLocaleTimeString([], { hour12: false }),
                    text: isUS
                      ? '✓ 3. 权威法典检索已打通：检索完成 UCC § 2-314, § 2-607 现行条文与先例。'
                      : '✓ 3. 权威法典检索已打通：检索完成 BGB § 434, § 437, HGB § 377 现行法典与 BGH 裁判。',
                  },
                ]
          );
        }
        if (completedCount >= 4) {
          setLogs((prev) =>
            prev.some((l) => l.text.includes('4. 构成要件涵摄'))
              ? prev
              : [
                  ...prev,
                  {
                    time: new Date().toLocaleTimeString([], { hour12: false }),
                    text: '✓ 4. 构成要件涵摄已打通：完成四段论要件事实拟合与充分性判定。',
                  },
                ]
          );
        }
        if (completedCount >= 5) {
          setLogs((prev) =>
            prev.some((l) => l.text.includes('5. 策略推演与红队'))
              ? prev
              : [
                  ...prev,
                  {
                    time: new Date().toLocaleTimeString([], { hour12: false }),
                    text: '✓ 5. 策略推演与红队已打通：完成失权抗辩极端测算与反制破局点推导。',
                  },
                ]
          );
        }
        if (allDone) {
          setLogs((prev) =>
            prev.some((l) => l.text.includes('6. 查明意见生成'))
              ? prev
              : [
                  ...prev,
                  {
                    time: new Date().toLocaleTimeString([], { hour12: false }),
                    text: '✓ 6. 查明意见生成已打通：全流程 6 项核心环节全部打通完毕，成果就绪！',
                  },
                ]
          );
        }
      } catch {
        // silent
      }
    };

    poll();
    const interval = setInterval(poll, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, caseId, isUS]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) return null;

  // 获取某步骤状态：completed | running | pending
  const getStepStatus = (stepIndex: number): 'completed' | 'running' | 'pending' => {
    const steps = workflow?.steps || [];
    const step = steps[stepIndex - 1];
    if (step) {
      if (['completed', 'verified', 'delivered'].includes(step.status)) return 'completed';
      if (step.status === 'running') return 'running';
      return 'pending';
    }
    if (isCompleted) return 'completed';
    const activeIdx = Math.floor((progressPercent / 100) * 6) + 1;
    if (stepIndex < activeIdx) return 'completed';
    if (stepIndex === activeIdx) return 'running';
    return 'pending';
  };

  const completedCount = pipelineSteps.filter(
    (s) => getStepStatus(s.index) === 'completed'
  ).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50/95 backdrop-blur-xl flex flex-col justify-between overflow-y-auto text-zinc-900 select-none animate-in fade-in duration-200">
      {/* 顶部控制栏：纯净白底，极简高质感 */}
      <header className="px-6 py-4 bg-white border-b border-zinc-200 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-semibold text-zinc-900 tracking-tight">
                Multi-Agent 协同研判流程
              </h1>
              <span className="text-zinc-300">·</span>
              <span className="text-xs font-mono font-medium text-zinc-600">
                案号 {caseId}
              </span>
              <span className="text-zinc-300">·</span>
              <span className="text-xs text-zinc-500">
                {isUS ? '美国商事法 (UCC & 联邦判例)' : '德国联邦法 (BGB / HGB)'}
              </span>
            </div>
            {caseTitle && (
              <p className="text-xs text-zinc-500 truncate mt-0.5 max-w-xl">
                {caseTitle}
              </p>
            )}
          </div>
        </div>

        {/* 右侧动作 */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onEnterWorkspace && (
            <button
              onClick={() => {
                onEnterWorkspace();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>后台运行并进工作台</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="关闭窗口"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 主体视区：流程逐步打通的核心动画区域 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 flex flex-col justify-center space-y-8">
        {/* 标题与阶段打通进度指示 */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>六项核心研判环节已全部打通</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5 text-blue-600 animate-spin" />
                    <span>流水线逐项打通中 ({completedCount} / 6 已就绪)</span>
                  </>
                )}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {isCompleted
                  ? '事实要素、准据法指向、实体法典与四段论要件涵摄已闭环沉淀，可直接进入分析查看。'
                  : '各专业 Agent 正在依序执行：前序环节输出将作为下一环节的输入，实时贯通整条研判链条。'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-semibold text-zinc-700">
                {progressPercent}%
              </span>
              {isCompleted && onEnterWorkspace && (
                <button
                  onClick={() => {
                    onEnterWorkspace();
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>进入工作台</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 进度条 */}
          <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 逐项打通的流水线管道视图 (Progressively Unlocking Pipeline) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 relative">
          {pipelineSteps.map((step, idx) => {
            const status = getStepStatus(step.index);
            const isLast = idx === pipelineSteps.length - 1;

            return (
              <div key={step.id} className="relative flex flex-col">
                {/* 节点卡片 */}
                <div
                  className={`flex-1 rounded-xl border p-4 transition-all duration-300 flex flex-col justify-between ${
                    status === 'completed'
                      ? 'bg-white border-emerald-300 shadow-xs'
                      : status === 'running'
                      ? 'bg-blue-50/50 border-blue-400 ring-2 ring-blue-100 shadow-sm'
                      : 'bg-zinc-50/70 border-zinc-200 opacity-60'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* 节点头部：序号、图标与状态 */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                          status === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : status === 'running'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-200 text-zinc-500'
                        }`}
                      >
                        {status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : status === 'running' ? (
                          <RotateCcw className="w-4 h-4 animate-spin" />
                        ) : (
                          step.index
                        )}
                      </div>

                      <span
                        className={`text-[11px] font-medium ${
                          status === 'completed'
                            ? 'text-emerald-700'
                            : status === 'running'
                            ? 'text-blue-700 font-semibold'
                            : 'text-zinc-400'
                        }`}
                      >
                        {status === 'completed'
                          ? '已打通'
                          : status === 'running'
                          ? '打通中'
                          : '等待'}
                      </span>
                    </div>

                    {/* 标题 */}
                    <h3 className="text-xs font-semibold text-zinc-900">
                      {step.title}
                    </h3>

                    {/* 简要说明 */}
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {step.summaryZh}
                    </p>
                  </div>

                  {/* 底部详细产出 */}
                  <div className="pt-2.5 mt-2.5 border-t border-zinc-100 text-[11px] leading-normal">
                    <span
                      className={`${
                        status === 'completed'
                          ? 'text-zinc-700'
                          : status === 'running'
                          ? 'text-blue-800'
                          : 'text-zinc-400'
                      }`}
                    >
                      {status === 'pending' ? '前置环节完成后激活' : step.detailZh}
                    </span>
                  </div>
                </div>

                {/* 桌面端横向连接导流箭头 (视觉指示逐步贯通) */}
                {!isLast && (
                  <div className="hidden lg:flex absolute -right-2 top-8 -translate-y-1/2 z-10 text-zinc-300">
                    <ChevronRight
                      className={`w-4 h-4 ${
                        status === 'completed'
                          ? 'text-emerald-500'
                          : status === 'running'
                          ? 'text-blue-500 animate-pulse'
                          : 'text-zinc-300'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部流式打通执行日志卡片：清爽浅色背景 */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 text-xs">
            <span className="font-semibold text-zinc-800">
              流水线打通记录
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              实时同步中
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs text-zinc-600 font-mono pr-2">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-zinc-400 shrink-0 select-none">
                  [{log.time}]
                </span>
                <span
                  className={
                    log.text.startsWith('✓') ? 'text-zinc-800 font-medium' : 'text-zinc-600'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </main>

      {/* 底部操作条 */}
      <footer className="px-6 py-3.5 bg-white border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
        <span>符合涉外司法查明程序规范要求</span>
        <div className="flex items-center gap-3">
          {onEnterAnalysis && isCompleted && (
            <button
              onClick={() => {
                onEnterAnalysis();
                onClose();
              }}
              className="text-zinc-600 hover:text-zinc-900 font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>查看案情深度分析</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          {onEnterWorkspace && (
            <button
              onClick={() => {
                onEnterWorkspace();
                onClose();
              }}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              {isCompleted ? '进入工作台' : '后台运行'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
