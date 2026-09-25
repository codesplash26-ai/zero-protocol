from __future__ import annotations

import re

from schemas.models import (
    CandidateStrategy,
)


STRATEGY_ID_PREFIX = "STRATEGY-"


def is_valid_strategy_id(
    strategy_id: str,
) -> bool:
    return strategy_id.startswith(
        STRATEGY_ID_PREFIX
    ) and len(strategy_id) > len(
        STRATEGY_ID_PREFIX
    )


def normalize_candidate_strategies(
    strategies: list[CandidateStrategy | dict],
) -> list[CandidateStrategy]:
    used_ids: set[str] = set()
    normalized = []

    for index, strategy_data in enumerate(
        strategies,
        start=1,
    ):
        strategy = (
            strategy_data
            if isinstance(
                strategy_data,
                CandidateStrategy,
            )
            else CandidateStrategy(
                **strategy_data
            )
        )

        strategy_id = _normalized_id(
            strategy,
            index,
        )

        strategy_id = _deduplicate(
            strategy_id,
            used_ids,
        )

        used_ids.add(strategy_id)

        sequence = (
            strategy.sequence
            if strategy.sequence
            else list(strategy.experiment_ids)
        )

        condition = (
            strategy.condition
            if strategy.conditional
            else None
        )

        normalized.append(
            strategy.model_copy(
                update={
                    "id": strategy_id,
                    "sequence": sequence,
                    "condition": condition,
                }
            )
        )

    return normalized


def _normalized_id(
    strategy: CandidateStrategy,
    index: int,
) -> str:
    if is_valid_strategy_id(
        strategy.id
    ):
        return strategy.id

    suffix = "-".join(
        _tokenize_identifier(
            experiment_id
        )
        for experiment_id
        in strategy.experiment_ids
    )

    if not suffix:
        suffix = f"{index:03d}"

    return f"{STRATEGY_ID_PREFIX}{suffix}"


def _deduplicate(
    strategy_id: str,
    used_ids: set[str],
) -> str:
    if strategy_id not in used_ids:
        return strategy_id

    suffix = 2
    candidate = f"{strategy_id}-{suffix}"

    while candidate in used_ids:
        suffix += 1
        candidate = f"{strategy_id}-{suffix}"

    return candidate


def _tokenize_identifier(
    value: str,
) -> str:
    token = re.sub(
        r"[^A-Za-z0-9]+",
        "-",
        value,
    ).strip("-")

    return (
        token.upper()
        if token
        else "ITEM"
    )
