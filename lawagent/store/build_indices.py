"""全量索引与切块构建脚本 (Build Chunks, BM25 & Dense Index)
用法：python -m lawagent.store.build_indices [--snapshot SNAPSHOT_ID] [--skip-vec]
"""

import os
import argparse
import sqlite3
from lawagent.store.snapshots import SnapshotManager
from lawagent.store.chunker import build_and_save_chunks
from lawagent.store.bm25 import BM25Engine
from lawagent.store.vec import DenseVectorEngine


def main():
    parser = argparse.ArgumentParser(description="构建快照分块与索引")
    parser.add_argument("--snapshot", type=str, default=None, help="目标快照 ID")
    parser.add_argument("--skip-vec", action="store_true", help="跳过稠密向量索引构建")
    args = parser.parse_args()

    mgr = SnapshotManager()
    snap_id = args.snapshot or mgr.get_current_snapshot_id()
    snap_dir = os.path.join("data", "snapshots", snap_id)
    db_path = os.path.join(snap_dir, "law.sqlite")
    index_dir = os.path.join(snap_dir, "index")

    print(f"=== 开始构建快照 [{snap_id}] 索引与分块 ===")

    # 1. 切块与增强
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    norms = mgr.get_all_norms(snap_id)
    cases = mgr.get_all_cases(snap_id)
    print(f"读取到 {len(norms)} 条法条, {len(cases)} 篇判例")

    total_chunks = build_and_save_chunks(conn, norms, cases)
    print(f"-> 分块写入完成，共计 {total_chunks} 个 chunks")

    # 2. 构建 BM25 索引
    rows = conn.execute("SELECT chunk_id, kind, ref_id, seq, text FROM chunks").fetchall()
    chunks = [dict(r) for r in rows]

    print("-> 正在构建 BM25 索引 (训练复合词词表与分词)...")
    bm25 = BM25Engine(index_dir=index_dir)
    bm25.build_from_chunks(chunks)
    print("-> BM25 索引持久化成功")

    # 3. 构建 Dense 向量索引
    if not args.skip_vec:
        print("-> 正在调用 GPU 构建稠密向量索引 (BGE-M3 + FAISS)...")
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            vec = DenseVectorEngine(index_dir=index_dir)
            vec.build_from_chunks(chunks, batch_size=12)
            print("-> FAISS 稠密向量索引持久化成功")
        except Exception as e:
            print(f"-> 向量索引构建暂时跳过或异常: {e}")
    else:
        print("-> 已跳过向量索引构建")

    print("=== 索引构建完成 ===")


if __name__ == "__main__":
    main()
