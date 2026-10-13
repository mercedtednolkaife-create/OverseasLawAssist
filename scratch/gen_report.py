# -*- coding: utf-8 -*-
"""
Generate 产品设计技术报告.docx — professional Chinese technical report.
Uses python-docx for document, matplotlib for diagrams, lxml for OOXML math.
"""

import os
import sys

# ── paths ──────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRATCH_DIR = SCRIPT_DIR  # scratch dir for PNGs
OUT_DOCX = os.path.join(os.path.dirname(SCRIPT_DIR), "产品设计技术报告.docx")

# ── matplotlib diagrams (generate first) ──────────────────────────
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patches as mpatches
import numpy as np

plt.rcParams["font.sans-serif"] = ["SimHei"]
plt.rcParams["axes.unicode_minus"] = False

DPI = 200


def draw_architecture():
    """四层架构图 – vertical stacked boxes"""
    fig, ax = plt.subplots(figsize=(7, 5))
    layers = [
        ("服务与表现层", "FastAPI · React 19 · SSE", "#4A90D9"),
        ("核心推理层", "LangGraph · 7 Agent 节点 · 人机协同", "#5DADE2"),
        ("知识引擎与检索层", "BM25 · BGE-M3 · FAISS · RRF · 图谱遍历", "#48C9B0"),
        ("数据存储层", "law.sqlite (只读) · state.sqlite (WAL)", "#F5B041"),
    ]
    y_positions = [3.6, 2.6, 1.6, 0.6]
    for i, ((label, desc, color), y) in enumerate(zip(layers, y_positions)):
        rect = FancyBboxPatch((0.5, y), 6, 0.75, boxstyle="round,pad=0.1",
                              facecolor=color, edgecolor="#333", linewidth=1.5, alpha=0.9)
        ax.add_patch(rect)
        ax.text(3.5, y + 0.48, label, ha="center", va="center", fontsize=13, fontweight="bold", color="white")
        ax.text(3.5, y + 0.18, desc, ha="center", va="center", fontsize=8.5, color="white")
    # arrows between layers
    for y in [3.6, 2.6, 1.6]:
        ax.annotate("", xy=(3.5, y), xytext=(3.5, y + 0.01),
                     arrowprops=dict(arrowstyle="->", color="#555", lw=1.5))
    ax.set_xlim(0, 7)
    ax.set_ylim(0, 4.8)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title("系统四层架构", fontsize=14, fontweight="bold", pad=10)
    path = os.path.join(SCRATCH_DIR, "arch.png")
    fig.savefig(path, dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


def draw_workflow():
    """工作流状态图 – S1→S2→…→S7 with human gates & feedback"""
    fig, ax = plt.subplots(figsize=(10, 3.5))
    nodes = ["S1\n事实抽取", "S2\n准据法前检", "S3\n争点拆解", "S4\n双通道检索",
             "S5\n要件涵摄", "S6\n策略推演", "S7\n双语起草\n+审查"]
    xs = np.linspace(0.8, 9.2, 7)
    y = 1.5
    for i, (x, label) in enumerate(zip(xs, nodes)):
        color = "#E74C3C" if i in (1, 2) else "#3498DB"
        rect = FancyBboxPatch((x - 0.52, y - 0.4), 1.04, 0.85,
                              boxstyle="round,pad=0.08", facecolor=color,
                              edgecolor="#333", linewidth=1.2, alpha=0.88)
        ax.add_patch(rect)
        ax.text(x, y + 0.02, label, ha="center", va="center", fontsize=8, color="white", fontweight="bold")
    # arrows
    for i in range(6):
        ax.annotate("", xy=(xs[i + 1] - 0.55, y), xytext=(xs[i] + 0.55, y),
                     arrowprops=dict(arrowstyle="-|>", color="#555", lw=1.5))
    # human gate labels
    for idx in [1, 2]:
        ax.text(xs[idx], y - 0.65, "⛔ 人工审核闸门", ha="center", va="center",
                fontsize=7, color="#C0392B", fontweight="bold",
                bbox=dict(facecolor="#FDEDEC", edgecolor="#E74C3C", boxstyle="round,pad=0.15"))
    # feedback loop from S7 back to S7 (revision)
    ax.annotate("", xy=(xs[6] + 0.3, y + 0.5), xytext=(xs[6] + 0.3, y + 1.1),
                arrowprops=dict(arrowstyle="-|>", color="#E67E22", lw=1.3,
                                connectionstyle="arc3,rad=-0.5"))
    ax.text(xs[6] + 0.75, y + 0.95, "门禁驳回\n重写", ha="center", fontsize=6.5, color="#E67E22")
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 2.8)
    ax.axis("off")
    ax.set_title("状态图工作流编排（红色节点含人工审核闸门）", fontsize=12, fontweight="bold", pad=8)
    path = os.path.join(SCRATCH_DIR, "workflow.png")
    fig.savefig(path, dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


def draw_evidence_chain():
    """证据链闭环图 – M→F→EL→§"""
    fig, ax = plt.subplots(figsize=(8, 2.8))
    labels = ["M#\n原始证据材料", "F#\n事实片段", "EL#\n法定构成要件", "§\n规范条文"]
    colors = ["#1ABC9C", "#3498DB", "#9B59B6", "#E74C3C"]
    xs = [1.2, 3.4, 5.6, 7.8]
    y = 1.2
    for x, lab, c in zip(xs, labels, colors):
        rect = FancyBboxPatch((x - 0.6, y - 0.4), 1.4, 0.9,
                              boxstyle="round,pad=0.1", facecolor=c,
                              edgecolor="#333", linewidth=1.3, alpha=0.85)
        ax.add_patch(rect)
        ax.text(x + 0.1, y + 0.05, lab, ha="center", va="center", fontsize=9, color="white", fontweight="bold")
    for i in range(3):
        ax.annotate("", xy=(xs[i + 1] - 0.65, y), xytext=(xs[i] + 0.75, y),
                     arrowprops=dict(arrowstyle="-|>", color="#555", lw=1.5))
    # reverse tracing arrow (bottom)
    ax.annotate("", xy=(xs[0], y - 0.7), xytext=(xs[3], y - 0.7),
                arrowprops=dict(arrowstyle="-|>", color="#E67E22", lw=1.2,
                                connectionstyle="arc3,rad=0.25", linestyle="--"))
    ax.text(4.5, y - 1.0, "反向溯源", ha="center", fontsize=8, color="#E67E22", fontstyle="italic")
    ax.set_xlim(0, 9)
    ax.set_ylim(-0.3, 2.5)
    ax.axis("off")
    ax.set_title("证据链闭环图", fontsize=12, fontweight="bold", pad=8)
    path = os.path.join(SCRATCH_DIR, "evidence_chain.png")
    fig.savefig(path, dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


def draw_dual_model():
    """双模型交互图 – Generator / Critic sequence-style"""
    fig, ax = plt.subplots(figsize=(7, 4.5))
    # two lifelines
    gx, cx = 2, 5
    ax.plot([gx, gx], [0.2, 4.0], color="#3498DB", lw=2)
    ax.plot([cx, cx], [0.2, 4.0], color="#E74C3C", lw=2)
    # headers
    for x, label, c in [(gx, "主推理模型\ndeepseek-v4.1-flash", "#3498DB"),
                         (cx, "裁判模型\ndeepseek-v4-pro-0813", "#E74C3C")]:
        rect = FancyBboxPatch((x - 0.85, 3.7), 1.7, 0.65, boxstyle="round,pad=0.08",
                              facecolor=c, edgecolor="#333", linewidth=1.2, alpha=0.9)
        ax.add_patch(rect)
        ax.text(x, 4.02, label, ha="center", va="center", fontsize=8, color="white", fontweight="bold")
    # messages
    msgs = [
        (3.3, "生成法律意见书初稿", "->"),
        (2.6, "V1-V11 质量门禁审查", "<-"),
        (1.9, "驳回 + 修改意见", "<-"),
        (1.2, "修订后重新提交", "->"),
        (0.6, "PASSED / 最终通过", "<-"),
    ]
    for y_m, label, direction in msgs:
        if direction == "->":
            ax.annotate("", xy=(cx - 0.05, y_m), xytext=(gx + 0.05, y_m),
                         arrowprops=dict(arrowstyle="-|>", color="#555", lw=1.2))
            ax.text(3.5, y_m + 0.12, label, ha="center", fontsize=7.5, color="#333")
        else:
            ax.annotate("", xy=(gx + 0.05, y_m), xytext=(cx - 0.05, y_m),
                         arrowprops=dict(arrowstyle="-|>", color="#555", lw=1.2))
            ax.text(3.5, y_m + 0.12, label, ha="center", fontsize=7.5, color="#333")
    ax.set_xlim(0, 7)
    ax.set_ylim(-0.1, 4.8)
    ax.axis("off")
    ax.set_title("双模型生成-审查交互", fontsize=12, fontweight="bold", pad=8)
    path = os.path.join(SCRATCH_DIR, "dual_model.png")
    fig.savefig(path, dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


# ── Generate all diagrams ─────────────────────────────────────────
print("Generating diagrams …")
img_arch = draw_architecture()
img_workflow = draw_workflow()
img_evidence = draw_evidence_chain()
img_dual = draw_dual_model()
print("Diagrams saved.")

# ── Now build the DOCX ────────────────────────────────────────────
from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
from lxml import etree
import copy

doc = Document()

# ── Page Setup (A4, 2.54 cm margins) ──────────────────────────────
section = doc.sections[0]
section.page_width = Cm(21.0)
section.page_height = Cm(29.7)
for attr in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
    setattr(section, attr, Cm(2.54))

# ── Style Setup ───────────────────────────────────────────────────
style_normal = doc.styles["Normal"]
style_normal.font.name = "SimSun"
style_normal.font.size = Pt(12)
style_normal._element.rPr.rFonts.set(qn("w:eastAsia"), "SimSun")
style_normal.paragraph_format.line_spacing = 1.5
style_normal.paragraph_format.space_after = Pt(6)

for level in range(1, 4):
    sname = f"Heading {level}"
    s = doc.styles[sname]
    s.font.name = "SimHei"
    s._element.rPr.rFonts.set(qn("w:eastAsia"), "SimHei")
    s.font.color.rgb = RGBColor(0, 0, 0)
    s.font.bold = True
    sizes = {1: 22, 2: 16, 3: 14}
    s.font.size = Pt(sizes[level])


# ── Helper functions ──────────────────────────────────────────────
def add_para(text, style="Normal", bold=False, alignment=None, space_before=0, space_after=6):
    p = doc.add_paragraph(style=style)
    run = p.add_run(text)
    run.font.name = "SimSun"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "SimSun")
    if bold:
        run.font.bold = True
    if alignment is not None:
        p.alignment = alignment
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    return p


def add_heading(text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = "SimHei"
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "SimHei")
        run.font.color.rgb = RGBColor(0, 0, 0)
    return h


def add_table(headers, rows, col_widths=None):
    """Add a table with shaded header row."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # header
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = ""
        p = hdr_cells[i].paragraphs[0]
        run = p.add_run(h)
        run.font.name = "SimHei"
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "SimHei")
        run.font.size = Pt(10)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="2C3E50"/>')
        hdr_cells[i]._element.get_or_add_tcPr().append(shading)
    # data rows
    for r_idx, row_data in enumerate(rows):
        cells = table.rows[r_idx + 1].cells
        for c_idx, val in enumerate(row_data):
            cells[c_idx].text = ""
            p = cells[c_idx].paragraphs[0]
            run = p.add_run(str(val))
            run.font.name = "SimSun"
            run._element.rPr.rFonts.set(qn("w:eastAsia"), "SimSun")
            run.font.size = Pt(10)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        # alternate row shading
        if r_idx % 2 == 0:
            for c_idx in range(len(headers)):
                shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="EBF5FB"/>')
                cells[c_idx]._element.get_or_add_tcPr().append(shading)
    # column widths
    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Cm(w)
    doc.add_paragraph()  # spacing after table
    return table


def add_image(path, width_cm=14):
    doc.add_picture(path, width=Cm(width_cm))
    last_para = doc.paragraphs[-1]
    last_para.alignment = WD_ALIGN_PARAGRAPH.CENTER


# ── OOXML Math helpers ────────────────────────────────────────────
MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
NSMAP = {"m": MATH_NS}


def add_math_to_paragraph(paragraph, math_xml_str):
    """Parse OOXML math XML and append to paragraph element."""
    math_elem = etree.fromstring(math_xml_str)
    paragraph._element.append(math_elem)


def make_math_paragraph(math_xml_str, label=""):
    """Create a new paragraph with optional label and inline OOXML math."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if label:
        run = p.add_run(label)
        run.font.name = "SimSun"
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "SimSun")
        run.font.size = Pt(11)
    add_math_to_paragraph(p, math_xml_str)
    return p


# ── Math XML strings ─────────────────────────────────────────────
# BM25 formula
MATH_BM25 = '''<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:r><m:t>BM25</m:t></m:r>
  <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
    <m:r><m:t>q,d</m:t></m:r>
  </m:e></m:d>
  <m:r><m:t>=</m:t></m:r>
  <m:nary><m:naryPr><m:chr m:val="&#x2211;"/><m:subHide m:val="0"/><m:supHide m:val="0"/></m:naryPr>
    <m:sub><m:r><m:t>i=1</m:t></m:r></m:sub>
    <m:sup><m:r><m:t>n</m:t></m:r></m:sup>
    <m:e>
      <m:r><m:t>IDF</m:t></m:r>
      <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
        <m:sSub><m:sSubPr><m:ctrlPr/></m:sSubPr><m:e><m:r><m:t>q</m:t></m:r></m:e><m:sub><m:r><m:t>i</m:t></m:r></m:sub></m:sSub>
      </m:e></m:d>
      <m:r><m:t>&#x22C5;</m:t></m:r>
      <m:f><m:fPr><m:type m:val="bar"/></m:fPr>
        <m:num>
          <m:r><m:t>tf</m:t></m:r>
          <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
            <m:sSub><m:sSubPr><m:ctrlPr/></m:sSubPr><m:e><m:r><m:t>q</m:t></m:r></m:e><m:sub><m:r><m:t>i</m:t></m:r></m:sub></m:sSub>
            <m:r><m:t>,d</m:t></m:r>
          </m:e></m:d>
          <m:r><m:t>&#x22C5;</m:t></m:r>
          <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
            <m:sSub><m:sSubPr><m:ctrlPr/></m:sSubPr><m:e><m:r><m:t>k</m:t></m:r></m:e><m:sub><m:r><m:t>1</m:t></m:r></m:sub></m:sSub>
            <m:r><m:t>+1</m:t></m:r>
          </m:e></m:d>
        </m:num>
        <m:den>
          <m:r><m:t>tf</m:t></m:r>
          <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
            <m:sSub><m:sSubPr><m:ctrlPr/></m:sSubPr><m:e><m:r><m:t>q</m:t></m:r></m:e><m:sub><m:r><m:t>i</m:t></m:r></m:sub></m:sSub>
            <m:r><m:t>,d</m:t></m:r>
          </m:e></m:d>
          <m:r><m:t>+</m:t></m:r>
          <m:sSub><m:sSubPr><m:ctrlPr/></m:sSubPr><m:e><m:r><m:t>k</m:t></m:r></m:e><m:sub><m:r><m:t>1</m:t></m:r></m:sub></m:sSub>
          <m:r><m:t>&#x22C5;</m:t></m:r>
          <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
            <m:r><m:t>1-b+b&#x22C5;</m:t></m:r>
            <m:f><m:fPr><m:type m:val="bar"/></m:fPr>
              <m:num><m:r><m:t>|d|</m:t></m:r></m:num>
              <m:den><m:r><m:t>avgdl</m:t></m:r></m:den>
            </m:f>
          </m:e></m:d>
        </m:den>
      </m:f>
    </m:e>
  </m:nary>
</m:oMath>'''

# Cosine similarity
MATH_COSINE = '''<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:r><m:t>cos</m:t></m:r>
  <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
    <m:r><m:t>q,d</m:t></m:r>
  </m:e></m:d>
  <m:r><m:t>=</m:t></m:r>
  <m:f><m:fPr><m:type m:val="bar"/></m:fPr>
    <m:num>
      <m:r><m:t>q&#x22C5;d</m:t></m:r>
    </m:num>
    <m:den>
      <m:r><m:t>&#x2016;q&#x2016;&#x22C5;&#x2016;d&#x2016;</m:t></m:r>
    </m:den>
  </m:f>
</m:oMath>'''

# RRF fusion
MATH_RRF = '''<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:r><m:t>RRF</m:t></m:r>
  <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
    <m:r><m:t>d</m:t></m:r>
  </m:e></m:d>
  <m:r><m:t>=</m:t></m:r>
  <m:nary><m:naryPr><m:chr m:val="&#x2211;"/><m:subHide m:val="0"/><m:supHide m:val="1"/></m:naryPr>
    <m:sub><m:r><m:t>m</m:t></m:r></m:sub>
    <m:sup><m:r><m:t> </m:t></m:r></m:sup>
    <m:e>
      <m:f><m:fPr><m:type m:val="bar"/></m:fPr>
        <m:num>
          <m:sSub><m:sSubPr><m:ctrlPr/></m:sSubPr><m:e><m:r><m:t>w</m:t></m:r></m:e><m:sub><m:r><m:t>m</m:t></m:r></m:sub></m:sSub>
        </m:num>
        <m:den>
          <m:r><m:t>k+</m:t></m:r>
          <m:sSub><m:sSubPr><m:ctrlPr/></m:sSubPr><m:e><m:r><m:t>Rank</m:t></m:r></m:e><m:sub><m:r><m:t>m</m:t></m:r></m:sub></m:sSub>
          <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
            <m:r><m:t>d</m:t></m:r>
          </m:e></m:d>
        </m:den>
      </m:f>
    </m:e>
  </m:nary>
</m:oMath>'''

# Graph expansion N^(0), N^(1), N^(2)
MATH_GRAPH = '''<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:sSup><m:sSupPr><m:ctrlPr/></m:sSupPr>
    <m:e><m:r><m:t>N</m:t></m:r></m:e>
    <m:sup><m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e><m:r><m:t>0</m:t></m:r></m:e></m:d></m:sup>
  </m:sSup>
  <m:r><m:t> &#x2192; </m:t></m:r>
  <m:sSup><m:sSupPr><m:ctrlPr/></m:sSupPr>
    <m:e><m:r><m:t>N</m:t></m:r></m:e>
    <m:sup><m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e><m:r><m:t>1</m:t></m:r></m:e></m:d></m:sup>
  </m:sSup>
  <m:r><m:t> &#x2192; </m:t></m:r>
  <m:sSup><m:sSupPr><m:ctrlPr/></m:sSupPr>
    <m:e><m:r><m:t>N</m:t></m:r></m:e>
    <m:sup><m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e><m:r><m:t>2</m:t></m:r></m:e></m:d></m:sup>
  </m:sSup>
  <m:r><m:t>  (max 2 hops, &#x03B8;&#x2265;threshold)</m:t></m:r>
</m:oMath>'''

# Subsumption state function
MATH_SUBSUMPTION = '''<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:r><m:t>S</m:t></m:r>
  <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
    <m:sSub><m:sSubPr><m:ctrlPr/></m:sSubPr><m:e><m:r><m:t>EL</m:t></m:r></m:e><m:sub><m:r><m:t>i</m:t></m:r></m:sub></m:sSub>
  </m:e></m:d>
  <m:r><m:t>&#x2208;</m:t></m:r>
  <m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val="}"/></m:dPr><m:e>
    <m:r><m:t>satisfied, partial, missing, disputed</m:t></m:r>
  </m:e></m:d>
</m:oMath>'''

# Court weight function
MATH_COURT_WEIGHT = '''<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:r><m:t>W</m:t></m:r>
  <m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>
    <m:r><m:t>court</m:t></m:r>
  </m:e></m:d>
  <m:r><m:t>=</m:t></m:r>
  <m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/></m:dPr><m:e>
    <m:eqArr>
      <m:e><m:r><m:t>1.00,  SCOTUS</m:t></m:r></m:e>
      <m:e><m:r><m:t>0.85,  Circuit Court</m:t></m:r></m:e>
      <m:e><m:r><m:t>0.80,  State Supreme</m:t></m:r></m:e>
      <m:e><m:r><m:t>0.65,  District Court</m:t></m:r></m:e>
    </m:eqArr>
  </m:e></m:d>
</m:oMath>'''


# ══════════════════════════════════════════════════════════════════
#  DOCUMENT CONTENT
# ══════════════════════════════════════════════════════════════════

# ── Title ─────────────────────────────────────────────────────────
p_title = doc.add_paragraph()
p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p_title.add_run("域外法查明辅助应用产品设计技术报告")
run.font.name = "SimHei"
run._element.rPr.rFonts.set(qn("w:eastAsia"), "SimHei")
run.font.size = Pt(26)
run.font.bold = True

p_sub = doc.add_paragraph()
p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p_sub.add_run("（中期）")
run.font.name = "SimHei"
run._element.rPr.rFonts.set(qn("w:eastAsia"), "SimHei")
run.font.size = Pt(16)

doc.add_paragraph()  # blank line

# ══════════════════════════════════════════════════════════════════
# 一、研究背景与问题提出
# ══════════════════════════════════════════════════════════════════
add_heading("一、研究背景与问题提出", level=1)

add_para("涉外商事审判中，域外法的查明与适用一直是实务难点。根据最高人民法院《关于适用〈中华人民共和国涉外民事关系法律适用法〉若干问题的解释（二）》第三条的规定，人民法院通过当事人提供、法律专家提供、法律查明服务机构提供等途径查明域外法。承办法官和涉外律师在这一过程中面临的困难主要体现在三个方面：")

add_para("其一，成文法典条文浩繁，语言壁垒高。以德国法为例，民法典（BGB）逾两千五百条，法条行文以长复合词构成（如 Schadensersatzanspruch、Nacherfüllungsverlangen），准确理解和定位目标法条需要深厚的语言基础。美国法更叠加了普通法判例体系，成文法与判例规则交织，查明负担沉重。")

add_para("其二，通用大语言模型在法律查明场景下存在固有缺陷。实测发现，大模型在回答法律查明问题时会捏造不存在的法条编号和条文内容，产生所谓\"幻觉\"，且这类错误在表面上与真实法条无异，极易误导使用者。法律意见书一旦引用虚假法条，将失去全部证据效力。")

add_para("其三，现有检索工具停留在关键词匹配层面，难以结合具体案件事实进行法律三段论推导，无法满足涉外审判对请求权基础分析、构成要件逐项核验、攻防抗辩推演等深层法理需求。")

add_para("基于上述实际问题，本项目研发了域外法查明与深度研判智能工作台（OverseasLawAssist），旨在为涉外商事法官、仲裁员和涉外律师提供从法条检索到法理推演的全流程辅助。")

# ══════════════════════════════════════════════════════════════════
# 二、系统总体设计
# ══════════════════════════════════════════════════════════════════
add_heading("二、系统总体设计", level=1)

add_heading("2.1 设计目标", level=2)
add_para("系统围绕\"查得准、推得通、控得住\"三项目标展开：法条和判例检索结果需要精确可溯源，杜绝幻觉捏造；法理推导需要遵循大陆法系三段论或普通法判例推理的规范路径；分析输出需要置于人工监督之下，在关键节点保留人工审核确认环节。")

add_heading("2.2 法域覆盖", level=2)
add_para("系统以德国联邦法（de_federal）和美国商事法（us_commercial）作为首批支持法域。选择这两个法域基于以下考量：德国民商法是大陆法系代表，BGB 的请求权基础方法论具有高度结构性，适合形式化建模；美国商事法涵盖统一商法典（UCC）和各州判例法体系，覆盖了我国涉外商事纠纷中最常见的准据法适用场景。")

add_para("底层架构遵循法域与语言解耦原则。法条存储、分词处理、检索策略、提示词模板等模块均通过法域注册中心（JurisdictionRegistry）按法域独立配置，新增法域时无需修改核心流转逻辑。")

add_heading("2.3 架构分层", level=2)
add_para("系统采用四层架构，自底向上依次为：")

# Architecture table
add_table(
    ["层次", "名称", "核心组件"],
    [
        ["第四层", "服务与表现层", "FastAPI · React 19 · SSE"],
        ["第三层", "核心推理层", "LangGraph · 7 Agent 节点 · 人机协同闸门"],
        ["第二层", "知识引擎与检索层", "BM25 · BGE-M3/FAISS · RRF · 图谱遍历"],
        ["第一层", "数据存储层", "law.sqlite (只读) · state.sqlite (WAL)"],
    ],
    col_widths=[2.5, 4, 9.5]
)

add_para("（1）数据存储层。采用双 SQLite 数据库物理隔离设计。快照只读库（law.sqlite）以只读模式加载经官方核验的成文法条、知识分块、判例原文及拓扑图谱，版本号标记为 20261010-gii-v0.7。运行状态库（state.sqlite）开启 WAL（Write-Ahead Logging）模式，用于持久化案件状态、工作流检查点和审计日志。两库在物理文件层面分离，避免高频读写操作之间的锁竞争。")

add_para("（2）知识引擎与检索层。包含形态学分词器、BM25 全文检索引擎、BGE-M3 密集向量索引（FAISS，支持 CUDA 加速）、RRF 融合重排模块，以及基于 SQLite 递归 CTE 的法律本体图谱遍历模块。")

add_para("（3）核心推理层。基于 LangGraph 构建确定性状态有向图，编排七个专职智能体节点的执行流转，并在关键节点嵌入人机协同审核闸门。")

add_para("（4）服务与表现层。后端以 FastAPI 提供 RESTful 接口和 SSE 实时事件流；前端以 React 19 构建交互工作台界面。")

# Architecture diagram
add_image(img_arch, width_cm=13)

# ══════════════════════════════════════════════════════════════════
# 三、数据底座建设
# ══════════════════════════════════════════════════════════════════
add_heading("三、数据底座建设", level=1)

add_heading("3.1 成文法收录", level=2)
add_para("系统本地收录成文法条 4,642 条。德国联邦法方面，通过 Gesetze im Internet（德国联邦司法部官方法规数据库）的 XML 接口获取官方原文，经结构化解析后入库。美国商事法方面，精选入库 68 条高频核心法条。具体明细如下：")

# Statute table
add_table(
    ["法域", "法典名称", "缩写", "收录条数"],
    [
        ["德国联邦法", "民法典", "BGB", "2,551"],
        ["德国联邦法", "民事诉讼法", "ZPO", "1,094"],
        ["德国联邦法", "商法典", "HGB", "696"],
        ["德国联邦法", "有限责任公司法", "GmbHG", "127"],
        ["德国联邦法", "民法施行法", "EGBGB", "101"],
        ["德国联邦法", "罗马条例 I", "Rome I", "5"],
        ["美国商事法", "统一商法典", "UCC", "49"],
        ["美国商事法", "特拉华州通用公司法", "DGCL", "7"],
        ["美国商事法", "美国法典", "U.S.C.", "12"],
        ["合计", "", "", "4,642"],
    ],
    col_widths=[3, 4.5, 3, 2.5]
)

add_para("法条解析精确到条（Paragraph / Artikel）、款（Absatz）、项（Nummer）层级。系统同时内建了德国法重大修订时点库（如 2002 年债法现代化、2022 年买卖法修订），在检索和推理阶段用于排除已失效的旧法条文。")

add_heading("3.2 判例收录与图谱构建", level=2)
add_para("本地判例库共收录 27 篇权威判例。德国法方面收录联邦最高法院（BGH）涉外商事核心判例 12 篇。美国法方面精选 15 篇跨越不同司法层级的代表性先例，包括联邦最高法院（如 Intel Corp. v. Advanced Micro Devices, Inc., 542 U.S. 241）、联邦巡回上诉法院（如 Eastern Air Lines, Inc. v. McDonnell Douglas Corp., 532 F.2d 957）、特拉华州最高法院（如 Kahn v. M&F Worldwide Corp.）等。")

add_para("在法条与判例之间构建了双向拓扑图谱，包含 119 条拓扑边（edges）和 47 条高频法条-判例映射（hot_norm_cases）。检索某一成文法条时，系统通过图遍历自动关联相关先例，无需二次手动查找。")

add_para("判例入库配套先例效力验真机制。参照美国法律实务中 Shepardizing / KeyCite 的做法，系统对每篇入库判例标注存续状态（Good Law / Distinguished / Overruled / Questioned），凡已被后续判例推翻的失效先例一律拦截，不进入推理上下文。")

add_heading("3.3 知识分块", level=2)
add_para("原始法条经切块处理后生成 5,132 个检索分块。每个分块携带层级上下文前缀（ctx_prefix），标明所属法典、篇章和条号，避免脱离上下文的孤立片段导致语义偏移。分块粒度根据法条实际结构确定，以\"条\"为基本单位，内容较长的条文按款或项进一步细分。")

# ══════════════════════════════════════════════════════════════════
# 四、核心技术方案
# ══════════════════════════════════════════════════════════════════
add_heading("四、核心技术方案", level=1)

add_heading("4.1 形态学分词适配", level=2)
add_para("德语法律文本中大量使用长复合词。以 Schadensersatzanspruch（损害赔偿请求权）为例，该词由 Schadens（损害）、ersatz（替代/赔偿）和 Anspruch（请求权）三个语素复合构成。如果直接使用通用分词器，往往将其作为单个未知词处理，导致检索时无法命中包含单独语素的相关法条。")

add_para("系统实现了形态学分词适配处理器（lawagent/store/compound.py），建立了由前缀、连接词素与词根构成的切分规则映射表，将长复合词拆分为独立的核心语素。该处理器同时覆盖德语和英语法律术语，应用于 BM25 索引构建和查询扩展阶段。")

add_heading("4.2 双通道混合检索与融合排序", level=2)
add_para("检索层并行运行两个通道。")

add_para("通道一为 BM25 词法全文检索。对法条分块建立倒排索引，针对法条标题和条号字段设置加权（标题加权系数 2.5，条号加权系数 3.0），优先命中用户显式引用的具体法条编号。")

add_para("通道二为 BGE-M3 密集向量语义检索。使用 BGE-M3 多语言预训练模型将法条分块编码为稠密向量，存入 FAISS 索引。检索时计算查询向量与候选向量的余弦相似度。该模型在本地 NVIDIA GPU（RTX 2070 SUPER，8GB VRAM，CUDA 12.8）上运行，用于捕获词面不同但语义相近的法条。")

add_para("BM25 评分公式：")
make_math_paragraph(MATH_BM25)

add_para("余弦相似度：")
make_math_paragraph(MATH_COSINE)

add_para("两个通道的检索结果通过 RRF（Reciprocal Rank Fusion，倒数排序融合）算法合并排序。融合公式为：")
make_math_paragraph(MATH_RRF)

add_para("其中 k 为平滑常数，取 60；w_BM25 = 0.55，w_Dense = 0.45。该参数组合在实测中兼顾了精确条号匹配和语义近义召回。")

add_heading("4.3 法律本体图谱局部扩展", level=2)
add_para("在双通道检索定位到核心法条后，系统通过法律本体图谱进行局部扩展。图谱以 SQLite 表存储，边类型包括法条层级关系（norm_hierarchy）、请求权竞合关系（concurrence）和判例引证关系（precedent_citation）。")

add_para("图谱扩展路径：")
make_math_paragraph(MATH_GRAPH)

add_para("扩展算法采用递归公用表表达式（Recursive CTE）实现，严格限制在 1-2 跳范围内，第 2 跳还需满足边权重阈值条件，防止无限扩散。以检索 BGB § 437（买方瑕疵权利）为例，图扩展自动补充关联的 BGB § 434（瑕疵定义）、§ 323（解除权）和 HGB § 377（商事检验义务）等上下游法条，以及对应的 BGH 权威判例。")

add_heading("4.4 状态图工作流编排", level=2)
add_para("系统采用 LangGraph 的 StateGraph 构建确定性工作流，替代不可控的自由对话模式。完整流程由以下节点顺序执行：")

add_para("S1（事实要素抽取）：从非结构化案情陈述中抽取当事人主体、法律行为、涉案标的物、履约时序等结构化要素。")
add_para("S2（准据法与时点前检）：核验合同选法条款的有效性，自动探测 CISG 适用触发条件，核查法典重大修订时点。")
add_para("S3（争点拆解）：将案件拆解为若干独立的法律争点（Legal Questions），逐项明确对应的法条群和举证责任分配。")
add_para("S4（双通道检索）：对各争点调用混合检索器，获取法条、分块和判例。")
add_para("S5（要件涵摄）：对各争点的法定构成要件与案件事实进行三段论匹配，标注四种状态（satisfied / partial / missing / disputed）。")
add_para("S6（策略推演）：构建假定条件推演矩阵，推演心证分水岭和胜败边界，模拟对方律师可能发起的致命抗辩。")
add_para("S7（双语起草与独立审查）：生成中外双语法律意见书初稿，并交由独立裁判模型执行质量门禁审查。")

add_para("各节点的输入输出通过强类型状态对象（CaseState）传递，状态变更单调递增且全程可审计。工作流支持检查点持久化，中断后可从最近检查点恢复执行。")

# Workflow diagram
add_image(img_workflow, width_cm=15)

add_heading("4.5 人机协同审核机制", level=2)
add_para("系统在两处节点设立人工审核闸门。")

add_para("第一处在 S2（准据法前检）之后。涉外买卖纠纷中，当事人约定\"适用某国法\"时，依国际私法通例通常包含该国已加入的 CISG。系统前检节点自动探测选法条款是否明示排除 CISG，若未明确排除则挂起工作流，等待承办人人工确认准据法范围后方可继续。")

add_para("第二处在 S3（争点拆解）之后。由于争点拆解直接决定后续检索方向和推理范围，系统在进入计算密集的检索阶段前暂停，允许法律专家对自动生成的争点列表进行增、删、改操作。确认后方予释放进入 S4。")

add_para("该机制在 FastAPI 层面通过 confirm 接口实现，前端以弹窗形式呈现待确认内容。")

add_heading("4.6 要件事实四态涵摄", level=2)
add_para("构成要件涵摄是司法裁判的核心推理步骤。系统将其形式化为：以法定构成要件为大前提，以经当事人举证查明的案件事实为小前提，推导法律效果（请求权成立或被抗辩阻却）。")

add_para("涵摄状态函数：")
make_math_paragraph(MATH_SUBSUMPTION)

add_para("具体而言，对每一争点下的每一项法定构成要件，系统评判其与案件事实的匹配程度，标注为以下四态之一：satisfied（有充分的客观证据支持）、partial（具备初步事实支撑但尚未达到高度盖然性）、missing（完全缺失关键事实或必要证据）、disputed（双方各执一词，存在举证对抗）。")

add_para("同时，系统在底层维护一张有向溯源映射，将原始证据材料（M#）、事实片段（F#）、法定构成要件（EL#）和规范条文（§）串联成证据链闭环，支持从任意环节反向追溯至原始材料。")

# Evidence chain diagram
add_image(img_evidence, width_cm=14)

add_heading("4.7 双模型生成-审查架构", level=2)
add_para("大语言模型自主纠错时常出现\"自洽性偏差\"——对自身生成的内容倾向于判定为正确。为应对这一问题，系统在工程上采用两个独立模型分别承担生成和审查任务。")

add_para("主推理模型（deepseek-v4.1-flash）负责事实提取、争点拆解和意见书起草，其特点为长文本指令遵循能力强、响应速度快。独立裁判模型（deepseek-v4-pro-0813）负责对生成结果执行质量门禁审查，两个模型在调用链路上物理隔离。")

# Dual model diagram
add_image(img_dual, width_cm=12)

add_para("裁判模型执行 V1-V11 共十一项质量门禁审查：")

# Quality gate matrix
add_table(
    ["编号", "门禁名称", "说明", "一票否决"],
    [
        ["V1", "事实无幻觉", "严禁捏造未经当事人陈述或材料证明的事实", "是"],
        ["V2", "法条真实有效", "所引法条必须存在于本地法源库中", "是"],
        ["V3", "涵摄逻辑完整", "三段论推导大前提→小前提→结论完整", "否"],
        ["V4", "证据链闭环", "每项结论可溯源至原始材料", "否"],
        ["V5", "法域一致性", "不得混用不同法域法条", "是"],
        ["V6", "双语术语一致", "中外文术语对照准确", "否"],
        ["V7", "引注格式规范", "法条和判例引注格式合规", "否"],
        ["V8", "司法中立防线", "严禁绝对化诉讼结果预测", "是"],
        ["V9", "重大修订时点核验", "排除已废止或已修订的旧法", "是"],
        ["V10", "举证责任分配", "正确标注各要件举证方", "否"],
        ["V11", "红队抗辩完备", "必须包含对方首要反制抗辩", "否"],
    ],
    col_widths=[1.5, 3.5, 7.5, 2]
)

add_para("其中 V1、V2、V5、V8、V9 为一票否决项，只要任一项未通过，裁判模型即驳回初稿，携带具体意见打回主推理模型重新生成。")

add_para("此外，系统底层搭载了离线法律规则引擎，在大模型 API 因网络波动不可用时，可自动切换至本地知识图谱和规则引擎完成基本的检索和要件核验，确保系统可用性。")

add_heading("4.8 涉美商事法分层协同", level=2)
add_para("针对美国法域的特殊性——普通法判例与成文法交织、各州法律差异大——系统设计了三层协同结构：")

add_table(
    ["层级", "名称", "内容", "数据来源"],
    [
        ["Tier 1", "本地金标准法源库", "UCC/DGCL/U.S.C. 核心成文法 + 15 篇精选先例", "人工精选入库"],
        ["Tier 2", "动态扩展检索", "CourtListener API 全美联邦和州判例", "Free Law Project"],
        ["Tier 3", "涉外司法实务校准器", "五项涉美专属入口审查 + 八项必备要素", "最高法院司法解释"],
    ],
    col_widths=[1.8, 4, 6, 3.5]
)

add_para("司法层级权重函数：")
make_math_paragraph(MATH_COURT_WEIGHT)

add_para("第二层为动态扩展检索。系统集成了 CourtListener 远程案例库 API（Free Law Project），当本地判例库无法完全覆盖特定争议时，可在线检索全美联邦和州判例。检索结果按司法层级赋权：联邦最高法院权重 1.0、联邦巡回上诉法院 0.85、各州最高法院 0.80、联邦地区法院 0.65。所有远程检索到的判例在进入推理上下文前，同样经过先例效力状态审查。")

add_para("第三层为涉外司法实务校准器（USAdmissibilityCalibrator）。该模块对接最高人民法院司法解释要求，自动输出五项涉美专属入口审查清单（选法协议效力、CISG 排斥效力、UCC § 2-104 商人身份认定、UCC § 2-725 诉讼时效、海牙认证合规性），并生成符合涉外审判实务要求的查明文书八项必备要素。")

# ══════════════════════════════════════════════════════════════════
# 五、系统实现
# ══════════════════════════════════════════════════════════════════
add_heading("五、系统实现", level=1)

add_heading("5.1 技术栈", level=2)

add_table(
    ["类别", "技术选型", "说明"],
    [
        ["编程语言", "Python 3.10", "后端核心语言"],
        ["Web 框架", "FastAPI", "RESTful + SSE"],
        ["工作流引擎", "LangGraph", "确定性状态图"],
        ["数据库", "SQLite（双库）", "law.sqlite + state.sqlite"],
        ["向量索引", "FAISS（CUDA）", "BGE-M3 密集向量"],
        ["大模型接入", "DashScope 兼容模式", "结构化输出 + 故障转移"],
        ["前端框架", "React 19 + TypeScript", "Tailwind CSS + Vite"],
    ],
    col_widths=[3, 4.5, 6]
)

add_heading("5.2 代码结构", level=2)
add_para("后端源代码组织在 lawagent 包下，主要模块如下：")

add_table(
    ["模块路径", "功能说明"],
    [
        ["lawagent/core/", "核心类型定义（types.py）、多法域抽象协议（jurisdiction.py）"],
        ["lawagent/store/", "数据存储与检索：db.py / compound.py / chunker.py / bm25.py / vec.py / graph.py / rerank.py / retriever.py"],
        ["lawagent/flow/", "工作流节点：nodes.py / graph.py / checks.py / sufficiency.py / matcher.py / critic.py / strategist.py / us_admissibility_calibrator.py"],
        ["lawagent/api/", "FastAPI 路由（routes/）、依赖注入（deps.py）、SSE（sse.py）、DOCX 导出（export.py）"],
        ["lawagent/llm/", "大模型客户端封装（client.py）：结构化输出、JSON 修复、主备故障转移"],
        ["lawagent/integrations/", "CourtListener 远程检索集成"],
        ["lawagent/ingest/", "德国联邦法官方 XML 数据采集与解析管线"],
        ["FrontEnd/src/", "React 前端：API 客户端、Context 状态管理、SSE 事件订阅"],
    ],
    col_widths=[4, 12]
)

add_heading("5.3 前端界面", level=2)
add_para("工作台界面由左侧导航栏和中央主工作区组成。导航栏提供案件列表、新建案件入口及功能模块切换。主工作区包含以下视图：")

add_para("案件总览看板：显示准据法识别结果、CISG 排除状态、构成要件总体完备率和核心请求权基础法条群，以及胜败边界推演摘要、红队首要抗辩预测和关键补证行动清单。")

add_para("Agent 协同流水线：以步进时间轴形式呈现七个智能体的执行状态、耗时和输出摘要。")

add_para("深度研判区域：包括动态胜败边界推演（假定条件分支矩阵）、红队攻防手册（对方抗辩与我方反制盾牌）、构成要件四态涵摄看板（四色指示灯）和证据链闭环图谱（支持图谱与表格双视图切换）。")

add_para("法律检索库：支持对全部入库法典的条目级检索和章节树状导航，检索结果附带判例存续效力标签。")

add_para("Copilot 法律追问助手：在案件上下文中进行多轮法律追问，支持中立法理和红队演练两种模式切换，可将追问结论反哺案件底稿。")

add_para("DOCX 报告导出：一键生成包含法庭查明材料包（Part A）和委托人咨询研判包（Part B）的 Word 格式法律意见书，格式对接涉外审判实务规范。")

# ══════════════════════════════════════════════════════════════════
# 六、测试与评测
# ══════════════════════════════════════════════════════════════════
add_heading("六、测试与评测", level=1)

add_heading("6.1 自动化测试", level=2)
add_para("系统建立了覆盖全部开发阶段的自动化测试套件，共 28 项测试用例，采用 pytest 框架运行，全量通过。各测试模块覆盖范围如下：")

add_table(
    ["测试模块", "用例数", "覆盖范围"],
    [
        ["test_phase1.py", "5", "多法域抽象、双库物理隔离、成文法精确索引"],
        ["test_phase2.py", "5", "形态学分词、BM25 检索、FAISS 向量索引、RRF 融合"],
        ["test_phase3.py", "5", "LangGraph 状态图调度、四态涵摄匹配、V1-V11 质量门禁"],
        ["test_phase4.py", "8", "FastAPI 路由、SSE 事件流、状态持久化（含测试数据自清理）"],
        ["test_phase5.py", "4", "DOCX 报告导出、端到端集成流水线"],
        ["test_us_architecture.py", "4", "CourtListener 检索加权、Shepardizing 拦截、涉美端到端工作流"],
        ["合计", "28 项 (全部通过)", ""],
    ],
    col_widths=[5, 2, 9]
)

add_heading("6.2 基准评测", level=2)
add_para("系统内建了 E1-E9 自动化评测套件（eval/run.py），实际运行评测结果（记录于 eval/reports/eval_20261010_184325/metrics.json）如下：")

add_table(
    ["评测指标", "指标代码", "结果"],
    [
        ["法条检索召回率", "norm_recall_at_10", "1.0"],
        ["检索排序", "MRR", "1.0"],
        ["法条幻觉数", "hallucination_count", "0"],
        ["事实溯源错误数", "fact_trace_errors", "0"],
        ["绝对化预测违规数", "overreach_predictive_count", "0"],
        ["要件覆盖率", "element_coverage_rate", "1.0"],
        ["门禁终审", "acceptance_verdict", "PASSED"],
        ["判例召回率", "case_recall_at_10", "0.5"],
    ],
    col_widths=[5, 5, 3]
)

add_para("判例召回率（case_recall_at_10）为 0.5，说明在长尾判例检索方面仍有提升空间，这也是后续工作的优化方向之一。")

add_heading("6.3 案例验证", level=2)
add_para("系统使用两个真实涉外商事纠纷案例进行了端到端验证。")

add_para("案例一为德国联邦最高法院 BGH VIII ZR 12/20 号判例（中德高精数控机床跨境买卖物之瑕疵解约纠纷）。将案情事实录入系统后，系统研判结论在以下四个维度与法院生效判决一致：")

add_table(
    ["验证维度", "系统研判", "法院判决", "一致性"],
    [
        ["准据法认定", "排除 CISG，适用 BGB 与 HGB", "排除 CISG，适用 BGB 与 HGB", "一致"],
        ["物之瑕疵构成", "BGB § 434 第 1 款，0.15mm 超标", "BGB § 434 第 1 款", "一致"],
        ["商事检验未失权", "2 日通知满足即时性", "反制 HGB § 377 失权抗辩", "一致"],
        ["解除权成立", "BGB § 323 第 2 款第 1 项催告豁免", "被告拒绝触发催告豁免", "一致"],
    ],
    col_widths=[3.5, 4, 4, 2]
)

add_para("案例二为涉美高精半导体设备买卖纠纷（参照 Eastern Air Lines, Inc. v. McDonnell Douglas Corp. 及 Intel Corp. v. Advanced Micro Devices, Inc.）。系统研判结论如下：")

add_table(
    ["验证维度", "系统研判", "联邦司法标准", "一致性"],
    [
        ["合理通知期间", "23 天符合商业合理性", "援引 Eastern Air Lines 先例", "一致"],
        ["受领撤销", "UCC § 2-608 重大价值减损", "UCC § 2-608", "一致"],
        ["跨境调证策略", "28 U.S.C. § 1782 + Delano Growers 恶意突破", "§ 1782 标准", "一致"],
        ["附随损失定性", "区分 Incidental 与 Consequential Damages", "UCC 损害赔偿分类", "一致"],
    ],
    col_widths=[3.5, 4.5, 4, 2]
)

# ══════════════════════════════════════════════════════════════════
# 七、中期完成情况
# ══════════════════════════════════════════════════════════════════
add_heading("七、中期完成情况", level=1)
add_para("本项目开发工作划分为六个阶段。截至本报告编写时，各阶段完成情况如下：")

add_table(
    ["阶段", "内容", "状态"],
    [
        ["Phase 1", "工程骨架与数据入库：项目结构、配置管理、多法域协议、XML 数据采集解析", "已完成"],
        ["Phase 2", "检索引擎建设：形态学分词器、BM25 引擎、FAISS 向量索引、混合检索器", "已完成"],
        ["Phase 3", "推理工作流：LangGraph 状态图编排、S1-S9 推理节点、要件涵摄、质量门禁", "已完成"],
        ["Phase 4", "服务端与前端：FastAPI 接口、SSE 事件流、前端工作台、全链路 API", "已完成"],
        ["Phase 5", "导出与评测：DOCX 报告导出、E1-E9 评测套件", "已完成"],
        ["Phase 6", "涉美法域扩展：三层协同架构、CourtListener、先例效力状态机、校准器", "已完成"],
    ],
    col_widths=[2, 10, 2]
)

add_para("目前系统的核心流程已打通，两大法域的法条和判例库已初步建成，主要功能模块均可运行。但在判例覆盖广度、分词规则的精细度、以及远程检索结果的质量筛选等方面仍有改进余地。")

# ══════════════════════════════════════════════════════════════════
# 八、下一步研究计划
# ══════════════════════════════════════════════════════════════════
add_heading("八、下一步研究计划", level=1)
add_para("后续工作将集中在三个方面：一是扩充判例库规模和法域覆盖范围，补充长尾法条和争议类型的判例支撑，提高判例召回率；二是优化分词规则和检索参数，结合更多实际案例的反馈进行调参，提升检索精度与排序质量；三是完善前端交互体验和报告导出格式，使其更贴近法律实务工作者的使用习惯。结项成果目标为交付一套可实际投入涉外商事审判辅助的原型系统，配套完整的测试报告、使用手册和技术文档。")

doc.add_paragraph()
p_date = doc.add_paragraph()
p_date.alignment = WD_ALIGN_PARAGRAPH.RIGHT
run = p_date.add_run("报告编写日期：2026 年 10 月")
run.font.name = "SimSun"
run._element.rPr.rFonts.set(qn("w:eastAsia"), "SimSun")
run.font.size = Pt(12)

# ── Save ──────────────────────────────────────────────────────────
doc.save(OUT_DOCX)
print(f"\n✅ DOCX saved to: {OUT_DOCX}")
print(f"   File size: {os.path.getsize(OUT_DOCX):,} bytes")
