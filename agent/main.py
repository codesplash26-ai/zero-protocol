import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from graph import build_graph
from tools.backend_client import BackendConfigurationError

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(
        encoding="utf-8"
    )


ENV_PATH = (
    Path(__file__).resolve().parent.parent
    / ".env"
)


def initial_graph_state() -> dict[str, str]:
    decision_id = os.environ.get(
        "AGENT_DECISION_ID",
        "",
    ).strip()
    if not decision_id:
        raise BackendConfigurationError(
            "AGENT_DECISION_ID must be set before "
            "starting the Agent.",
            error_code="AGENT_DECISION_ID_MISSING",
        )

    return {"decision_id": decision_id}


def run_initial_decision() -> dict:
    load_dotenv(ENV_PATH)
    graph = build_graph()
    return graph.invoke(initial_graph_state())


def main() -> None:
    initial_result = run_initial_decision()

    print("\n=== INITIAL RESULT ===")
    print("\nINITIAL RECOMMENDATION")
    print(initial_result["recommendation"])
    print("\nINITIAL APPROVAL")
    print(initial_result["approval"])


if __name__ == "__main__":
    main()
