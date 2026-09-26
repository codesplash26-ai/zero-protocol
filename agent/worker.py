"""Governor worker: claims queued decision runs from the backend and runs the graph.

The backend only records QUEUED runs (POST /decisions and /replans). This loop
claims them one at a time through the internal API, runs the LangGraph Governor,
and marks the run FAILED if the graph raises, so the frontend never polls forever.
"""

import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from graph import build_graph
from schemas.models import DecisionRunClaim, DecisionRunType
from tools.backend_client import (
    BackendAPIError,
    BackendClient,
    get_backend_client,
)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(
        encoding="utf-8"
    )


ENV_PATH = (
    Path(__file__).resolve().parent.parent
    / ".env"
)

ACTIVE_STATUSES = {"QUEUED", "RUNNING"}


def log(message: str) -> None:
    print(f"[governor-worker] {message}", flush=True)


def process_claim(
    claim: DecisionRunClaim,
    client: BackendClient,
) -> None:
    run = claim.run
    goal = client.get_goal(claim.goal_id)
    graph = build_graph(
        detect_unlocked=run.run_type != DecisionRunType.INITIAL,
    )
    graph.invoke(
        {
            "decision_id": run.decision_id,
            "goal": goal.model_dump(),
            # Keys are per run so a replan at an unchanged state version
            # never collides with an earlier recommendation.
            "optimization_idempotency_key": f"optimization-{run.id}",
            "recommendation_idempotency_key": f"recommendation-{run.id}",
        }
    )


def fail_run(
    client: BackendClient,
    run_id: str,
    *,
    code: str,
    message: str,
) -> None:
    try:
        client.fail_decision_run(
            run_id,
            code=code,
            message=message,
        )
    except BackendAPIError as error:
        # RUN_NOT_ACTIVE means the recommendation was already persisted.
        log(f"could not mark {run_id} failed: {error.error_code} {error}")


def run_once(client: BackendClient) -> bool:
    """Process at most one queued run. Returns True when a run was claimed."""
    claim = client.claim_decision_run()
    if claim.run is None:
        return False

    run = claim.run
    log(f"claimed {run.run_type.value} run {run.id} for {run.decision_id}")
    started = time.monotonic()
    try:
        process_claim(claim, client)
    except Exception as error:  # every failure must close the run
        code = getattr(error, "error_code", None) or type(error).__name__
        log(f"run {run.id} failed: {code}: {error}")
        fail_run(client, run.id, code=str(code), message=str(error) or code)
        return True

    final = client.get_decision_run(run.id)
    if final.status in ACTIVE_STATUSES:
        fail_run(
            client,
            run.id,
            code="RUN_NOT_COMPLETED",
            message="The Governor finished without persisting a recommendation.",
        )
        return True

    log(
        f"run {run.id} {final.status} ({final.result}) "
        f"in {time.monotonic() - started:.1f}s"
    )
    return True


def main() -> None:
    load_dotenv(ENV_PATH)
    poll_seconds = float(
        os.environ.get("AGENT_POLL_INTERVAL_SECONDS", "2")
    )
    client = get_backend_client()
    log(f"polling {client.base_url} every {poll_seconds}s")

    while True:
        try:
            claimed = run_once(client)
        except BackendAPIError as error:
            log(f"backend unavailable: {error.error_code} {error}")
            claimed = False
        if not claimed:
            time.sleep(poll_seconds)


if __name__ == "__main__":
    main()
