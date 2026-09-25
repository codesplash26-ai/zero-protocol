from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.errors import APIError
from app.models import (
    ActionReceiptRecord,
    ApprovalRecord,
    CandidateStrategyRecord,
    Decision,
    RecommendationRecord,
)
from app.models import (
    Experiment as ExperimentRecord,
)
from app.models import (
    OrganizationState as OrganizationStateRecord,
)
from app.repositories import get_current_state
from app.schemas import (
    ActionExecuteRequest,
    ActionReceipt,
    ActionReceiptStatus,
    ActionType,
    Approval,
    ApprovalCheckRequest,
    ApprovalCreateRequest,
    ApprovalDecision,
    ApprovalDecisionRequest,
    ApprovalPolicyResult,
    EventType,
    ExperimentOutcome,
    ExperimentStatus,
)
from app.services.audit import append_audit
from app.services.events import record_system_event
from app.services.identifiers import new_id
from app.services.state import (
    invalidate_approvals_for_version,
    lock_current_state,
    require_state_version,
)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def approval_to_schema(record: ApprovalRecord) -> Approval:
    return Approval(
        id=record.id,
        decision_id=record.decision_id,
        strategy_id=record.strategy_id,
        experiment_id=record.experiment_id,
        action_type=record.action_type,
        decision=record.decision,
        reason=record.reason,
        threshold_usd=record.threshold_usd,
        authorized_cost_usd=record.authorized_cost_usd,
        authorized_engineering_hours=record.authorized_engineering_hours,
        authorized_traffic=record.authorized_traffic,
        state_version=record.state_version,
        requested_by=record.requested_by,
        decided_by=record.decided_by,
        requested_at=_as_utc(record.requested_at),
        decided_at=_as_utc(record.decided_at),
        expires_at=_as_utc(record.expires_at),
    )


def receipt_to_schema(record: ActionReceiptRecord) -> ActionReceipt:
    return ActionReceipt(
        id=record.id,
        decision_id=record.decision_id,
        strategy_id=record.strategy_id,
        experiment_id=record.experiment_id,
        previous_status=record.previous_status,
        new_status=record.new_status,
        budget_reserved_usd=record.budget_reserved_usd,
        engineering_reserved_hours=record.engineering_reserved_hours,
        status=record.status,
        state_version=record.state_version,
        executed_at=_as_utc(record.executed_at),
        idempotency_key=record.idempotency_key,
    )


def _load_scope(
    session: Session,
    *,
    organization_id: str,
    decision_id: str,
    strategy_id: str,
    experiment_id: str,
) -> tuple[Decision, CandidateStrategyRecord, ExperimentRecord]:
    decision = session.get(Decision, decision_id)
    if decision is None or decision.organization_id != organization_id:
        raise APIError(404, "DECISION_NOT_FOUND", "The decision was not found.")
    strategy = session.get(CandidateStrategyRecord, strategy_id)
    if strategy is None or strategy.decision_id != decision_id:
        raise APIError(404, "STRATEGY_NOT_FOUND", "The strategy was not found.")
    if experiment_id not in strategy.experiment_ids:
        raise APIError(
            409,
            "APPROVAL_SCOPE_MISMATCH",
            "The experiment is not part of the supplied strategy.",
        )
    experiment = session.scalar(
        select(ExperimentRecord)
        .options(selectinload(ExperimentRecord.dependency_links))
        .where(
            ExperimentRecord.id == experiment_id,
            ExperimentRecord.organization_id == organization_id,
        )
    )
    if experiment is None:
        raise APIError(404, "EXPERIMENT_NOT_FOUND", "The experiment was not found.")
    return decision, strategy, experiment


def _load_strategy_scope(
    session: Session,
    *,
    organization_id: str,
    decision_id: str,
    strategy_id: str,
    experiment_ids: list[str],
) -> tuple[Decision, CandidateStrategyRecord, list[ExperimentRecord]]:
    decision = session.get(Decision, decision_id)
    if decision is None or decision.organization_id != organization_id:
        raise APIError(404, "DECISION_NOT_FOUND", "The decision was not found.")
    strategy = session.get(CandidateStrategyRecord, strategy_id)
    if strategy is None or strategy.decision_id != decision_id:
        raise APIError(404, "STRATEGY_NOT_FOUND", "The strategy was not found.")

    records = session.scalars(
        select(ExperimentRecord).where(
            ExperimentRecord.organization_id == organization_id,
            ExperimentRecord.id.in_(experiment_ids),
        )
    ).all()
    supplied_ids = set(experiment_ids)
    experiment_map = {record.id: record for record in records}
    missing = sorted(supplied_ids - experiment_map.keys())
    if missing:
        raise APIError(
            404,
            "EXPERIMENT_NOT_FOUND",
            "One or more requested experiments were not found.",
            {"experiment_ids": missing},
        )

    if not supplied_ids.issubset(set(strategy.experiment_ids)):
        raise APIError(
            409,
            "APPROVAL_SCOPE_MISMATCH",
            "One or more experiments are not part of the supplied strategy.",
        )

    return decision, strategy, [experiment_map[item] for item in experiment_ids]


def check_approval_policy(
    session: Session,
    *,
    organization_id: str,
    request: ApprovalCheckRequest,
    lock_state: bool = False,
) -> ApprovalPolicyResult:
    state = lock_current_state(session, organization_id) if lock_state else None
    if state is None:
        state_schema = get_current_state(session, organization_id)
        state_version = state_schema.state_version
        threshold = state_schema.approval_threshold_usd
    else:
        state_version = state.state_version
        threshold = state.approval_threshold_usd
    if state_version != request.expected_state_version:
        raise APIError(
            409,
            "STATE_VERSION_CONFLICT",
            "The organization state changed.",
            {"expected": request.expected_state_version, "actual": state_version},
        )
    _, _, experiments = _load_strategy_scope(
        session,
        organization_id=organization_id,
        decision_id=request.decision_id,
        strategy_id=request.strategy_id,
        experiment_ids=request.experiment_ids,
    )
    evaluated_cost_usd = sum(experiment.cost_usd for experiment in experiments)
    required = evaluated_cost_usd > threshold
    reason = (
        "Strategy cost exceeds the configured approval threshold."
        if required
        else "Strategy cost is within the configured approval threshold."
    )
    return ApprovalPolicyResult(
        approval_required=required,
        reason=reason,
        threshold_usd=threshold,
        evaluated_cost_usd=evaluated_cost_usd,
        state_version=state_version,
    )


def create_approval(
    session: Session,
    *,
    organization_id: str,
    request: ApprovalCreateRequest,
    requested_by: str = "governor",
) -> Approval:
    policy = check_approval_policy(
        session,
        organization_id=organization_id,
        request=ApprovalCheckRequest.model_validate(request.model_dump()),
        lock_state=True,
    )
    decision, _, experiments = _load_strategy_scope(
        session,
        organization_id=organization_id,
        decision_id=request.decision_id,
        strategy_id=request.strategy_id,
        experiment_ids=request.experiment_ids,
    )
    if len(experiments) != 1:
        raise APIError(
            400,
            "INVALID_APPROVAL_REQUEST",
            "Approval creation requires exactly one executable experiment.",
        )
    experiment = experiments[0]
    action_type = ActionType.START_EXPERIMENT
    approval_decision = (
        ApprovalDecision.PENDING
        if policy.approval_required
        else ApprovalDecision.NOT_REQUIRED
    )
    existing = session.scalar(
        select(ApprovalRecord).where(
            ApprovalRecord.decision_id == request.decision_id,
            ApprovalRecord.strategy_id == request.strategy_id,
            ApprovalRecord.experiment_id == experiment.id,
            ApprovalRecord.action_type == action_type.value,
            ApprovalRecord.state_version == policy.state_version,
        )
    )
    if existing is not None:
        return approval_to_schema(existing)
    record = ApprovalRecord(
        id=new_id("APR"),
        decision_id=request.decision_id,
        strategy_id=request.strategy_id,
        experiment_id=experiment.id,
        action_type=action_type.value,
        decision=approval_decision.value,
        reason=policy.reason,
        threshold_usd=policy.threshold_usd,
        authorized_cost_usd=experiment.cost_usd,
        authorized_engineering_hours=experiment.engineering_hours,
        authorized_traffic=experiment.traffic_required,
        state_version=policy.state_version,
        requested_by=requested_by,
        decided_by=None,
        decided_at=None,
        expires_at=None,
    )
    session.add(record)
    session.flush()
    append_audit(
        session,
        organization_id=organization_id,
        decision_id=request.decision_id,
        goal_id=decision.goal_id if decision else None,
        state_version=policy.state_version,
        approval_id=record.id,
        title="Approval evaluated",
        summary=f"Approval {record.id} is {record.decision} for experiment {record.experiment_id}.",
    )
    return approval_to_schema(record)


def ensure_approval_for_recommendation(
    session: Session,
    *,
    organization_id: str,
    recommendation: RecommendationRecord,
    requested_by: str = "governor",
) -> Approval | None:
    if recommendation.current_executable_experiment_id is None:
        return None
    return create_approval(
        session,
        organization_id=organization_id,
        request=ApprovalCreateRequest(
            decision_id=recommendation.decision_id,
            strategy_id=recommendation.recommended_strategy_id,
            experiment_ids=[recommendation.current_executable_experiment_id],
            expected_state_version=recommendation.state_version,
        ),
        requested_by=requested_by,
    )


def list_approvals(
    session: Session,
    *,
    organization_id: str,
    decision: ApprovalDecision | None = None,
    decision_id: str | None = None,
    strategy_id: str | None = None,
    experiment_id: str | None = None,
    state_version: int | None = None,
) -> list[Approval]:
    query = (
        select(ApprovalRecord)
        .join(Decision, Decision.id == ApprovalRecord.decision_id)
        .where(Decision.organization_id == organization_id)
    )
    if decision is not None:
        query = query.where(ApprovalRecord.decision == decision.value)
    if decision_id is not None:
        query = query.where(ApprovalRecord.decision_id == decision_id)
    if strategy_id is not None:
        query = query.where(ApprovalRecord.strategy_id == strategy_id)
    if experiment_id is not None:
        query = query.where(ApprovalRecord.experiment_id == experiment_id)
    if state_version is not None:
        query = query.where(ApprovalRecord.state_version == state_version)
    records = session.scalars(
        query.order_by(ApprovalRecord.requested_at.desc(), ApprovalRecord.id.desc())
    ).all()
    return [approval_to_schema(record) for record in records]


def get_approval(session: Session, *, organization_id: str, approval_id: str) -> Approval:
    record = session.scalar(
        select(ApprovalRecord)
        .join(Decision, Decision.id == ApprovalRecord.decision_id)
        .where(
            ApprovalRecord.id == approval_id,
            Decision.organization_id == organization_id,
        )
    )
    if record is None:
        raise APIError(404, "APPROVAL_NOT_FOUND", "The approval was not found.")
    return approval_to_schema(record)


def list_action_receipts(
    session: Session,
    *,
    organization_id: str,
    decision_id: str | None = None,
    approval_id: str | None = None,
    experiment_id: str | None = None,
    status: ActionReceiptStatus | None = None,
) -> list[ActionReceipt]:
    query = (
        select(ActionReceiptRecord)
        .join(Decision, Decision.id == ActionReceiptRecord.decision_id)
        .where(Decision.organization_id == organization_id)
    )
    if decision_id is not None:
        query = query.where(ActionReceiptRecord.decision_id == decision_id)
    if approval_id is not None:
        query = query.where(ActionReceiptRecord.approval_id == approval_id)
    if experiment_id is not None:
        query = query.where(ActionReceiptRecord.experiment_id == experiment_id)
    if status is not None:
        query = query.where(ActionReceiptRecord.status == status.value)
    records = session.scalars(
        query.order_by(ActionReceiptRecord.executed_at.desc(), ActionReceiptRecord.id.desc())
    ).all()
    return [receipt_to_schema(record) for record in records]


def get_action_receipt(session: Session, *, organization_id: str, receipt_id: str) -> ActionReceipt:
    record = session.scalar(
        select(ActionReceiptRecord)
        .join(Decision, Decision.id == ActionReceiptRecord.decision_id)
        .where(
            ActionReceiptRecord.id == receipt_id,
            Decision.organization_id == organization_id,
        )
    )
    if record is None:
        raise APIError(404, "ACTION_RECEIPT_NOT_FOUND", "The receipt was not found.")
    return receipt_to_schema(record)


def decide_approval(
    session: Session,
    *,
    organization_id: str,
    approval_id: str,
    request: ApprovalDecisionRequest,
) -> Approval:
    current = lock_current_state(session, organization_id)
    require_state_version(current, request.expected_state_version)
    record = session.scalar(
        select(ApprovalRecord)
        .join(Decision, Decision.id == ApprovalRecord.decision_id)
        .where(
            ApprovalRecord.id == approval_id,
            Decision.organization_id == organization_id,
        )
        .with_for_update()
    )
    if record is None:
        raise APIError(404, "APPROVAL_NOT_FOUND", "The approval was not found.")
    if record.state_version != current.state_version:
        raise APIError(409, "APPROVAL_INVALIDATED", "The approval is stale.")
    if record.decision == ApprovalDecision.INVALIDATED.value:
        raise APIError(409, "APPROVAL_INVALIDATED", "The approval is invalidated.")
    if record.decision != ApprovalDecision.PENDING.value:
        raise APIError(
            409,
            "APPROVAL_ALREADY_DECIDED",
            "Only a pending approval can be decided.",
        )
    record.decision = request.decision.value
    record.reason = request.reason
    record.decided_by = request.actor_id
    record.decided_at = datetime.now(UTC)
    decision = session.get(Decision, record.decision_id)
    append_audit(
        session,
        organization_id=organization_id,
        decision_id=record.decision_id,
        goal_id=decision.goal_id if decision else None,
        state_version=current.state_version,
        approval_id=record.id,
        title=f"Approval {request.decision.value.lower()}",
        summary=f"{request.actor_id} recorded {request.decision.value} for {record.id}.",
    )
    session.flush()
    return approval_to_schema(record)


def execute_action(
    session: Session,
    *,
    organization_id: str,
    request: ActionExecuteRequest,
    idempotency_key: str,
) -> ActionReceipt:
    current = lock_current_state(session, organization_id)
    require_state_version(current, request.expected_state_version)
    approval = session.scalar(
        select(ApprovalRecord)
        .join(Decision, Decision.id == ApprovalRecord.decision_id)
        .where(
            ApprovalRecord.id == request.approval_id,
            Decision.organization_id == organization_id,
        )
        .with_for_update()
    )
    if approval is None:
        raise APIError(404, "APPROVAL_NOT_FOUND", "The approval was not found.")
    scope = (
        approval.decision_id,
        approval.strategy_id,
        approval.experiment_id,
    )
    requested_scope = (
        request.decision_id,
        request.strategy_id,
        request.experiment_id,
    )
    if scope != requested_scope:
        raise APIError(
            409,
            "APPROVAL_SCOPE_MISMATCH",
            "The approval does not authorize this action.",
        )
    if approval.action_type != ActionType.START_EXPERIMENT.value:
        raise APIError(
            409,
            "APPROVAL_SCOPE_MISMATCH",
            "The approval does not authorize this action.",
        )
    if approval.state_version != current.state_version:
        raise APIError(409, "APPROVAL_INVALIDATED", "The approval is stale.")
    if approval.decision not in {
        ApprovalDecision.APPROVED.value,
        ApprovalDecision.NOT_REQUIRED.value,
    }:
        raise APIError(409, "APPROVAL_REQUIRED", "The action is not authorized.")
    now = datetime.now(UTC)
    if approval.expires_at is not None:
        expires_at = approval.expires_at
        comparable_now = now if expires_at.tzinfo else now.replace(tzinfo=None)
        if expires_at <= comparable_now:
            raise APIError(409, "APPROVAL_INVALIDATED", "The approval expired.")
    if session.scalar(
        select(ActionReceiptRecord).where(ActionReceiptRecord.approval_id == approval.id)
    ):
        raise APIError(409, "ACTION_ALREADY_EXECUTED", "The approval was already used.")

    _, strategy, experiment = _load_scope(
        session,
        organization_id=organization_id,
        decision_id=request.decision_id,
        strategy_id=request.strategy_id,
        experiment_id=request.experiment_id,
    )
    if experiment.status not in {
        ExperimentStatus.PROPOSED.value,
        ExperimentStatus.APPROVED.value,
    }:
        raise APIError(
            409,
            "INVALID_EXPERIMENT_TRANSITION",
            "The experiment cannot transition to RUNNING from its current status.",
        )
    if (
        approval.authorized_cost_usd != experiment.cost_usd
        or approval.authorized_engineering_hours != experiment.engineering_hours
        or approval.authorized_traffic != experiment.traffic_required
    ):
        raise APIError(
            409,
            "APPROVAL_SCOPE_MISMATCH",
            "The experiment resources differ from the authorized values.",
        )
    experiment_map = {
        item.id: item
        for item in session.scalars(
            select(ExperimentRecord).where(ExperimentRecord.organization_id == organization_id)
        ).all()
    }
    unsatisfied = [
        link.dependency_id
        for link in experiment.dependency_links
        if link.dependency_id not in experiment_map
        or experiment_map[link.dependency_id].status != ExperimentStatus.COMPLETED.value
        or experiment_map[link.dependency_id].outcome != ExperimentOutcome.SUCCESS.value
    ]
    if unsatisfied:
        raise APIError(
            409,
            "DEPENDENCY_NOT_SATISFIED",
            "Experiment dependencies have not completed successfully.",
            {"dependency_ids": sorted(unsatisfied)},
        )
    if experiment.cost_usd > current.budget_usd:
        raise APIError(409, "INSUFFICIENT_RESOURCES", "Budget is insufficient.")
    if experiment.engineering_hours > current.available_engineering_hours:
        raise APIError(409, "INSUFFICIENT_RESOURCES", "Engineering capacity is insufficient.")
    if experiment.traffic_required > current.eligible_traffic:
        raise APIError(409, "INSUFFICIENT_RESOURCES", "Traffic is insufficient.")

    next_state = OrganizationStateRecord(
        organization_id=organization_id,
        state_version=current.state_version + 1,
        budget_usd=current.budget_usd - experiment.cost_usd,
        engineering_capacity_hours=current.engineering_capacity_hours,
        reserved_engineering_hours=(
            current.reserved_engineering_hours + experiment.engineering_hours
        ),
        available_engineering_hours=(
            current.available_engineering_hours - experiment.engineering_hours
        ),
        eligible_traffic=current.eligible_traffic - experiment.traffic_required,
        approval_threshold_usd=current.approval_threshold_usd,
    )
    previous_status = experiment.status
    experiment.status = ExperimentStatus.RUNNING.value
    experiment.outcome = ExperimentOutcome.PENDING.value
    receipt = ActionReceiptRecord(
        id=new_id("ACT"),
        approval_id=approval.id,
        decision_id=request.decision_id,
        strategy_id=strategy.id,
        experiment_id=experiment.id,
        previous_status=previous_status,
        new_status=ExperimentStatus.RUNNING.value,
        budget_reserved_usd=experiment.cost_usd,
        engineering_reserved_hours=experiment.engineering_hours,
        status=ActionReceiptStatus.SUCCESS.value,
        state_version=next_state.state_version,
        executed_at=now,
        idempotency_key=idempotency_key,
    )
    session.add_all([next_state, receipt])
    lifecycle_event = record_system_event(
        session,
        organization_id=organization_id,
        event_type=EventType.EXPERIMENT_RESULT,
        description=f"Experiment {experiment.id} started through an authorized action.",
        source="controlled_action",
        state_version=next_state.state_version,
        experiment_id=experiment.id,
        experiment_outcome=ExperimentOutcome.PENDING,
        changes={
            "experiment_status": {
                "before": previous_status,
                "after": ExperimentStatus.RUNNING.value,
            }
        },
        occurred_at=now,
    )
    invalidate_approvals_for_version(
        session,
        organization_id=organization_id,
        state_version=current.state_version,
        exclude_approval_id=approval.id,
    )
    decision = session.get(Decision, request.decision_id)
    append_audit(
        session,
        organization_id=organization_id,
        decision_id=request.decision_id,
        goal_id=decision.goal_id if decision else None,
        state_version=next_state.state_version,
        approval_id=approval.id,
        action_receipt_id=receipt.id,
        event_ids=[lifecycle_event.id],
        title="Experiment started",
        summary=f"Started experiment {experiment.id} through controlled action.",
    )
    session.flush()
    return receipt_to_schema(receipt)
