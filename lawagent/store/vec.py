"""多语言稠密向量引擎 (Dense Vector Search Engine)
对齐技术方案第 4.4 节：
- 使用 BGE-M3 / SentenceTransformer 进行跨语言语义嵌入 (中文问句直接检索德语法条/判决)
- 向量 L2 归一化后使用 FAISS IndexFlatIP (余弦相似度)
- 本地 NVIDIA GPU (CUDA) 加速推理，支持优雅缓存与增量检索
"""

import os
import pickle
import numpy as np
import faiss
import torch
from typing import List, Tuple, Optional, Dict, Any
from sentence_transformers import SentenceTransformer


class DenseVectorEngine:
    def __init__(
        self,
        model_name: str = "BAAI/bge-m3",
        index_dir: str = "data/snapshots/20261010-gii-v0.7/index",
        device: Optional[str] = None
    ):
        self.model_name = model_name
        self.index_dir = index_dir
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[SentenceTransformer] = None
        self.index: Optional[faiss.IndexFlatIP] = None
        self.chunk_ids: List[str] = []
        os.makedirs(self.index_dir, exist_ok=True)

    def _ensure_model(self):
        if self.model is None:
            try:
                self.model = SentenceTransformer(self.model_name, device=self.device, local_files_only=True)
            except Exception:
                # 若本地未缓存模型文件，避免网络阻塞
                raise RuntimeError(f"Dense model {self.model_name} is not available locally")
            self.model.max_seq_length = 512


    def build_from_chunks(self, chunks: List[Dict[str, Any]], batch_size: int = 12):
        """批量编码分块文本并建立 FAISS 索引"""
        self._ensure_model()
        texts = [c["text"] for c in chunks]
        self.chunk_ids = [c["chunk_id"] for c in chunks]

        # 编码向量 (GPU batch)
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            normalize_embeddings=True,
            device=self.device
        )
        embeddings = np.array(embeddings, dtype=np.float32)

        # 构建 FAISS 内积索引 (对于单位向量等同于余弦相似度)
        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(embeddings)

        self.save()

    def save(self):
        """保存 FAISS 索引与 chunk_ids 映射"""
        if self.index is not None:
            faiss_path = os.path.join(self.index_dir, "faiss.index")
            faiss.write_index(self.index, faiss_path)
        with open(os.path.join(self.index_dir, "chunk_ids_vec.pkl"), "wb") as f:
            pickle.dump(self.chunk_ids, f)

    def load(self) -> bool:
        """加载已构建的 FAISS 向量索引"""
        faiss_path = os.path.join(self.index_dir, "faiss.index")
        ids_path = os.path.join(self.index_dir, "chunk_ids_vec.pkl")

        if not (os.path.exists(faiss_path) and os.path.exists(ids_path)):
            return False

        self.index = faiss.read_index(faiss_path)
        with open(ids_path, "rb") as f:
            self.chunk_ids = pickle.load(f)
        return True

    def search(self, query: str, top_k: int = 50) -> List[Tuple[str, float]]:
        """执行稠密向量检索，返回 [(chunk_id, cosine_score), ...] 降序列表"""
        if self.index is None:
            if not self.load():
                return []

        self._ensure_model()
        q_emb = self.model.encode([query], normalize_embeddings=True, device=self.device)
        q_emb = np.array(q_emb, dtype=np.float32)

        scores, indices = self.index.search(q_emb, min(top_k, self.index.ntotal))

        results: List[Tuple[str, float]] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.chunk_ids):
                continue
            results.append((self.chunk_ids[idx], float(score)))

        return results
