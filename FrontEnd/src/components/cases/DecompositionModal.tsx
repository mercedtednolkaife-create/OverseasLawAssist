import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { Issue, LegalQuestion, Fact } from '../../types/lawAgent';
import { CheckCircle2, Plus, Trash2, ListChecks, ArrowRight, ShieldCheck } from 'lucide-react';

interface DecompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DecompositionModal: React.FC<DecompositionModalProps> = ({ isOpen, onClose }) => {
  const { currentCase, refreshCurrentCase, showToast } = useApp();
  const [issues, setIssues] = useState<Issue[]>(currentCase?.issues || []);
  const [questions, setQuestions] = useState<LegalQuestion[]>(currentCase?.questions || []);
  const [facts, setFacts] = useState<Fact[]>(currentCase?.facts || []);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !currentCase) return null;

  const handleToggleFactDispute = (fid: string) => {
    setFacts(
      facts.map((f) => (f.fid === fid ? { ...f, disputed: !f.disputed } : f))
    );
  };

  const handleAddIssue = () => {
    const newId = `ISSUE-${issues.length + 1}`;
    setIssues([
      ...issues,
      {
        issue_id: newId,
        kind: 'law',
        text_zh: '',
        claim_ids: ['C1'],
        element_ids: ['e1'],
      },
    ]);
  };

  const handleRemoveIssue = (index: number) => {
    setIssues(issues.filter((_, idx) => idx !== index));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await lawAgentApi.confirmGate(currentCase.case_id, 's3', {
        issues: issues.filter((i) => i.text_zh.trim()),
        questions,
      });
      await refreshCurrentCase();
      showToast('S3 争点需求单已确认，工作流继续执行', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || '确认失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl border border-zinc-200 max-w-3xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3 border-b border-zinc-200 pb-4">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
            <ListChecks className="w-4 h-4 text-zinc-100" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              S3 查明事项拆解与争点需求单人工确认 (Interrupt Gate)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              区分事实争点与法律争点；人工标记双方争议事实；锁定进入 Researcher 检索的德语查询式
            </p>
          </div>
        </div>

        {/* 事实争议标记区 (F29: 人工确认哪些事实有争议) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
            1. 案情事实 F# 争议标记 (影响 Matcher 四态中 disputed 判定)
          </label>
          <div className="space-y-1.5 bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs">
            {facts.map((fact) => (
              <div
                key={fact.fid}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-200/60 last:border-0"
              >
                <div className="flex items-start gap-2">
                  <span className="font-mono font-bold text-zinc-900 shrink-0">
                    [{fact.fid}]
                  </span>
                  <span className="text-zinc-700 leading-normal">{fact.text_zh}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFactDispute(fact.fid)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-colors duration-150 ${
                    fact.disputed
                      ? 'bg-zinc-900 text-white border border-zinc-900 font-semibold'
                      : 'bg-zinc-200/80 text-zinc-700 hover:bg-zinc-300'
                  }`}
                >
                  {fact.disputed ? '双方存在争议 (Disputed)' : '客观无争议事实'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 争点清单编辑 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              2. 提炼之争议焦点 (事实争点 / 法律争点)
            </label>
            <button
              type="button"
              onClick={handleAddIssue}
              className="flex items-center gap-1 text-xs text-zinc-700 hover:text-zinc-900 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加争点</span>
            </button>
          </div>

          <div className="space-y-2">
            {issues.map((issue, idx) => (
              <div
                key={issue.issue_id}
                className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 grid grid-cols-12 gap-3 items-center text-xs"
              >
                <div className="col-span-3">
                  <select
                    value={issue.kind}
                    onChange={(e) => {
                      const copy = [...issues];
                      copy[idx].kind = e.target.value as 'fact' | 'law';
                      setIssues(copy);
                    }}
                    className="w-full px-2 py-1 text-xs border border-zinc-200 rounded-md bg-white font-medium"
                  >
                    <option value="law">法律规范争点</option>
                    <option value="fact">案情事实争点</option>
                  </select>
                </div>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={issue.text_zh}
                    onChange={(e) => {
                      const copy = [...issues];
                      copy[idx].text_zh = e.target.value;
                      setIssues(copy);
                    }}
                    placeholder="输入争点表述..."
                    className="w-full px-2.5 py-1 text-xs border border-zinc-200 rounded-md bg-white"
                  />
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveIssue(idx)}
                    className="text-zinc-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部确认操作 */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
          <span className="text-[11px] text-zinc-400 font-mono">
            人工确认后将锁定争点并由 Researcher 启动德语混合检索
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium"
            >
              稍后确认
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? '确认中...' : '确认需求单并执行检索'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
