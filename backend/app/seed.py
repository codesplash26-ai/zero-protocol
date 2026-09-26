from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    Commitment,
    EvidenceItem,
    Experiment,
    ExperimentDependency,
    Goal,
    Organization,
    OrganizationState,
)


def seed_pulseboard(session: Session) -> None:

    existing = session.scalar(
        select(Organization).where(
            Organization.id == "pulseboard"
        )
    )

    if existing:
        return

    now = datetime.now(UTC)

    # ==================================================
    # 1. Create Organization first
    # ==================================================

    organization = Organization(
        id="pulseboard",
        name="PulseBoard",
        created_at=now,
    )

    session.add(organization)
    session.flush()


    # ==================================================
    # 2. Create Organization State
    # ==================================================

    state = OrganizationState(
        organization_id="pulseboard",
        state_version=1,
        budget_usd=4000,
        engineering_capacity_hours=60,
        reserved_engineering_hours=36,
        available_engineering_hours=24,
        eligible_traffic=10000,
        approval_threshold_usd=2000,
        created_at=now,
    )


    # ==================================================
    # 3. Create Commitment
    # ==================================================

    commitment = Commitment(
        id="enterprise_sso",
        organization_id="pulseboard",
        name="Enterprise SSO",
        reserved_engineering_hours=36,
        priority="CRITICAL",
        protected=True,
        notes="Protected from experiment allocation.",
        updated_at=now,
    )


    # ==================================================
    # 4. Create Goal
    # ==================================================

    goal = Goal(
        id="GOAL-001",
        organization_id="pulseboard",
        text=(
            "Choose our next four-week growth strategy "
            "without delaying the enterprise SSO commitment."
        ),
        horizon_weeks=4,
        created_at=now,
    )

    goal.protected_commitments.append(commitment)


    # ==================================================
    # 5. Create Experiments
    # ==================================================

    experiments = [

        Experiment(
            id="A",
            organization_id="pulseboard",
            name="Pricing Willingness Test",
            cost_usd=600,
            engineering_hours=6,
            traffic_required=4000,
            status="PROPOSED",
            outcome="PENDING",
            decision_role=(
                "Tests pricing willingness before "
                "a larger checkout investment."
            ),
            created_at=now,
        ),


        Experiment(
            id="B",
            organization_id="pulseboard",
            name="Annual Plan Checkout",
            cost_usd=2500,
            engineering_hours=24,
            traffic_required=3500,
            status="PROPOSED",
            outcome="PENDING",
            decision_role=(
                "Larger investment dependent on "
                "evidence from Experiment A."
            ),
            created_at=now,
        ),


        Experiment(
            id="C",
            organization_id="pulseboard",
            name="Referral Prototype",
            cost_usd=1800,
            engineering_hours=16,
            traffic_required=3000,
            status="PROPOSED",
            outcome="PENDING",
            decision_role=(
                "Alternative independent growth path."
            ),
            created_at=now,
        ),
    ]


    # ==================================================
    # 6. Create Evidence
    # ==================================================

    evidence = [

        EvidenceItem(
            id="EVIDENCE-001",
            organization_id="pulseboard",
            goal_id="GOAL-001",
            source="enterprise_customer_interviews",
            content=(
                "80% of pipeline prospects requested SSO; "
                "delaying SSO risks $120k ARR pipeline."
            ),
            quality="HIGH",
            relevance=(
                "Enforces the protected 36 hour SSO commitment."
            ),
            conflicts=[],
            created_at=now,
        ),


        EvidenceItem(
            id="EVIDENCE-002",
            organization_id="pulseboard",
            goal_id="GOAL-001",
            experiment_id="A",
            source="pricing_survey_data",
            content=(
                "Current pricing is 25% below market median; "
                "a 15% price elasticity test has high upside."
            ),
            quality="HIGH",
            relevance=(
                "Justifies Pricing Willingness Test "
                "as a prerequisite."
            ),
            conflicts=[],
            created_at=now,
        ),


        EvidenceItem(
            id="EVIDENCE-003",
            organization_id="pulseboard",
            goal_id="GOAL-001",
            source="engineering_velocity_log",
            content=(
                "Experiment capacity is capped at 24 hours "
                "after the SSO commitment is reserved."
            ),
            quality="HIGH",
            relevance=(
                "Constrains feasible experiment portfolio."
            ),
            conflicts=[],
            created_at=now,
        ),
    ]


    # ==================================================
    # 7. Insert remaining records
    # ==================================================

    session.add_all(
        [
            state,
            commitment,
            goal,
            *experiments,
        ]
    )

    session.flush()


    # ==================================================
    # 8. Experiment Dependency
    # ==================================================

    dependency = ExperimentDependency(
        experiment_id="B",
        dependency_id="A",
    )

    session.add(dependency)


    # ==================================================
    # 9. Evidence
    # ==================================================

    session.add_all(evidence)


    # ==================================================
    # 10. Commit
    # ==================================================

    session.commit()



def main() -> None:

    with SessionLocal() as session:
        seed_pulseboard(session)



if __name__ == "__main__":
    main()