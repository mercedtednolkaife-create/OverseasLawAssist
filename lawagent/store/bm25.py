"""德语 BM25 全文检索引擎 (含复合词对称拆分与词干化)
对齐技术方案第 4.4 节：
- 使用 rank_bm25 与 GermanTextProcessor
- 支持按 kind ('norm' | 'case') 与法律名称过滤
- 索引持久化缓存至快照 index 目录，支持快速毫秒级加载
"""

import os
import pickle
import sqlite3
from typing import List, Tuple, Optional, Dict, Any
from rank_bm25 import BM25Okapi
from lawagent.store.compound import GermanTextProcessor, VocabSplitter


class BM25Engine:
    def __init__(self, index_dir: str = "data/snapshots/20261010-gii-v0.7/index"):
        self.index_dir = index_dir
        self.processor = GermanTextProcessor()
        self.bm25: Optional[BM25Okapi] = None
        self.chunk_ids: List[str] = []
        self.chunk_metadata: Dict[str, Dict[str, Any]] = {}
        os.makedirs(self.index_dir, exist_ok=True)

    def build_from_chunks(self, chunks: List[Dict[str, Any]]):
        """从分块列表训练词表、进行对称分词并构建 BM25 索引"""
        # 1. 收集语料并训练复合词拆分器词表
        texts = [c["text"] for c in chunks]
        self.processor.splitter.train_from_texts(texts)

        # 2. 对每个分块执行对称分词与词干化
        tokenized_corpus = []
        self.chunk_ids = []
        self.chunk_metadata = {}

        for c in chunks:
            cid = c["chunk_id"]
            self.chunk_ids.append(cid)
            self.chunk_metadata[cid] = {
                "kind": c["kind"],
                "ref_id": c["ref_id"],
                "seq": c["seq"],
                "law": c["ref_id"].split(":")[0] if ":" in c["ref_id"] else "",
            }
            toks = self.processor.tokenize(c["text"])
            tokenized_corpus.append(toks)

        # 3. 拟合 BM25 模型
        self.bm25 = BM25Okapi(tokenized_corpus)
        self.save()

    def save(self):
        """持久化存储 BM25 模型与分块元数据"""
        with open(os.path.join(self.index_dir, "bm25.pkl"), "wb") as f:
            pickle.dump(self.bm25, f)
        with open(os.path.join(self.index_dir, "chunk_ids.pkl"), "wb") as f:
            pickle.dump(self.chunk_ids, f)
        with open(os.path.join(self.index_dir, "chunk_meta.pkl"), "wb") as f:
            pickle.dump(self.chunk_metadata, f)
        with open(os.path.join(self.index_dir, "splitter_vocab.pkl"), "wb") as f:
            pickle.dump(self.processor.splitter.v, f)

    def load(self) -> bool:
        """加载已保存的 BM25 索引"""
        bm25_file = os.path.join(self.index_dir, "bm25.pkl")
        ids_file = os.path.join(self.index_dir, "chunk_ids.pkl")
        meta_file = os.path.join(self.index_dir, "chunk_meta.pkl")
        vocab_file = os.path.join(self.index_dir, "splitter_vocab.pkl")

        if not (os.path.exists(bm25_file) and os.path.exists(ids_file) and os.path.exists(meta_file)):
            return False

        with open(bm25_file, "rb") as f:
            self.bm25 = pickle.load(f)
        with open(ids_file, "rb") as f:
            self.chunk_ids = pickle.load(f)
        with open(meta_file, "rb") as f:
            self.chunk_metadata = pickle.load(f)
        if os.path.exists(vocab_file):
            with open(vocab_file, "rb") as f:
                self.processor.splitter.v = pickle.load(f)
        return True

    def search(
        self,
        query: str,
        top_k: int = 50,
        kind_filter: Optional[str] = None,
        law_filter: Optional[str] = None
    ) -> List[Tuple[str, float]]:
        """执行 BM25 检索，返回 [(chunk_id, bm25_score), ...] 降序列表"""
        if self.bm25 is None:
            if not self.load():
                return []

        q_tokens = self.processor.tokenize(query)
        if not q_tokens:
            return []

        doc_scores = self.bm25.get_scores(q_tokens)

        # 排序并应用元数据过滤
        scored_pairs = []
        for idx, score in enumerate(doc_scores):
            if score <= 0.0:
                continue
            cid = self.chunk_ids[idx]
            meta = self.chunk_metadata.get(cid, {})

            if kind_filter and meta.get("kind") != kind_filter:
                continue
            if law_filter and meta.get("law") != law_filter:
                continue

            scored_pairs.append((cid, float(score)))

        scored_pairs.sort(key=lambda x: x[1], reverse=True)
        return scored_pairs[:top_k]
