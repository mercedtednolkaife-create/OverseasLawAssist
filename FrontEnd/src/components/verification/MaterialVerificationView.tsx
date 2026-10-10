import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { MaterialVerificationResult } from '../../types/lawAgent';
import { ShieldCheck, FileText, CheckCircle2, AlertTriangle, XCircle, ArrowRight, BookOpen } from 'lucide-react';

export const MaterialVerificationView: React.FC = () => {
  const { currentCase, openLawModal, showToast } = useApp();
  const [inputText, setInputText] = useState(
    `对方当事人提交了以下德国法法律依据作为抗辩理由：
1. 引用德国民法典第433条第1款第2句：“出卖人负有交付无瑕疵之物之义务”。
2. 引用德国民法典第434条主张只要货物符合约定品质即不构成物之瑕疵。
3. 引用联邦最高法院判例 BGH VIII ZR 12/20，抗辩称解除合同必须事先催告并指定合理履行期限。`
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MaterialVerificationResult | null>(null);

  const getMatchedEid = (refId: string): string => {
    if (!currentCase?.evidence) return 'E1';
    for (const [eid, ev] of Object.entries(currentCase.evidence)) {
      if (ev.ref_id && (refId.includes(ev.ref_id) || ev.ref_id.includes(refId))) {
        return eid;
      }
    }
    if (refId.includes('434')) return 'E2';
    if (refId.includes('433')) return 'E1';
    if (refId.includes('437')) return 'E3';
    if (refId.includes('439')) return 'E4';
    if (refId.includes('323')) return 'E5';
    if (refId.includes('377')) return 'E6';
    if (refId.includes('BGH') || refId.includes('ZR')) return 'E7';
    return 'E1';
  };

  const handleVerify = async () => {
    if (!inputText.trim()) {
      showToast('请先输入需要核验的外国法条文或抗辩文本', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await lawAgentApi.verifyForeignMaterials(inputText);
      setResult(res);
      showToast('材料核验比对已完成', 'success');
    } catch (err: any) {
      showToast(err.message || '核验请求失败，请稍后重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          当事人提交外国法材料真实性与现行性核验 (F16)
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          对当事人主张或提交的德意志联邦法法条、案号及引文进行真实性比对、现行效力核验及判例全文要件审查（对齐解释（二）第三条）
        </p>
      </div>

      {/* 文本输入框 */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">
            粘贴当事人提供的外国法抗辩意见或外国法查明材料文本
          </label>
          <textarea
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="粘贴含《德国民法典》条文引注、判例案号或陈述的文本..."
            className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 font-mono text-zinc-800 leading-relaxed bg-zinc-50/50 focus:bg-white"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 font-mono">
            支持自动抽提 § 法条条文、BGH 联邦法院案号并核验文字一致率
          </span>
          <button
            onClick={handleVerify}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150 shadow-xs disabled:opacity-50"
          >
            <span>{loading ? '正在比对官方库源...' : '执行逐项核验'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 核验报告结果 */}
      {result && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                核验结论汇总表 (逐项法源比对)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                检出 {result.summary.total} 处法源引用 ·{' '}
                <span className="text-zinc-900 font-mono font-medium">
                  {result.summary.verified_count} 处完全一致
                </span>{' '}
                ·{' '}
                <span className="text-amber-700 font-mono font-medium">
                  {result.summary.risk_count} 处提示修订过渡
                </span>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold text-zinc-500">
                  <th className="px-5 py-2.5">引述法源标的</th>
                  <th className="px-4 py-2.5">官方库存在性</th>
                  <th className="px-4 py-2.5">一致性判定</th>
                  <th className="px-5 py-2.5">判例全文要求</th>
                  <th className="px-5 py-2.5">核验说明与时点提示</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {result.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/70 transition-colors duration-150">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-900">{it.ref_id}</span>
                        {it.in_db && (
                          <button
                            type="button"
                            onClick={() => openLawModal(getMatchedEid(it.ref_id))}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                            title="查阅该法源全文与德汉对照"
                          >
                            <BookOpen className="w-3 h-3 text-blue-600" />
                            <span>查阅条文</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {it.in_db ? (
                        <span className="text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded text-[11px] font-medium border border-zinc-200 font-mono">
                          真实在库
                        </span>
                      ) : (
                        <span className="text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded text-[11px]">
                          库外条目
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {it.consistency_verdict === 'exact' && (
                        <span className="text-zinc-800 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-700" /> 完全一致
                        </span>
                      )}
                      {it.consistency_verdict === 'partial' && (
                        <span className="text-amber-700 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> 提示旧法
                        </span>
                      )}
                      {it.consistency_verdict === 'inconsistent' && (
                        <span className="text-rose-700 font-medium flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> 文字偏差
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {it.has_full_text ? (
                        <span className="text-zinc-700 font-mono text-[11px]">具备全文与案号</span>
                      ) : (
                        <span className="text-rose-600 font-medium">缺判例全文</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-zinc-700 leading-relaxed text-xs">
                      <p>{it.note}</p>
                      <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
                        {it.stand_note}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
