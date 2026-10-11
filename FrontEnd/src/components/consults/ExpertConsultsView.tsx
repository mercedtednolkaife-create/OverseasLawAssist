import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { Expert, ConsultRecord } from '../../types/lawAgent';
import { Users, Send, CheckCircle2, FileText, Download, UserCheck, Shield } from 'lucide-react';

export const ExpertConsultsView: React.FC = () => {
  const { currentCase, showToast } = useApp();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [consults, setConsults] = useState<ConsultRecord[]>([]);
  const [selectedExpertId, setSelectedExpertId] = useState<string>('');
  const [questionText, setQuestionText] = useState(
    '针对案涉2021年订立之买卖合同，请就2022年1月1日德国买卖法大修后BGB § 434新旧物之瑕疵定义过渡适用出具专家咨询意见。'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const expList = await lawAgentApi.getExperts();
      const safeExp = Array.isArray(expList) ? expList : [];
      setExperts(safeExp);
      if (safeExp.length > 0 && !selectedExpertId) {
        setSelectedExpertId(safeExp[0].expert_id);
      }
      const consList = await lawAgentApi.getConsults(currentCase?.case_id);
      setConsults(Array.isArray(consList) ? consList : []);
    } catch (err: any) {
      showToast(err.message || '加载专家与会商数据失败', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [currentCase]);

  const handleCreateConsult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCase || !selectedExpertId) return;

    setIsSubmitting(true);
    try {
      await lawAgentApi.createConsult({
        case_id: currentCase.case_id,
        expert_id: selectedExpertId,
        question_snapshot: questionText,
        evidence_summary: `涉及法条: BGB § 433, § 434, § 437; 案件事实包括2021年交付与2022年法规修订衔接`,
      });
      await loadData();
      showToast('专家查明会商委托单已生成并进入流转', 'success');
    } catch (err: any) {
      showToast(err.message || '委托创建失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-700" />
          域外法专家库与会商流转管理 (最高院解释二第四条)
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          符合涉外民事关系法律适用法司法解释关于外国法专家资质审查、利益冲突排除及书面咨询意见固定流程
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧：会商发起与专家资质库 (5列) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 发起专家咨询表单 */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              发起域外法专家会商委托单
            </h3>

            <form onSubmit={handleCreateConsult} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  选择咨询专家 (已完成无利害关系审查)
                </label>
                <select
                  value={selectedExpertId}
                  onChange={(e) => setSelectedExpertId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-white font-medium focus:outline-none focus:border-zinc-400"
                >
                  {experts.map((exp) => (
                    <option key={exp.expert_id} value={exp.expert_id}>
                      {exp.name} · {exp.affiliation}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  委托咨询待澄清之疑难法律事项快照
                </label>
                <textarea
                  rows={4}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 leading-relaxed font-sans bg-zinc-50/50 focus:bg-white"
                  required
                />
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1 text-[11px] text-zinc-600">
                <div className="flex items-center gap-1.5 font-medium text-zinc-900">
                  <Shield className="w-3.5 h-3.5 text-zinc-700" />
                  利益冲突与独立性承诺
                </div>
                <p>入库专家均已按司法解释第四条提交无利害关系书面声明，排除利益冲突。</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? '正在生成委托包...' : '生成会商委托单并派发'}</span>
              </button>
            </form>
          </div>

          {/* 专家名录卡片 */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              德意志联邦法入库特聘专家名单
            </h3>
            <div className="space-y-2.5">
              {experts.map((exp) => (
                <div
                  key={exp.expert_id}
                  className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">{exp.name}</span>
                    <span className="text-zinc-700 bg-zinc-100 px-2 py-0.2 rounded text-[10px] font-mono border border-zinc-200">
                      资质已核验
                    </span>
                  </div>
                  <p className="text-zinc-700">{exp.title}</p>
                  <p className="text-[11px] text-zinc-400">{exp.affiliation}</p>
                  <div className="text-[10px] text-zinc-400 pt-1 font-mono">
                    专业领域: {exp.fields.join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：会商记录与专家书面回复 (7列) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              会商流转状态与专家正式书面回复 ({consults.length}份)
            </h3>
            <span className="text-xs text-zinc-400">独立归档 · 不与官方法源混级</span>
          </div>

          <div className="space-y-3.5">
            {consults.map((con) => (
              <div
                key={con.consult_id}
                className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div>
                    <span className="font-mono font-bold text-xs text-zinc-900">
                      {con.consult_id}
                    </span>
                    <h4 className="text-xs font-medium text-zinc-700 mt-0.5">
                      特邀专家: {con.expert_name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md text-xs font-medium font-mono">
                      已出具意见书
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {con.updated_at}
                    </span>
                  </div>
                </div>

                {/* 咨询事项快照 */}
                <div className="text-xs space-y-1">
                  <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                    委托咨询事项快照
                  </span>
                  <p className="text-zinc-800 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                    {con.question_snapshot}
                  </p>
                </div>

                {/* 专家回复全文 */}
                {con.reply && (
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                      专家正式意见书回函 (Amtliche Stellungnahme)
                    </span>
                    <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-zinc-900 leading-relaxed font-sans whitespace-pre-wrap">
                      {con.reply}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
