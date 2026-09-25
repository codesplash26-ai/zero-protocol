from schemas.models import (
    CandidateStrategy,
    CandidateStrategySet,
    DecisionObjective,
    EvidencePlan,
    Experiment,
    ExperimentOutcome,
    ExperimentStatus,
    OrganizationState,
    Recommendation,
    StrategicEvaluationSet,
    StrategyAssessment,
)

from providers.fallback_provider import (
    FallbackProvider,
)

from replan_graph import build_replan_graph

from tools.mock_backend import (
    calculate_consequences,
    check_feasibility,
    detect_newly_unlocked_experiment_ids,
    get_current_state,
    get_experiments,
)


class _FakeBackendClient:
    def __init__(
        self,
        state: dict,
    ):
        self.organization_state = OrganizationState(
            **state["organization_state"]
        )
        self.experiments = [
            Experiment(**experiment)
            for experiment
            in state["experiments"]
        ]

    def check_feasibility(
        self,
        strategy: CandidateStrategy,
    ):
        return check_feasibility(
            strategy,
            self.organization_state,
            self.experiments,
        )

    def calculate_consequences(
        self,
        strategy: CandidateStrategy,
    ):
        return calculate_consequences(
            strategy,
            self.organization_state,
            self.experiments,
        )


def _base_replan_state(
    outcome: ExperimentOutcome,
) -> dict:

    organization_state = (
        get_current_state()
    )

    experiments = get_experiments()

    for experiment in experiments:

        if experiment.id == "A":
            experiment.status = (
                ExperimentStatus.COMPLETED
            )
            experiment.outcome = outcome

    objective = DecisionObjective(
        objective=(
            "Choose the next four-week "
            "growth strategy."
        ),
        horizon_weeks=4,
        protected_commitments=[
            "enterprise_sso"
        ],
        decision_type="experiment_strategy",
    )

    evidence_plan = EvidencePlan(
        required_evidence=[
            "Pricing willingness evidence"
        ],
        sufficient_from_current_state=True,
        clarification_questions=[],
    )

    return {
        "organization_state":
            organization_state.model_dump(),
        "experiments": [
            experiment.model_dump()
            for experiment in experiments
        ],
        "decision_objective":
            objective.model_dump(),
        "evidence_plan":
            evidence_plan.model_dump(),
        "event": {
            "id": "EVENT-TEST",
            "event_type": "CAPACITY_CHANGE",
            "description":
                "SSO vendor delay releases capacity.",
            "engineering_delta_hours": 18,
        },
    }


def _fake_generate_structured(
    self,
    system_prompt: str,
    user_prompt: str,
    schema,
):

    if schema is CandidateStrategySet:
        return CandidateStrategySet(
            strategies=[
                CandidateStrategy(
                    id="C-only",
                    experiment_ids=["C"],
                    sequence=["C"],
                    conditional=False,
                    condition=None,
                )
            ]
        )

    if schema is StrategicEvaluationSet:
        return StrategicEvaluationSet(
            assessments=[
                StrategyAssessment(
                    strategy_id="STRATEGY-C",
                    business_value=(
                        "Uses supplied experiment data."
                    ),
                    information_value=(
                        "Independent experiment."
                    ),
                    strategic_alignment=(
                        "Feasible independent option."
                    ),
                    opportunity_cost=(
                        "Uses supplied resources."
                    ),
                    risk=(
                        "No unsupported risk claim."
                    ),
                    rationale=(
                        "Based only on supplied facts."
                    ),
                ),
                StrategyAssessment(
                    strategy_id=
                        "STRATEGY-B",
                    business_value=(
                        "Uses the newly unlocked "
                        "dependent experiment."
                    ),
                    information_value=(
                        "Acts on the successful "
                        "prerequisite result."
                    ),
                    strategic_alignment=(
                        "Matches the dependency path."
                    ),
                    opportunity_cost=(
                        "Uses supplied resources."
                    ),
                    risk=(
                        "No unsupported risk claim."
                    ),
                    rationale=(
                        "A completed successful "
                        "prerequisite unlocks this "
                        "strategy."
                    ),
                ),
            ]
        )

    if schema is Recommendation:
        return Recommendation(
            decision_id="DEC-001",
            recommended_strategy_id=
                "STRATEGY-B",
            now=[],
            next=[],
            later=[],
            defer=[],
            reasoning_summary=(
                "Selects the feasible newly "
                "unlocked continuation using "
                "supplied dependency and "
                "resource data."
            ),
        )

    raise AssertionError(
        f"Unexpected schema: {schema}"
    )


def test_replanning_successful_a_recommends_newly_unlocked_b(
    monkeypatch,
):

    monkeypatch.setattr(
        FallbackProvider,
        "generate_structured",
        _fake_generate_structured,
    )

    graph_state = _base_replan_state(
        ExperimentOutcome.SUCCESS
    )

    backend_state = dict(graph_state)
    backend_state["organization_state"] = dict(
        graph_state[
            "organization_state"
        ]
    )
    backend_state["organization_state"][
        "available_engineering_hours"
    ] = 42

    monkeypatch.setattr(
        "nodes.evaluate_candidates.get_backend_client",
        lambda: _FakeBackendClient(
            backend_state
        ),
    )

    graph = build_replan_graph()

    result = graph.invoke(
        graph_state
    )

    assert (
        result["organization_state"][
            "available_engineering_hours"
        ]
        == 42
    )

    assert (
        result["materiality_result"][
            "potentially_material"
        ]
        is True
    )

    assert (
        result[
            "newly_unlocked_experiment_ids"
        ]
        == ["B"]
    )

    b_feasibility = next(
        item
        for item in
        result["feasibility_results"]
        if item["strategy_id"]
        == "STRATEGY-B"
    )

    assert (
        b_feasibility["feasible"]
        is True
    )

    assert all(
        "A" not in combination
        for combination in
        result["optimization_result"][
            "feasible_combinations"
        ]
    )

    assert (
        result["recommendation"]["now"]
        == ["B"]
    )

    assert (
        result["approval"]["decision"]
        == "PENDING"
    )

    b_consequences = next(
        item
        for item in
        result["consequence_results"]
        if item["strategy_id"]
        == "STRATEGY-B"
    )

    assert (
        b_consequences["budget_used_usd"]
        == 2500
    )


def test_failed_completed_a_does_not_newly_unlock_b():

    state = get_current_state()
    state.available_engineering_hours = 42

    experiments = get_experiments()

    for experiment in experiments:

        if experiment.id == "A":
            experiment.status = (
                ExperimentStatus.COMPLETED
            )
            experiment.outcome = (
                ExperimentOutcome.FAILURE
            )

    assert (
        detect_newly_unlocked_experiment_ids(
            experiments
        )
        == []
    )

    b_strategy = CandidateStrategy(
        id="B-only",
        experiment_ids=["B"],
        sequence=["B"],
        conditional=False,
        condition=None,
    )

    b_feasibility = check_feasibility(
        b_strategy,
        state,
        experiments,
    )

    assert (
        b_feasibility.feasible
        is False
    )
