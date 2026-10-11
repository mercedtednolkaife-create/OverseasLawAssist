"""LangGraph 状态图与工作流调度引擎 (Graph Architecture)
严格对齐技术方案第 5.2 节架构：
S1 Extract -> S2 Precheck -[CISG Gate]-> S3 Decompose -[S3 Gate]-> S4 Researcher
-> S5 Matcher -> S6 Translator -> S7 Drafter -> Critic -> S8 Review -[Review Gate]-> S9 Export
"""

import os
import sqlite3
from typing import Dict, Any, Optional
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.memory import MemorySaver

from lawagent.core.types import CaseState
from lawagent.flow.nodes import (
    s1_extract_node,
    s2_precheck_node,
    s3_decompose_node,
    researcher_node,
    matcher_node,
    translator_node,
    drafter_node,
    critic_node,
    s8_review_node,
    s9_export_node
)


def route_after_s2(state: CaseState) -> str:
    """S2 预检后的条件路由：若触发 CISG 且未排除，则暂停于闸门"""
    if state.status == "paused_cisg":
        return END
    return "s3_decompose"


def route_after_s3(state: CaseState) -> str:
    """S3 拆解后的条件路由：若全流程模式下需用户确认争点，则暂停"""
    if state.status == "paused_s3":
        return END
    return "researcher"


def route_after_s8(state: CaseState) -> str:
    """S8 审核后的条件路由：若需专家审核确认，则暂停"""
    if state.status == "paused_s8":
        return END
    return "s9_export"


def build_law_graph(checkpointer: Optional[Any] = None):
    """构建编译好的 LangGraph 工作流图"""
    builder = StateGraph(CaseState)

    # 1. 注册工作流节点
    builder.add_node("s1_extract", s1_extract_node)
    builder.add_node("s2_precheck", s2_precheck_node)
    builder.add_node("s3_decompose", s3_decompose_node)
    builder.add_node("researcher", researcher_node)
    builder.add_node("matcher", matcher_node)
    builder.add_node("translator", translator_node)
    builder.add_node("drafter", drafter_node)
    builder.add_node("critic", critic_node)
    builder.add_node("s8_review", s8_review_node)
    builder.add_node("s9_export", s9_export_node)

    # 2. 编排边与条件转移
    builder.add_edge(START, "s1_extract")
    builder.add_edge("s1_extract", "s2_precheck")

    builder.add_conditional_edges(
        "s2_precheck",
        route_after_s2,
        {"s3_decompose": "s3_decompose", END: END}
    )

    builder.add_conditional_edges(
        "s3_decompose",
        route_after_s3,
        {"researcher": "researcher", END: END}
    )

    builder.add_edge("researcher", "matcher")
    builder.add_edge("matcher", "translator")
    builder.add_edge("translator", "drafter")
    builder.add_edge("drafter", "critic")
    builder.add_edge("critic", "s8_review")

    builder.add_conditional_edges(
        "s8_review",
        route_after_s8,
        {"s9_export": "s9_export", END: END}
    )

    builder.add_edge("s9_export", END)

    if checkpointer is not None:
        return builder.compile(checkpointer=checkpointer)
    return builder.compile()


class LawWorkflowRunner:
    """工作流高阶执行器，封装检查点持久化与断点唤醒逻辑"""

    def __init__(self, db_path: str = "data/state/checkpoints.sqlite", in_memory: bool = True):
        if in_memory:
            self.checkpointer = MemorySaver()
        else:
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            self._conn = sqlite3.connect(db_path, check_same_thread=False)
            self.checkpointer = SqliteSaver(self._conn)

        self.graph = build_law_graph(checkpointer=self.checkpointer)

    async def run(self, state: CaseState) -> CaseState:
        """从头启动或继续执行案件"""
        config = {"configurable": {"thread_id": state.case_id}}
        result_dict = await self.graph.ainvoke(state, config=config)
        return CaseState.model_validate(result_dict)

    async def resume_from(self, case_id: str, updates: Optional[Dict[str, Any]] = None, next_node: Optional[str] = None) -> CaseState:
        """从指定检查点唤醒并继续向下执行"""
        config = {"configurable": {"thread_id": case_id}}
        current = self.checkpointer.get(config)
        
        # 获取现有状态
        if not current:
            raise ValueError(f"未找到案件 {case_id} 的存档检查点")

        state_dict = current.get("channel_values", {})
        if updates:
            state_dict.update(updates)
            
        state_obj = CaseState.model_validate(state_dict)

        # 如果指定恢复后的状态
        if state_obj.status in ("paused_cisg", "paused_s3", "paused_s8"):
            state_obj.status = "running"

        # 根据当前停滞节点决定下一个起点
        target_node = next_node
        if not target_node:
            if state_obj.current_node == "s2_precheck":
                target_node = "s3_decompose"
            elif state_obj.current_node == "s3_decompose":
                target_node = "researcher"
            elif state_obj.current_node == "s8_review":
                target_node = "s9_export"
            else:
                target_node = "s1_extract"

        # 构造从指定节点开始的子图或直接继续 ainvoke
        result_dict = await self.graph.ainvoke(state_obj, config=config)
        return CaseState.model_validate(result_dict)
