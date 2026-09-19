from pathlib import Path

from dotenv import load_dotenv


# --------------------------------
# Load environment variables FIRST
# --------------------------------

env_path = (
    Path(__file__).resolve().parent.parent
    / ".env"
)

load_dotenv(env_path)


# --------------------------------
# Import graphs AFTER loading .env
# --------------------------------

from graph import build_graph
from replan_graph import build_replan_graph


# =================================
# INITIAL DECISION
# =================================

graph = build_graph()

initial_result = graph.invoke({})


print("\n=== INITIAL RESULT ===")


print("\nINITIAL RECOMMENDATION")

print(
    initial_result[
        "recommendation"
    ]
)


print("\nINITIAL APPROVAL")

print(
    initial_result[
        "approval"
    ]
)


# =================================
# SIMULATE EXPERIMENT A SUCCESS
# =================================

updated_experiments = []

for experiment in initial_result["experiments"]:

    experiment = dict(experiment)

    if experiment["id"] == "A":
        experiment["status"] = "COMPLETED"

    updated_experiments.append(
        experiment
    )


initial_result["experiments"] = (
    updated_experiments
)


# =================================
# SIMULATE SSO CAPACITY EVENT
# =================================

initial_result["event"] = {
    "id": "EVENT-001",
    "event_type": "CAPACITY_CHANGE",
    "description": (
        "The SSO vendor reports "
        "a two-week integration block."
    ),
    "engineering_delta_hours": 18,
}


# =================================
# REPLAN
# =================================

replan_graph = build_replan_graph()

replanned = replan_graph.invoke(
    initial_result
)


print("\n=== REPLANNING RESULT ===")


print("\nUPDATED CAPACITY")

print(
    replanned[
        "organization_state"
    ][
        "available_engineering_hours"
    ]
)


print("\nMATERIALITY")

print(
    replanned[
        "materiality_result"
    ]
)


print("\nNEW RECOMMENDATION")

print(
    replanned[
        "recommendation"
    ]
)


print("\nAPPROVAL")

print(
    replanned[
        "approval"
    ]
)