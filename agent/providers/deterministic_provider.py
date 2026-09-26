"""Rule-based last-resort provider used when no LLM provider is available.

It implements the same generate_structured(system_prompt, user_prompt, schema)
contract as the Groq and Gemini providers. It never calls a model: every value
it returns is read from the labelled JSON facts that the graph nodes already
place in their prompts (experiments, feasible strategies, consequences, CP-SAT
result, state version). It does not invent experiments, resources, evidence,
outcomes or numbers; when the facts it needs are absent it raises instead.
"""

from __future__ import annotations

import json
import re
from typing import Any

from pydantic import ValidationError

from providers.base import T
from schemas.models import (
    CandidateStrategySet,
    DecisionObjective,
    EvidencePlan,
    Recommendation,
    StrategicEvaluationSet,
)

PROVIDER_NAME = "deterministic"
FALLBACK_LABEL = "[Deterministic fallback]"

INACTIVE_STATUSES = {"COMPLETED", "REJECTED", "RUNNING"}

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
}


class DeterministicFallbackError(RuntimeError):
    pass


def extract_json_section(prompt: str, label: str) -> Any:
    """Return the JSON value printed after a "Label:" heading in a node prompt."""
    match = re.search(rf"^{re.escape(label)}:\s*$", prompt, flags=re.MULTILINE)
    if match is None:
        raise DeterministicFallbackError(f"Prompt has no '{label}' section.")
    remainder = prompt[match.end():].lstrip()
    try:
        value, _ = json.JSONDecoder().raw_decode(remainder)
    except json.JSONDecodeError as error:
        raise DeterministicFallbackError(
            f"Prompt section '{label}' is not valid JSON."
        ) from error
    return value


def extract_text_section(prompt: str, label: str, until: str) -> str:
    match = re.search(
        rf"^{re.escape(label)}:\s*\n(.*?)\n\s*{re.escape(until)}",
        prompt,
        flags=re.MULTILINE | re.DOTALL,
    )
    if match is None or not match.group(1).strip():
        raise DeterministicFallbackError(f"Prompt has no '{label}' text.")
    return match.group(1).strip()


def extract_assignment(prompt: str, name: str) -> str:
    match = re.search(rf"^{re.escape(name)}\s*=\s*(\S+)\s*$", prompt, re.MULTILINE)
    if match is None:
        raise DeterministicFallbackError(f"Prompt does not state '{name}'.")
    return match.group(1)


def _experiment_label(experiment: dict) -> str:
    return f"{experiment['id']} ({experiment['name']})"


def _dependency_satisfied(experiment: dict | None) -> bool:
    return (
        experiment is not None
        and experiment.get("status") == "COMPLETED"
        and experiment.get("outcome") == "SUCCESS"
    )


def _dependents_of(experiment_id: str, experiments: list[dict]) -> list[dict]:
    return [
        item
        for item in experiments
        if experiment_id in item.get("dependencies", [])
        and item.get("status") != "COMPLETED"
    ]


class DeterministicProvider:
    """Answers each structured-output schema used by the Governor graph."""

    name = PROVIDER_NAME

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[T],
    ) -> T:
        builders = {
            DecisionObjective: self._decision_objective,
            EvidencePlan: self._evidence_plan,
            CandidateStrategySet: self._candidate_strategies,
            StrategicEvaluationSet: self._strategic_evaluation,
            Recommendation: self._recommendation,
        }
        builder = builders.get(schema)
        if builder is None:
            raise DeterministicFallbackError(
                f"No deterministic rule for schema {schema.__name__}."
            )
        payload = builder(user_prompt)
        try:
            return schema.model_validate(payload)
        except ValidationError as error:
            raise DeterministicFallbackError(
                f"Deterministic {schema.__name__} failed validation: {error}"
            ) from error

    # interpret_goal ---------------------------------------------------

    def _decision_objective(self, prompt: str) -> dict:
        goal_text = extract_text_section(prompt, "Founder goal", "Extract:")
        horizon = self._horizon_weeks(goal_text)
        protected = re.findall(
            r"without (?:delaying|affecting|impacting|disrupting) (?:the )?([^.,;]+)",
            goal_text,
            flags=re.IGNORECASE,
        )
        return {
            "objective": goal_text,
            "horizon_weeks": horizon,
            "protected_commitments": [item.strip() for item in protected],
            "decision_type": "experiment_strategy_selection",
        }

    @staticmethod
    def _horizon_weeks(goal_text: str) -> int:
        words = "|".join(NUMBER_WORDS)
        match = re.search(
            rf"\b(\d+|{words})[\s-]+weeks?\b", goal_text, flags=re.IGNORECASE
        )
        if match is None:
            raise DeterministicFallbackError(
                "The goal text does not state a horizon in weeks."
            )
        token = match.group(1).lower()
        return int(token) if token.isdigit() else NUMBER_WORDS[token]

    # plan_evidence ----------------------------------------------------

    def _evidence_plan(self, prompt: str) -> dict:
        organization = extract_json_section(prompt, "Current organization state")
        experiments = extract_json_section(prompt, "Available experiments")
        required = [
            "Current organization resources at state version "
            f"{organization['state_version']}: budget, available engineering "
            "hours and eligible traffic."
        ]
        missing_questions = []
        by_id = {item["id"]: item for item in experiments}
        for experiment in experiments:
            if experiment["status"] in {"COMPLETED", "REJECTED"}:
                continue
            required.append(
                "Cost, engineering hours and traffic for "
                f"{_experiment_label(experiment)}."
            )
            for dependency_id in experiment.get("dependencies", []):
                if not _dependency_satisfied(by_id.get(dependency_id)):
                    required.append(
                        f"Outcome of prerequisite {dependency_id} before "
                        f"committing to {experiment['id']}."
                    )
            missing = [
                field
                for field in ("cost_usd", "engineering_hours", "traffic_required")
                if experiment.get(field) is None
            ]
            if missing:
                missing_questions.append(
                    f"What are the {', '.join(missing)} for "
                    f"{_experiment_label(experiment)}?"
                )
        return {
            "required_evidence": required,
            "sufficient_from_current_state": not missing_questions,
            "clarification_questions": missing_questions,
        }

    # generate_strategies ----------------------------------------------

    def _candidate_strategies(self, prompt: str) -> dict:
        experiments = extract_json_section(prompt, "Experiments")
        by_id = {item["id"]: item for item in experiments}
        actionable = [
            item for item in experiments if item["status"] not in INACTIVE_STATUSES
        ]
        actionable_ids = {item["id"] for item in actionable}
        strategies: list[dict] = []

        for experiment in actionable:
            strategies.append(
                {
                    "id": f"STRATEGY-{experiment['id']}",
                    "experiment_ids": [experiment["id"]],
                    "sequence": [experiment["id"]],
                    "conditional": False,
                    "condition": None,
                }
            )

        for experiment in actionable:
            for dependency_id in experiment.get("dependencies", []):
                if dependency_id not in actionable_ids:
                    continue
                strategies.append(
                    {
                        "id": f"STRATEGY-{dependency_id}-{experiment['id']}",
                        "experiment_ids": [dependency_id, experiment["id"]],
                        "sequence": [dependency_id, experiment["id"]],
                        "conditional": True,
                        "condition": (
                            f"Run {experiment['id']} only if {dependency_id} "
                            "completes with outcome SUCCESS."
                        ),
                    }
                )

        # Independent pairs: neither depends on the other.
        for index, first in enumerate(actionable):
            for second in actionable[index + 1:]:
                related = (
                    first["id"] in second.get("dependencies", [])
                    or second["id"] in first.get("dependencies", [])
                )
                blocked = any(
                    not _dependency_satisfied(by_id.get(dependency_id))
                    for item in (first, second)
                    for dependency_id in item.get("dependencies", [])
                )
                if related or blocked:
                    continue
                strategies.append(
                    {
                        "id": f"STRATEGY-{first['id']}-{second['id']}",
                        "experiment_ids": [first["id"], second["id"]],
                        "sequence": [first["id"], second["id"]],
                        "conditional": False,
                        "condition": None,
                    }
                )

        if not strategies:
            raise DeterministicFallbackError(
                "No actionable experiments are available for a strategy."
            )
        return {"strategies": strategies}

    # strategic_evaluation ---------------------------------------------

    def _strategic_evaluation(self, prompt: str) -> dict:
        experiments = extract_json_section(prompt, "Experiments")
        newly_unlocked = set(
            extract_json_section(prompt, "Newly unlocked experiment IDs")
        )
        strategies = extract_json_section(prompt, "Feasible strategies")
        consequences = {
            item["strategy_id"]: item
            for item in extract_json_section(prompt, "Consequences")
        }
        by_id = {item["id"]: item for item in experiments}

        assessments = []
        for strategy in strategies:
            members = [by_id[item] for item in strategy["experiment_ids"]]
            consequence = consequences.get(strategy["id"])
            assessments.append(
                {
                    "strategy_id": strategy["id"],
                    "business_value": "; ".join(
                        f"{_experiment_label(item)}: "
                        f"{item.get('decision_role') or 'no decision role recorded'}"
                        for item in members
                    ),
                    "information_value": self._information_value(
                        members, experiments, newly_unlocked
                    ),
                    "strategic_alignment": self._alignment(consequence),
                    "opportunity_cost": self._opportunity_cost(consequence),
                    "risk": (
                        "Not assessed: no risk data was supplied to the "
                        "deterministic fallback."
                    ),
                    "rationale": (
                        f"{FALLBACK_LABEL} Assessment assembled from supplied "
                        "experiment data, feasibility and consequences only."
                    ),
                }
            )
        return {"assessments": assessments}

    @staticmethod
    def _information_value(
        members: list[dict],
        experiments: list[dict],
        newly_unlocked: set[str],
    ) -> str:
        notes = []
        for item in members:
            dependents = _dependents_of(item["id"], experiments)
            if dependents:
                names = ", ".join(_experiment_label(d) for d in dependents)
                notes.append(
                    f"{item['id']} is a prerequisite for {names}; its outcome "
                    "decides whether that larger commitment can proceed."
                )
            if item["id"] in newly_unlocked:
                notes.append(
                    f"{item['id']} is newly unlocked: its prerequisites "
                    "completed with outcome SUCCESS."
                )
        return " ".join(notes) or (
            "No remaining experiment depends on this strategy's outcome."
        )

    @staticmethod
    def _alignment(consequence: dict | None) -> str:
        if consequence is None:
            return "No consequence result was supplied for this strategy."
        affected = consequence.get("affected_commitments") or []
        commitments = (
            f"affects commitments {affected}" if affected
            else "affects no protected commitments"
        )
        return f"Strategy {commitments}; delay {consequence['delay_days']} days."

    @staticmethod
    def _opportunity_cost(consequence: dict | None) -> str:
        if consequence is None:
            return "No consequence result was supplied for this strategy."
        return (
            f"Uses {consequence['budget_used_usd']} USD, "
            f"{consequence['engineering_used_hours']} engineering hours and "
            f"{consequence['traffic_used']} traffic; leaves "
            f"{consequence['remaining_budget_usd']} USD, "
            f"{consequence['remaining_engineering_hours']} engineering hours and "
            f"{consequence['remaining_traffic']} traffic."
        )

    # generate_recommendation ------------------------------------------

    def _recommendation(self, prompt: str) -> dict:
        experiments = extract_json_section(prompt, "Experiments")
        newly_unlocked = set(
            extract_json_section(prompt, "Newly unlocked experiment IDs")
        )
        strategies = extract_json_section(prompt, "Feasible strategies")
        consequences = {
            item["strategy_id"]: item
            for item in extract_json_section(prompt, "Deterministic consequences")
        }
        optimization = extract_json_section(prompt, "CP-SAT result")
        decision_id = extract_assignment(prompt, "decision_id")
        state_version = int(extract_assignment(prompt, "state_version"))

        if not strategies:
            raise DeterministicFallbackError("No feasible strategy was supplied.")

        prerequisite_ids = {
            dependency_id
            for item in experiments
            if item["status"] != "COMPLETED"
            for dependency_id in item.get("dependencies", [])
        }
        solver_choice = set(optimization.get("selected_experiment_ids") or [])

        def rank(strategy: dict) -> tuple:
            ids = set(strategy["experiment_ids"])
            cost = consequences.get(strategy["id"], {}).get("budget_used_usd")
            return (
                not ids & newly_unlocked,       # 1. continue newly unlocked work
                not ids & prerequisite_ids,     # 2. information before a larger bet
                ids != solver_choice,           # 3. CP-SAT selection
                cost if cost is not None else float("inf"),
                len(ids),
                strategy["id"],
            )

        chosen = min(strategies, key=rank)
        ids = set(chosen["experiment_ids"])
        if ids & newly_unlocked:
            reason = "it continues newly unlocked experiment(s)"
        elif ids & prerequisite_ids:
            reason = "it produces prerequisite evidence before a dependent investment"
        elif ids == solver_choice:
            reason = "it matches the CP-SAT selection"
        else:
            reason = "it has the lowest deterministic cost"
        return {
            "decision_id": decision_id,
            "recommended_strategy_id": chosen["id"],
            "now": [],
            "next": [],
            "later": [],
            "defer": [],
            "reasoning_summary": (
                f"{FALLBACK_LABEL} Selected {chosen['id']} because {reason}."
            ),
            "requires_approval": False,
            "state_version": state_version,
        }
