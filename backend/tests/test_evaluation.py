from sqlalchemy import select

from app.models import Experiment


def strategy(
    strategy_id: str,
    experiment_ids: list[str],
    *,
    conditional: bool = False,
    condition: str | None = None,
):
    return {
        "strategy": {
            "id": strategy_id,
            "experiment_ids": experiment_ids,
            "sequence": experiment_ids,
            "conditional": conditional,
            "condition": condition,
        }
    }


def test_a_is_feasible_at_state_version_one(client):
    response = client.post(
        "/api/v1/feasibility/check", json=strategy("STRATEGY-A", ["A"])
    )

    assert response.status_code == 200
    assert response.json() == {
        "strategy_id": "STRATEGY-A",
        "feasible": True,
        "violations": [],
        "evaluated_state_version": 1,
    }


def test_a_then_b_is_infeasible_initially_due_to_engineering(client):
    response = client.post(
        "/api/v1/feasibility/check",
        json=strategy(
            "STRATEGY-A-B",
            ["A", "B"],
            conditional=True,
            condition="Run B only after A completes with SUCCESS.",
        ),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["feasible"] is False
    assert any("Engineering capacity exceeded" in item for item in body["violations"])
    assert not any("requires A" in item for item in body["violations"])


def test_b_alone_is_blocked_until_a_succeeds(client):
    response = client.post(
        "/api/v1/feasibility/check", json=strategy("STRATEGY-B", ["B"])
    )

    assert response.status_code == 200
    assert response.json()["feasible"] is False
    assert response.json()["violations"] == [
        "B requires A to complete with SUCCESS"
    ]


def test_successful_a_unlocks_b(client, session_factory):
    with session_factory() as session:
        experiment_a = session.scalar(select(Experiment).where(Experiment.id == "A"))
        experiment_a.status = "COMPLETED"
        experiment_a.outcome = "SUCCESS"
        session.commit()

    response = client.post(
        "/api/v1/feasibility/check", json=strategy("STRATEGY-B", ["B"])
    )

    assert response.status_code == 200
    assert response.json()["feasible"] is True


def test_failed_a_does_not_unlock_b(client, session_factory):
    with session_factory() as session:
        experiment_a = session.scalar(select(Experiment).where(Experiment.id == "A"))
        experiment_a.status = "COMPLETED"
        experiment_a.outcome = "FAILURE"
        session.commit()

    response = client.post(
        "/api/v1/feasibility/check", json=strategy("STRATEGY-B", ["B"])
    )

    assert response.status_code == 200
    assert response.json()["feasible"] is False


def test_c_is_feasible(client):
    response = client.post(
        "/api/v1/feasibility/check", json=strategy("STRATEGY-C", ["C"])
    )

    assert response.status_code == 200
    assert response.json()["feasible"] is True


def test_unknown_experiment_returns_contract_error(client):
    response = client.post(
        "/api/v1/feasibility/check",
        json=strategy("STRATEGY-UNKNOWN", ["UNKNOWN"]),
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "EXPERIMENT_NOT_FOUND"
    assert response.json()["error"]["details"] == {"experiment_ids": ["UNKNOWN"]}


def test_a_consequences_match_pulseboard_baseline(client):
    response = client.post(
        "/api/v1/consequences/calculate",
        json={"strategy_id": "STRATEGY-A", "experiment_ids": ["A"]},
    )

    assert response.status_code == 200
    assert response.json() == {
        "strategy_id": "STRATEGY-A",
        "budget_used_usd": 600,
        "remaining_budget_usd": 3400,
        "engineering_used_hours": 6,
        "remaining_engineering_hours": 18,
        "traffic_used": 4000,
        "remaining_traffic": 6000,
        "delay_days": 0,
        "affected_commitments": [],
        "evaluated_state_version": 1,
    }


def test_infeasible_consequences_identify_protected_commitment(client):
    response = client.post(
        "/api/v1/consequences/calculate",
        json={"strategy_id": "STRATEGY-A-B", "experiment_ids": ["A", "B"]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["engineering_used_hours"] == 30
    assert body["remaining_engineering_hours"] == -6
    assert body["affected_commitments"] == ["enterprise_sso"]


def test_unknown_write_field_is_rejected_in_standard_envelope(client):
    payload = strategy("STRATEGY-A", ["A"])
    payload["unexpected"] = True
    response = client.post("/api/v1/feasibility/check", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_invalid_nonconditional_strategy_is_rejected(client):
    response = client.post(
        "/api/v1/feasibility/check",
        json=strategy(
            "STRATEGY-A", ["A"], conditional=False, condition="Unexpected condition"
        ),
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_STRATEGY"
