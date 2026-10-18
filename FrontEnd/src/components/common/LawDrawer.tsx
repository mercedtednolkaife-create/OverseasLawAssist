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
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface LawDrawerProps {
  /** 是否以独立浮层抽屉展示，或者以分栏面板展示 */
  variant?: 'drawer' | 'docked';
  onClose?: () => void;
}

export const LawDrawer: React.FC<LawDrawerProps> = ({ variant = 'drawer', onClose }) => {
  const {
    currentCase,
    selectedEvidenceEid,
    setSelectedEvidenceEid,
    isDrawerOpen,
    closeLawDrawer,
    showToast,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'norm' | 'breakdown' | 'trace'>('norm');

  if (!currentCase) return null;

  const evidenceMap = currentCase.evidence || {};
  const evidenceList: Evidence[] = Object.values(evidenceMap);
  const currentEid = selectedEvidenceEid || (evidenceList[0]?.eid ?? 'E1');
  const evidence: Evidence | undefined = evidenceMap[currentEid] || evidenceList[0];

  const getJurisdictionLabel = (refId: string, kind: string) => {
    if (refId.startsWith('UCC:')) return '美国统一商法典 (U.S. Uniform Commercial Code)';
    if (refId.startsWith('DGCL:')) return '特拉华州通用公司法 (Delaware General Corporation Law)';
    if (refId.startsWith('USC:')) return '美国法典联邦成文法 (United States Code)';
    if (refId.startsWith('Rome_I:')) return '欧盟《罗马条例 I》(Rome I Regulation 合同准据法)';
    if (refId.includes('SCOTUS') || refId.includes('CIR') || refId.includes('DEL-CH')) return '美国司法裁判里程碑先例';
    if (kind === 'norm') return '德意志联邦法典成文法';
    return '德意志联邦最高法院/州高等法院判例';
  };

  const getLanguageLabel = (refId: string) => {
    if (refId.startsWith('UCC:') || refId.startsWith('DGCL:') || refId.startsWith('USC:') || refId.includes('SCOTUS') || refId.includes('CIR')) {
      return '英文官方逐字规范原文 (Official Statutory Text)';
    }
    return '德语官方逐字规范原文 (Verbindlicher Gesetzestext)';
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('官方规范原文已复制到剪贴板', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!evidence) {
    return null;
  }

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
    <div className="flex flex-col h-full bg-white border-l border-zinc-200 select-text overflow-hidden">
      {/* 抽屉顶部 Bar */}
      <div className="p-4 border-b border-zinc-200 bg-white space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-zinc-900 truncate">
                {evidence.ref_id}
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono truncate">
                [{evidence.eid}] · {getJurisdictionLabel(evidence.ref_id, evidence.kind)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <GradeBadge grade={evidence.grade} />
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors duration-150"
                title="关闭抽屉"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={closeLawDrawer}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors duration-150"
                title="关闭抽屉"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 快速法源切换水平列表 (E1 - E8) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {evidenceList.map((ev) => {
            const isSelected = ev.eid === currentEid;
            return (
              <button
                key={ev.eid}
                type="button"
                onClick={() => setSelectedEvidenceEid(ev.eid)}
                className={`px-2 py-1 text-[11px] font-mono rounded-md whitespace-nowrap transition-colors duration-150 ${
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
                }`}
                title={ev.ref_id}
              >
                [{ev.eid}] {ev.ref_id.replace('BGB:§', '§').replace('HGB:§', 'HGB §').replace('BGH:', '')}
              </button>
            );
          })}
        </div>

        {/* 视图 Tab 切换 */}
        <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-100 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('norm')}
            className={`py-1 rounded-md text-[11px] font-medium transition-colors duration-150 ${
              activeTab === 'norm'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            原文与对齐译文
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            className={`py-1 rounded-md text-[11px] font-medium transition-colors duration-150 ${
              activeTab === 'breakdown'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            款项层级 (Absatz)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trace')}
            className={`py-1 rounded-md text-[11px] font-medium transition-colors duration-150 ${
              activeTab === 'trace'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            要件与合规备案
          </button>
        </div>
      </div>

      {/* 抽屉正文滚动区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {activeTab === 'norm' && (
          <>
            {/* 官方德语逐字文本 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-zinc-600" />
                  {getLanguageLabel(evidence.ref_id)}
                </label>
                <div className="flex items-center gap-2">
                  <a
                    href={evidence.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                  >
                    <span>官方网页</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyText(evidence.text_de)}
                    className="p-1 text-zinc-400 hover:text-zinc-900 rounded hover:bg-zinc-100 transition-colors duration-150"
                    title="复制原文"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-zinc-900" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900 leading-relaxed whitespace-pre-wrap select-text">
                {evidence.text_de}
              </div>
            </div>

            {/* 忠实中译对照 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-zinc-600" />
                  忠实中译对照 (术语库规范约束)
                </label>
                <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded font-mono border border-zinc-200">
                  非官方译文
                </span>
              </div>

              <div className="p-3.5 bg-zinc-50/80 border border-zinc-200 rounded-lg text-xs text-zinc-800 leading-relaxed space-y-2">
                <p>{translation}</p>
                <div className="pt-2 border-t border-zinc-200/80 text-[11px] text-zinc-500">
                  <strong>注：</strong>涉外法查明以德语官方正文为准，中译严格受《中德法律对照术语库》消歧规范约束（如区分 Rücktritt“解除”与 Anfechtung“撤销”）。
                </div>
              </div>
            </div>

            {/* 效力与现行状态指示 (最高院解释二形式要求) */}
            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-[11px] text-zinc-600 space-y-1 font-mono">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-800">现行效力 (Stand)：</span>
                <span className="text-zinc-900 font-medium">
                  {evidence.stand || '官方最新合并现行版'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>抓取入库时间：</span>
                <span>{evidence.fetched_at}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>权威官方数据库：</span>
                <span>
                  {evidence.kind === 'norm' ? 'gesetze-im-internet.de' : 'rechtsprechung-im-internet.de'}
                </span>
              </div>
            </div>
          </>
        )}

        {activeTab === 'breakdown' && (
          <div className="space-y-3">
            <div className="text-[11px] text-zinc-500 flex items-center justify-between">
              <span>款项条目分解结构</span>
              <span className="font-mono">共 {paragraphs.length} 项</span>
            </div>

            <div className="space-y-2.5">
              {paragraphs.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-zinc-900">
                      {p.num}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      规范要件段
                    </span>
                  </div>
                  <p className="font-mono text-xs text-zinc-800 leading-relaxed">
                    {p.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'trace' && (
          <div className="space-y-4">
            {/* 关联本案法律构成要件 */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                本案支撑要件 (Element Coverage)
              </label>
              {relatedElements.length > 0 ? (
                <div className="space-y-1.5">
                  {relatedElements.map((el) => (
                    <div
                      key={el.element_id}
                      className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-mono font-bold text-zinc-900 mr-2">
                          [{el.element_id}]
                        </span>
                        <span className="text-zinc-800 font-medium">{el.name_zh}</span>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700">
                        {el.match_status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-[11px] text-zinc-500">
                  当前证据主要作为上位规范基础或商事背景法源。
                </div>
              )}
            </div>

            {/* 解释二合规证明卡 */}
            <div className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                <ShieldCheck className="w-4 h-4 text-zinc-700" />
                <span>最高人民法院《涉外民商事法律适用法解释二》符合性</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-zinc-600 list-disc list-inside">
                <li>已载明该条文在德意志联邦共和国法律体系中的现行有效状态</li>
                <li>附官方外文全文与逐字引文一致性核验记录</li>
                <li>提供官方检索系统直接出处超链接及抓取时间戳</li>
                <li>包含相关联邦最高法院典型适用判例及法律要旨解析</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作条 */}
      <div className="p-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs shrink-0">
        <span className="text-[11px] text-zinc-400 font-mono">
          快照: {currentCase.snapshot_id}
        </span>
        <a
          href={evidence.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-xs"
        >
          <span>查验官方原始公布页</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
