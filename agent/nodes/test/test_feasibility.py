from schemas.models import (
    CandidateStrategy,
)

from tools.mock_backend import (
    check_feasibility,
)


def test_strategy_a_is_feasible():

    strategy = CandidateStrategy(
        id="TEST-A",
        experiment_ids=["A"],
        sequence=["A"],
        conditional=False,
        condition=None,
    )

    result = check_feasibility(
        strategy
    )

    assert result.feasible is True


def test_a_b_is_not_initially_feasible():

    strategy = CandidateStrategy(
        id="TEST-AB",
        experiment_ids=["A", "B"],
        sequence=["A", "B"],
        conditional=False,
        condition=None,
    )

    result = check_feasibility(
        strategy
    )

    assert result.feasible is False