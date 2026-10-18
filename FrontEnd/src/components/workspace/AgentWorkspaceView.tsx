import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { lawAgentApi } from '../../api/lawAgentApi';
import { SavedInsight } from '../../types/lawAgent';
import {
  Bot,
  Send,
  RotateCcw,
  Copy,
  Check,
  BookOpen,
  BookmarkPlus,
  FolderArchive,
  X,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Swords,
} from 'lucide-react';

export const AgentWorkspaceView: React.FC = () => {
  const {
    currentCaseId,
    currentCase,
    role,
    openLawModal,
    showToast,
    refreshCurrentCase,
  } = useApp();

  const case_id = currentCaseId || 'C001';

  // 对抗模式切换 (neutral | red_teaming)
  const [chatMode, setChatMode] = useState<'neutral' | 'red_teaming'>('neutral');

  // 研判洞察成果沉淀至底稿
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [savingInsightIndex, setSavingInsightIndex] = useState<number | null>(null);
  const [savedInsightIndices, setSavedInsightIndices] = useState<Set<number>>(new Set());

  // 案件背景与争议要素抽屉 (默认折叠以保持聊天界面纯净专注)
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState<boolean>(false);

  // 对话列表
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

  // 修复：消息滚动容器引用与初次挂载标记（彻底杜绝切换页面时默认滑到底部）
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef<boolean>(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isUS =
    currentCase?.meta?.jurisdiction === 'us_commercial' ||
    Boolean(currentCase?.meta?.choice_of_law?.includes('美国')) ||
    Boolean(currentCase?.meta?.choice_of_law?.includes('UCC'));

  // 从当前案件动态提取争议焦点与抗辩要点
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

  // 快捷 Prompt 预设胶囊（精炼规范，去除多余 emoji）
  const quickPromptsNeutral = useMemo(
    () =>
      isUS
        ? [
            {
              title: 'UCC § 2-607 检验期抗辩',
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
          ],
    [isUS]
  );

  const quickPromptsRedTeam = useMemo(
    () =>
      isUS
        ? [
            {
              title: 'UCC § 2-607 瑕疵通知失权',
              prompt: '美方大律师如何援引 UCC § 2-607(3)(a) 主张买方试运行 23 天构成不合理迟延，依法剥夺全部救济权？',
            },
            {
              title: 'AS IS 默示担保免责击溃',
              prompt: '美方如何以订单背书的免责条款主张已有效排除 UCC § 2-314 适销性担保？',
            },
            {
              title: '间接损失排除条款阻断',
              prompt: '美方如何援引商事买卖排除 Consequential Damages 约定，阻断我方主张产线停机损失？',
            },
            {
              title: '第二巡回法院先例压制',
              prompt: '美方大律师会援引哪些第二巡回法院判例主张商事实体不得以复杂性为由延长检验通知期？',
            },
          ]
        : [
            {
              title: 'HGB § 377 失权击溃',
              prompt: '德方如何以德国商法典 (HGB) § 377 条买方逾期检验为由，要求法院直接驳回我方全部物之瑕疵担保救济权？',
            },
            {
              title: '涉外质检证据挑刺',
              prompt: '我方质检报告仅由国内单方出具且未经验证封样，德方大律师会从哪些形式要件与证明力角度猛烈发难？',
            },
            {
              title: '试生产默示受领',
              prompt: '德方若主张涉案设备投入试运行已构成德国法下的默示受领（Abnahme），如何击溃我方瑕疵主张？',
            },
            {
              title: '期间缩短判例压制',
              prompt: '援引德国联邦最高法院 (BGH) 判例，德方会如何主张对于高精设备合理检验期不应超过 7 个工作日？',
            },
          ],
    [isUS]
  );

  const quickPrompts = chatMode === 'red_teaming' ? quickPromptsRedTeam : quickPromptsNeutral;

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
    loadInsights();
  }, [case_id]);

  // 初始化问候语
  useEffect(() => {
    const defaultStatutes = isUS
      ? ['UCC § 2-314', 'UCC § 2-607', '28 U.S.C. § 1782']
      : ['BGB § 434', 'BGB § 437', 'HGB § 377'];

    const greetingContent = isUS
      ? `您好，我是本案【${case_id}】的域外法查明咨询 Agent。涉案争议焦点与美国统一商法典 (UCC) 及相关司法先例已关联就绪。您可以点击下方快捷问题、右侧要素争点，或切换【中立法理】与【美方律师反击】开展深度对抗演练。`
      : `您好，我是本案【${case_id}】的域外法查明咨询 Agent。涉案争议焦点与德国联邦成文法典及 BGH 先例已关联就绪。您可以点击下方快捷问题、右侧要素争点，或切换【中立法理】与【德方律师反击】开展深度对抗演练。`;

    setMessages([
      {
        role: 'assistant',
        content: greetingContent,
        model: 'qwen3.8-flash',
        mode: 'neutral',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        statutes: defaultStatutes,
      },
    ]);
  }, [case_id, isUS]);

  // 修复滑动到底部：仅在用户发送消息或收到新回复时滚动内部容器，首次挂载或切页时不滚动
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length, sending]);

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

      const res = await lawAgentApi.chatWithCase(case_id, chatPayload, role, chatMode);

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
      showToast(err.message || '咨询请求失败', 'error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '抱歉，咨询处理出现异常，请检查后台服务连接状态后重试。',
          model: 'error',
          mode: chatMode,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // 研判成果沉淀至底稿（简化为唯一直观动作）
  const handleSaveInsight = async (
    index: number,
    content: string,
    category: 'memo' | 'trial_outline' | 'red_team_defense' = 'memo'
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
      showToast('已成功沉淀至实务研判底稿', 'success');
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
      showToast('已复制回复内容', 'success');
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleClearHistory = () => {
    setMessages([
      {
        role: 'assistant',
        content: `会话记录已重置。您可以重新选择快捷问题，或切换【中立法理】与【${isUS ? '美方律师反击' : '德方律师反击'}】提出新的法律追问。`,
        model: 'qwen3.8-flash',
        mode: chatMode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // 格式化文本中的 Markdown 标题与要点
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-sm text-slate-800 leading-relaxed font-sans">
        {lines.map((line, i) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={i} className="text-sm font-bold text-slate-900 mt-3 mb-1">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={i} className="text-base font-bold text-slate-900 mt-3 mb-1">
                {line.replace('## ', '')}
              </h3>
            );
          }
          if (line.startsWith('**') && line.endsWith('**')) {
            return (
              <p key={i} className="font-semibold text-slate-900">
                {line.replace(/\*\*/g, '')}
              </p>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={i} className="flex items-start gap-2 pl-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                <span>{line.substring(2)}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            return (
              <div key={i} className="flex items-start gap-2 pl-2">
                <span className="font-mono text-xs font-semibold text-slate-500 shrink-0 mt-0.5">
                  {line.match(/^\d+\./)?.[0]}
                </span>
                <span>{line.replace(/^\d+\.\s/, '')}</span>
              </div>
            );
          }
          if (line.trim() === '') {
            return <div key={i} className="h-1.5" />;
          }
          return <p key={i}>{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex h-full bg-[#F6F8FA] relative overflow-hidden min-w-0">
      {/* 核心主会话区域 (居中流式布局) */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* 顶部极简导航与控制栏：对齐 Apple Bento 视觉规范 */}
        <div className="h-14 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                查明Agent咨询
              </h1>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/70 shrink-0">
                {case_id}
              </span>
            </div>
          </div>

          {/* 右侧操作区：研判模式切换、要素抽屉与重置 */}
          <div className="flex items-center gap-2">
            {/* 中立研判 vs 对抗模式切换 */}
            <div className="flex items-center p-0.5 bg-slate-100/90 rounded-xl text-xs border border-slate-200/60">
              <button
                type="button"
                onClick={() => setChatMode('neutral')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  chatMode === 'neutral'
                    ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="中立法理研判（法官/中立专家视角）"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">中立法理</span>
              </button>
              <button
                type="button"
                onClick={() => setChatMode('red_teaming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  chatMode === 'red_teaming'
                    ? 'bg-amber-500 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={isUS ? '美方律师出庭反击（模拟对抗质证）' : '德方律师出庭反击（模拟对抗质证）'}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>{isUS ? '美方律师反击' : '德方律师反击'}</span>
              </button>
            </div>

            {/* 案情要素抽屉开关 */}
            <button
              type="button"
              onClick={() => setIsContextDrawerOpen(!isContextDrawerOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer ${
                isContextDrawerOpen
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 shadow-2xs'
              }`}
              title="查看案件要素与争议焦点"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">案情要素</span>
              {caseContext.issues.length > 0 && (
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center font-bold ${
                    isContextDrawerOpen ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {caseContext.issues.length}
                </span>
              )}
            </button>

            {/* 清空会话历史 */}
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="重置会话"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 消息对话滚动流 (居中流式排布) */}
        <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 min-h-0">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                      isUser
                        ? 'bg-blue-600 text-white shadow-blue-500/20 font-semibold text-xs'
                        : msg.mode === 'red_teaming'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 border border-slate-200/80 text-blue-600'
                    }`}
                  >
                    {isUser ? (
                      '我'
                    ) : msg.mode === 'red_teaming' ? (
                      <Swords className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4 text-blue-600" />
                    )}
                  </div>

                  <div className={`space-y-1.5 max-w-[85%] ${isUser ? 'items-end' : ''}`}>
                    <div
                      className={`flex items-center gap-2 text-[11px] text-slate-400 ${
                        isUser ? 'justify-end' : ''
                      }`}
                    >
                      <span className="font-medium text-slate-600">
                        {isUser
                          ? '提问'
                          : msg.mode === 'red_teaming'
                          ? (isUS ? '美方律师反击' : '德方律师反击')
                          : '查明Agent'}
                      </span>
                      <span>·</span>
                      <span className="font-mono">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed shadow-2xs ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs shadow-blue-500/20'
                          : msg.mode === 'red_teaming'
                          ? 'bg-white text-slate-800 border border-amber-200/90 rounded-tl-xs ring-1 ring-amber-100/60'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        renderFormattedContent(msg.content)
                      )}
                    </div>

                    {!isUser && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {msg.statutes && msg.statutes.length > 0 && (
                            <>
                              <span className="text-[11px] text-slate-400">援引法源:</span>
                              {msg.statutes.map((s, si) => (
                                <button
                                  key={si}
                                  type="button"
                                  onClick={() => openLawModal('E1')}
                                  className="px-2.5 py-0.5 rounded-lg text-xs font-mono bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/70 transition-colors flex items-center gap-1.5 cursor-pointer"
                                  title="在弹窗中查看法条原文"
                                >
                                  <BookOpen className="w-3 h-3 text-slate-400" />
                                  <span>{s}</span>
                                </button>
                              ))}
                            </>
                          )}
                        </div>

                        {/* 复制与成果沉淀至底稿（精简为双动作） */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveInsight(
                                index,
                                msg.content,
                                msg.mode === 'red_teaming' ? 'red_team_defense' : 'memo'
                              )
                            }
                            disabled={savingInsightIndex === index}
                            className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                              savedInsightIndices.has(index)
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 shadow-2xs'
                            }`}
                            title="沉淀至实务研判底稿"
                          >
                            <BookmarkPlus className="w-3 h-3" />
                            <span>{savedInsightIndices.has(index) ? '已沉淀底稿' : '沉淀至底稿'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyMessage(index, msg.content)}
                            className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                            title="复制回复"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
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

            {/* 推理生成中状态 (呼吸微动效) */}
            {sending && (
              <div className="flex items-start gap-3.5 animate-in fade-in duration-300">
                <div
                  className={`w-8 h-8 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                    chatMode === 'red_teaming' ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                >
                  <Bot className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="p-4 sm:p-5 rounded-2xl rounded-tl-xs bg-white border border-slate-200/90 shadow-2xs space-y-2 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    <span className="text-xs font-semibold text-slate-800">
                      {chatMode === 'red_teaming'
                        ? '正在模拟对方律师质证抗辩要点...'
                        : '正在比对法源规范与先例涵摄...'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {chatMode === 'red_teaming'
                      ? (isUS
                          ? '正在分析检验通知时点，比对 UCC § 2-607(3)(a) 逾期失权判例与格式条款有效性...'
                          : '正在分析买方通知时点，比对 HGB § 377 商事检验失权要件与 BGH 隐蔽瑕疵判例...')
                      : (isUS
                          ? '正在检索美国统一商法典 (UCC) § 2-314 适销性担保及联邦证据法规范...'
                          : '正在比对德国民法典 (BGB) § 434, § 437 与商法典规范，展开四段论涵摄推导...')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部悬浮输入区域 (Apple Bento 风格输入舱) */}
        <div className="border-t border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 py-3.5 shrink-0 z-10">
          <div className="max-w-3xl mx-auto space-y-2.5">
            {/* 快捷追问胶囊横向微条 */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                快捷追问:
              </span>
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(qp.prompt)}
                  disabled={sending}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-blue-50/50 hover:border-blue-300 hover:text-blue-600 text-slate-700 border border-slate-200/80 shadow-2xs active:scale-95 transition-all duration-150 whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {qp.title}
                </button>
              ))}
            </div>

            {/* 输入框主卡片 */}
            <div className="relative rounded-2xl border border-slate-200/90 bg-white shadow-2xs focus-within:border-blue-600/80 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all p-2.5 pl-4">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  chatMode === 'red_teaming'
                    ? `【${isUS ? '美方律师' : '德方律师'}反击】向对方律师提出案情论辩或接受挑刺审查（按 Enter 发送）...`
                    : `针对案件【${case_id}】追问（按 Enter 发送，Shift+Enter 换行）...`
                }
                rows={2}
                disabled={sending}
                className="w-full pr-14 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none focus:ring-0 disabled:bg-slate-50"
              />

              <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || sending}
                  className="w-8 h-8 rounded-xl text-white bg-blue-600 hover:bg-blue-700 active:scale-95 flex items-center justify-center transition-all shadow-xs shadow-blue-500/25 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                {chatMode === 'red_teaming' ? (
                  <span className="text-amber-600 font-medium">对抗演练模式 · 模拟出庭律师质证视角</span>
                ) : (
                  <span>四段论事实与要件涵摄推演模式</span>
                )}
              </span>
              <span>Enter 发送 · Shift+Enter 换行</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：案情要素与争议焦点抽屉 (折叠式 Bento 架构) */}
      {isContextDrawerOpen && (
        <div className="w-80 sm:w-96 border-l border-slate-200/80 bg-white shadow-lg flex flex-col h-full z-20 animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-900">案件要素与争议焦点</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsContextDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* 准据法与公约 */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">选定准据法</span>
                <span className="font-semibold text-slate-800">{caseContext.choiceOfLaw}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium">国际公约排除</span>
                <span className="font-mono text-emerald-700 font-medium">{caseContext.cisgStatus}</span>
              </div>
            </div>

            {/* 核心请求权与抗辩防线 */}
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <span className="text-slate-500 font-medium block">原告实体请求权基础:</span>
                <p className="font-semibold text-slate-800 leading-relaxed">{caseContext.claimBasis}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <span className="text-slate-900 font-medium block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="border-b border-amber-500 pb-0.5">对方核心抗辩与失权点:</span>
                </span>
                <p className="font-semibold text-slate-800 leading-relaxed">{caseContext.defenseCore}</p>
              </div>
            </div>

            {/* 争议焦点列表 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">争议焦点清单 ({caseContext.issues.length})</span>
                <span className="text-[10px] text-slate-400">点击直接追问</span>
              </div>

              <div className="space-y-2">
                {caseContext.issues.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">本案暂无特定争议焦点</p>
                ) : (
                  caseContext.issues.map((iss, idx) => (
                    <div
                      key={iss.issue_id || idx}
                      onClick={() => handleSelectIssueToPrompt(iss.text_zh)}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-200/70 transition-all cursor-pointer group flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <span className="font-mono text-[10px] text-slate-400 block">焦点 #{idx + 1}</span>
                        <p className="text-xs text-slate-800 group-hover:text-blue-600 transition-colors leading-relaxed">
                          {iss.text_zh}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 shrink-0 mt-1 transition-colors" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 已沉淀研判备忘底稿 */}
            {savedInsights.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
                  <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
                  <span>已沉淀底稿 ({savedInsights.length})</span>
                </div>

                <div className="space-y-2">
                  {savedInsights.map((ins) => (
                    <div
                      key={ins.insight_id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-500">
                          {ins.category === 'red_team_defense'
                            ? '出庭防守要点'
                            : ins.category === 'trial_outline'
                            ? '出庭质证提纲'
                            : '实务备忘'}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">{ins.insight_id}</span>
                      </div>
                      <p className="font-medium text-slate-800 line-clamp-2 leading-relaxed">{ins.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
