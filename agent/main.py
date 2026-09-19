from pathlib import Path
from dotenv import load_dotenv


env_path = Path(__file__).resolve().parent.parent / ".env"

load_dotenv(env_path)



from graph import build_graph


graph = build_graph()

result = graph.invoke({})


print(
    "\n=== EXPERIMENT GOVERNOR ==="
)


print("\n1. Goal")

print(
    result["goal"]["text"]
)


print("\n2. Decision Objective")

print(
    result["decision_objective"]
)


print("\n3. Evidence Plan")

print(
    result["evidence_plan"]
)


print("\n4. Candidate Strategies")

for strategy in (
    result["candidate_strategies"]
):

    print(strategy)


print("\n5. Feasibility")

for result_item in (
    result["feasibility_results"]
):

    print(result_item)


print("\n6. Consequences")

for result_item in (
    result["consequence_results"]
):

    print(result_item)


print("\n7. CP-SAT")

print(
    result["optimization_result"]
)