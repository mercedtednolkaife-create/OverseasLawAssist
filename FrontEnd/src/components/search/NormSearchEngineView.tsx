import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { NormOrCaseItem, SearchFilter } from '../../types/lawAgent';
import { Search, Filter, ExternalLink, BookOpen, Layers, CheckCircle, Sidebar as SidebarIcon } from 'lucide-react';

export const NormSearchEngineView: React.FC = () => {
  const { openLawModal, openLawDrawer, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [selectedLaw, setSelectedLaw] = useState<string>('all');
  const [selectedKind, setSelectedKind] = useState<'all' | 'norm' | 'case'>('all');
  const [items, setItems] = useState<NormOrCaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NormOrCaseItem | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const filters: SearchFilter = {
        law: selectedLaw === 'all' ? undefined : selectedLaw,
        kind: selectedKind,
      };
      const res = await lawAgentApi.searchNormsAndCases(query, filters);
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
    handleSearch();
  }, [selectedLaw, selectedKind]);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      {/* 搜索控制台 */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            域外法律法规与判例检索库
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            权威法源直连美国统一商法典 (UCC/LII)、德国联邦法规 (GII)、最高院判例库与欧盟跨国公约，支持跨法域双语多维检索
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入条文如 'UCC § 2-314' 或 'BGB § 437'，或输入中英德关键词如 '适销性担保'、'物之瑕疵'、'Merchantability'..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 bg-zinc-50/50 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedLaw}
              onChange={(e) => setSelectedLaw(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-700 font-medium"
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
              className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-700 font-medium"
            >
              <option value="all">全部类型 (法条与判例)</option>
              <option value="norm">成文法规范 (Normen / Statutes)</option>
              <option value="case">司法判例 (Cases / Precedents)</option>
            </select>

            <button
              onClick={handleSearch}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150 shadow-xs shrink-0"
            >
              执行检索
            </button>
          </div>
        </div>
      </div>

      {/* 结果分栏展示 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧列表 (5列) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-200 overflow-hidden shadow-xs">
          <div className="px-4 py-2.5 bg-zinc-50 text-xs font-semibold text-zinc-500 flex items-center justify-between">
            <span>命中条目 ({items.length})</span>
            <span className="text-[11px] text-zinc-400 font-mono">BM25 + BGE-M3 融合排序</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-400">正在检索跨法域域外法源...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-400">未检索到匹配的条文或判例</div>
          ) : (
            <div className="max-h-[680px] overflow-y-auto divide-y divide-zinc-100">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3.5 text-xs cursor-pointer transition-colors duration-150 ${
                    selectedItem?.id === item.id
                      ? 'bg-zinc-100 font-medium text-zinc-900'
                      : 'hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-zinc-900">{item.id}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-zinc-200 text-zinc-500 uppercase font-mono">
                      {item.kind}
                    </span>
                  </div>
                  <h4 className="text-xs font-medium text-zinc-800 mt-1 line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                    {item.text_zh_machine}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧条文详情 (7列) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200 p-6 space-y-5 shadow-xs sticky top-16">
          {selectedItem ? (
            <>
              <div className="border-b border-zinc-200 pb-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-mono text-zinc-900">
                    {selectedItem.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openLawDrawer(selectedItem.id.includes('434') ? 'E2' : selectedItem.id.includes('433') ? 'E1' : 'E3')}
                      className="text-xs text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors"
                      title="在右侧对照窗中并排研读"
                    >
                      <BookOpen className="w-3 h-3 text-blue-600" />
                      <span>对照窗研读</span>
                    </button>
                    <a
                      href={selectedItem.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-mono transition-colors"
                    >
                      官方出处
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <h3 className="text-xs font-semibold text-zinc-800">
                  {selectedItem.title}
                </h3>
                {selectedItem.heading_path && (
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {selectedItem.heading_path}
                  </p>
                )}
              </div>

              {/* 官方外文原文 */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  {selectedItem.id.startsWith('UCC') || selectedItem.id.startsWith('DGCL') || selectedItem.id.startsWith('USC') || selectedItem.id.startsWith('CASE:SCOTUS') || selectedItem.id.startsWith('CASE:2ND')
                    ? '英文官方条文与判决原文 (Official Legal Text)'
                    : '德语/外文官方合并文本 (Amtlicher Text / Official Text)'}
                </label>
                <div className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200 text-xs font-mono text-zinc-900 leading-relaxed whitespace-pre-wrap">
                  {selectedItem.text_de}
                </div>
              </div>

              {/* 中文对照 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    中文参考释义与要旨 (对齐中国涉外审判规范)
                  </label>
                  <span className="text-[10px] text-zinc-400">标准法学术语对齐</span>
                </div>
                <div className="p-3.5 bg-zinc-50/70 rounded-lg border border-zinc-200 text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap">
                  {selectedItem.text_zh_machine}
                </div>
              </div>

              {/* Stand 效力信息 */}
              <div className="p-3 bg-zinc-100/70 rounded-lg text-[11px] text-zinc-600 font-mono space-y-1">
                <div>
                  <strong>公布与修订批注 (Stand)：</strong>{' '}
                  {selectedItem.stand || '官方最新现行生效版本'}
                </div>
                <div>
                  <strong>数据来源：</strong>{' '}
                  {selectedItem.id.startsWith('UCC') || selectedItem.id.startsWith('DGCL') || selectedItem.id.startsWith('USC')
                    ? '康奈尔大学法律信息所 (LII) / 统一法律委员会 (ULC) 权威收录'
                    : selectedItem.id.startsWith('Rome_I')
                    ? '欧洲联盟官方公报 (EUR-Lex) 官方收录'
                    : '德国联邦司法部 (GII / RII) 授权公开数据库'}
                </div>
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-xs text-zinc-400">
              请在左侧列表选择条目以展开详细规定与款项结构
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
