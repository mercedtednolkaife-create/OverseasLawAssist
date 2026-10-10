import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { AlertTriangle, CheckCircle, ShieldAlert, ArrowRight } from 'lucide-react';

interface CisgGateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CisgGateModal: React.FC<CisgGateModalProps> = ({ isOpen, onClose }) => {
  const { currentCase, refreshCurrentCase, showToast } = useApp();
  const [selectedOption, setSelectedOption] = useState<'excluded' | 'applicable'>('excluded');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !currentCase) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await lawAgentApi.confirmGate(currentCase.case_id, 'cisg', {
        cisg_excluded: selectedOption === 'excluded',
      });
      await refreshCurrentCase();
      showToast(
        selectedOption === 'excluded'
          ? '已确认排除CISG，流程推进至德国国内法要件分析'
          : '已确认优先适用CISG，生成国际公约指引并完成当前阶段',
        'info'
      );
      onClose();
    } catch (err: any) {
      showToast(err.message || '确认失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl border border-zinc-200 max-w-lg w-full p-6 shadow-xl space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              S2 国际私法入口闸门：CISG 适用确认
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              案件检测到跨国货物买卖且当事人分处中德两国，触发国际货物销售公约优先审查
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-700 leading-relaxed space-y-1.5">
          <p className="font-semibold text-zinc-900">
            法律适用逻辑说明：
          </p>
          <p className="text-zinc-600">
            中国与德国均为《联合国国际货物销售合同公约》(CISG) 缔约国。若涉案买卖合同未在条款中以明确、不可撤回的方式排除 CISG，则依公约第1条第1款(a)项，应当优先适用 CISG，而非德国纯国内法（BGB/HGB）。
          </p>
        </div>

        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-zinc-800">
            请确认本案涉合同对于 CISG 的约定状态：
          </label>

          <div
            onClick={() => setSelectedOption('excluded')}
            className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors duration-150 ${
              selectedOption === 'excluded'
                ? 'border-blue-600 bg-blue-50/20 text-blue-900 ring-1 ring-blue-500/20'
                : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">选项 A：合同已明示排除 CISG（继续德国国内法查明）</span>
              {selectedOption === 'excluded' && <CheckCircle className="w-4 h-4 text-blue-600" />}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              例如合同载明“排除联合国国际货物销售合同公约，完全适用德意志联邦共和国法律”，继续进行 BGB 及 HGB 检索。
            </p>
          </div>

          <div
            onClick={() => setSelectedOption('applicable')}
            className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors duration-150 ${
              selectedOption === 'applicable'
                ? 'border-blue-600 bg-blue-50/20 text-blue-900 ring-1 ring-blue-500/20'
                : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">选项 B：合同未排除 CISG（输出公约适用提示并阻断）</span>
              {selectedOption === 'applicable' && <CheckCircle className="w-4 h-4 text-blue-600" />}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              依国际私法规则，直接输出 CISG 适用提示及公约条文，不再进行纯德国国内法实质要件比对。
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium transition-colors"
          >
            稍后处理
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
          >
            {loading ? '保存中...' : '确认并推进工作流'}
          </button>
        </div>
      </div>
    </div>
  );
};
