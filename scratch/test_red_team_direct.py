import asyncio
import sys
import time
import sqlite3
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from lawagent.core.types import CaseState
from lawagent.flow.nodes import red_team_strategist_node, matcher_node

conn = sqlite3.connect('data/state/state.sqlite')
cur = conn.cursor()
cur.execute("SELECT state_json FROM cases WHERE case_id='C332675'")
row = cur.fetchone()
state = CaseState.model_validate_json(row[0])

print("Testing red_team_strategist_node...", flush=True)
t0 = time.time()
res = asyncio.run(red_team_strategist_node(state))
print(f"red_team_strategist_node succeeded in {time.time() - t0:.2f}s!", flush=True)
sa = res.get("strategic_assessment")
if sa:
    print("Outcome branches:", len(sa.outcome_branches))
    print("Red team defenses:", len(sa.red_team_defenses))
    print("Actionable checklist:", len(sa.actionable_checklist))
    for b in sa.outcome_branches:
        print(f"  Branch [{b.branch_type}]: {b.title}")
    for d in sa.red_team_defenses:
        print(f"  Defense [{d.defense_id}]: {d.opposing_claim[:40]}...")
