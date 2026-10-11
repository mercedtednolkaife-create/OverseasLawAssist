"""专家名录与会商流转路由 (Experts & Consults Router - F17)
对齐前端 Expert 与 ConsultRecord 契约与技术方案第 4.6 节
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from lawagent.api.deps import get_state_db
from lawagent.store.db import StateDBManager

router = APIRouter(tags=["consults"])


class ExpertItem(BaseModel):
    expert_id: str
    name: str
    title: str
    affiliation: str
    languages: List[str]
    fields: List[str]
    qualification: str
    conflict_declared: bool


class ConsultRecord(BaseModel):
    consult_id: str
    case_id: str
    expert_id: str
    expert_name: str
    status: str
    question_snapshot: str
    evidence_summary: str
    reply: Optional[str] = None
    conflict_affirmed: bool
    updated_at: str


class CreateConsultPayload(BaseModel):
    case_id: str
    expert_id: str
    question_snapshot: str
    evidence_summary: str


@router.get("/experts", response_model=List[ExpertItem])
def list_experts(db: StateDBManager = Depends(get_state_db)):
    """获取特邀德国法律专家名录"""
    return db.list_experts()


@router.get("/consults", response_model=List[ConsultRecord])
def list_consults(
    case_id: Optional[str] = Query(None, description="案件 ID 过滤"),
    db: StateDBManager = Depends(get_state_db)
):
    """获取专家咨询与会商流转记录"""
    return db.list_consults(case_id=case_id)


@router.post("/consults", response_model=ConsultRecord)
def create_consult(
    payload: CreateConsultPayload,
    db: StateDBManager = Depends(get_state_db)
):
    """发起向德国法律专家的咨询委托"""
    experts = db.list_experts()
    expert_match = next((e for e in experts if e["expert_id"] == payload.expert_id), None)
    expert_name = expert_match["name"] if expert_match else "德国法特邀专家"

    data = {
        "case_id": payload.case_id,
        "expert_id": payload.expert_id,
        "expert_name": expert_name,
        "status": "dispatched",
        "question_snapshot": payload.question_snapshot,
        "evidence_summary": payload.evidence_summary,
        "reply": "已指派德国专家团队审阅案卷材料，预计3个工作日内出具书面专家意见书。",
        "conflict_affirmed": True
    }
    saved = db.save_consult(data)
    return saved
