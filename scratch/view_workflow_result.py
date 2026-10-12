import json
import urllib.request
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "http://127.0.0.1:8000/api/cases/C332675/agent-workflow"
with urllib.request.urlopen(url) as resp:
    data = json.loads(resp.read().decode("utf-8"))

print("=== Case C332675 Agent Workflow Report ===")
print("Active primary model:", data.get("active_model_primary"))
print("Active judge model:", data.get("active_model_judge"))
print("Total steps:", data.get("total_steps"))
print("\n--- Pipeline Steps ---")
for s in data.get("steps", []):
    print(f"Step {s['step_id']}: {s['name']}")
    print(f"  Role: {s['role_desc']}")
    print(f"  Model: {s['model']}")
    print(f"  Status: {s['status']}")
    print(f"  Inputs: {s['inputs_summary']}")
    print(f"  Outputs: {s['outputs_summary']}")
    if s.get("quality_checks"):
        print(f"  Quality checks: {s['quality_checks']}")
    print()
