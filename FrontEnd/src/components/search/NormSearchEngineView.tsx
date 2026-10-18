import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { NormOrCaseItem, SearchFilter } from '../../types/lawAgent';
import { Search, ExternalLink, BookOpen } from 'lucide-react';

export const NormSearchEngineView: React.FC = () => {
  const { openLawDrawer, showToast, searchDefaultKind, searchDefaultQuery } = useApp();
  const [query, setQuery] = useState(searchDefaultQuery || '');
  const [selectedLaw, setSelectedLaw] = useState<string>('all');
  const [selectedKind, setSelectedKind] = useState<'all' | 'norm' | 'case'>(searchDefaultKind || 'all');
  const [items, setItems] = useState<NormOrCaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NormOrCaseItem | null>(null);

  // 同步外部/首页传入的检索参数
  useEffect(() => {
    if (searchDefaultQuery !== undefined) {
      setQuery(searchDefaultQuery);
    }
  }, [searchDefaultQuery]);

  useEffect(() => {
    if (searchDefaultKind) {
      setSelectedKind(searchDefaultKind);
    }
  }, [searchDefaultKind]);

  const handleSearch = async (targetQuery?: string) => {
    const q = targetQuery !== undefined ? targetQuery : query;
    setLoading(true);
    try {
      const filters: SearchFilter = {
        law: selectedLaw === 'all' ? undefined : selectedLaw,
        kind: selectedKind,
      };
      const res = await lawAgentApi.searchNormsAndCases(q, filters);
      const safeItems = Array.isArray(res) ? res : [];
      setItems(safeItems);
      if (safeItems.length > 0 && !selectedItem) {
        setSelectedItem(safeItems[0]);
      }
    } catch (err: any) {
      showToast(err.message || '检索法源失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch(query);
  }, [selectedLaw, selectedKind, searchDefaultQuery]);

  return (
    <div className="apple-page-pane max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 搜索控制台 */}
      <div className="apple-bento-card rounded-[28px] p-6 space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Search className="w-4 h-4 text-blue-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              域外法律法规与司法判例检索
            </h1>
          </div>
          <p className="text-xs text-slate-500 pl-11.5">
            直连美国统一商法典 (UCC)、特拉华公司法 (DGCL)、德国民商法典 (BGB/HGB) 与国际公约，支持跨法域双语多维检索
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入法条如 'UCC § 2-314' 或 'BGB § 437'，或输入中英德关键词如 '适销性担保'、'物之瑕疵'..."
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200/90 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600/80 bg-slate-50/50 focus:bg-white transition-all text-slate-900 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={selectedLaw}
              onChange={(e) => setSelectedLaw(e.target.value)}
              className="px-3 py-2.5 text-xs border border-slate-200/80 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600/80 shadow-2xs cursor-pointer"
            >
              <option value="all">全部法典 (All Laws & Codes)</option>
              <optgroup label="🇺🇸 美国法域 (US Law)">
                <option value="UCC">UCC · 统一商法典 (买卖篇)</option>
                <option value="DGCL">DGCL · 特拉华州普通公司法</option>
                <option value="USC">28 U.S.C. · 联邦诉讼取证法典</option>
              </optgroup>
              <optgroup label="🇩🇪 德国法域 (German Law)">
                <option value="BGB">BGB · 德国民法典</option>
                <option value="HGB">HGB · 德国商法典</option>
                <option value="GmbHG">GmbHG · 有限责任公司法</option>
                <option value="ZPO">ZPO · 民事诉讼法 (含§293)</option>
              </optgroup>
              <optgroup label="🌐 国际与区域公约 (International)">
                <option value="CISG">CISG · 联合国国际货物销售公约</option>
                <option value="Rome_I">Rome I · 欧盟罗马条例 I (冲突法)</option>
              </optgroup>
            </select>

            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value as any)}
              className="px-3 py-2.5 text-xs border border-slate-200/80 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600/80 shadow-2xs cursor-pointer"
            >
              <option value="all">全部类型 (法条与判例)</option>
              <option value="norm">成文法条文 (Statutes)</option>
              <option value="case">司法判例 (Cases)</option>
            </select>

            <button
              onClick={() => handleSearch()}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs shadow-blue-500/25 shrink-0 cursor-pointer active:scale-[0.98]"
            >
              检索
            </button>
          </div>
        </div>
      </div>

      {/* 结果分栏展示 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧列表 (5列) */}
        <div className="lg:col-span-5 apple-bento-card rounded-[28px] divide-y divide-slate-100/80 overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 bg-slate-50/80 text-xs font-semibold text-slate-600 flex items-center justify-between">
            <span>检索结果 ({items.length})</span>
            <span className="text-[11px] text-slate-400 font-mono">智能相关度排序</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">正在检索跨法域法源...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">未检索到匹配的条文或判例</div>
          ) : (
            <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 text-xs cursor-pointer transition-all duration-150 ${
                    selectedItem?.id === item.id
                      ? 'bg-blue-50/70 font-medium text-slate-900 border-l-2 border-blue-600'
                      : 'hover:bg-slate-50/80 text-slate-700 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-900">{item.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-600 uppercase font-mono font-medium">
                      {item.kind === 'norm' ? '法条' : '判例'}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 mt-1.5 line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.text_zh_machine}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧条文详情 (7列) */}
        <div className="lg:col-span-7 apple-bento-card rounded-[28px] p-6 space-y-5 sticky top-16">
          {selectedItem ? (
            <>
              <div className="border-b border-slate-100 pb-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold font-mono text-slate-900">
                    {selectedItem.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openLawDrawer(selectedItem.id.includes('434') ? 'E2' : selectedItem.id.includes('433') ? 'E1' : 'E3')}
                      className="text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium transition-all shadow-2xs hover:border-slate-300 active:scale-[0.98] cursor-pointer"
                      title="在右侧抽屉中对照研读"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                      <span>并排对照研读</span>
                    </button>
                    {selectedItem.source_url && (
                      <a
                        href={selectedItem.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-mono transition-colors"
                      >
                        官方出处
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedItem.title}
                </h3>
                {selectedItem.heading_path && (
                  <p className="text-[11px] text-slate-400 font-mono">
                    {selectedItem.heading_path}
                  </p>
                )}
              </div>

              {/* 官方外文原文 */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {selectedItem.id.startsWith('UCC') || selectedItem.id.startsWith('DGCL') || selectedItem.id.startsWith('USC') || selectedItem.id.startsWith('CASE:SCOTUS') || selectedItem.id.startsWith('CASE:2ND')
                    ? '英文官方条文与判决原文 (Official Legal Text)'
                    : '德语/外文官方合并文本 (Amtlicher Text / Official Text)'}
                </label>
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 text-xs font-mono text-slate-900 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedItem.text_de}
                </div>
              </div>

              {/* 中文对照 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    中文参考译文与法理要旨
                  </label>
                  <span className="text-[10px] text-slate-400">标准法学术语对齐</span>
                </div>
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/70 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedItem.text_zh_machine}
                </div>
              </div>

              {/* 效力与数据出处 */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-[11px] text-slate-600 font-mono space-y-1">
                <div>
                  <strong>公布与修订版本：</strong>{' '}
                  {selectedItem.stand || '官方最新现行生效版本'}
                </div>
                <div>
                  <strong>数据源机构：</strong>{' '}
                  {selectedItem.id.startsWith('UCC') || selectedItem.id.startsWith('DGCL') || selectedItem.id.startsWith('USC')
                    ? '康奈尔大学法律信息所 (LII) / 统一法律委员会 (ULC) 权威收录'
                    : selectedItem.id.startsWith('Rome_I')
                    ? '欧洲联盟官方公报 (EUR-Lex) 官方收录'
                    : '德国联邦司法部 (GII / RII) 授权公开数据库'}
                </div>
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-xs text-slate-400">
              请在左侧列表选择条目以展开详细条文与款项释义
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
