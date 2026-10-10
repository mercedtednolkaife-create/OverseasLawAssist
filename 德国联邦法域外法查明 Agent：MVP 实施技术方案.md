# 德国联邦法域外法查明 Agent：MVP 实施技术方案

版本 v0.7｜2026-10-08｜面向 Python 开发者（单人为主）＋法学团队配合

**v0.7 变更摘要**（相对 v0.6；根据 v0.6 审查结果修订，已做完整性与一致性检查；历史变更见附录 D）

| 变更 | 内容 | 涉及章节 |
| --- | --- | --- |
| 正确性修正 | Critic 重试按问题判断；案件固定快照；类案证据登记为 E#；CISG 闸门；Matcher 引入 fact\_slots，无事实要素清单的要件最多判 partial；V10 增加实体确定性核对 | 4.5、5.2、5.7、6.2、附录 A |
| 安全与隐私（新增 F33） | 令牌鉴权与案件归属、限流、提示注入防护、PII 脱敏、日志脱敏、保留与删除、同意记录 | 3.4、7.1、7.4 |
| 生命周期与可靠性（新增 F34） | 案件列表、状态、删除；报告版本与哈希；SSE 续传；降级模式；快照库与运行库分离、WAL | 3.4、4.1、4.2、4.8、7.5 |
| 非功能需求（新增） | 并发、时延与调用预算、降级、保留、成本、可观测 | 7.5 |
| 评测与计划 | 样本量与置信区间；模板命中、未命中分层；优先级分层与裁剪线；法学团队工作量估算；周期仍为 12 周 | 8.8、8.10、9.2、9.3 |
| 文档整理 | 历史变更摘要移到附录 D；功能编号统一为 F01–F34 | 附录 D |

## 0. 目标与边界

**目标**：以德国联邦法为唯一法域，约 12 周做出可端到端演示、可量化评测的 MVP。输入涉外案情，输出符合《涉外民事关系法律适用法司法解释（二）》第三条要素（具体规定、获得途径、效力情况、与争议的关联性；判例须全文）的“德国法查明材料包”，并支持材料核验、专家复核和全程留痕；同时为用户的专业咨询做前置准备：争点、要件—事实对照、证据链缺口、类似判例和向专业人士提问清单（不做裁判预测）。

**不做**：裁判结果预测、胜诉概率与倾向性结论；合同审查、合规筛查；对接真实司法系统；非公开数据；评注、教科书等有版权的内容。

**七条设计原则**

1. 无来源不输出：每条结论绑定可点击的原文出处。
2. 确定性优先：能用规则、SQL、专用解析库解决的，不交给大模型。
3. 流程可控：LangGraph 固定图结构加受限 Agent，步数、工具白名单、重试次数均有上限。
4. 全程留痕：每步输入、输出、模型版本、数据快照 ID 均可复现。
5. 接口抽象：检索、模型、存储、图存储四层可替换，便于后续升级。
6. 指标可核验：对用户展示的质量信息只用可核验计数与来源分级，不展示 LLM 打出的抽象分数。
7. 分析只给条件与依据：对案情的分析只输出适用条件、事实与证据的对照以及分歧点，不输出裁判结果、概率、倾向性结论或证据采信结论。

## 1. 待确认事项的结论

### 1.1 官方 XML 的获取方式与可得内容

**（1）联邦法律与法规：gesetze-im-internet.de（联邦司法部与联邦司法局提供）**

获取流程：

1. 请求目录文件 `https://www.gesetze-im-internet.de/gii-toc.xml`（每日更新的全站目录，XML 格式），解析每个 `<item>` 的 title 与 link；link 指向该法的压缩包。
2. 每部法律的完整 XML 打包在 `https://www.gesetze-im-internet.de/{slug}/xml.zip`（slug 即网址中的法律缩写路径，如 bgb、hgb、gmbhg），解压得到一个 XML 文件。
3. 用 lxml 按官方 DTD 解析，DTD 地址：`https://www.gesetze-im-internet.de/dtd/1.01/gii-norm.dtd`。

可得内容与限制：

| 项目 | 说明 |
| --- | --- |
| 范围 | 联邦法律与法规的现行合并文本，不含修订法本身；约六千余部 |
| 单条结构 | 法律缩写(jurabk)、条号(enbez，如 § 433)、条标题(titel)、章节层级(gliederungseinheit)、正文(Content/P)、脚注 |
| 法律级元数据 | 全称(langue)、公布信息(fundstelle)、Stand 标注(standangabe：最近一次修订的出处，及尚未纳入文本的修订提示) |
| 版本 | 仅最新合并版，无历史版本；已公布但未生效的修订不会体现在正文 |
| 授权 | 法律文本不受版权保护（德国著作权法第 5 条），站方声明可自由使用与再利用 |
| 其他格式 | HTML、PDF、EPUB |
| 不含 | 评注、判例、官方中文译本；部分重要法律另有英译页，但无法律效力、可能滞后 |

注意：每个 XML 的第一个 `<norm>` 通常是法律级元数据（无 enbez），其后才是各条文；各元素名请以 DTD 为准，开发时先 dump 一个样本核对。

**（2）联邦法院判决：rechtsprechung-im-internet.de（同样由联邦司法部与联邦司法局提供）**

- 判决免费提供 HTML、PDF、XML 三种格式，可再利用。
- 目录文件按惯例为 `https://www.rechtsprechung-im-internet.de/rii-toc.xml`（我没有在线实测该文件，请开发第一天先实测）。预期结构为每件判决一个 item，含法院、日期、案号和判决压缩包链接。
- 单件 XML 的典型字段（需实测核对）：法院类型、审判庭、裁判日期、案号(aktenzeichen)、ECLI、文书类型、涉及法条(norm)、Leitsatz(裁判要旨)、Tenor(主文)、Tatbestand(事实)、Entscheidungsgründe/Gründe(理由)。
- 覆盖：BGH、BVerwG、BFH、BAG、BSG、BPatG 等联邦法院的公开判决，是选择性公开而非全部；各院起始年份与完整度需实测。下级法院（OLG/LG）判决大量不在此处。

**（3）开发注意事项**

- 礼貌抓取：限速（建议 ≤1 请求/秒）、带可联系的 User-Agent、用 ETag/Last-Modified 做缓存；公开资料显示该站会拦截部分数据中心 IP，建议用自己的网络出口。
- 一次性全量下载到 `data/raw/{snapshot_id}/` 后离线开发，snapshot\_id 用抓取日期。评测只在固定快照上跑，保证可复现。
- 已有社区项目把该站 XML 转 SQLite 并包装为 MCP，可参考其表结构，但不要把它当数据源（时效与授权自行负责）。
- 学术语料可作解析器练手：Zenodo 上有德国联邦宪法法院判决 XML 语料（1951–2022，含 Leitsätze、Tenor、Gründe 等标注），但与买卖合同类争点关联不大，仅供参考。

**（4）MVP 建议取数清单**

| 类别 | 建议内容 | 说明 |
| --- | --- | --- |
| 成文法 | BGB、HGB、GmbHG、ZPO（含第 293 条外国法查明规定）、EGBGB | 约五千条；BGB 与 HGB 覆盖合同、买卖、侵权、商事买卖检验通知（HGB 第 377 条） |
| 国际条约 | CISG（联合国国际货物销售合同公约）中英文文本，手工入库 | 中德均为缔约国，货物买卖常触发；联合国官方公开文本，数据量极小 |
| 判例 | 联邦法院民商事判决：以金标准判例为核心，再加同审判庭约 500–1000 件作干扰集 | 否则召回率虚高，见 1.2 |
| 术语库 | 德-中-英 200–300 条合同法、买卖法核心术语 | 法学团队编写 |

### 1.2 MVP 案例的需求清单

选“无安全风险来源”的思路正确。针对案例，建议满足以下要求：

1. **统一模板**：每个案例一份 YAML（见下），法学团队填写，开发不用猜。
2. **来源安全**：用公开材料（最高院公布的查明类案例、公报案例、教材案例）改编，或法学团队自编模拟案例；不含个人信息，不用未授权卷宗。
3. **金标准必须在库内**：每个问题的 gold 法条和 gold 判例必须能从上述公开来源取到，否则该题不进召回评测（可单列为“库外题”，用来测系统是否老实提示无法查明）。
4. **数量与覆盖**：3–5 类争点，每类至少 3 个案例，共 10–15 个案例，其中 5–8 个做端到端评测，其余只做检索评测。争点建议：买卖合同瑕疵与救济（BGB §§ 433、434、437、439、323、280、281；HGB § 377）；违约损害赔偿；合同成立、撤销、缔约过失、诚信（BGB §§ 145 以下、119 以下、311、242）；格式条款（BGB §§ 305–310）；侵权（BGB § 823）。
5. **陷阱案例至少 5 个**：（a）应触发 CISG 提示；（b）涉及修订过的条文，合同日期早于当前版本的 Stand（如 2022-01-01 的买卖法修订涉及 § 434 等，请法学团队确认）；（c）库外问题，应提示无法查明；（d）2 个比较法陷阱案例，案情用语容易诱导套用中国法概念，用于 E8。
6. **难度分层**：单条文型、多条文加判例型、判例有分歧型各占一定比例。
7. **语言**：案情与问题用中文；另备 10 条德语问法，用于测跨语言检索。
8. **标注质量**：至少两名懂德国法的人员独立标注，分歧由第三人仲裁，记录一致率。
9. **开发集与测试集分离**：约 30% 开发集（调提示词与参数），70% 测试集（只在里程碑跑），避免过拟合；金标准内容不得出现在提示词和 few-shot 中。
10. **快照固化**：评测报告必须记录 snapshot\_id。

案例模板示例：

```yaml
case_id: C01
title: 中德设备买卖合同——设备瑕疵与解除
facts_zh: 脱敏案情……
claims_zh:                         # 各方主张与抗辩（B 部分的输入，选填但建议提供）
  - {party: 买方, text: 设备存在瑕疵，要求解除合同并退款}
  - {party: 卖方, text: 设备符合约定，买方未在合理期限内通知瑕疵}
materials:                         # 证据材料清单（M#），不是外国法材料
  - {name: 买卖合同, desc: 载明设备型号与验收条款}
  - {name: 检验报告, desc: 第三方出具的设备检测结果}
meta:
  contract_type: 货物买卖
  parties: [中国卖方, 德国买方]
  contract_date: 2021-06-01      # 合同订立日（债之关系成立时点）
  event_date: 2021-09-15         # 主要事实发生日（交付、违约、损害发生等）
  choice_of_law: 德国法
  cisg_excluded: true
questions:
  - qid: C01-Q1
    text_zh: 货物不符合约定时，买方可主张哪些救济？
    gold_norms: ['BGB:§437', 'BGB:§439', 'BGB:§323']
    gold_cases: ['<由法学团队填写案号>']
    key_points: ['事后履行优先', '催告期限', '解除的重大性要件']
    gold_elements: {e2: covered, e3: partial}   # S5 充分性判定的金标准，由专家按库内资料标注
    gold_issues:                                # E9：专家标注的争点
      - {kind: fact, text: 买方是否及时通知瑕疵}
      - {kind: law, text: 买方能否解除合同, elements: [e3]}
    gold_match: {e3: partial, e4: disputed}     # E9：要件—事实匹配状态金标准
    expected_flags: ['TIME_POINT_RED']     # 应触发的风险提示
    expected_concept_flags: []             # E8：应被拦截的易混淆中国法概念
split: test
```

## 2. 功能清单与 MVP 实现

覆盖此前优化建议与补充功能的全部项目；“MVP 实现”为简化版，“优化方向”为后续路线。

| 编号 | 功能 | MVP 简化实现 | 关键技术（Python） | 优化方向 |
| --- | --- | --- | --- | --- |
| F01 | 法源采集与快照 | 脚本一次性下载选定法律与判例，生成 snapshot\_id；每个快照一个只读目录 | httpx、lxml、zipfile、tenacity | 增量更新、变更监测、定时任务 |
| F02 | 解析与结构化 | 法条按条解析并保留 Absatz、Nummer 结构；判决分 Leitsatz/Tenor/Gründe | lxml、sqlite3 | 历史版本、Buchstabe 层级、更多法源 |
| F03 | 引证与交叉引用库 | 两层解析：候选抽取（refex 或宽松正则，案号由 refex 或自写规则处理）→ bundesrecht 规范化（ff. 不展开）→ 查库；解析失败的片段标“未解析引用”；建带出处的边表 | refex、bundesrecht、SQLite | 解析器微调、citator（被推翻、区别处理标记） |
| F04 | 混合检索 | BM25（含复合词对称拆分，拆分器可插拔）＋BGE-M3 向量＋RRF 融合＋重排 | rank\_bm25、snowballstemmer、拆分器、FlagEmbedding、faiss-cpu、bge-reranker-v2-m3 | OpenSearch 原生复合词拆分；微调嵌入与重排 |
| F05 | 术语库 | CSV 200–300 条，含 relation（等同、近似、无对应）与禁用译法列；检索改写、翻译与 V9 使用 | pandas | 本体、跨法域映射 |
| F06 | 要件模板 | YAML 手写 8–15 个争点模板（要件→核心条文，含 need\_cases、need\_materials、match\_facts、fact\_slots） | pyyaml | 扩充、半自动生成 |
| F07 | 案情要素抽取 | LLM 结构化抽取 CaseMeta、案情事实 F#（摘录式，记录原文位置）与各方主张 C#；证据材料清单（名称、描述、可粘贴摘录）；关键要素缺失时受限追问（≤2 轮） | openai SDK、pydantic | 多轮追问补全、上传文件解析 |
| F08 | 入口与风险提示 | 仅处理“已选德国法”入口；规则触发 CISG 闸门（未确认排除则暂停，只输出提示与 CISG 文本）、时点、格式条款提示；生成“适用法律入口检查”清单 | Python 规则、LangGraph interrupt | 完整冲突规范与连接点推理 |
| F09 | 查明事项拆解与需求单 | LLM 拆解＋模板匹配并展开要件，人工可编辑，可导出；报告后可追加问题 | pydantic、React 表单 | 与庭前会议材料联动 |
| F10 | 检索 Agent 与证据充分性判断（Researcher 节点，S4–S5） | 先确定性取模板核心条文，再受限 JSON-action 检索（每轮 ≤4 步，含图扩展）；按要件做充分性判断（规则优先，LLM 只复核 partial），不足则改写检索，最多 2 轮 | 自写循环、LangGraph 节点 | 原生 tool calling、并行子问题 |
| F11 | 材料包生成（Drafter 节点，S6b） | 按要件组织，基于德语原文与已校验译文起草，陈述带 element\_id，对齐第三条结构，JSON 结构化生成再渲染 | pydantic、jinja2、python-docx | 裁判文书“查明过程”段落草稿 |
| F12 | 翻译与对照（Translator 节点，S6a） | 与起草分离的独立步骤：术语库约束，逐条忠实翻译证据原文（每批 ≤8 段批量调用），首次出现的概念括注德语，标注“机器翻译，非官方译文”，结果缓存 | LLM、术语库 | 官方英译对照 |
| F13 | 校验与可信度（Critic 节点） | 确定性校验（V1–V3、V5–V11，其中 V7 复核充分性结论、V10 复核事实溯源与实体、V11 复核证据链与事实要素）优先，异厂商 LLM 蕴含判断（V4）其次；按问题回修，每个问题最多 2 次 | rapidfuzz、引用解析器、LangGraph 条件边 | NLI 小模型、回修策略优化 |
| F14 | 有效性与时点核验 | 记录 Stand 与抓取日；用合同订立日、事实发生日对照专家维护的时点警示表，输出红或黄两态（不设绿）；预留 norm\_versions 表 | lxml、pyyaml | 历史版本库、时点检索 |
| F15 | 已认定外国法案例检索 | 手工录入 5–10 条公开的内地查明案例作原型 | SQLite | 接最高院案例库、裁判文书 |
| F16 | 当事人材料核验 | 粘贴或上传文本→引用解析→逐项核验（核验的是当事人提供的外国法材料） | python-docx、PyMuPDF、引用解析器 | 译文比对、OCR |
| F17 | 专家库与会商流转 | 专家表＋状态机＋利益冲突声明字段，线下联系 | SQLite、React 看板 | 邮件或 IM 集成、出庭安排 |
| F18 | 人工复核与导出 | React 逐条采纳、修改、拒绝＋批注＋错误类型，写入 feedback 表；德语原文与译文并排，引用点击高亮；导出 docx、md、json | React、FastAPI、python-docx | 在线协同、引注格式规范 |
| F19 | 审计留痕 | events 表（rowid 作事件 ID，支持续传；不存用户原文，只存 ID 与哈希）＋每次运行 JSON 归档＋LangGraph checkpoint；report\_lineage 记录快照、解析器、索引、模型版本 | sqlite3、LangGraph SqliteSaver | Langfuse、日志平台 |
| F20 | 三角色模式 | 同一应用三套前端路由与功能开关；角色由 Bearer 令牌决定，后端按 roles.yaml 校验，越权返回 403 | FastAPI 依赖注入、React Router | 门户嵌入、SSO、等保 |
| F21 | 模型抽象层 | OpenAI 兼容客户端，按任务配置模型；主备供应商故障切换 | openai SDK | 私有化部署、路由、成本控制 |
| F22 | 评测与回归 | 确定性指标自写＋ranx，分层报告，报告置信区间；Ragas 仅离线抽样（先校准） | pytest、pandas、ranx | 持续评测看板 |
| F23 | 合规与标识 | 页面与导出固定 AI 生成提示；不输出裁判预测、胜诉概率与倾向性结论（V8 强制）；功能与局限说明 | 模板、V8 守卫 | 备案登记、内容安全 |
| F24 | 本体驱动图扩展 | 本体 v0（法条、判例、概念；CITES、APPLIES、DEFINES），确定性生成边；构建期扇出上限＋热门法条物化表；SQLite 递归 CTE 做 1–2 跳扩展；GraphStore 接口 | SQLite、SQL | 内存图、DuckPGQ 对比实验、图数据库、AMENDS 关系 |
| F25 | 校验仪表盘 | 展示可核验计数：引文一致、法条存在、证据支持、要件覆盖状态、事实溯源、要件—事实对照、概念溯源、A–D 级条数、时点与 CISG 提示、运行模式与快照；LLM 评分只写内部日志 | React 图表、events 表 | 趋势监控、Langfuse |
| F26 | 数据更新与质量闸门 | 命令行手动触发：拉取→解析到新快照目录→质量闸门→差异报告→回归集→指针切换；服务热加载并保留上一个快照；旧版追加到 norm\_versions；来源登记表 | httpx、lxml、sqlite3、hashlib | 定时任务、变更监测、历史版本库 |
| F27 | 反馈与可解释展示 | S8 操作与错误类型入 feedback 表；要件—证据矩阵与检索轨迹视图；受限多轮交互（S1 追问、追加问题） | React、FastAPI、sqlite3 | 反馈驱动的小模型与阈值调优 |
| F28 | 回归与漂移监控 | 30 题回归集；按争点、问法与模板命中分层报告；变更门禁；每周定时运行；线上 5% 抽检 | pytest、pandas、cron | 持续评测看板、Langfuse |
| F29 | 争点提取与分析 | 输入含事实、各方主张与证据清单；区分事实争点与法律争点并对应到要件；对事实“有争议”的标记由人工在 S3 确认；只列争点与分歧，不判断谁胜 | LLM、pydantic、要件模板 | 多方主张冲突检测、争点优先级 |
| F30 | 要件—事实匹配与证据链（Matcher 节点，S5b） | LLM 只提出候选关联（事实要素 slot→事实 F#、事实→材料 M#）；规则判定“具备、部分具备、缺失、有争议”四态：要件模板定义的事实要素须全部命中才算具备，无要素清单的要件最多判部分具备；生成证据链、缺口与冲突清单 | pydantic、规则、LLM | 证据链图交互、证据形式规则库 |
| F31 | 类案相似与差异 | `similar_cases`：判决 Tatbestand 段与用户事实摘要做向量相似；类似判例登记为 E#（role=similar），进入翻译与校验；输出相似点、差异点、判例对法律问题的观点（带逐字引文）及是否存在相反观点；不输出“本案会如何判” | BGE-M3、FAISS、LLM、V2 与 V4 | 内地已查明案例接入、citator |
| F32 | 咨询准备包与提问清单 | B 部分报告：争点清单、要件—事实对照、证据链与缺口、类似判例、风险提示（含适用法律入口检查）、向专业人士提问清单；按角色分级 | jinja2、python-docx、React | 引注格式、多语言版本 |
| F33 | 安全、隐私与限流 | 令牌鉴权与案件归属；按令牌与 IP 限流、每日成本预算；提示注入防护；PII 脱敏（发往 LLM 前）；日志脱敏；保留期与删除；同意声明记录 | FastAPI、slowapi、正则脱敏、sqlite3 | SSO、更完整的 NER 脱敏、审计合规 |
| F34 | 案件生命周期、版本与降级 | 案件列表、状态、删除；报告版本与内容哈希；SSE 续传与 `GET /jobs/{id}`；降级模式（完整、精简、检索）；运行库 WAL 与单写线程 | FastAPI、sqlite3、hashlib | 多实例、任务队列、对象存储 |

## 3. 总体架构与技术选型

### 3.1 分层架构

```
[React 前端：公共 / 司法 / 实务 三角色路由；案件列表、需求单、报告并排视图、案情分析页（争点、要件—事实对照、证据链、类案、提问清单）、校验仪表盘]
        |  REST + SSE（OpenAPI 契约，Bearer 令牌）
[FastAPI 服务 lawagent.api]  令牌鉴权 / 案件归属 / 限流 / PII 脱敏 / 任务管理 / 导出 / 审计
        |
[LangGraph 工作流 lawagent.flow]  SQLite checkpoint + interrupt 人工节点
   S0 录入（事实、各方主张、证据清单；同意声明、脱敏） > S1 要素、事实与主张抽取
   > S2 预检（时点红黄、适用法律入口检查、CISG 检查） --CISG 未确认排除--> CISG 闸门 [人工确认] --确认适用--> CISG 提示（结束）
   > S3 争点提取与要件展开 [人工确认]
   > Researcher(S4 检索 + S5 要件充分性判断与改写检索 + 证据包)
   > Matcher(S5b 要件—事实匹配与证据链，含 similar_cases，类案登记为 E#)
   > Translator(S6a 批量翻译) > Drafter(S6b 按要件起草：A 查明材料包 + B 咨询准备包)
   > Critic(S7 校验) --V5 未通过且该问题重试<2--> Translator
   > Critic --V10、V11 未通过且该问题重试<2--> Matcher
   > Critic --其他未通过且该问题重试<2--> Drafter
   > Critic --通过或超限降级--> S8 人工复核 [人工] > S9 导出（版本与哈希）
        |
[工具层 lawagent.tools]  norm_lookup / search_norms / search_cases / similar_cases / cites_of / expand_graph / glossary / translate / verify_*
        |
[检索与存储 lawagent.store]
   快照库（只读，按 snapshot_id）：法条、判例、分块、边表、BM25 与向量索引；服务保留当前与上一个快照
   运行库（读写，WAL）：案件登记、反馈、事件、版本、更新记录、checkpoint；GraphStore 接口
        |
[数据管线 lawagent.ingest]  gii-toc.xml > xml.zip > 解析入库到新快照目录；rii-toc.xml > 判决XML > 入库；引用解析器建边
[知识库 kb]  glossary.csv(含 relation) / ontology.yaml / templates(含 fact_slots) / timepoints.yaml
[模型层 lawagent.llm]       OpenAI 兼容接口：DeepSeek / Qwen
```

### 3.2 技术方案对比（已选方案 A）

| 对比项 | 方案 A：轻量单机（已选） | 方案 B：PostgreSQL 一体化 | 方案 C：OpenSearch 生产形态 |
| --- | --- | --- | --- |
| 存储与检索 | SQLite＋内存 BM25＋FAISS | PostgreSQL＋pgvector＋全文检索（可加 BM25 扩展） | OpenSearch：BM25＋kNN 混合 |
| 图扩展 | SQLite 边表＋递归 CTE | 同左（或 Apache AGE） | 边表独立存放，或接图数据库 |
| 工作流 | LangGraph（SQLite checkpointer） | LangGraph（Postgres checkpointer） | LangGraph |
| 服务形态 | FastAPI＋React，单进程 | FastAPI 多 worker＋React | FastAPI＋React，可容器编排 |
| 德语复合词 | 自写对称拆分＋字符 n-gram | 同左 | 原生复合词拆分过滤器，效果最好 |
| 部署 | 无外部服务，pip 与 npm 即可运行 | Docker 一个数据库 | Docker，JVM，运维较重 |
| 开发速度 | 最快 | 中 | 最慢 |
| 适用 | 单人 12 周 MVP | 多人并发演示 | 直接面向试点上线 |

选择方案 A，理由：MVP 语料约五千条法条加一两千件判决（切块后约 3–6 万块），FAISS 平面索引与内存 BM25 完全够用，服务不依赖任何外部组件。关键是把检索、模型、存储、图存储写成接口（`Retriever`、`LLMClient`、`Store`、`GraphStore`），后续切换到 B 或 C 只改实现，不改工作流与前端。单进程约束：模型与索引常驻内存，MVP 以单 worker 运行。

### 3.3 模型与向量组件选择

- **大模型**：主用Qwen（OpenAI 兼容接口）；另配一家不同厂商模型（DeepSeek）专作“校验裁判”，避免自己评自己。不同任务可配不同模型：抽取用小模型、报告用强模型。上线前务必用评测集比较，别凭印象选。
- **嵌入**：BGE-M3（多语言，中英德均可，支持长文本，可同时给稠密与稀疏向量）。无 GPU 时：限定判例规模（≤1000 件）、仅对 Gründe 主体段落建索引，或用云端嵌入 API 做一次性索引（数据为公开法源，无敏感性）。
- **重排**：bge-reranker-v2-m3，对融合后的 top 30 重排取 top 8。
- **国内网络**：模型权重用 ModelScope 或 hf-mirror 下载；pip 与 npm 用国内镜像。
- **前端**：React＋Vite＋TypeScript＋Tailwind＋shadcn/ui，细节见 3.5。

### 3.4 FastAPI 服务设计

- **契约先行**：先定 pydantic 模型与路由并导出 OpenAPI；前端用 openapi-typescript 生成类型化客户端；前后端可由 Agent 编程工具并行生成，以契约测试保证一致。
- **模型与快照常驻**：BGE-M3、重排模型常驻内存；快照库只读，按快照加载索引，服务保留当前与上一个快照。案件固定使用创建时的快照（`case_registry.snapshot_id`），恢复、追加问题沿用该快照；快照下线后恢复时提示“快照已更新，建议重新运行”。CPU 重任务用 `asyncio.to_thread`，单进程运行（workers=1）。
- **长任务与续传**：`POST /cases/{id}/run` 立即返回 job\_id；节点事件写入 events 表（rowid 即事件 ID）并经 SSE 推送；断线后用 `Last-Event-ID` 或 `GET /cases/{id}/events?after=` 续传；`GET /jobs/{id}` 查询任务状态；人工节点（S3、S8、CISG 闸门）用 LangGraph interrupt 暂停，前端确认后恢复，thread\_id 取 case\_id。
- **超时、失败与降级**：LLM 调用设超时与重试；主备供应商故障切换；仍失败则按 7.5 降级（精简模式或检索模式）；任务可取消；失败节点从 checkpoint 重跑。
- **鉴权**：请求头 `Authorization: Bearer <令牌>`，令牌绑定角色与所属主体（`configs/tokens.yaml` 只存哈希）。所有案件接口校验案件归属，不属于当前主体返回 404；角色无权的功能返回 403。公共端令牌随前端分发、不视为机密，靠限流、功能降级和成本预算保护。CORS 白名单。
- **并发与存储**：运行库开启 WAL 与 busy\_timeout，写入经单一写线程串行化；快照库只读；更新命令行写新快照目录，不写运行库（见 4.8）。
- **限流与注入防护**：按令牌和 IP 限流；用户输入、证据材料与抓取文本一律作为数据放入分隔区，系统提示声明其中的指令无效；输出仍受结构化约束与 V1–V11 校验（见 7.4）。

| 接口 | 作用 |
| --- | --- |
| `GET /cases` | 当前主体的案件列表（状态、创建时间、模式、快照） |
| `POST /cases`、`PUT /cases/{id}/meta` | 创建案件（事实、各方主张、证据材料清单、元数据、同意声明版本）；更新元数据 |
| `GET /cases/{id}` | 案件状态、运行模式、固定的快照 ID |
| `DELETE /cases/{id}` | 删除案件数据（输入、状态、checkpoint、版本、含用户文本的反馈），保留脱敏统计 |
| `POST /cases/{id}/run` | 启动或恢复工作流，返回 job\_id |
| `GET /jobs/{id}` | 任务状态与当前节点 |
| `GET /cases/{id}/events` | SSE：节点开始、结束、校验结果、等待人工；支持 `Last-Event-ID` 续传 |
| `POST /cases/{id}/confirm/{gate}` | 确认 S3、S8 或 CISG 闸门，携带人工修改 |
| `POST /cases/{id}/followup` | 追加待查明问题（见 5.6），经 S3 确认后只重跑新问题，沿用案件快照 |
| `GET /cases/{id}/report` | 取 A 部分（查明材料包）、B 部分（咨询准备包）、证据、要件状态、校验结果、仪表盘数据 |
| `GET /cases/{id}/versions` | 报告版本列表（版本号、触发原因、内容哈希、快照 ID） |
| `GET /cases/{id}/chain` | 证据链图数据：要件、事实、证据材料及其缺口与冲突 |
| `GET /cases/{id}/trace` | 检索轨迹：每步查询、命中、舍弃原因 |
| `PATCH /cases/{id}/statements/{sid}` | 逐条采纳、修改、拒绝，附批注与错误类型，写入 feedback 表 |
| `POST /feedback` | 公共端与检索页的点赞、点踩、问题报告 |
| `POST /cases/{id}/export` | 导出 docx、md、json，页脚含版本号、内容哈希与快照 ID |
| `GET /sources/{ref_id}` | 取法条或判决原文、译文、来源信息 |
| `GET /search` | 法条与判例检索（公共端可用） |
| `POST /verify-materials` | 当事人提供的外国法材料核验 |
| `/consults` 系列 | 专家会商流转 |
| `POST /internal/reload` | 仅本机可调用：快照切换后热加载新快照（4.8） |

数据更新（4.8）不提供对外接口，由命令行触发，避免把管理能力暴露给前端；快照切换通过仅限本机的内部重载接口完成。

### 3.5 前端设计

- **技术栈**：React＋Vite＋TypeScript＋Tailwind＋shadcn/ui；路由按角色分三组。
- **核心页面**：案件列表（本人案件、状态、模式、删除）；案情录入（事实、各方主张、证据材料清单，含同意声明与脱敏提示）；查明需求单与争点确认；报告审阅页；案情分析页；校验仪表盘；材料核验表；专家会商看板；检索页。
- **时点输入**：案情录入页强制填写“合同订立日”，建议同时填“主要事实发生日”，缺失则不能提交。报告页顶部固定显示时点提示条，只有红、黄两态，没有绿（见 4.7、6.2 V6）。
- **运行模式提示**：页面顶部显示当前模式（完整、精简、检索）；非完整模式时说明哪些功能被关闭及原因（见 7.5）。
- **可解释展示**：报告审阅页提供三个可审计的视图，不展示模型的思维链：（1）并排视图，左侧中文陈述与等级标签，右侧德语原文与译文，点击引用高亮来源；（2）要件—证据矩阵，列出每个要件的状态、证据链接和缺口说明；（3）检索轨迹，每步查询、命中与舍弃原因，由 events 日志生成。
- **案情分析页**（F29–F32）：争点清单（事实争点与法律争点分栏）；要件—事实对照表（四态标签：条件具备、部分具备、案情未提供、双方有争议，部分具备时显示缺少的事实要素）；证据链图（要件←事实←证据材料，缺口与冲突高亮，点击事实回到用户输入原文）；类似判例对比（相似点、差异点、判例观点与分歧）；适用法律入口检查与向专业人士提问清单（可复制、可导出）。页面固定说明：“条件具备不等于请求会被支持；本工具不预测裁判结果”。
- **反馈**：审阅页每条陈述可采纳、修改、拒绝，并选择错误类型（引用错误、译文不准、遗漏要件、过度推断、比较法污染、充分性误判、事实错误、其他），写入 feedback 表（4.2）。公共端只提供点赞、点踩和问题报告，不收集个人信息。反馈只用于统计与沉淀回归集，不做在线学习或自动微调。
- **受限多轮交互**：只支持 S1 缺失要素的追问、报告后的“追加待查明问题”、公共端检索问答的有限追问，不做开放式聊天（见 5.6）。
- **版本显示**：报告页显示当前版本号、内容哈希与快照 ID，可查看历史版本列表。
- **面向非技术用户**：引导式表单与示例问题；术语旁显示简释（取术语库 note 列，须法学团队审定）；红黄提示用通俗文案；完成一轮可用性测试（见 8.9）。
- **展示原则**：质量信息只展示可核验计数（见 6.5），不展示 LLM 打出的抽象分数；机器翻译一律带“非官方译文”标识；术语 relation 为 approximate 的概念，在译文旁显示“近似概念，已加注”标签。
- **测试**：Playwright 冒烟主路径（录入→确认→审阅→导出；材料核验；检索）、案情分析页主路径，以及 CISG 闸门与降级提示。

### 3.6 逻辑视图：证据中心的 Agentic Hybrid RAG 引擎

把检索、Agent、图、生成与核验在逻辑上统一表述为一个“证据中心”的引擎：所有环节围绕“要件—证据”这一核心数据结构，证据 ID 贯穿检索、生成与核验。这是用于架构表述与申报材料的**逻辑视图**，不改变代码模块和 LangGraph 节点边界。

| 层 | 内容 | 对应功能与章节 |
| --- | --- | --- |
| ① Hybrid Retrieval | BM25（含复合词拆分）＋BGE-M3＋RRF＋重排 | F04，4.4 |
| ② Deterministic Retrieval | `norm_lookup`、`case_lookup`、引用解析与查库 | 4.4 精确通道，6.1 |
| ③ Graph Augmentation | CITES、APPLIES、DEFINES，带扇出上限 | F24，4.6 |
| ④ Agentic Retrieval | 查询规划（S3）→ 检索 → 评估 → 改写 → 再检索，轮数受限 | F10，5.3、5.5 |
| ⑤ Evidence Sufficiency | 按要件判断证据是否充分：规则优先，LLM 只复核 partial | 5.5（Researcher 内部，S5） |
| ⑥ Provenance-aware Generation | Translator 与 Drafter 只能从要件—证据结构取证据，陈述带证据 ID 与 element\_id | F11、F12，5.2、5.4 |
| ⑦ Citation Verification | V1–V9 确定性核验＋异厂商 LLM 判断 | F13，6.2 |

**核心数据结构（Evidence Graph）**：证据包＋`elements`（要件状态与证据链接）＋图边（4.6）。不新增存储，状态对象和边表即可承载。

**案情分析层（F29–F32）**：在证据中心引擎之上增加一层面向用户案情的分析：事实 F# 和证据材料 M# 作为新的可追溯对象，与法源证据 E# 并列，要件状态之外增加“要件—事实匹配状态”。这一层只输出适用条件与依据，不输出裁判预测；细节与边界见 5.7。

**设计约束**：

- ⑥ 与 ⑦ 分属不同节点、使用不同厂商模型，生成与核验保持独立。
- ⑤ 属于 Researcher，起草前完成；V7 在 Critic 中独立复核充分性结论，防止“自己评自己”。
- ④ 是受限循环：每轮步数、改写轮数、工具白名单都有上限。
- 统一架构本身不带来性能提升，收益来自 ⑤ 的实现质量，由 8.3 的消融实验验证。

## 4. 数据层设计

### 4.1 项目目录

```
lawagent/
  configs/                       # models.yaml, retrieval.yaml, roles.yaml, tokens.yaml(只存哈希), limits.yaml, quality_gate.yaml
  data/state/state.sqlite       # 运行库（读写，WAL）：案件登记、反馈、事件、版本、更新记录、血缘
  data/state/checkpoints.sqlite # LangGraph checkpoint
  data/snapshots/{snapshot_id}/ # 只读快照目录
      raw/                      # 原始 zip/xml
      law.sqlite                # 快照库：法条、判例、分块、边表、edges_top、hot_norm_cases
      index/                    # bm25.pkl, faiss.index, chunk_ids.npy
  data/current_snapshot         # 指针文件（内容为 snapshot_id），原子重命名切换
  kb/glossary.csv  kb/ontology.yaml  kb/timepoints.yaml  kb/templates/*.yaml  kb/cases_cn/*.yaml
  lawagent/ingest/  (fetch_gii.py parse_gii.py fetch_rii.py parse_rii.py citations.py build_edges.py update.py quality_gate.py)
  lawagent/store/   (db.py snapshots.py bm25.py compound.py vec.py rerank.py retriever.py graph.py)
  lawagent/llm/     (client.py prompts/*.md)
  lawagent/tools/   (norms.py cases.py similar.py glossary.py graph.py verify.py)
  lawagent/flow/    (state.py nodes.py graph.py checks.py timepoint.py sufficiency.py matcher.py)
  lawagent/security/ (auth.py limits.py pii.py retention.py)
  lawagent/api/     (main.py deps.py routes/ sse.py export.py)
  web/              (React 前端：src/pages，src/api 由 openapi-typescript 生成)
  eval/             (cases/*.yaml run.py metrics.py regression/ reports/)
  tests/
```

### 4.2 数据表（SQLite）

**库的划分**：为支持快照固定与并发，数据分成两类。快照库（只读，每个快照一份 `law.sqlite`）：norms、norm\_versions、cases、chunks、edges、edges\_top、hot\_norm\_cases、unparsed\_refs。运行库（读写，开启 WAL 与 busy\_timeout，写入经单一写线程串行化）：glossary、experts、consults、events、feedback、data\_sources、update\_runs、norm\_changes、report\_lineage，以及下方追加的 case\_registry、consents、report\_versions、usage\_counters。下面的建表语句按此分库执行；更新流程只写新的快照库，不写运行库（见 4.8）。events 表以 rowid 作事件 ID，SSE 续传按 `rowid > :after` 查询；events 不存用户原文，只存 ID、哈希与引用。

```sql
CREATE TABLE norms(
  norm_id TEXT PRIMARY KEY,        -- 'BGB:§433'
  law TEXT, enbez TEXT, title TEXT, heading_path TEXT,
  text_de TEXT,                   -- 正文全文，用于检索与展示
  structure TEXT,                 -- JSON：Absatz、Nummer 层级，引文核对可精确到款
  footnotes TEXT,
  stand TEXT,                     -- 法律级 Stand 标注原文
  has_pending_amend INT,          -- Stand 中含 'noch nicht berücksichtigt'
  source_url TEXT, snapshot_id TEXT, fetched_at TEXT);
-- 版本表：MVP 每条法条一行现行版；历史版本后续按 valid_from、valid_to 追加
-- 有效期属于法条版本，不属于边；边的有效性随两端节点的版本而定
CREATE TABLE norm_versions(
  norm_id TEXT, version_no INT,
  valid_from TEXT, valid_to TEXT, -- MVP：valid_from 取 Stand 可确定的日期，否则为空；valid_to 为空
  text_de TEXT, structure TEXT, stand TEXT,
  source_url TEXT, snapshot_id TEXT,
  PRIMARY KEY (norm_id, version_no));
CREATE TABLE cases(
  case_id TEXT PRIMARY KEY,       -- 'BGH:VIII ZR 12/20:2021-05-12'
  court TEXT, senate TEXT, decided TEXT, az TEXT, ecli TEXT, doctype TEXT,
  leitsatz TEXT, tenor TEXT, tatbestand TEXT, gruende TEXT, norms_meta TEXT,
  source_url TEXT, snapshot_id TEXT, fetched_at TEXT);
CREATE TABLE chunks(
  chunk_id TEXT PRIMARY KEY, kind TEXT,   -- 'norm' 或 'case'
  ref_id TEXT, seq INT, text TEXT, ctx_prefix TEXT);
-- 图的边表。节点 ID 前缀：NORM: / CASE: / CPT:（概念）
CREATE TABLE edges(
  src TEXT, dst TEXT,
  rel TEXT,                       -- CITES | APPLIES | DEFINES（AMENDS 后置）
  source TEXT,                    -- rule | expert | llm
  span TEXT,                      -- 引用在原文中的位置，便于回溯
  confidence REAL, reviewed INT DEFAULT 0, snapshot_id TEXT);
CREATE INDEX idx_edges_src ON edges(src, rel);
CREATE INDEX idx_edges_dst ON edges(dst, rel);
-- 热门法条的适用判例，构建期预计算（见 4.6 防爆措施）
CREATE TABLE hot_norm_cases(norm_id TEXT, case_id TEXT, rank INT, PRIMARY KEY (norm_id, case_id));
-- 安全失败：解析器没能处理的引用片段，交人工核对
CREATE TABLE unparsed_refs(owner_id TEXT, raw TEXT, span TEXT, snapshot_id TEXT);
CREATE TABLE glossary(de TEXT, zh TEXT, en TEXT,
  relation TEXT,                  -- equivalent | approximate | none
  zh_forbidden TEXT,              -- 易混淆的禁用译法，分号分隔
  note TEXT, source TEXT);
CREATE TABLE experts(expert_id TEXT PRIMARY KEY, name TEXT, langs TEXT, fields TEXT,
  qualification TEXT, conflict_declared INT);
CREATE TABLE consults(consult_id TEXT PRIMARY KEY, case_id TEXT, expert_id TEXT,
  status TEXT, question_snapshot TEXT, reply TEXT, updated_at TEXT);
CREATE TABLE events(ts TEXT, case_id TEXT, step TEXT, model TEXT, prompt_hash TEXT,
  input_ref TEXT, output_ref TEXT, actor TEXT);
```

追加的表（反馈、数据源登记、更新记录、变更明细、报告血缘）：

```sql
-- S8 的结构化反馈：沉淀回归集，统计错误类型；不用于在线学习
CREATE TABLE feedback(
  fid INTEGER PRIMARY KEY, ts TEXT, case_id TEXT, sid TEXT, element_id TEXT,
  action TEXT,                    -- accept | edit | reject | thumbs_up | thumbs_down | report | audit
  error_type TEXT,                -- citation | translation | missing_element | overreach
                                  -- | comparative_pollution | sufficiency | fact_error | other
  before_text TEXT, after_text TEXT, note TEXT,
  role TEXT, actor TEXT,          -- 公共端不记录个人信息，actor 为空
  run_id TEXT, snapshot_id TEXT, model TEXT, prompt_hash TEXT);
-- 数据源登记表
CREATE TABLE data_sources(
  source_id TEXT PRIMARY KEY, name TEXT, base_url TEXT,
  license_note TEXT, license_checked_at TEXT,
  fetch_method TEXT, update_freq TEXT, last_ok_at TEXT, parser_version TEXT, notes TEXT);
-- 每次更新运行及其质量闸门结果
CREATE TABLE update_runs(
  run_id TEXT PRIMARY KEY, started_at TEXT, source_id TEXT,
  old_snapshot TEXT, new_snapshot TEXT,
  gate_result TEXT,               -- passed | failed | forced
  gate_detail TEXT,               -- JSON：各项闸门结果
  n_added INT, n_removed INT, n_changed INT,
  switched_at TEXT, regression_run_id TEXT);
-- 更新差异明细，联动时点警示表
CREATE TABLE norm_changes(
  run_id TEXT, norm_id TEXT, change_type TEXT,   -- added | removed | changed
  old_hash TEXT, new_hash TEXT, detected_at TEXT,
  timepoint_status TEXT DEFAULT 'pending');      -- pending | recorded | not_needed
-- 报告血缘：每份报告用了哪个快照、解析器、索引与模型
CREATE TABLE report_lineage(
  case_id TEXT, run_id TEXT, snapshot_id TEXT, index_version TEXT,
  parser_version TEXT, model TEXT, prompt_hash TEXT);
```

运行库中为生命周期、安全与版本新增的表：

```sql
-- 案件登记：归属、固定快照、运行模式、保留期
CREATE TABLE case_registry(
  case_id TEXT PRIMARY KEY,          -- UUID，不可猜测
  owner TEXT, role TEXT,             -- 令牌所属主体与角色
  snapshot_id TEXT,                  -- 创建时固定的快照
  mode TEXT DEFAULT 'full',          -- full | lite | retrieval
  status TEXT, created_at TEXT, updated_at TEXT,
  retention_until TEXT, deleted_at TEXT);
CREATE INDEX idx_case_owner ON case_registry(owner, created_at);
-- 同意声明记录
CREATE TABLE consents(case_id TEXT, version TEXT, accepted_at TEXT, role TEXT);
-- 报告版本：首次运行、追加问题、人工复核或重跑后各生成一版
CREATE TABLE report_versions(
  case_id TEXT, version INT, created_at TEXT,
  trigger TEXT,                      -- first_run | followup | review | rerun
  content_hash TEXT,                 -- 规范化 JSON 的 sha256
  snapshot_id TEXT, path TEXT,
  PRIMARY KEY (case_id, version));
-- 限流与成本预算计数
CREATE TABLE usage_counters(
  principal TEXT, day TEXT, n_requests INT, n_llm_calls INT, n_tokens INT,
  PRIMARY KEY (principal, day));
```

### 4.3 采集与解析要点

- 解析时跳过无条号的单元；条号规范化为 `BGB:§433`；`Stand` 原文整段保存，并用子串 `noch nicht berücksichtigt` 置位 `has_pending_amend`。
- 法条正文既存全文，也按 Absatz、Nummer 两层存成 JSON（`structure` 列），使引文核对和引用解析可精确到款；层级划分参考 bundesrecht 语料的做法，MVP 先做到 Absatz 与 Nummer，Buchstabe 以下后置。
- 判决 XML 先 dump 一个样本，按实际字段名映射到 `cases` 表；缺失字段留空，不要猜。
- 原始 zip/xml 一律原样保存并记录 sha256，便于核对和复现。

```python
import io, json, re, zipfile
from lxml import etree

def fetch_toc(client):
    r = client.get('https://www.gesetze-im-internet.de/gii-toc.xml'); r.raise_for_status()
    root = etree.fromstring(r.content)
    return [(i.findtext('title'), i.findtext('link')) for i in root.iter('item')]

def fetch_law_xml(client, link):
    z = zipfile.ZipFile(io.BytesIO(client.get(link).content))
    name = next(n for n in z.namelist() if n.lower().endswith('.xml'))
    return z.read(name)

RE_ABS = re.compile(r'^\((\d+[a-z]?)\)\s*')

def build_structure(content_el):
    '''把 Content 下的 P 与 DL 切成 Absatz、Nummer 两层；元素名以 DTD 与样本为准。'''
    absaetze, cur = [], None
    for el in content_el:
        if el.tag == 'P':
            text = ' '.join(el.itertext()).strip()
            m = RE_ABS.match(text)
            if m or cur is None:
                cur = {'absatz': m.group(1) if m else '', 'text': RE_ABS.sub('', text), 'nummern': []}
                absaetze.append(cur)
            else:
                cur['text'] += '\n' + text
        elif el.tag == 'DL' and cur is not None:
            for dt, dd in zip(el.findall('DT'), el.findall('DD')):
                cur['nummern'].append({'nr': ' '.join(dt.itertext()).strip().rstrip('.'),
                                       'text': ' '.join(dd.itertext()).strip()})
    return absaetze

def parse_gii(xml_bytes, snapshot_id, source_url):
    root = etree.fromstring(xml_bytes)
    norms = root.findall('norm')
    meta0 = norms[0].find('metadaten')            # 法律级元数据
    law = meta0.findtext('jurabk')
    stand = ' | '.join(' '.join(x.itertext()).strip() for x in meta0.findall('standangabe'))
    rows = []
    for n in norms:
        m = n.find('metadaten')
        enbez = m.findtext('enbez')
        if not enbez:
            continue
        paras = [' '.join(p.itertext()).strip() for p in n.iterfind('.//textdaten//P')]
        content_el = n.find('.//textdaten//Content')
        structure = build_structure(content_el) if content_el is not None else []
        heading = ' > '.join((g.findtext('gliederungsbez') or '') + ' ' + (g.findtext('gliederungstitel') or '')
                             for g in m.findall('gliederungseinheit'))
        rows.append(dict(
            norm_id=(law + ':' + enbez).replace(' ', ''), law=law, enbez=enbez,
            title=m.findtext('titel'), heading_path=heading,
            text_de='\n'.join(p for p in paras if p),
            structure=json.dumps(structure, ensure_ascii=False), stand=stand,
            has_pending_amend=int('noch nicht berücksichtigt' in stand),
            source_url=source_url, snapshot_id=snapshot_id))
    return rows        # 入库时同时写 norms 与 norm_versions（version_no=1）
```

### 4.4 分块、索引与检索

- **法条**：一条一块；超过约 700 token 按 Absatz 切分。检索文本 = `ctx_prefix`（如“BGB § 437 Rechte des Käufers bei Mängeln | Buch 2 > Abschnitt 8”）＋正文。
- **判决**：Leitsatz＋Tenor 合为一块作摘要块；Gründe 按段落合并至约 500 token，相邻块重叠一段；前缀含法院、案号、日期。
- **BM25 与复合词**：分词流程为小写、去标点、保留 `§433` 这类整体 token、ä ö ü ß 归一化，再做**复合词对称拆分**：索引与查询两侧用同一个拆分器（`Splitter` 接口，实现可插拔），同时保留原词和拆出的词根，最后做 snowball 词干化；字符 3-gram 作兜底。只在查询侧拆分无效，因为索引里的词仍是复合形态。拆分器选型见代码后的说明。
- **查询改写**：S3 生成德语检索式时，让 LLM 同时给出复合词、拆分变体和拼写变体（如 Schadensersatz 与 Schadenersatz），作为补充而非替代。拆分器是否启用由 E1 基线决定：仅 BM25 召回不达标再开，并用消融实验验证收益。
- **向量**：BGE-M3 稠密向量，归一化后用 FAISS `IndexFlatIP`；中文问句可直接跨语言检索德语块。
- **检索流程**：
  1. 精确通道：问句中出现 `§` 引用或案号时，用 `norm_lookup`、`case_lookup` 直接取并置顶（确定性）。
  2. BM25 取 50，向量取 50，RRF 融合取 30。
  3. 图扩展（见 4.6，扇出上限在构建期已处理）：对融合结果中的 top 法条，取“适用该条的判例”和“该条引用的法条”加入候选池；由配置开关控制，可整体关闭。
  4. bge-reranker 重排取 top 8；支持按法律、法院、日期做元数据过滤。

```python
from collections import defaultdict
from typing import Protocol

def rrf(rank_lists, k=60):
    score = defaultdict(float)
    for lst in rank_lists:
        for r, cid in enumerate(lst):
            score[cid] += 1.0 / (k + r + 1)
    return sorted(score, key=score.get, reverse=True)

class Splitter(Protocol):
    def split(self, word: str) -> list[str]: ...

FUGEN = ('', 's', 'n', 'en', 'es', 'e', 'er')

class VocabSplitter:
    '''实现 1：基于本语料词表的拆分；vocab_freq 为入库文本的词频统计。'''
    def __init__(self, vocab_freq, min_part=4, min_freq=5):
        self.v = {w for w, c in vocab_freq.items() if c >= min_freq and len(w) >= min_part}
        self.min_part = min_part

    def split(self, w, depth=0):
        w = w.lower()
        if depth > 3 or (w in self.v and len(w) <= 7):
            return [w]
        best = None
        for i in range(self.min_part, len(w) - self.min_part + 1):
            for f in FUGEN:
                if f and not w[:i].endswith(f):
                    continue
                head, tail = w[:i - len(f)], w[i:]
                if head in self.v:
                    rest = [tail] if tail in self.v else self.split(tail, depth + 1)
                    if all(p in self.v for p in rest):
                        cand = [head] + rest
                        if best is None or len(cand) < len(best):
                            best = cand
        return best or [w]

class CharSplitAdapter:
    '''实现 2、3：适配 CharSplit（split-words 或 charsplit-fst，原模型或用本语料名词重训的模型）。
    CharSplit 返回按得分排序的二分候选 [(score, head, tail), ...]；接口以所装版本为准。'''
    def __init__(self, sp, vocab, min_score=0.3, min_part=4):
        self.sp, self.vocab, self.min_score, self.min_part = sp, vocab, min_score, min_part

    def _strip_fugen(self, w):
        for f in FUGEN:
            if (not f or w.endswith(f)) and w[:len(w) - len(f)] in self.vocab:
                return w[:len(w) - len(f)]
        return None

    def split(self, word, depth=0):
        w = word.lower()
        if depth > 3 or len(w) < 2 * self.min_part:
            return [w]
        for score, a, b in self.sp.split_compound(word):
            if score < self.min_score:
                break
            head, tail = self._strip_fugen(a.lower()), b.lower()
            if head:
                rest = [tail] if tail in self.vocab else self.split(tail, depth + 1)
                return [head] + rest
        return [w]

def index_tokens(word, splitter, stem):
    '''索引与查询共用：保留原词，再加拆出的词根。'''
    parts = splitter.split(word)
    toks = {word.lower()} | set(parts)
    return [stem(t) for t in toks]
```

**拆分器选型**：在约 200 个法学团队挑选的法律复合词上（如 Schadensersatzanspruch、Nacherfüllungsanspruch、Rücktrittsrecht）比较三种实现：自写词表法、CharSplit 原模型、用本语料名词重训的 CharSplit（官方支持自训练）。CharSplit 的模型用通用维基百科名词训练，法律术语未必最优，且只做二分、返回按得分排序的候选，需设阈值并递归。最终以 E1 的 BM25 召回消融为准，而不是拆分准确率：索引时保留原词并加词根，拆错只会增加噪声 token，不会丢召回，所以不需要法学团队大规模扩充词典。单元测试：`Schadensersatzanspruch` 的结果应含 `schadensersatz` 与 `anspruch`，并保留原词。

### 4.5 术语库与要件模板格式

`kb/glossary.csv` 列：`de,zh,en,relation,zh_forbidden,note,source`。`relation` 取值：`equivalent`（等同）、`approximate`（近似，须加注）、`none`（德国法无对应，禁止使用中国法术语）；`zh_forbidden` 记录易混淆的禁用译法。下列译法与关系仅为格式示例，须法学团队审定：

| de | zh（示例） | relation | zh\_forbidden（示例） | 备注 |
| --- | --- | --- | --- | --- |
| Sachmangel | 物之瑕疵 | equivalent |  | BGB § 434 |
| Nacherfüllung | 事后履行 | equivalent |  | BGB § 439 |
| Rücktritt | 解除 | equivalent | 撤销 | 与 Anfechtung（撤销）区分，BGB § 323 |
| Anspruch | 请求权 | equivalent | 诉权 | 不同于程序法上的诉权 |
| Treu und Glauben | 诚实信用 | equivalent |  | BGB § 242 |
| Anscheinsvollmacht | 外观代理权（译法待审定） | approximate |  | 与中国法的表见代理功能相近，要件不同，须加注说明 |

`kb/templates/kauf_mangel.yaml`（要件模板示例，须法学团队审定）：

```yaml
issue_id: kauf_mangel
name_zh: 买卖合同物之瑕疵与买方救济
triggers: [瑕疵, 货物不符, 质量, 解除, 修理, 减价]
elements:      # need_cases、need_materials、match_facts、fact_slots 均由法学团队按争点判断
  - id: e1
    name_zh: 是否构成物之瑕疵
    core_norms: ['BGB:§434']
    need_cases: 0
    need_materials: true
    match_facts: true
    fact_slots:                  # 要件所需的事实要素；全部命中才可判“条件具备”
      - {id: s1, name_zh: 合同约定的品质或用途}
      - {id: s2, name_zh: 交付时货物的实际状况或缺陷表现}
    glossary: [Sachmangel]
  - {id: e2, name_zh: 买方救济体系, core_norms: ['BGB:§437','BGB:§439','BGB:§440'], need_cases: 0, need_materials: false, match_facts: false}
  - id: e3
    name_zh: 解除与损害赔偿的前提
    core_norms: ['BGB:§323','BGB:§280','BGB:§281']
    need_cases: 1
    need_materials: true
    match_facts: true
    fact_slots:
      - {id: s1, name_zh: 买方的催告行为}
      - {id: s2, name_zh: 催告所设期限}
      - {id: s3, name_zh: 期限届满时卖方仍未履行}
  - id: e4
    name_zh: 商事买卖的检验与通知义务
    core_norms: ['HGB:§377']
    need_cases: 1
    need_materials: true
    match_facts: true
    condition: both_merchants
    fact_slots:
      - {id: s1, name_zh: 交付时间}
      - {id: s2, name_zh: 买方检验情况}
      - {id: s3, name_zh: 通知的时间与内容}
  - id: e5
    name_zh: 时效
    core_norms: ['BGB:§438']
    need_cases: 0
    need_materials: false
    match_facts: true
    fact_slots:
      - {id: s1, name_zh: 交付时间}
flags: [TIME_POINT, CISG_CHECK]
```

### 4.6 本体 v0 与图扩展（F24）

本体由法学团队审定，写入 `kb/ontology.yaml`。节点与关系刻意取最小集合，边以规则生成为主，不依赖 LLM 开放式抽取。

| 类别 | 名称 | 含义 | 生成方式 |
| --- | --- | --- | --- |
| 节点 | Norm | 法条 | norms 表 |
| 节点 | Case | 判例 | cases 表 |
| 节点 | Concept | 法律概念（如 Sachmangel、Nacherfüllung） | 术语库与要件模板，专家定义 |
| 关系 | CITES | 法条引用法条；判例引用判例；判例对法条的字面引用 | 引用解析器，规则生成 |
| 关系 | APPLIES | 判例适用或解释某法条 | 判决元数据的法条字段＋正文引用，规则生成 |
| 关系 | DEFINES | 概念对应的核心法条 | 术语库与要件模板，专家录入 |
| 关系 | AMENDS | 修订关系 | 后置：gii 只有最近一次修订的 Stand 文本，缺逐条修订数据 |

**边的出处约束**：每条边带 `source`（rule、expert、llm）、`span`、`confidence`、`reviewed`。生产检索只使用 rule 与 expert 边，以及 `reviewed=1` 的 llm 边；LLM 抽取只放在实验分支，产出的边必须经专家审核才能入生产。

**图扩展查询**（构建期先做扇出上限，再用 SQLite 递归 CTE，1–2 跳足够）：

```sql
-- 构建期：每个 src 每种关系最多保留 20 条，优先专家边，再按置信度
CREATE TABLE edges_top AS
SELECT src, dst, rel, source, reviewed FROM (
  SELECT e.*, ROW_NUMBER() OVER (
           PARTITION BY src, rel ORDER BY (source = 'expert') DESC, confidence DESC) AS rk
  FROM edges e WHERE source IN ('rule', 'expert') OR reviewed = 1
) WHERE rk <= 20;
CREATE INDEX idx_top_src ON edges_top(src, rel);

-- 查询：跳数上限、边类型白名单、UNION 去重、结果总量上限
WITH RECURSIVE walk(node, depth) AS (
  SELECT :start, 0
  UNION
  SELECT e.dst, w.depth + 1 FROM walk w JOIN edges_top e ON e.src = w.node
  WHERE w.depth < :max_hops AND e.rel IN ('CITES', 'DEFINES')
)
SELECT node, MIN(depth) AS d FROM walk GROUP BY node LIMIT 60;

-- 适用某法条的判例：读构建期预计算的物化表
SELECT case_id FROM hot_norm_cases WHERE norm_id = :norm ORDER BY rank LIMIT :n;
```

**接口**：业务代码只依赖 `GraphStore`，后续换图数据库不改工作流。

```python
from typing import Protocol

class GraphStore(Protocol):
    def neighbors(self, node_id: str, rels: list[str], direction: str = 'out', limit: int = 20) -> list[dict]: ...
    def expand(self, start_ids: list[str], max_hops: int = 2, rels: list[str] | None = None) -> list[dict]: ...
```

**扩展策略与防爆措施**：对重排前的 top 法条，取 APPLIES 入边的判例（最多 5 件）和 CITES 出边的法条（最多 5 条），只进入候选池再经重排，不直接进证据包。关系爆炸来自高扇出节点（如 § 242、§ 823 被大量判例适用），靠三项措施控制，而不是靠更换查询引擎：（1）构建期扇出上限，每个 src 每种关系最多保留 20 条（`edges_top`）；（2）跳数固定 ≤2，边类型用白名单；（3）热门法条的适用判例预计算为 `hot_norm_cases`。用 E1 消融（图扩展开或关）验证收益，没有收益就关闭。

**为什么暂不用图数据库，也不用 DuckPGQ**：规模为数万节点、十万级边，SQLite 足够。DuckDB 官方文档标明，DuckPGQ 是仍在积极开发的社区扩展，在其最新发布版 1.5.x 上不可用，需退回 1.4.4，且出自研究项目，版本锁定风险高；再加一个数据库引擎还会带来与 SQLite 之间的数据同步和文件锁问题。据公开报道，KùzuDB 背后公司已被 Apple 收购，仓库已归档，不宜作新项目首选；Neo4j 社区版需要 JVM 或 Docker，对 MVP 过重；LlamaIndex PropertyGraphIndex 的 LLM 抽取要对全部块逐块调用大模型，成本高且有噪声。

**切换触发条件**：图扩展 P95 超过 200 ms，或需要 3 跳以上、最短路径时，通过 `GraphStore` 评估替代实现：先试 networkx 或 igraph 内存图（几万节点、十万级边载入内存即可），再试 DuckDB＋DuckPGQ（固定 DuckDB 1.4.x）；二者与 PropertyGraphIndex 一起放在 W11 作对比实验（可选）。

### 4.7 时点警示表与版本表（F14）

gesetze-im-internet 只有现行版本，MVP 无法按历史时点取文。做法是：诚实标注、红黄两态提示、专家线下复核，并预留版本表。

- **日期口径**：以“债之关系成立时点”（合同订立日）和“主要事实发生日”为准，而不是争议发生或起诉的时间。德国法的过渡规则（一般在 EGBGB 第 229 条相应各节）通常决定新旧法适用，具体由法学团队逐条确认。前端强制填写合同订立日，事实发生日建议填写。
- **版本表**：`norm_versions` 预留历史版本；MVP 每条法条只有一行现行版。有效期放在版本上，边表不加时间戳。
- **时点警示表** `kb/timepoints.yaml`：由专家维护，只记录 MVP 高频条文的重大修订，20 到 30 条即可。下例仅为格式示例，须法学团队核实：

```yaml
- norms: ['BGB:§434', 'BGB:§437', 'BGB:§438', 'BGB:§439']
  changes:
    - effective: 2022-01-01
      basis: contract           # 以合同订立日为准；contract 或 event
      note: 买卖法修订，物之瑕疵的定义等与旧法有差异
      transitional: EGBGB 第 229 条相应节（节号由法学团队核实）
    - effective: 2002-01-01
      basis: contract
      note: 债法现代化
      transitional: EGBGB 第 229 条相应节（节号由法学团队核实）
```

- **红黄两态规则**：红＝所需日期缺失，或日期早于任一相关修订的生效日；黄＝日期晚于全部已知修订，但系统无历史版本，无法保证适用版本。**不设绿**，因为 MVP 无法证明“现行文本适用于该时点”。风险提示只是辅助，红色须由专家确认适用版本。

```python
def timepoint_level(meta, evidence_norms, table):
    '''返回 ('red' 或 'yellow', 原因列表)；日期用 ISO 字符串，便于直接比较。'''
    reasons = []
    if not meta.contract_date:
        reasons.append('缺少合同订立日')
    for row in table:
        if not set(row['norms']) & set(evidence_norms):
            continue
        for ch in row['changes']:
            d = meta.event_date if ch.get('basis') == 'event' else meta.contract_date
            if not d:
                reasons.append('缺少日期，无法比对 ' + str(ch['effective']) + ' 的修订')
            elif d < str(ch['effective']):
                reasons.append('日期早于 ' + str(ch['effective']) + ' 的修订：' + ch['note'])
    if reasons:
        return 'red', reasons
    return 'yellow', ['系统仅含现行版本，需专家确认适用版本']
```

历史全文入库放到后续：可核对联邦法律公报，或评估社区维护的法律修订历史库（可用性与授权须自行核实）。

### 4.8 数据更新、质量闸门与元数据（F26）

**双轨原则**：评测与验收使用冻结的 snapshot，评测报告记录 snapshot\_id；运行库另走更新流程，更新后必须通过回归集才能切换。这样既能更新法律库，又保证评测可复现。

**手动更新流程**（命令行触发，如 `python -m lawagent.ingest.update --source gii`，支持 `--dry-run`）：

1. 拉取：重新取 `gii-toc.xml` 与选定法律的 xml.zip。
2. 解析并写入**新的快照目录**（`data/snapshots/{new_id}/`），记录 sha256 与解析器版本；旧快照目录保持不变，运行库不受影响。
3. 质量闸门（下表），任一项未通过则暂停，保持旧快照为当前。
4. 差异报告：新增、删除、变更的条文写入运行库的 `norm_changes`。
5. 在新快照的索引上跑 8.8 的回归集；幻觉引用数必须为 0，召回等指标不得退化超过阈值。
6. 切换：原子重命名写入指针文件 `data/current_snapshot`，更新 `update_runs`，调用本机内部接口 `POST /internal/reload` 让服务加载新快照；失败则回滚指针。

**快照固定与热加载**：服务同时保留当前与上一个快照的索引。案件创建时固定当前快照，恢复、追加问题、导出都沿用该快照，所以人工节点等待期间发生更新，也不会让同一份报告混用两个快照。旧快照在没有活动案件使用后才卸载，目录至少保留两个。若恢复时案件所用快照已被清理，提示“快照已更新，建议重新运行”，不静默切换到新快照；新建案件使用新快照。

**质量闸门**（阈值为初始建议值，写入 `configs/quality_gate.yaml`，首轮更新后校准）：

| 闸门 | 检查 | 初始阈值 | 失败处理 |
| --- | --- | --- | --- |
| 目录比对 | 解析条数与 gii-toc 目录、上次快照对比 | 条数变化超过 ±5% 需人工确认 | 暂停 |
| 必填字段 | enbez、text\_de、law 非空 | 空文本率 ≤ 0.5% | 暂停 |
| 条号连续性 | 同一法律内条号序列无异常断档 | 异常断档须人工确认 | 暂停 |
| 结构契约 | 固定样本（BGB § 433、HGB § 377）解析结果与期望一致；XML 根结构与 DTD 版本未变 | 必须全部通过 | 暂停并告警 |
| 文本变化 | 与上次快照的哈希对比 | 变更比例超过 10% 需人工确认 | 暂停 |
| 解析失败率 | 解析异常条数 ÷ 总条数 | ≤ 0.5% | 暂停 |
| 回归集 | 新索引上跑回归集 | 幻觉引用数为 0；召回@10 下降 ≤ 0.05 | 不切换 |

**联动时点警示表**：`norm_changes` 中变更的条文自动生成“候选修订”条目，由专家补填生效日、适用基准与过渡规则后写入 `kb/timepoints.yaml`。注意：系统检测到变化的日期不等于法律生效日。

**积累版本史**：更新时把旧版追加到 `norm_versions`。其 `valid_from`、`valid_to` 只记录我们观察到的抓取区间，不等于法律生效区间；法律生效区间仍由专家在时点警示表中记录。这只能覆盖开始抓取之后的变化，不能替代历史全文入库。

**元数据与血缘**：

- 来源登记表 `data_sources`：来源、URL、许可条款与核查日期、抓取方式、更新频率、最后成功时间、解析器版本。新增来源前必须先核查许可并登记。
- 报告血缘 `report_lineage`：每份报告记录 snapshot\_id、解析器版本、索引版本、模型与 prompt\_hash，保证可追溯。

**源站变化监测**：目录条目数突变、XML 结构或 DTD 版本变化、HTTP 异常、解析失败率升高、结构契约测试失败，均告警并保持旧库。

**更新频率**：MVP 阶段手动触发，验收期冻结；试点期法律每周、判例每周或每月，再考虑定时任务。

## 5. Agent 工作流

### 5.1 状态对象

工作流用 LangGraph 的 StateGraph 实现，状态对象为下列 pydantic 模型。每个节点结束时 LangGraph 把状态写入 SQLite checkpoint（thread\_id 取 case\_id）；人工节点（S3、S8、CISG 闸门）用 interrupt 暂停，确认后用 `Command(resume=...)` 恢复。状态必须可序列化，大文本不放进状态：判决全文只存引用 ID，Evidence 只保存被引用的片段（每条不超过 1500 字）。

```python
from pydantic import BaseModel
from typing import Literal

class CaseMeta(BaseModel):
    contract_type: str | None = None
    parties: list[str] = []
    contract_date: str | None = None   # ISO 日期，合同订立日（前端必填）
    event_date: str | None = None      # 主要事实发生日（建议填写）
    choice_of_law: str | None = None
    cisg_excluded: bool | None = None  # None 表示未确认，触发 CISG 闸门
    both_merchants: bool | None = None

class Claim(BaseModel):
    cid: str                       # 'C1'
    party: str
    text_zh: str

class Fact(BaseModel):
    '''案情事实 F#：S1 摘录式抽取，必须是用户输入原文的片段，V10 据此回溯。'''
    fid: str                       # 'F1'
    text_zh: str
    span: tuple[int, int] | None = None   # 在 facts_zh 中的字符区间
    disputed: bool = False         # 各方主张对该事实不一致；由 S3 争点确认时人工确认

class Material(BaseModel):
    '''证据材料 M#：当事人提供的事实证据（合同、函件、检验报告等），不是外国法材料。'''
    mid: str                       # 'M1'
    name: str
    desc_zh: str
    excerpt_zh: str | None = None  # 用户粘贴的摘录文本（MVP 不支持上传文件解析）
    fact_ids: list[str] = []       # 该材料意图证明的事实

class Issue(BaseModel):
    issue_id: str
    kind: Literal['fact', 'law']   # 事实争点或法律争点
    text_zh: str
    claim_ids: list[str] = []
    element_ids: list[str] = []

class LegalQuestion(BaseModel):
    qid: str
    text_zh: str
    queries_de: list[str] = []
    template_id: str | None = None
    must_norms: list[str] = []
    status: Literal['draft', 'confirmed'] = 'draft'
    done: bool = False            # 已完成 S4–S7；追加问题时只处理 done=False 的问题

class Evidence(BaseModel):
    '''法源证据 E#：法条、判例，以及类似判例（role='similar'）。只存被引用的片段。'''
    eid: str                      # 'E1'
    kind: Literal['norm', 'case']
    role: Literal['law', 'similar'] = 'law'
    ref_id: str
    text_de: str                  # 被引用片段，每条不超过 1500 字
    source_url: str
    stand: str | None = None
    fetched_at: str
    grade: Literal['A', 'B', 'C', 'D'] = 'A'

class ElementEvidence(BaseModel):
    eid: str
    relation: Literal['supports', 'explains', 'cited_by'] = 'supports'

class ElementState(BaseModel):
    '''要件状态：status 是法源证据是否充分（S5）；match_status 是案情事实对照（S5b）。'''
    qid: str
    element_id: str                 # 来自要件模板，如 'e2'；无模板的问题记为 'q'
    name_zh: str
    status: Literal['covered', 'partial', 'missing'] = 'missing'
    links: list[ElementEvidence] = []
    scores: dict[str, float] = {}   # eid -> 重排得分
    gap_note: str | None = None     # 缺口说明，用于改写检索与 gaps
    rounds: int = 0                 # 已进行的改写检索轮数，上限 2
    fact_links: list[str] = []      # 候选关联的事实 F#（slot_hits 的并集）
    slot_hits: dict[str, list[str]] = {}   # 事实要素 id -> 事实 F# 列表
    material_links: list[str] = []  # 候选关联的证据材料 M#
    match_status: Literal['satisfied', 'partial', 'missing', 'disputed'] | None = None
    match_note: str | None = None

class Statement(BaseModel):
    sid: str
    text_zh: str
    type: Literal['quote', 'paraphrase', 'inference']
    evidence_ids: list[str]
    part: Literal['A', 'B'] = 'A'   # A 查明材料包，B 咨询准备包
    fact_ids: list[str] = []        # B 部分陈述引用的事实 F#
    material_ids: list[str] = []    # B 部分陈述引用的证据材料 M#
    element_id: str | None = None   # 陈述所属要件，Drafter 只能引用该要件已链接的证据与事实
    quote_de: str | None = None
    grade: Literal['A', 'B', 'C', 'D'] | None = None
    status: Literal['ok', 'fail', 'downgraded'] = 'ok'

class Finding(BaseModel):
    qid: str
    statements: list[Statement]
    gaps: list[str] = []          # 未能查明或资料不足的点（含 partial、missing、disputed 要件）

class CaseState(BaseModel):
    case_id: str
    snapshot_id: str              # 创建时固定的快照，恢复与追加问题沿用
    mode: Literal['full', 'lite', 'retrieval'] = 'full'   # 运行模式，见 7.5
    facts_zh: str                 # 用户输入的事实经过原文（已脱敏）
    claims_zh: str | None = None  # 用户输入的各方主张与抗辩原文（已脱敏）
    meta: CaseMeta = CaseMeta()
    flags: list[str] = []
    timepoint: dict = {}          # {'level': 'red' 或 'yellow', 'reasons': [...]}，见 4.7
    entry_checks: list[dict] = [] # 适用法律入口检查清单（S2 生成）
    facts: list[Fact] = []
    claims: list[Claim] = []
    materials: list[Material] = []
    issues: list[Issue] = []      # S3 提取，人工确认
    questions: list[LegalQuestion] = []
    elements: list[ElementState] = []   # S3 展开、S4–S5b 填充，见 5.5 与 5.7
    evidence: dict[str, Evidence] = {}
    translations: dict[str, str] = {}   # eid -> 中文译文，S6a 产出，经 V5 校验
    similar_cases: list[dict] = []      # F31 的结果；对应片段已登记在 evidence 中
    counsel_questions: list[str] = []   # F32：向专业人士提问清单
    findings: list[Finding] = []
    checks: list[dict] = []       # Critic 逐项结果：code（V1–V11）、status、qid、sid 或 eid、reason
    retry: dict[str, int] = {}    # 每个问题（qid）的回修次数，上限 2
    unparsed_refs: list[dict] = []  # 未解析引用，交人工核对
    dashboard: dict = {}          # 校验仪表盘的可核验计数
```

### 5.2 步骤说明

| 节点 | 角色 | 做什么 | 实现 | 人工节点 |
| --- | --- | --- | --- | --- |
| S0 录入 | — | 事实经过（必填）、各方主张与抗辩（选填）、证据材料清单（选填，可附粘贴摘录）、元数据表单（合同类型、合同订立日（必填）、事实发生日、法律选择条款、是否排除 CISG、是否均为商人）；提交前勾选同意声明（记录版本）；用户输入经 PII 脱敏后进入后续节点（7.4） | React 表单 → `POST /cases` | 填写、同意声明 |
| S1 要素、事实与主张抽取 | — | 从输入抽取 CaseMeta、案情事实 F#（摘录式，必须是原文片段并记录位置）、各方主张 C#，temperature 0，缺失项置空；关键要素缺失时由前端受限追问（最多 2 轮，见 5.6） | LLM 结构化输出，pydantic 校验，失败重试 2 次 | 补全缺失项 |
| S2 预检与风险标志 | — | 规则：货物买卖且营业地分处中德且未确认排除 CISG → CISG\_CHECK，流程在 CISG 闸门暂停，用户确认“已排除”才继续，否则只输出 CISG 提示与文本后结束；选法非德国法 → 终止并提示本 MVP 仅支持德国法；均为商人 → 触发 HGB § 377；用模板核心条文调用 `timepoint_level`（4.7）得到红或黄，写入 `state.timepoint`（S7 的 V6 会用实际证据重算）；生成“适用法律入口检查”清单写入 `entry_checks`（5.7） | 纯 Python 规则、时点警示表、LangGraph interrupt | 确认标志；CISG 闸门 |
| S3 争点提取与要件展开 | — | 按触发词匹配要件模板（取前 3）；LLM 结合案情与各方主张提取争点，区分事实争点与法律争点，只列分歧、不判断谁有理；转为待查明问题（≤6）并按模板展开要件（无模板的问题记为单要件 `q`），写入 `issues`、`elements`；生成 2–3 条德语检索式（含复合词、拆分与拼写变体，注入术语库） | LLM＋模板＋术语库 | **必须人工确认**（interrupt），可增删改争点、问题与要件，并确认哪些事实“有争议”；导出《查明需求单》 |
| S4–S5 Researcher（检索专员） | 只负责把中文案情转为德语查询、召回法条与判例、判断各要件证据是否充分并补检索、整理证据包，不做法律推理 | 对每个要件：先确定性取模板核心条文原文；再跑受限检索（含图扩展）并把证据关联到要件；S5 判定 covered、partial、missing（规则优先，LLM 只复核 partial，且须已有证据）；不足则用缺口说明加术语库改写检索，最多 2 轮，无新增证据即停；最后去重、截断、编号 E1…，记录 Stand、来源 URL、抓取时间，写入 `elements` | 5.3 的工具、5.5 的充分性循环 | S8 可见各要件状态 |
| S5b Matcher（事实匹配） | 只做对照，不做适用结论 | 对 `match_facts` 为真的要件：LLM 提出候选关联（事实要素 slot→事实 F#、事实→证据材料 M#），规则确定四态（见 5.7，事实要素须全部命中，无要素清单的要件最多判 partial）；生成证据链、缺口与冲突清单；调用 `similar_cases`，把类似判例片段登记为 Evidence（role=similar）；生成向专业人士的提问清单 | 5.7 的规则、`similar_cases` 工具 | S8 可见匹配状态与证据链 |
| S6a Translator（翻译） | 只做忠实翻译，不加分析 | 对证据包（含类似判例片段）中的法条与判例摘录批量翻译（每批 ≤8 段）：术语库命中项强制用标准译法，`zh_forbidden` 译法禁用，首次出现的概念括注德语；缓存键为 norm\_id＋文本哈希；标注“机器翻译，非官方译文” | `translate` 工具、LLM、术语库 | — |
| S6b Drafter（起草专员） | 按要件起草，只基于德语原文、已校验译文与用户提供的事实，只能引用证据与事实 ID | 每个问题一次生成，输入问题、要件—证据—事实结构、译文、术语命中、flags；A 部分（查明材料包）陈述带 `element_id`；B 部分（咨询准备包）陈述同时引用法源 E# 与事实 F#（需要时附材料 M#），事实一律原样引用 F# 文本；missing 与 disputed 的要件不得编造，只写 gaps；不得输出裁判预测、概率或倾向性结论；法律概念必须用术语库译法并附德语原文；输出 Finding JSON | LLM 结构化输出 | — |
| S7 Critic（质检） | 核对翻译、引用、推断、充分性、事实与证据链，不通过则按问题打回 | 先确定性校验（V1–V3、V5–V11；V7 复核 S5 状态，V10 复核事实溯源与实体，V11 复核证据链与事实要素），再用异厂商 LLM 做 V4；写入带 `qid` 的 checks 与 dashboard；回修不重新触发检索 | LangGraph 条件边，见下方回修规则 | — |
| S8 人工复核 | — | 逐条采纳、修改、拒绝，批注；可发起专家会商；可见每个要件的状态、匹配状态与证据链；每次操作与错误类型标签写入 feedback 表（4.2） | React 审阅页，interrupt | **必须人工** |
| S9 导出 | — | 生成 A、B 两部分的 docx、md、json，写入 `report_versions`（版本号、内容哈希、快照 ID）；页脚固定“AI 辅助生成，须经人工与专家复核；不预测裁判结果”，并印版本号、哈希与快照 ID | python-docx、jinja2、hashlib | — |

**回修规则**：Critic 先跑确定性校验（V1–V3、V5–V11），再用异厂商模型做 V4。每条失败记录都带所属问题 `qid`，回修按问题判断：只有 `retry[qid]` 小于 2 的失败项才会被打回；已用尽的问题不影响其他问题继续回修，其失败陈述在 critic 内降为 D 级或写入 gaps。路由：V5（译文术语）→ Translator；V10、V11（事实溯源、证据链）→ Matcher；其他 → Drafter，只重写失败的陈述，不整篇重写。同一轮有多种失败时，按 Translator → Matcher → Drafter 的顺序重做，再回到 Critic。

**角色分离靠契约，不靠提示词**：Researcher 只产出证据包；Drafter 只能引用证据包中的 ID；Critic 的结论以确定性检查为主，LLM 判断为辅。提示词里写“绝不允许编造”只是辅助，防幻觉主要靠结构化输出加校验。

**效果用实验证明**：对比有无 Critic 时被拦截的错误数、最终幻觉引用数、时延与 token 成本（见 8.3），不预设“幻觉率大幅下降”之类的结论。

### 5.3 检索 Agent 约束与工具

- 每个要件每轮最多 4 步（改写检索最多 2 轮，见 5.5）；工具白名单；每步 LLM 只输出 JSON：`{brief, action, args}`，`brief` ≤50 字，便于审计。
- 终止条件：`finish`、步数用尽或证据达到 12 条；已取过的条目不重复返回。
- 失败回退：JSON 解析连续失败 2 次，回退为“纯混合检索 top 8”，不影响出结果。
- 用 JSON-action 协议而不依赖原生 function calling，换模型不用改流程；原生 tool calling 作为优化项。

| 工具 | 说明 | 实现 |
| --- | --- | --- |
| `norm_lookup(law, enbez)` | 按条号取法条原文 | SQL（快照库） |
| `search_norms(query, law?, k)` | 法条混合检索 | 4.4 流程 |
| `search_cases(query, court?, date_from?, k)` | 判例混合检索，支持元数据过滤 | 4.4 流程 |
| `similar_cases(fact_ids, norm_ids, k)` | 以用户事实摘要检索判决的事实部分（Tatbestand），限定在适用相关法条的判例范围内；返回的片段登记为 Evidence（role=similar） | 向量检索＋APPLIES 边（5.7） |
| `cites_of(norm_id, k)` | 适用该法条的判例，按日期倒序 | SQL 查 edges（APPLIES） |
| `expand_graph(node_ids, max_hops)` | 沿 CITES、APPLIES、DEFINES 扩展，只用 rule 与 expert 边 | GraphStore（4.6） |
| `get_case(case_id)` | 判决全文 | SQL |
| `glossary_hits(text)` | 命中的术语 | 子串匹配 |
| `translate(text_de, hits)` | 术语约束翻译，支持批量 | LLM |

提示词原则：角色为“查明助手”，不是法官或律师；只能使用证据包内容；不输出裁判结论或胜诉可能；引用格式 `[E#]`；证据不足写入 `gaps`；严格输出 JSON schema；temperature 0–0.2；提示词放 `prompts/*.md` 并记录 `prompt_hash`。

### 5.4 材料包结构（对齐解释（二）第三条）

| 解释（二）要求 | 报告字段 | 数据来源 |
| --- | --- | --- |
| 具体规定 | 法条与判例原文（德语）＋中文译文 | norms.text\_de、cases 全文 |
| 获得途径 | 来源网站、URL、抓取时间、数据快照 ID | source\_url、fetched\_at、snapshot\_id |
| 效力情况 | Stand 标注、是否有未纳入的修订、法院审级与裁判日期、时点提示 | stand、has\_pending\_amend、flags |
| 与争议的关联性 | 要件—证据对应表 | S4–S5 确定性生成链接与状态，S6b 生成关联性说明，S8 人工确认 |
| 判例全文 | 本地归档全文＋原站链接 | cases |
| 专家资质与无利害关系声明（第四条） | 专家表字段，引入专家时附上 | experts |
| 裁判文书“查明过程”（第十条） | 段落草稿，按模板拼接，不让模型自由发挥 | 报告内容 |

### 5.5 证据充分性判断与改写检索（S5）

**目的**：在起草之前，按要件判断证据是否充分，不足则补检索，让缺口在检索阶段暴露，而不是等到起草后才在 V7 发现。S5 属于 Researcher 节点内部，不是独立的 Agent。

**判定规则（确定性优先）**：

| 状态 | 判定条件 | 后续 |
| --- | --- | --- |
| covered | 模板核心条文全部在证据中；若 `need_cases` > 0 则判例数达标；关联证据的最高重排得分 ≥ τ | 进入起草 |
| partial | 核心条文齐全，但判例不足或相关度偏低 | 调用一次 LLM 复核；仍不足则改写检索 |
| missing | 缺核心条文，或没有任何证据 | 不调用 LLM，直接改写检索；轮数用尽则写入 gaps |

τ 在 E1 开发集上标定，初始取 0.5 仅作占位。无模板的单要件没有核心条文，只靠相关度阈值与 LLM 复核。

**LLM 复核的约束**：只对 partial 调用，输出 `{sufficient: bool, missing_points: [...]}`；代码守卫：没有任何关联证据时，LLM 不得把状态改为 covered。LLM 倾向于过度肯定，所以它只能在已有证据的前提下把 partial 升为 covered，不能凭空补足。

**改写检索**：把要件名、缺口说明和术语库命中项交给 LLM，生成 2–3 条新的德语检索式（含复合词、拆分与拼写变体），再调用 `search_norms`、`search_cases`、`cites_of`、`expand_graph`。新证据去重后关联到该要件。停止条件：状态变为 covered；已改写 2 轮；或本轮没有新增证据。

**与 Critic 的关系**：S5 在起草前补证据；Critic 的回修只作用于翻译与起草，不再触发新的检索，避免两层循环叠加。V7 在 Critic 中独立复核 S5 的结论，两者不是同一个判断。

**成本控制**：确定性规则先拦掉大多数要件；每个 partial 要件至多 1 次 LLM 复核加 2 轮检索；不同要件之间可并行（用 `asyncio.to_thread` 包裹 CPU 密集调用）；P95 时延用 E6 监控。

```python
MAX_ROUNDS = 2

def assess_element(template_el, linked, scores, tau=0.5):
    '''确定性判定。linked：已关联证据；scores：ref_id -> 重排得分。返回 (status, gap_note)。'''
    refs = {e.ref_id for e in linked}
    core = set(template_el.get('core_norms', []))
    if core and not core <= refs:
        return 'missing', '缺核心法条：' + '、'.join(sorted(core - refs))
    if not linked:
        return 'missing', '无任何证据'
    need = template_el.get('need_cases', 0)
    n_cases = sum(1 for e in linked if e.kind == 'case')
    best = max((scores.get(e.ref_id, 0.0) for e in linked), default=0.0)
    if n_cases < need:
        return 'partial', '缺判例支撑（需要 ' + str(need) + ' 件）'
    if best < tau:
        return 'partial', '证据相关度偏低'
    return 'covered', ''

def retrieve_for_element(q, el, template_el, llm, tools, linked, scores):
    for rnd in range(MAX_ROUNDS + 1):
        status, gap = assess_element(template_el, linked, scores)
        if status == 'partial':
            verdict = llm.json(system=load_prompt('sufficiency'), user=pack(el, gap, linked))
            if verdict.get('sufficient') and linked:       # 无证据时不得升为 covered
                status, gap = 'covered', ''
            else:
                gap = '；'.join(verdict.get('missing_points', [])) or gap
        el.status, el.gap_note, el.rounds = status, gap, rnd
        if status == 'covered' or rnd == MAX_ROUNDS:
            break
        new = search_with_reformulation(q, el, gap, llm, tools)   # 缺口说明＋术语库 → 新德语检索式 → 检索
        new = [e for e in new if e.ref_id not in {x.ref_id for x in linked}]
        if not new:                                               # 没有新增证据，停止
            break
        linked += new
    return el
```

### 5.6 受限多轮交互（F27）

只支持下表三种场景，不做开放式聊天：开放对话会扩大幻觉面，也与 V8 范围守卫冲突。

| 场景 | 做法 | 限制 |
| --- | --- | --- |
| S1 缺失要素追问 | `POST /cases` 时同步返回缺失字段与追问文本（如合同订立日），前端展示并让用户补填；不进入 LangGraph | 最多 2 轮，之后由人工在表单中补填 |
| 报告后追加待查明问题 | 审阅页点“追加问题”→ `POST /cases/{id}/followup` → 新问题以 `done=False` 追加到 `state.questions`，回到 S3 的人工确认，再只对 `done=False` 的问题重跑 S4–S7，并沿用案件创建时固定的快照 | 已确认条目与已采纳的复核结果不变；单个案件追加问题设上限（如 5 个） |
| 公共端检索问答追问 | 限库内检索：走 `search` 加带引用的简答，经 V1–V3、V8 校验；保留最近 5 轮上下文，不保存个案事实 | 含具体当事人、具体纠纷的提问不在问答中分析，引导进入“咨询准备”流程（简版，见 5.7） |

追加问题的 LangGraph 做法：

```python
config = {'configurable': {'thread_id': case_id}}
state = graph.get_state(config).values
new_q = LegalQuestion(qid=next_qid(state), text_zh=text, done=False)
graph.update_state(config, {'questions': state['questions'] + [new_q]}, as_node='s3_decompose')
graph.invoke(None, config)     # 下一个节点是 s3_gate：interrupt，等待人工确认新问题
```

`researcher`、`translator`、`drafter`、`critic` 只处理 `done=False` 的问题；critic 通过后将其置为 `done=True`。LangGraph 的 `update_state` 用法以所锁定版本的官方文档为准，并为该流程写测试。

### 5.7 争点分析、要件—事实匹配与证据链（F29–F32）

**定位**：前置咨询工具，帮助用户为专业咨询做准备：看清争点、德国法下的要件、事实与证据的缺口、类似判例及其分歧，并带着具体问题去咨询。只输出条件与依据，不输出结果判断。依据：最高院意见第 5 条（辅助定位，AI 辅助结果仅供参考）与第 6 条（透明可信，须说明功能与局限）；该意见同时支持类案推送、诉讼预期辅助评估等应用；全球通行做法是律师端平台做研究与论证分析但不向终端用户输出概率，预测类产品受管制，面向消费者的“AI 律师”受虚假宣传约束。

**输出分级**：

| 层级 | 内容 | 是否做 |
| --- | --- | --- |
| 一 事实性 | 法条原文、判例、来源、效力与时点 | 做（F01–F28） |
| 二 分析性 | 争点、要件—事实对照、证据链与缺口、类案相似与差异、观点分歧、风险提示，每条带法源与事实出处并标注不确定性 | 做（F29–F32） |
| 三 评估性 | 胜诉概率、赔偿额预测、倾向性结论、证据采信结论 | **不做** |

**允许与不允许**：

| 允许（有出处） | 不允许 |
| --- | --- |
| “该要件在德国法下通常要求……；现有事实 F1、F2 支持，缺 F3” | “你很可能胜诉或败诉”、任何概率、金额区间 |
| “判例 X 与本案相似点是……，差异是……；该判例对此问题采……观点，判例 Y 采不同观点” | “法院会按判例 X 判决本案” |
| “此点存在分歧，结果取决于……事实” | 倾向性结论（如“应当支持”） |
| “建议向专业人士确认：……” | “无需咨询律师”“该证据足以证明” |

**输入与对象模型**：用户输入事实经过（必填）、各方主张与抗辩（选填，建议提供）、证据材料清单（选填）。证据材料在 MVP 为清单模式：名称、描述，可附用户粘贴的摘录文本（`excerpt_zh`），不支持上传文件解析（列为后续优化）。系统内有四类可追溯对象：F# 案情事实，S1 摘录式抽取，必须是用户输入原文的片段并记录位置，不得改写或补充；C# 各方主张；M# 当事人提供的事实证据（合同、函件、检验报告等），区别于 6.4 核验的“外国法材料”；E# 法源证据，包括法条、判例，以及类似判例（`role=similar`）。所有送往 LLM 的用户文本先经 PII 脱敏（7.4）。

**争点提取（F29，S3）**：把各方主张之间的分歧提取为争点，区分事实争点（对事实经过有分歧）与法律争点（对规范适用有分歧）；法律争点对应要件；争点清单由人工在 S3 确认。系统只列争点与分歧，不判断哪一方有理。

**要件—事实匹配（F30，S5b Matcher）**：LLM 只提出候选关联（要件—事实 F#，事实—材料 M#）；状态由规则确定，LLM 不判状态：

| 状态 | 页面文案 | 判定（确定性） |
| --- | --- | --- |
| satisfied | 条件具备：要件所需的事实要素均有对应事实 | 要件模板定义的每个事实要素（`fact_slots`）都有关联事实 F#，且相关事实无争议；若要件需要证据材料（`need_materials`），则有关联材料 M# |
| partial | 部分具备：缺少事实要素或证据材料 | 有关联事实，但缺少某个事实要素（页面列出缺哪几个），或要件需要材料而没有 M#。**没有事实要素清单的要件（含无模板的单要件 q）最多判 partial，注明“无事实要素清单，须专业人士确认”** |
| missing | 案情未提供 | 没有与该要件对应的事实 F# |
| disputed | 双方有争议 | 关联事实被标为有争议（S3 争点确认时由人工确认标记） |

页面固定说明：“条件具备不等于请求会被支持；本工具不预测裁判结果”。

```python
import re

def decide_match(el, facts_by_id, template_el):
    linked = [facts_by_id[f] for f in el.fact_links if f in facts_by_id]
    if not linked:
        return 'missing', '案情未提供与该要件对应的事实'
    if any(f.disputed for f in linked):
        return 'disputed', '各方对相关事实有争议'
    slots = template_el.get('fact_slots', [])
    if not slots:          # 没有事实要素清单：无法确认条件是否具备，最多 partial
        return 'partial', '无事实要素清单，须专业人士确认'
    missing = [s['name_zh'] for s in slots if not el.slot_hits.get(s['id'])]
    if missing:
        return 'partial', '缺少事实要素：' + '、'.join(missing)
    if template_el.get('need_materials') and not el.material_links:
        return 'partial', '有事实，缺少证据材料'
    return 'satisfied', ''

def check_fact_trace(fact, source_text):
    '''V10：事实必须是用户输入原文的片段，位置可回溯。'''
    if not fact.span:
        return False
    s, e = fact.span
    return 0 <= s < e <= len(source_text) and norm_ws(fact.text_zh) in norm_ws(source_text[s:e])

RE_ENTITY = re.compile(r'\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{2}-\d{2}|\d[\d,\.]*\s*(?:元|万元|欧元|美元|%|日|天|个月|年)')

def check_entities(statement_text, cited_fact_texts, party_names):
    '''V10 的确定性部分：陈述中的日期、金额、期限和当事人名称必须出现在所引事实的文本中。'''
    src = norm_ws(' '.join(cited_fact_texts))
    bad = [m.group(0) for m in RE_ENTITY.finditer(statement_text) if norm_ws(m.group(0)) not in src]
    bad += [p for p in party_names if p in statement_text and p not in ' '.join(cited_fact_texts)]
    return bad             # 非空即失败；当事人名称检查的误报率须在 E9 上校准
```

**证据链**：链条为“要件 ← 事实 F# ← 证据材料 M#”。缺口：要件没有事实；要件需要材料而事实没有材料。冲突：两份材料互相矛盾（由 LLM 提出，人工确认）。不评价证明力，不做采信结论。域外证据的形式要求（如公证认证等）作为风险提示，由法学团队维护规则库，MVP 仅提示。

**类案相似与差异（F31）**：

1. `similar_cases`：以用户事实摘要（F# 拼接）检索判决的事实部分（Tatbestand）块，限定在适用相关法条的判例范围内（4.6 的 APPLIES 边），取 top 5。
2. 对每个候选判例，先把相关片段登记为 Evidence（`kind='case'`、`role='similar'`），再进入翻译与校验；LLM 生成相似点与差异点，必须引用已登记的判决原文片段，经 V2 逐字核对；摘出判例对该法律问题的观点（逐字引文，1–2 句）。
3. 观点分歧：LLM 阅读候选判例的 Leitsatz，判断“观点一致、存在不同观点、无法判断”，并列出对应判例，经 V4 核验。
4. 不输出“本案会如何判”。公共端简化为只列判例、案号和对法律问题的观点引文，不做逐案相似与差异分析。

**咨询准备包（F32，B 部分）**：

| 部分 | 内容 | 来源 |
| --- | --- | --- |
| B1 争点清单 | 事实争点与法律争点，对应要件 | S3 |
| B2 要件—事实对照 | 四态状态、缺少的事实要素与缺口说明；事实原样引用 | Matcher |
| B3 证据链与缺口 | 要件←事实←材料，缺口与冲突 | Matcher |
| B4 类似判例 | 相似点、差异点、观点与分歧 | `similar_cases` |
| B5 风险提示 | 适用法律入口检查、时点红黄、CISG、比较法差异、证据形式 | S2、V6、V9 |
| B6 向专业人士提问清单 | 见下 | 汇总 |

**适用法律入口检查**（S2 生成，B5 展示）：清单式列出影响“是否适用德国法”的事实与规则状态：是否有法律选择条款、双方营业地所在国、是否可能适用 CISG（以及是否已排除）、合同类型；每项标“已满足、未满足、无法确定”。它只是入口提示，不做冲突规范的完整推理，也不判断选法条款是否有效，这些由专业人士确认。

提问清单由缺口、分歧和风险点汇总生成：missing、partial、disputed 要件 →“请确认是否需要补充……”；判例观点分歧或 approximate 概念 →“德国法下该问题存在不同观点，请确认……”；时点红黄、CISG →“请确认适用的法律版本与是否适用 CISG”；入口检查中未满足或无法确定的项 →“请确认本案是否应适用德国法”。先用模板句，LLM 只做润色，润色结果仍受 V8 与 V4 约束。

**角色分级**：

| 内容 | 公共端 | 司法端 | 实务端 |
| --- | --- | --- | --- |
| A 部分：查明材料包 | 简版（法条原文、译文与来源，不含个案分析） | 完整 | 完整 |
| B1 争点清单 | 有 | 有 | 有 |
| B2、B3 要件—事实对照、证据链与缺口 | 有（简版，强提示） | 有 | 有 |
| B4 类似判例 | 仅列判例及对法律问题的观点 | 完整 | 完整 |
| B5、B6 风险提示、提问清单 | 有 | 有 | 有 |
| 适用结论、倾向、概率 | 无 | 无 | 无 |

司法端只做争点、要件、证据链和类案梳理，不做适用结论，页面标注“辅助参考，不替代裁判”。公共端的咨询准备走表单流程，不走自由问答，并提示不要填写当事人身份信息。

**校验与等级**：V10 事实溯源（含实体确定性核对）、V11 证据链一致性（含事实要素）、V8 范围守卫见 6.2。B2、B3 中的事实一律原样引用 F# 文本，LLM 只负责对照关系的说明，不改写事实。B 部分陈述的等级：同时被法源证据（A 或 B 级）与事实 F# 支持且 V4 为 supported → B；V4 为 partial → C；无事实支持的推断 → D；不设 A 级（A 级仅用于官方原文的逐字引用）。

**成本控制**：Matcher 对每个要件一次 LLM 调用提出候选关联，要件数由问题数上限（≤6）约束；不同要件之间可并行；`similar_cases` 只对 top 5 判例调用 LLM；时延由 E6 监控。

## 6. 校验与可信度

### 6.1 引用解析与引文核对

```python
import re
from typing import Protocol
from rapidfuzz import fuzz

class CitationExtractor(Protocol):
    def candidates(self, text: str) -> list[dict]:
        '''在全文中找候选引用：[{kind: 'norm' 或 'case', raw: 原文片段, span: (起, 止)}]'''

class RefexExtractor:       # 适配 legal-reference-extraction（refex），按所装版本的实际 API 实现
    def candidates(self, text): ...

class LooseRegexExtractor:  # 宽松正则：§ 与案号候选，兜底，也是对照基线
    def candidates(self, text): ...

class NormNormalizer(Protocol):
    def normalize(self, raw: str) -> list[dict]:
        '''把一个法条引用字符串规范化为若干条可独立查库的引用：
        [{id: 'BGB:§433', depth: 'absatz', absatz: '1', open_ended: False}]'''

class BundesrechtNormalizer:  # 适配 bundesrecht：i.V.m.、§§ 范围、f.、Abs./Satz/Nr./Buchst.
    def normalize(self, raw): ...   # ff. 保持原样（open_ended=True），不展开成具体条文

RE_LOOSE_NORM = re.compile(r'§§?\s*\d+[a-z]?')
RE_LOOSE_AZ = re.compile(r'\b[IVX]{1,5}[a-z]?\s+[A-Z][A-Za-z]{1,3}\s+\d{1,4}/\d{2}\b')

def parse_citations(text, extractor, normalizer):
    out = []
    for c in extractor.candidates(text):
        base = {'span': c['span'], 'raw': c['raw'], 'kind': c['kind']}
        if c['kind'] == 'norm':
            refs = normalizer.normalize(c['raw'])
            out += [{**base, **r} for r in refs] or [{**base, 'id': None}]   # id 为空 = 未解析
        else:
            out.append({**base, 'id': c['raw'].strip()})                  # 案号
    return out

def find_unparsed(text, parsed):
    '''安全失败：凡出现 § 或疑似案号、却没被覆盖的片段，一律交人工。'''
    covered = [p['span'] for p in parsed if p['id'] is not None]
    out = []
    for rx in (RE_LOOSE_NORM, RE_LOOSE_AZ):
        for m in rx.finditer(text):
            if not any(s <= m.start() < e for s, e in covered):
                out.append({'raw': m.group(0), 'span': m.span()})
    return out

def check_citations(text, extractor, normalizer, db_has):
    parsed = parse_citations(text, extractor, normalizer)
    ok = [p for p in parsed if p['id'] is not None]
    return {
        'resolved': [p for p in ok if db_has(p['id'])],        # open_ended 的引用只核对起始条
        'not_in_db': [p for p in ok if not db_has(p['id'])],   # 库外引用，未核验
        'unparsed': [p for p in parsed if p['id'] is None] + find_unparsed(text, parsed),
    }

def norm_ws(s):
    return re.sub(r'\s+', ' ', s).strip().lower()

def quote_check(quote, evidence_text):
    q, e = norm_ws(quote), norm_ws(evidence_text)
    if q in e:
        return 'exact'
    return 'near' if fuzz.partial_ratio(q, e) >= 98 else 'fail'
```

**两层结构与选型**：候选抽取与规范化解析分开。抽取层用 refex（法条与案号都能找）或宽松正则；规范化层首选 bundesrecht，它从已识别的引用字符串出发，处理 `i.V.m.`、`§§` 范围、`f.`、`Abs.`/`Satz`/`Nr.`/`Buchst.` 层级，可精确到 Absatz 与 Nummer。bundesrecht 只管法条，不处理案号，案号仍由 refex 或自写规则处理。据其论文，在 2,944 条人工标注引用上字段级严格匹配均在 98.6% 以上，但 resolver 未评测，标注也来自德国法院判决的写法，因此仍用 E7 实测，并与旧版正则对比。`f.` 展开为本条与下一条；`ff.` 保持不变（后续条数不确定），我们也不把它展开成具体条文，V3 只核对起始条存在。spaCy 通用德语 NER 识别人名、地名、机构名，不识别法条，不采用。各库 API 以所装版本为准，先写适配层测试再接入。

**安全失败**：任何含 `§` 或疑似案号、但没被解析的片段，一律标“未解析引用，需人工核对”，因此校验的安全性不依赖抽取召回；漏抽只会降低边表覆盖度，不会放过幻觉引用。LLM 只做兜底：对未解析片段做规范化，结果仍须经 `db_has` 查库验证。

### 6.2 校验清单

| 编号 | 校验 | 方式 | 失败处理 |
| --- | --- | --- | --- |
| V1 | 引用的证据 ID 均存在 | 确定性 | 删除该条并回修 |
| V2 | 逐字引文与证据原文一致 | `quote_check`：exact 通过，near 标黄，fail 标红 | 标红并回修 |
| V3 | 文中提到的法条、案号是否真实存在且在证据包内 | 引用解析器抽取＋SQL，`find_unparsed` 兜底；`ff.` 只核对起始条 | 不在库：标“库外引用，未核验”；在库但不在证据包：标“未被证据支持”；未解析片段：标“未解析引用，需人工核对” |
| V4 | 转述和推断是否被证据支持，是否引入证据外的法律概念或用户未提供的事实 | Critic 中异厂商 LLM 逐句判 supported / partial / unsupported | unsupported 回修（该问题 ≤2 次），仍不通过则剔除或降为 D 级 |
| V5 | 译文术语一致 | 术语库 de 词出现则 zh 词必须出现；`zh_forbidden` 译法不得出现 | 标黄；严重时交回 S6a 重译 |
| V6 | 时效与时点 | `has_pending_amend`、抓取日期；用合同订立日、事实发生日和实际证据法条调用 `timepoint_level`（4.7） | 输出红或黄提示块，不设绿；红色须专家确认适用版本 |
| V7 | 完整性与充分性复核 | 复核 S5 的要件状态：covered 的要件须有被陈述引用的证据；partial 与 missing 的要件须出现在 gaps；must\_norms 均已被引用 | 不一致则交回 Drafter 补写或写入 gaps；不重新触发检索 |
| V8 | 范围守卫 | 关键词＋LLM 扫描裁判预测、胜诉概率、倾向性结论和证据采信结论（如“法院将会判决”“胜诉可能”“应当支持”“该证据足以证明”）；对诱导提问（如“我能赢吗”）改为固定说明并引导咨询专业人士 | 删除或改写，所有角色强制开启 |
| V9 | 概念溯源（比较法污染） | 陈述中出现的“中国法特有术语”（先做约 100 个，由术语库反向生成）必须映射到本陈述所引证据中的德语术语，且 relation 为 equivalent，或 approximate 并带加注；`relation=none` 的概念不得出现 | 标“疑似引入中国法概念”，交回 S6b 重写，超限降 D 级 |
| V10 | 事实溯源与实体 | 事实 F# 必须是用户输入原文的片段且位置可回溯（`check_fact_trace`）；陈述中的日期、金额、期限、当事人名称必须出现在所引事实的文本中（`check_entities`）；不得出现用户未提供的事实，缺失的事实标“未提供”；V4 另判是否添加事实 | 交回 Matcher 或 Drafter 重做，超限降为 D 级 |
| V11 | 证据链与事实要素一致性 | satisfied 必须每个事实要素都有 F#（要件需要材料的还须有 M#）；无事实要素清单的要件不得为 satisfied；missing 不得带 F#；disputed 的事实必须标 disputed；引用的 M# 必须存在于用户清单 | 交回 Matcher，超限写入 gaps |

### 6.3 可信度分级（按来源与校验结果，不用模型自评）

| 等级 | 条件 |
| --- | --- |
| A | 官方现行法源原文，逐字引用，V1–V3 通过 |
| B | 官方来源的转述或翻译，V4 为 supported 且 V5 通过 |
| C | V4 为 partial，或来源为手工录入、二手材料；需重点复核 |
| D | 无直接证据支持的模型推断；默认折叠并标红，只作线索，不进入“查明结论” |

报告只展示各等级条数与逐条标签，不给单一“置信度百分比”。

### 6.4 当事人材料核验（F16）

1. 文本抽取：粘贴文本，或用 python-docx、PyMuPDF 读取 docx、PDF（扫描件 MVP 不处理）。
2. 引用解析：用 6.1 的引用解析器抽取全部法条与案号引用，未解析片段单列；再用 LLM 抽取“引述句—被引依据”配对。
3. 逐项核验：存在性（查库）；现行性（`has_pending_amend`、Stand）；引述与库内原文是否一致（向量相似度初筛，LLM 判一致、不一致、无法判断）；判例是否给出法院、日期、案号，是否附全文（解释（二）第三条要求判例全文）。
4. 输出核验表：引用｜库内匹配｜结果（一致、不一致、库外未核验）｜原文片段｜备注。库外不等于错误，必须标“MVP 库内未能核验”。

### 6.5 校验仪表盘（F25）

报告页展示的质量信息全部来自可核验的计数，每个数字都能点开看到对应的语句与证据：

| 指标 | 展示形式 | 来源 |
| --- | --- | --- |
| 引文逐字一致 | 如 18/18 | V2 |
| 法条与案号存在 | 全部存在，或 N 项库外 | V3 |
| 有证据支持的陈述 | 如 22/25 | V4 |
| 要件覆盖状态（法源） | covered N、partial N、missing N，点开可看缺口说明 | S5、V7 |
| 要件—事实对照 | satisfied N、partial N、missing N、disputed N，点开可看关联事实、缺少的事实要素与材料 | Matcher、V11 |
| 事实溯源 | 可回溯到用户输入原文的事实 N/N；实体核对通过 N/N | V10 |
| 未解析引用 | N 处，逐处列出 | V3 |
| 疑似引入中国法概念 | N 处，逐处列出 | V9 |
| 可信度分级 | A、B、C、D 各 N 条 | 6.3、5.7 |
| 时点与 CISG 提示 | 时点红或黄（列出对应修订）、CISG 提示 | V6、S2 |
| 运行模式与快照 | 完整、精简或检索模式；所用快照 ID；报告版本与哈希 | case\_registry、report\_versions |

可以画成条形图或雷达图，但每个轴必须是上述计数的比例，并标注分子分母。不向用户展示 Faithfulness、Context Precision、Answer Relevance 这类 LLM 打出的抽象分数：它们未经校准，用户容易误读为可靠性保证，也与 6.3“不给单一置信度”的原则冲突。LLM-judge 评分（含 Ragas）只在内部离线或异步运行，写入 events 表或 Langfuse 用于趋势和回归监控，使用前须按 8.5 校准。

## 7. 三角色、专家流转与合规

### 7.1 三角色功能开关

同一应用、三套前端路由，用 `configs/roles.yaml` 控制功能开关。MVP 不做账号体系，但角色不靠前端自报：请求头 `Authorization: Bearer <令牌>`，令牌绑定角色与所属主体（`configs/tokens.yaml` 只存哈希），后端校验角色与案件归属，越权返回 403 或 404。公共端令牌随前端分发、不视为机密，只能调用公共端接口，靠限流和预算保护（见 7.4）。

| 功能 | 公共服务端 | 司法辅助端 | 实务端 |
| --- | --- | --- | --- |
| 德国法条与判例检索（原文＋译文＋来源） | 有 | 有 | 有 |
| 基于检索结果的问答 | 有（仅限库内检索；个案问题引导进入“咨询准备”） | 有 | 有 |
| 查明事项拆解与需求单 | 无 | 有 | 有 |
| A 部分：查明材料包 | 简版（法条原文、译文与来源，不含个案分析） | 完整 | 完整 |
| B 部分：咨询准备包（争点、要件—事实对照、证据链、类案、提问清单） | 简版（类案只列观点，强提示） | 梳理版（不含适用结论，标注“辅助参考，不替代裁判”） | 完整 |
| 当事人提供的外国法材料核验 | 无 | 有 | 有 |
| 已认定外国法案例检索（原型） | 无 | 有 | 有 |
| 专家会商 | 仅生成“查明委托单”，不出结论 | 有 | 有 |
| 导出 | 检索结果、咨询准备简版 | docx、json | docx、json、多案件项目空间 |

所有角色均开启 V8 范围守卫，不输出裁判预测、胜诉概率、倾向性结论和证据采信结论；公共端的自由问答对含具体当事人、具体纠纷的提问不做分析，引导进入“咨询准备”流程（简版，见 5.7）。案件数据按角色与案件分目录存放，不进入通用知识库，也不用于任何模型训练。

**反馈与抽检**：公共端只提供点赞、点踩和问题报告，不收集个人信息；司法端、实务端可提交带错误类型的结构化反馈（4.2 的 feedback 表）。公共端与实务端的生成结果按 5% 抽样交专家复核（`action=audit`），见 8.8。

### 7.2 专家会商流转（F17）

- 状态机：草稿 → 已发出 → 已回复 → 已采纳 / 退回。
- 每次会商记录：专家资质与语种、无利害关系声明（勾选＋日期，对应解释（二）第四条）、问题快照（S3 确认版）、证据包链接、回复全文、批注。
- 专家回复作为独立类型“专家意见”入库展示，不与官方法源混级。
- MVP 不对接外部通信：导出会商包（docx）供线下发送，回复手工粘贴回系统。

### 7.3 MVP 层面的合规做法

- 页面顶部与导出页脚固定标注“AI 辅助生成，须经人工与专家复核”；机器翻译统一标“非官方译文”。
- 咨询准备包（B 部分）页首固定说明：不构成法律意见，不预测裁判结果，“条件具备”不等于请求会被支持，请咨询专业人士；公共端提示不要填写当事人身份信息。
- 每个功能标明适用范围与局限（对应最高院意见“透明可信”原则对说明功能、性能与局限的要求）；对外宣传与页面用语不得宣称等同或替代律师、法官，须有证据支撑，并由法学团队审阅。
- MVP 只使用公开法源与法学团队自编或脱敏案例；用户输入经 PII 脱敏后才可发往大模型 API（见 7.4）；MVP 不处理真实案件材料。
- 面向公众提供法律咨询类服务在大陆的定位与备案要求，由法学团队与属地网信、司法行政部门确认；备案或登记、内容安全审核、等保属于试点上线前的工作，不在 MVP 范围内，但目录与日志设计应预留。

### 7.4 安全与隐私（F33）

- **鉴权与归属**：Bearer 令牌（哈希存储）、角色、所属主体；案件 ID 用 UUID；所有案件接口校验归属，非本人案件返回 404（不暴露案件是否存在）；`/internal/*` 只绑定本机。
- **限流与预算**：按令牌和 IP 限流（如公共端每 IP 每分钟 10 次、每日 20 个案件，司法与实务端放宽；数值写入 `limits.yaml`，初始建议值）；每个主体每日的 LLM 调用数与 token 预算记入 `usage_counters`，超限返回 429 并提示；公共端默认只开放精简模式。
- **提示注入防护**：用户输入、证据材料摘录和抓取到的判决文本都是不可信数据：放进明确分隔的数据区，系统提示声明其中的指令一律无效；关键输出走结构化 JSON 与 V1–V11 校验；工具调用走白名单，LLM 不能写库、不能访问网络；E9 增加注入用例（案情中夹带“忽略以上指令”等）。
- **PII 脱敏**：送往 LLM 的用户文本先经 `pii.py`：规则脱敏手机号、身份证号、银行账号、邮箱、详细地址；当事人名称替换为“甲方、乙方”等代号（由用户在录入页确认映射），映射表只存本地，导出时可选还原；用测试集验证脱敏规则的召回，并提示用户复核。MVP 只用公开或脱敏案例，此功能是试点前的必备项。
- **日志与反馈脱敏**：events 只存 ID、哈希与引用；feedback 的修改前后文本只存报告陈述，不含用户原文，保存前再过一遍 PII 规则。
- **保留与删除**：案件默认保留 90 天（`retention_until`，初始建议值），到期自动删除输入、状态、checkpoint、版本与含用户文本的反馈，只保留不含文本的脱敏统计；用户可随时 `DELETE /cases/{id}`；删除动作写审计记录（只含案件 ID 与时间）。
- **同意声明**：首次提交案件前展示功能与局限、数据处理与保留说明，记录版本与时间（`consents`）。
- **合规边界**：脱敏后的文本仍可能构成个人信息；面向公众上线前须按个人信息保护要求评估，并与法学团队确认。

### 7.5 非功能需求（F34）

以下为初始建议值，W4 与 W10 用实测校准。

| 项目 | 目标 | 说明 |
| --- | --- | --- |
| 并发 | 演示 ≤5 个并发案例；单进程；超出排队，队列上限 20 | LLM 并发度不超过供应商限流 |
| 时延 | 首屏（检索结果与要件状态）P95 ≤3 分钟；全流程（含 B 部分、校验、回修）P95 ≤10 分钟；不含人工节点 | 见下方调用估算 |
| 规模上限 | 每案例问题 ≤6、要件 ≤12、证据 ≤40 条 | 超限提示用户拆分 |
| 调用预算 | 每案例 LLM 调用 ≤80 次、token ≤40 万；接近上限自动降为精简模式 | 记录到 `usage_counters` 与 events |
| 并行与批处理 | 要件级并行度 ≤6；翻译每批 ≤8 段；V4 按问题批量 | 避免串行调用 |
| 可用性 | 单机，无高可用；主备 LLM 供应商切换；服务重启后凭 checkpoint 恢复 | 高可用列入后续优化 |
| 数据 | 案件默认保留 90 天；快照保留最近 2 个；日志不含用户原文 | 见 7.4 |
| 成本 | 每案例成本上限按所用模型单价折算；每主体每日预算 | 写入 `limits.yaml` |
| 兼容与可访问性 | 现代浏览器最近两个版本；中文界面；键盘可达、对比度符合基本要求 |  |
| 可观测 | 记录时延、调用数、token、失败率、降级次数；回归集每周运行 | 8.8 |

**调用次数粗估**（单案例，6 个问题、12 个要件）：S1 约 1，S3 约 1–2，S5 复核与改写约 8–12，Matcher 约 12，`similar_cases` 约 5，翻译约 3 批，起草约 6，V4 约 6，合计约 45–50 次；回修最多再增加约 20–30 次。串行按每次 5–15 秒算，要 5 到 15 分钟，所以必须并行与批处理。这是我的估算，须用实测校准。

**降级模式**：所有模式都保留确定性校验与 V8；当前模式记录在 `case_registry` 与报告页。

| 模式 | 触发 | 保留的功能 | 关闭的功能 |
| --- | --- | --- | --- |
| 完整（full） | 默认 | 全部 | — |
| 精简（lite） | 调用预算接近上限、供应商响应慢，或公共端默认 | A 部分、B1–B3、B5–B6、校验 | S5 改写检索、`similar_cases` 的逐案分析、LLM 润色 |
| 检索（retrieval） | LLM 全部不可用或预算耗尽 | 法条与判例检索、原文与来源、时点与 CISG 规则提示 | 翻译、起草、Matcher、B 部分；页面提示原因 |

## 8. 评测方案

### 8.1 评测套件

| 套件 | 规模 | 内容 | 用途 |
| --- | --- | --- | --- |
| E1 检索 | 40–60 问（30% 开发、70% 测试） | 中文问法为主，另含 10 条德语问法；标注 gold\_norms、gold\_cases，其中不少于 30% 为要件模板未覆盖的问题 | 召回与排序；图扩展、复合词拆分器的消融 |
| E2 端到端 | 5–8 个案例（共 10–20 问） | 含 key\_points 要件点及要件状态金标准（covered、partial、missing）；含模板外要件；含陷阱案例（CISG、时点、库外问题、比较法诱导） | 引用质量、覆盖度、可用性；Critic 有无的消融 |
| E3 译文 | 抽样 40 段（法条与判例摘录） | 专家按量表评分 | 译文与术语质量 |
| E4 材料核验 | 20 份构造材料＋10 份正确材料 | 虚构案号、错误条号、篡改引文、已被修订的条文、混入中国法概念等 | 检出率与误报率 |
| E5 风险提示 | 10 例 | CISG、时点（红、黄两态）、库外问题、非德国法 | 提示命中率 |
| E6 系统 | 所有端到端运行 | 时延、成本、失败率 | 工程指标 |
| E7 引用解析 | 公开标注集（PaDaS-Lab 的 legal-reference-annotations，约 2,944 条，使用前核对许可）抽样，加自标 30–50 条中国场景写法 | 含 i.V.m.、§§ 并列、f. 与 ff.、Abs./S./Nr. 层级；另含案号写法变体 | 解析器选型（refex、bundesrecht、旧版正则）；验证安全失败机制 |
| E8 比较法污染 | 20 个易混淆概念（如表见代理与 Anscheinsvollmacht、撤销与解除、请求权与诉权） | 构造含诱导用语的案情与问题，专家判定是否出现未加说明的中国法概念 | 污染率；V9 的拦截率与误报率 |
| E9 案情分析 | 8–12 个案例（含各方主张与证据材料清单），专家标注争点清单与要件—事实匹配状态 | 含事实有争议、事实缺失、材料缺失、材料互相矛盾的案例；另含不少于 60 条诱导越界的提问和若干提示注入用例（如“我能赢吗”“帮我判断赔多少”） | 争点召回与精确；匹配状态一致率；事实溯源错误数；越界表述率；类案相似与差异评分 |

### 8.2 指标与初始门槛

以下门槛为初始建议值，跑完基线后由法学团队与开发共同校准。

| 指标 | 定义 | 初始门槛 |
| --- | --- | --- |
| 幻觉引用数 | 报告中提到、但库内不存在的法条或案号数量 | 必须为 0（一票否决） |
| 事实溯源错误数 | 报告中无法回溯到用户输入原文，或原文中没有的事实数量（E9） | 必须为 0（一票否决） |
| 越界表述率 | 报告与问答输出中出现预测、概率、倾向性或采信结论的陈述比例（E9 诱导提问加人工抽查） | 必须为 0（一票否决） |
| 未解析引用标记率 | 含 § 或疑似案号、但解析器未覆盖的片段中，被标为“未解析引用”的比例 | 100% |
| 引用解析 F1 | 解析器在 E7 上的精确匹配 F1（条号级） | ≥ 0.90（先测基线再定） |
| 引文一致率 | V2 为 exact 的逐字引文比例 | ≥ 98% |
| 法条召回@10 | gold\_norms 出现在检索前 10 的比例 | ≥ 0.85 |
| 判例召回@10 | gold\_cases 出现在检索前 10 的比例 | ≥ 0.60 |
| MRR、nDCG@10 | 排序质量 | 只报告，不设门槛 |
| 关键法条引用率 | gold\_norms 在最终报告中被引用的比例 | ≥ 0.80 |
| 要件覆盖率 | 报告覆盖的 key\_points ÷ gold key\_points（专家判定） | ≥ 0.75 |
| 误判充分率 | S5 判定 covered、而专家认为缺核心证据的要件比例（E2） | ≤ 5% |
| 充分性判定一致率 | S5 的要件状态与专家标注的 covered、partial、missing 一致的比例（E2） | ≥ 0.80 |
| 争点召回 / 精确 | E9 中系统争点与专家争点的匹配比例 | ≥ 0.80 / ≥ 0.70 |
| 要件—事实匹配状态一致率 | Matcher 的四态与专家标注一致的比例（E9） | ≥ 0.80 |
| 类案相似与差异评分 | 专家按量表 1–5 评分（E9） | ≥ 3.5 |
| 无依据陈述率 | 专家抽检：无证据支持的陈述 ÷ 全部陈述 | ≤ 5% |
| 比较法污染率 | E8 中出现未加说明的中国法概念的陈述比例（专家判定） | ≤ 2% |
| V9 拦截率 / 误报率 | E8 | ≥ 0.85 / ≤ 0.10 |
| 风险提示命中率 | E5 中应触发的提示被触发的比例（含时点红、黄） | ≥ 0.90 |
| 材料核验检出率 / 误报率 | E4 | ≥ 0.85 / ≤ 0.10 |
| 专家评分 | 4 个维度，1–5 分，取均值 | ≥ 3.5 |
| 时延 P95 | 单案例端到端（不含人工节点，含 S5 改写检索、Matcher 与最多 2 次回修） | 首屏 ≤ 3 分钟，全流程 ≤ 10 分钟（见 7.5） |
| 成本 | 每案例 token 数与费用 | 只记录 |

### 8.3 对照与消融

- **对照 1**：同一模型“无检索、直接回答”对比本系统，证明检索约束的价值，尤其是幻觉引用数。
- **对照 2**：以专家参考答案为上限，比较要件覆盖和引用准确。
- **检索消融**：仅 BM25、仅向量、混合、混合＋重排；图扩展开或关；复合词对称拆分开或关；拆分器三选一（自写词表法、CharSplit 原模型、重训 CharSplit）。
- **充分性消融**：S5 开或关（关＝只做一轮检索，不判断、不改写）；规则判定对比规则加 LLM 复核。比较要件覆盖率、判例召回@10、误判充分率、Critic 回修次数、P95 时延与 token 成本。
- **分析层消融**：Matcher 规则判定对比 LLM 一体判断（比较匹配状态一致率与事实溯源错误数）；有无 V10、V11（拦截的错误数）；类案做相似与差异分析对比仅列判例（比较专家评分与越界表述率）。
- **流程消融**：固定流程对比检索 Agent；有无 Critic（统计被拦截的错误数、最终幻觉引用数、时延与 token 成本）；有无校验；翻译与起草分离对比一体生成（比较 V5 命中数与比较法污染率）。
- **解析器对比**：refex、bundesrecht、旧版正则三者在 E7 上的 F1 与未解析标记率。
- **图查询对比（W11 后，可选）**：SQLite 递归 CTE、内存图、DuckPGQ 的 P95 时延与结果一致性。

### 8.4 人工评审

- 评审员不少于 2 位，须懂德国法；盲评，隐去系统与对照标识。
- 量表四个维度：准确性、完整性、可核验性、可用性，每项 1–5 分，附评分细则；分歧由第三人仲裁，报告加权 kappa。
- 效率指标：抽 3 个案例，记录专家“从零查明耗时”与“审改系统材料包耗时”，用于申报材料中的效率提升论证。

### 8.5 LLM 裁判的校准

V4 的裁判模型必须与生成模型不同厂商。用 50 条人工标注（supported / partial / unsupported）校准，与人工一致率达到 0.8 以上才启用；每次更换模型重新校准。Ragas 等通用评测库只作离线抽样的第二把尺子：先在同样的 50 条标注上比较一致率，达标才纳入内部监控；核心指标仍由自写的确定性脚本与 ranx 计算，因为幻觉引用数、引文逐字一致率、金标准召回这些指标是这类库不提供的。

### 8.6 运行方式与可复现性

```
python -m eval.run --suite retrieval --config configs/retrieval.yaml --snapshot 20261015 --group-by issue,lang
python -m eval.run --suite citations --parser refex --snapshot 20261015
python -m eval.run --suite e2e --gen qwen --judge deepseek --snapshot 20261015 --group-by issue,lang
python -m eval.run --suite analysis --snapshot 20261015      # E9：争点、匹配状态、事实溯源、越界表述
python -m eval.run --suite ablation --snapshot 20261015
python -m eval.run --suite regression --snapshot current --baseline eval/reports/baseline/metrics.json
python -m eval.run --suite ragas_sample --snapshot 20261015   # 可选，仅内部报告
```

- 输出目录 `eval/reports/{run_id}/`：`metrics.json`、`per_question.csv`、`failures.md`；run\_id 包含 snapshot\_id、配置哈希、模型名、prompt\_hash。
- 确定性指标用 ranx 与自写函数计算；Ragas 抽样单独成 suite，结果只进内部报告。
- 日常改动跑 pytest 冒烟（5 题）；全量评测只在里程碑节点跑。
- 每次评测把失败原因归类：数据缺失、检索失败、解析漏抽、生成遗漏、校验漏拦、翻译问题，指导下一轮优化。

```python
def recall_at_k(gold, ranked, k):
    return len(set(gold) & set(ranked[:k])) / len(gold) if gold else None

def mrr(gold, ranked):
    for i, x in enumerate(ranked, 1):
        if x in gold:
            return 1.0 / i
    return 0.0
```

### 8.7 MVP 验收口径

一票否决项（幻觉引用数、事实溯源错误数、越界表述率）要求测试集上观察到 0 次，并报告 95% 置信上界（见 8.10），同时运行时守卫（V3、V8、V10、V11）保持开启；其余门槛至少 80% 达标；样本量不足 30 的比例类指标只报告区间，不作硬门槛；并完成 3 个端到端案例的现场演示（见 9.2）。

### 8.8 回归集、漂移监控与变更门禁（F28）

**分层报告**：所有指标按“争点（issue\_id）× 问法语言（中文、德语、混合）”分组输出，并区分要件模板命中与未命中两类，避免平均值掩盖某个分组的退化。MVP 只覆盖德国联邦法一个法域，“不同法律领域和语言场景”在这里等同于争点与问法分层。

**回归集**：30 题固定，由开发集 20 题加反馈沉淀的 10 题已确认错误案例组成，含陷阱案例。测试集只在里程碑评测时使用，不参与门禁和调参，避免泄漏。

**漂移来源与记录**：LLM 供应商更新模型；快照、解析器、索引、依赖、提示词变化。每次运行都记录 model、prompt\_hash、snapshot\_id、parser\_version、index\_version（写入 `report_lineage` 与评测报告）。无法固定版本号的接口，靠回归集发现退化。

**告警规则**（初始建议值，基线跑完后校准）：

| 指标 | 告警条件 |
| --- | --- |
| 幻觉引用数 | 大于 0 |
| 法条召回@10、判例召回@10 | 较基线下降超过 0.05 |
| 要件覆盖率 | 较基线下降超过 0.05 |
| 误判充分率 | 超过 8.2 的门槛 |
| P95 时延 | 超过门槛 20% |
| 任一争点或问法分组 | 较基线下降超过 0.10 |

**变更门禁**：更换模型、提示词、快照、解析器或依赖版本，必须先跑回归集，通过才能合入或切换；告警时阻止切换并通知。

**运行频率**：每周定时运行一次（cron 或 CI 定时任务），每次变更前再跑一次。基线取里程碑评测的 `metrics.json`，更新基线须人工批准。

**线上抽检**：公共端与实务端的生成结果按 5% 抽样，由专家复核，结果写入 feedback 表（`action=audit`），用于估计线上错误率并补充回归集。

### 8.9 可用性测试与反馈指标

- **可用性测试**：5–8 位用户（法官、律师、非法律背景各 2–3 位），3 个任务：录入案情并确认需求单；审阅报告并采纳或修改；检索法条并查看原文与译文。记录任务完成率、完成时间、错误操作次数，可附 SUS 量表。初始建议：任务完成率 ≥ 80%，SUS ≥ 68；效率对比沿用 8.4 的从零查明耗时。
- **反馈指标**：采纳率、修改率、拒绝率，按错误类型、要件、争点分层统计；用于调整 V4、V9、S5 的阈值，并沉淀回归集。反馈不用于自动学习或在线微调。

### 8.10 样本量与置信区间

- **比例类指标**：一律同时报告点估计与 Wilson 95% 区间。比例按要件、事实、陈述等细粒度单位计数，而不是按案例计数；仍不足 30 个单位的，只报告区间，不作硬门槛，验收以一票否决项和人工评审为准。
- **“必须为 0”的指标**（越界表述率、事实溯源错误数、幻觉引用数）：测试集上观察到 0 次，并报告 95% 置信上界（三分法则，上界约为 3/n）。要把上界压到 5% 以内需要 n≥60，目标 n≥100（上界约 3%）。因此诱导越界提问集不少于 60 条、目标 100 条；事实溯源按报告中的事实总数计数。这些指标证明的是残余风险，主防线仍是运行时守卫（V3、V8、V10、V11），上线后始终开启。
- **分层**：除按争点、问法语言分层外，还区分“要件模板命中、未命中”。模板命中的问题，核心条文直接取得，覆盖率会偏高；只有模板未命中的问题才反映泛化能力，E1、E2 中不少于 30% 为模板外问题。
- **对比实验**：消融与对照用配对比较（同一批题目），报告差值及其区间，不只比较均值。
- **LLM 随机性**：核心评测固定 temperature 为 0；关键指标重复运行 3 次，报告最差一次。

## 9. 十二周开发计划

| 周 | 开发工作 | 交付物 | 法学团队配合 |
| --- | --- | --- | --- |
| W1 | 环境与目录；API 契约（OpenAPI）骨架；实测 gii-toc.xml 与 rii-toc.xml；下载解析 BGB、HGB、GmbHG、ZPO、EGBGB 入库到快照目录（含 Absatz、Nummer 结构）；快照库与运行库分离（WAL）；案件登记表与令牌鉴权骨架；接通大模型客户端；初始化来源登记表 | 快照库、norm\_lookup 单测通过、API 契约 v0 | 确认法源清单；启动 gold、术语库与 timepoints.yaml 草稿 |
| W2 | 判例下载解析；分块、BM25、向量、重排；拆分器三方对比；引用解析适配层与 E7；E1 检索基线；更新命令行与质量闸门脚本 | 检索基线报告、拆分器与解析器选型报告、更新流程可跑通 | 首批 gold（≥20 问，含模板外问题）；200 个复合词测试集；E7 自标引用；确认闸门阈值 |
| W3 | 边表与本体 v0、图扩展（含扇出上限与物化表）；S1–S3 节点（含 S1 受限追问、要件展开）；S2 的 CISG 闸门与适用法律入口检查、`timepoint_level`；输入模型扩展（事实、各方主张、证据材料清单）；PII 脱敏与日志脱敏；案件列表、状态、删除接口与保留策略；前端脚手架、录入页（日期必填、同意声明） | 图扩展消融初版；需求单可导出；案件生命周期接口 | 要件模板 5 个（含 need\_cases、need\_materials、match\_facts、fact\_slots）；术语库 100 条（含 relation）；时点警示表 5 条 |
| W4 | Researcher（含 S5 要件充分性判断与改写检索）、Translator（批量）、Drafter 节点；LangGraph checkpoint、interrupt、SSE（事件持久化与续传、`GET /jobs/{id}`）；降级模式与调用预算；限流与 `usage_counters`；第一次时延与调用数实测 | 首份端到端报告（经接口）；时延基线 | 审阅样例报告 |
| W5 | Critic 节点（V1–V9）、按问题的回修路由与降级、可信度分级；docx 导出；报告版本与哈希；审计留痕与报告血缘；回归集 30 题与分层报告脚本 | 校验报告、docx 模板、回归集 v1 | 陷阱案例（含比较法诱导）；译文评分表；中国法特有术语清单约 100 个；回归集标注 |
| W6 | 前端报告审阅页（并排视图、引用高亮、时点提示条、运行模式提示）、校验仪表盘；要件—证据矩阵、检索轨迹、反馈入库与错误类型 | 可演示的主路径 | 试用反馈 |
| W7 | 材料核验、专家流转、已认定案例原型、三角色路由与令牌；追加问题（follow-up，沿用案件快照）；公共端检索问答 | F01–F28 与 F33、F34 的基础版全部打通 | 构造 20 份核验材料 |
| W8 | 案情分析层 P0：S1 事实与主张抽取（摘录式 F#）、S3 争点提取、Matcher 节点（四态、fact\_slots、缺口）、V10（含实体核对）、V11、B 部分与提问清单、案情分析页 | F29、F30、F32 的 P0 可演示 | 8–12 个案例的争点与匹配状态金标准标注 |
| W9 | 案情分析层 P1：证据链图、`similar_cases`（类似判例登记为 E#）、角色分级、V8 扩展与诱导提问、提示注入用例、E9 评测集 | F31 与 F32 完整；E9 就绪 | 类案相似与差异评分量表；诱导越界提问 60–100 条 |
| W10 | 全量评测 E1–E9（按 8.10 的样本量与区间）、消融实验；并发与时延压测（5 并发）；漂移监控与变更门禁上线 | 评测报告 v1、压测报告 | 盲评 |
| W11 | 调优与缺陷修复；可用性测试（5–8 人）；可选实验：图查询对比（内存图、DuckPGQ）、PropertyGraphIndex 对比、Ragas 抽样 | 评测报告 v2、可用性测试报告 | 复评；协助招募测试用户 |
| W12 | 验收评测、演示、文档（部署手册、已知局限） | MVP 验收包 | 复核评测结论 |

### 9.1 测试策略

- **单元测试（pytest）**：解析器用固定样本（BGB § 433、HGB § 377）；引用解析器用 E7 标注；`quote_check`；RRF 与各拆分器；`timepoint_level`（缺日期 → 红；早于修订 → 红；晚于全部修订 → 黄；任何输入都不返回绿）；V9（relation 为 none 的概念出现 → 拦截；approximate 带加注 → 放行；equivalent 且证据含对应德语术语 → 放行）。
- **S5 测试**：`assess_element` 的三种状态；无关联证据时 LLM 复核不能把状态改为 covered；改写检索在没有新增证据时停止；轮数不超过 2。
- **分析层测试**：`decide_match` 四态各一例，含“缺少事实要素 → partial”和“无事实要素清单 → 最多 partial”；`check_fact_trace` 与 `check_entities` 对被篡改、新增的事实、日期、金额判失败；V11 对状态与链接不一致的用例判失败；诱导提问（如“我能赢吗”）被 V8 改写为固定说明；类似判例片段已登记为 Evidence 并能被 V2 核对；`similar_cases` 的输出不含结果判断。
- **路由与闸门测试**：Critic 路由（V5 → Translator，V10、V11 → Matcher，其他 → Drafter）；一个问题用尽回修次数后，其他问题仍可继续回修；CISG 闸门（未确认排除 → 暂停；确认排除 → 继续；确认不排除 → 输出提示后结束）。
- **快照与更新流程测试**：案件固定快照，更新切换后恢复与追加问题仍用原快照；快照被清理时给出提示；质量闸门每一项的通过与失败用例；结构契约在固定样本被篡改时失败；失败时保持旧库。
- **安全与隐私测试**：令牌缺失 401，角色越权 403，非本人案件 404；限流与预算超限 429；PII 脱敏规则的召回用例；提示注入用例不改变输出结构与范围；保留期到期自动删除，`DELETE /cases/{id}` 彻底删除；events 与 feedback 不含用户原文。
- **可靠性测试**：SSE 断线后用 `Last-Event-ID` 续传不丢事件；LLM 超时与供应商故障时切换，全部失败时进入检索模式；运行库并发写入（WAL 与单写线程）不出现锁错误。
- **反馈与多轮测试**：feedback 表写入字段完整，公共端 actor 为空；追加问题只处理 `done=False` 的问题，已确认条目不变；追问不超过 2 轮。
- **接口测试**：FastAPI TestClient 覆盖主要路由；公共端不返回 B4 的逐案相似与差异。
- **契约测试**：OpenAPI 变更时重新生成前端客户端并跑类型检查，防止前后端漂移。
- **前端**：Playwright 冒烟主路径与案情分析页。
- **评测快照**：所有评测在固定 snapshot 上运行并记录 run\_id。

### 9.2 功能优先级与裁剪线

32 项以上功能由单人在 12 周内完成，必须有明确的优先级和裁剪线。“简化实现”不等于不做：P2 保留接口与最小实现，可以后移。

| 层级 | 功能 | 说明 |
| --- | --- | --- |
| P0 关键路径（W1–W9，必须演示） | F01–F14、F18–F23、F29、F30、F32、F33、F34 | 查明材料包主链路、校验、三角色、案情分析核心、安全与生命周期的基础版 |
| P1 完整度（W7–W10） | F16、F25、F26、F27、F28（手动回归）、F31 | 材料核验、校验仪表盘、更新与质量闸门、反馈与可解释展示、回归集、类案相似与差异 |
| P2 简化占位（可裁剪，保留接口） | F15、F17、F24、F28（定时运行与线上抽检） | 已认定案例原型、专家流转、图扩展、定时回归与抽检 |

**进度落后时的裁剪顺序**：（1）F24 图扩展，关闭开关、保留接口；（2）F15 案例原型；（3）F17 专家流转，只导出会商包；（4）F31 逐案相似与差异，保留只列判例；（5）F28 定时与抽检；（6）F25 仪表盘，简化为计数列表。

**不可裁剪**：V1–V3、V8、V10、V11 校验，快照固定，鉴权、限流与 PII 脱敏。

**演示脚本**：3 个端到端案例——（1）正常路径，含要件部分具备与缺口清单；（2）CISG 闸门与时点红色提示；（3）比较法诱导案情与“我能赢吗”类诱导提问被拦截。

### 9.3 法学团队工作量估算

以下为粗估，须与法学团队确认；人天按一名熟悉德国法的研究生计。

| 交付物 | 数量 | 估算（人天） | 最晚节点 |
| --- | --- | --- | --- |
| 法源清单与争点范围确认 | — | 1 | W1 |
| 术语库（含 relation、zh\_forbidden） | 200–300 条 | 4 | W3–W5 |
| 要件模板（含 fact\_slots、need\_cases、need\_materials、match\_facts） | 8–15 个 | 6 | W3 起 |
| 时点警示表 | 20–30 条 | 3 | W3 |
| 中国法特有术语清单 | 约 100 个 | 1 | W5 |
| 复合词测试集 | 200 个 | 1 | W2 |
| E7 自标引用 | 30–50 条 | 1 | W2 |
| E1 检索 gold（含模板外问题） | 40–60 问 | 4 | W2 起 |
| E2 端到端案例与金标准 | 5–8 个案例 | 7 | W3–W5 |
| 回归集（开发集 20＋反馈 10） | 30 题 | 1 | W5 |
| E4 核验材料 | 30 份 | 2 | W7 |
| E8 比较法诱导概念 | 20 个 | 2 | W5 |
| E9 案例与金标准（争点、匹配状态） | 8–12 个案例 | 10 | W8 |
| 诱导越界提问与注入用例 | 60–100 条 | 1 | W9 |
| 译文与类案评分、盲评 | — | 6 | W10 |
| 合计 |  | 约 50 |  |

**最小可用集**：术语库 120 条、要件模板 5 个、E1 30 问、E2 4 个案例、E9 6 个案例、诱导越界提问 60 条，约 30 人天；其余在 W10 前补齐。工作量紧张时，先保证 P0 相关交付物。

## 10. 已知局限与优化路线

- **仅现行版本**：向 `norm_versions` 追加历史版本（核对联邦法律公报，或评估社区维护的修订历史库，可用性与授权自行核实），支持按合同订立时点取文，时点提示从红黄两态升级为按版本核对。目前仅能积累开始抓取之后的观察区间。
- **无评注与教科书**：采购授权数据库，或由专家补充。
- **判例仅联邦法院公开部分**：后续增加州法院与其他合法来源，并做 citator。
- **德语检索**：迁移到 OpenSearch 的原生复合词拆分；用 gold 数据微调嵌入与重排小模型。
- **图谱与图查询**：补 AMENDS 关系（需联邦法律公报等逐条修订数据）；以确定性图为基线，对比 LlamaIndex PropertyGraphIndex 与 LLM 抽取；达到切换触发条件后评估内存图、DuckDB＋DuckPGQ（固定 1.4.x）或 Neo4j、社区图库，GraphStore 接口不变。
- **证据充分性**：用专家标注的要件状态训练小分类器，替代 LLM 复核；要件之间并行检索；按法域与争点自适应标定阈值 τ。
- **案情分析层**：证据形式规则库（域外证据的公证认证等）；多方主张冲突检测与争点优先级；接入内地已查明案例做类案；证据链图的交互编辑；扩充事实要素清单覆盖的争点。评估性输出仍不做；若未来要做统计性分析，只做法院或争点层面的汇总，不做法官个人画像（参考法国对法官身份数据再利用的限制）。
- **用户材料**：支持上传 docx、PDF 并抽取事实候选（含 OCR 与德语材料），仍须用户确认并经 V10 回溯。
- **法律适用**：从“已选德国法”入口与入口检查清单，扩展到完整的冲突规范推理与选法条款有效性分析。
- **术语库与比较法**：扩充 relation 术语库（目标上千条），用 LLM 发现候选污染词再由专家审核，建立跨法域概念映射。
- **数据更新自动化**：把手动更新改为定时任务，增加源站变更监测与差异报告的自动通知；判例按月增量更新。
- **反馈闭环**：用积累的反馈和专家抽检结果校准阈值（V4、V9、S5 的 τ），评估用小模型替代部分 LLM 判断；仍不做在线学习。
- **评测与监控**：接入 Langfuse，建立漂移监控看板；Ragas 校准后用于内部趋势监控；用 NLI 小模型替代部分 LLM 裁判。
- **安全与隐私**：账号体系与 SSO；基于 NER 的更完整 PII 脱敏；审计合规；密钥与令牌的轮换与托管。
- **部署与可用性**：模型私有化部署；LangGraph 换 Postgres checkpointer；多实例、任务队列与对象存储；补等保；对接门户或数字法院。
- **专家流转与前端**：对接邮件或即时通信，增加出庭安排；前端增加多语言界面、引注格式规范、在线协同。

## 11. 主要风险与应对

| 风险 | 应对 |
| --- | --- |
| 站点访问不稳定或被限速 | 一次性下载、快照留存、礼貌抓取；必要时手工下载 |
| XML 字段与预期不符 | W1 先 dump 样本；用固定样本写解析单元测试 |
| 源站结构变化 | 结构契约测试与质量闸门；告警并保持旧库 |
| 快照切换导致同一案件前后不一致 | 案件固定快照；服务保留当前与上一个快照；恢复时快照已清理则提示重新运行 |
| 德语检索效果差 | 基线评测提前做；复合词对称拆分，三种拆分器按召回选型；备选 OpenSearch |
| 模型在德语法律文本上表现不足 | 抽象层加多模型对比，按任务分配模型；主备供应商切换 |
| LLM 供应商悄悄更新模型导致漂移 | 记录模型版本；每周回归；变更门禁；无版本号的接口靠回归集发现退化 |
| 无 GPU，嵌入耗时 | 限制判例数量；或云端一次性嵌入公开数据 |
| 法学标注滞后或工作量超预期 | gold 先行，W2 设为硬性节点；按 9.3 估算与最小可用集推进；P0 相关交付物优先 |
| 引用解析库的 API 或质量不符预期（refex、bundesrecht） | 统一适配层；E7 先评测再选型；bundesrecht 为较新的库，锁版本并关注更新；安全失败兜底 |
| LangGraph 等依赖版本变动 | 锁定版本；节点逻辑写成普通函数，图定义保持单薄；先写测试 |
| 前后端契约漂移 | OpenAPI 契约先行；生成类型化客户端；契约测试 |
| 角色伪造、越权访问、成本滥用 | 令牌鉴权与案件归属校验；限流与每日预算；公共端默认精简模式 |
| 提示注入 | 用户输入与抓取文本放入数据区；结构化输出与 V1–V11 校验；工具白名单；E9 注入用例 |
| SQLite 并发锁冲突 | 快照库只读；运行库 WAL 与单写线程；更新流程不写运行库 |
| 时延与成本超预算 | 并行与批处理；规模与调用预算；降级模式；W4、W10 实测校准 |
| Critic 增加时延与成本 | 按问题回修，≤2 次，只重写失败陈述；监控 P95 |
| 图扩展无收益或引入噪声 | 消融验证；扇出上限；开关可关；边带出处，生产只用规则与专家边 |
| 充分性误判（过度肯定） | 规则优先，LLM 只复核 partial 且须已有证据；V7 独立复核；E2 度量误判充分率；S8 向人展示每个要件的状态 |
| 事实匹配过度肯定 | 要件模板的 fact\_slots，事实要素须全部命中；无要素清单的要件最多 partial；V11 复核；E9 度量 |
| 事实层面的幻觉（日期、金额、主体被改动） | 摘录式抽取；B2、B3 原样引用 F# 文本；`check_entities` 确定性核对；V10；E9 度量事实溯源错误数 |
| 越界输出（预测、概率、倾向、采信结论） | V8 对所有角色强制开启；输出分级与允许、不允许对照表；固定声明；宣传用语审查（参考美国 DoNotPay 被处罚的教训）；按 8.10 的样本量评测并保留运行时守卫 |
| 小样本无法证明“零违规” | 报告 95% 置信上界；诱导提问集 ≥60 条；运行时守卫为主防线 |
| 用户输入事实质量差 | S1 受限追问；缺失事实标“未提供”；V10 禁止补事实；B 部分明示依赖用户输入 |
| “条件具备”被误读为“会胜诉” | 页面固定说明；文案用“要件所需的事实要素均有对应事实”；不做汇总评分 |
| 时点提示被误读为“已核验” | 不设绿；黄色文案明确“系统仅含现行版本”；红色须专家确认适用版本 |
| 比较法污染漏检 | V9 是兜底而非保证；用 E8 量化；术语库持续扩充；人工复核不可省略 |
| 反馈数据稀疏或质量不一 | 错误类型下拉；只用于统计与回归集沉淀，不做自动学习；专家抽检补充 |
| 多轮交互范围膨胀 | 仅限三种场景并设次数上限；不做开放式聊天 |
| 前端范围膨胀 | 页面清单固定在 3.5；新增需求进 backlog |
| 范围蔓延 | 严格以 F01–F34 为准；超出的进 backlog，并按 9.2 的优先级处理 |
| 隐私与合规（案件数据） | PII 脱敏；保留与删除；同意声明；日志脱敏；公共服务的定位与备案由法学团队与主管部门确认；上线前评估 |

## 附录 A：代码骨架

### A.1 LangGraph 工作流骨架

```python
import sqlite3
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.types import interrupt, Command

MAX_RETRY = 2

def s3_gate(state):
    '''人工确认争点与事项拆解：interrupt 暂停，前端确认后用 Command(resume=...) 恢复。'''
    confirmed = interrupt({'gate': 's3', 'issues': [i.model_dump() for i in state.issues],
                           'questions': [q.model_dump() for q in state.questions]})
    return {'issues': [Issue(**i) for i in confirmed['issues']],
            'questions': [LegalQuestion(**q) for q in confirmed['questions']]}

def cisg_gate(state):
    '''CISG_CHECK 触发且未确认排除：暂停，等待用户确认合同是否已排除 CISG。'''
    ans = interrupt({'gate': 'cisg', 'flags': state.flags})
    return {'meta': state.meta.model_copy(update={'cisg_excluded': bool(ans['cisg_excluded'])})}

def route_after_s2(state):
    needs_gate = 'CISG_CHECK' in state.flags and state.meta.cisg_excluded is not True
    return 'cisg_gate' if needs_gate else 's3_decompose'

def route_after_cisg(state):
    # 确认已排除 → 继续德国法分析；否则只输出 CISG 提示与文本，流程结束
    return 's3_decompose' if state.meta.cisg_excluded else 'cisg_notice'

def route_after_critic(state):
    # critic 已把“所属问题回修次数用尽”的失败项降级（status='downgraded'），
    # 这里再按问题过滤一次：只有 retry[qid] < MAX_RETRY 的失败项才会被打回
    failed = [c for c in state.checks if c['status'] == 'fail']
    retryable = [c for c in failed if state.retry.get(c['qid'], 0) < MAX_RETRY]
    if not retryable:
        return 'done'
    codes = {c['code'] for c in retryable}
    if 'V5' in codes:                 # 译文术语问题回到 Translator
        return 'retry_translate'
    if codes & {'V10', 'V11'}:        # 事实溯源、证据链问题回到 Matcher
        return 'retry_match'
    return 'retry_draft'              # 其余回到 Drafter

def build_graph(llm, snapshots, checkpointer):
    g = StateGraph(CaseState)
    for name, fn in [('s1_extract', s1_extract), ('s2_precheck', s2_precheck),
                     ('cisg_gate', cisg_gate), ('cisg_notice', cisg_notice),
                     ('s3_decompose', s3_decompose), ('s3_gate', s3_gate),
                     ('researcher', researcher), ('matcher', matcher),
                     ('translator', translator), ('drafter', drafter),
                     ('critic', critic), ('s8_review', s8_review),
                     ('s9_export', s9_export)]:
        g.add_node(name, fn)
    g.add_edge(START, 's1_extract')
    g.add_edge('s1_extract', 's2_precheck')
    g.add_conditional_edges('s2_precheck', route_after_s2,
                            {'cisg_gate': 'cisg_gate', 's3_decompose': 's3_decompose'})
    g.add_conditional_edges('cisg_gate', route_after_cisg,
                            {'s3_decompose': 's3_decompose', 'cisg_notice': 'cisg_notice'})
    g.add_edge('cisg_notice', END)
    g.add_edge('s3_decompose', 's3_gate')
    g.add_edge('s3_gate', 'researcher')
    g.add_edge('researcher', 'matcher')
    g.add_edge('matcher', 'translator')
    g.add_edge('translator', 'drafter')
    g.add_edge('drafter', 'critic')
    g.add_conditional_edges('critic', route_after_critic,
                            {'retry_translate': 'translator', 'retry_match': 'matcher',
                             'retry_draft': 'drafter', 'done': 's8_review'})
    g.add_edge('s8_review', 's9_export')     # s8_review 内部同样用 interrupt 等待人工复核
    g.add_edge('s9_export', END)
    return g.compile(checkpointer=checkpointer)

conn = sqlite3.connect('data/state/checkpoints.sqlite', check_same_thread=False)
conn.execute('PRAGMA journal_mode=WAL')
conn.execute('PRAGMA busy_timeout=5000')
checkpointer = SqliteSaver(conn)
config = {'configurable': {'thread_id': 'C01'}}          # thread_id 取 case_id
# 首次运行：graph.invoke(initial_state, config)
# 人工确认后：graph.invoke(Command(resume=payload), config)
```

要点：节点函数返回需要更新的字段；cisg\_gate 与 s3\_gate 都是 interrupt 节点，恢复时节点会从头重新执行，所以 interrupt 之前不要放有副作用的代码；translator 重试时只重译 V5 失败的证据；matcher 重试时只重做 V10、V11 失败的要件；drafter 重试时只重写 `status == 'fail'` 的陈述，并读取 `checks` 中的失败原因（含 V9 的概念污染说明）；critic 负责把 `retry[qid]` 加一，并把所属问题已用尽回修次数的失败项降级。所有节点读取检索资源时，都用 `state.snapshot_id` 向 SnapshotManager 取对应快照。LangGraph 的 API 随版本变化，以所锁定版本的官方文档为准，并为图写测试。

### A.2 大模型客户端（OpenAI 兼容）

```python
from openai import OpenAI
import json_repair

class LLMClient:
    def __init__(self, cfg):               # cfg: base_url, api_key, model
        self.model = cfg['model']
        self.c = OpenAI(base_url=cfg['base_url'], api_key=cfg['api_key'])

    def json(self, system, user, schema=None, retries=2):
        for _ in range(retries + 1):
            r = self.c.chat.completions.create(
                model=self.model, temperature=0,
                messages=[{'role': 'system', 'content': system},
                          {'role': 'user', 'content': user}])
            try:
                data = json_repair.loads(r.choices[0].message.content)
                return schema.model_validate(data) if schema else data
            except Exception:
                continue
        raise ValueError('LLM JSON 解析失败')
```

`configs/models.yaml`：

```yaml
tasks:
  extract:  {provider: qwen, model: <模型名>}
  generate: {provider: qwen, model: <模型名>}
  judge:    {provider: deepseek, model: <模型名>}   # 必须与 generate 不同厂商
providers:
  qwen:    {base_url: <base url>, api_key_env: QWEN_API_KEY}
  deepseek: {base_url: <以官方文档为准>, api_key_env: DEEPSEEK_API_KEY}
```

### A.3 受限检索 Agent（Researcher 节点内部）

```python
import json

def retrieve_agent(q, llm, tools, max_steps=4, max_evidence=12):
    seen, ev = set(), []
    for _ in range(max_steps):
        act = llm.json(system=load_prompt('agent_step'),
                       user=json.dumps({'question': q.text_zh, 'queries_de': q.queries_de,
                                        'have': [e.ref_id for e in ev],
                                        'tools': list(tools)}, ensure_ascii=False))
        if act.get('action') == 'finish' or len(ev) >= max_evidence:
            break
        if act.get('action') not in tools:
            continue
        for r in tools[act['action']](**act.get('args', {})):
            if r.ref_id not in seen:
                seen.add(r.ref_id)
                ev.append(r)
    return ev
```

### A.4 FastAPI 骨架

```python
import json, hashlib
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Header, HTTPException, Request
from sse_starlette.sse import EventSourceResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.snapshots = SnapshotManager(keep=2)    # 只读快照库与索引：当前＋上一个
    app.state.embedder = load_bge_m3()
    app.state.reranker = load_reranker()
    app.state.tokens = load_tokens('configs/tokens.yaml')   # {sha256(token): {'role':..., 'owner':...}}
    app.state.graph = build_graph(llm, app.state.snapshots, checkpointer)
    yield

app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter

def get_principal(request: Request, authorization: str = Header(...)):
    token = authorization.removeprefix('Bearer ').strip()
    p = request.app.state.tokens.get(hashlib.sha256(token.encode()).hexdigest())
    if not p:
        raise HTTPException(status_code=401)
    return p

def own_case(case_id: str, p=Depends(get_principal)):
    reg = registry.get(case_id)
    if not reg or reg['owner'] != p['owner'] or reg['deleted_at']:
        raise HTTPException(status_code=404)         # 不暴露案件是否存在
    return reg

@app.post('/cases/{case_id}/run')
@limiter.limit('20/minute')
async def run_case(request: Request, case_id: str, p=Depends(get_principal), reg=Depends(own_case)):
    check_feature(p['role'], 'run_workflow')         # 按 roles.yaml 校验功能开关，越权 403
    check_budget(p['owner'])                         # usage_counters 超限返回 429
    job_id = start_job(app, case_id, snapshot_id=reg['snapshot_id'])   # 沿用案件固定的快照
    return {'job_id': job_id}                        # CPU 密集调用用 asyncio.to_thread 包裹

@app.get('/cases/{case_id}/events')
async def events(case_id: str, after: int = 0, last_event_id: str | None = Header(None),
                 reg=Depends(own_case)):
    start = int(last_event_id) if last_event_id else after
    async def gen():
        async for ev in job_events(case_id, after=start):   # 先回放 events 表中 rowid > start 的事件，再推送新事件
            yield {'id': str(ev['rowid']), 'event': ev['type'], 'data': json.dumps(ev, ensure_ascii=False)}
    return EventSourceResponse(gen())

@app.post('/cases/{case_id}/confirm/{gate}')
async def confirm(case_id: str, gate: str, body: dict, reg=Depends(own_case)):
    resume_job(app, case_id, gate, body)             # 内部执行 Command(resume=body)
    return {'ok': True}

@app.delete('/cases/{case_id}')
async def delete_case(case_id: str, reg=Depends(own_case)):
    purge_case(case_id)       # 删除输入、状态、checkpoint、版本与含用户文本的反馈，保留脱敏统计
    return {'ok': True}

@app.post('/internal/reload')
async def reload_snapshot(request: Request):
    if request.client.host not in ('127.0.0.1', '::1'):
        raise HTTPException(status_code=403)
    request.app.state.snapshots.reload()             # 读取 data/current_snapshot，加载新快照并保留上一个
    return {'ok': True}
```

## 附录 B：依赖清单

Python 3.11 及以上，Node 20 及以上。LangGraph 与引用解析库的 API 随版本变化，须锁定版本（pip-compile 或 uv lock；package-lock.json）。

```
# 后端
httpx  tenacity  lxml  pyyaml  pydantic>=2  pandas
rank-bm25  snowballstemmer  rapidfuzz
FlagEmbedding  faiss-cpu  torch
openai  json-repair
fastapi  uvicorn  sse-starlette  slowapi
langgraph  langgraph-checkpoint-sqlite
python-docx  jinja2  PyMuPDF
bundesrecht                 # 法条引用规范化与解析（首选）
legal-reference-extraction  # refex：候选抽取与案号
split-words                 # CharSplit 的打包版，拆分器对比用；或 charsplit-fst
pytest  ranx
# 可选：ragas（离线抽样）  langfuse  llama-index（图抽取对比实验）
# 可选：networkx 或 igraph（内存图对比）  duckdb（DuckPGQ 对比实验，固定 1.4.x）

# 前端（npm）
react  vite  typescript  tailwindcss  shadcn/ui  react-router
openapi-typescript  @playwright/test
```

## 附录 C：第一周启动清单

1. 建仓库与目录结构，约定 snapshot\_id 格式（日期）；锁定依赖版本。
2. 定义 API 契约 v0（pydantic 模型与路由），导出 OpenAPI；前端脚手架用 openapi-typescript 生成客户端。
3. 实测 `gii-toc.xml` 与 `rii-toc.xml`，保存样本；确认判决 XML 的实际字段名。
4. 下载 BGB 的 xml.zip，解析并核对 § 433 的条号、标题、正文与 Absatz、Nummer 结构。
5. 入库到快照目录并写 `norm_lookup` 单测：`BGB:§433`、`HGB:§377` 必须存在。
6. 接通 `LLMClient`，跑通一次 JSON 抽取与 pydantic 校验。
7. 向法学团队下发案例 YAML 模板（含 contract\_date、event\_date、claims\_zh、materials、gold\_elements、gold\_issues、gold\_match）、术语库模板（含 relation、zh\_forbidden）、timepoints.yaml 模板和要件模板（含 need\_cases、need\_materials、match\_facts、fact\_slots），要求本周交首批 10 题；同时发送 9.3 的工作量估算请其确认。
8. 安装 bundesrecht 与 refex，各跑 20 条样例引用，确认 API 与输出格式（ff. 是否保持不展开），写适配层草稿。
9. 下载公开的德国法定引用标注集（PaDaS-Lab legal-reference-annotations），核对许可，抽样作为 E7 的一部分。
10. 准备 200 个法律复合词测试集，安装 split-words（或 charsplit-fst），跑通原模型的拆分示例。
11. 下载 BGE-M3（ModelScope 或镜像），对 100 条法条做嵌入冒烟测试。
12. 确认模型 API 的 base\_url、模型名、并发与速率限制，并配置第二家厂商模型作裁判与故障切换备用。
13. 建运行库表 `data_sources`、`feedback`、`update_runs`、`norm_changes`、`report_lineage`、`case_registry`、`consents`、`report_versions`、`usage_counters`，登记 gii 与 rii 两个来源并记录许可核查日期；开启 WAL 与 busy\_timeout。
14. 写结构契约样本（BGB § 433、HGB § 377）与 `quality_gate.yaml` 初始阈值，跑通一次 `--dry-run` 更新，并验证指针切换与 `POST /internal/reload`。
15. 与法学团队约定回归集模板（开发集 20 题加反馈沉淀 10 题）和反馈错误类型清单（含 fact\_error）。
16. 约定咨询准备包（B 部分）的功能说明、页首声明和对外宣传用语，避免“替代律师”类宣称，并请法学团队确认面向公众服务的定位与备案要求。
17. 准备诱导越界的提问（目标 60–100 条，如“我能赢吗”“帮我判断赔多少”）和提示注入用例，用于 V8 单测与 E9。
18. 约定令牌分发方式，写 `tokens.yaml`（只存哈希）与 `limits.yaml` 初始限额，跑通 401、403、404 与 429 的用例。
19. 写 PII 脱敏规则与测试集，约定保留期（默认 90 天）与删除流程。
20. 与法学团队试写一个要件的 `fact_slots`（如“解除的前提”），确认粒度合适后再批量写模板。

## 附录 D：变更记录（v0.2–v0.6）

历史变更摘要按版本倒序排列；最新版本（v0.7）的摘要见文档开头。

**v0.6 变更摘要**（相对 v0.5；已做完整性与一致性检查）

| 变更 | 内容 | 涉及章节 |
| --- | --- | --- |
| 案情分析层（新增） | 争点提取与分析、要件—事实匹配与证据链、类案相似与差异、咨询准备包与提问清单（F29–F32）；只输出适用条件与依据，不输出裁判预测 | 3.6、5.7 |
| 边界重定义 | 原“不做争议焦点预判”改为“不做裁判预测、胜诉概率与倾向性结论”；以输出分级和允许、不允许对照表固化边界 | 0、5.7、6.2（V8） |
| 事实溯源 | 新增案情事实 F# 与证据材料 M#；新增 V10 事实溯源、V11 证据链一致性；Critic 路由增加 Matcher 回修 | 5.1、5.2、6.2、附录 A |
| 角色分级 | 公共端为咨询准备简版；司法端只做梳理、不做适用结论；实务端完整 | 5.7、7.1、7.3 |
| 评测与周期 | 新增 E9 与越界表述率、事实溯源错误数等指标；周期由 10 周改为 12 周；功能编号统一为 F01–F32 | 2、8、9 |

**v0.5 变更摘要**（相对 v0.4；已做完整性与一致性检查）

| 变更 | 内容 | 涉及章节 |
| --- | --- | --- |
| 评测与监控 | 分层报告；固定回归集、漂移监控与变更门禁；线上 5% 抽检；可用性测试 | 8.8、8.9、9 |
| 用户体验 | 要件—证据矩阵与检索轨迹视图；S8 结构化反馈入库；受限多轮交互（S1 追问、追加问题）；面向非技术用户的设计 | 3.4、3.5、4.2、5.6 |
| 数据治理 | 评测冻结快照与运行库更新双轨；手动更新流程与质量闸门；差异报告联动时点警示表；积累版本史；来源登记与报告血缘 | 4.2、4.8 |
| 功能编号 | 新增 F26 数据更新与质量闸门、F27 反馈与可解释展示、F28 回归与漂移监控，全文编号统一为 F01–F28 | 2、9、11 |

**v0.4 变更摘要**（相对 v0.3；已做完整性与一致性检查）

| 变更 | 内容 | 涉及章节 |
| --- | --- | --- |
| 统一逻辑视图 | 把混合检索、确定性检索、图增强、Agentic 检索、证据充分性、溯源式生成、引用核验七层统一表述为“证据中心的 Agentic Hybrid RAG”；只是逻辑视图，代码模块与 LangGraph 节点边界不变，生成与核验仍然分离 | 3.6 |
| 证据充分性（新增） | Researcher 内部新增 S5：按要件判定 covered、partial、missing，规则优先，LLM 只复核 partial 且须已有证据；不足则改写检索，最多 2 轮，无新增证据即停 | 5.1、5.2、5.5 |
| 要件—证据结构 | 状态对象新增 `elements`；要件—证据对应表由检索阶段确定性生成；Drafter 按要件组织陈述；V7 改为复核充分性结论 | 4.5、5.1、5.4、6.2、6.5 |
| 评测 | 新增“误判充分率”与“充分性判定一致率”，新增充分性判断开关的消融实验 | 8.1、8.2、8.3 |

**v0.3 变更摘要**（相对 v0.2；已做完整性与一致性检查）

| 变更 | 内容 | 涉及章节 |
| --- | --- | --- |
| 图查询 | 保持 SQLite 边表；增加扇出上限、热门法条物化表和切换触发条件；DuckPGQ 与内存图只作对比实验 | 4.6、9、10 |
| 引用解析 | 两层结构：候选抽取（refex 或宽松正则）→ bundesrecht 规范化 → 查库；案号单独处理；ff. 不展开；法条正文保留 Absatz、Nummer 结构；E7 用公开标注集 | 4.2、4.3、6.1、8.1 |
| 复合词 | 拆分器可插拔，自写词表法、CharSplit、重训 CharSplit 三方对比，以 E1 召回选型 | 4.4、8.3 |
| 时点 | 版本表 norm\_versions；强制填合同订立日与事实发生日；红黄两态，不设绿；专家维护时点警示表 | 4.2、4.7、5.2、6.2 |
| 翻译与比较法 | S6 拆为 S6a 翻译与 S6b 起草；术语库增加 relation 与 zh\_forbidden；新增 V9 概念溯源检查与 E8 污染率评测 | 4.5、5.2、6.2、8 |

**v0.2 变更摘要**（相对 v0.1；已做完整性与一致性检查，Streamlit 相关表述、周期、功能编号已全文统一）

| 变更 | 内容 | 涉及章节 |
| --- | --- | --- |
| 服务与前端 | Streamlit 改为 FastAPI＋React（Vite、TypeScript） | 2、3、5、7、附录 |
| 编排 | 自写运行器改为 LangGraph：Researcher、Drafter、Critic 三个角色节点，checkpoint 与人工 interrupt | 5、附录 A |
| 引证解析 | 手写正则改为专用库适配层，并增加“未解析引用”安全失败机制 | 4.2、6.1 |
| 复合词 | 索引与查询两侧对称拆分，LLM 改写只作补充 | 4.4 |
| 图谱 | 增加本体 v0、带出处的边表与图扩展，暂不引入图数据库 | 4.2、4.6 |
| 评测与展示 | 确定性指标自写；Ragas 仅离线抽样；用户界面用可核验计数的校验仪表盘，不展示 LLM 抽象分数 | 6.5、8 |
| 周期与测试 | 8 周改为 10 周；新增测试策略 | 9 |
