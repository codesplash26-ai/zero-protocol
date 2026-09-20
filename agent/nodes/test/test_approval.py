from schemas.models import (
    ConsequenceResult,
)

from tools.mock_backend import (
    get_current_state,
)

from tools.approval_tool import (
    check_approval_requirement,
)


def test_b_requires_approval():

    state = get_current_state()

    consequences = ConsequenceResult(
        strategy_id="B",
        budget_used_usd=2500,
        remaining_budget_usd=1500,
        engineering_used_hours=24,
        remaining_engineering_hours=18,
        traffic_used=3500,
        remaining_traffic=6500,
    )

    result = (
        check_approval_requirement(
            decision_id="DEC-TEST",
            strategy_id="B",
            consequences=consequences,
            state=state,
        )
    )

    assert (
        result.decision.value
        == "PENDING"
    )