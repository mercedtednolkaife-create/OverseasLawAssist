"""德语复合词对称拆分与分词处理器 (Symmetric Compound Splitter)
对齐技术方案第 4.4 节：
- 索引与查询两侧采用相同的拆分器，保留原词与拆出的词根
- 规则处理德语连接成分 (Fugenelemente: '', 's', 'n', 'en', 'es', 'e', 'er')
- 保持法条整体标示 (如 §433)、元音变音 (ä/ö/ü/ß) 标准化与 Snowball 词干化
"""

import re
import snowballstemmer
from typing import List, Set, Dict, Optional
from collections import Counter
from lawagent.core.jurisdiction import JurisdictionRegistry, LanguageSplitter

FUGEN = ("", "s", "n", "en", "es", "e", "er")
RE_SECTION = re.compile(r"§§?\s*(\d+[a-z]?)", re.IGNORECASE)
RE_CLEAN = re.compile(r"[^a-z0-9äöüß§\s\-_]", re.IGNORECASE)


class VocabSplitter:
    """基于德语语料词表的复合词递归拆分器"""
    def __init__(self, vocab_words: Optional[Set[str]] = None, min_part: int = 4, min_freq: int = 2):
        self.min_part = min_part
        self.min_freq = min_freq
        self.v: Set[str] = set()
        if vocab_words:
            self.v = {w.lower() for w in vocab_words if len(w) >= min_part}

    def train_from_texts(self, texts: List[str]):
        """从入库文本统计词频并构建合法词表"""
        counts = Counter()
        for t in texts:
            words = RE_CLEAN.sub(" ", t.lower()).split()
            for w in words:
                if len(w) >= self.min_part and not w.startswith("§"):
                    counts[w] += 1
        self.v = {w for w, c in counts.items() if c >= self.min_freq and len(w) >= self.min_part}

    def split(self, word: str, depth: int = 0) -> List[str]:
        w = word.lower().strip()
        if depth > 3 or (w in self.v and len(w) <= 7):
            return [w]

        best = None
        for i in range(self.min_part, len(w) - self.min_part + 1):
            for f in FUGEN:
                if f and not w[:i].endswith(f):
                    continue
                head = w[:i - len(f)] if f else w[:i]
                tail = w[i:]
                if head in self.v:
                    rest = [tail] if tail in self.v else self.split(tail, depth + 1)
                    if all(p in self.v for p in rest):
                        cand = [head] + rest
                        if best is None or len(cand) < len(best):
                            best = cand

        return best or [w]


class GermanTextProcessor:
    """德语全文检索分词与索引标记生成器"""
    def __init__(self, splitter: Optional[VocabSplitter] = None):
        self.stemmer = snowballstemmer.stemmer("german")
        self.splitter = splitter or VocabSplitter()

    def normalize_umlauts(self, text: str) -> str:
        """保持 ä, ö, ü, ß 但统一大小写与多余空白"""
        return re.sub(r"\s+", " ", text).strip()

    def tokenize(self, text: str) -> List[str]:
        """将德语长文本切分为用于 BM25 检索与加权的高质量 token 集合"""
        norm_text = self.normalize_umlauts(text)
        # 保护 §433 等整体条号
        norm_text = RE_SECTION.sub(r" §\1 ", norm_text)
        raw_words = RE_CLEAN.sub(" ", norm_text).split()

        tokens: List[str] = []
        for rw in raw_words:
            w = rw.lower()
            if not w or len(w) < 2:
                continue

            # 保持条号整体
            if w.startswith("§"):
                tokens.append(w)
                continue

            # 对称拆分：保留原词 + 拆出的词根并进行词干化
            parts = self.splitter.split(w)
            all_parts = {w} | set(parts)
            for p in all_parts:
                stemmed = self.stemmer.stemWord(p)
                tokens.append(stemmed)

        return tokens


# 注册至多法域中心
JurisdictionRegistry.register(
    JurisdictionRegistry.get("de_federal"),
    splitter=VocabSplitter()
)
