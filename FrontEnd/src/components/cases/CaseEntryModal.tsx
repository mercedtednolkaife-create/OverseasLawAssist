import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { CaseMeta } from '../../types/lawAgent';
import {
  ShieldCheck,
  X,
  Plus,
  Trash2,
  ArrowRight,
  FileText,
  FileCheck2,
} from 'lucide-react';

interface CaseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CaseEntryModal: React.FC<CaseEntryModalProps> = ({ isOpen, onClose }) => {
  const { loadCase, showToast, openPipelineAnimation } = useApp();

  const [jurisdiction, setJurisdiction] = useState<'de_federal' | 'us_commercial'>('de_federal');
  const [title, setTitle] = useState('');
  const [factsZh, setFactsZh] = useState('');
  const [claimsZh, setClaimsZh] = useState('');
  const [contractType, setContractType] = useState('工业成套设备国际买卖');
  const [partiesStr, setPartiesStr] = useState('中国卖方, 德国买方');
  const [contractDate, setContractDate] = useState('2021-06-01');
  const [eventDate, setEventDate] = useState('2021-09-15');
  const [choiceOfLaw, setChoiceOfLaw] = useState('德国法 (German Law)');
  const [cisgExcluded, setCisgExcluded] = useState<string>('yes');
  const [bothMerchants, setBothMerchants] = useState(true);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [materials, setMaterials] = useState<
    Array<{ name: string; desc_zh: string; excerpt_zh: string }>
  >([
    {
      name: '设备买卖合同第18条',
      desc_zh: '约定合同成立、技术公差及德国法准据法条款',
      excerpt_zh: '本合同适用德意志联邦共和国实体法律，排除CISG之适用。',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddMaterial = () => {
    setMaterials([...materials, { name: '', desc_zh: '', excerpt_zh: '' }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, idx) => idx !== index));
  };

  const handleFillDemoDE = () => {
    setJurisdiction('de_federal');
    setTitle('中德精密数控机床买卖——精度超标、催告与合同解除查明案');
    setFactsZh(`原告（买方）与被告（卖方）于2021年6月1日签订《精密数控机床买卖合同》，约定卖方交付5台高精加工中心，明确约定准据法为德国实体法并排除公约。
标的物运抵仓库后拆箱调试，发现主轴同轴度公差超出合同标准达0.05毫米，导致良品率不足。
买方于通电测试后2日内向卖方发送正式函件指出上述公差缺陷，并催告卖方在合理期限内现场调试修复。卖方回函拒绝派员检修，买方遂书面通知解除合同并要求全额退款。`);
    setClaimsZh(`买方主张：设备存在严重物之瑕疵，卖方拒绝事后修补，买方依法享有单方解除合同退款及损害赔偿权。
卖方抗辩：买方未在收货第一时间检验已构成商事通知失权，且公差不构成根本违约。`);
    setContractType('工业成套设备国际买卖');
    setPartiesStr('中国卖方, 德国买方');
    setContractDate('2021-06-01');
    setEventDate('2021-09-15');
    setChoiceOfLaw('德国法 (German Law)');
    setCisgExcluded('yes');
    setBothMerchants(true);
    setConsentAccepted(true);
    showToast('已填入德国法查明示范要素', 'info');
  };

  const handleFillDemoUS = () => {
    setJurisdiction('us_commercial');
    setTitle('中美半导体晶圆检测设备买卖合同违约与 UCC 默示担保争议查明案');
    setFactsZh(`2023年3月15日，买卖双方订立《晶圆光学检测仪采购合同》，约定交付定制化检测机台，约定准据法为美国法律（适用 UCC 统一商法典第二篇），30日内完成验收。
机台安装通电试运行中发现激光散射传感器规律性失焦，漏检率超过15%，无法达标。
买方于到货23日后出具权威计量报告并发出不合格通知，主张违反 UCC § 2-314 默示适销性担保，要求退货并返还款项。
卖方抗辩称订单背面印有 AS IS 免责条款，且买方在23日后通知已超出合理检验期间构成迟延失权。`);
    setClaimsZh(`买方主张：设备未达通用商用标准构成 UCC 违约；免责条款未经加粗显著标示依法无效；23日属于复杂设备商业合理期间。
卖方抗辩：订单背面印有 AS IS 已免除担保；买方怠于验收已构成法定接受。`);
    setContractType('半导体高科技工业设备买卖');
    setPartiesStr('中国买方, 美国卖方');
    setContractDate('2023-03-15');
    setEventDate('2023-07-20');
    setChoiceOfLaw('美国法 (UCC 统一商法典)');
    setCisgExcluded('yes');
    setBothMerchants(true);
    setConsentAccepted(true);
    showToast('已填入美国法查明示范要素', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!factsZh.trim()) {
      showToast('案情事实经过为必填项', 'warning');
      return;
    }
    if (!contractDate) {
      showToast('合同订立日为锁定法典版本的必填项', 'error');
      return;
    }
    if (!consentAccepted) {
      showToast('请阅读并勾选合规确认声明', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const meta: CaseMeta = {
        jurisdiction,
        contract_type: contractType,
        parties: partiesStr.split(',').map((s) => s.trim()).filter(Boolean),
        contract_date: contractDate,
        event_date: eventDate || undefined,
        choice_of_law: choiceOfLaw,
        cisg_excluded: cisgExcluded === 'yes' ? true : cisgExcluded === 'no' ? false : null,
        both_merchants: bothMerchants,
      };

      const result = await lawAgentApi.createCase({
        title: title || `涉外查明案件-${new Date().toLocaleDateString()}`,
        facts_zh: factsZh,
        claims_zh: claimsZh || undefined,
        meta,
        materials: materials.filter((m) => m.name.trim()),
        consent_version: 'v2026.10',
      });

      onClose();
      await loadCase(result.case_id, true);
      openPipelineAnimation();
      showToast(`案件 ${result.case_id} 创建成功，已启动智能查明推演`, 'success');
    } catch (err: any) {
      showToast(err.message || '创建案件失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-md antialiased apple-modal-backdrop overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-2xl rounded-[28px] border border-slate-200/90 max-w-3xl w-full my-auto shadow-[0_24px_64px_rgba(0,0,0,0.18)] apple-modal-card flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏与快捷示范导入 */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 flex items-center justify-between gap-3 bg-white/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                新建案件查明
              </h2>
              <p className="text-xs text-slate-500">
                录入涉外案件客观事实、权利诉求与准据法参数，启动智能查明流程
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleFillDemoDE}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                <span>德国法示范</span>
              </button>
              <button
                type="button"
                onClick={handleFillDemoUS}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                <span>美国法示范</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="关闭弹窗"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 表单内容区 (支持独立滚动) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 小屏幕上的示范填充按钮 */}
          <div className="sm:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillDemoDE}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              <span>德国法示范</span>
            </button>
            <button
              type="button"
              onClick={handleFillDemoUS}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              <span>美国法示范</span>
            </button>
          </div>

          {/* 1. 目标涉外法域 */}
          <div className="apple-bento-card rounded-2xl p-5 space-y-4">
            <label className="block text-xs font-bold text-slate-900 tracking-tight">
              1. 选择目标涉外法域 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setJurisdiction('de_federal');
                  if (choiceOfLaw.includes('美国法')) setChoiceOfLaw('德国法 (German Law)');
                }}
                className={`p-4 text-left rounded-2xl border transition-all cursor-pointer ${
                  jurisdiction === 'de_federal'
                    ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500/20 text-slate-900 shadow-2xs'
                    : 'border-slate-200/80 bg-white/70 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold flex items-center gap-2">
                    <span>🇩🇪</span> 德意志联邦法域
                  </span>
                  {jurisdiction === 'de_federal' && (
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                      当前选用
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1.5 leading-relaxed text-slate-500">
                  涵盖德国民法典 (BGB)、商法典 (HGB)、有限责任公司法 (GmbHG) 及 BGH 权威裁判先例
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setJurisdiction('us_commercial');
                  if (choiceOfLaw.includes('德国法')) setChoiceOfLaw('美国法 (UCC 统一商法典)');
                }}
                className={`p-4 text-left rounded-2xl border transition-all cursor-pointer ${
                  jurisdiction === 'us_commercial'
                    ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500/20 text-slate-900 shadow-2xs'
                    : 'border-slate-200/80 bg-white/70 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold flex items-center gap-2">
                    <span>🇺🇸</span> 美国商事与联邦法域
                  </span>
                  {jurisdiction === 'us_commercial' && (
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                      当前选用
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1.5 leading-relaxed text-slate-500">
                  涵盖美国统一商法典 (UCC) 买卖篇、特拉华公司法 (DGCL) 及联邦巡回先例
                </p>
              </button>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                案件名称 / 题名
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：中德工业数控机床买卖——精度超标与解除权查明案"
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 bg-white transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* 2. 客观事实与诉求 */}
          <div className="apple-bento-card rounded-2xl p-5 space-y-4">
            <label className="block text-xs font-bold text-slate-900 tracking-tight">
              2. 客观事实经过与诉求主张
            </label>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  案情客观经过 <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] text-slate-400">客观中立陈述事实，包含合同交付、检验与异议时间</span>
              </div>
              <textarea
                rows={4}
                value={factsZh}
                onChange={(e) => setFactsZh(e.target.value)}
                placeholder="请详述案件事实：合同订立、标的物交付时间、到货检验发现的公差与缺陷指标、往来函件催告记录及各方实际作为..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 leading-relaxed bg-white transition-all shadow-2xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
                各方诉求与抗辩意见
              </span>
              <textarea
                rows={3}
                value={claimsZh}
                onChange={(e) => setClaimsZh(e.target.value)}
                placeholder="买方/原告主张：...&#10;卖方/被告抗辩：..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 leading-relaxed bg-white transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* 3. 合同参数与选法条款 */}
          <div className="apple-bento-card rounded-2xl p-5 space-y-4">
            <label className="block text-xs font-bold text-slate-900 tracking-tight">
              3. 合同参数与选法条款
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  合同订立日 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">用于锁定法典现行版本</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  异议通知 / 事实发生日
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">用于计算合理通知期限</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  选法条款约定
                </label>
                <input
                  type="text"
                  value={choiceOfLaw}
                  onChange={(e) => setChoiceOfLaw(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">如“适用德国法”或“适用纽约州UCC”</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">合同类型</label>
                <input
                  type="text"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">是否明示排除 CISG</label>
                <select
                  value={cisgExcluded}
                  onChange={(e) => setCisgExcluded(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                >
                  <option value="yes">已明示书面排除 CISG</option>
                  <option value="no">未排除（CISG 优先适用）</option>
                  <option value="unknown">未确认（启动准据法前检闸门）</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">双方商事实体属性</label>
                <select
                  value={bothMerchants ? 'yes' : 'no'}
                  onChange={(e) => setBothMerchants(e.target.value === 'yes')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                >
                  <option value="yes">双方均为商事实体 (触发商法条文)</option>
                  <option value="no">非双边商事实体 (普通民事买卖)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. 证明材料附件 */}
          <div className="apple-bento-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 tracking-tight">
                4. 关联证明材料与合同摘录
              </label>
              <button
                type="button"
                onClick={handleAddMaterial}
                className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200/80 hover:border-slate-300 px-2.5 py-1 rounded-lg transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加材料项</span>
              </button>
            </div>

            <div className="space-y-3">
              {materials.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white/70 border border-slate-200/80 space-y-2 text-xs relative"
                >
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => {
                        const updated = [...materials];
                        updated[idx].name = e.target.value;
                        setMaterials(updated);
                      }}
                      placeholder="材料名称，如《采购合同第18条》"
                      className="font-semibold text-slate-900 bg-white px-3 py-1.5 border border-slate-200 rounded-lg flex-1 focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10"
                    />
                    {materials.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="删除材料项"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    value={m.excerpt_zh}
                    onChange={(e) => {
                      const updated = [...materials];
                      updated[idx].excerpt_zh = e.target.value;
                      setMaterials(updated);
                    }}
                    placeholder="粘贴关键条款原文摘录..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-500/10 leading-relaxed font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 底部合规声明与操作按钮 */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
            <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>已确认输入案件事实客观真实，授权启动涉外法律智能查明推演</span>
            </label>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>正在启动查明...</span>
                  </>
                ) : (
                  <>
                    <span>启动智能查明推演</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
