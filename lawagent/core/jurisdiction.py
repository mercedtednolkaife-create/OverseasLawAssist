"""多法域与多语言可扩展性核心抽象 (Multi-Jurisdiction & Language Architecture)
遵循技术方案与可扩展架构设计，支持按法域（Jurisdiction）插拔：
- 法源目录与代码体系 (Norms / Codes)
- 引用抽取器与规范化解析器 (CitationExtractor, NormNormalizer)
- 语言形态学与复合词拆分器 (LanguageSplitter)
- 时点有效性规则 (TimepointRule)
"""

from typing import Protocol, runtime_checkable, Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class JurisdictionMetadata:
    """法域元数据定义"""
    code: str                         # 如 'de_federal', 'cn_prc', 'us_federal'
    name_zh: str                      # 如 '德国联邦法'
    primary_language: str             # 如 'de', 'zh', 'en'
    citation_standard: str            # 如 'bundesrecht', 'bluebook'
    default_laws: List[str] = field(default_factory=list)  # 如 ['BGB', 'HGB', 'GmbHG', 'ZPO', 'EGBGB']


@runtime_checkable
class CitationExtractor(Protocol):
    """候选引用抽取器协议：从文本中提取未规范化的法条或案号候选片段"""
    def candidates(self, text: str) -> List[Dict[str, Any]]:
        """返回格式：[{'kind': 'norm' | 'case', 'raw': str, 'span': (start, end)}]"""
        ...


@runtime_checkable
class NormNormalizer(Protocol):
    """法条规范化解析器协议：将原始引用字符串转为标准数据库检索 ID"""
    def normalize(self, raw: str) -> List[Dict[str, Any]]:
        """返回格式：[{'id': 'BGB:§433', 'depth': 'absatz'|'nummer', 'absatz': '1', 'open_ended': bool}]"""
        ...


@runtime_checkable
class LanguageSplitter(Protocol):
    """特定语言分词/形态学拆分协议（例如德语复合词拆分）"""
    def split(self, word: str) -> List[str]:
        """将复合词拆分为基本词根列表"""
        ...


class IdentitySplitter:
    """默认/直通拆分器"""
    def split(self, word: str) -> List[str]:
        return [word.lower()]


class JurisdictionRegistry:
    """全局多法域服务注册中心"""
    _jurisdictions: Dict[str, JurisdictionMetadata] = {}
    _citation_extractors: Dict[str, CitationExtractor] = {}
    _normalizers: Dict[str, NormNormalizer] = {}
    _splitters: Dict[str, LanguageSplitter] = {}

    @classmethod
    def register(
        cls,
        meta: JurisdictionMetadata,
        citation_extractor: Optional[CitationExtractor] = None,
        normalizer: Optional[NormNormalizer] = None,
        splitter: Optional[LanguageSplitter] = None,
    ):
        cls._jurisdictions[meta.code] = meta
        if citation_extractor:
            cls._citation_extractors[meta.code] = citation_extractor
        if normalizer:
            cls._normalizers[meta.code] = normalizer
        if splitter:
            cls._splitters[meta.code] = splitter

    @classmethod
    def get(cls, code: str) -> Optional[JurisdictionMetadata]:
        return cls._jurisdictions.get(code)

    @classmethod
    def get_citation_extractor(cls, code: str) -> Optional[CitationExtractor]:
        return cls._citation_extractors.get(code)

    @classmethod
    def get_normalizer(cls, code: str) -> Optional[NormNormalizer]:
        return cls._normalizers.get(code)

    @classmethod
    def get_splitter(cls, code: str) -> LanguageSplitter:
        return cls._splitters.get(code, IdentitySplitter())

    @classmethod
    def list_jurisdictions(cls) -> List[JurisdictionMetadata]:
        return list(cls._jurisdictions.values())


# 默认预注册德国联邦法 (de_federal)
JurisdictionRegistry.register(
    JurisdictionMetadata(
        code="de_federal",
        name_zh="德国联邦法",
        primary_language="de",
        citation_standard="bundesrecht",
        default_laws=["BGB", "HGB", "GmbHG", "ZPO", "EGBGB"],
    )
)
