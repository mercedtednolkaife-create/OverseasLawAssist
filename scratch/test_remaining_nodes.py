import asyncio
import sys
import time
import sqlite3
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from lawagent.core.types import CaseState
from lawagent.flow.nodes import (
    red_team_strategist_node,
    translator_node,
    drafter_node,
    critic_node,
    s8_review_node,
    s9_export_node
)
from lawagent.store.db import StateDBManager

conn = sqlite3.connect('data/state/state.sqlite')
cur = conn.cursor()
cur.execute("SELECT state_json FROM cases WHERE case_id='C332675'")
row = cur.fetchone()
state = CaseState.model_validate_json(row[0])

async def run_remaining():
    print(f"Running remaining nodes for {state.case_id}...", flush=True)
    
    nodes = [
        ("red_team_strategist", red_team_strategist_node),
        ("translator", translator_node),
        ("drafter", drafter_node),
        ("critic", critic_node),
        ("s8_review", s8_review_node),
        ("s9_export", s9_export_node)
    ]

    for name, fn in nodes:
        t0 = time.time()
        print(f"--> Executing {name}...", flush=True)
        res = await fn(state)
        dt = time.time() - t0
        for k, v in res.items():
            if hasattr(state, k):
                setattr(state, k, v)
        print(f"<-- Finished {name} in {dt:.2f}s (state status: {state.status}, node: {state.current_node})", flush=True)

    db = StateDBManager.get_instance()
    db.save_case(state)
    print(f"\nAll nodes completed! Final status: {state.status}")
    print(f"Findings: {len(state.findings)}, Statements: {sum(len(f.statements) for f in state.findings)}")
    print(f"Translations: {len(state.translations)}")
    print(f"Dashboard quality score: {state.dashboard.quality_score if state.dashboard else 'N/A'}")

asyncio.run(run_remaining())
