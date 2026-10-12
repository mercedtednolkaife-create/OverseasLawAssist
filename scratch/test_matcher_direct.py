import asyncio
import sys
import time
import sqlite3
import traceback

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from lawagent.core.types import CaseState
from lawagent.flow.nodes import matcher_node

conn = sqlite3.connect('data/state/state.sqlite')
cur = conn.cursor()
cur.execute("SELECT state_json FROM cases WHERE case_id='C332675'")
row = cur.fetchone()
state = CaseState.model_validate_json(row[0])

print("Testing matcher_node...", flush=True)
t0 = time.time()
try:
    res = asyncio.run(matcher_node(state))
    print(f"matcher_node succeeded in {time.time() - t0:.2f}s!", flush=True)
    print("elements:", len(res.get("elements", [])))
    print("similar_cases:", len(res.get("similar_cases", [])))
except Exception as e:
    print("matcher_node failed:", e, flush=True)
    traceback.print_exc()
