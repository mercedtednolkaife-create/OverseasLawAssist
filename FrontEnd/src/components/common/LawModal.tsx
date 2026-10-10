import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GradeBadge } from './GradeBadge';
import { Evidence } from '../../types/lawAgent';
import {
  X,
  ExternalLink,
  BookOpen,
  Copy,
  Check,
  ShieldCheck,
  Scale,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const LawModal: React.FC = () => {
  const {
    currentCase,
    lawModalEid,
    isLawModalOpen,
    closeLawModal,
    showToast,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'norm' | 'breakdown' | 'trace'>('norm');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isLawModalOpen || !currentCase) return null;

  const evidenceMap = currentCase.evidence || {};
  const currentEid = lawModalEid || 'E1';
  const evidence: Evidence | undefined = evidenceMap[currentEid];

  if (!evidence) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-6 max-w-md w-full shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">法源未找到</h3>
            <button
              onClick={closeLawModal}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            暂未索引到标识为 [{currentEid}] 的法源依据。
          </p>
        </div>
      </div>
    );
  }

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('德语官方原文已复制到剪贴板', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // 解析款项 Absatz
  const parseParagraphs = (text: string) => {
    const lines = text.split(/(?=\(\d+\))/g).filter(Boolean);
    if (lines.length > 1) {
      return lines.map((l, idx) => {
        const match = l.match(/^\((\d+)\)\s*([\s\S]*)$/);
        if (match) {
          return { num: `Absatz (${match[1]})`, content: match[2].trim() };
        }
        return { num: `段落 ${idx + 1}`, content: l.trim() };
      });
    }
    return [{ num: '正文全文', content: text }];
  };

  const paragraphs = parseParagraphs(evidence.text_de);

  // 关联本案要件
  const relatedElements = (currentCase.elements || []).filter((el) =>
    (currentCase.findings || []).some((f) =>
      (f.statements || []).some(
        (s) =>
          s.element_id === el.element_id &&
          (s.evidence_ids || []).includes(evidence.eid)
      )
    )
  );

  const translation =
    currentCase.translations?.[evidence.eid] ||
    '暂无对齐译文或由司法前置术语表自动对齐中';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 transition-all"
      onClick={closeLawModal}
    >
      <div
        className={`bg-white rounded-2xl border border-zinc-200/90 shadow-2xl flex flex-col overflow-hidden transition-all duration-150 ${
          isExpanded
            ? 'w-full max-w-5xl h-[90vh]'
            : 'w-full max-w-2xl max-h-[82vh] h-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 弹窗顶部栏：专业冷蓝徽标 + 条文引证 */}
        <div className="px-5 py-4 border-b border-zinc-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 truncate">
                  {evidence.ref_id}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 font-bold">
                  {evidence.eid}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
                {evidence.kind === 'norm' ? '德意志联邦法典成文法条文' : '联邦最高法院判例裁判'}
                {evidence.stand && ` · 现行效力版本: ${evidence.stand}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <GradeBadge grade={evidence.grade} />
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title={isExpanded ? '还原视窗' : '放大视窗'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={closeLawModal}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 视图 Tab 切换器 */}
        <div className="px-5 pt-2 border-b border-zinc-100 bg-zinc-50/70 flex gap-4 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('norm')}
            className={`pb-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'norm'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>官方条文原文与对齐译文</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            className={`pb-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'breakdown'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>款项逐段拆解 (Absatz)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trace')}
            className={`pb-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'trace'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>官方存证溯源信息</span>
          </button>
        </div>

        {/* 弹窗内容滚动区 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {activeTab === 'norm' && (
            <div className="space-y-4">
              {/* 德语官方原文卡片 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    德语官方逐字规范原文 (Verbindlicher Gesetzestext)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(evidence.text_de)}
                    className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200 transition-colors shadow-2xs font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>复制原文</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono leading-relaxed text-zinc-900 select-text whitespace-pre-wrap">
                  {evidence.text_de}
                </div>
              </div>

              {/* 中文对照释义卡片 */}
              <div className="space-y-2">
                <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  司法前置术语表约束之中译对照 (Arbeitsübersetzung)
                </span>
                <div className="p-4 bg-zinc-50/70 rounded-xl border border-zinc-200 text-xs leading-relaxed text-zinc-800">
                  {translation}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'breakdown' && (
            <div className="space-y-3">
              <div className="text-[11px] text-zinc-500 pb-1">
                德意志规范通常由多个款 (Absatz) 或句 (Satz) 组成，以下为按款拆解的规范结构：
              </div>
              {paragraphs.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {p.num}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(p.content)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-800"
                    >
                      复制本款
                    </button>
                  </div>
                  <p className="font-mono text-xs text-zinc-900 leading-relaxed">
                    {p.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'trace' && (
            <div className="space-y-3.5">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2.5 text-xs">
                <span className="font-bold text-zinc-900 block">
                  官方数据存证信息 (司法备案)
                </span>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-zinc-400 block">采集时间 (Fetched At):</span>
                    <span className="font-mono text-zinc-800 font-semibold">{evidence.fetched_at}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">官方公布状态 (Stand):</span>
                    <span className="font-mono text-zinc-800 font-semibold">{evidence.stand || '现行有效'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-400 block">德国联邦官方源站 URL:</span>
                    <a
                      href={evidence.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-blue-600 hover:underline break-all inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>{evidence.source_url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>

              {/* 关联本案构成要件 */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 text-xs">
                <span className="font-bold text-zinc-900 block">
                  本案关联构成要件 (Elements Linked)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {relatedElements.length > 0 ? (
                    relatedElements.map((el) => (
                      <span
                        key={el.element_id}
                        className="px-2 py-1 bg-white border border-zinc-200 rounded-md font-mono text-[11px] text-zinc-800 font-semibold shadow-2xs"
                      >
                        [{el.element_id}] {el.name_zh}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-400 text-[11px]">该条文为全案基础法理规范。</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 弹窗底部操作条 */}
        <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50/70 flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-zinc-400" />
            <span>符合最高院《域外法查明规定》官方成文法典标准</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={evidence.source_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-950 font-medium px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>在新标签页查阅联邦原网</span>
            </a>
            <button
              type="button"
              onClick={closeLawModal}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              完成查看
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
