"""Server-Sent Events (SSE) 实时流式事件推送机制
对齐技术方案第 3.4 节与第 7.3 节：
- 支持逐节点进展通知 (node_start, node_done)
- 支持状态全量/增量广播 (state_update)
- 支持错误与完成事件 (done, error)
"""

import asyncio
import json
from typing import Dict, List, Any


class SSEManager:
    """基于 asyncio.Queue 的案件事件广播总线"""

    def __init__(self):
        # case_id -> list of subscriber queues
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}

    def subscribe(self, case_id: str) -> asyncio.Queue:
        """客户端订阅指定案件的 SSE 事件流"""
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.setdefault(case_id, []).append(q)
        return q

    def unsubscribe(self, case_id: str, q: asyncio.Queue):
        """断开连接注销队列"""
        if case_id in self._subscribers and q in self._subscribers[case_id]:
            self._subscribers[case_id].remove(q)
            if not self._subscribers[case_id]:
                del self._subscribers[case_id]

    async def broadcast(self, case_id: str, event_type: str, data: Any):
        """向该案件的所有订阅者广播事件"""
        if case_id not in self._subscribers:
            return

        payload = {
            "event": event_type,
            "data": json.dumps(data, ensure_ascii=False) if not isinstance(data, str) else data
        }

        for q in list(self._subscribers.get(case_id, [])):
            try:
                await q.put(payload)
            except Exception:
                pass


sse_manager = SSEManager()
