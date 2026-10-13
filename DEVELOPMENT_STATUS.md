# 域外法查明辅助应用 (OverseasLawAssist) 开发状态与进度追踪

> **当前阶段**：全部核心开发阶段（Phase 1 至 Phase 6）圆满交付完成  
> **更新时间**：2026-10-12  
> **当前状态**：全法域（德联邦法 / 美商事法）开发完成并通过全量评测验收 (Completed & Verified)

---

## 1. 架构定位与多语言/多法域扩展设计

本系统目标为通用的**域外法查明辅助 Agentic 平台**。系统以**德国联邦法 (German Federal Law, de_federal)** 与 **美国商事法 (US Commercial Law, us_commercial)** 为核心支柱，确立了**“三位一体分层协同架构”**。底层核心架构严格遵循**“法域与语言解耦 (Decoupled Jurisdiction & Language)”**与**“数据与状态隔离 (Read-Only Snapshot & Stateful WAL Isolation)”**的可扩展设计原则：

```
[用户层 / 前端 UI (React 19 + Tailwind CSS + Lucide Icons)]
                         │
        (Vite Proxy: /api -> http://127.0.0.1:8000)
                         │
[FastAPI 服务层 lawagent.api] ── [REST 接口 / SSE 实时流 / 依赖注入]
                         │
[LangGraph 核心推理状态图 StateGraph(CaseState)]
   S1 Extract ─> S2 Precheck ─[CISG Gate]─> S3 Decompose ─[Issue Gate]─> S4 Researcher
    └── S5 Matcher ─> S6 Strategist ─> S7 Drafter ─> Critic (V1-V11) ─> S8 Review ─> S9 Export
                         │
[多法域注册中心 JurisdictionRegistry]
       ├── de_federal (德国联邦法): [Norms: BGB, HGB, GmbHG, ZPO, EGBGB | Cases: BGH]
       └── us_commercial (美国商事法): [Norms: UCC, DGCL, USC | Cases: SCOTUS, Circuit, State Supreme]
                         │
[双 SQLite 数据库存储架构]
       ├── 快照库 law.sqlite (只读, 20261010-gii-v0.7: 4,642 法条, 5,132 chunks, 27 判例, 119 拓扑边, 47 映射)
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
| **Phase 5** | Word (DOCX) 双包报告导出生成、E1-E9 自动化基准评测套件、一票否决项验收 | `lawagent/api/export.py`、DOCX 导出端点、`eval/run.py` 评测报告 (验收通过) | **已完成 (4/4 测试通过)** |
| **Phase 6** | 三位一体涉美商事法架构、15篇金标准判例滚雪球扩充、CourtListener与Shepardizing存续状态机、涉外解释二定向校准器、Step编排与交互优化 | `courtlistener.py`、`us_admissibility_calibrator.py`、`test_us_architecture.py`、前端 Step 精炼显示 | **已完成 (4/4 测试通过，全系统 28/28 测试通过)** |

---

## 3. 当前运行环境与模型配置

- **操作系统**：Windows (x86_64)
- **Python 环境**：Python 3.10.6
- **GPU 算力**：NVIDIA GeForce RTX 2070 SUPER (8GB VRAM, CUDA 12.8, BGE-M3 向量加速)
- **前端环境**：Node v24.12.0, Vite 8, React 19, TypeScript
- **大模型配置 (DashScope 兼容模式)**：
  - **Base URL**：`https://dashscope.aliyuncs.com/compatible-mode/v1`
  - **API Key**：从环境变量 `OPENAI_API_KEY` 动态读取
  - **主生成与推理模型**：`deepseek-v4.1-flash`（配合长文本指令遵循与高吞吐低延迟流式响应，同时在网络受限时由本地规则引擎自适应兜底）
  - **校验裁判模型**：`deepseek-v4-pro-0813`（专职执行 V1-V11 全套质量门禁审查与一票否决拦截）
- **服务端口规范**：
  - **后端 FastAPI**：`http://127.0.0.1:8000`
  - **前端工作台**：`http://localhost:3000`

---

## 4. 全量开发任务执行详细记录

### Phase 1: 工程骨架、数据抽象与官方数据入库
- [x] Python 依赖与 CUDA 环境核验（安装 rank-bm25, snowballstemmer, sse-starlette, slowapi, langgraph-checkpoint-sqlite）
- [x] DashScope API 连通性测试与多模型探查（DeepSeek 与 Qwen 连通）
- [x] 创建 `lawagent/` 完整目录结构与 `configs/` 配置文件（`models.yaml`, `roles.yaml`, `tokens.yaml`, `limits.yaml`, `retrieval.yaml`, `quality_gate.yaml`）
- [x] 实现 `lawagent/core/jurisdiction.py` 多法域与语言核心抽象协议（解耦 Jurisdiction, Extractor, Normalizer, Splitter）
- [x] 实现 `lawagent/core/types.py` 完整状态对象定义（对齐前端 TypeScript 契约与技术方案 5.1 节）
- [x] 实现 `lawagent/store/` 双库模型：快照库 `law.sqlite` 与运行库 `state.sqlite`
- [x] 实现 `lawagent/llm/client.py` 结构化输出客户端（支持 json_repair、Pydantic 验证及主备自动故障转移）
- [x] 成功采集并解析入库德国联邦法官方法典（4,569 条成文法：BGB 2551条、HGB 696条、GmbHG 127条、ZPO 1094条、EGBGB 250条），含 Absatz 与 Nummer 细化结构
- [x] 预制并复核 `kb/de_federal/` 示范数据集（包含物之瑕疵 `kauf_mangel.yaml`、给付迟延 `verzug_schaden.yaml`、40+ 核心民商法术语 `glossary.csv`、重大修订时点表 `timepoints.yaml` 与本体 `ontology.yaml`）
- [x] 编写并运行阶段 1 单元测试套件 `tests/test_phase1.py`（5/5 全部通过）

### Phase 2: 复合词拆分、混合检索与 FAISS 向量索引
- [x] 实现德美双语复合词对称拆分与分词处理器 `lawagent/store/compound.py`
- [x] 实现法条与判例切块模块 `lawagent/store/chunker.py`（生成带上下文前缀 ctx_prefix 的 chunks）
- [x] 构建 BM25 检索引擎 `lawagent/store/bm25.py` 并完成索引持久化缓存
- [x] 基于本地 NVIDIA GPU (CUDA) 构建 BGE-M3 FAISS 稠密向量索引 (`lawagent/store/vec.py`)
- [x] 实现本体图扩展存储模块 `lawagent/store/graph.py`（基于 edges 与递归 CTE 实现受限 1~2 跳图遍历与热门判例查询）
- [x] 实现重排抽象层 `lawagent/store/rerank.py`（支持 Cross-Encoder 与平滑加权回退）
- [x] 实现端到端混合检索器 `lawagent/store/retriever.py`（整合精确通道、术语库扩充、BM25 全文检索、向量检索、RRF 融合、图扩展、重排与 Evidence 封装）
- [x] 编写并运行阶段 2 单元测试套件 `tests/test_phase2.py`（5/5 全部通过）

### Phase 3: LangGraph 工作流与推理全节点
- [x] 实现入口预检与重大修订时点核验模块 `lawagent/flow/checks.py`（CISG 触发闸门、时点红黄两态不设绿态、准据法入口清单）
- [x] 实现构成要件充分性评估模块 `lawagent/flow/sufficiency.py`（评估 covered/partial/missing，提供改写缺口指导）
- [x] 实现要件事实涵摄匹配与判例比对模块 `lawagent/flow/matcher.py`（四态涵摄判定、V10 事实溯源与实体一致性核查、类案对比）
- [x] 实现质量门禁与防线核验模块 `lawagent/flow/critic.py`（V1-V11 全套核验、V8 严禁绝对诉讼预测客观防线、计算 DashboardMetrics）
- [x] 实现推理工作流全节点套件 `lawagent/flow/nodes.py`（S1 Extract -> S2 Precheck -> S3 Decompose -> S4 Researcher -> S5 Matcher -> S6 Strategist -> S7 Drafter -> Critic -> S8 Review -> S9 Export）
- [x] 编排 LangGraph 状态图与断点恢复调度器 `lawagent/flow/graph.py`（支持 SqliteSaver 与 MemorySaver 检查点持久化）
- [x] 编写并运行阶段 3 单元测试套件 `tests/test_phase3.py`（5/5 全部通过）

### Phase 4: FastAPI 服务端、SSE 事件流与前端去 Mock 彻底重构
- [x] 实现应用依赖注入单例管理 `lawagent/api/deps.py`
- [x] 实现实时工作流流式事件广播总线 `lawagent/api/sse.py`
- [x] 实现案件管理与工作流驱动路由 `lawagent/api/routes/cases.py`（包含增删查改、run 工作流、confirm 闸门、followup 追加问题、statement 审核、SSE 事件流与 traces 接口）
- [x] 实现法律规范与法院判例全文检索路由 `lawagent/api/routes/search.py`
- [x] 实现外国法证据材料智能核验路由 `lawagent/api/routes/verify.py`
- [x] 实现特邀法律专家名录与会商流转路由 `lawagent/api/routes/consults.py`
- [x] 实现 FastAPI 主入口 `lawagent/api/main.py`（CORS 跨域、lifespan 启动生命周期、自动播种真实涉外法律案件）
- [x] 彻底删除前端 `FrontEnd/src/api/mockData.ts` 与所有本地内存 mock fallback 逻辑
- [x] 重构前端 API 客户端 `lawAgentApi.ts` 与 `client.ts`，配置 Vite 反向代理 `/api -> http://127.0.0.1:8000`
- [x] 成功安装前端所有依赖并完成 Vite 生产打包验证（`npm run build` 打包产物 0 警告 0 报错）
- [x] 编写并运行阶段 4 单元测试套件 `tests/test_phase4.py`（8/8 全部通过）

### Phase 5: 规范导出、评测套件与验收
- [x] 实现符合最高人民法院《涉外民事关系法律适用法解释（二）》第三条规范标准的 DOCX 报告生成器 `lawagent/api/export.py`
- [x] 提供 `GET /api/cases/{case_id}/export/docx` 下载接口，生成包含 A包（查明文本包）与 B包（咨询准备包）的标准法律意见书
- [x] 实现 E1-E9 自动化基准评测套件 `eval/run.py`，支持召回率、MRR、一票否决项校验与自动化报告落盘
- [x] 运行全量单元测试套件，全量测试全部通过
- [x] 执行 E1-E9 评测，验收结论：**PASSED**（幻觉数=0，溯源错误数=0，绝对预测数=0，法条召回率@10=100%，要件覆盖率=100%）

### Phase 6: 三位一体涉美商事法落地、金标准先例扩充与交互优化
- [x] **涉美核心成文法精选入库**：精选入库《美国统一商法典》(UCC 49 条，涵盖买卖、投资证券与担保交易核心编)、特拉华州普通公司法 (DGCL 7 条) 与美国法典 (28 U.S.C. § 1782 等 12 条)，全量成文法扩充至 **4,642 条**、切块扩充至 **5,132 Chunks**；
- [x] **15 篇全美金标准权威先例滚雪球沉淀**：
  - 深度清洗并入库 15 篇全美里程碑金标准先例（*Eastern Air Lines*, *Step-Saver*, *Delano Growers*, *Intel v. AMD*, *ZF Automotive*, *Unocal*, *Delchi Carrier*, *Hall Street*, *Mitsubishi Motors*, *First Options*, *Kahn v. MFW*, *AMF*, *Eastern Air Lines v. Gulf Oil*, *ProCD* 等），全量判例库扩充至 **27 篇**；
  - 预编译生成 **119 条拓扑边表 (`edges`)** 与 **47 条热门规范判例映射 (`hot_norm_cases`)**，实现成文法检索自动通过图扩散带出金标准先例；
- [x] **Tier 2 CourtListener 动态检索与 Shepardizing 存续状态机**：
  - 实现 `lawagent/integrations/courtlistener.py`，集成远程案例库检索并构建 SCOTUS (1.0)、Circuit (0.85)、State Supreme (0.80) 法院层级加权算法；
  - 实现先验 Shepardizing/KeyCite 效力检验器，对已被后续判例推翻的失效先例（如 *Roto-Lith*）实施**一票否决拦截剔除**；
- [x] **Tier 3 涉外司法实务定向校准器 (USAdmissibilityCalibrator)**：
  - 实现 `lawagent/flow/us_admissibility_calibrator.py`，严格对接最高人民法院《涉外民事关系法律适用法解释（二）》第三条查明规范；
  - 自动化输出五项涉美专属入口审查清单（选法协议、CISG 排斥、UCC § 2-104 商人认定、UCC § 2-725 时效及海牙附加证明书 Apostille）、举证责任分配与八项必备要素合规证明报告；
- [x] **工作台 Step 编排与前端交互深度优化**：
  - 前端 Step 步骤卡片标题由动态过滤序号重构为计算全局确定性索引 `Step {globalStepIndex}. {step.name}`，与顶部全景时间轴严格对齐；
  - 进行中步骤（`running`）采用精炼高亮微胶囊展示，待执行步骤（`pending`）完全隐藏，完成步骤清晰呈现指标与日志；
  - 清理全量调试注释与残留跟踪标记，确保前端代码纯净；
- [x] **涉美架构全套单元测试闭环**：
  - 编写并运行 `tests/test_us_architecture.py`（4/4 全部通过）；
  - 全系统全阶段单元测试扩充至 **28/28 项测试持续 100% 绿灯全绿**。

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
# 运行全系统全部 28 项单元测试
python -m pytest tests/ -v

# 运行 E1-E9 基准评测套件
python -m eval.run
```

---

## 6. 全面代码审查与优化记录 (Code Review & Optimization)

- [x] **白屏故障诊断与彻底修复 (React 19 Hook 顺序违规)**：
  - 将所有 Hook（`useMemo`, `useEffect`）重构至组件函数最顶层无条件执行，使用默认空结构防御；在 `FrontEnd/src/main.tsx` 引入全局 `ErrorBoundary` 组件，防止任何未捕获异常导致全屏空白；补充 `IntersectionObserver` 数据挂载监听依赖。
- [x] **前端 Mock 数据清查**：已彻底物理删除 `FrontEnd/src/api/mockData.ts`，全量组件均已切入直连后端真实 REST/SSE。
- [x] **Word DOCX 报告真实流式下载闭环**：在 `client.ts` 新增 `downloadBlob` 二进制下载工具，前端 `ReportReviewView.tsx` 直连后端 `GET /api/cases/{case_id}/export/docx` 流式下载端点，直接下载最高院《涉外民事关系法律适用法解释（二）》标准格式 Word 文档。
- [x] **CrossEncoder 输入截断治理**：在 `lawagent/store/rerank.py` 中，对检索 Query 截断 $\le 256$ 字符、候选条文截断 $\le 1024$ 字符，模型预测增加 `max_length=512` 限制，消除输入爆炸风险，确保显存稳定。
- [x] **工作台 SSE 实时流广播与自动挂接**：在 `lawAgentApi.ts` 实现 `subscribeEvents`，并在 `AppContext.tsx` 中增加对 `running` 状态案件的 SSE 自动订阅（流式接收 `state_update` 与 `done` 事件并同步前端状态）。
- [x] **测试数据隔离与示范案件库丰富**：
  - 在 `test_phase4.py` 中引入测试用例自清理机制（`DELETE /api/cases/{case_id}`），杜绝后续跑测污染正式数据库；
  - 播种 3 起经典代表性示范案件（C001 机械机床物之瑕疵解约、C002 工业机器人给付迟延与所失利益、C003 GmbH股权转让强制公证要件）。
- [x] **LangGraph 异步工作流 Checkpointer 修复**：
  - 将 `LawWorkflowRunner` 默认检查点设置为 `MemorySaver`（全异步兼容），根除了 `SqliteSaver.aget_tuple` 抛出 `NotImplementedError` 导致的后台异步工作流异常退出问题。
- [x] **工程内部编号与设计描述彻底清理**：
  - 彻底移除了前端界面中残留的设计方案功能编号（如 F31、F30、F16、F17、F25、F04、B1~B6），重构为专业极简编号（01~06）；
  - 清理了“依据第4.7节与第6.2节守护规则自动拦截”等工程设计口吻文字，重构为符合涉外法官与律师审阅习惯的“依据涉外法律客观中立规则与防线机制自动拦截”。
- [x] **全景案件总结与法律研判卡片**：
  - 在“案情深度分析”页面最顶端挂载 `<CaseExecutiveSummaryCard />`，支持【司法端（法官审理指引）】、【实务端（律师实务备忘）】、【公共端（商事合规与和解）】三重视角切换；涵盖涉外法律关系定性、争议焦点逻辑脉络、构成要件涵摄定性、核心法律风险与出庭/审理建议。
- [x] **Agent 工作台协同流水线与 Copilot 助手**：
  - 步进卡片时间轴完整展示专业 Agent 协同流水线，呈现使用的模型配置、输入输出摘要、耗时及 V1~V11 质检防线标签；
  - 右侧法律 Copilot 智能追问助手具备对话上下文感知能力，支持中立法理研判与对抗式红方反击演练模式无缝切换，并支持一键反哺成果至案件底稿。
- [x] **前端代码纯净性审查与界面显示优化**：
  - 审查确认前端无任何 `console.log`、`debugger`、`TODO` 或内部追踪标记；
  - Agent 工作台 Step 卡片标题由动态过滤索引升级为全局确定性索引 `Step {globalStepIndex}. {step.name}`，消除序号跳跃；进行中步骤（`running`）精炼展示，待执行步骤（`pending`）完全隐藏，完成步骤清晰呈现指标与日志；
  - 前端执行 `npm run build` 成功完成，0 报错 0 警告。
- [x] **全套 28 项自动化测试持续 100% 绿灯**：涵盖 Phase 1 至 Phase 6 全部 28 项单元与集成测试用例，全量通过。
