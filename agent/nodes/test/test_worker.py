from __future__ import annotations

from datetime import UTC, datetime

import worker
from schemas.models import DecisionRun, DecisionRunClaim, Goal
from tools.backend_client import BackendAPIError


def make_run(run_type: str = "INITIAL", status: str = "RUNNING") -> DecisionRun:
    return DecisionRun(
        id="RUN-1",
        decision_id="DEC-1",
        run_type=run_type,
        status=status,
        result=None,
        trigger_event_id="EVENT-1" if run_type == "MATERIAL_EVENT" else None,
        trigger_approval_id=None,
        input_state_version=1,
        recommendation_state_version=None,
        error=None,
        created_at=datetime.now(UTC),
        completed_at=None,
    )


class FakeClient:
    def __init__(self, claim: DecisionRunClaim, final_status: str = "SUCCEEDED"):
        self.claim = claim
        self.final_status = final_status
        self.failures: list[dict] = []
        self.fail_error: BackendAPIError | None = None

    def claim_decision_run(self) -> DecisionRunClaim:
        return self.claim

    def get_goal(self, goal_id: str) -> Goal:
        return Goal(
            id=goal_id,
            text="Grow revenue without delaying SSO.",
            horizon_weeks=4,
            protected_commitments=["enterprise_sso"],
        )

    def get_decision_run(self, run_id: str) -> DecisionRun:
        return make_run(status=self.final_status)

    def fail_decision_run(self, run_id: str, *, code: str, message: str):
        if self.fail_error is not None:
            raise self.fail_error
        self.failures.append({"run_id": run_id, "code": code, "message": message})


class RecordingGraph:
    def __init__(self, error: Exception | None = None):
        self.states: list[dict] = []
        self.error = error

    def invoke(self, state: dict) -> dict:
        self.states.append(state)
        if self.error is not None:
            raise self.error
        return {}


def install_graph(monkeypatch, graph: RecordingGraph) -> list[bool]:
    detect_flags: list[bool] = []

    def fake_build_graph(detect_unlocked: bool = False):
        detect_flags.append(detect_unlocked)
        return graph

    monkeypatch.setattr(worker, "build_graph", fake_build_graph)
    return detect_flags


def test_run_once_returns_false_when_queue_is_empty(monkeypatch):
    client = FakeClient(DecisionRunClaim(run=None, goal_id=None))
    graph = RecordingGraph()
    install_graph(monkeypatch, graph)

    assert worker.run_once(client) is False
    assert graph.states == []


def test_initial_run_invokes_graph_with_goal_and_run_scoped_keys(monkeypatch):
    client = FakeClient(DecisionRunClaim(run=make_run(), goal_id="GOAL-001"))
    graph = RecordingGraph()
    detect_flags = install_graph(monkeypatch, graph)

    assert worker.run_once(client) is True
    assert detect_flags == [False]
    state = graph.states[0]
    assert state["decision_id"] == "DEC-1"
    assert state["goal"]["id"] == "GOAL-001"
    assert state["optimization_idempotency_key"] == "optimization-RUN-1"
    assert state["recommendation_idempotency_key"] == "recommendation-RUN-1"
    assert client.failures == []


def test_replan_run_enables_unlock_detection(monkeypatch):
    client = FakeClient(
        DecisionRunClaim(run=make_run("MATERIAL_EVENT"), goal_id="GOAL-001")
    )
    detect_flags = install_graph(monkeypatch, RecordingGraph())

    worker.run_once(client)

    assert detect_flags == [True]


def test_graph_exception_marks_run_failed_with_error_code(monkeypatch):
    client = FakeClient(DecisionRunClaim(run=make_run(), goal_id="GOAL-001"))
    install_graph(
        monkeypatch,
        RecordingGraph(
            BackendAPIError(
                "Stale state.",
                error_code="STATE_VERSION_CONFLICT",
            )
        ),
    )

    assert worker.run_once(client) is True
    assert client.failures == [
        {
            "run_id": "RUN-1",
            "code": "STATE_VERSION_CONFLICT",
            "message": "Stale state.",
        }
    ]


def test_generic_exception_uses_exception_type_as_code(monkeypatch):
    client = FakeClient(DecisionRunClaim(run=make_run(), goal_id="GOAL-001"))
    install_graph(
        monkeypatch,
        RecordingGraph(RuntimeError("All LLM providers failed.")),
    )

    worker.run_once(client)

    assert client.failures[0]["code"] == "RuntimeError"
    assert client.failures[0]["message"] == "All LLM providers failed."


def test_run_left_active_after_graph_is_marked_failed(monkeypatch):
    client = FakeClient(
        DecisionRunClaim(run=make_run(), goal_id="GOAL-001"),
        final_status="RUNNING",
    )
    install_graph(monkeypatch, RecordingGraph())

    worker.run_once(client)

    assert client.failures[0]["code"] == "RUN_NOT_COMPLETED"


def test_failure_to_mark_failed_does_not_crash_worker(monkeypatch):
    client = FakeClient(DecisionRunClaim(run=make_run(), goal_id="GOAL-001"))
    client.fail_error = BackendAPIError("done", error_code="RUN_NOT_ACTIVE")
    install_graph(monkeypatch, RecordingGraph(RuntimeError("late failure")))

    assert worker.run_once(client) is True
