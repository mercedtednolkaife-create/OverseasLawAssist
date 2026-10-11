"""德国法律规范与联邦法院判例全文检索路由 (Search Router)
对齐前端 NormOrCaseItem 契约与技术方案第 4.4 节
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from lawagent.api.deps import get_snapshot_mgr, get_retriever
from lawagent.store.snapshots import SnapshotManager
from lawagent.store.retriever import HybridRetriever

router = APIRouter(prefix="/search", tags=["search"])


class NormOrCaseItem(BaseModel):
    id: str
    kind: str
    law: Optional[str] = None
    enbez: Optional[str] = None
    title: str = ""
    heading_path: Optional[str] = None
    court: Optional[str] = None
    decided: Optional[str] = None
    az: Optional[str] = None
    text_de: str = ""
    text_zh_machine: str = ""
    stand: Optional[str] = None
    has_pending_amend: Optional[bool] = False
    source_url: str = ""


@router.get("", response_model=List[NormOrCaseItem])
def search_norms_and_cases(
    q: str = Query("", description="搜索关键词、条号或案号"),
    law: Optional[str] = Query(None, description="法典缩写过滤，如 BGB, HGB"),
    court: Optional[str] = Query(None, description="法院过滤，如 BGH"),
    kind: Optional[str] = Query("all", description="类型过滤: all, norm, case"),
    snapshot_mgr: SnapshotManager = Depends(get_snapshot_mgr),
    retriever: HybridRetriever = Depends(get_retriever)
):
    """搜索德国法条与司法判例全文"""
    query = q.strip()
    items: List[NormOrCaseItem] = []

    # 1. 当问句为空时，提供核心高频条文与指导判例默认列表
    if not query:
        core_norms = ["BGB:§433", "BGB:§434", "BGB:§437", "BGB:§439", "BGB:§323", "BGB:§280", "BGB:§286", "HGB:§377"]
        for cid in core_norms:
            norm = snapshot_mgr.norm_lookup(cid)
            if norm:
                if law and norm.get("law") != law:
                    continue
                if kind == "case":
                    continue
                items.append(NormOrCaseItem(
                    id=norm["norm_id"],
                    kind="norm",
                    law=norm["law"],
                    enbez=norm["enbez"],
                    title=norm["title"] or f"{norm['law']} {norm['enbez']}",
                    heading_path=norm.get("heading_path"),
                    text_de=norm["text_de"][:1500],
                    text_zh_machine=f"【释义】针对 {norm['norm_id']} 之法定权利义务及构成要件",
                    stand=norm.get("stand"),
                    has_pending_amend=bool(norm.get("has_pending_amend")),
                    source_url=norm["source_url"]
                ))
        return items

    # 2. 混合检索召回
    kind_filter = kind if kind in ("norm", "case") else None
    evidences = retriever.search(query, top_k=20, law_filter=law, kind_filter=kind_filter)

    for ev in evidences:
        if ev.kind == "norm":
            norm = snapshot_mgr.norm_lookup(ev.ref_id)
            if norm:
                items.append(NormOrCaseItem(
                    id=norm["norm_id"],
                    kind="norm",
                    law=norm["law"],
                    enbez=norm["enbez"],
                    title=norm["title"] or f"{norm['law']} {norm['enbez']}",
                    heading_path=norm.get("heading_path"),
                    text_de=norm["text_de"][:1500],
                    text_zh_machine=f"【释义】针对 {norm['norm_id']} 之法定权利义务及构成要件",
                    stand=norm.get("stand"),
                    has_pending_amend=bool(norm.get("has_pending_amend")),
                    source_url=norm["source_url"]
                ))
        else:
            case_data = snapshot_mgr.case_lookup(ev.ref_id)
            if case_data:
                items.append(NormOrCaseItem(
                    id=case_data["case_id"],
                    kind="case",
                    court=case_data["court"],
                    az=case_data["az"],
                    decided=case_data["decided"],
                    title=f"{case_data['court']} {case_data['az']} ({case_data['decided']})",
                    text_de=(case_data.get("leitsatz") or case_data.get("gruende") or "")[:1500],
                    text_zh_machine=f"【裁判要旨】{case_data['court']} 关于买卖瑕疵与违约解除之判例要旨",
                    source_url=case_data["source_url"]
                ))

    return items
