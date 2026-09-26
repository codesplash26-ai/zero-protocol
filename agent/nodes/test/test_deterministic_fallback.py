from __future__ import annotations

import pytest

import providers.fallback_provider as fallback_module
from graph import build_graph
from nodes.interpret_goal import interpret_goal_node
from nodes.plan_evidence import plan_evidence_node
from nodes.test.test_replanning import _base_replan_state, _FakeBackendClient
from providers.deterministic_provider import (
    FALLBACK_LABEL,
    DeterministicFallbackError,
    DeterministicProvider,
)
from providers.fallback_provider import FallbackProvider
from schemas.models import (
    DecisionObjective,
    EvidencePlan,
    ExperimentOutcome,
    Recommendation,
)
from tools.mock_backend import get_current_state, get_experiments

GOAL = {
    "id": "GOAL-001",
    "text": (
        "Choose our next four-week growth strategy without delaying "
        "the enterprise SSO commitment."
    ),
    "horizon_weeks": 4,
    "protected_commitments": ["enterprise_sso"],
}

OBJECTIVE = DecisionObjective(
    objective="Grow revenue.",
    horizon_weeks=4,
    protected_commitments=[],
    decision_type="experiment_strategy",
)


# ---------------------------------------------------------------
# Provider chain
# ---------------------------------------------------------------


class RecordingProvider:
    calls: list[str] = []

    def __init__(self, name: str, error: Exception | None = None):
        self.name = name
        self.error = error

    def __call__(self):
        RecordingProvider.calls.append(f"init:{self.name}")
        return self

    def generate_structured(self, system_prompt, user_prompt, schema):
        RecordingProvider.calls.append(f"call:{self.name}")
        if self.error is not None:
            raise self.error
        return OBJECTIVE.model_copy(update={"objective": f"from {self.name}"})


@pytest.fixture
def providers(monkeypatch):
    RecordingProvider.calls = []

    def install(groq_error=None, gemini_error=None, keys=True):
        if keys:
            monkeypatch.setenv("GROQ_API_KEY", "test-groq")
            monkeypatch.setenv("GEMINI_API_KEY", "test-gemini")
        else:
            monkeypatch.delenv("GROQ_API_KEY", raising=False)
            monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        monkeypatch.setattr(
            fallback_module, "GroqProvider", RecordingProvider("groq", groq_error)
        )
        monkeypatch.setattr(
            fallback_module,
            "GeminiProvider",
            RecordingProvider("gemini", gemini_error),
        )
        return RecordingProvider.calls

    return install


GOAL_PROMPT = f"""
Founder goal:

{GOAL["text"]}

Extract:
"""


def test_groq_success_is_used_first(providers):
    calls = providers()
    provider = FallbackProvider()

    result = provider.generate_structured("system", GOAL_PROMPT, DecisionObjective)

    assert result.objective == "from groq"
    assert provider.last_provider == "groq"
    assert calls == ["init:groq", "call:groq"]


def test_gemini_is_used_when_groq_fails(providers):
    calls = providers(groq_error=RuntimeError("rate limited"))
    provider = FallbackProvider()

    result = provider.generate_structured("system", GOAL_PROMPT, DecisionObjective)

    assert result.objective == "from gemini"
    assert provider.last_provider == "gemini"
    assert calls == ["init:groq", "call:groq", "init:gemini", "call:gemini"]


def test_deterministic_is_used_when_both_llms_fail(providers):
    providers(
        groq_error=RuntimeError("connection error"),
        gemini_error=RuntimeError("403 permission denied"),
    )
    provider = FallbackProvider()

    result = provider.generate_structured("system", GOAL_PROMPT, DecisionObjective)

    assert provider.last_provider == "deterministic"
    assert result.objective == GOAL["text"]
    assert result.horizon_weeks == 4
    assert result.protected_commitments == ["enterprise SSO commitment"]


def test_no_api_keys_skips_llm_clients_entirely(providers):
    calls = providers(keys=False)
    provider = FallbackProvider()

    result = provider.generate_structured("system", GOAL_PROMPT, DecisionObjective)

    assert calls == []
    assert provider.last_provider == "deterministic"
    assert result.horizon_weeks == 4


def test_blank_api_keys_count_as_missing(providers, monkeypatch):
    calls = providers(keys=False)
    monkeypatch.setenv("GROQ_API_KEY", "   ")
    monkeypatch.setenv("GEMINI_API_KEY", "")

    FallbackProvider().generate_structured("system", GOAL_PROMPT, DecisionObjective)

    assert calls == []


def test_every_provider_failing_raises_with_all_reasons(providers):
    providers(keys=False)

    with pytest.raises(RuntimeError) as error:
        FallbackProvider().generate_structured(
            "system", "no labelled facts here", DecisionObjective
        )

    message = str(error.value)
    assert message.startswith("All LLM providers failed.")
    assert "GROQ_API_KEY is not set" in message
    assert "GEMINI_API_KEY is not set" in message
    assert "Deterministic:" in message


# ---------------------------------------------------------------
# Deterministic provider: invalid input and output
# ---------------------------------------------------------------


def test_goal_without_horizon_is_rejected_not_invented():
    prompt = "Founder goal:\n\nGrow revenue safely.\n\nExtract:\n"

    with pytest.raises(DeterministicFallbackError, match="horizon"):
        DeterministicProvider().generate_structured("s", prompt, DecisionObjective)


def test_malformed_json_section_is_rejected():
    prompt = (
        "Current organization state:\n\n{not json\n\n"
        "Available experiments:\n\n[]\n"
    )

    with pytest.raises(DeterministicFallbackError, match="not valid JSON"):
        DeterministicProvider().generate_structured("s", prompt, EvidencePlan)


def test_unsupported_schema_is_rejected():
    with pytest.raises(DeterministicFallbackError, match="No deterministic rule"):
        DeterministicProvider().generate_structured("s", "", GoalLike)


def test_output_failing_schema_validation_is_rejected():
    prompt = """
Experiments:

[]

Newly unlocked experiment IDs:

[]

Feasible strategies:

[{"id": "NOT-A-STRATEGY-ID", "experiment_ids": ["A"]}]

Deterministic consequences:

[]

CP-SAT result:

{"selected_experiment_ids": []}

Use exactly:
decision_id = DEC-1
state_version = 1
"""

    with pytest.raises(DeterministicFallbackError, match="failed validation"):
        DeterministicProvider().generate_structured("s", prompt, Recommendation)


class GoalLike(DecisionObjective):
    pass


# ---------------------------------------------------------------
# Deterministic nodes and full graph without API keys
# ---------------------------------------------------------------


@pytest.fixture
def no_keys(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)


def test_nodes_use_only_supplied_facts(no_keys):
    state = {
        "goal": GOAL,
        "organization_state": get_current_state().model_dump(),
        "experiments": [item.model_dump() for item in get_experiments()],
    }

    objective = interpret_goal_node(state)["decision_objective"]
    plan = plan_evidence_node({**state, "decision_objective": objective})[
        "evidence_plan"
    ]

    assert objective["horizon_weeks"] == 4
    assert plan["sufficient_from_current_state"] is True
    assert plan["clarification_questions"] == []
    assert any("prerequisite A" in item for item in plan["required_evidence"])


class _InitialBackend(_FakeBackendClient):
    def persist_recommendation(self, recommendation, *, idempotency_key):
        self.persisted_recommendation = recommendation
        return recommendation

    def persist_optimization_result(self, decision_id, result, *, idempotency_key):
        self.persisted_optimization = result
        return result


def _patch_backend(monkeypatch, backend):
    for module in (
        "load_context",
        "evaluate_candidates",
        "persist_recommendation",
        "persist_optimization",
        "retrieve_audit",
    ):
        monkeypatch.setattr(
            f"nodes.{module}.get_backend_client", lambda: backend
        )


def test_initial_graph_without_keys_recommends_prerequisite_a(no_keys, monkeypatch):
    backend = _InitialBackend(
        {
            "organization_state": get_current_state().model_dump(),
            "experiments": [item.model_dump() for item in get_experiments()],
        }
    )
    _patch_backend(monkeypatch, backend)

    result = build_graph().invoke({"decision_id": "DEC-001", "goal": GOAL})

    recommendation = result["recommendation"]
    assert recommendation["now"] == ["A"]
    assert recommendation["state_version"] == 1
    assert recommendation["reasoning_summary"].startswith(FALLBACK_LABEL)
    assert "600 USD" in recommendation["reasoning_summary"]
    assert result["approval"]["decision"] == "NOT_REQUIRED"
    assert backend.persisted_recommendation is not None
    known = {"A", "B", "C"}
    assert all(
        set(item["experiment_ids"]) <= known
        for item in result["candidate_strategies"]
    )
    assert all(
        item["rationale"].startswith(FALLBACK_LABEL)
        for item in result["strategic_evaluation"]
    )


def test_replan_graph_without_keys_continues_with_unlocked_b(no_keys, monkeypatch):
    base = _base_replan_state(ExperimentOutcome.SUCCESS)
    organization = {
        **base["organization_state"],
        "available_engineering_hours": 42,
        "reserved_engineering_hours": 18,
        "state_version": 4,
    }
    backend = _InitialBackend(
        {"organization_state": organization, "experiments": base["experiments"]}
    )
    _patch_backend(monkeypatch, backend)

    result = build_graph(detect_unlocked=True).invoke(
        {"decision_id": "DEC-001", "goal": GOAL}
    )

    assert result["newly_unlocked_experiment_ids"] == ["B"]
    assert result["recommendation"]["now"] == ["B"]
    assert result["recommendation"]["state_version"] == 4
    assert result["recommendation"]["reasoning_summary"].startswith(FALLBACK_LABEL)
    assert result["approval"]["decision"] == "PENDING"


def test_failed_prerequisite_does_not_unlock_b_without_keys(no_keys, monkeypatch):
    base = _base_replan_state(ExperimentOutcome.FAILURE)
    backend = _InitialBackend(
        {
            "organization_state": {**base["organization_state"], "state_version": 3},
            "experiments": base["experiments"],
        }
    )
    _patch_backend(monkeypatch, backend)

    result = build_graph(detect_unlocked=True).invoke(
        {"decision_id": "DEC-001", "goal": GOAL}
    )

    assert result["newly_unlocked_experiment_ids"] == []
    assert "B" not in result["recommendation"]["now"]


def test_worker_marks_run_failed_when_deterministic_cannot_answer(
    no_keys, monkeypatch
):
    import worker
    from nodes.test.test_worker import FakeClient, make_run
    from schemas.models import DecisionRunClaim, Goal

    backend = _InitialBackend(
        {
            "organization_state": get_current_state().model_dump(),
            "experiments": [item.model_dump() for item in get_experiments()],
        }
    )
    _patch_backend(monkeypatch, backend)
    client = FakeClient(
        DecisionRunClaim(run=make_run(), goal_id="GOAL-002"),
        final_status="RUNNING",
    )
    monkeypatch.setattr(
        client,
        "get_goal",
        lambda goal_id: Goal(
            id=goal_id,
            text="Grow revenue safely.",  # no horizon stated
            horizon_weeks=4,
            protected_commitments=[],
        ),
    )

    assert worker.run_once(client) is True
    assert client.failures[0]["code"] == "RuntimeError"
    assert "Deterministic:" in client.failures[0]["message"]
    assert backend.persisted_recommendation is None
