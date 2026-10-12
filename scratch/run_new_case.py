import json
import time
import urllib.request
import sys

sys.stdout.reconfigure(encoding='utf-8')

payload = {
    "title": "德尔奇公司诉罗托雷克斯公司跨国工业空调压缩机质量瑕疵与违约损害赔偿案 (Delchi Carrier v. Rotorex, 71 F.3d 1024)",
    "facts_zh": "1988年1月20日，原告意大利工业设备制造商德尔奇公司（Delchi Carrier SpA）与被告美国纽约罗托雷克斯公司（Rotorex Corp.）订立跨国货物买卖合同。合同约定被告向原告供应10,800台专用工业空调压缩机，用于原告当年夏季投产的Ariele便携式空调系列产品，合同总价约55万美元，约定以信用证结算。1988年5月18日，首批压缩机运抵原告意大利装配工厂。原告进厂上线调试检验时发现，该批压缩机实际制冷效能显著低于合同规格与前期样品标准，且运转功耗较额定标准超标达18%，无法在Ariele空调中正常安全使用。原告于到货后3日内（1988年5月21日）向被告发送正式书面异议与催告函，要求被告派员检修或紧急调换符合规格之压缩机。被告虽派工程师前往现场但无法在合理期限内完成技术修复，亦明确表示无法在夏季销售窗口期前更换合格批次。原告遂通知解除合同后续批次并拒付剩余款项，为缓解夏季供货危机紧急以更高价格向三洋公司（Sanyo）转采购替代压缩机，但由于替代货源交期受限仍导致当年夏季Ariele空调减产并遭受重大预期利润损失。原告在纽约联邦地区法院提起违约赔偿诉讼，主张直接损失、替代采购差价、仓储测试附随损失及利润损失赔偿。",
    "claims_zh": "1. 确认被告交付不符合约定质量与适销性标准之压缩机构成重大实质违约；\n2. 判令被告赔偿原告因标的物瑕疵导致的直接损失、前期调试检测与仓储附随损失共计28,000美元；\n3. 判令被告赔偿因替代采购转交易产生的合理差价损失及相关运输关税附随费用；\n4. 判令被告赔偿原告因当季便携空调订单灭失与产能受阻遭受的合理可预见利润损失 (Consequential Damages - Lost Profits) 计546,377美元。",
    "meta": {
        "jurisdiction": "us_federal",
        "contract_type": "国际工业设备买卖合同",
        "parties": ["买受人意大利德尔奇公司 (Delchi Carrier SpA)", "出卖人美国纽约罗托雷克斯公司 (Rotorex Corp.)"],
        "contract_date": "1988-01-20",
        "event_date": "1988-05-18",
        "choice_of_law": "美国统一商法典 (UCC) 及纽约商事法 (约定适用美国商法规则)",
        "cisg_excluded": False,
        "both_merchants": True
    },
    "materials": [
        {
            "name": "10800台专用工业压缩机买卖合同及技术规格说明书",
            "desc_zh": "载有产品制冷功率、功耗上限参数及争议解决准据法选定条款",
            "excerpt_zh": "Rotorex agrees to sell 10,800 compressors conforming to sample specifications and New York UCC standards."
        },
        {
            "name": "进厂上线综合能效检测报告",
            "desc_zh": "意大利工厂技术检测中心出具，载明实测制冷效率偏离达22.4%，功耗超标18.2%",
            "excerpt_zh": "Compressors fail cooling capacity benchmark test and exhibit excessive heat dissipation."
        },
        {
            "name": "紧急质量异议电报及补正催告函",
            "desc_zh": "证明买受人于发现瑕疵后3日内即刻发出合理异议通知并给予补正机会",
            "excerpt_zh": "Notice of breach sent May 21, 1988 demanding immediate cure within reasonable time under UCC 2-607."
        },
        {
            "name": "三洋公司替代采购发票及夏季订单取消统计表",
            "desc_zh": "证明替代采购差价、特定物料报废损失及夏季已确认订单被取消之利润损失",
            "excerpt_zh": "Sanyo replacement invoices and confirmed cancellation records from European distributors."
        }
    ],
    "consent_version": "v1.0",
    "mode": "lite"
}

print("=== 1. 向 API 发送创建案件请求 ===")
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/cases",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        case_id = res_data["case_id"]
        print(f"创建成功! 分配案号: {case_id}")
        init_state = res_data.get("initial_state", {})
        print(f"初始状态: {init_state.get('status')}, 节点: {init_state.get('current_node')}")
        print(f"事实数量: {len(init_state.get('facts', []))}, 诉求数量: {len(init_state.get('claims', []))}")
except Exception as e:
    print(f"创建案件失败: {e}")
    sys.exit(1)

print("\n=== 2. 轮询流水线执行状态 ===")
start_time = time.time()
max_wait = 180  # 最多等待 3 分钟

while time.time() - start_time < max_wait:
    try:
        wf_url = f"http://127.0.0.1:8000/api/cases/{case_id}/workflow"
        with urllib.request.urlopen(wf_url) as resp:
            wf_data = json.loads(resp.read().decode("utf-8"))
            steps = wf_data.get("steps", [])
            overall = wf_data.get("overall_status")
            curr_step = wf_data.get("current_step")
            
            step_summary = " -> ".join([f"{s['title']}[{s['status']}]" for s in steps])
            print(f"[{int(time.time() - start_time)}s] 状态: {overall} (当前: {curr_step}) | 步骤: {step_summary}")
            
            if overall == "completed":
                print("\n>>> 工作流全部 7 阶段圆满执行完成! <<<")
                break
    except Exception as e:
        print(f"轮询异常: {e}")
    time.sleep(3)
else:
    print("\n工作流超时未在限定时间内完成")

print("\n=== 3. 验证数据库持久化 ===")
detail_url = f"http://127.0.0.1:8000/api/cases/{case_id}"
with urllib.request.urlopen(detail_url) as resp:
    case_detail = json.loads(resp.read().decode("utf-8"))
    print(f"最终案号: {case_detail.get('case_id')}")
    print(f"最终状态: {case_detail.get('status')}")
    print(f"证据数量: {len(case_detail.get('evidence', {}))}")
    print(f"要素数量: {len(case_detail.get('elements', []))}")
    print(f"翻译数量: {len(case_detail.get('translations', {}))}")
    print(f"裁判分析/陈述数量: {sum(len(f.get('statements', [])) for f in case_detail.get('findings', []))}")
    sa = case_detail.get("strategic_assessment")
    if sa:
        print(f"红队推演核心判定: {sa.get('core_verdict')}")
        print(f"红队推演致命抗辩: {sa.get('fatal_defenses')}")
        print(f"红队推演攻防论点: {len(sa.get('attack_vectors', []))} 条攻击, {len(sa.get('defense_shields', []))} 条抗辩")
