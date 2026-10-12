import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { CaseMeta } from '../../types/lawAgent';
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

export const CaseEntryForm: React.FC = () => {
  const { setCurrentView, loadCase, showToast } = useApp();

  const [jurisdiction, setJurisdiction] = useState<'de_federal' | 'us_commercial'>('de_federal');
  const [title, setTitle] = useState('');
  const [factsZh, setFactsZh] = useState('');
  const [claimsZh, setClaimsZh] = useState('');
  const [contractType, setContractType] = useState('货物买卖 (工业设备)');
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
      name: '工业设备买卖合同第18条',
      desc_zh: '约定合同成立、品质公差及德国法准据法条款',
      excerpt_zh: '本合同适用德意志联邦共和国实体法律，排除CISG之适用。',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddMaterial = () => {
    setMaterials([...materials, { name: '', desc_zh: '', excerpt_zh: '' }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, idx) => idx !== index));
  };

  const handleFillDemoDE = () => {
    setJurisdiction('de_federal');
    setTitle('中德精密数控机床买卖——精度超标、催告与合同解除查明');
    setFactsZh(`原告（德国买方）与被告（中国卖方）于2021年6月1日签订《精密数控机床国际买卖合同》，约定卖方交付5台数控加工中心，明确约定准据法为德国实体法。
货物于2021年9月15日运抵汉堡港仓库，买方于2021年9月20日拆箱安装通电测试，发现加工精度公差超出合同技术附件约定达0.05毫米，导致生产良品率严重不足。
买方于2021年9月22日向卖方发送正式函件指出上述公差缺陷，并催告卖方在2021年10月15日前派遣工程师至德国现场调试修复或更换合格部件。卖方回函辩称设备出厂检测合格，认为公差系运输途中间隙位移所致，未在指定期限内进行任何维修。
2021年10月20日，买方向卖方发出书面解除合同通知，要求退还全部已付设备货款85万欧元。`);
    setClaimsZh(`买方主张：设备存在严重物之瑕疵，卖方在合理期限内未进行事后履行，买方有权依法解除合同并退款。
卖方抗辩：设备出厂达标，买方未在交付当日即刻检验，且微小公差不构成重大违约，无权解除。`);
    setContractType('工业成套设备国际买卖');
    setPartiesStr('中国卖方 (被告), 德国买方 (原告)');
    setContractDate('2021-06-01');
    setEventDate('2021-09-15');
    setChoiceOfLaw('德国法 (German Law)');
    setCisgExcluded('yes');
    setBothMerchants(true);
    setMaterials([
      {
        name: '工业设备买卖合同第18条',
        desc_zh: '约定合同成立、品质公差及德国法准据法条款',
        excerpt_zh: '本合同适用德意志联邦共和国实体法律，排除CISG之适用。',
      },
    ]);
    setConsentAccepted(true);
    showToast('已载入德国联邦法示范案例 (C01)', 'info');
  };

  const handleFillDemoUS = () => {
    setJurisdiction('us_commercial');
    setTitle('中美跨国晶圆检测设备买卖合同违约与 UCC 默示适销性担保争议查明');
    setFactsZh(`2023年3月15日，买方上海某微电子公司与卖方加利福尼亚某半导体设备制造公司签订《晶圆光学检测仪采购合同》，约定购买2台定制化8英寸晶圆高精度缺陷检测机台，总价款320万美元，合同约定准据法为美国加利福尼亚州法（适用UCC统一商法典第二篇），并约定离岸交货后30日内完成验收测试。
2023年7月20日机台运抵上海浦东工厂，买方工程师连夜通电安装，在试运行过程中发现该设备在检测45纳米以下晶圆缺陷时，激光散射传感器发生规律性失焦，漏检率超过15%，无法达到行业通行的商用良率标准。
买方于2023年8月10日向卖方发出书面不合格通知（Notice of Defect），主张卖方违反UCC § 2-314关于默示适销性担保（Implied Warranty of Merchantability）及特种用途适合性担保，要求退回设备并返还已付定金及停线损失。
卖方抗辩称：合同附件技术规格书未对45nm以下极窄波段进行明示担保（Express Warranty），且格式订单背面印有“AS IS / 现状交付”免责小字条款（无加粗大写显著标示），买方在到货20天后才提出异议已构成不合理迟延，依法视为接受货物（UCC § 2-606），拒绝退款与赔偿。`);
    setClaimsZh(`买方主张：卖方交付设备未达通用商用标准，构成UCC § 2-314适销性违约；免责条款未经加粗显著标示依法无效（UCC § 2-316）；买方在合理期间内提出异议，依法享有拒收或撤回接受权。
卖方抗辩：订单背面印有AS IS条款已有效免除默示担保；买方怠于验收已构成法定接受；买方主张间接损失超出UCC救济限度。`);
    setContractType('半导体高科技工业设备买卖');
    setPartiesStr('中国买方 (原告/申诉人), 美国加州卖方 (被告/相对人)');
    setContractDate('2023-03-15');
    setEventDate('2023-07-20');
    setChoiceOfLaw('美国法 (加利福尼亚州 UCC & 联邦法)');
    setCisgExcluded('yes');
    setBothMerchants(true);
    setMaterials([
      {
        name: '晶圆光学检测仪买卖合同与技术附件',
        desc_zh: '约定设备型号、交货期限、验收期及美国加州法律管辖',
        excerpt_zh: 'This Agreement shall be governed by the laws of the State of California, including the Uniform Commercial Code (UCC).',
      },
      {
        name: '卖方销售订单背面格式条款',
        desc_zh: '卖方辩称含有 AS IS 默示担保免除条款',
        excerpt_zh: 'Goods sold as is without any express warranties unless specified in writing.',
      },
    ]);
    setConsentAccepted(true);
    showToast('已载入美国商事法示范案例 (C04)', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!factsZh.trim()) {
      showToast('案情事实经过为必填项', 'warning');
      return;
    }
    if (!contractDate) {
      showToast('合同订立日为德国法时点效力核验的强制必填项', 'error');
      return;
    }
    if (!consentAccepted) {
      showToast('请阅读并勾选合规与数据安全同意声明', 'warning');
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
        title: title || `涉外案件-${new Date().toLocaleDateString()}`,
        facts_zh: factsZh,
        claims_zh: claimsZh || undefined,
        meta,
        materials: materials.filter((m) => m.name.trim()),
        consent_version: 'v2026.10',
      });

      showToast(`案件 ${result.case_id} 创建成功，进入 Agent 工作台`, 'success');
      await loadCase(result.case_id, true);
      setCurrentView('workspace');
    } catch (err: any) {
      showToast(err.message || '创建案件失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
        {/* 表单头部 */}
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/70 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              涉外案情要素与法源查明录入
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              遵循《涉外民事关系法律适用法司法解释（二）》要素指引，输入涉案客观事实与时点参数
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillDemoDE}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-colors duration-150 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              德国法示范 (机床 C01)
            </button>
            <button
              type="button"
              onClick={handleFillDemoUS}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50/60 border border-blue-200 rounded-lg hover:bg-blue-100/60 transition-colors duration-150 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              美国法示范 (芯片机台 C04)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 目标法域选择 */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-2">
              目标涉外法域 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setJurisdiction('de_federal');
                  if (choiceOfLaw.includes('美国法')) setChoiceOfLaw('德国法 (German Law)');
                }}
                className={`p-3 text-left rounded-lg border transition-all ${
                  jurisdiction === 'de_federal'
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                    : 'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <span>🇩🇪</span> 德意志联邦法域 (German Law)
                  </span>
                  {jurisdiction === 'de_federal' && (
                    <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">当前选用</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  涵盖 BGB 民法典、HGB 商法典、GmbHG 公司法、Rome I 罗马条例及 BGH/OLG 权威判例
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setJurisdiction('us_commercial');
                  if (choiceOfLaw.includes('德国法')) setChoiceOfLaw('美国法 (加利福尼亚州 UCC & 联邦法)');
                }}
                className={`p-3 text-left rounded-lg border transition-all ${
                  jurisdiction === 'us_commercial'
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                    : 'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <span>🇺🇸</span> 美国商事与联邦法域 (US Law)
                  </span>
                  {jurisdiction === 'us_commercial' && (
                    <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">当前选用</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  涵盖 UCC 统一商法典第2篇、DGCL 特拉华公司法、28 U.S.C. 联邦诉讼取证及代表性先例
                </p>
              </button>
            </div>
          </div>

          {/* 案件标题 */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              案件名称 / 卷宗题名
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：中德工业数控机床买卖——精度超标与解除权查明"
              className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 bg-zinc-50/40 focus:bg-white"
            />
          </div>

          {/* 案情事实经过 (必填) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700">
                案情客观经过 (实体核对与要素抽取基础) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-zinc-400">
                客观中立陈述，不补充当事人未提供之事实
              </span>
            </div>
            <textarea
              rows={6}
              value={factsZh}
              onChange={(e) => setFactsZh(e.target.value)}
              placeholder="请详述案件事实经过：包括合同订立、货物交付、检验发现时间、所涉技术缺陷公差指标、往来函电催告内容及各方具体作为..."
              className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 leading-relaxed font-sans bg-zinc-50/40 focus:bg-white"
              required
            />
          </div>

          {/* 各方主张与抗辩 */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              各方主张与抗辩 (用于提炼争议焦点与争点分歧)
            </label>
            <textarea
              rows={3}
              value={claimsZh}
              onChange={(e) => setClaimsZh(e.target.value)}
              placeholder="原告主张：...&#10;被告抗辩：..."
              className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 leading-relaxed font-sans bg-zinc-50/40 focus:bg-white"
            />
          </div>

          {/* 核心元数据（法源时点与入口闸门） */}
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-4">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              准据法入口与时点效力核验参数
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  合同订立日 (必填) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none focus:border-zinc-400 font-mono"
                  required
                />
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  债之关系成立时点，决定实体法时点版本
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  主要事实发生日 / 交付日
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none focus:border-zinc-400 font-mono"
                />
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  用于核对履行、违约与损害发生时效
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  选法条款 (Choice of Law)
                </label>
                <input
                  type="text"
                  value={choiceOfLaw}
                  onChange={(e) => setChoiceOfLaw(e.target.value)}
                  placeholder={jurisdiction === 'de_federal' ? '德国法 (German Law)' : '美国法 (UCC & 特拉华州法)'}
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none focus:border-zinc-400"
                />
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  支持德意志联邦法域与美国商事/联邦法域
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-zinc-200">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  联合国货物买卖公约 (CISG) 排除状态
                </label>
                <select
                  value={cisgExcluded}
                  onChange={(e) => setCisgExcluded(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none focus:border-zinc-400"
                >
                  <option value="yes">已明确排除 CISG</option>
                  <option value="no">未排除 CISG (将触发公约优先适用)</option>
                  <option value="unconfirmed">未确认 / 合同未提 (待核查)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  双方当事人商主体资格
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
                    <input
                      type="radio"
                      name="merchant"
                      checked={bothMerchants}
                      onChange={() => setBothMerchants(true)}
                    />
                    均为商主体 (适用商事审慎规则)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
                    <input
                      type="radio"
                      name="merchant"
                      checked={!bothMerchants}
                      onChange={() => setBothMerchants(false)}
                    />
                    非双方商事行为 (普通民事/消费者)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  涉案合同类型
                </label>
                <input
                  type="text"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  placeholder="国际货物买卖 / 工业设备"
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none focus:border-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* 当事人提供的事实证据清单 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  事实证据材料清单 (意图证明之事实依据)
                </label>
                <p className="text-[11px] text-zinc-400">
                  当事人提供的合同、技术协议、检测报告、往来信函等证据材料
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMaterial}
                className="flex items-center gap-1 text-xs text-zinc-700 hover:text-zinc-900 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加材料条目</span>
              </button>
            </div>

            <div className="space-y-2">
              {materials.map((mat, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 grid grid-cols-12 gap-3 items-start"
                >
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="材料名称 (如：买卖合同)"
                      value={mat.name}
                      onChange={(e) => {
                        const copy = [...materials];
                        copy[idx].name = e.target.value;
                        setMaterials(copy);
                      }}
                      className="w-full px-2 py-1 text-xs border border-zinc-200 rounded-md bg-white"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="材料简述与证明目的"
                      value={mat.desc_zh}
                      onChange={(e) => {
                        const copy = [...materials];
                        copy[idx].desc_zh = e.target.value;
                        setMaterials(copy);
                      }}
                      className="w-full px-2 py-1 text-xs border border-zinc-200 rounded-md bg-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="关键摘录 (选填)"
                      value={mat.excerpt_zh}
                      onChange={(e) => {
                        const copy = [...materials];
                        copy[idx].excerpt_zh = e.target.value;
                        setMaterials(copy);
                      }}
                      className="w-full px-2 py-1 text-xs border border-zinc-200 rounded-md bg-white font-mono text-[11px]"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(idx)}
                      className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 同意声明与数据安全合规通知 */}
          <div className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-600 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-zinc-800">
                  数据安全与合规声明 (版本 v2026.10)
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  1. 依据涉外民事关系法律适用法与司法解释规定，本工具为涉外跨国商事实务（德国法 / 美国商事法）前置准备工具，不提供裁判预测与保证。
                  <br />
                  2. 案情文本在发往模型前将执行本地数据脱敏（替换当事人真实身份、脱敏金融账户及商业敏感编号）。
                  <br />
                  3. 案件数据仅保存在您绑定的固定只读快照沙箱内，90日后自动归档清理。
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 font-medium text-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="rounded border-zinc-300"
              />
              我已阅读并知悉上述查明服务定位与合规约束，确认提交上述案情事实
            </label>
          </div>

          {/* 提交按钮 */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentView('cases')}
              className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              取消并返回列表
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <span>{submitting ? '工作流启动中...' : '提交案情并开始查明'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
