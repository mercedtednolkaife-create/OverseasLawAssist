import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Check,
  ChevronRight,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export interface PipelineCaseMeta {
  id?: string;
  title: string;
  criticalDate?: string;
  contractAmount?: number;
  coverDiffAmount?: number;
  buyerCountry?: string;
  sellerCountry?: string;
  cisgClause?: 'excluded' | 'unspecified';
  jurisdiction?: 'de_federal' | 'us_commercial' | string;
}

interface CasePipelineAnimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  caseMeta?: PipelineCaseMeta;
}

// 5 阶段查明流水线定义，每个 Step 最短时间设置为 5 秒 (5000ms)，文字纯净精炼
export const buildPipelineStages = (caseMeta: PipelineCaseMeta) => {
  const isUS =
    caseMeta.jurisdiction === 'us_commercial' ||
    caseMeta.title?.includes('芯片') ||
    caseMeta.title?.includes('美国') ||
    caseMeta.title?.includes('UCC');

  const cisgExcluded = caseMeta.cisgClause === 'excluded';

  if (isUS) {
    return [
      {
        id: 'cisg-gate',
        stepNumber: '01',
        title: 'Agent正在执行准据法与国际公约适用审查',
        coreAction: cisgExcluded
          ? '核验选法条款有效性，确认明示排除 CISG，适用美国统一商法典 (UCC)'
          : '中美元首缔约国且未明示排除，优先适用 CISG 并以纽约州 UCC 补缺',
        durationMs: 5000, // 每个 Step 最短时间设置为 5 秒
        pills: ['选法条款审查', cisgExcluded ? '排除 CISG' : '优先适用 CISG', '行为时法有效性'],
      },
      {
        id: 'decomposition',
        stepNumber: '02',
        title: 'Agent正在执行涉外争议焦点结构化拆解',
        coreAction: '将买受人诉求拆解为合理通知期限、受领撤销与附随损失法定争点',
        durationMs: 5000,
        pills: ['UCC § 2-607 通知义务', 'UCC § 2-608 撤销受领', '附随损失范围'],
      },
      {
        id: 'hybrid-rag',
        stepNumber: '03',
        title: 'Agent正在执行条文与判例检索',
        coreAction: '检索纽约州 UCC 买卖篇规范与第二巡回法院、联邦最高法院金标准先例',
        durationMs: 5000,
        pills: ['UCC Article 2', 'Eastern Air Lines 先例', '先例存续效力验证'],
      },
      {
        id: 'verification',
        stepNumber: '04',
        title: 'Agent正在执行官方规范防伪与事实核验',
        coreAction: '对齐康奈尔 LII 官方条文，完成要件事实与随附证据材料闭环核对',
        durationMs: 5000,
        pills: ['官方条文文本', '证据闭环核验', '程序要件审查'],
      },
      {
        id: 'synthesis',
        stepNumber: '05',
        title: 'Agent正在执行法定要件审查与查明结论生成',
        coreAction: '完成违约救济与损失赔偿法定构成要件核验，生成涉外查明法律意见书',
        durationMs: 5000,
        pills: ['构成要件比对', '实体权利判定', '查明意见书就绪'],
      },
    ];
  }

  // 默认德国联邦法体系
  return [
    {
      id: 'cisg-gate',
      stepNumber: '01',
      title: 'Agent正在执行准据法与国际公约适用审查',
      coreAction: cisgExcluded
        ? '核验选法条款有效性，确认明示排除 CISG，适用《德国民法典》(BGB)'
        : '中德均为缔约国且未明示排除，优先适用 CISG 并由德国民法典补缺',
      durationMs: 5000, // 每个 Step 最短时间设置为 5 秒
      pills: ['选法条款审查', cisgExcluded ? '明示排除 CISG' : '优先适用 CISG', '行为时法有效性'],
    },
    {
      id: 'decomposition',
      stepNumber: '02',
      title: 'Agent正在执行涉外争议焦点结构化拆解',
      coreAction: '将核心诉求拆解为标的物瑕疵、合理宽限期解除与商事即刻检验争点',
      durationMs: 5000,
      pills: ['BGB § 437 救济权', 'BGB § 323 解除权', 'HGB § 377 商事检验'],
    },
    {
      id: 'hybrid-rag',
      stepNumber: '03',
      title: 'Agent正在执行条文与判例检索',
      coreAction: '检索《德国民法典》、《德国商法典》现行法条与联邦最高法院 (BGH) 裁判要旨',
      durationMs: 5000,
      pills: ['BGB / HGB 法典条文', 'BGH 判例裁判要旨', '法源引用拓扑'],
    },
    {
      id: 'verification',
      stepNumber: '04',
      title: 'Agent正在执行官方规范防伪与事实核验',
      coreAction: '逐条比对德国联邦官方 XML 法典文本，核验证据与事实要件对应性',
      durationMs: 5000,
      pills: ['官方权威文本核验', '事实证据链锚定', '形式合规审查'],
    },
    {
      id: 'synthesis',
      stepNumber: '05',
      title: 'Agent正在执行法定要件审查与查明结论生成',
      coreAction: '完成解除合同与损害赔偿法定构成要件核验，生成涉外查明意见书',
      durationMs: 5000,
      pills: ['要件充分性判定', '举证责任分配', '查明报告已就绪'],
    },
  ];
};

export const CasePipelineAnimationModal: React.FC<CasePipelineAnimationModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  caseMeta = {
    title: '涉外商事买卖物之瑕疵与救济查明案',
    buyerCountry: '中国',
    sellerCountry: '德国',
    cisgClause: 'excluded',
  },
}) => {
  const stages = useMemo(() => buildPipelineStages(caseMeta), [caseMeta]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      setStageProgress(0);
      setIsPaused(false);
      setIsFinished(false);
    }
  }, [isOpen]);

  // 每个 Step 最短时间 5 秒 (5000ms) 的平滑过渡定时器
  useEffect(() => {
    if (!isOpen || isPaused || isFinished) return;
    const currentStage = stages[activeIndex];
    const duration = currentStage.durationMs || 5000;
    const intervalMs = 50;
    const increment = (intervalMs / duration) * 100;

    const timer = setInterval(() => {
      setStageProgress((prev) => {
        if (prev + increment >= 100) {
          if (activeIndex < stages.length - 1) {
            setActiveIndex((idx) => idx + 1);
            return 0;
          } else {
            setIsFinished(true);
            return 100;
          }
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, isFinished, activeIndex, stages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none animate-in fade-in duration-300">
      {/* 磨砂半透明遮罩 */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        {/* 顶部控制栏 - Apple Bento Glass 风格 */}
        <div className="w-full flex items-center justify-between gap-3 mb-4 px-6 py-4 bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/25">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                <span className="text-xs font-semibold text-blue-600 font-mono tracking-wide">
                  Agent 正在实时查明推演 ({activeIndex + 1} / {stages.length})
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 truncate max-w-sm sm:max-w-xl mt-0.5">
                {caseMeta.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer active:scale-[0.98]"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" /> : <Pause className="w-3.5 h-3.5 text-slate-600" />}
              <span>{isPaused ? '继续' : '暂停'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveIndex(0);
                setStageProgress(0);
                setIsFinished(false);
                setIsPaused(false);
              }}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all cursor-pointer active:scale-[0.98]"
              title="重新推演"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-all cursor-pointer active:scale-[0.98]"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 空间 3D 景深卡片栈 */}
        <div className="relative w-full h-[410px] sm:h-[440px] flex items-center justify-center overflow-hidden py-4">
          {stages.map((stage, index) => {
            const offset = index - activeIndex;
            if (Math.abs(offset) > 2) return null;

            const isCurrent = offset === 0;
            const translateY = offset * 138;
            const scale = isCurrent ? 1 : Math.abs(offset) === 1 ? 0.92 : 0.84;
            const blurPx = isCurrent ? 0 : Math.abs(offset) === 1 ? 3 : 6;
            const opacity = isCurrent ? 1 : Math.abs(offset) === 1 ? 0.5 : 0.16;
            const zIndex = 30 - Math.abs(offset) * 10;

            return (
              <div
                key={stage.id}
                onClick={() => {
                  setActiveIndex(index);
                  setStageProgress(50);
                  setIsFinished(false);
                }}
                style={{
                  transform: `translateY(${translateY}px) scale(${scale})`,
                  filter: `blur(${blurPx}px)`,
                  opacity,
                  zIndex,
                  transition: 'all 600ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className={`absolute w-full max-w-3xl rounded-[32px] p-8 sm:p-9 transition-shadow ${
                  isCurrent
                    ? 'apple-bento-card border-slate-300/90 shadow-[0_20px_50px_rgba(0,0,0,0.12)] cursor-default'
                    : 'bg-white/80 backdrop-blur-xl border border-slate-200/70 shadow-sm cursor-pointer'
                }`}
              >
                {/* 阶段标题与序号 */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono text-base font-bold transition-colors ${
                        index < activeIndex || isFinished
                          ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/25'
                          : isCurrent
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {index < activeIndex || isFinished ? <Check className="w-5 h-5 stroke-[2.5]" /> : stage.stepNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          STEP 0{index + 1}
                        </span>
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 animate-pulse" />
                        )}
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                        {stage.title}
                      </h3>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                    {index < activeIndex || isFinished ? '已完成' : isCurrent ? '执行中 (5s)' : '等待中'}
                  </span>
                </div>

                {/* 核心动作描述 */}
                <div className="mt-5 px-5 py-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    {stage.coreAction}
                  </p>
                  {/* 当前步骤平滑进度条 */}
                  {isCurrent && !isFinished && (
                    <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-75 ease-linear shadow-xs"
                        style={{ width: `${stageProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 阶段要点徽标 */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {stage.pills.map((pill, pIdx) => {
                    const activePill =
                      index < activeIndex ||
                      isFinished ||
                      (isCurrent && stageProgress >= (pIdx + 1) * 30);
                    return (
                      <span
                        key={pIdx}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          activePill
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            activePill ? 'bg-blue-400' : 'bg-slate-300'
                          }`}
                        />
                        {pill}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 完成后弹出查看查明报告按钮 - Apple Bento Card 风格 */}
        {isFinished ? (
          <div className="w-full max-w-3xl flex items-center justify-between px-7 py-4 apple-bento-card rounded-[28px] mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-xl">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-xs font-semibold text-slate-800">
                全流程 5 项查明与要件核验已执行完毕
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onComplete) {
                  onComplete();
                } else {
                  onClose();
                }
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-xs shadow-blue-500/25 active:scale-[0.98]"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>查看Agent查明报告</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="h-10 mt-3" />
        )}
      </div>
    </div>
  );
};
