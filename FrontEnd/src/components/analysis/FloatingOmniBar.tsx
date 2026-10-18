import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Zap, X, ChevronUp, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { CaseChatResponse } from '../../types/lawAgent';

interface FloatingOmniBarProps {
  onTriggerRecalc?: () => void;
  currentWinRate?: number;
}

export const FloatingOmniBar: React.FC<FloatingOmniBarProps> = ({
  onTriggerRecalc,
  currentWinRate = 85,
}) => {
  const { currentCase, showToast, setCurrentView, sidebarCollapsed } = useApp();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [latestReply, setLatestReply] = useState<CaseChatResponse | null>(null);
  const [lastAskedQuery, setLastAskedQuery] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 监听屏幕尺寸，移动端不进行侧边栏中心偏移计算
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 快捷键 ⌘ K / Ctrl + K 唤醒并聚焦推演舱
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsHovered(true);
        setTimeout(() => inputRef.current?.focus(), 80);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 严格绑定后端真实数据：从当前案件的胜败要害与抗辩争点提取真正的快速假设变量
  const quickPrompts = useMemo(() => {
    if (currentCase?.strategic_assessment?.pivotal_factors?.length) {
      return currentCase.strategic_assessment.pivotal_factors.slice(0, 3);
    }
    if (currentCase?.issues?.length) {
      return currentCase.issues.slice(0, 3).map((iss) => iss.text_zh);
    }
    return [];
  }, [currentCase]);

  // 真实前后端对接：调用真实的 POST /cases/{case_id}/chat 接口
  const handleSimulate = async (customPrompt?: string) => {
    const textToRun = (customPrompt || query).trim();
    if (!textToRun) {
      showToast('请输入假设前提或提问内容，如：若通知延迟至第45天？', 'info');
      inputRef.current?.focus();
      return;
    }

    if (!currentCase?.case_id) {
      showToast('请先选择或加载一个有效案件', 'warning');
      return;
    }

    setIsSimulating(true);
    setLastAskedQuery(textToRun);

    try {
      // 真实调用后端法律推理 API
      const response = await lawAgentApi.chatWithCase(
        currentCase.case_id,
        [{ role: 'user', content: textToRun }],
        'practitioner',
        'neutral'
      );

      setLatestReply(response);
      setQuery('');

      if (onTriggerRecalc) {
        onTriggerRecalc();
      }
    } catch (err: any) {
      console.error('Chat simulation failed:', err);
      showToast(err?.message || '与后端 Agent 通信失败，请检查网络或服务', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  // 是否处于展开状态（鼠标悬浮、输入框聚焦、已有答复气泡或输入框有文字）
  const isExpanded = isHovered || isFocused || Boolean(latestReply) || Boolean(query);

  // 胜败关键变量遵循明确要求：仅在用户鼠标点击/聚焦输入框之后才平滑出现
  const showQuickPrompts = isFocused && quickPrompts.length > 0;

  // 依据侧边栏实际像素计算主工作区视觉绝对居中：展开时右偏 134px，折叠时右偏 38px
  const leftStyle = isMobile
    ? '50%'
    : `calc(50% + ${sidebarCollapsed ? 38 : 134}px)`;

  const content = (
    <div
      style={{ left: leftStyle }}
      className="fixed bottom-4 -translate-x-1/2 z-50 w-full max-w-xl px-4 flex flex-col items-center pointer-events-none transition-[left] duration-300 ease-in-out"
    >
      {/* 1. 真实后端 Agent 研判答复展示卡片 (Apple 浅色磨砂质感) */}
      {latestReply && (
        <div className="pointer-events-auto w-full mb-2 p-4 rounded-2xl bg-white/95 backdrop-blur-2xl text-xs text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.12)] border border-slate-200/80 animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[300px] overflow-y-auto space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-900 text-xs">
                查明 Agent 实时研判意见
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                {latestReply.model || 'Legal-Pro-v3'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentView('workspace')}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                title="前往完整工作台深入对话与沉淀意见"
              >
                深入咨询工作台 →
              </button>
              <button
                type="button"
                onClick={() => setLatestReply(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="关闭此条答复"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 提问回顾 */}
          <div className="text-[11px] text-slate-500">
            <strong className="text-slate-700 font-medium">提问假设：</strong> {lastAskedQuery}
          </div>

          {/* 研判正文 */}
          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
            {latestReply.reply}
          </div>

          {/* 援引条文依据 (真实后端提取) */}
          {latestReply.referenced_statutes && latestReply.referenced_statutes.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400">援引法条依据：</span>
              {latestReply.referenced_statutes.map((s, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. 真实快速假设变量气泡 (仅在点击/聚焦输入框之后平滑滑入，Apple 浅色磨砂质感) */}
      {showQuickPrompts && (
        <div className="pointer-events-auto w-full mb-2 p-1.5 rounded-xl bg-white/95 backdrop-blur-2xl text-xs text-slate-700 flex items-center justify-between gap-2 shadow-[0_6px_24px_rgba(15,23,42,0.08)] border border-slate-200/80 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium pl-1 shrink-0">
            <Zap className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] text-slate-600 font-semibold">胜败变量：</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap overflow-hidden">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => e.preventDefault()} // 防止点击候选标签时导致 input 失去焦点而提前关闭
                onClick={() => {
                  setQuery(p);
                  handleSimulate(p);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-100/90 hover:bg-blue-50 text-[10px] text-slate-700 hover:text-blue-700 border border-slate-200/70 hover:border-blue-200 transition-colors cursor-pointer truncate max-w-[170px]"
                title={p}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. 核心控制舱：浅色磨砂容器，极致微缩尺寸，平滑流体形变过渡 */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          if (!isFocused && !latestReply && !query) {
            setIsHovered(false);
          }
        }}
        onClick={() => {
          if (!isExpanded) {
            setIsHovered(true);
            setTimeout(() => inputRef.current?.focus(), 80);
          }
        }}
        className={`pointer-events-auto relative flex items-center bg-white/90 backdrop-blur-2xl rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden border border-slate-200/90 ${
          isExpanded
            ? 'w-full max-w-xl h-10 p-1 pl-3 shadow-[0_12px_36px_rgba(15,23,42,0.12)] border-slate-300/90'
            : 'w-[156px] h-[32px] px-2.5 shadow-[0_4px_20px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
        }`}
      >
        {/* 收折态内容 (极致压缩微胶囊指示条，展开时柔和渐隐) */}
        <div
          className={`flex items-center justify-between w-full transition-all duration-200 ease-out ${
            isExpanded
              ? 'opacity-0 scale-95 pointer-events-none absolute inset-0 px-2.5 flex items-center justify-between'
              : 'opacity-100 scale-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </span>
            <span className="font-semibold text-slate-800 text-[11px] tracking-tight whitespace-nowrap">
              Agent 智能追问
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
              ⌘K
            </kbd>
            <ChevronUp className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* 展开态内容 (Spotlight 输入推演舱，展开时平滑渐显) */}
        <div
          className={`flex items-center justify-between gap-2 w-full transition-all duration-250 ease-out ${
            isExpanded
              ? 'opacity-100 scale-100 delay-75'
              : 'opacity-0 scale-95 pointer-events-none absolute inset-0 px-2.5'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* AI 呼吸指示光球 */}
            <span className="relative flex h-2 w-2 shrink-0 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </span>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
              placeholder="向查明 Agent 提问当前案情，或输入假设条件实时重算..."
              className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              tabIndex={isExpanded ? 0 : -1}
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 提问推演按钮 */}
            <button
              type="button"
              onClick={() => handleSimulate()}
              disabled={isSimulating}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-60"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>研判中</span>
                </>
              ) : (
                <span>提问推演</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
