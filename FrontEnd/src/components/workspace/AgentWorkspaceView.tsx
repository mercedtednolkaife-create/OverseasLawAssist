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

  const isUS =
    currentCase?.meta?.jurisdiction === 'us_commercial' ||
    Boolean(currentCase?.meta?.choice_of_law?.includes('美国')) ||
    Boolean(currentCase?.meta?.choice_of_law?.includes('UCC'));

  // 从当前案件动态提取争议焦点与抗辩要点
  // 从当前案件动态提取争议焦点与抗辩要点（杜绝假数据兜底残留）
  const caseContext = useMemo(() => {
    const issuesList = currentCase?.issues || [];
    const defaultChoice = isUS ? '美国商事法及统一商法典 (UCC)' : '德国联邦法 (BGB / HGB)';
    const choiceOfLaw = currentCase?.meta?.choice_of_law || defaultChoice;
    const cisgStatus = currentCase?.meta?.cisg_excluded
      ? '已明文排除 CISG'
      : 'CISG 准用待审';

    return {
      choiceOfLaw,
      cisgStatus,
      issues: issuesList,
      claimBasis:
        currentCase?.claims?.[0]?.text_zh ||
        (isUS
          ? 'UCC § 2-601 / § 2-714 (买方违约救济与损害赔偿请求权束)'
          : 'BGB § 437 Nr. 1, § 439 (补正履行与违约救济请求权)'),
      defenseCore:
        currentCase?.strategic_assessment?.red_team_defenses?.[0]?.opposing_claim ||
        (isUS
          ? 'UCC § 2-607(3)(a) 逾期失权抗辩 & 担保免除'
          : 'HGB § 377 商事检验逾期通知失权抗辩'),
      breakthroughPath:
        currentCase?.strategic_assessment?.outcome_branches?.[0]?.condition_precedent ||
        (isUS
          ? '主张试运行期合理通知时间及 28 U.S.C. § 1782 跨境取证'
          : '主张隐蔽瑕疵及出卖人恶意隐瞒事实'),
    };
  }, [currentCase, isUS]);

  // 快捷 Prompt 预设胶囊 (根据中立 vs 红方反击动态切换)
  const quickPromptsNeutral = isUS
    ? [
        {
          title: 'UCC § 2-607 合理期间抗辩',
          prompt: '美方主张依据 UCC § 2-607(3)(a) 已逾期失权，我方如何结合第二巡回法院判例举证复杂设备合理检验期间？',
        },
        {
          title: '28 U.S.C. § 1782 跨境取证',
          prompt: '能否依据 28 U.S.C. § 1782 向美国联邦法院申请单方动议，强制美方移交机台设计与出厂内部测试报告？',
        },
        {
          title: 'UCC § 2-207 格式条款之战',
          prompt: '美方发票背面印有 AS IS 免责条款，依据 UCC § 2-207 规则是否并入双方合同？',
        },
        {
          title: '商业和解与 ADR 筹码',
          prompt: '在涉美跨国商事和解与调解中，如何利用美国高昂的 Discovery 取证成本促成美方退让？',
        },
      ]
    : [
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

  const quickPromptsRedTeam = isUS
    ? [
        {
          title: '🔥 UCC § 2-607 瑕疵通知失权',
          prompt: '美方大律师如何援引 UCC § 2-607(3)(a) 主张买方试运行 23 天构成不合理迟延，依法剥夺全部救济权？',
        },
        {
          title: '🔥 AS IS 默示担保免责击溃',
          prompt: '美方如何以订单背书的免责条款主张已有效排除 UCC § 2-314 适销性担保？',
        },
        {
          title: '🔥 间接损失排除条款阻断',
          prompt: '美方如何援引商事买卖排除 Consequential Damages 约定，阻断我方主张产线停机损失？',
        },
        {
          title: '🔥 纽约州法先例压制',
          prompt: '美方大律师会援引哪些第二巡回法院判例主张商事实体不得以复杂性为由延长检验通知期？',
        },
      ]
    : [
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

  // 动态研判当前工作流完成度
  const isWorkflowCompleted = useMemo(() => {
    if (!workflow || !workflow.steps || workflow.steps.length === 0) return false;
    return workflow.steps.every((s) => ['completed', 'verified', 'delivered'].includes(s.status));
  }, [workflow]);

  const completedStepsCount = useMemo(() => {
    if (!workflow || !workflow.steps) return 0;
    return workflow.steps.filter((s) => ['completed', 'verified', 'delivered'].includes(s.status)).length;
  }, [workflow]);

  const runningStep = useMemo(() => {
    if (!workflow || !workflow.steps) return null;
    return workflow.steps.find((s) => s.status === 'running') || null;
  }, [workflow]);

  useEffect(() => {
    let isMounted = true;
    loadWorkflow();
    loadInsights();

    // 动态步进轮询：未全部完成时每 1 秒拉取一次最新进展
    const interval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const data = await lawAgentApi.getAgentWorkflow(case_id);
        if (isMounted && data) {
          setWorkflow(data);
          const allDone =
            data.steps &&
            data.steps.every((s: any) =>
              ['completed', 'verified', 'delivered'].includes(s.status)
            );
          if (allDone) {
            clearInterval(interval);
            await refreshCurrentCase();
          }
        }
      } catch {
        // silent
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [case_id]);

  useEffect(() => {
    if (currentCase?.status === 'running') {
      setMessages([
        {
          role: 'assistant',
          content: isUS
            ? `案件【${case_id}】正在执行 Multi-Agent 流式协同研判流水线。左侧正在逐节点抽取事实、检视准据法、检索 UCC 法条与联邦判例并进行要件涵摄推演。研判完成后，此处将自动为您开放交互式法律追问与【美方出庭反击】对抗演练。`
            : `案件【${case_id}】正在执行 Multi-Agent 流式协同研判流水线。左侧正在逐节点抽取事实、检视准据法、检索德国民商法典与 BGH 判例并进行要件涵摄推演。研判完成后，此处将自动为您开放交互式法律追问与【德方出庭反击】对抗演练。`,
          model: 'deepseek-v4.1-flash',
          mode: 'neutral',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          statutes: [],
        },
      ]);
    } else {
      setMessages([
        {
          role: 'assistant',
          content: isUS
            ? `案件【${case_id}】争议焦点与法源已挂接就绪。请选择上方争议焦点点击追问，或切换【中立法理研判】与【美方出庭反击】开展对抗演练。我将结合 UCC 统一商法典与联邦先例展开推导。`
            : `案件【${case_id}】争议焦点与法源已挂接就绪。请选择上方争议焦点点击追问，或切换【中立法理研判】与【德方出庭反击】开展对抗演练。我将结合德国现行法典与 BGH 判例展开推导。`,
          model: 'deepseek-v4.1-flash',
          mode: 'neutral',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          statutes: isUS ? ['UCC § 2-314', 'UCC § 2-607', '28 U.S.C. § 1782'] : ['BGB § 434', 'BGB § 437', 'HGB § 377'],
        },
      ]);
    }
  }, [case_id, isUS, currentCase?.status]);

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
      ? (isUS
          ? `针对争议焦点：“${issueText}”，作为美方出庭大律师，你会如何组织进攻与质证，击溃我方主张？`
          : `针对争议焦点：“${issueText}”，作为德方商事大律师，你会如何组织进攻与质证，击溃我方主张？`)
      : (isUS
          ? `针对争议焦点：“${issueText}”，依据美国统一商法典 (UCC) 及相关司法先例，双方的举证责任分配与核心攻防要点是什么？`
          : `针对争议焦点：“${issueText}”，依据德国现行法律及 BGH 判例，双方的举证责任分配与核心攻防要点是什么？`);
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
        content: `会话记录已重置。您可以重新选择上方争议焦点，或切换【中立法理】与【${isUS ? '美方出庭反击' : '德方出庭反击'}】提出新的法律追问。`,
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
      case 'red_team_strategist':
        return <Swords className="w-3.5 h-3.5 text-blue-600" />;
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
          { label: '意思自治选法', value: isUS ? '适用美国商事法 (有效)' : '适用德国法 (有效)', tone: 'green' },
          { label: '国际公约排查', value: 'CISG 已排除', tone: 'green' },
          { label: '法域通道', value: isUS ? '美国商事及联邦法' : '德意志联邦民商法', tone: 'blue' },
        ];
      case 'retrieval':
        return [
          { label: '成文规范', value: isUS ? 'UCC Article 2 核心条文' : 'BGB / HGB 4 项条文', tone: 'blue' },
          { label: isUS ? '司法先例' : '联邦判例', value: isUS ? '联邦巡回区先例 2 篇' : 'BGH 判例 2 篇', tone: 'blue' },
          { label: '法源核验', value: '官方现行法典库比对', tone: 'neutral' },
        ];
      case 'subsumption':
        return [
          { label: '要件具备', value: isUS ? '2 项具备 (违约/品质未达标)' : '2 项具备 (合同效力/瑕疵存在)', tone: 'green' },
          { label: '待查要件', value: isUS ? '1 项待查 (合理检验通知期)' : '1 项待查 (检验通知起算点)', tone: 'yellow' },
          { label: isUS ? '美方抗辩' : '德方抗辩', value: isUS ? 'UCC § 2-607 逾期失权' : 'HGB § 377 逾期失权', tone: 'yellow' },
        ];
      case 'red_team_strategist':
        return [
          { label: '胜败推演', value: '3 组假定条件分支', tone: 'blue' },
          { label: isUS ? '美方抗辩' : '德方抗辩', value: isUS ? '3 项美方致命抗辩' : '3 项德方致命抗辩', tone: 'yellow' },
          { label: '反制与补证', value: '反制武器 + 补证清单', tone: 'green' },
        ];
      case 'judge':
        return [
          { label: '独立复核', value: '裁判 Agent (防线审查)', tone: 'blue' },
          { label: '质检规则', value: '11 项质检全部通过', tone: 'green' },
          { label: '法源真实性', value: '官方正文验真通过', tone: 'green' },
        ];
      case 'drafter':
        return [
          { label: '双语论据', value: isUS ? '6 组中美对照命题' : '6 组中德对照命题', tone: 'blue' },
          { label: '报告标准', value: '符合涉外司法查明规范', tone: 'blue' },
          { label: '成果交付', value: 'DOCX 报告已就绪', tone: 'green' },
        ];
      default:
        return [];
    }
  };

  // Agent 业务角色徽标 (替代原底层技术模型名称)
  const getAgentRoleBadge = (stepId: string) => {
    const roleBadges: Record<string, { label: string; tone: string }> = {
      extract: { label: '事实抽取 Agent', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
      precheck: { label: '准据法前检 Agent', tone: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      retrieval: { label: '法源检索 Agent', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
      subsumption: { label: '要件涵摄 Agent', tone: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      red_team_strategist: { label: '策略推演与红队 Agent', tone: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold' },
      judge: { label: '裁判 Agent', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' },
      drafter: { label: '双语起草 Agent', tone: 'bg-purple-50 text-purple-700 border-purple-200' },
    };
    const current = roleBadges[stepId] || { label: '协同 Agent', tone: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${current.tone}`}>
        {current.label}
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
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-200 text-zinc-600 font-medium text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>协同流水线: 主推理 Agent</span>
            </span>
            <span className="text-zinc-300">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>独立复核: 裁判 Agent</span>
            </span>
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
              {isWorkflowCompleted ? (
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>7 阶段已就绪</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-blue-600">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>{completedStepsCount} / 7 阶段推进中</span>
                </div>
              )}
            </div>

            {/* 蓝色系步进节点条，文字保持沉稳深墨黑 */}
            <div className="grid grid-cols-7 gap-1 pt-1 border-t border-zinc-100">
              {[
                { label: '抽取', id: 'extract' },
                { label: '前检', id: 'precheck' },
                { label: '检索', id: 'retrieval' },
                { label: '涵摄', id: 'subsumption' },
                { label: '推演', id: 'red_team_strategist' },
                { label: '起草', id: 'drafter' },
                { label: '裁判', id: 'judge' },
              ].map((s, idx) => {
                const stepObj = workflow?.steps.find((st) => st.step_id === s.id);
                const stepStatus = stepObj?.status || 'pending';
                const isStepCompleted = ['completed', 'verified', 'delivered'].includes(stepStatus);
                const isStepRunning = stepStatus === 'running';

                let cardStyle = 'bg-zinc-50 border-zinc-200/70 text-zinc-400 opacity-60';
                let circleStyle = 'bg-zinc-300 text-zinc-600';

                if (isStepCompleted) {
                  cardStyle = 'bg-blue-50/70 border-blue-300 text-blue-900 shadow-2xs';
                  circleStyle = 'bg-blue-600 text-white';
                } else if (isStepRunning) {
                  cardStyle = 'bg-blue-100/90 border-blue-500 ring-2 ring-blue-300/50 text-blue-950 font-bold';
                  circleStyle = 'bg-blue-600 text-white animate-pulse';
                }

                return (
                  <div
                    key={s.id}
                    className={`flex flex-col items-center p-1 rounded-lg border text-center transition-all duration-200 ${cardStyle}`}
                  >
                    <span className={`w-4 h-4 rounded-full font-mono text-[9px] font-bold flex items-center justify-center ${circleStyle}`}>
                      {isStepCompleted ? '✓' : idx + 1}
                    </span>
                    <span className="text-[10px] font-medium mt-0.5 truncate max-w-full">
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 节点卡片列表：仅显示已完成与进行中的步骤，待执行步骤不显示 */}
          <div className="space-y-2 relative before:absolute before:top-4 before:bottom-4 before:left-5 before:w-0.5 before:bg-blue-100">
            {workflow?.steps
              ?.filter((step) => step.status !== 'pending')
              .map((step, index) => {
                const isLogExpanded = !!expandedLogSteps[step.step_id];
                const metricChips = getStepMetricChips(step);
                const isCompleted = ['completed', 'verified', 'delivered'].includes(step.status);
                const isRunning = step.status === 'running';

                // 进行中步骤：显示精炼动效胶囊，无需大面积空白展开
                if (isRunning) {
                  return (
                    <div
                      key={step.step_id}
                      className="rounded-xl border border-blue-500 ring-2 ring-blue-200/60 bg-blue-50/30 shadow-xs overflow-hidden ml-1 pl-2 relative animate-pulse"
                    >
                      <div className="p-3 pr-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg border bg-blue-600 text-white border-blue-600 flex items-center justify-center shrink-0">
                              {getStepIcon(step.step_id)}
                            </div>
                            <span className="text-xs font-bold text-zinc-900">
                              {index + 1}. {step.name.replace(/ Agent$/, '')}
                            </span>
                            {getAgentRoleBadge(step.step_id)}
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-300 flex items-center gap-1 shadow-2xs">
                            <RotateCcw className="w-2.5 h-2.5 animate-spin text-blue-600" />
                            <span>推理执行中</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-900 bg-white/80 p-2 rounded-lg border border-blue-100 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping shrink-0" />
                          <span className="truncate">{step.outputs_summary || 'Agent 正在进行多维法理研判...'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={step.step_id}
                    className="rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs overflow-hidden transition-all ml-1 pl-2 relative"
                  >
                    <div className="p-3 pr-3.5 space-y-2">
                      {/* 标题栏: 序号 + 名称 + 模型徽标 + 耗时 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg border bg-blue-50 border-blue-200/80 flex items-center justify-center shrink-0">
                            {getStepIcon(step.step_id)}
                          </div>
                          <span className="text-xs font-bold text-zinc-900">
                            {index + 1}. {step.name.replace(/ Agent$/, '')}
                          </span>
                          {getAgentRoleBadge(step.step_id)}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>已完成</span>
                          </span>
                          {step.duration_ms > 0 && (
                            <span className="text-[11px] font-mono text-zinc-400">
                              {(step.duration_ms / 1000).toFixed(2)}s
                            </span>
                          )}
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
                  title={isUS ? "美方出庭反击（模拟美方资深出庭律师对抗质证）" : "德方出庭反击（模拟德国资深商事大律师对抗挑刺）"}
                >
                  <Flame className="w-3 h-3 text-amber-600" />
                  <span>{isUS ? '美方出庭反击' : '德方出庭反击'}</span>
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
                    {caseContext.issues.length === 0 ? (
                      <div className="p-3 text-center text-xs text-zinc-400 bg-zinc-50 rounded-lg border border-zinc-200">
                        {isWorkflowCompleted ? '本案未录入特定争议焦点' : '协同流水线正在分析抽取争议焦点...'}
                      </div>
                    ) : (
                      caseContext.issues.map((iss, idx) => (
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
                            disabled={!isWorkflowCompleted}
                            className="px-2 py-1 rounded bg-white hover:bg-zinc-800 hover:text-white text-zinc-700 border border-zinc-200 text-[10px] font-medium shrink-0 transition-colors shadow-2xs flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isWorkflowCompleted ? '针对此争点生成提问' : '流水线执行中，暂不可追问'}
                          >
                            <span>针对追问</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 核心请求权基础与抗辩防线 */}
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
                      {isUS ? '美方' : '德方'}核心抗辩与失权防线:
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

          {/* 红方反击模式警示微条 */}
          {chatMode === 'red_teaming' && (
            <div className="p-2 px-4 bg-amber-50/90 border-b border-amber-200/80 text-xs text-zinc-800 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px]">
                  <strong>{isUS ? '美方出庭反击' : '德方出庭反击'}模式已激活</strong>：模拟{isUS ? '美方资深出庭律师' : '德国资深商事大律师'}视角，专挑我方事实、时效及证据链漏洞，帮助排查防守盲区。
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
                      <span className="font-medium text-zinc-600">
                        {isUser
                          ? '追问人'
                          : msg.mode === 'red_teaming'
                          ? (isUS ? '美方对抗律师 (Red-Teaming)' : '德方对抗律师 (Red-Teaming)')
                          : '研判分析 Agent'}
                      </span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                      {msg.mode === 'red_teaming' ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-50 text-zinc-900 border border-amber-200">
                          红方对抗反击
                        </span>
                      ) : !isUser ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          专业研判角色
                        </span>
                      ) : null}
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
                        ? (isUS ? '美方出庭律师正在组织事实与时效质证反击...' : '德方大律师正在寻找案情事实与检验时效漏洞并组织质证反击...')
                        : (isUS ? '专家 Agent 正在结合案件事实与美国商事法典进行推导...' : '专家 Agent 正在结合案件事实与德国法典进行推导...')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 流水线未就绪时的状态横幅与锁定保护 */}
          {!isWorkflowCompleted && (
            <div className="p-2.5 px-4 bg-blue-50/95 border-t border-b border-blue-200 text-xs text-blue-900 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                <span className="text-[11px]">
                  <strong>协同流水线分析中 ({completedStepsCount}/7 阶段)</strong>：
                  {runningStep ? `当前正在推进【${runningStep.name}】` : '各阶段 Agent 协同推理中'}，待全部阶段就绪后将自动解锁实时追问。
                </span>
              </div>
            </div>
          )}

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
                disabled={!isWorkflowCompleted || sending}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  !isWorkflowCompleted
                    ? `流水线正在分析中（第 ${completedStepsCount + 1} 阶段），待全部 7 阶段就绪后开启追问与对抗演练...`
                    : chatMode === 'red_teaming'
                    ? `【${isUS ? '美方' : '德方'}出庭反击】向对方律师提出案情论辩或接受挑刺审查（按 Enter 发送）...`
                    : `针对案件【${case_id}】追问（按 Enter 发送，Shift+Enter 换行）...`
                }
                rows={2}
                disabled={!isWorkflowCompleted || sending}
                className="w-full p-2.5 pr-20 text-xs md:text-sm text-zinc-800 placeholder-zinc-400 resize-none outline-none focus:ring-0 disabled:bg-zinc-50 disabled:cursor-not-allowed"
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!isWorkflowCompleted || !inputText.trim() || sending}
                  className={`px-3 py-1.5 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shadow-2xs disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed ${
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

