"""本体图扩展存储模块 (GraphStore)
对齐技术方案第 4.6 节：
- 使用 SQLite edges_top 物化表与递归 CTE 进行受限图遍历 (1~2 跳，扇出上限受控)
- 查询关联判例 (APPLIES) 与关联法条 (CITES / DEFINES)
- 抽象 GraphStore 协议，后续可无缝切换到内存图或图数据库
"""

import sqlite3
from typing import List, Dict, Any, Optional, Protocol, runtime_checkable


@runtime_checkable
class GraphStore(Protocol):
    """图存储接口规范"""
    def neighbors(
        self,
        node_id: str,
        rels: List[str],
        direction: str = "out",
        limit: int = 20
    ) -> List[Dict[str, Any]]: ...

    def expand(
        self,
        start_ids: List[str],
        max_hops: int = 2,
        rels: Optional[List[str]] = None,
        limit: int = 60
    ) -> List[Dict[str, Any]]: ...


class SQLiteGraphStore:
    def __init__(self, db_path_or_conn: Any = "data/snapshots/20261010-gii-v0.7/law.sqlite"):
        if isinstance(db_path_or_conn, sqlite3.Connection):
            self.conn = db_path_or_conn
            self.db_path = None
        else:
            self.db_path = str(db_path_or_conn)
            self.conn = None

    def _get_conn(self) -> sqlite3.Connection:
        if self.conn is not None:
            return self.conn
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def neighbors(
        self,
        node_id: str,
        rels: List[str],
        direction: str = "out",
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """获取直连邻居节点"""
        clean_id = node_id if (node_id.startswith("NORM:") or node_id.startswith("CASE:") or node_id.startswith("CPT:")) else f"NORM:{node_id}"
        conn = self._get_conn()
        cur = conn.cursor()

        placeholders = ",".join("?" for _ in rels) if rels else "'CITES','APPLIES','DEFINES'"
        query_rels = rels if rels else []

        if direction == "out":
            sql = f"""SELECT dst as node, rel, source FROM edges_top
                      WHERE src = ? {f"AND rel IN ({placeholders})" if rels else ""}
                      ORDER BY rk ASC LIMIT ?"""
            cur.execute(sql, [clean_id, *query_rels, limit])
        else:
            sql = f"""SELECT src as node, rel, source FROM edges_top
                      WHERE dst = ? {f"AND rel IN ({placeholders})" if rels else ""}
                      ORDER BY rk ASC LIMIT ?"""
            cur.execute(sql, [clean_id, *query_rels, limit])

        return [dict(r) for r in cur.fetchall()]

    def expand(
        self,
        start_ids: List[str],
        max_hops: int = 2,
        rels: Optional[List[str]] = None,
        limit: int = 60
    ) -> List[Dict[str, Any]]:
        """执行 1~2 跳递归 CTE 图扩展 (严格控制扇出与最大条数)"""
        if not start_ids:
            return []

        clean_starts = [
            sid if (sid.startswith("NORM:") or sid.startswith("CASE:") or sid.startswith("CPT:")) else f"NORM:{sid}"
            for sid in start_ids
        ]

        allowed_rels = rels or ["CITES", "DEFINES"]
        rel_clause = ",".join(f"'{r}'" for r in allowed_rels)

        conn = self._get_conn()
        cur = conn.cursor()

        # 构建起始节点 UNION 查询
        start_unions = " UNION ALL ".join(f"SELECT '{s}' AS node, 0 AS depth" for s in clean_starts)

        sql = f"""
        WITH RECURSIVE walk(node, depth) AS (
            {start_unions}
            UNION
            SELECT e.dst, w.depth + 1
            FROM walk w
            JOIN edges_top e ON e.src = w.node
            WHERE w.depth < ? AND e.rel IN ({rel_clause})
        )
        SELECT node, MIN(depth) AS depth
        FROM walk
        WHERE node NOT IN ({','.join(f"'{s}'" for s in clean_starts)})
        GROUP BY node
        ORDER BY depth ASC
        LIMIT ?;
        """

        try:
            cur.execute(sql, (max_hops, limit))
            return [dict(r) for r in cur.fetchall()]
        except Exception:
            return []

    def get_hot_cases_for_norm(self, norm_id: str, limit: int = 5) -> List[str]:
        """获取适用该法条的热门判例 ID (预计算物化表)"""
        clean_norm = norm_id.replace("NORM:", "")
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute(
            """SELECT case_id FROM hot_norm_cases
               WHERE norm_id = ?
               ORDER BY rank ASC LIMIT ?""",
            (clean_norm, limit)
        )
        return [row[0] for row in cur.fetchall()]
