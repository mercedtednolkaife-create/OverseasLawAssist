"""阶段 2 单元测试套件 (Phase 2 Unit Tests)
测试覆盖：
1. 德语复合词对称拆分与词干化处理 (GermanTextProcessor, VocabSplitter)
2. 法条与判例分块及上下文前缀增强 (chunk_norms, chunk_cases)
3. BM25 检索引擎建立与多条件过滤检索 (BM25Engine)
4. 本体边表与递归 CTE 图扩展 (SQLiteGraphStore)
5. 混合检索器 (HybridRetriever) 精确通道、关键词召回与 Evidence 封装
"""

import os
import pytest
from lawagent.store.compound import GermanTextProcessor, VocabSplitter
from lawagent.store.chunker import chunk_norms, chunk_cases
from lawagent.store.bm25 import BM25Engine
from lawagent.store.graph import SQLiteGraphStore
from lawagent.store.snapshots import SnapshotManager
from lawagent.store.retriever import HybridRetriever


def test_german_compound_splitter():
    """测试德语复合词拆分与连接成分过滤"""
    splitter = VocabSplitter(vocab_words={"schadensersatz", "anspruch", "kauf", "vertrag", "mangel", "sach"})
    parts = splitter.split("schadensersatzanspruch")
    assert "schadensersatz" in parts or "anspruch" in parts

    processor = GermanTextProcessor(splitter=splitter)
    tokens = processor.tokenize("BGB § 434 Sachmangel beim Kaufvertrag")
    assert "§434" in tokens
    assert any("mangel" in t for t in tokens)


def test_chunking_with_context_prefix():
    """测试法条与判例切块元数据增强"""
    dummy_norm = [{
        "norm_id": "BGB:§433",
        "law": "BGB",
        "enbez": "§ 433",
        "title": "Vertragstypische Pflichten beim Kaufvertrag",
        "heading_path": "Buch 2 > Abschnitt 8",
        "text_de": "(1) Durch den Kaufvertrag...\n(2) Der Käufer...",
        "structure": '[{"absatz": "1", "text": "Durch den Kaufvertrag..."}, {"absatz": "2", "text": "Der Käufer..."}]'
    }]
    chunks = chunk_norms(dummy_norm)
    assert len(chunks) >= 1
    assert "BGB § 433 Vertragstypische Pflichten beim Kaufvertrag" in chunks[0]["ctx_prefix"]
    assert chunks[0]["ref_id"] == "BGB:§433"

    dummy_case = [{
        "case_id": "BGH:VIII ZR 12/20:2021-05-12",
        "court": "Bundesgerichtshof",
        "az": "VIII ZR 12/20",
        "decided": "2021-05-12",
        "doctype": "Urteil",
        "leitsatz": "Ein Käufer kann...",
        "tenor": "Die Revision wird zurückgewiesen.",
        "tatbestand": "Die Klägerin kaufte...",
        "gruende": "Die Revision ist unbegründet..."
    }]
    case_chunks = chunk_cases(dummy_case)
    assert len(case_chunks) >= 2
    assert case_chunks[0]["seq"] == 0
    assert "Leitsatz:" in case_chunks[0]["text"]


def test_bm25_search_recall():
    """测试 BM25 对买卖法条与商事检验通知义务的召回准确率"""
    engine = BM25Engine(index_dir="data/snapshots/20261010-gii-v0.7/index")
    loaded = engine.load()
    assert loaded is True

    # 检索买卖瑕疵
    res = engine.search("Sachmangel Nacherfüllung Kaufvertrag", top_k=10)
    assert len(res) > 0
    matched_refs = [engine.chunk_metadata[cid]["ref_id"] for cid, _ in res]
    assert any(ref in ["BGB:§433", "BGB:§434", "BGB:§437", "BGB:§439", "BGH:VIII ZR 12/20:2021-05-12"] for ref in matched_refs)

    # 检索商事检验通知 (HGB § 377)
    res_hgb = engine.search("Rügepflicht Handelskauf Mangel unverzüglich", top_k=5, law_filter="HGB")
    assert len(res_hgb) > 0
    hgb_refs = [engine.chunk_metadata[cid]["ref_id"] for cid, _ in res_hgb]
    assert "HGB:§377" in hgb_refs


def test_graph_store_neighbors_and_hot_cases():
    """测试本体图扩展：法条关联权威判例"""
    graph = SQLiteGraphStore("data/snapshots/20261010-gii-v0.7/law.sqlite")
    hot_cases = graph.get_hot_cases_for_norm("BGB:§437", limit=3)
    assert len(hot_cases) > 0
    assert any("VIII ZR 12/20" in hc or "VIII ZR 270/07" in hc for hc in hot_cases)


def test_hybrid_retriever_pipeline():
    """测试端到端混合检索与证据封装"""
    mgr = SnapshotManager()
    bm25 = BM25Engine()
    bm25.load()
    graph = SQLiteGraphStore("data/snapshots/20261010-gii-v0.7/law.sqlite")
    retriever = HybridRetriever(snapshot_mgr=mgr, bm25_engine=bm25, graph_store=graph)

    # 1. 精确法条通道
    evs_exact = retriever.search("请查明 BGB § 439 关于事后履行的具体要求", top_k=3)
    assert len(evs_exact) > 0
    assert evs_exact[0].ref_id == "BGB:§439"
    assert evs_exact[0].kind == "norm"
    assert evs_exact[0].grade == "A"
    assert "Nacherfüllung" in evs_exact[0].text_de

    # 2. 案情概念与判例召回
    evs_case = retriever.search("买卖合同解除前是否必须设定事后履行催告期限？", top_k=5)
    assert len(evs_case) > 0
    ref_list = [e.ref_id for e in evs_case]
    assert any("BGH:VIII ZR 12/20" in r or "BGB:§323" in r or "BGB:§437" in r for r in ref_list)

    # 3. 类似判例检索 (role='similar')
    similar = retriever.similar_cases(fact_summary="买受人购买激光切割设备出现精度误差未定期催告直接解除", top_k=2)
    assert len(similar) > 0
    assert similar[0].role == "similar"
    assert similar[0].kind == "case"
