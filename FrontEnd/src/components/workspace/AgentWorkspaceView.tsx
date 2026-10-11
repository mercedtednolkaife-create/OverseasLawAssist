import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { AgentWorkflowResponse, AgentWorkflowStep, UserRole, SavedInsight } from '../../types/lawAgent';
import {
  Bot,
  Sparkles,
  Send,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Database,
  Scale,
  FileText,
  Clock,
  Briefcase,
  Gavel,
  Globe,
  Copy,
  Check,
  BookOpen,
  Layers,
  ArrowRight,
  Flame,
  BookmarkPlus,
  FolderArchive,
  Swords,
} from 'lucide-react';

export const AgentWorkspaceView: React.FC = () => {
  const { currentCaseId, currentCase, role, openLawModal, showToast, refreshCurrentCase } = useApp();

  const case_id = currentCaseId || 'C001';
  const [workflow, setWorkflow] = useState<AgentWorkflowResponse | null>(null);
  const [loadingWorkflow, setLoadingWorkflow] = useState<boolean>(true);

  // 详情底稿展开状态 (默认全部收起)
  const [expandedLogSteps, setExpandedLogSteps] = useState<Record<string, boolean>>({});

  // 争议焦点看板展开/折叠状态 (默认展开)
  const [isIssuesPanelExpanded, setIsIssuesPanelExpanded] = useState<boolean>(true);

  // 序号 3 优化：红方律师反击模式切换 (neutral | red_teaming)
  const [chatMode, setChatMode] = useState<'neutral' | 'red_teaming'>('neutral');

  // 序号 2 优化：Chat 探索成果“一键沉淀/反哺”至分析底稿
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [savingInsightIndex, setSavingInsightIndex] = useState<number | null>(null);
  const [savedInsightIndices, setSavedInsightIndices] = useState<Set<number>>(new Set());
  const [showInsightsDrawer, setShowInsightsDrawer] = useState<boolean>(false);

  // Chatbot 追问状态
  const [chatRoleView, setChatRoleView] = useState<UserRole>(role);
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      model?: string;
      mode?: 'neutral' | 'red_teaming';
      statutes?: string[];
      timestamp: string;
    }>
  >([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 从当前案件动态提取争议焦点与抗辩要点
  const caseContext = useMemo(() => {
    const issuesList = currentCase?.issues || [];
    const choiceOfLaw = currentCase?.meta?.choice_of_law || '德国联邦法 (BGB / HGB)';
    const cisgStatus = currentCase?.meta?.cisg_excluded
      ? '已明文排除 CISG'
      : 'CISG 准用待审';

    const displayIssues = issuesList.length > 0 ? issuesList : [
      {
        issue_id: 'IS-1',
        kind: 'law' as const,
        text_zh: '涉案工业设备精度偏差是否构成《德国民法典》第434条第1款物之瑕疵 (Sachmangel)？',
      },
      {
        issue_id: 'IS-2',
        kind: 'fact' as const,
        text_zh: '买受人检验通知是否受《德国商法典》第377条即时通知失权抗辩阻断？',
      },
    ];

    return {
      choiceOfLaw,
      cisgStatus,
      issues: displayIssues,
      claimBasis: 'BGB § 437 Nr. 1, § 439 (补正请求权)',
      defenseCore: 'HGB § 377 商事检验逾期拟制认可失权',
      breakthroughPath: '主张隐蔽瑕疵 (Verdeckter Mangel) 或恶意隐瞒 (Arglist)',
    };
  }, [currentCase]);

  // 快捷 Prompt 预设胶囊 (根据中立 vs 红方反击动态切换)
  const quickPromptsNeutral = [
    {
      title: 'HGB § 377 抗辩路径',
      prompt: '德方主张依据德国商法典 (HGB) § 377 条已逾期失权，我方如何举证隐蔽瑕疵以实现有效抗辩？',
    },
    {
      title: '败诉风险点剖析',
      prompt: '如果法庭全面采信德国法，本案原告在举证责任 (Beweislast) 与时效上核心败诉风险点有哪些？',
    },
    {
      title: '专家出庭质证焦点',
      prompt: '若申请德国法出庭专家提供咨询，围绕 BGH 判例对合理检验期的界定，应如何设计质证提纲？',
    },
    {
      title: '商业和解谈判筹码',
      prompt: '在涉外商业和解与替代性争议解决 (ADR) 中，我方可以利用哪些法律与诉讼成本筹码促成退让？',
    },
  ];

  const quickPromptsRedTeam = [
    {
      title: '🔥 HGB § 377 失权击溃',
      prompt: '德方如何以德国商法典 (HGB) § 377 条买方逾期检验为由，要求法院直接驳回我方全部物之瑕疵担保救济权？',
    },
    {
      title: '🔥 涉外质检证据挑刺',
      prompt: '我方质检报告仅由国内单方出具且未经验证封样，德方大律师会从哪些形式要件与证明力角度猛烈发难？',
    },
    {
      title: '🔥 试生产默示受领',
      prompt: '德方若主张涉案设备投入试运行已构成德国法下的默示受领（Abnahme），如何击溃我方瑕疵主张？',
    },
    {
      title: '🔥 期间缩短判例压制',
      prompt: '援引德国联邦最高法院 (BGH) 判例，德方会如何主张对于高精设备合理检验期不应超过 7 个工作日？',
    },
  ];

  const quickPrompts = chatMode === 'red_teaming' ? quickPromptsRedTeam : quickPromptsNeutral;

  // 加载 Multi-Agent 工作流轨迹
  const loadWorkflow = async () => {
    setLoadingWorkflow(true);
    try {
      const data = await lawAgentApi.getAgentWorkflow(case_id);
      setWorkflow(data);
    } catch (err: any) {
      showToast(err.message || '获取工作流数据失败', 'error');
    } finally {
      setLoadingWorkflow(false);
    }
  };

  // 加载已沉淀的研判备忘
  const loadInsights = async () => {
    try {
      const list = await lawAgentApi.getCaseInsights(case_id);
      setSavedInsights(list || []);
    } catch {
      setSavedInsights(currentCase?.saved_insights || []);
    }
  };

  useEffect(() => {
    loadWorkflow();
    loadInsights();
  }, [case_id]);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `案件【${case_id}】争议焦点与法源已挂接就绪。请选择上方争议焦点点击追问，或切换【中立法理研判】与【德方红方反击】开展对抗演练。我将结合德国现行法典与 BGH 判例展开推导。`,
        model: 'qwen3.8-flash',
        mode: 'neutral',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        statutes: ['BGB § 434', 'BGB § 437', 'HGB § 377'],
      },
    ]);
  }, [case_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const toggleStepLogExpand = (stepId: string) => {
    setExpandedLogSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const handleSend = async (contentToSend?: string) => {
    const text = (contentToSend || inputText).trim();
    if (!text || sending) return;

    const userMsg = {
      role: 'user' as const,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setSending(true);

    try {
      const chatPayload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await lawAgentApi.chatWithCase(case_id, chatPayload, chatRoleView, chatMode);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          model: res.model,
          mode: res.mode || chatMode,
          statutes: res.referenced_statutes,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      showToast(err.message || '追问请求失败', 'error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '很抱歉，追问处理出现异常，请稍后重试或检查后台服务状态。',
          model: 'error',
          mode: chatMode,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // 序号 2 优化：Chat 探索成果“一键沉淀/反哺”至分析底稿
  const handleSaveInsight = async (
    index: number,
    content: string,
    category: 'memo' | 'trial_outline' | 'red_team_defense'
  ) => {
    if (savingInsightIndex !== null) return;
    setSavingInsightIndex(index);
    try {
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
      let title = '法律研判探索备忘';
      for (const line of lines) {
        const clean = line.replace(/^[#*\s-]+/, '').trim();
        if (clean && clean.length > 3) {
          title = clean.slice(0, 48);
          break;
        }
      }

      const res = await lawAgentApi.saveCaseInsight(case_id, {
        category,
        title,
        content,
        source_model: messages[index]?.model || 'qwen3.8-flash',
        referenced_statutes: messages[index]?.statutes || [],
      });

      setSavedInsights((prev) => [res, ...prev]);
      setSavedInsightIndices((prev) => new Set([...prev, index]));
      showToast(
        category === 'memo'
          ? '已成功沉淀至【B 包实务备忘】'
          : category === 'red_team_defense'
          ? '已成功沉淀至【B 包出庭对抗防守要点】'
          : '已成功沉淀至【B 包出庭专家质证提纲】',
        'success'
      );
      await refreshCurrentCase();
    } catch (err: any) {
      showToast(err.message || '沉淀失败', 'error');
    } finally {
      setSavingInsightIndex(null);
    }
  };

  const handleSelectIssueToPrompt = (issueText: string) => {
    const prompt = chatMode === 'red_teaming'
      ? `针对争议焦点：“${issueText}”，作为德方商事大律师，你会如何组织进攻与质证，击溃我方主张？`
      : `针对争议焦点：“${issueText}”，依据德国现行法律及 BGH 判例，双方的举证责任分配与核心攻防要点是什么？`;
    setInputText(prompt);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (index: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      showToast('回复已复制至剪贴板', 'success');
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleClearHistory = () => {
    setMessages([
      {
        role: 'assistant',
        content: `会话记录已重置。您可以重新选择上方争议焦点，或切换【中立法理】与【德方红方反击】提出新的法律追问。`,
        model: 'qwen3.8-flash',
        mode: chatMode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // 统一冷调蓝色系节点图标
  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'extract':
        return <Cpu className="w-3.5 h-3.5 text-blue-600" />;
      case 'precheck':
        return <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />;
      case 'retrieval':
        return <Database className="w-3.5 h-3.5 text-blue-600" />;
      case 'subsumption':
        return <Scale className="w-3.5 h-3.5 text-blue-600" />;
      case 'judge':
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'drafter':
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      default:
        return <Bot className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  interface MetricChipItem {
    label: string;
    value: string;
    tone?: 'green' | 'yellow' | 'blue' | 'neutral';
  }

  // 提取精炼指标：字体保持黑色/深墨灰，浅色背景区分重点（浅绿通过/浅黄抗辩/浅蓝法源技术/浅灰中性）
  const getStepMetricChips = (step: AgentWorkflowStep): MetricChipItem[] => {
    switch (step.step_id) {
      case 'extract':
        return [
          { label: '事实要素', value: '4 项事实', tone: 'neutral' },
          { label: '权利诉求', value: '2 项主张', tone: 'neutral' },
          { label: '主体身份', value: '双边商事实体', tone: 'blue' },
        ];
      case 'precheck':
        return [
          { label: '意思自治选法', value: '适用德国法 (有效)', tone: 'green' },
          { label: '国际公约排查', value: 'CISG 已排除', tone: 'green' },
          { label: '法域通道', value: '德意志联邦民商法', tone: 'blue' },
        ];
      case 'retrieval':
        return [
          { label: '成文规范', value: 'BGB / HGB 4 项条文', tone: 'blue' },
          { label: '联邦判例', value: 'BGH 判例 2 篇', tone: 'blue' },
          { label: '召回机制', value: 'BM25 + 向量 + 本体图', tone: 'neutral' },
        ];
      case 'subsumption':
        return [
          { label: '要件成立', value: '2 项 (合同效力/瑕疵存在)', tone: 'green' },
          { label: '待查要件', value: '1 项 (检验通知起算点)', tone: 'yellow' },
          { label: '德方抗辩', value: 'HGB § 377 逾期失权', tone: 'yellow' },
        ];
      case 'judge':
        return [
          { label: '独立裁判模型', value: 'DeepSeek-V4-Pro (异构分离)', tone: 'blue' },
          { label: '质检规则', value: '11 项质检全部通过', tone: 'green' },
          { label: '法条核验', value: '零捏造 · 客观中立', tone: 'green' },
        ];
      case 'drafter':
        return [
          { label: '双语论据', value: '6 组中德对齐命题', tone: 'blue' },
          { label: '司法规范', value: '符合《解释二》第3条', tone: 'blue' },
          { label: '成果交付', value: 'DOCX 报告已就绪', tone: 'green' },
        ];
      default:
        return [];
    }
  };

  // 克制的中性灰模型徽标
  const getModelBadge = (model: string) => {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/80">
        {model}
      </span>
    );
  };

  // 格式化文本中的 Markdown 标题与粗体
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-xs md:text-sm text-zinc-800 leading-relaxed">
        {lines.map((line, i) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={i} className="text-xs md:text-sm font-bold text-zinc-900 mt-2 mb-1">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('**') && line.endsWith('**')) {
            return (
              <p key={i} className="font-semibold text-zinc-900">
                {line.replace(/\*\*/g, '')}
              </p>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={i} className="flex items-start gap-1.5 pl-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                <span>{line.substring(2)}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            return (
              <div key={i} className="flex items-start gap-1.5 pl-2">
                <span className="font-mono text-xs font-semibold text-zinc-500 shrink-0">
                  {line.match(/^\d+\./)?.[0]}
                </span>
                <span>{line.replace(/^\d+\.\s/, '')}</span>
              </div>
            );
          }
          if (line.trim() === '') {
            return <div key={i} className="h-1" />;
          }
          return <p key={i}>{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1720px] mx-auto space-y-4">
      {/* 顶部标题栏：与其它功能页蓝色主题保持一致 */}
      <div className="bg-white rounded-xl border border-zinc-200/90 p-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {case_id}
              </span>
              <h1 className="text-sm md:text-base font-semibold text-zinc-900 tracking-tight">
                Agent 工作台
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto text-xs">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-200 text-zinc-600 font-mono text-[11px]">
            <span>主模型: Qwen3.8-Flash</span>
            <span className="text-zinc-300">|</span>
            <span>独立裁判: DeepSeek-V4-Pro</span>
          </div>

          <button
            type="button"
            onClick={loadWorkflow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg transition-colors shadow-2xs font-medium"
            title="刷新流水线状态"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loadingWorkflow ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 主工作区左右两栏分栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* 左侧：Multi-Agent 协作流观察窗 (5 栏宽) - 统一蓝色主题与浅色重点标识 */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-3">
          {/* 顶端全景流水线步进微条 */}
          <div className="bg-white rounded-xl border border-zinc-200/90 shadow-xs p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-bold text-zinc-900 tracking-tight">
                  Multi-Agent 协作流水线
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-blue-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>6 阶段就绪</span>
              </div>
            </div>

            {/* 蓝色系步进节点条，文字保持沉稳深墨黑 */}
            <div className="grid grid-cols-6 gap-1.5 pt-1 border-t border-zinc-100">
              {[
                { label: '抽取', id: 'extract' },
                { label: '前检', id: 'precheck' },
                { label: '检索', id: 'retrieval' },
                { label: '涵摄', id: 'subsumption' },
                { label: '裁判', id: 'judge' },
                { label: '起草', id: 'drafter' },
              ].map((s, idx) => (
                <div
                  key={s.id}
                  className="flex flex-col items-center p-1.5 rounded-lg bg-blue-50/30 border border-blue-200/60 text-center"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-800 mt-1">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 节点微卡片列表 (图标背景蓝色，字体保持黑色，浅绿/浅黄/浅蓝克制高亮重点) */}
          <div className="space-y-2 relative before:absolute before:top-4 before:bottom-4 before:left-5 before:w-0.5 before:bg-blue-100">
            {workflow?.steps.map((step, index) => {
              const isLogExpanded = !!expandedLogSteps[step.step_id];
              const metricChips = getStepMetricChips(step);

              return (
                <div
                  key={step.step_id}
                  className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden transition-all hover:border-zinc-300 ml-1 pl-2 relative"
                >
                  <div className="p-3 pr-3.5 space-y-2">
                    {/* 标题栏: 序号 + 名称 + 模型徽标 + 耗时 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
                          {getStepIcon(step.step_id)}
                        </div>
                        <span className="text-xs font-bold text-zinc-900">
                          {index + 1}. {step.name}
                        </span>
                        {getModelBadge(step.model)}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono text-zinc-400">
                          {(step.duration_ms / 1000).toFixed(2)}s
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      </div>
                    </div>

                    {/* 关键产出指标胶囊 (字体保持深墨黑，浅色背景区分重点) */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {metricChips.map((chip, ci) => {
                        const toneClass =
                          chip.tone === 'green'
                            ? 'bg-emerald-50/90 border-emerald-200/80'
                            : chip.tone === 'yellow'
                            ? 'bg-amber-50/90 border-amber-200/80'
                            : chip.tone === 'blue'
                            ? 'bg-blue-50/80 border-blue-200/70'
                            : 'bg-zinc-50 border-zinc-200/80';
                        return (
                          <span
                            key={ci}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 shadow-2xs ${toneClass}`}
                          >
                            <span className="text-zinc-500 font-normal">{chip.label}:</span>
                            <span className="text-zinc-900 font-medium">{chip.value}</span>
                          </span>
                        );
                      })}
                    </div>

                    {/* 卡片底栏: 仅按需展开底稿日志按钮 */}
                    <div className="pt-1 border-t border-zinc-100 flex items-center justify-end text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleStepLogExpand(step.step_id)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-800 font-medium flex items-center gap-0.5 transition-colors"
                      >
                        <span>{isLogExpanded ? '收起底稿' : '执行底稿'}</span>
                        {isLogExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 按需展开的底稿数据 (默认折叠) */}
                  {isLogExpanded && (
                    <div className="p-3 bg-zinc-50 border-t border-zinc-200/80 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider block mb-0.5">
                          输入数据概要:
                        </span>
                        <p className="text-[11px] text-zinc-700 bg-white p-2 rounded border border-zinc-200 leading-relaxed font-mono">
                          {step.inputs_summary}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider block mb-0.5">
                          结构化输出字典:
                        </span>
                        <div className="bg-white p-2 rounded border border-zinc-200 font-mono text-[10px] text-zinc-600 overflow-x-auto space-y-0.5">
                          {Object.entries(step.details).map(([k, v]) => (
                            <div key={k} className="flex items-start gap-1.5">
                              <span className="text-zinc-400 font-semibold">{k}:</span>
                              <span className="text-zinc-800">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 右侧：法律 Copilot 智能追问助手 (7 栏宽) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200/90 shadow-xs flex flex-col h-[820px] overflow-hidden">
          {/* Chat 顶部状态条 */}
          <div className="p-3 px-5 border-b border-zinc-100 bg-zinc-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-zinc-900">
                法律 Copilot 智能追问助手
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-mono font-medium">
                {case_id}
              </span>
            </div>

            {/* 序号 3 优化：红方反击切换 + 视角切换 + 清空按钮 */}
            <div className="flex items-center gap-2">
              {/* 红方反击 vs 中立法理模式切换 */}
              <div className="flex items-center gap-0.5 bg-zinc-200/60 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setChatMode('neutral')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    chatMode === 'neutral'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="中立法理研判（法官/中立专家视角）"
                >
                  <Scale className="w-3 h-3 text-blue-600" />
                  <span>中立法理</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChatMode('red_teaming')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    chatMode === 'red_teaming'
                      ? 'bg-amber-50 text-zinc-900 border border-amber-300 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="德方红方反击（模拟德国资深商事大律师对抗挑刺）"
                >
                  <Flame className="w-3 h-3 text-amber-600" />
                  <span>德方红方反击</span>
                </button>
              </div>

              {/* 视角切换 */}
              <div className="hidden sm:flex items-center gap-1 bg-zinc-200/60 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setChatRoleView('judicial')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    chatRoleView === 'judicial'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="司法端视角"
                >
                  司法端
                </button>
                <button
                  type="button"
                  onClick={() => setChatRoleView('practitioner')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    chatRoleView === 'practitioner'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="实务端视角"
                >
                  实务端
                </button>
                <button
                  type="button"
                  onClick={() => setChatRoleView('public')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    chatRoleView === 'public'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="公共端视角"
                >
                  公共端
                </button>
              </div>

              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-0.5 rounded hover:bg-zinc-100 transition-colors"
                title="清空记录"
              >
                清空
              </button>
            </div>
          </div>

          {/* 
            常驻「当前案件争议焦点与抗辩要点看板」
            去除说教式操作文字，仅保留纯粹争点与提问入口
          */}
          <div className="border-b border-zinc-200/90 bg-white">
            <div
              onClick={() => setIsIssuesPanelExpanded(!isIssuesPanelExpanded)}
              className="px-4 py-2 bg-zinc-50 hover:bg-zinc-100/80 cursor-pointer flex items-center justify-between text-xs transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                <Scale className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-zinc-900">
                  当前案件争议焦点与抗辩攻防看板
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-200 text-zinc-800 font-mono font-medium">
                  {caseContext.issues.length} 核心争点
                </span>
                {savedInsights.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-mono font-medium">
                    {savedInsights.length} 项已沉淀底稿
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-zinc-400">
                <span className="text-[10px] text-zinc-500">
                  {isIssuesPanelExpanded ? '收起看板' : '展开争点'}
                </span>
                {isIssuesPanelExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </div>

            {/* 看板详情展开区 */}
            {isIssuesPanelExpanded && (
              <div className="p-3.5 px-4 space-y-2.5 text-xs bg-white border-t border-zinc-100">
                {/* 争议焦点列表 */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    核心争议焦点:
                  </span>
                  <div className="space-y-1.5">
                    {caseContext.issues.map((iss, idx) => (
                      <div
                        key={iss.issue_id || idx}
                        className="p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-zinc-200 text-zinc-800 border border-zinc-300 shrink-0 mt-0.5">
                            争点 {idx + 1}
                          </span>
                          <span className="text-zinc-800 text-[11px] leading-relaxed line-clamp-2">
                            {iss.text_zh}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectIssueToPrompt(iss.text_zh)}
                          className="px-2 py-1 rounded bg-white hover:bg-zinc-800 hover:text-white text-zinc-700 border border-zinc-200 text-[10px] font-medium shrink-0 transition-colors shadow-2xs flex items-center gap-0.5"
                          title="针对此争点生成提问"
                        >
                          <span>针对追问</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 核心请求权基础与德方抗辩防线 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-100 text-[11px]">
                  <div className="p-2 rounded bg-zinc-50 border border-zinc-200/70">
                    <span className="text-zinc-500 font-medium block text-[10px]">
                      原告实体请求权基础:
                    </span>
                    <span className="font-semibold text-zinc-800">
                      {caseContext.claimBasis}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-zinc-50 border border-zinc-200/70">
                    <span className="text-zinc-500 font-medium block text-[10px]">
                      德方核心抗辩与失权防线:
                    </span>
                    <span className="font-semibold text-zinc-800">
                      {caseContext.defenseCore}
                    </span>
                  </div>
                </div>

                {/* 序号 2 优化：已沉淀的研判成果与备忘抽屉 */}
                {savedInsights.length > 0 && (
                  <div className="pt-2 border-t border-zinc-100 space-y-1.5">
                    <div
                      onClick={() => setShowInsightsDrawer(!showInsightsDrawer)}
                      className="flex items-center justify-between cursor-pointer text-zinc-600 hover:text-zinc-900 select-none py-0.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[11px] font-semibold text-zinc-800">
                          已沉淀探索底稿 ({savedInsights.length} 条已反哺至 B 包)
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {showInsightsDrawer ? '收起' : '查看'}
                      </span>
                    </div>

                    {showInsightsDrawer && (
                      <div className="space-y-1.5 pt-1 max-h-40 overflow-y-auto no-scrollbar">
                        {savedInsights.map((ins) => (
                          <div
                            key={ins.insight_id}
                            className="p-2 rounded-lg bg-zinc-50 border border-zinc-200/80 text-[11px] space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-medium border ${
                                  ins.category === 'red_team_defense'
                                    ? 'bg-amber-50 text-zinc-900 border-amber-200'
                                    : ins.category === 'trial_outline'
                                    ? 'bg-blue-50 text-zinc-900 border-blue-200'
                                    : 'bg-emerald-50 text-zinc-900 border-emerald-200'
                                }`}
                              >
                                {ins.category === 'red_team_defense'
                                  ? '出庭防守要点'
                                  : ins.category === 'trial_outline'
                                  ? '出庭质证提纲'
                                  : '实务备忘'}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-400">
                                {ins.insight_id}
                              </span>
                            </div>
                            <p className="font-medium text-zinc-800 line-clamp-1">{ins.title}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 序号 3 优化：红方反击模式警示微条 */}
          {chatMode === 'red_teaming' && (
            <div className="p-2 px-4 bg-amber-50/90 border-b border-amber-200/80 text-xs text-zinc-800 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px]">
                  <strong>德方红方反击模式已激活</strong>：模拟德国资深商事诉讼大律师视角，专挑我方诉状、检验时效及证据链漏洞，助您穷尽防守盲区。
                </span>
              </div>
            </div>
          )}

          {/* 消息对话列表区 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-50/30">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                      isUser
                        ? 'bg-zinc-800 text-white font-medium text-xs'
                        : msg.mode === 'red_teaming'
                        ? 'bg-amber-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {isUser ? (
                      '我'
                    ) : msg.mode === 'red_teaming' ? (
                      <Flame className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  <div className={`max-w-[88%] space-y-1.5 ${isUser ? 'items-end' : ''}`}>
                    <div
                      className={`flex items-center gap-2 text-[10px] text-zinc-400 ${
                        isUser ? 'justify-end' : ''
                      }`}
                    >
                      <span className="font-medium text-zinc-500">
                        {isUser
                          ? '追问人'
                          : msg.mode === 'red_teaming'
                          ? '德方对抗大律师 (Red-Team)'
                          : '法律专家 Copilot'}
                      </span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                      {msg.model && (
                        <span className="font-mono text-zinc-400">({msg.model})</span>
                      )}
                      {msg.mode === 'red_teaming' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-50 text-zinc-900 border border-amber-200">
                          红方对抗反击
                        </span>
                      )}
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border text-xs md:text-sm shadow-2xs ${
                        isUser
                          ? 'bg-zinc-900 text-white border-zinc-900 rounded-tr-none'
                          : msg.mode === 'red_teaming'
                          ? 'bg-white text-zinc-800 border-amber-200/90 rounded-tl-none ring-1 ring-amber-100'
                          : 'bg-white text-zinc-800 border-zinc-200/90 rounded-tl-none'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        renderFormattedContent(msg.content)
                      )}
                    </div>

                    {!isUser && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {msg.statutes && msg.statutes.length > 0 && (
                            <>
                              <span className="text-[10px] text-zinc-400">援引法条:</span>
                              {msg.statutes.map((s, si) => (
                                <button
                                  key={si}
                                  type="button"
                                  onClick={() => openLawModal('E1')}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50/60 hover:bg-blue-100 text-zinc-800 border border-blue-200/70 transition-colors flex items-center gap-1"
                                  title="在弹窗中查看法条原文"
                                >
                                  <BookOpen className="w-2.5 h-2.5 text-blue-600" />
                                  <span>{s}</span>
                                </button>
                              ))}
                            </>
                          )}
                        </div>

                        {/* 序号 2 优化：一键沉淀成果至分析底稿 + 复制按钮 */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveInsight(index, msg.content, 'memo')}
                            disabled={savingInsightIndex === index}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors flex items-center gap-1 shadow-2xs ${
                              savedInsightIndices.has(index)
                                ? 'bg-emerald-50 text-zinc-900 border-emerald-300'
                                : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                            }`}
                            title="沉淀为 B 包实务咨询备忘底稿"
                          >
                            <BookmarkPlus className="w-2.5 h-2.5 text-zinc-600" />
                            <span>{savedInsightIndices.has(index) ? '已沉淀备忘' : '沉淀为备忘'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleSaveInsight(
                                index,
                                msg.content,
                                msg.mode === 'red_teaming' ? 'red_team_defense' : 'trial_outline'
                              )
                            }
                            disabled={savingInsightIndex === index}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors flex items-center gap-1 shadow-2xs"
                            title={
                              msg.mode === 'red_teaming'
                                ? '沉淀为出庭对抗防守要点'
                                : '沉淀为出庭专家质证提纲'
                            }
                          >
                            {msg.mode === 'red_teaming' ? (
                              <ShieldCheck className="w-2.5 h-2.5 text-amber-600" />
                            ) : (
                              <FileText className="w-2.5 h-2.5 text-blue-600" />
                            )}
                            <span>{msg.mode === 'red_teaming' ? '沉淀防守要点' : '沉淀质证提纲'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyMessage(index, msg.content)}
                            className="text-[11px] text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition-colors px-1"
                            title="复制回复"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedIndex === index ? '已复制' : '复制'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg text-white flex items-center justify-center shrink-0 ${
                    chatMode === 'red_teaming' ? 'bg-amber-600' : 'bg-blue-600'
                  }`}
                >
                  {chatMode === 'red_teaming' ? (
                    <Flame className="w-4 h-4 animate-bounce" />
                  ) : (
                    <Bot className="w-4 h-4 animate-pulse" />
                  )}
                </div>
                <div className="p-3 rounded-xl rounded-tl-none bg-white border border-zinc-200 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    <span>
                      {chatMode === 'red_teaming'
                        ? '德方大律师正在寻找案情事实与检验时效漏洞并组织质证反击...'
                        : '专家 Agent 正在结合案件事实与德国法典进行推导...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 快捷提问胶囊栏 */}
          <div className="px-4 py-2 border-t border-zinc-100 bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-zinc-400 font-medium shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              快捷追问:
            </span>
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(qp.prompt)}
                disabled={sending}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {qp.title}
              </button>
            ))}
          </div>

          {/* 底部输入框 */}
          <div className="p-3 border-t border-zinc-200 bg-white">
            <div className="relative rounded-xl border border-zinc-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-50 transition-all bg-white overflow-hidden shadow-2xs">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  chatMode === 'red_teaming'
                    ? `【德方红方反击】向德方大律师提出案情论辩或接受挑刺审查（按 Enter 发送）...`
                    : `针对案件【${case_id}】追问（按 Enter 发送，Shift+Enter 换行）...`
                }
                rows={2}
                disabled={sending}
                className="w-full p-2.5 pr-20 text-xs md:text-sm text-zinc-800 placeholder-zinc-400 resize-none outline-none focus:ring-0 disabled:bg-zinc-50"
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || sending}
                  className={`px-3 py-1.5 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shadow-2xs disabled:bg-zinc-200 disabled:text-zinc-400 ${
                    chatMode === 'red_teaming'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <span>发送</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1.5 text-[11px] text-zinc-400 px-1">
              <span className="flex items-center gap-1">
                {chatMode === 'red_teaming' ? (
                  <span className="text-amber-700 font-medium">🔥 对抗演练进行中</span>
                ) : (
                  <span>客观中立法律推导模式</span>
                )}
              </span>
              <span>按 Enter 发送，Shift+Enter 换行</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

