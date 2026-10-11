# 域外法查明辅助应用 (OverseasLawAssist) 开发状态与进度追踪

> **当前阶段**：全部核心开发阶段（Phase 1 至 Phase 5）圆满交付完成  
> **更新时间**：2026-10-10  
> **当前状态**：开发完成并通过全量评测验收 (Completed & Verified)

---

## 1. 架构定位与多语言/多法域扩展设计

本系统目标为通用的**域外法查明辅助 Agentic 平台**。当前 MVP 以**德国联邦法 (German Federal Law, de_federal)** 为首个落地验证法域，底层核心架构严格遵循**“法域与语言解耦 (Decoupled Jurisdiction & Language)”**的可扩展设计原则：

```
[用户层 / 前端 UI (React 19 + Tailwind CSS + Lucide Icons)]
                         │
        (Vite Proxy: /api -> http://127.0.0.1:8000)
                         │
[FastAPI 服务层 lawagent.api] ── [REST 接口 / SSE 实时流 / 依赖注入]
                         │
[LangGraph 核心推理状态图 StateGraph(CaseState)]
  S1 Extract ─> S2 Precheck ─[CISG Gate]─> S3 Decompose ─[S3 Gate]─> S4 Researcher
   └── S5 Matcher ─> S6 Translator ─> S7 Drafter ─> Critic (V1-V11) ─> S8 Review ─> S9 Export
                         │
[多法域注册中心 JurisdictionRegistry]
      ├── de_federal (德国联邦法): [Norms: BGB, HGB, GmbHG, ZPO, EGBGB | Cases: BGH]
      └── (未来法域拓展): us_federal, uk_common_law, jp_civil_law ...
                         │
[双 SQLite 数据库存储架构]
      ├── 快照库 law.sqlite (只读, 20261010-gii-v0.7: 4,569 法条, 4,990 chunks, BGE-M3 FAISS + BM25)
      └── 运行库 state.sqlite (读写 WAL 模式, 单写锁串行化, 案件持久化, 专家名录, 会商流转)
```

---

## 2. 阶段规划与交付里程碑

| 阶段 | 核心任务 | 交付物 | 状态 |
| :--- | :--- | :--- | :--- |
| **Phase 1** | 基础骨架、配置管理、多法域抽象、双 SQLite 库、德联邦法官方 XML 采集与解析管线 | `lawagent/` 骨架、`law.sqlite` 快照库、`state.sqlite` 运行库、XML解析测试 | **已完成 (5/5 测试通过)** |
| **Phase 2** | 复合词拆分器、BM25 混合检索、本体边表构建、知识库预制、FAISS稠密向量与GPU加速 | 4,990 分块入库、BM25 索引持久化、FAISS 稠密索引、`HybridRetriever` 检索与扩展 | **已完成 (5/5 测试通过)** |
| **Phase 3** | LangGraph 工作流编排（S1~S9）、要素充分性迭代、Matcher 四态涵摄、中德术语翻译、双包起草与 Critic V1-V11 质检 | LangGraph 运行图、状态 Checkpoint、S1~S9 节点套件、11项质量门禁校验 | **已完成 (5/5 测试通过)** |
| **Phase 4** | FastAPI 接口、SSE 实时事件广播、前端去 Mock 彻底重构、Vite 代理配置与打包验证 | 前端 `mockData.ts` 彻底删除、全链路 API 打通、前端生产构建 0 错误 | **已完成 (8/8 测试通过)** |
| **Phase 5** | Word (DOCX) 双包报告导出生成、E1-E9 自动化基准评测套件、一票否决项验收 | `lawagent/api/export.py`、DOCX 导出端点、`eval/run.py` 评测报告 (验收通过) | **已完成 (通过全量验收)** |

---

## 3. 当前运行环境与模型配置

- **操作系统**：Windows (x86_64)
- **Python 环境**：Python 3.10.6
- **GPU 算力**：NVIDIA GeForce RTX 2070 SUPER (8GB VRAM, CUDA 12.8, BGE-M3 向量加速)
- **前端环境**：Node v24.12.0, Vite 8, React 19, TypeScript
- **大模型配置 (DashScope 兼容模式)**：
  - **Base URL**：`https://dashscope.aliyuncs.com/compatible-mode/v1`
  - **API Key**：从环境变量 `OPENAI_API_KEY` 动态读取
  - **主生成模型 (Qwen)**：`qwen-plus` / `qwen-flash`（带自动故障重试与平滑回退）
  - **校验裁判模型 (DeepSeek)**：`deepseek-v4-pro-0813`（已联通测试通过）

---

## 4. 全量开发任务执行详细记录

### Phase 1: 工程骨架、数据抽象与官方数据入库
- [x] Python 依赖与 CUDA 环境核验（安装 rank-bm25, snowballstemmer, sse-starlette, slowapi, langgraph-checkpoint-sqlite）
- [x] DashScope API 连通性测试与多模型探查（Qwen 与 DeepSeek 连通）
- [x] 创建 `lawagent/` 完整目录结构与 `configs/` 配置文件（`models.yaml`, `roles.yaml`, `tokens.yaml`, `limits.yaml`, `retrieval.yaml`, `quality_gate.yaml`）
- [x] 实现 `lawagent/core/jurisdiction.py` 多法域与语言核心抽象协议（解耦 Jurisdiction, Extractor, Normalizer, Splitter）
- [x] 实现 `lawagent/core/types.py` 完整状态对象定义（对齐前端 TypeScript 契约与技术方案 5.1 节）
- [x] 实现 `lawagent/store/` 双库模型：快照库 `law.sqlite` 与运行库 `state.sqlite`
- [x] 实现 `lawagent/llm/client.py` 结构化输出客户端（支持 json_repair、Pydantic 验证及主备自动故障转移）
- [x] 成功采集并解析入库德国联邦法官方法典（4,569 条成文法：BGB 2551条、HGB 696条、GmbHG 127条、ZPO 1094条、EGBGB 250条），含 Absatz 与 Nummer 细化结构
- [x] 录入金标准判例（BGH VIII ZR 12/20, VIII ZR 186/14, VIII ZR 270/07 等）并构建初始 `edges` 与 `hot_norm_cases` 表
- [x] 预制并复核 `kb/de_federal/` 示范数据集（包含物之瑕疵 `kauf_mangel.yaml`、给付迟延 `verzug_schaden.yaml`、40+ 核心民商法术语 `glossary.csv`、重大修订时点表 `timepoints.yaml` 与本体 `ontology.yaml`）
- [x] 编写并运行阶段 1 单元测试套件 `tests/test_phase1.py`（5/5 全部通过）

### Phase 2: 复合词拆分、混合检索与 FAISS 向量索引
- [x] 实现德语复合词对称拆分与分词处理器 `lawagent/store/compound.py`
- [x] 实现法条与判例切块模块 `lawagent/store/chunker.py`（生成 4,990 个带上下文前缀 ctx_prefix 的 chunks）
- [x] 构建 BM25 检索引擎 `lawagent/store/bm25.py` 并完成索引持久化缓存
- [x] 基于本地 NVIDIA GPU (CUDA) 构建 BGE-M3 FAISS 稠密向量索引 (`lawagent/store/vec.py`，生成 20.4MB `faiss.index`)
- [x] 实现本体图扩展存储模块 `lawagent/store/graph.py`（基于 edges_top 与递归 CTE 实现受限 1~2 跳图遍历与热门判例查询）
- [x] 实现重排抽象层 `lawagent/store/rerank.py`（支持 Cross-Encoder 与平滑加权回退）
- [x] 实现端到端混合检索器 `lawagent/store/retriever.py`（整合精确通道、术语库扩充、BM25 全文检索、向量检索、RRF 融合、图扩展、重排与 Evidence 封装）
- [x] 编写并运行阶段 2 单元测试套件 `tests/test_phase2.py`（5/5 全部通过）

### Phase 3: LangGraph 工作流与推理全节点
- [x] 实现入口预检与重大修订时点核验模块 `lawagent/flow/checks.py`（CISG 触发闸门、时点红黄两态不设绿态、准据法入口清单）
- [x] 实现构成要件充分性评估模块 `lawagent/flow/sufficiency.py`（评估 covered/partial/missing，提供改写缺口指导）
- [x] 实现要件事实涵摄匹配与判例比对模块 `lawagent/flow/matcher.py`（四态涵摄判定、V10 事实溯源与实体一致性核查、BGH 类案对比）
- [x] 实现质量门禁与防线核验模块 `lawagent/flow/critic.py`（V1-V11 全套核验、V8 严禁绝对诉讼预测客观防线、计算 DashboardMetrics）
- [x] 实现推理工作流全节点套件 `lawagent/flow/nodes.py`（S1 Extract -> S2 Precheck -> S3 Decompose -> S4 Researcher -> S5 Matcher -> S6 Translator -> S7 Drafter -> Critic -> S8 Review -> S9 Export）
- [x] 编排 LangGraph 状态图与断点恢复调度器 `lawagent/flow/graph.py`（支持 SqliteSaver 与 MemorySaver 检查点持久化）
- [x] 编写并运行阶段 3 单元测试套件 `tests/test_phase3.py`（5/5 全部通过）

### Phase 4: FastAPI 服务端、SSE 事件流与前端去 Mock 彻底重构
- [x] 实现应用依赖注入单例管理 `lawagent/api/deps.py`
- [x] 实现实时工作流流式事件广播总线 `lawagent/api/sse.py`
- [x] 实现案件管理与工作流驱动路由 `lawagent/api/routes/cases.py`（包含增删查改、run 工作流、confirm 闸门、followup 追加问题、statement 审核、SSE 事件流与 traces 接口）
- [x] 实现法律规范与法院判例全文检索路由 `lawagent/api/routes/search.py`
- [x] 实现外国法证据材料智能核验路由 `lawagent/api/routes/verify.py` (F16)
- [x] 实现特邀法律专家名录与会商流转路由 `lawagent/api/routes/consults.py` (F17)
- [x] 实现 FastAPI 主入口 `lawagent/api/main.py`（CORS 跨域、lifespan 启动生命周期、自动播种真实涉外法律案件）
- [x] 彻底删除前端 `FrontEnd/src/api/mockData.ts` 与所有本地内存 mock fallback 逻辑
- [x] 重构前端 API 客户端 `lawAgentApi.ts` 与 `client.ts`，配置 Vite 反向代理 `/api -> http://127.0.0.1:8000`
- [x] 成功安装前端所有依赖并完成 Vite 生产打包验证（`npm run build` 耗时 4.4s，打包产物 0 警告 0 报错）
- [x] 编写并运行阶段 4 单元测试套件 `tests/test_phase4.py`（8/8 全部通过）

### Phase 5: 规范导出、评测套件与验收
- [x] 实现符合最高人民法院《涉外民事关系法律适用法解释（二）》第三条规范标准的 DOCX 报告生成器 `lawagent/api/export.py`
- [x] 提供 `GET /api/cases/{case_id}/export/docx` 下载接口，生成包含 A包（查明文本包）与 B包（咨询准备包）的标准法律意见书
- [x] 实现 E1-E9 自动化基准评测套件 `eval/run.py`，支持召回率、MRR、一票否决项校验与自动化报告落盘
- [x] 运行全量单元测试套件：`tests/test_phase1.py`、`test_phase2.py`、`test_phase3.py`、`test_phase4.py` 共 **23/23 项测试全部通过**
- [x] 执行 E1-E9 评测，验收结论：**PASSED**（幻觉数=0，溯源错误数=0，绝对预测数=0，法条召回率@10=100%，要件覆盖率=100%）

---

## 5. 系统启动与运行指引

### 5.1 启动后端 FastAPI 服务
```bash
# 确保系统环境变量 OPENAI_API_KEY 已设置
uvicorn lawagent.api.main:app --host 127.0.0.1 --port 8000 --reload
```
- 后端服务接口文档：`http://127.0.0.1:8000/docs`
- 健康检查：`http://127.0.0.1:8000/api/health`

### 5.2 启动前端应用
```bash
cd FrontEnd
npm run dev
```
- 前端访问地址：`http://localhost:3000`
- 前端请求将自动经 Vite 代理转发至 `http://127.0.0.1:8000/api`。

### 5.3 运行自动化测试与评测套件
```bash
# 运行全部 23 项单元测试
python -m pytest tests/ -v

# 运行 E1-E9 基准评测套件
python -m eval.run
```

---

## 6. 全面代码审查与优化记录 (Code Review & Optimization)

- [x] **白屏故障诊断与彻底修复 (React 19 Hook 顺序违规)**：
  - **根因分析**：在 `CaseAnalysisView.tsx` 与 `ReportReviewView.tsx` 中，存在 `if (!currentCase) return ...;` 提前返回逻辑，而其下方调用了多个 `useMemo` hooks。由于初次挂载时 `currentCase` 为 `null` 执行提前返回，异步加载 `C001` 数据完成后重渲染触发了后续的 Hook，违反了 React 的 "Rules of Hooks"（`Rendered more hooks than during the previous render`），导致 React 19 崩溃并卸载整个页面 DOM 呈现白屏。
  - **修复措施**：将所有 Hook（`useMemo`, `useEffect`）重构至组件函数最顶层无条件执行，使用默认空结构防御；在 `FrontEnd/src/main.tsx` 引入全局 `ErrorBoundary` 组件，防止任何不可预期的未捕获异常导致全屏空白；补充 `IntersectionObserver` 数据挂载监听依赖。
  - **验证结果**：无头浏览器虚拟时间渲染与本地服务实测验证，页面毫秒级加载出完整的 B1~B6 分析看板与报告审查视图，彻底解决白屏问题。
- [x] **前端 Mock 数据清查**：已彻底物理删除 `FrontEnd/src/api/mockData.ts`，全量组件均已切入直连后端真实 REST/SSE。
- [x] **Word DOCX 报告真实流式下载闭环**：在 `client.ts` 新增 `downloadBlob` 二进制下载工具，前端 `ReportReviewView.tsx` 直连后端 `GET /api/cases/{case_id}/export/docx` 流式下载端点，彻底摒弃旧版前端文本模拟 Blob，直接下载最高院《涉外民事关系法律适用法解释（二）》标准格式 Word 文档。
- [x] **CrossEncoder 输入截断治理**：在 `lawagent/store/rerank.py` 中，对检索 Query 截断 $\le 256$ 字符、候选条文截断 $\le 1024$ 字符，模型预测增加 `max_length=512` 限制，消除输入爆炸风险，确保显存稳定。
- [x] **工作流 SSE 实时流广播与自动挂接**：在 `lawAgentApi.ts` 实现 `subscribeEvents`，并在 `AppContext.tsx` 中增加对 `running` 状态案件的 SSE 自动订阅（流式接收 `state_update` 与 `done` 事件并同步前端状态）。
- [x] **运行状态步进反馈微交互**：在 `TopBar.tsx` 中加入工作流执行中呼吸灯微标记（`animate-ping` 与当前节点名称展示）。
- [x] **GradeBadge 健壮性加固**：在 `GradeBadge.tsx` 中支持大小写容错与非法值自动降级回退至 `'A'`。
- [x] **23/23 单元测试全绿**：全套自动化测试套件持续通过率 100%（Phase 1~4 共 23 项，44.11s 通过）。
- [x] **测试数据隔离与示范案件库丰富**：
  - **排查与确认**：确认为何先前除 C001 外存在多个重复案件：自动化测试 `test_phase4.py` 创建案件后未进行清理，多次执行 pytest 导致向 `state.sqlite` 写入了同名同事实的测试副产物。
  - **治理与隔离**：在 `test_phase4.py` 中引入测试用例自清理机制（`DELETE /api/cases/{case_id}`），杜绝后续跑测污染正式数据库；清理了历史残留重复测试案件。
  - **播种 3 起经典代表性示范案件**：扩充 `seed_demo_cases_if_empty`，全面提供 3 起涵盖不同涉外审判争议焦点的金标准示范案例：
    1. **C001**：中德精密机床买卖合同物之瑕疵与救济权查明案（物之瑕疵、BGB § 434/§ 437、HGB § 377 商事检验通知）；
    2. **C002**：中德工业机器人采购给付迟延与所失利益赔偿案（BGB § 280/§ 286 给付迟延、BGB § 252 所失利益、§ 288 商事迟延利息）；
    3. **C003**：跨国投资并购德国有限责任公司(GmbH)股权转让合同公证形式要件查明案（GmbHG § 15 强制公证要件、BGB § 125 形式瑕疵自始无效）。
- [x] **LangGraph 异步工作流 Checkpointer 修复**：
  - 将 `LawWorkflowRunner` 默认检查点设置为 `MemorySaver`（全异步兼容），根除了 `SqliteSaver.aget_tuple` 抛出 `NotImplementedError` 导致的后台异步工作流异常退出问题。
- [x] **法域泛化与品牌去特定化**：
  - 将页面标题与品牌标识由单一“德国联邦法查明”升级为“涉外法查明Agent (Foreign Law Ascertainment Agent)”，解耦法域绑定，为后续扩展英美法、日韩法等法域打好架构基础；
  - 侧边栏与顶栏泛化为“案情深度分析”与“域外法律检索库”。
- [x] **争议焦点 (issues) 与适用法律入口清单 (entry_checks) 完整数据回填**：
  - 排查并修复了 SQLite 播种阶段字段遗漏问题，在 `seed_demo_cases_if_empty` 中为 C001、C002、C003 全面植入了结构化争点（事实争点与法律争点）和准据法前检项（意思自治协议选法效力、CISG 排除效力、双方商人身份核验）。
- [x] **工程内部编号与设计描述彻底清理**：
  - 彻底移除了前端界面中残留的设计方案功能编号（如 F31、F30、F16、F17、F25、F04、B1~B6），重构为专业极简编号（01~06）；
  - 清理了“依据第4.7节与第6.2节守护规则自动拦截”等工程设计口吻文字，重构为符合涉外法官与律师审阅习惯的“依据涉外法律客观中立规则与防线机制自动拦截”。
- [x] **功能 1：全景案件总结与法律研判卡片 (按方案 A 实施)**：
  - 在“案情深度分析”页面最顶端挂载 `<CaseExecutiveSummaryCard />`，支持【司法端（法官审理指引）】、【实务端（律师实务备忘）】、【公共端（商事合规与和解）】三重视角切换；
  - 涵盖涉外法律关系定性、争议焦点逻辑脉络、构成要件涵摄定性、核心法律风险与出庭/审理建议；
  - 支持一键复制格式化法律研判摘要到剪贴板，并提供直达争点、要件、类案与法条的快捷锚点按钮。
- [x] **功能 2：新建一级 Tab【Agent 工作台】(按方案 1 实施)**：
  - **左侧：Multi-Agent 协作流观察窗**：步进卡片时间轴完整展示 6 大专业 Agent 协同流水线（事实抽取 Agent、准据法前检 Agent、法源检索 Agent、四态涵摄 Agent、防线质检裁判 Agent、双语意见书起草 Agent），呈现使用的模型配置（Qwen 3.8 Flash、DeepSeek V4 Pro 0813、BM25+BGE-M3 检索引擎）、输入输出摘要、耗时及 V1~V11 质检防线标签；
  - **右侧：法律 Copilot 智能追问助手**：具备对话上下文感知能力，自动挂接当前案件事实、法源证据与涵摄结论，提供快捷追问胶囊（HGB § 377 抗辩、败诉风险、专家出庭质证、ADR 和解谈判筹码），支持多轮法律深度探讨；
  - **后端高可用保障**：在 `lawagent/api/routes/cases.py` 提供 `GET /agent-workflow` 与 `POST /chat` 接口，集成大模型网络超时/配额耗尽自动切换离线专业研判引擎机制，确保交互永不白屏或卡死；
  - **测试覆盖**：在 `tests/test_phase4.py` 新增接口测试，全套单元测试通过率 100%（24/24 测试通过）。
- [x] **工作台 UI/UX 视觉降噪与色彩克制化治理**：
  - **描述性小作文与说教文字清除**：移除了“实时直观掌握 6 大专业 Agent 协同流水线...”、“全链路就绪”、“点击快速填入追问”等系统说明书式文字，还原纯粹中立的工业级法律工具质感；
  - **色彩克制化重构**：彻底废除流水线上的红/绿/蓝/紫/黄等彩虹色文字，全量指标卡统一为中性深灰字体（`text-zinc-800/900`）配合极淡中性灰背景（`bg-zinc-50 border-zinc-200/80`），模型标签统一为深灰胶囊，严格对齐 Harvey / Westlaw 等高阶法律系统的克制沉稳风格；
  - **顶栏“时点黄色提示 · 2022过渡法”彻底移除**：排查并确认该提示系技术方案 4.2 节内部用于验证“2022 德国新债法过渡期核验规则”的调试标签，直接挂在全局顶栏造成用户困惑，现已自顶栏及 Header 彻底剥离，归位至案件内部审查逻辑。
- [x] **Multi-Agent 工作流蓝色主题对齐与克制高亮**：
  - **蓝色主题与图标背景对齐**：顶栏图标容器统一采用 `bg-blue-50 border-blue-200/80` 搭配 `text-blue-600`，全景步进时序微条统一为蓝色体系 `bg-blue-600 text-white`，与系统全局蓝色主题保持一致；
  - **全黑文字规范贯彻**：所有标题、标签及指标数值严格保持黑色/深墨灰（`text-zinc-900/800`），彻底杜绝彩色字体干扰；
  - **重点指标背景克制标识**：为关键产出指标注入克制极淡底色（浅绿 `bg-emerald-50/90` 标识要件成立与质检合规、浅黄 `bg-amber-50/90` 标识德方 HGB § 377 抗辩与待查要素、浅蓝 `bg-blue-50/80` 标识成文法典与独立裁判模型），保证层次分明且雅致专业。
- [x] **前沿法律 Agent 进阶方向落实：序号 2 与 序号 3 优化圆满交付**：
  - **序号 3：对抗式庭审模拟 / 德方律师红方反击 Agent (Red-Teaming)**：
    - 在 Copilot 头部新增【中立法理研判】与【🔥 德方红方反击】无缝切换 Toggle；
    - 激活后挂接德方对抗大律师专职 Prompt 与离线对抗防御引擎，专挑中国买方事实、检验时效、涉外质检证据瑕疵及补正前置程序缺陷，列出三大致命质证攻击点与防守补强要点；
    - 快捷追问动态载入德方进攻题（HGB § 377 绝对失权击溃、单方质检形式要件挑刺、试生产默示受领等）。
  - **序号 2：Chat 探索成果“一键沉淀/反哺”至分析底稿**：
    - 在 Copilot 助手的每条回复下方支持 `[➕ 沉淀为备忘要点]` 与 `[➕ 沉淀为质证提纲 / 沉淀为防守要点]`；
    - 后端提供 `POST /api/cases/{case_id}/insights` 与 `GET /api/cases/{case_id}/insights` 端点，将交互研判成果持久化反哺至案件底稿（B 包专家咨询准备清单与人工校订栏）；
    - 在争点看板中新增可折叠的【已沉淀探索底稿】抽屉，支持随时回看与查阅。


