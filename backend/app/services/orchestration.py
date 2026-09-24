from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import (
    ApprovalRecord,
    CandidateStrategyRecord,
    Decision,
    EventRecord,
    MaterialityRecord,
    RecommendationRecord,
    SolverRun,
)
from app.models import DecisionRun as DecisionRunRecord
from app.models import Goal as GoalRecord
from app.repositories import (
    get_current_state,
    get_goal,
    list_commitments,
    list_evidence,
    list_experiments,
)
from app.schemas import (
    ApprovalDecision,
    CandidateStrategy,
    ConsequenceCalculateRequest,
    ConsequenceResult,
    DecisionRun,
    DecisionRunResult,
    DecisionRunStatus,
    DecisionRunType,
    DecisionWorkspace,
    FeasibilityResult,
    OptimizationPersistRequest,
    OptimizationResult,
    Recommendation,
    RecommendationPersistRequest,
    ReplanRequest,
    StrategyView,
)
from app.services.audit import append_audit
from app.services.evaluation import calculate_consequences, check_feasibility
from app.services.identifiers import new_id
from app.services.state import lock_current_state, require_state_version


def decision_run_to_schema(record: DecisionRunRecord) -> DecisionRun:
    return DecisionRun(
        id=record.id,
        decision_id=record.decision_id,
        run_type=record.run_type,
        status=record.status,
        result=record.result,
        trigger_event_id=record.trigger_event_id,
        trigger_approval_id=record.trigger_approval_id,
        input_state_version=record.input_state_version,
        recommendation_state_version=record.recommendation_state_version,
        error=record.error,
        created_at=record.created_at,
        completed_at=record.completed_at,
    )


def recommendation_to_schema(record: RecommendationRecord) -> Recommendation:
    return Recommendation(
        decision_id=record.decision_id,
        recommended_strategy_id=record.recommended_strategy_id,
        current_executable_experiment_id=record.current_executable_experiment_id,
        now=record.now,
        next=record.next,
        later=record.later,
        defer=record.defer,
        reasoning_summary=record.reasoning_summary,
        requires_approval=record.requires_approval,
        state_version=record.state_version,
    )


def optimization_to_schema(record: SolverRun) -> OptimizationResult:
    return OptimizationResult(
        status=record.status,
        selected_experiment_ids=record.selected_experiment_ids,
        feasible_combinations=record.feasible_combinations,
        objective_value=record.objective_value,
        solver_run_id=record.id,
        evaluated_state_version=record.evaluated_state_version,
    )


def create_initial_decision(
    session: Session,
    *,
    organization_id: str,
    goal_id: str,
    expected_state_version: int,
) -> DecisionRun:
    current = lock_current_state(session, organization_id)
    require_state_version(current, expected_state_version)
    goal = session.scalar(
        select(GoalRecord).where(
            GoalRecord.id == goal_id,
            GoalRecord.organization_id == organization_id,
        )
    )
    if goal is None:
        raise APIError(404, "GOAL_NOT_FOUND", "The requested goal was not found.")

    active = session.scalar(
        select(DecisionRunRecord)
        .join(Decision, Decision.id == DecisionRunRecord.decision_id)
        .where(
            Decision.organization_id == organization_id,
            Decision.goal_id == goal_id,
            DecisionRunRecord.status.in_(["QUEUED", "RUNNING"]),
        )
        .limit(1)
    )
    if active is not None:
        raise APIError(
            409,
            "ACTIVE_RUN_EXISTS",
            "An active Governor run already exists for this goal.",
            {"run_id": active.id},
        )

    decision = Decision(
        id=new_id("DEC"), organization_id=organization_id, goal_id=goal_id
    )
    run = DecisionRunRecord(
        id=new_id("RUN"),
        decision_id=decision.id,
        run_type=DecisionRunType.INITIAL.value,
        status=DecisionRunStatus.QUEUED.value,
        result=None,
        trigger_event_id=None,
        trigger_approval_id=None,
        input_state_version=current.state_version,
        recommendation_state_version=None,
        error=None,
        completed_at=None,
    )
    session.add_all([decision, run])
    append_audit(
        session,
        organization_id=organization_id,
        decision_id=decision.id,
        goal_id=goal_id,
        state_version=current.state_version,
        title="Decision run queued",
        summary=f"Queued initial Governor run {run.id}.",
    )
    session.flush()
    return decision_run_to_schema(run)


def get_decision_run(session: Session, run_id: str) -> DecisionRun:
    record = session.get(DecisionRunRecord, run_id)
    if record is None:
        raise APIError(
            404,
            "DECISION_RUN_NOT_FOUND",
            "The requested decision run was not found.",
            {"run_id": run_id},
        )
    return decision_run_to_schema(record)


def create_replan(
    session: Session,
    *,
    organization_id: str,
    decision_id: str,
    request: ReplanRequest,
) -> DecisionRun:
    decision = session.scalar(
        select(Decision).where(
            Decision.id == decision_id,
            Decision.organization_id == organization_id,
        )
    )
    if decision is None:
        raise APIError(404, "DECISION_NOT_FOUND", "The decision was not found.")
    current = lock_current_state(session, organization_id)
    require_state_version(current, request.expected_state_version)

    run_type: DecisionRunType
    if request.trigger_event_id is not None:
        event = session.scalar(
            select(EventRecord).where(
                EventRecord.id == request.trigger_event_id,
                EventRecord.organization_id == organization_id,
            )
        )
        materiality = session.get(MaterialityRecord, request.trigger_event_id)
        if event is None:
            raise APIError(
                404,
                "EVENT_OR_APPROVAL_NOT_FOUND",
                "The replan event was not found.",
            )
        if materiality is None or not materiality.potentially_material:
            raise APIError(
                409,
                "EVENT_NOT_MATERIAL",
                "The event has not been classified as potentially material.",
            )
        if event.state_version != current.state_version:
            raise APIError(
                409,
                "STATE_VERSION_CONFLICT",
                "The event does not describe the current organization state.",
                {"expected": event.state_version, "actual": current.state_version},
            )
        run_type = DecisionRunType.MATERIAL_EVENT
    else:
        approval = session.scalar(
            select(ApprovalRecord)
            .join(Decision, Decision.id == ApprovalRecord.decision_id)
            .where(
                ApprovalRecord.id == request.trigger_approval_id,
                ApprovalRecord.decision_id == decision_id,
                Decision.organization_id == organization_id,
            )
        )
        if approval is None:
            raise APIError(
                404,
                "EVENT_OR_APPROVAL_NOT_FOUND",
                "The replan approval was not found.",
            )
        if approval.state_version != current.state_version:
            raise APIError(409, "APPROVAL_INVALIDATED", "The approval is stale.")
        run_type = DecisionRunType.APPROVAL_REPLAN_REQUEST

    active = session.scalar(
        select(DecisionRunRecord)
        .where(
            DecisionRunRecord.decision_id == decision_id,
            DecisionRunRecord.status.in_(["QUEUED", "RUNNING"]),
        )
        .limit(1)
    )
    if active is not None:
        raise APIError(
            409,
            "ACTIVE_RUN_EXISTS",
            "An active Governor run already exists for this decision.",
            {"run_id": active.id},
        )

    run = DecisionRunRecord(
        id=new_id("RUN"),
        decision_id=decision_id,
        run_type=run_type.value,
        status=DecisionRunStatus.QUEUED.value,
        result=None,
        trigger_event_id=request.trigger_event_id,
        trigger_approval_id=request.trigger_approval_id,
        input_state_version=current.state_version,
        recommendation_state_version=None,
        error=None,
        completed_at=None,
    )
    session.add(run)
    append_audit(
        session,
        organization_id=organization_id,
        decision_id=decision.id,
        goal_id=decision.goal_id,
        state_version=current.state_version,
        approval_id=request.trigger_approval_id,
        event_ids=[request.trigger_event_id] if request.trigger_event_id else [],
        title="Replan run queued",
        summary=f"Queued {run.run_type} Governor run {run.id}.",
    )
    session.flush()
    return decision_run_to_schema(run)


def persist_optimization(
    session: Session,
    *,
    organization_id: str,
    request: OptimizationPersistRequest,
) -> OptimizationResult:
    decision = session.get(Decision, request.decision_id)
    if decision is None or decision.organization_id != organization_id:
        raise APIError(404, "DECISION_NOT_FOUND", "The decision was not found.")
    current = lock_current_state(session, organization_id)
    require_state_version(current, request.evaluated_state_version)

    experiment_ids = {item.id for item in list_experiments(session, organization_id)}
    supplied = set(request.selected_experiment_ids)
    supplied.update(item for combo in request.feasible_combinations for item in combo)
    missing = sorted(supplied - experiment_ids)
    if missing:
        raise APIError(
            404,
            "EXPERIMENT_NOT_FOUND",
            "The optimization result references unknown experiments.",
            {"experiment_ids": missing},
        )
    if session.get(SolverRun, request.solver_run_id) is not None:
        raise APIError(
            409,
            "SOLVER_RUN_EXISTS",
            "The solver run identifier already exists.",
        )

    record = SolverRun(
        id=request.solver_run_id,
        decision_id=request.decision_id,
        status=request.status.value,
        selected_experiment_ids=request.selected_experiment_ids,
        feasible_combinations=request.feasible_combinations,
        objective_value=request.objective_value,
        evaluated_state_version=request.evaluated_state_version,
    )
    session.add(record)
    append_audit(
        session,
        organization_id=organization_id,
        decision_id=request.decision_id,
        goal_id=decision.goal_id,
        state_version=current.state_version,
        optimization_status=request.status.value,
        title="Optimization result recorded",
        summary=f"Recorded solver run {record.id} with status {record.status}.",
    )
    session.flush()
    return optimization_to_schema(record)


def _validate_recommendation(
    request: RecommendationPersistRequest,
    run: DecisionRunRecord,
) -> CandidateStrategy:
    recommendation = request.recommendation
    if recommendation.decision_id != run.decision_id:
        raise APIError(
            409,
            "RECOMMENDATION_SCOPE_MISMATCH",
            "The recommendation does not belong to the decision run.",
        )
    strategies = {item.id: item for item in request.candidate_strategies}
    selected = strategies.get(recommendation.recommended_strategy_id)
    if selected is None:
        raise APIError(
            400,
            "INVALID_RECOMMENDATION",
            "The recommended strategy is not in candidate_strategies.",
        )
    executable = recommendation.current_executable_experiment_id
    if executable is not None and executable not in selected.experiment_ids:
        raise APIError(
            400,
            "INVALID_RECOMMENDATION",
            "The current executable experiment is not in the recommended strategy.",
        )
    if len(strategies) != len(request.candidate_strategies):
        raise APIError(
            400,
            "INVALID_RECOMMENDATION",
            "Candidate strategy identifiers must be unique.",
        )
    return selected


def persist_recommendation(
    session: Session,
    *,
    organization_id: str,
    request: RecommendationPersistRequest,
) -> Recommendation:
    run = session.get(DecisionRunRecord, request.run_id)
    if run is None:
        raise APIError(404, "DECISION_RUN_NOT_FOUND", "The decision run was not found.")
    if run.status not in {DecisionRunStatus.QUEUED.value, DecisionRunStatus.RUNNING.value}:
        raise APIError(409, "DECISION_RUN_CLOSED", "The decision run is already closed.")
    decision = session.get(Decision, run.decision_id)
    if decision is None or decision.organization_id != organization_id:
        raise APIError(404, "DECISION_NOT_FOUND", "The decision was not found.")

    current = lock_current_state(session, organization_id)
    require_state_version(current, request.recommendation.state_version)
    if run.input_state_version != current.state_version:
        raise APIError(
            409,
            "STATE_VERSION_CONFLICT",
            "The decision run evaluated a stale organization state.",
            {"expected": run.input_state_version, "actual": current.state_version},
        )
    selected = _validate_recommendation(request, run)
    recommendation = request.recommendation

    for strategy in request.candidate_strategies:
        existing = session.get(CandidateStrategyRecord, strategy.id)
        if existing is not None and existing.decision_id != decision.id:
            raise APIError(
                409,
                "STRATEGY_ID_CONFLICT",
                "A candidate strategy identifier belongs to another decision.",
            )
        feasibility = check_feasibility(session, organization_id, strategy)
        consequences = calculate_consequences(
            session,
            organization_id,
            ConsequenceCalculateRequest(
                strategy_id=strategy.id, experiment_ids=strategy.experiment_ids
            ),
        )
        if existing is None:
            existing = CandidateStrategyRecord(id=strategy.id, decision_id=decision.id)
            session.add(existing)
        existing.experiment_ids = strategy.experiment_ids
        existing.sequence = strategy.sequence
        existing.conditional = strategy.conditional
        existing.condition = strategy.condition
        existing.feasibility = feasibility.model_dump(mode="json")
        existing.consequences = consequences.model_dump(mode="json")

    # Candidate strategies must exist before recommendation and approval foreign keys
    # can be persisted, especially when PostgreSQL enforces them immediately.
    session.flush()

    executable = recommendation.current_executable_experiment_id
    if executable is not None:
        executable_result = check_feasibility(
            session,
            organization_id,
            CandidateStrategy(
                id=f"{selected.id}-CURRENT",
                experiment_ids=[executable],
                sequence=[executable],
                conditional=False,
                condition=None,
            ),
        )
        if not executable_result.feasible:
            raise APIError(
                400,
                "CURRENT_ACTION_INFEASIBLE",
                "The recommendation's current executable experiment is infeasible.",
                {"violations": executable_result.violations},
            )

    record = RecommendationRecord(
        id=new_id("REC"),
        decision_id=decision.id,
        recommended_strategy_id=recommendation.recommended_strategy_id,
        current_executable_experiment_id=recommendation.current_executable_experiment_id,
        now=recommendation.now,
        next=recommendation.next,
        later=recommendation.later,
        defer=recommendation.defer,
        reasoning_summary=recommendation.reasoning_summary,
        # The backend policy is authoritative; the agent-provided flag is advisory only.
        requires_approval=False,
        state_version=recommendation.state_version,
    )
    session.add(record)
    session.flush()
    from app.services.governance import ensure_approval_for_recommendation

    approval = ensure_approval_for_recommendation(
        session,
        organization_id=organization_id,
        recommendation=record,
    )
    record.requires_approval = bool(approval and approval.decision == ApprovalDecision.PENDING)
    run.status = DecisionRunStatus.SUCCEEDED.value
    run.result = DecisionRunResult.NEW_RECOMMENDATION.value
    run.recommendation_state_version = recommendation.state_version
    run.completed_at = datetime.now(UTC)
    append_audit(
        session,
        organization_id=organization_id,
        decision_id=decision.id,
        goal_id=decision.goal_id,
        state_version=current.state_version,
        tool_calls=request.tool_calls,
        candidate_strategy_ids=[item.id for item in request.candidate_strategies],
        recommended_strategy_id=recommendation.recommended_strategy_id,
        title="Recommendation generated",
        summary=f"Decision run {run.id} generated a recommendation.",
    )
    session.flush()
    return recommendation_to_schema(record)


def get_decision_workspace(
    session: Session, *, organization_id: str, decision_id: str
) -> DecisionWorkspace:
    decision = session.get(Decision, decision_id)
    if decision is None or decision.organization_id != organization_id:
        raise APIError(404, "DECISION_NOT_FOUND", "The decision was not found.")
    current = get_current_state(session, organization_id)
    goal = get_goal(session, organization_id, decision.goal_id)
    commitments = list_commitments(session, organization_id)
    primary_constraint = (
        f"{commitments[0].name} "
        f"({commitments[0].reserved_engineering_hours}h protected)"
        if commitments
        else "No protected commitment"
    )
    recommendation_record = session.scalar(
        select(RecommendationRecord)
        .where(RecommendationRecord.decision_id == decision_id)
        .order_by(RecommendationRecord.created_at.desc())
        .limit(1)
    )
    recommendation = (
        recommendation_to_schema(recommendation_record)
        if recommendation_record
        else None
    )
    candidate_records = session.scalars(
        select(CandidateStrategyRecord)
        .where(CandidateStrategyRecord.decision_id == decision_id)
        .order_by(CandidateStrategyRecord.id.asc())
    ).all()
    experiments = {item.id: item for item in list_experiments(session, organization_id)}
    strategy_views: list[StrategyView] = []
    for item in candidate_records:
        feasibility = FeasibilityResult.model_validate(item.feasibility)
        consequences = ConsequenceResult.model_validate(item.consequences)
        names = [experiments[item_id].name for item_id in item.sequence]
        is_recommended = bool(
            recommendation and recommendation.recommended_strategy_id == item.id
        )
        strategy_views.append(
            StrategyView(
                id=item.id,
                experiment_ids=item.experiment_ids,
                sequence=item.sequence,
                conditional=item.conditional,
                condition=item.condition,
                title=" then ".join(names),
                subtitle=item.condition or "Independent experiment strategy",
                evaluation_status=(
                    "INFEASIBLE"
                    if not feasibility.feasible
                    else "RECOMMENDED"
                    if is_recommended
                    else "ALTERNATIVE"
                ),
                expected_impact=None,
                confidence_label=None,
                cost_usd=consequences.budget_used_usd,
                engineering_hours=consequences.engineering_used_hours,
                traffic_required=consequences.traffic_used,
                risk="HIGH" if not feasibility.feasible else "LOW",
                key_advantage=(
                    item.condition or "Feasible under current deterministic constraints."
                ),
                tradeoff_note=(
                    feasibility.violations[0] if feasibility.violations else None
                ),
                feasibility=feasibility,
                consequences=consequences,
            )
        )
    solver = session.scalar(
        select(SolverRun)
        .where(SolverRun.decision_id == decision_id)
        .order_by(SolverRun.created_at.desc())
        .limit(1)
    )
    latest_run_record = session.scalar(
        select(DecisionRunRecord)
        .where(DecisionRunRecord.decision_id == decision_id)
        .order_by(DecisionRunRecord.created_at.desc())
        .limit(1)
    )
    if latest_run_record is None:
        raise APIError(404, "DECISION_RUN_NOT_FOUND", "No decision run was found.")
    return DecisionWorkspace(
        decision_id=decision_id,
        goal=goal,
        primary_constraint=primary_constraint,
        strategies=strategy_views,
        evidence=list_evidence(session, organization_id, goal_id=decision.goal_id),
        recommendation=recommendation,
        optimization_result=optimization_to_schema(solver) if solver else None,
        latest_run=decision_run_to_schema(latest_run_record),
        state_version=current.state_version,
    )


def get_latest_recommendation(
    session: Session, *, organization_id: str, decision_id: str
) -> Recommendation:
    decision = session.scalar(
        select(Decision).where(
            Decision.id == decision_id,
            Decision.organization_id == organization_id,
        )
    )
    if decision is None:
        raise APIError(404, "DECISION_NOT_FOUND", "The decision was not found.")
    record = session.scalar(
        select(RecommendationRecord)
        .where(RecommendationRecord.decision_id == decision_id)
        .order_by(RecommendationRecord.created_at.desc(), RecommendationRecord.id.desc())
        .limit(1)
    )
    if record is None:
        raise APIError(
            404, "RECOMMENDATION_NOT_FOUND", "No recommendation was found."
        )
    return recommendation_to_schema(record)
