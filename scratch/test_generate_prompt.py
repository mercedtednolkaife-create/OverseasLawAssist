import time
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from lawagent.llm.client import LLMClient

client = LLMClient()
prompt = """开展【动态胜败边界推演与红队攻防对抗分析】。案号：C332675，法域：美国统一商法典 (UCC)，核心事实：意大利德尔奇采购美国罗托雷克斯压缩机存在质量瑕疵。
输出精炼 JSON：
{
  "pivotal_factors": ["变量1", "变量2"],
  "outcome_branches": [
    {
      "branch_type": "favorable",
      "title": "隐蔽瑕疵胜诉路径",
      "condition_precedent": "假定原告举证证明...",
      "substantive_basis": ["UCC § 2-314"],
      "key_evidence_required": ["测试报告"],
      "outcome_summary": "法庭支持救济",
      "risk_level": "low"
    }
  ],
  "red_team_defenses": [
    {
      "defense_id": "D1",
      "opposing_claim": "异议通知逾期",
      "lethal_index": "critical",
      "opposing_basis": "UCC § 2-607(3)(a)",
      "counter_weapons": ["到货后即时邮件记录"],
      "factual_counter_point": "已在合理期间内通知",
      "evidence_checklist": ["邮件底单"]
    }
  ],
  "actionable_checklist": ["固定通知时序链条"]
}
"""

print("Sending prompt to deepseek-v4.1-flash for generate task...", flush=True)
t0 = time.time()
try:
    data = client.json_completion(
        task="generate",
        system_prompt="你是一名资深跨国商事诉讼专家与对抗策略架构师。输出 JSON。",
        user_prompt=prompt,
        retries=0
    )
    print(f"Success in {time.time() - t0:.2f}s!")
    print(json.dumps(data, ensure_ascii=False, indent=2)[:300])
except Exception as e:
    print(f"Failed in {time.time() - t0:.2f}s: {e}")
