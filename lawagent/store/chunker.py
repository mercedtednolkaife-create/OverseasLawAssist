"""法条与判例切块模块 (Chunking & Context Augmentation)
对齐技术方案第 4.4 节：
- 法条：一条一块，长条文按款 (Absatz) 切分，前缀携带编章路径与条文标题 (ctx_prefix)
- 判决：Leitsatz + Tenor 组成权威摘要块，Gründe / Tatbestand 按段落切块
- 将切块写入快照库 chunks 表并供 BM25 与向量模型建立索引
"""

import json
import sqlite3
from typing import List, Dict, Any


def chunk_norms(norms: List[Dict[str, Any]], max_chars: int = 1800) -> List[Dict[str, Any]]:
    """对法条进行切块与上下文前缀拼接"""
    chunks: List[Dict[str, Any]] = []

    for n in norms:
        norm_id = n["norm_id"]
        law = n["law"]
        enbez = n["enbez"]
        title = n["title"] or ""
        heading = n["heading_path"] or ""
        text_de = n["text_de"] or ""

        ctx_prefix = f"{law} {enbez} {title} | {heading}".strip().strip("|").strip()

        # 检查结构层是否有多款
        structure = []
        if n.get("structure"):
            try:
                structure = json.loads(n["structure"])
            except Exception:
                structure = []

        if len(text_de) <= max_chars or len(structure) <= 1:
            chunk_id = f"CHUNK:NORM:{norm_id}:0"
            chunks.append({
                "chunk_id": chunk_id,
                "kind": "norm",
                "ref_id": norm_id,
                "seq": 0,
                "text": f"{ctx_prefix}\n{text_de}".strip(),
                "ctx_prefix": ctx_prefix,
            })
        else:
            # 按 Absatz 细化切块
            seq = 0
            cur_text = ""
            for abs_item in structure:
                abs_nr = abs_item.get("absatz", "")
                abs_str = f"({abs_nr}) " if abs_nr else ""
                part_text = f"{abs_str}{abs_item.get('text', '')}"
                if len(cur_text) + len(part_text) > max_chars and cur_text:
                    chunk_id = f"CHUNK:NORM:{norm_id}:{seq}"
                    chunks.append({
                        "chunk_id": chunk_id,
                        "kind": "norm",
                        "ref_id": norm_id,
                        "seq": seq,
                        "text": f"{ctx_prefix}\n{cur_text}".strip(),
                        "ctx_prefix": ctx_prefix,
                    })
                    seq += 1
                    cur_text = part_text
                else:
                    cur_text = f"{cur_text}\n{part_text}".strip()

            if cur_text:
                chunk_id = f"CHUNK:NORM:{norm_id}:{seq}"
                chunks.append({
                    "chunk_id": chunk_id,
                    "kind": "norm",
                    "ref_id": norm_id,
                    "seq": seq,
                    "text": f"{ctx_prefix}\n{cur_text}".strip(),
                    "ctx_prefix": ctx_prefix,
                })

    return chunks


def chunk_cases(cases: List[Dict[str, Any]], max_chars: int = 1500) -> List[Dict[str, Any]]:
    """对判例进行切块：Leitsatz+Tenor 为核心摘要块，Gründe 按段落切块"""
    chunks: List[Dict[str, Any]] = []

    for c in cases:
        case_id = c["case_id"]
        court = c["court"] or ""
        az = c["az"] or ""
        decided = c["decided"] or ""
        doctype = c["doctype"] or "Urteil"

        ctx_prefix = f"{court} {az} ({decided}) {doctype}".strip()

        # 块 0：权威裁判要旨 (Leitsatz) 与主文 (Tenor)
        leitsatz = c.get("leitsatz") or ""
        tenor = c.get("tenor") or ""
        summary_text = f"Leitsatz: {leitsatz}\nTenor: {tenor}".strip()
        chunks.append({
            "chunk_id": f"CHUNK:CASE:{case_id}:0",
            "kind": "case",
            "ref_id": case_id,
            "seq": 0,
            "text": f"{ctx_prefix}\n{summary_text}".strip(),
            "ctx_prefix": ctx_prefix,
        })

        # 块 1：案情事实经过 (Tatbestand)
        tatbestand = c.get("tatbestand") or ""
        if tatbestand:
            chunks.append({
                "chunk_id": f"CHUNK:CASE:{case_id}:1",
                "kind": "case",
                "ref_id": case_id,
                "seq": 1,
                "text": f"{ctx_prefix} Tatbestand:\n{tatbestand}".strip(),
                "ctx_prefix": f"{ctx_prefix} Tatbestand",
            })

        # 块 2..N：裁判理由 (Gründe)
        gruende = c.get("gruende") or ""
        if gruende:
            paragraphs = [p.strip() for p in gruende.split("\n") if p.strip()]
            seq = 2
            cur_p = ""
            for p in paragraphs:
                if len(cur_p) + len(p) > max_chars and cur_p:
                    chunks.append({
                        "chunk_id": f"CHUNK:CASE:{case_id}:{seq}",
                        "kind": "case",
                        "ref_id": case_id,
                        "seq": seq,
                        "text": f"{ctx_prefix} Entscheidungsgründe:\n{cur_p}".strip(),
                        "ctx_prefix": f"{ctx_prefix} Gründe",
                    })
                    seq += 1
                    cur_p = p
                else:
                    cur_p = f"{cur_p}\n{p}".strip()

            if cur_p:
                chunks.append({
                    "chunk_id": f"CHUNK:CASE:{case_id}:{seq}",
                    "kind": "case",
                    "ref_id": case_id,
                    "seq": seq,
                    "text": f"{ctx_prefix} Entscheidungsgründe:\n{cur_p}".strip(),
                    "ctx_prefix": f"{ctx_prefix} Gründe",
                })

    return chunks


def build_and_save_chunks(conn: sqlite3.Connection, norms: List[Dict[str, Any]], cases: List[Dict[str, Any]]) -> int:
    """批量生成所有法条与判例分块并写入 chunks 数据表"""
    n_chunks = chunk_norms(norms)
    c_chunks = chunk_cases(cases)
    all_chunks = n_chunks + c_chunks

    cur = conn.cursor()
    cur.execute("DELETE FROM chunks;")
    for ch in all_chunks:
        cur.execute(
            """INSERT OR REPLACE INTO chunks (chunk_id, kind, ref_id, seq, text, ctx_prefix)
               VALUES (:chunk_id, :kind, :ref_id, :seq, :text, :ctx_prefix)""",
            ch
        )
    conn.commit()
    return len(all_chunks)
