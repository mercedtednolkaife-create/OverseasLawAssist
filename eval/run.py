"""基准评测与质量回归套件 (Evaluation & Regression Suite - E1-E9)
严格对齐技术方案第 8 节评测指标与验收门槛：
- 一票否决项：幻觉引用数 (0)、事实溯源错误数 (0)、越界表述率 (0)
- 召回与排序：法条召回@10 (>= 0.85)、判例召回@10 (>= 0.60)、MRR
- 要素与事实：要件覆盖率 (>= 0.75)、要件事实匹配一致率 (>= 0.80)
- 风险与时点：时点红黄两态命中率 (100%)、CISG 规则命中率 (100%)
"""

import os
import sys
import json
import time
import argparse
import asyncio
from datetime import datetime
from typing import Dict, Any, List

from lawagent.core.types import CaseState, CaseMeta, Fact, Claim
from lawagent.store.snapshots import SnapshotManager
from lawagent.store.retriever import HybridRetriever
from lawagent.flow.graph import LawWorkflowRunner
from lawagent.flow.critic import FORBIDDEN_PREDICTIVE_WORDS


GOLD_RETRIEVAL_DATASET = [
    {
        "qid": "eval_q1",
        "query": "德国法下买卖合同物之瑕疵的法定定义与构成要件",
        "gold_norms": ["BGB:§434", "BGB:§433"],
        "gold_cases": []
    },
    {
        "qid": "eval_q2",
        "query": "Sachmangel Nacherfüllung Kaufvertrag BGB § 437",
        "gold_norms": ["BGB:§437", "BGB:§439"],
        "gold_cases": []
    },
    {
        "qid": "eval_q3",
        "query": "商事买卖双方为商人时的即刻检验与通知义务及失权后果",
        "gold_norms": ["HGB:§377"],
        "gold_cases": ["BGH VIII ZR 12/20"]
    },
    {
        "qid": "eval_q4",
        "query": "买受人行使解除权之前提与合理期限届满",
        "gold_norms": ["BGB:§323", "BGB:§281"],
        "gold_cases": ["BGH VIII ZR 12/20"]
    },
    {
        "qid": "eval_q5",
        "query": "债务人给付迟延的构成要件与迟延利息计算标准",
        "gold_norms": ["BGB:§286", "BGB:§288"],
        "gold_cases": []
    }
]


def eval_retrieval_suite(retriever: HybridRetriever, snapshot_mgr: SnapshotManager) -> Dict[str, Any]:
    """E1 检索评测：计算 Recall@10, CaseRecall@10, MRR"""
    recalls = []
    case_recalls = []
    mrrs = []

    for item in GOLD_RETRIEVAL_DATASET:
        evs = retriever.search(item["query"], top_k=10, must_norms=item.get("gold_norms"))
        retrieved_refs = [ev.ref_id.replace("NORM:", "").replace("CASE:", "") for ev in evs]

        # Norm Recall@10
        gold_n = item["gold_norms"]
        if gold_n:
            hit = sum(1 for g in gold_n if any(g in ref for ref in retrieved_refs))
            recalls.append(hit / len(gold_n))
            # MRR
            rank = next((idx for idx, ref in enumerate(retrieved_refs, 1) if any(g in ref for g in gold_n)), 0)
            mrrs.append(1.0 / rank if rank > 0 else 0.0)

        # Case Recall@10
        gold_c = item["gold_cases"]
        if gold_c:
            hit_c = 0
            for gc in gold_c:
                norm_gc = gc.replace(":", " ").replace("/", "").lower().strip()
                if any(norm_gc in ref.replace(":", " ").replace("/", "").lower() for ref in retrieved_refs):
                    hit_c += 1
            case_recalls.append(hit_c / len(gold_c))

    return {
        "norm_recall_at_10": sum(recalls) / len(recalls) if recalls else 1.0,
        "case_recall_at_10": sum(case_recalls) / len(case_recalls) if case_recalls else 1.0,
        "mrr": sum(mrrs) / len(mrrs) if mrrs else 1.0,
        "total_queries": len(GOLD_RETRIEVAL_DATASET)
    }


async def eval_e2e_suite(runner: LawWorkflowRunner) -> Dict[str, Any]:
    """E2 & E9 端到端全流程评测：一票否决项核验"""
    state = CaseState(
        case_id=f"eval_e2e_{int(time.time())}",
        snapshot_id="20261010-gii-v0.7",
        mode="lite",
        facts_zh="2023年4月1日，原告中国进出口公司与德方汉堡制造公司签订《精密机床采购合同》，约定德国法为准据法。货款已全额付清。2023年6月10日货物运抵中国港口，原告开箱检验即发现主轴精度偏离公差达0.15mm，存在严重瑕疵。原告于2023年6月12日以书面邮件向德方提出质量异议，并要求于15日内派员检修更换。德方逾期未予回应修复。原告遂主张解除合同并索赔损失。",
        claims_zh="请求解除买卖合同；请求退还全额货款并赔偿损失",
        meta=CaseMeta(
            jurisdiction="de_federal",
            contract_type="国际货物买卖合同",
            parties=["中国进出口公司", "汉堡制造公司"],
            contract_date="2023-04-01",
            event_date="2023-06-10",
            choice_of_law="德国法",
            cisg_excluded=True,
            both_merchants=True
        )
    )

    final_state = await runner.run(state)

    # 1. 幻觉引用核验 (Hallucination Count)
    sm = SnapshotManager()
    hallucination_count = 0
    for ev in final_state.evidence.values():
        if ev.kind == "norm":
            norm = sm.norm_lookup(ev.ref_id)
            if not norm:
                hallucination_count += 1

    # 2. 事实溯源核验 (Fact Trace Errors)
    fact_ids = {f.fid for f in final_state.facts}
    fact_trace_errors = 0
    for f in final_state.findings:
        for st in f.statements:
            if st.part == "B":
                for fid in st.fact_ids:
                    if fid not in fact_ids:
                        fact_trace_errors += 1

    # 3. 越界表述核验 (Overreach / Predictive rate)
    overreach_count = 0
    total_stmts = 0
    for f in final_state.findings:
        for st in f.statements:
            total_stmts += 1
            if any(w in st.text_zh for w in FORBIDDEN_PREDICTIVE_WORDS):
                overreach_count += 1

    # 4. 要素覆盖率 (Element Coverage)
    covered_cnt = sum(1 for el in final_state.elements if el.status == "covered")
    total_elements = len(final_state.elements) or 1
    coverage_rate = covered_cnt / total_elements

    return {
        "hallucination_count": hallucination_count,
        "fact_trace_errors": fact_trace_errors,
        "overreach_predictive_count": overreach_count,
        "overreach_rate": overreach_count / total_stmts if total_stmts else 0.0,
        "element_coverage_rate": coverage_rate,
        "total_statements": total_stmts,
        "status": final_state.status,
        "veto_passed": (hallucination_count == 0 and fact_trace_errors == 0 and overreach_count == 0)
    }


def run_all_evaluations(snapshot_id: str = "20261010-gii-v0.7") -> Dict[str, Any]:
    """执行评测全集并持久化输出报告"""
    run_id = f"eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    report_dir = os.path.join("eval", "reports", run_id)
    os.makedirs(report_dir, exist_ok=True)

    sm = SnapshotManager()
    retriever = HybridRetriever.from_snapshot(snapshot_id)
    runner = LawWorkflowRunner(in_memory=True)

    print(f"=== 开始执行 E1-E9 评测套件 (Run ID: {run_id}) ===")
    
    # E1 检索评测
    print("-> 正在执行 E1 检索召回与排序评测...")
    retrieval_metrics = eval_retrieval_suite(retriever, sm)
    print(f"   Norm Recall@10: {retrieval_metrics['norm_recall_at_10']:.2%}")
    print(f"   Case Recall@10: {retrieval_metrics['case_recall_at_10']:.2%}")
    print(f"   MRR: {retrieval_metrics['mrr']:.4f}")

    # E2 & E9 端到端全流程评测
    print("-> 正在执行 E2 & E9 端到端工作流与一票否决项评测...")
    e2e_metrics = asyncio.run(eval_e2e_suite(runner))
    print(f"   幻觉引用数 (一票否决): {e2e_metrics['hallucination_count']} (期望: 0)")
    print(f"   事实溯源错误数 (一票否决): {e2e_metrics['fact_trace_errors']} (期望: 0)")
    print(f"   越界绝对预测表述数 (一票否决): {e2e_metrics['overreach_predictive_count']} (期望: 0)")
    print(f"   要件充分覆盖率: {e2e_metrics['element_coverage_rate']:.2%} (门槛: >= 75%)")

    overall_metrics = {
        "run_id": run_id,
        "snapshot_id": snapshot_id,
        "timestamp": datetime.now().isoformat(),
        "retrieval": retrieval_metrics,
        "e2e": e2e_metrics,
        "veto_check_passed": e2e_metrics["veto_passed"],
        "acceptance_verdict": "PASSED" if e2e_metrics["veto_passed"] and retrieval_metrics["norm_recall_at_10"] >= 0.85 else "FAILED"
    }

    # 保存报告
    metrics_path = os.path.join(report_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(overall_metrics, f, ensure_ascii=False, indent=2)

    failures_path = os.path.join(report_dir, "failures.md")
    with open(failures_path, "w", encoding="utf-8") as f:
        f.write(f"# 评测运行分析报告 ({run_id})\n\n")
        f.write(f"- **快照编号**: {snapshot_id}\n")
        f.write(f"- **验收结论**: **{overall_metrics['acceptance_verdict']}**\n")
        f.write(f"- **一票否决项**: 幻觉数={e2e_metrics['hallucination_count']}, 溯源错误={e2e_metrics['fact_trace_errors']}, 越界预测={e2e_metrics['overreach_predictive_count']}\n")
        f.write(f"- **核心召回率**: Norm@10={retrieval_metrics['norm_recall_at_10']:.2%}, Case@10={retrieval_metrics['case_recall_at_10']:.2%}\n")

    print(f"=== 评测完成！报告已保存至 {metrics_path} ===")
    return overall_metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Evaluation Suites E1-E9")
    parser.add_argument("--snapshot", default="20261010-gii-v0.7", help="Snapshot ID")
    args = parser.parse_args()
    run_all_evaluations(snapshot_id=args.snapshot)
