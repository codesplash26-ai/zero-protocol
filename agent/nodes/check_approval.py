from schemas.models import (
    ConsequenceResult,
    OrganizationState,
)

from tools.approval_tool import (
    check_approval_requirement,
)

from state import AgentState


def check_approval_node(
    state: AgentState,
) -> dict:

    recommendation = dict(
        state["recommendation"]
    )

    strategy_id = (
        recommendation[
            "recommended_strategy_id"
        ]
    )

    consequence_data = next(
        (
            item
            for item
            in state["consequence_results"]
            if item["strategy_id"]
            == strategy_id
        ),
        None,
    )

    if consequence_data is None:
        raise ValueError(
            "No consequence result found "
            "for recommended strategy."
        )

    consequences = ConsequenceResult(
        **consequence_data
    )

    organization = OrganizationState(
        **state["organization_state"]
    )

    approval = (
        check_approval_requirement(
            decision_id=
                recommendation[
                    "decision_id"
                ],
            strategy_id=strategy_id,
            consequences=consequences,
            state=organization,
        )
    )

    recommendation[
        "requires_approval"
    ] = (
        approval.decision.value
        == "PENDING"
    )

    return {
        "recommendation":
            recommendation,

        "approval":
            approval.model_dump(
                mode="json"
            ),
    }