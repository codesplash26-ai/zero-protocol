import sys
from pathlib import Path

from dotenv import load_dotenv


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(
        encoding="utf-8"
    )


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
