"""Word 报告导出模块 (DOCX Report Generator)
严格满足《最高人民法院关于适用〈涉外民事关系法律适用法〉若干问题的解释（二）》第三条：
查明外国法律，应当包括外国法律的现行有效文本、立法背景、司法解释以及相关的司法判例等。
- A包 域外法规范查明材料包 (双语对照、条文指纹、效力说明)
- B包 事实涵摄与咨询准备包 (要件矩阵、律师咨询清单、BGH 判例比对)
"""

import os
from io import BytesIO
from datetime import datetime
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

from lawagent.core.types import CaseState


def _set_cell_background(cell, fill_hex: str):
    """设置单元格背景底色"""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)


def generate_case_docx(state: CaseState) -> BytesIO:
    """基于 CaseState 生成结构完备的专业法律查明咨询报告"""
    doc = Document()

    # 1. 设置主标题
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_p.add_run("德国联邦法域外法查明与法律适用咨询报告")
    title_run.font.size = Pt(20)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(30, 41, 59)

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = sub_p.add_run("German Federal Law Ascertainment & Consultation Dossier")
    sub_run.font.size = Pt(11)
    sub_run.font.italic = True
    sub_run.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph()

    # 2. 案件元数据摘要表
    h1 = doc.add_heading("一、查明基本信息与案件元数据", level=1)
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False

    labels = [
        ("案件查明编号", state.case_id),
        ("合同性质与当事人", f"{state.meta.contract_type or '国际商事合同'} | {', '.join(state.meta.parties) or '中德涉案双方'}"),
        ("选法条款与CISG状态", f"准据法：{state.meta.choice_of_law or '德国法'} | CISG排除：{'已有效排除' if state.meta.cisg_excluded else '未确认排除/需前置公约审查'}"),
        ("关键时点与版本核验", f"合同日：{state.meta.contract_date or '未载明'} | 事实日：{state.meta.event_date or '未载明'} | 时点警示：【{state.timepoint.get('level', 'yellow').upper()}态】"),
        ("官方快照数据指纹", f"不可变快照：{state.snapshot_id} (gesetze-im-internet 合并生效版)")
    ]

    for idx, (lbl, val) in enumerate(labels):
        row = meta_table.rows[idx]
        cell_lbl, cell_val = row.cells[0], row.cells[1]
        cell_lbl.width = Inches(2.2)
        cell_val.width = Inches(4.3)
        cell_lbl.text = lbl
        cell_val.text = val
        cell_lbl.paragraphs[0].runs[0].font.bold = True
        _set_cell_background(cell_lbl, "F1F5F9")

    doc.add_paragraph()

    # 3. 第一部分：A包 域外法规范查明材料包
    doc.add_heading("二、第一部分：德意志联邦现行有效规范材料包 (Part A)", level=1)
    p_a_intro = doc.add_paragraph(
        "依据德意志联邦司法部官方公布之现行有效法律文本（合并现行版），系统严格定位并提取支撑本案争议焦点之法定权利基础及构成要件条款如下："
    )
    p_a_intro.runs[0].font.color.rgb = RGBColor(51, 65, 85)

    # 法条表格
    if state.evidence:
        norm_evs = [ev for ev in state.evidence.values() if ev.kind == "norm"]
        if norm_evs:
            doc.add_heading("2.1 核心法定依据双语对照清单", level=2)
            ev_table = doc.add_table(rows=len(norm_evs) + 1, cols=4)
            ev_table.alignment = WD_TABLE_ALIGNMENT.CENTER

            headers = ["编号", "规范条号", "德文条款原文 (Gesetzestext)", "中文权威释义与术语对照"]
            for col_idx, h in enumerate(headers):
                cell = ev_table.rows[0].cells[col_idx]
                cell.text = h
                cell.paragraphs[0].runs[0].font.bold = True
                _set_cell_background(cell, "E2E8F0")

            ev_table.columns[0].width = Inches(0.8)
            ev_table.columns[1].width = Inches(1.2)
            ev_table.columns[2].width = Inches(2.3)
            ev_table.columns[3].width = Inches(2.2)

            for r_idx, ev in enumerate(norm_evs, 1):
                row = ev_table.rows[r_idx]
                row.cells[0].text = ev.eid
                row.cells[1].text = ev.ref_id
                row.cells[2].text = ev.text_de[:400] + ("..." if len(ev.text_de) > 400 else "")
                trans = state.translations.get(ev.eid, "中文释义待校验")
                row.cells[3].text = trans[:400] + ("..." if len(trans) > 400 else "")

    doc.add_paragraph()

    # 4. 第二部分：B包 事实涵摄与律师咨询准备包
    doc.add_heading("三、第二部分：事实涵摄与律师咨询准备包 (Part B)", level=1)
    p_b_intro = doc.add_paragraph(
        "本部分聚焦事实与构成要件之涵摄分析（Subsumtion），提炼事实举证状态、案情缺口并形成向德国执业律师咨询之专业问询清单，供出庭与非诉谈判准备之用。"
    )

    if state.elements:
        doc.add_heading("3.1 构成要件事实匹配与涵摄状态表", level=2)
        elem_table = doc.add_table(rows=len(state.elements) + 1, cols=4)
        elem_table.alignment = WD_TABLE_ALIGNMENT.CENTER

        e_headers = ["构成要件", "关联事实凭证", "满足状态", "事实涵摄与法律分析说明"]
        for col_idx, h in enumerate(e_headers):
            cell = elem_table.rows[0].cells[col_idx]
            cell.text = h
            cell.paragraphs[0].runs[0].font.bold = True
            _set_cell_background(cell, "E2E8F0")

        elem_table.columns[0].width = Inches(1.5)
        elem_table.columns[1].width = Inches(1.2)
        elem_table.columns[2].width = Inches(1.0)
        elem_table.columns[3].width = Inches(2.8)

        status_map = {
            "satisfied": "充分满足",
            "partial": "部分满足",
            "missing": "事实缺失",
            "disputed": "存有争议"
        }

        for r_idx, el in enumerate(state.elements, 1):
            row = elem_table.rows[r_idx]
            row.cells[0].text = el.name_zh
            row.cells[1].text = ", ".join(el.fact_links or ["待举证"])
            st_text = status_map.get(el.match_status or "missing", "待定")
            row.cells[2].text = st_text
            row.cells[3].text = el.match_note or "需进一步核实要件事实"

    doc.add_paragraph()

    # 咨询问题
    if state.counsel_questions:
        doc.add_heading("3.2 向德国当地律师咨询之关键问题清单 (Counsel Questions)", level=2)
        for q_idx, cq in enumerate(state.counsel_questions, 1):
            p_q = doc.add_paragraph()
            p_q.add_run(f"Q{q_idx}. ").bold = True
            p_q.add_run(cq)

    # 类似判例
    if state.similar_cases:
        doc.add_heading("3.3 德意志联邦最高法院 (BGH) 指导判例精选", level=2)
        for sc in state.similar_cases:
            p_c = doc.add_paragraph()
            p_c.add_run(f"【{sc.court} {sc.az} ({sc.date})】\n").bold = True
            p_c.add_run(f"裁判要旨：{sc.court_view_zh}\n")
            p_c.add_run(f"德文裁判原文片段：{sc.court_view_quote_de[:250]}...\n").italic = True
            p_c.add_run(f"事实异同对比：{'; '.join(sc.similarity_points)}；差异点：{'; '.join(sc.difference_points)}")

    doc.add_paragraph()

    # 5. 质量门禁与防线声明
    doc.add_heading("四、质量门禁 (V1-V11) 与客观中立性声明", level=1)
    p_disclaimer = doc.add_paragraph(
        "【客观中立性防线声明】本报告依据人工智能辅助系统结合不可变法律快照生成。本报告仅提供客观规范条款、构成要件逻辑结构与证据准备指引，坚决不作任何绝对胜诉率预测或裁判结果保证。所有实体权利与程序主张均应由具有德意志联邦执业资格之法律专业人员线下最终复核。"
    )
    p_disclaimer.runs[0].font.color.rgb = RGBColor(180, 83, 9)

    doc_stream = BytesIO()
    doc.save(doc_stream)
    doc_stream.seek(0)
    return doc_stream
