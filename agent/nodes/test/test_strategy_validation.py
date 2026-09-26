from __future__ import annotations

import pytest

from nodes.generate_strategies import generate_strategies_node
from providers.fallback_provider import FallbackProvider
from schemas.models import CandidateStrategy, CandidateStrategySet
from tools.mock_backend import get_experiments
from tools.strategy_validation import strategy_consistency_violations


def strategy(**overrides) -> CandidateStrategy:
    values = {
        "id": "STRATEGY-A-B",
        "experiment_ids": ["A", "B"],
        "sequence": ["A", "B"],
        "conditional": True,
        "condition": "Run B only if A succeeds.",
    }
    values.update(overrides)
    return CandidateStrategy(**values)


def test_valid_conditional_and_independent_strategies_pass():
    assert strategy_consistency_violations(strategy()) == []
    assert (
        strategy_consistency_violations(
            strategy(id="STRATEGY-C", experiment_ids=["C"], sequence=["C"], conditional=False, condition=None)
        )
        == []
    )


@pytest.mark.parametrize(
    "sequence",
    [
        ["A"],  # missing B
        ["A", "B", "C"],  # extra C
        ["A", "C"],  # swapped member
    ],
)
def test_sequence_must_contain_exactly_the_experiments(sequence):
    assert "sequence must contain exactly the experiment_ids" in strategy_consistency_violations(
        strategy(sequence=sequence)
    )


@pytest.mark.parametrize("condition", [None, "", "   "])
def test_conditional_strategy_requires_condition_text(condition):
    assert "conditional strategies require a condition" in strategy_consistency_violations(
        strategy(condition=condition)
    )


def test_duplicates_and_non_conditional_condition_are_rejected():
    assert "experiment_ids must be unique" in strategy_consistency_violations(
        strategy(experiment_ids=["A", "A", "B"])
    )
    assert "sequence must contain unique experiment identifiers" in strategy_consistency_violations(
        strategy(sequence=["A", "B", "B"])
    )
    assert "non-conditional strategies must use a null condition" in strategy_consistency_violations(
        strategy(conditional=False)
    )


def test_node_filters_malformed_candidates_and_keeps_valid_ones(monkeypatch):
    llm_output = CandidateStrategySet(
        strategies=[
            # Valid: kept.
            CandidateStrategy(id="STRATEGY-A", experiment_ids=["A"], sequence=["A"]),
            CandidateStrategy(
                id="STRATEGY-A-B",
                experiment_ids=["A", "B"],
                sequence=["A", "B"],
                conditional=True,
                condition="Run B only if A completes with SUCCESS.",
            ),
            # Step order misses an experiment: dropped.
            CandidateStrategy(id="STRATEGY-A-C", experiment_ids=["A", "C"], sequence=["A"]),
            # Conditional without condition text: dropped.
            CandidateStrategy(
                id="STRATEGY-C-B",
                experiment_ids=["C", "B"],
                sequence=["C", "B"],
                conditional=True,
                condition=None,
            ),
            # Duplicate experiment: dropped.
            CandidateStrategy(id="STRATEGY-C-C", experiment_ids=["C", "C"], sequence=["C", "C"]),
        ]
    )
    monkeypatch.setattr(FallbackProvider, "generate_structured", lambda self, s, u, schema: llm_output)

    result = generate_strategies_node(
        {
            "decision_objective": {"objective": "Grow"},
            "evidence_plan": {"required_evidence": []},
            "experiments": [item.model_dump() for item in get_experiments()],
        }
    )

    ids = [item["id"] for item in result["candidate_strategies"]]
    assert ids == ["STRATEGY-A", "STRATEGY-A-B"]
    assert all(
        strategy_consistency_violations(CandidateStrategy(**item)) == []
        for item in result["candidate_strategies"]
    )
