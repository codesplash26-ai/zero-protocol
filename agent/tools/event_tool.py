from schemas.models import (
    Event,
    MaterialityResult,
    OrganizationState,
)


def apply_event(
    event: Event,
    state: OrganizationState,
) -> OrganizationState:

    data = state.model_dump()

    if event.engineering_delta_hours != 0:

        data[
            "available_engineering_hours"
        ] += event.engineering_delta_hours

    return OrganizationState(**data)


def check_materiality(
    event: Event,
) -> MaterialityResult:

    affected_fields = []
    reasons = []

    if event.engineering_delta_hours != 0:

        affected_fields.append(
            "available_engineering_hours"
        )

        reasons.append(
            "Available engineering "
            "capacity changed."
        )

    material = (
        len(affected_fields) > 0
    )

    return MaterialityResult(
        event_id=event.id,
        potentially_material=material,
        affected_fields=affected_fields,
        reasons=reasons,
    )
