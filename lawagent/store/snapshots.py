"""只读快照库与快照生命周期管理器 (SnapshotManager)
对齐技术方案第 3.4 节与第 4.8 节：
- 案件固定快照 ID，恢复与追加问题沿用案件快照
- 内存中保留当前快照与上一个快照 (keep=2)
- 原子读取 data/current_snapshot 指针
"""

import os
import sqlite3
import threading
from typing import Optional, Dict, Any, List


class SnapshotManager:
    def __init__(self, base_dir: str = "data/snapshots", pointer_file: str = "data/current_snapshot", keep: int = 2):
        self.base_dir = base_dir
        self.pointer_file = pointer_file
        self.keep = keep
        self._conns: Dict[str, sqlite3.Connection] = {}
        self._lock = threading.Lock()
        self.reload()

    def get_current_snapshot_id(self) -> str:
        """从指针文件获取当前生效的快照 ID"""
        if os.path.exists(self.pointer_file):
            with open(self.pointer_file, "r", encoding="utf-8") as f:
                snap_id = f.read().strip()
                if snap_id:
                    return snap_id
        # 若指针文件不存在，尝试取 snapshots 目录下最新的子目录
        if os.path.exists(self.base_dir):
            dirs = sorted([d for d in os.listdir(self.base_dir) if os.path.isdir(os.path.join(self.base_dir, d))])
            if dirs:
                return dirs[-1]
        return "20261008-gii-rii-v0.7"

    def set_current_snapshot_id(self, snapshot_id: str):
        """原子切换当前快照指针"""
        os.makedirs(os.path.dirname(os.path.abspath(self.pointer_file)), exist_ok=True)
        tmp_file = f"{self.pointer_file}.tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            f.write(snapshot_id)
        os.replace(tmp_file, self.pointer_file)
        self.reload()

    def snapshot_exists(self, snapshot_id: str) -> bool:
        """检查指定快照数据库是否存在"""
        db_path = os.path.join(self.base_dir, snapshot_id, "law.sqlite")
        return os.path.exists(db_path)

    def get_norm_by_id(self, norm_id: str, snapshot_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """按规范编号查询法条（norm_lookup 别名）"""
        return self.norm_lookup(norm_id, snapshot_id=snapshot_id)

    def reload(self):
        """重载快照连接，最多保留 keep 个活跃连接"""
        with self._lock:
            cur_id = self.get_current_snapshot_id()
            if cur_id not in self._conns:
                conn = self._open_conn(cur_id)
                if conn:
                    self._conns[cur_id] = conn

            # 清理超过 keep 个的陈旧连接
            if len(self._conns) > self.keep:
                keys = list(self._conns.keys())
                for k in keys[:-self.keep]:
                    self._conns[k].close()
                    del self._conns[k]

    def _open_conn(self, snapshot_id: str) -> Optional[sqlite3.Connection]:
        db_path = os.path.join(self.base_dir, snapshot_id, "law.sqlite")
        if not os.path.exists(db_path):
            return None
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def get_connection(self, snapshot_id: Optional[str] = None) -> Optional[sqlite3.Connection]:
        snap_id = snapshot_id or self.get_current_snapshot_id()
        with self._lock:
            if snap_id in self._conns:
                return self._conns[snap_id]
            conn = self._open_conn(snap_id)
            if conn:
                self._conns[snap_id] = conn
                return conn
            return None

    def norm_lookup(self, law_or_id: str, enbez: Optional[str] = None, snapshot_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """精确按条号检索法条：
        支持 norm_lookup("BGB:§433") 或 norm_lookup("BGB", "§ 433") 或 norm_lookup("BGB", "433")
        """
        conn = self.get_connection(snapshot_id)
        if not conn:
            return None

        if enbez is None and ":" in law_or_id:
            parts = law_or_id.split(":", 1)
            law, enbez_str = parts[0].strip(), parts[1].strip()
        else:
            law = law_or_id.strip()
            enbez_str = enbez.strip() if enbez else ""

        # 标准化 enbez (确保带 §)
        clean_enbez = enbez_str.replace(" ", "")
        if not clean_enbez.startswith("§") and not clean_enbez.startswith("Art"):
            clean_enbez = f"§{clean_enbez}"
        spaced_enbez = clean_enbez.replace("§", "§ ")

        norm_id = f"{law}:{clean_enbez}".replace(" ", "")

        cur = conn.cursor()
        cur.execute(
            """SELECT norm_id, law, enbez, title, heading_path, text_de, structure, stand, has_pending_amend, source_url, snapshot_id
               FROM norms
               WHERE norm_id = ?
                  OR (law = ? AND (enbez = ? OR REPLACE(enbez, ' ', '') = ?))
               LIMIT 1""",
            (norm_id, law, spaced_enbez, clean_enbez)
        )
        row = cur.fetchone()
        return dict(row) if row else None

    def case_lookup(self, case_id: str, snapshot_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """按 case_id 或 az 案号检索判例全文与元数据"""
        conn = self.get_connection(snapshot_id)
        if not conn:
            return None
        cur = conn.cursor()
        cur.execute(
            """SELECT case_id, court, senate, decided, az, ecli, doctype, leitsatz, tenor, tatbestand, gruende, norms_meta, source_url
               FROM cases
               WHERE case_id = ? OR az = ?
               LIMIT 1""",
            (case_id, case_id)
        )
        row = cur.fetchone()
        return dict(row) if row else None

    def get_all_norms(self, snapshot_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取当前快照所有法条记录 (用于索引构建与全量切块)"""
        conn = self.get_connection(snapshot_id)
        if not conn:
            return []
        cur = conn.cursor()
        cur.execute(
            """SELECT norm_id, law, enbez, title, heading_path, text_de, structure, stand, has_pending_amend, source_url, snapshot_id
               FROM norms
               ORDER BY law, norm_id"""
        )
        return [dict(r) for r in cur.fetchall()]

    def get_all_cases(self, snapshot_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取当前快照所有判例记录 (用于切块与向量索引)"""
        conn = self.get_connection(snapshot_id)
        if not conn:
            return []
        cur = conn.cursor()
        cur.execute(
            """SELECT case_id, court, senate, decided, az, ecli, doctype, leitsatz, tenor, tatbestand, gruende, norms_meta, source_url
               FROM cases
               ORDER BY decided DESC"""
        )
        return [dict(r) for r in cur.fetchall()]

    def get_cites_of(self, norm_id: str, limit: int = 5, snapshot_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """查询适用该法条的权威判例 (按 hot_norm_cases 或 edges 查询)"""
        conn = self.get_connection(snapshot_id)
        if not conn:
            return []
        cur = conn.cursor()
        clean_norm = norm_id.replace("NORM:", "")
        cur.execute(
            """SELECT c.* FROM cases c
               JOIN hot_norm_cases h ON c.case_id = h.case_id
               WHERE h.norm_id = ?
               ORDER BY h.rank ASC
               LIMIT ?""",
            (clean_norm, limit)
        )
        rows = cur.fetchall()
        if not rows:
            cur.execute(
                """SELECT c.* FROM cases c
                   JOIN edges e ON f'CASE:' || c.case_id = e.src
                   WHERE e.dst = ? AND e.rel = 'APPLIES'
                   LIMIT ?""",
                (f"NORM:{clean_norm}", limit)
            )
            rows = cur.fetchall()
        return [dict(r) for r in rows]
