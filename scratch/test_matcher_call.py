import time
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from lawagent.llm.client import LLMClient
from lawagent.flow.matcher import MATCHER_SYSTEM_PROMPT

c = LLMClient()
t0 = time.time()
print("Calling matcher...", flush=True)
res = c.json_completion(
    'matcher',
    MATCHER_SYSTEM_PROMPT,
    'Analyze elements vs facts: e1, F1. Return JSON: {"matches": [{"element_id": "e1", "match_status": "satisfied", "fact_ids": ["F1"], "material_ids": [], "match_note": "符合", "counsel_question": null}]}',
    retries=0
)
print(f"Matcher returned in {time.time() - t0:.2f}s:")
print(json.dumps(res, ensure_ascii=False, indent=2))
