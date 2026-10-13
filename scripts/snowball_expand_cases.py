"""滚雪球判例扩充与法条-判例拓扑建构脚本 (Snowball Precedent Expansion & Graph Ingestion)
用法：
  python scripts/snowball_expand_cases.py [--snapshot SNAPSHOT_ID] [--skip-vec] [--custom-json PATH]
核心功能：
1. 先验 Shepardizing 门禁审查：拦截坏法 (Overruled/Abrogated) 与未公开发表裁决 (Unpublished)
2. 批量将涉美金标准先例落盘至 SQLite `cases` 与 `edges` 表
3. 物化预计算 `edges_top` 与 `hot_norm_cases` (实现成文法->判例的 0ms 拓扑扩散)
4. 自动刷新分块 (chunks) 与 BM25 词法倒排索引，使得新增判例立即可搜、即刻关联
"""

import os
import sys
import json
import sqlite3
import argparse
from typing import List

if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from lawagent.integrations.courtlistener import (
    CURATED_US_PRECEDENTS,
    CourtPrecedent,
    ShepardizingValidator,
    ingest_precedents_to_snapshot,
)
from lawagent.store.snapshots import SnapshotManager
from lawagent.store.chunker import build_and_save_chunks
from lawagent.store.bm25 import BM25Engine
from lawagent.store.graph import SQLiteGraphStore
from lawagent.store.retriever import HybridRetriever


def main():
    parser = argparse.ArgumentParser(description="美国法域代表性判例滚雪球扩充与拓扑图谱建构")
    parser.add_argument("--snapshot", type=str, default=None, help="目标快照 ID")
    parser.add_argument("--skip-vec", action="store_true", default=True, help="跳过稠密向量索引构建")
    parser.add_argument("--custom-json", type=str, default=None, help="自定义外部判例 JSON 文件路径")
    args = parser.parse_args()

    mgr = SnapshotManager()
    snap_id = args.snapshot or mgr.get_current_snapshot_id()
    snap_dir = os.path.join("data", "snapshots", snap_id)
    db_path = os.path.join(snap_dir, "law.sqlite")
    index_dir = os.path.join(snap_dir, "index")

    print("======================================================================")
    print(f"🚀 开始执行先例滚雪球扩充与图谱建构 [快照: {snap_id}]")
    print("======================================================================")

    # 1. 准备待入库判例集
    precedents_to_ingest: List[CourtPrecedent] = []
    if args.custom_json:
        print(f"📂 正在从外部 JSON 文件加载判例: {args.custom_json}")
        with open(args.custom_json, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                for item in data:
                    precedents_to_ingest.append(CourtPrecedent(**item))
            elif isinstance(data, dict):
                precedents_to_ingest.append(CourtPrecedent(**data))
        print(f"-> 外部加载了 {len(precedents_to_ingest)} 篇先例")
    else:
        print(f"📚 加载系统预置美商法金标准先例库 ({len(CURATED_US_PRECEDENTS)} 篇候选)...")
        precedents_to_ingest = CURATED_US_PRECEDENTS

    # 2. 清理历史遗留的旧版不规范案例 ID (如带有未对齐空格或特殊前缀者)
    legacy_clean_ids = [
        "CASE:2ND-CIR:Filanto v. Chilewich:1992",
        "CASE:DEL-CH:Unocal v. Mesa:1985",
        "CASE:SCOTUS:Intel v. AMD:2004",
    ]
    with sqlite3.connect(db_path) as conn:
        for old_id in legacy_clean_ids:
            conn.execute("DELETE FROM cases WHERE case_id = ?", (old_id,))
            conn.execute("DELETE FROM edges WHERE src = ?", (old_id,))
            conn.execute("DELETE FROM edges WHERE src = ?", (f"CASE:{old_id}",))
        conn.commit()

    # 3. 执行前置审查与批量入库
    accepted, rejected, logs = ingest_precedents_to_snapshot(
        precedents=precedents_to_ingest,
        db_path=db_path,
        snapshot_id=snap_id
    )

    print("\n--- [审查与入库日志] ---")
    for log in logs:
        print(log)
    print("------------------------")
    print(f"📊 审查准入结果: 成功入库 {accepted} 篇，安全拦截坏法/非发表判例 {rejected} 篇")

    # 4. 统计数据库当前状态
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        total_cases = c.execute("SELECT count(*) FROM cases").fetchone()[0]
        total_edges = c.execute("SELECT count(*) FROM edges").fetchone()[0]
        total_hot = c.execute("SELECT count(*) FROM hot_norm_cases").fetchone()[0]
        print(f"\n📈 快照数据库当前规模:")
        print(f"   • 权威判例总数: {total_cases} 篇 (含德国联邦最高法院 BGH 先例与美国联邦/州金标准先例)")
        print(f"   • 拓扑边关系数 (edges): {total_edges} 条")
        print(f"   • 高频法条-判例物化索引 (hot_norm_cases): {total_hot} 条映射")

    # 5. 重建分块与 BM25 词法倒排索引
    print("\n🔄 正在同步重建快照分块 (chunks) 与检索索引...")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    norms = mgr.get_all_norms(snap_id)
    cases = mgr.get_all_cases(snap_id)
    total_chunks = build_and_save_chunks(conn, norms, cases)
    print(f"-> 分块重建完成，当前快照全库 chunks 数量: {total_chunks}")

    rows = conn.execute("SELECT chunk_id, kind, ref_id, seq, text FROM chunks").fetchall()
    chunks = [dict(r) for r in rows]
    conn.close()

    print("-> 正在更新 BM25 词法倒排索引...")
    bm25 = BM25Engine(index_dir=index_dir)
    bm25.build_from_chunks(chunks)
    print("-> BM25 索引持久化成功！")

    # 6. 端到端功能与图扩散验证
    print("\n======================================================================")
    print("🔬 正在执行成文法-判例图谱端到端检索验证...")
    print("======================================================================")
    graph = SQLiteGraphStore(db_path)
    test_norms = ["UCC:§2-607", "UCC:§2-207", "USC:28:§1782", "DGCL:§141", "USC:9:§10"]

    print("【拓扑图谱 hot_norm_cases 抽样校验】:")
    for nid in test_norms:
        hot_cids = graph.get_hot_cases_for_norm(nid, limit=3)
        print(f"  • {nid:15} ➔ 关联判例: {hot_cids}")

    print("\n【真实混合检索与图扩散联想测试】:")
    retriever = HybridRetriever(snapshot_mgr=mgr, graph_store=graph, snapshot_id=snap_id)

    sample_queries = [
        "UCC 2-607 notice requirement reasonable time",
        "28 U.S.C. 1782 discovery foreign tribunal",
        "battle of the forms box-top license disclaimer",
    ]

    for q in sample_queries:
        print(f"\n🔍 Query: '{q}'")
        res = retriever.search(query=q, snapshot_id=snap_id, top_k=4, expand_graph=True)
        for idx, ev in enumerate(res, 1):
            kind = ev.kind
            ref_id = ev.ref_id
            snippet = ev.text_de.replace("\n", " ")[:80]
            print(f"   [{idx}] [{kind.upper()}] {ref_id} | {snippet}...")

    print("\n======================================================================")
    print("🎉 美国法域金标准先例落地、成文法-判例双向图谱构建与检索验证全流程顺利完成！")
    print("======================================================================")


if __name__ == "__main__":
    main()
