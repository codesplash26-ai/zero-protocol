from providers.fallback_provider import (
    FallbackProvider,
)
from replan_graph import build_replan_graph
from schemas.models import (
    AuditRecord,
    CandidateStrategy,
    CandidateStrategySet,
    DecisionObjective,
    Event,
    EvidencePlan,
    Experiment,
    ExperimentOutcome,
    ExperimentStatus,
    MaterialityResult,
    OptimizationResult,
    OrganizationState,
    Recommendation,
    StrategicEvaluationSet,
    StrategyAssessment,
)
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
        self.potentially_material = state.get(
            "potentially_material",
            True,
        )
        self.persisted_recommendation = None
        self.persisted_optimization = None
        self.requested_audit_decision_id = None

    def create_event(
        self,
        request,
        *,
        idempotency_key,
    ):
        assert idempotency_key == "capacity-event"
        return Event(
            id="EVENT-TEST",
            event_type=request.event_type,
            description=request.description,
            engineering_delta_hours=(
                request.engineering_delta_hours
            ),
            budget_delta_usd=request.budget_delta_usd,
            experiment_id=request.experiment_id,
            experiment_outcome=request.experiment_outcome,
            commitment_id=request.commitment_id,
            source=request.source,
            occurred_at=request.occurred_at,
            state_version=4,
        )

    def check_materiality(
        self,
        event_id,
        *,
        idempotency_key,
    ):
        assert event_id == "EVENT-TEST"
        assert idempotency_key == "capacity-materiality"
        return MaterialityResult(
            event_id=event_id,
            potentially_material=self.potentially_material,
            affected_fields=(
                [
                    "available_engineering_hours",
                    "reserved_engineering_hours",
                ]
                if self.potentially_material
                else []
            ),
            reasons=(
                ["Authoritative capacity changed."]
                if self.potentially_material
                else []
            ),
            state_version=4,
        )

    def get_current_state(self):
        return self.organization_state

    def get_experiments(self):
        return self.experiments

    def persist_recommendation(
        self,
        recommendation,
        *,
        idempotency_key,
    ):
        assert idempotency_key == "recommendation-DEC-001-v4"
        self.persisted_recommendation = recommendation
        return recommendation

    def persist_optimization_result(
        self,
        decision_id: str,
        result: OptimizationResult,
        *,
        idempotency_key: str,
    ):
        assert decision_id == "DEC-001"
        assert idempotency_key == (
            f"optimization-DEC-001-{result.solver_run_id}"
        )
        self.persisted_optimization = result
        return result

    def get_audit(self, decision_id: str):
        self.requested_audit_decision_id = decision_id
        return [
            AuditRecord(
                id="AUD-TEST",
                decision_id=decision_id,
                goal_id="GOAL-001",
                state_version=4,
                tool_calls=["calculate_materiality"],
                candidate_strategy_ids=["STRATEGY-B"],
                optimization_status="FEASIBLE",
                recommended_strategy_id="STRATEGY-B",
                approval_id="APR-001",
                action_receipt_id=None,
                event_ids=["EVENT-TEST"],
                created_at="2026-09-25T05:43:47Z",
            )
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
        "decision_id": "DEC-001",
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
        "event_request": {
            "event_type": "CAPACITY_CHANGE",
            "description":
                "SSO vendor delay releases capacity.",
            "engineering_delta_hours": 18,
            "budget_delta_usd": 0,
            "experiment_id": None,
            "experiment_outcome": None,
            "commitment_id": "enterprise_sso",
            "source": "demo_simulation",
            "occurred_at": "2026-09-25T05:43:47Z",
            "expected_state_version": 3,
        },
        "event_idempotency_key": "capacity-event",
        "materiality_idempotency_key": "capacity-materiality",
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
            state_version=4,
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
    backend_state["organization_state"][
        "reserved_engineering_hours"
    ] = 18
    backend_state["organization_state"][
        "state_version"
    ] = 4

    backend_client = _FakeBackendClient(
        backend_state
    )

    monkeypatch.setattr(
        "nodes.evaluate_candidates.get_backend_client",
        lambda: backend_client,
    )
    monkeypatch.setattr(
        "nodes.handle_event.get_backend_client",
        lambda: backend_client,
    )
    monkeypatch.setattr(
        "nodes.persist_recommendation.get_backend_client",
        lambda: backend_client,
    )
    monkeypatch.setattr(
        "nodes.persist_optimization.get_backend_client",
        lambda: backend_client,
    )
    monkeypatch.setattr(
        "nodes.retrieve_audit.get_backend_client",
        lambda: backend_client,
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
    assert result["optimization_result"]["status"] == "FEASIBLE"
    assert result["optimization_result"]["selected_experiment_ids"] == []
    assert result["optimization_result"]["objective_value"] is None
    assert result["optimization_result"]["evaluated_state_version"] == 4
    assert backend_client.persisted_optimization is not None

    assert (
        result["recommendation"]["now"]
        == ["B"]
    )
    assert backend_client.persisted_recommendation is not None
    assert backend_client.persisted_recommendation.state_version == 4
    assert backend_client.requested_audit_decision_id == "DEC-001"
    assert result["audit_trace"][0]["recommended_strategy_id"] == (
        "STRATEGY-B"
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


def test_non_material_backend_result_does_not_replan(monkeypatch):
    graph_state = _base_replan_state(
        ExperimentOutcome.SUCCESS
    )
    backend_state = dict(graph_state)
    backend_state["organization_state"] = dict(
        graph_state["organization_state"]
    )
    backend_state["organization_state"][
        "state_version"
    ] = 4
    backend_state["potentially_material"] = False
    backend_client = _FakeBackendClient(
        backend_state
    )
    monkeypatch.setattr(
        "nodes.handle_event.get_backend_client",
        lambda: backend_client,
    )

    result = build_replan_graph().invoke(
        graph_state
    )

    assert result["materiality_result"]["potentially_material"] is False
    assert "newly_unlocked_experiment_ids" not in result
    assert "recommendation" not in result


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
