import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  BookOpen,
  Gavel,
  History,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const HomeLandingView: React.FC = () => {
  const { setCurrentView, setSearchDefaultKind, setSearchDefaultQuery, openCaseEntryModal } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState<'all' | 'norm' | 'case'>('all');

  const handleSearch = (overrideKind?: 'norm' | 'case') => {
    const kind = overrideKind || selectedKind;
    setSearchDefaultKind(kind);
    setSearchDefaultQuery(searchQuery.trim());
    setCurrentView('search');
  };

  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10 animate-in fade-in duration-300">
      {/* 总览页面同款双极光弥散底座与微网格景深 (Apple Bento 科技空间感) */}
      <div className="absolute top-0 left-6 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/15 via-indigo-400/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-10 right-6 w-[500px] h-[500px] bg-gradient-to-bl from-emerald-400/12 via-teal-300/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none -z-10" />

      {/* 顶部标题与快速检索区 */}
      <section className="text-center space-y-5">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-200/60 text-blue-700 text-xs font-medium shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>涉外法查明与深度研判智能工作台</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
            域外法查明辅助 Agent
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            涉外成文法典与司法判例深度智能查明工具
          </p>
        </div>

        {/* Apple Command Bar 极简居中搜索坞 */}
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 p-1.5 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgba(15,23,42,0.04)] focus-within:border-blue-600/80 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:shadow-[0_8px_30px_rgba(37,99,235,0.08)] transition-all duration-200">
            <div className="relative flex-1 flex items-center min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入法条或法律概念检索..."
                className="w-full pl-10 pr-18 py-2 text-sm bg-transparent border-none text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <kbd className="hidden sm:inline-flex items-center shrink-0 whitespace-nowrap text-[10px] text-slate-400 font-mono bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs mr-2 select-none pointer-events-none">
                Enter ↵
              </kbd>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden sm:flex items-center p-0.5 bg-slate-100/80 rounded-xl text-xs font-medium text-slate-600">
                <button
                  type="button"
                  onClick={() => setSelectedKind('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer ${
                    selectedKind === 'all'
                      ? 'bg-white text-blue-600 font-semibold shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKind('norm')}
                  className={`px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer ${
                    selectedKind === 'norm'
                      ? 'bg-white text-blue-600 font-semibold shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  法条
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKind('case')}
                  className={`px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer ${
                    selectedKind === 'case'
                      ? 'bg-white text-blue-600 font-semibold shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  案例
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSearch()}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-150 cursor-pointer shadow-xs shadow-blue-500/25 active:scale-[0.98]"
              >
                检索
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 四大核心功能卡片：统一高质感 Bento 视觉，消除默认选中的错觉 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* 功能 1：新建案件查明 */}
        <div
          onClick={openCaseEntryModal}
          className="group apple-bento-card rounded-[28px] p-6 sm:p-7 hover:border-blue-300/80 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between space-y-6 active:scale-[0.99]"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-200 ease-out group-hover:scale-105">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded-full border border-slate-200/60 font-mono">
                案情录入与推演
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                新建案件查明
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                录入涉外案件要素与诉求，启动智能查明流程
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
            <span>新建查明</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200 ease-out" />
          </div>
        </div>

        {/* 功能 2：域外法律检索 */}
        <div
          onClick={() => {
            setSearchDefaultKind('norm');
            setCurrentView('search');
          }}
          className="group apple-bento-card rounded-[28px] p-6 sm:p-7 hover:border-blue-300/80 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between space-y-6 active:scale-[0.99]"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-200 ease-out group-hover:scale-105">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded-full border border-slate-200/60 font-mono">
                成文法典 · BGB / UCC
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                域外法律检索
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                检索成文法典条文、款项结构与中外对照
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
            <span>进入法条检索</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200 ease-out" />
          </div>
        </div>

        {/* 功能 3：域外案例检索 */}
        <div
          onClick={() => {
            setSearchDefaultKind('case');
            setCurrentView('search');
          }}
          className="group apple-bento-card rounded-[28px] p-6 sm:p-7 hover:border-blue-300/80 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between space-y-6 active:scale-[0.99]"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-200 ease-out group-hover:scale-105">
                <Gavel className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded-full border border-slate-200/60 font-mono">
                权威裁判先例
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                域外案例检索
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                检索权威司法判例要旨与裁判先例
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
            <span>进入案例检索</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200 ease-out" />
          </div>
        </div>

        {/* 功能 4：历史查明案件 */}
        <div
          onClick={() => setCurrentView('cases')}
          className="group apple-bento-card rounded-[28px] p-6 sm:p-7 hover:border-blue-300/80 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between space-y-6 active:scale-[0.99]"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-200 ease-out group-hover:scale-105">
                <History className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded-full border border-slate-200/60 font-mono">
                案卷归档留痕
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                历史查明案件
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                查看与管理过往查明的案件记录与报告
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
            <span>查看案件记录</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200 ease-out" />
          </div>
        </div>
      </section>
    </div>
  );
};
