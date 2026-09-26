from __future__ import annotations

import pytest

import main as agent_main
from tools.backend_client import BackendConfigurationError


def test_initial_graph_state_loads_decision_id_from_environment(
    monkeypatch,
):
    monkeypatch.setenv("AGENT_DECISION_ID", "DEC-ENV")

    assert agent_main.initial_graph_state() == {
        "decision_id": "DEC-ENV"
    }


def test_run_passes_decision_id_through_initial_graph_state(
    monkeypatch,
):
    captured = {}

    class FakeGraph:
        def invoke(self, state):
            captured["state"] = state
            return {"recommendation": {}, "approval": {}}

    monkeypatch.setenv("AGENT_DECISION_ID", "DEC-STATE")
    monkeypatch.setattr(
        agent_main,
        "build_graph",
        lambda: FakeGraph(),
    )

    result = agent_main.run_initial_decision()

    assert captured["state"] == {"decision_id": "DEC-STATE"}
    assert result == {"recommendation": {}, "approval": {}}


def test_missing_decision_id_gives_clear_configuration_error(
    monkeypatch,
):
    monkeypatch.delenv("AGENT_DECISION_ID", raising=False)

    with pytest.raises(
        BackendConfigurationError,
        match="AGENT_DECISION_ID must be set before starting the Agent",
    ) as exc_info:
        agent_main.initial_graph_state()

    assert exc_info.value.error_code == "AGENT_DECISION_ID_MISSING"
