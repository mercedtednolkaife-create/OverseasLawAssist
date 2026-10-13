import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

os.makedirs('figures', exist_ok=True)

plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'SimSun']
plt.rcParams['axes.unicode_minus'] = False

def create_fig1_architecture():
    fig, ax = plt.subplots(figsize=(10.5, 7.6), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    # 5层架构，从顶向下依次排列，严格计算坐标与间隙
    layers = [
        {
            "layer_name": "表现层 (Presentation Layer)",
            "tech": "React 19 | TypeScript | Tailwind CSS | Vite 8",
            "items": "机构级工作台界面  |  全景研判看板  |  胜败边界推演矩阵  |  证据链拓扑图谱  |  DOCX 双包文书导出",
            "y": 81, "h": 15
        },
        {
            "layer_name": "服务通信层 (Service & Transport Layer)",
            "tech": "FastAPI | SSE EventSource 异步总线 | 依赖注入",
            "items": "RESTful 路由矩阵 (/cases, /search, /verify)  |  实时事件广播流  |  人在回路 (HITL) 拦截器",
            "y": 61, "h": 15
        },
        {
            "layer_name": "核心推理层 (Workflow Orchestration Layer)",
            "tech": "LangGraph Stateful DAG 确定性状态图 | CaseState 状态机",
            "items": "S1事实抽取 -> S2准据法前检 -> S3争点拆解 -> S4双通道检索 -> S5要件涵摄 -> S6攻防推演 -> S7起草审查",
            "y": 41, "h": 15
        },
        {
            "layer_name": "知识引擎与算法层 (Knowledge Engine & RAG Layer)",
            "tech": "双通道检索 | 递归 CTE 图遍历 | Shepardizing 门禁",
            "items": "形态学对称分词  |  BM25 词法全文检索  |  BGE-M3 FAISS 向量索引 (CUDA)  |  RRF 融合排序  |  先例存续验真",
            "y": 21, "h": 15
        },
        {
            "layer_name": "物理存储层 (Dual-SQLite Storage Layer)",
            "tech": "双数据库物理隔离架构 (Read-Only 快照库 + WAL 状态库)",
            "items": "快照库 law.sqlite (只读, 4642 法条, 5132 切片, 27 权威判例)  ||  运行库 state.sqlite (WAL 模式, 单写锁串行化)",
            "y": 1, "h": 15
        }
    ]
    
    for l in layers:
        # 主卡片外框 - 统一极简浅灰
        rect = patches.FancyBboxPatch((5, l["y"]), 90, l["h"], boxstyle="round,pad=0.6,rounding_size=1.2",
                                     facecolor="#F8FAFC", edgecolor="#64748B", linewidth=1.2)
        ax.add_patch(rect)
        
        # 标题栏底色细条（淡蓝灰）
        title_bar = patches.FancyBboxPatch((5, l["y"] + l["h"] - 5.5), 90, 5.5, boxstyle="round,pad=0.2,rounding_size=0.8",
                                          facecolor="#EDF2F7", edgecolor="#64748B", linewidth=1.0)
        ax.add_patch(title_bar)
        
        # 标题文字
        ax.text(7, l["y"] + l["h"] - 2.8, l["layer_name"], fontsize=10.5, fontweight='bold', color="#0F172A", va='center')
        ax.text(93, l["y"] + l["h"] - 2.8, l["tech"], fontsize=8.8, color="#475569", ha='right', va='center')
        
        # 内容条目文字
        ax.text(7, l["y"] + 4.5, l["items"], fontsize=9.0, color="#1E293B", va='center')
        
    # 层间下行连接箭头 - 精确放置在层与层之间的空白缝隙中（缝隙高度为 5 个单位）
    # Layer 1 底: 81，Layer 2 顶: 76 -> 箭头从 80.5 指向 76.5
    # Layer 2 底: 61，Layer 3 顶: 56 -> 箭头从 60.5 指向 56.5
    # Layer 3 底: 41，Layer 4 顶: 36 -> 箭头从 40.5 指向 36.5
    # Layer 4 底: 21，Layer 5 顶: 16 -> 箭头从 20.5 指向 16.5
    arrow_props = dict(facecolor='#475569', edgecolor='#334155', width=1.5, headwidth=5.5, headlength=5.5)
    gaps = [(80.5, 76.5), (60.5, 56.5), (40.5, 36.5), (20.5, 16.5)]
    for y_top, y_bot in gaps:
        ax.annotate('', xy=(50, y_bot), xytext=(50, y_top), arrowprops=arrow_props)
        
    plt.tight_layout()
    plt.savefig('figures/fig1_system_architecture.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Fig 1 cleanly generated.")

def create_fig2_workflow():
    # 采用标准两行流水线（S型正交流转），消除任何交叉与重叠
    fig, ax = plt.subplots(figsize=(11.8, 7.2), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # 背景分区弱化框（说明流转逻辑）
    r1_bg = patches.FancyBboxPatch((1.5, 57), 97, 38, boxstyle="round,pad=0.5,rounding_size=1.2",
                                  facecolor="#FAFAFA", edgecolor="#E2E8F0", linewidth=1.0)
    ax.add_patch(r1_bg)
    ax.text(3, 93, "【第一阶段：事实解析、准据法判定与争议焦点确认 (前置审核管线)】", fontsize=9.0, fontweight='bold', color="#475569")

    r2_bg = patches.FancyBboxPatch((1.5, 2), 97, 51, boxstyle="round,pad=0.5,rounding_size=1.2",
                                  facecolor="#FAFAFA", edgecolor="#E2E8F0", linewidth=1.0)
    ax.add_patch(r2_bg)
    ax.text(3, 50, "【第二阶段：双通道检索、要件事实涵摄、攻防推演与独立裁判门禁】", fontsize=9.0, fontweight='bold', color="#475569")

    # 第一行节点：从左至右
    # Start: x:3 to 15, y:63 to 75
    # S1: x:19 to 33, y:63 to 75
    # S2: x:37 to 51, y:63 to 75
    # Gate1: x:55 to 69, y:61 to 77
    # S3: x:73 to 85, y:63 to 75
    # Gate2: x:88 to 97, y:61 to 77

    def draw_node(x, y, w, h, text, is_gate=False, is_out=False):
        bg = "#EDF2F7" if is_out else ("#F1F5F9" if is_gate else "#FFFFFF")
        edge = "#0F172A" if is_out else ("#1E40AF" if is_gate else "#475569")
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.3,rounding_size=0.8",
                                     facecolor=bg, edgecolor=edge, linewidth=1.2)
        ax.add_patch(rect)
        tc = "#0F172A"
        ax.text(x + w/2, y + h/2, text, fontsize=8.6, fontweight='bold' if (is_gate or is_out) else 'normal',
                color=tc, ha='center', va='center', linespacing=1.3)

    # 绘制第一行节点
    draw_node(3, 63, 12, 12, "案情与诉求\n录入", is_gate=False)
    draw_node(19, 63, 14, 12, "S1 事实要素\n抽取 Agent", is_gate=False)
    draw_node(37, 63, 14, 12, "S2 准据法与\n时点前检", is_gate=False)
    draw_node(55, 61, 14, 16, "【人机闸门1】\nCISG公约\n排除核验", is_gate=True)
    draw_node(73, 63, 12, 12, "S3 法律争点\n拆解 Agent", is_gate=False)
    draw_node(88, 61, 9.5, 16, "【人机闸门2】\n争点范围\n核定确认", is_gate=True)

    # 第一行水平正向箭头
    fwd = dict(facecolor='#334155', edgecolor='#1E293B', width=1.2, headwidth=4.5, headlength=4.5)
    ax.annotate('', xy=(19, 69), xytext=(15, 69), arrowprops=fwd)
    ax.annotate('', xy=(37, 69), xytext=(33, 69), arrowprops=fwd)
    ax.annotate('', xy=(55, 69), xytext=(51, 69), arrowprops=fwd)
    ax.annotate('', xy=(73, 69), xytext=(69, 69), arrowprops=fwd)
    ax.annotate('', xy=(88, 69), xytext=(85, 69), arrowprops=fwd)

    # 闸门1 人工修改回退回路（位于上方空白专用通道 y=77..88）
    # 从 Gate1 顶部 (x=62, y=77) 向上至 83 -> 向左至 44 -> 向下至 S2 顶部 (x=44, y=75)
    ax.plot([62, 62, 44, 44], [77, 83, 83, 75.5], color='#475569', linestyle='--', linewidth=1.0)
    ax.annotate('', xy=(44, 75), xytext=(44, 76), arrowprops=dict(facecolor='#475569', edgecolor='#475569', width=1.0, headwidth=4, headlength=4))
    ax.text(53, 84.5, "未排除公约/人工重设准据法", fontsize=7.5, color='#475569', ha='center', va='bottom')

    # 闸门2 人工微调争点回路（位于上方空白专用通道 y=77..88）
    # 从 Gate2 顶部 (x=92.75, y=77) 向上至 83 -> 向左至 79 -> 向下至 S3 顶部 (x=79, y=75)
    ax.plot([92.75, 92.75, 79, 79], [77, 83, 83, 75.5], color='#475569', linestyle='--', linewidth=1.0)
    ax.annotate('', xy=(79, 75), xytext=(79, 76), arrowprops=dict(facecolor='#475569', edgecolor='#475569', width=1.0, headwidth=4, headlength=4))
    ax.text(86, 84.5, "人工微调/增删争点", fontsize=7.5, color='#475569', ha='center', va='bottom')

    # 第一行末尾转折下行至第二行：从 Gate2 底部 (92.75, 61) 向下至 S4 顶部 (92.75, 41)
    ax.annotate('', xy=(92.75, 41), xytext=(92.75, 61), arrowprops=fwd)
    ax.text(93.8, 51, "争点放行\n启动检索", fontsize=7.6, color='#1E40AF', fontweight='bold', va='center')

    # 第二行节点：从右向左推进
    # S4: x:84 to 98, y:29 to 41
    # S5: x:64 to 79, y:29 to 41
    # S6: x:44 to 59, y:29 to 41
    # S7: x:24 to 39, y:29 to 41
    # Critic: x:4 to 19, y:27 to 43 (闸门)
    draw_node(84, 29, 14, 12, "S4 双通道检索\n与图扩展", is_gate=False)
    draw_node(64, 29, 15, 12, "S5 要件事实\n四态涵摄", is_gate=False)
    draw_node(44, 29, 15, 12, "S6 策略推演与\n红队攻防", is_gate=False)
    draw_node(24, 29, 15, 12, "S7 双语意见书\n初稿起草", is_gate=False)
    draw_node(4, 27, 15, 16, "【独立裁判模型】\nV1-V11 质量门禁\n(客观防线核查)", is_gate=True)

    # 第二行水平向左箭头
    ax.annotate('', xy=(79, 35), xytext=(84, 35), arrowprops=fwd)
    ax.annotate('', xy=(59, 35), xytext=(64, 35), arrowprops=fwd)
    ax.annotate('', xy=(39, 35), xytext=(44, 35), arrowprops=fwd)
    ax.annotate('', xy=(19, 35), xytext=(24, 35), arrowprops=fwd)

    # Critic 门禁未通过的一票否决纠偏反馈回路（利用第二行上方的专用空道 y=43..48）
    # 从 Critic 顶部 (11.5, 43) 向上至 46 -> 向右至 51.5 (S6顶部上方) -> 向下至 S6 顶部 (51.5, 41)
    ax.plot([11.5, 11.5, 51.5, 51.5], [43, 46.5, 46.5, 41.5], color='#991B1B', linestyle='--', linewidth=1.1)
    ax.annotate('', xy=(51.5, 41), xytext=(51.5, 42), arrowprops=dict(facecolor='#991B1B', edgecolor='#991B1B', width=1.1, headwidth=4.5, headlength=4.5))
    ax.text(31.5, 47.8, "一票否决拦截 (携带审查意见打回 S6 重构推演)", fontsize=8.0, color='#991B1B', fontweight='bold', ha='center')

    # Critic 质检通过：严格垂直向下连接最终报告（实现竖直直线连接，严谨对称）
    # Critic 中心位于 x = 11.5，输出节点同样对称居中于 x = 11.5 (x: 2.5 to 20.5, w = 18)
    draw_node(2.5, 5, 18, 13, "终审成果输出\n标准 DOCX 双包文书\n(法庭查明包+咨询准备包)", is_gate=False, is_out=True)
    # 严格垂直向下直线箭头：从 (11.5, 26.5) 直线指向 (11.5, 18.5)
    ax.annotate('', xy=(11.5, 18.5), xytext=(11.5, 26.5),
                arrowprops=dict(facecolor='#0F172A', edgecolor='#0F172A', width=1.3, headwidth=5, headlength=5))
    ax.text(12.8, 22.5, "门禁通过", fontsize=8.0, color='#0F172A', fontweight='bold', va='center')

    plt.tight_layout()
    plt.savefig('figures/fig2_workflow_state.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Fig 2 cleanly regenerated.")

def create_fig3_evidence_chain():
    fig, ax = plt.subplots(figsize=(10.5, 4.8), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 50)
    ax.axis('off')
    
    cols = [
        {
            "title": "原始书证材料 (M#)", "x": 2, "w": 20,
            "items": ["M1: 跨境采购合同文本", "M2: 官方检验鉴定报告", "M3: 异议催告函件及回执", "M4: 对方拒绝补正书面函"]
        },
        {
            "title": "查明事实片段 (F#)", "x": 26, "w": 20,
            "items": ["F1: 准据法约定与CISG排除", "F2: 核心公差超标物之瑕疵", "F3: 商业合理期间发函异议", "F4: 对方终局拒绝履行事实"]
        },
        {
            "title": "法定构成要件 (EL#)", "x": 50, "w": 22,
            "items": ["EL1: 涉外有效合同关系成立", "EL2: 标的物存根本物之瑕疵", "EL3: 依法履即刻/合理通知", "EL4: 履行抗辩与催告豁免"]
        },
        {
            "title": "实体规范与救济 (§)", "x": 76, "w": 22,
            "items": ["§1: BGB §434 / UCC §2-608", "§2: HGB §377 / UCC §2-607", "§3: BGB §323 / UCC §2-711", "【主文】：解约退款与损害赔偿"]
        }
    ]
    
    for c in cols:
        # Header box (统一深石板灰)
        hdr = patches.FancyBboxPatch((c["x"], 42), c["w"], 6, boxstyle="round,pad=0.3,rounding_size=0.8",
                                    facecolor="#334155", edgecolor="#1E293B", linewidth=1.0)
        ax.add_patch(hdr)
        ax.text(c["x"] + c["w"]/2, 45, c["title"], fontsize=9.2, fontweight='bold', color="#FFFFFF", ha='center', va='center')
        
        # Item boxes (统一白底黑字，细边框)
        for i, item in enumerate(c["items"]):
            y_pos = 32 - i * 9.5
            box = patches.FancyBboxPatch((c["x"], y_pos), c["w"], 7.8, boxstyle="round,pad=0.3,rounding_size=0.8",
                                        facecolor="#F8FAFC", edgecolor="#64748B", linewidth=1.0)
            ax.add_patch(box)
            ax.text(c["x"] + c["w"]/2, y_pos + 3.9, item, fontsize=8.5, color="#0F172A", ha='center', va='center')

    # 水平链路箭头 (缝隙从 x_right_box 到 x_left_box)
    # M col: 2..22, F col: 26..46, EL col: 50..72, Norm col: 76..98
    # 箭头在缝隙 22..26, 46..50, 72..76 中绘制
    arrow_props = dict(facecolor='#475569', edgecolor='#334155', width=1.1, headwidth=4.5, headlength=4.5)
    for i in range(4):
        y_pos = 35.9 - i * 9.5
        ax.annotate('', xy=(25.5, y_pos), xytext=(22.5, y_pos), arrowprops=arrow_props)
        ax.annotate('', xy=(49.5, y_pos), xytext=(46.5, y_pos), arrowprops=arrow_props)
        ax.annotate('', xy=(75.5, y_pos), xytext=(72.5, y_pos), arrowprops=arrow_props)
        
    plt.tight_layout()
    plt.savefig('figures/fig3_evidence_chain.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Fig 3 cleanly generated.")

def create_fig4_dual_model():
    fig, ax = plt.subplots(figsize=(10.5, 5.8), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 72)
    ax.axis('off')
    
    parts = [
        {"name": "调度引擎\n(LangGraph)", "x": 10},
        {"name": "主推理模型\n(DeepSeek Flash)", "x": 36},
        {"name": "权威法源库\n(SQLite law.sqlite)", "x": 64},
        {"name": "独立裁判模型\n(DeepSeek Pro)", "x": 90}
    ]
    
    for p in parts:
        rect = patches.FancyBboxPatch((p["x"] - 9, 61), 18, 8.5, boxstyle="round,pad=0.3,rounding_size=0.8",
                                     facecolor="#334155", edgecolor="#0F172A", linewidth=1.0)
        ax.add_patch(rect)
        ax.text(p["x"], 65.25, p["name"], fontsize=8.8, fontweight='bold', color="#FFFFFF", ha='center', va='center')
        # 垂直生命线
        ax.plot([p["x"], p["x"]], [61, 5], color="#94A3B8", linestyle="--", linewidth=1.1)
        
    steps = [
        {"y": 53, "from": 10, "to": 36, "text": "1. 触发 S6/S7 研判起草与攻防推演", "color": "#1E3A8A"},
        {"y": 45, "from": 36, "to": 10, "text": "2. 返回结构化研判成果初稿", "color": "#1E3A8A"},
        {"y": 37, "from": 10, "to": 64, "text": "3. 校验法条与判例真实性 (V2/V3/V9 验真)", "color": "#334155"},
        {"y": 29, "from": 64, "to": 10, "text": "4. 返回官方现行条文与先例存续有效状态", "color": "#334155"},
        {"y": 21, "from": 10, "to": 90, "text": "5. 提交初稿与真实性上下文发起门禁审查", "color": "#334155"},
        {"y": 13, "from": 90, "to": 10, "text": "6. 门禁质检通过  /  一票否决拦截打回纠偏 (如触碰V8客观防线)", "color": "#991B1B"}
    ]
    
    for s in steps:
        ax.annotate('', xy=(s["to"], s["y"]), xytext=(s["from"], s["y"]),
                    arrowprops=dict(facecolor=s["color"], edgecolor=s["color"], width=1.1, headwidth=4.8, headlength=4.8))
        mid_x = (s["from"] + s["to"]) / 2
        ax.text(mid_x, s["y"] + 2.0, s["text"], fontsize=8.4, color=s["color"], fontweight='bold', ha='center', va='center')
        
    plt.tight_layout()
    plt.savefig('figures/fig4_dual_model_sequence.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Fig 4 cleanly generated.")

def create_fig5_us_architecture():
    fig, ax = plt.subplots(figsize=(10.5, 6.8), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 72)
    ax.axis('off')
    
    tiers = [
        {
            "tier": "Tier 1: 本地金标准成文法典与权威先例库",
            "content": "- 核心成文法精选：UCC (买卖/证券/担保 49条)、DGCL (7条)、28 U.S.C. 跨境调证 (12条)\n- 15 篇里程碑先例：涵盖 Eastern Air Lines、Intel v. AMD、Step-Saver 等全美权威判例\n- 拓扑图谱预编译：119 条边表与 47 条映射，检索成文法自动带出对应金标准判例",
            "y": 48, "h": 20
        },
        {
            "tier": "Tier 2: 动态扩展检索与 Shepardizing 效力状态机",
            "content": "- CourtListener 远程 API 穿透检索：覆盖全美联邦及各州法院海量判例库\n- 司法拘束力层级加权：最高法院 (1.00) > 巡回上诉法院 (0.85) > 州最高法院 (0.80)\n- Shepardizing 存续状态机：拦截 Overruled 等失效判例，杜绝援引坏法",
            "y": 25, "h": 20
        },
        {
            "tier": "Tier 3: 涉外司法实务定向校准器 (USAdmissibilityCalibrator)",
            "content": "- 对接最高法《涉外解释（二）》第三条：生成涉外审判规范文书与证明力指引\n- 五项涉美专属入口审查：选法效力、CISG排斥、UCC商人认定、时效及海牙认证\n- 诉讼举证责任划分：输出八项法定必备审查要素合规证明报告",
            "y": 2, "h": 20
        }
    ]
    
    for t in tiers:
        rect = patches.FancyBboxPatch((5, t["y"]), 90, t["h"], boxstyle="round,pad=0.6,rounding_size=1.2",
                                     facecolor="#F8FAFC", edgecolor="#64748B", linewidth=1.2)
        ax.add_patch(rect)
        
        t_bar = patches.FancyBboxPatch((5, t["y"] + t["h"] - 6.2), 90, 6.2, boxstyle="round,pad=0.2,rounding_size=0.8",
                                      facecolor="#EDF2F7", edgecolor="#64748B", linewidth=1.0)
        ax.add_patch(t_bar)
        
        ax.text(8, t["y"] + t["h"] - 3.2, t["tier"], fontsize=11.5, fontweight='bold', color="#0F172A", va='center')
        ax.text(8, t["y"] + 6.8, t["content"], fontsize=9.8, color="#1E293B", va='center', linespacing=1.65)
        
    # 纵向层级流动箭头 - 精确放置在缝隙中（缝隙为 45..48 和 22..25）
    arrow_props = dict(facecolor='#475569', edgecolor='#334155', width=1.5, headwidth=5.5, headlength=5.5)
    # Tier 1 底: 48，Tier 2 顶: 45 -> 箭头从 (50, 47.6) 指向 (50, 45.4)
    ax.annotate('', xy=(50, 45.4), xytext=(50, 47.6), arrowprops=arrow_props)
    # Tier 2 底: 25，Tier 3 顶: 22 -> 箭头从 (50, 24.6) 指向 (50, 22.4)
    ax.annotate('', xy=(50, 22.4), xytext=(50, 24.6), arrowprops=arrow_props)
    
    plt.tight_layout()
    plt.savefig('figures/fig5_us_architecture.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Fig 5 cleanly generated.")

if __name__ == '__main__':
    create_fig1_architecture()
    create_fig2_workflow()
    create_fig3_evidence_chain()
    create_fig4_dual_model()
    create_fig5_us_architecture()
    print("All figures successfully created with zero overlap.")
