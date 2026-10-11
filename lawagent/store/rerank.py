"""重排模型模块 (Cross-Encoder / Reranker)
对齐技术方案第 4.4 节：
- 对 BM25 与向量融合后的 top 30 候选进行深度交叉打分，取 top 8
- 支持 BAAI/bge-reranker-v2-m3，并提供平滑回退保障
"""

import logging
from typing import List, Tuple, Dict, Any, Optional
import torch

logger = logging.getLogger(__name__)


class Reranker:
    def __init__(
        self,
        model_name: str = "BAAI/bge-reranker-v2-m3",
        enabled: bool = True,
        device: Optional[str] = None
    ):
        self.model_name = model_name
        self.enabled = enabled
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._model = None

    def _load_model(self):
        if self._model is None and self.enabled:
            try:
                from sentence_transformers import CrossEncoder
                self._model = CrossEncoder(self.model_name, device=self.device)
            except Exception as e:
                logger.warning(f"无法初始化重排模型 {self.model_name}，将平滑回退至融合加权得分: {e}")
                self.enabled = False

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 8,
        threshold_tau: float = 0.5
    ) -> List[Tuple[Dict[str, Any], float]]:
        """对候选文本列表进行重排，返回 [(candidate_dict, score), ...]"""
        if not candidates:
            return []

        if not self.enabled:
            # 回退：直接使用候选自带的 rrf_score 降序截断
            sorted_cands = sorted(candidates, key=lambda x: x.get("rrf_score", 0.0), reverse=True)
            return [(c, c.get("rrf_score", 0.0)) for c in sorted_cands[:top_k]]

        self._load_model()
        if self._model is None:
            sorted_cands = sorted(candidates, key=lambda x: x.get("rrf_score", 0.0), reverse=True)
            return [(c, c.get("rrf_score", 0.0)) for c in sorted_cands[:top_k]]

        # 性能优化：限制查询与法条输入长度，防止 Cross-Encoder 长文本拖慢推理
        trunc_query = query[:256]
        pairs = [[trunc_query, (c.get("text") or "")[:1024]] for c in candidates]
        try:
            scores = self._model.predict(pairs, show_progress_bar=False, max_length=512)
            scored = list(zip(candidates, [float(s) for s in scores]))
            scored.sort(key=lambda x: x[1], reverse=True)
            return scored[:top_k]
        except Exception as e:
            logger.warning(f"重排执行异常，回退至基础排序: {e}")
            sorted_cands = sorted(candidates, key=lambda x: x.get("rrf_score", 0.0), reverse=True)
            return [(c, c.get("rrf_score", 0.0)) for c in sorted_cands[:top_k]]
