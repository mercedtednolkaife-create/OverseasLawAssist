"""预检与时点核验规则模块 (Checks & Timepoints)
对齐技术方案第 4.7 节与第 5.2 节 S2 节点：
- CISG 规则触发逻辑：货物买卖且营业地在中德且未确认排除
- 时点红黄两态规则：对比合同订立日/主要事实发生日与重大修订时点
- 适用法律入口检查清单生成
"""

import yaml
import os
from typing import List, Dict, Any, Tuple, Optional
from lawagent.core.types import CaseMeta, EntryCheckItem


def load_timepoints_table(path: str = "kb/de_federal/timepoints.yaml") -> List[Dict[str, Any]]:
    """加载德国法高频条文重大修订时点警示表"""
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or []


def timepoint_level(
    meta: CaseMeta,
    evidence_norms: List[str],
    table: Optional[List[Dict[str, Any]]] = None
) -> Tuple[str, List[str]]:
    """时点核验：返回 ('red' 或 'yellow', 原因列表)；不设绿态"""
    if table is None:
        table = load_timepoints_table()

    reasons: List[str] = []
    if not meta.contract_date:
        reasons.append("缺少合同订立日，无法核验适用法律版本")

    clean_norms = {n.replace("NORM:", "").strip() for n in evidence_norms}

    for row in table:
        row_norms = set(row.get("norms", []))
        if not (row_norms & clean_norms):
            continue

        for ch in row.get("changes", []):
            target_date = meta.event_date if ch.get("basis") == "event" else meta.contract_date
            effective_str = str(ch.get("effective", ""))

            if not target_date:
                reasons.append(f"缺少关键日期，无法比对 {effective_str} 的重大修订：{ch.get('note')}")
            elif target_date < effective_str:
                reasons.append(
                    f"日期 ({target_date}) 早于 {effective_str} 的重大修订生效日：{ch.get('note')} (过渡规则：{ch.get('transitional')})"
                )

    if reasons:
        return "red", reasons
    return "yellow", ["系统当前仅收录现行合并版文本，历史版本适用需专家线下复核确认"]


def generate_entry_checks(meta: CaseMeta) -> List[EntryCheckItem]:
    """生成适用法律入口检查清单 (对齐技术方案 5.7 节)"""
    checks: List[EntryCheckItem] = []

    # 1. 法律选择条款
    has_choice = bool(meta.choice_of_law and "德国" in meta.choice_of_law)
    checks.append(EntryCheckItem(
        name="合同是否明确约定适用德国法",
        status="satisfied" if has_choice else ("unsatisfied" if meta.choice_of_law else "uncertain"),
        detail=f"合同选法条款：{meta.choice_of_law or '未填写明确选法条款，需专业人士依据冲突规范判定'}"
    ))

    # 2. CISG 适用与排除状态
    is_goods = bool(meta.contract_type and "货物" in meta.contract_type)
    if is_goods:
        if meta.cisg_excluded is True:
            cisg_status = "satisfied"
            cisg_detail = "当事人已确认合同已有效排除 CISG 适用，直接适用德国国内民商法"
        elif meta.cisg_excluded is False:
            cisg_status = "unsatisfied"
            cisg_detail = "合同未排除 CISG，国际货物买卖合同应优先适用 CISG，德国国内法仅作兜底"
        else:
            cisg_status = "uncertain"
            cisg_detail = "双方营业地分处中德且为货物买卖，尚未确认是否在合同中排除 CISG"
    else:
        cisg_status = "satisfied"
        cisg_detail = f"合同类型为【{meta.contract_type or '非货物买卖'}】，通常不触发 CISG 国际货物销售公约"

    checks.append(EntryCheckItem(
        name="CISG联合国国际货物销售合同公约适用与排除状态",
        status=cisg_status,
        detail=cisg_detail
    ))

    # 3. 商人身份与 HGB 适用
    if meta.both_merchants is True:
        m_status = "satisfied"
        m_detail = "双方当事人均为商人（双方商行为），全面适用《德国商法典》(HGB) 第377条等特殊商事规则"
    elif meta.both_merchants is False:
        m_status = "unsatisfied"
        m_detail = "至少一方非商人或为消费者，不适用 HGB 第377条严格检验通知义务，适用普通民事买卖法"
    else:
        m_status = "uncertain"
        m_detail = "双方当事人的商人身份（Kaufmann）尚未完全确认"

    checks.append(EntryCheckItem(
        name="当事人商人身份与德国商法典适用",
        status=m_status,
        detail=m_detail
    ))

    return checks
