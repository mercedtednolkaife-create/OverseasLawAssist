import asyncio
import json
import sqlite3
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from lawagent.core.types import CaseState
from lawagent.flow.graph import LawWorkflowRunner
from lawagent.store.db import StateDBManager

conn = sqlite3.connect('data/state/state.sqlite')
cur = conn.cursor()
cur.execute("SELECT state_json FROM cases WHERE case_id='C332675'")
row = cur.fetchone()
if not row:
    print("Case C332675 not found")
    sys.exit(1)

state = CaseState.model_validate_json(row[0])
print(f"Loaded state for {state.case_id}, current_node: {state.current_node}, status: {state.status}")
print(f"Facts: {len(state.facts)}, Evidence: {len(state.evidence)}, Elements: {len(state.elements)}")

runner = LawWorkflowRunner()

async def step():
    config = {"configurable": {"thread_id": state.case_id}}
    print("Starting astream...")
    async for event in runner.graph.astream(state, config=config, stream_mode="updates"):
        for node_name, updates in event.items():
            print(f"Completed node: {node_name}")
            for k, v in updates.items():
                if hasattr(state, k):
                    setattr(state, k, v)
            state.current_node = node_name
            print(f"Updated current_node to: {state.current_node}")

asyncio.run(step())
print("Finished!")
