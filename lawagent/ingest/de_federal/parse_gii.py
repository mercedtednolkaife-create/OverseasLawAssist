"""德国联邦法 XML 解析与结构化入库模块
对齐技术方案第 4.3 节：
- 解析 metadaten (jurabk, enbez, titel, gliederungseinheit)
- build_structure 将 Content 细化切分为 Absatz、Nummer 两层结构
- 记录 Stand 标注原文与 has_pending_amend 标志位
- 入库写入快照库 norms 表与 norm_versions (version_no=1) 表
"""

import io
import os
import re
import json
import zipfile
import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime
from lxml import etree

RE_ABS = re.compile(r"^\((\d+[a-z]?)\)\s*")


def build_structure(content_el: Optional[etree._Element]) -> List[Dict[str, Any]]:
    """把 Content 下的 P 与 DL 切成 Absatz、Nummer 两层结构"""
    if content_el is None:
        return []

    absaetze: List[Dict[str, Any]] = []
    cur: Optional[Dict[str, Any]] = None

    for el in content_el:
        if el.tag == "P":
            text = " ".join(el.itertext()).strip()
            if not text:
                continue
            m = RE_ABS.match(text)
            if m or cur is None:
                cur = {
                    "absatz": m.group(1) if m else "",
                    "text": RE_ABS.sub("", text).strip(),
                    "nummern": [],
                }
                absaetze.append(cur)
            else:
                cur["text"] += "\n" + text
        elif el.tag == "DL" and cur is not None:
            for dt, dd in zip(el.findall("DT"), el.findall("DD")):
                nr_text = " ".join(dt.itertext()).strip().rstrip(".")
                val_text = " ".join(dd.itertext()).strip()
                cur["nummern"].append({"nr": nr_text, "text": val_text})

    return absaetze


def parse_gii_xml(xml_bytes: bytes, snapshot_id: str, source_url: str = "") -> List[Dict[str, Any]]:
    """解析单个法律 XML 字节流为结构化字典列表"""
    root = etree.fromstring(xml_bytes)
    norms = root.findall("norm")
    if not norms:
        return []

    meta0 = norms[0].find("metadaten")
    law = meta0.findtext("jurabk") if meta0 is not None else "LAW"
    if not law:
        law = "LAW"
    law = law.strip().replace(" ", "")

    stand_elements = meta0.findall("standangabe") if meta0 is not None else []
    stand = " | ".join(" ".join(x.itertext()).strip() for x in stand_elements)
    has_pending = int("noch nicht berücksichtigt" in stand.lower())

    rows: List[Dict[str, Any]] = []
    fetched_at = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    for n in norms[1:]:
        m = n.find("metadaten")
        if m is None:
            continue
        enbez = m.findtext("enbez")
        if not enbez:
            continue  # 跳过无条号的结构单元

        paras = [" ".join(p.itertext()).strip() for p in n.iterfind(".//textdaten//P")]
        content_el = n.find(".//textdaten//Content")
        structure = build_structure(content_el)

        heading_parts = []
        for g in m.findall("gliederungseinheit"):
            bez = g.findtext("gliederungsbez") or ""
            titel = g.findtext("gliederungstitel") or ""
            part = f"{bez} {titel}".strip()
            if part:
                heading_parts.append(part)
        heading = " > ".join(heading_parts)

        clean_enbez = enbez.strip()
        norm_id = f"{law}:{clean_enbez}".replace(" ", "")
        text_de = "\n".join(p for p in paras if p).strip()
        title = (m.findtext("titel") or "").strip()

        rows.append({
            "norm_id": norm_id,
            "law": law,
            "enbez": clean_enbez,
            "title": title,
            "heading_path": heading,
            "text_de": text_de,
            "structure": json.dumps(structure, ensure_ascii=False),
            "footnotes": "",
            "stand": stand,
            "has_pending_amend": has_pending,
            "source_url": source_url or f"https://www.gesetze-im-internet.de/{law.lower()}/__{clean_enbez.replace('§', '').strip()}.html",
            "snapshot_id": snapshot_id,
            "fetched_at": fetched_at,
        })

    return rows


def ingest_law_zip(zip_path: str, snapshot_id: str, conn: sqlite3.Connection) -> int:
    """解压并导入单个法律 zip 包到 SQLite 快照库"""
    with zipfile.ZipFile(zip_path, "r") as z:
        xml_names = [n for n in z.namelist() if n.lower().endswith(".xml")]
        if not xml_names:
            return 0
        xml_bytes = z.read(xml_names[0])

    source_url = f"https://www.gesetze-im-internet.de/{os.path.basename(zip_path).replace('.zip', '')}/xml.zip"
    rows = parse_gii_xml(xml_bytes, snapshot_id, source_url)

    cur = conn.cursor()
    for r in rows:
        cur.execute(
            """INSERT OR REPLACE INTO norms
               (norm_id, law, enbez, title, heading_path, text_de, structure, footnotes, stand, has_pending_amend, source_url, snapshot_id, fetched_at)
               VALUES (:norm_id, :law, :enbez, :title, :heading_path, :text_de, :structure, :footnotes, :stand, :has_pending_amend, :source_url, :snapshot_id, :fetched_at)""",
            r
        )
        cur.execute(
            """INSERT OR REPLACE INTO norm_versions
               (norm_id, version_no, valid_from, valid_to, text_de, structure, stand, source_url, snapshot_id)
               VALUES (?, 1, NULL, NULL, ?, ?, ?, ?, ?)""",
            (r["norm_id"], r["text_de"], r["structure"], r["stand"], r["source_url"], snapshot_id)
        )

    conn.commit()
    return len(rows)
