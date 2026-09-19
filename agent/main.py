from schemas.models import CandidateStrategy

from tools.mock_backend import (
    get_goal,
    get_current_state,
    get_experiments,
    check_feasibility,
    calculate_consequences,
)

from optimizer.cp_sat_optimizer import (
    find_feasible_combinations,
)


print("\n=== EXPERIMENT GOVERNOR ===\n")


goal = get_goal()

print("Founder Goal:")
print(goal.text)


state = get_current_state()

print("\nOrganization:")
print(state.organization_name)

print(
    "Available Engineering:",
    state.available_engineering_hours,
)


experiments = get_experiments()

print("\nExperiments:")

for experiment in experiments:

    print(
        experiment.id,
        "-",
        experiment.name,
    )


print("\nRunning CP-SAT...\n")

optimization = find_feasible_combinations(
    state=state,
    experiments=experiments,
)

print(
    "Solver Status:",
    optimization.status,
)

print("\nFeasible combinations:")

for combination in optimization.feasible_combinations:

    if combination:

        print(combination)

    else:

        print(["DO_NOTHING"])


print("\nTesting Strategy A...\n")

strategy_a = CandidateStrategy(
    id="STRATEGY-A",
    experiment_ids=["A"],
    sequence=["A"],
)


feasibility = check_feasibility(
    strategy_a
)

print(
    "Feasible:",
    feasibility.feasible,
)

print(
    "Violations:",
    feasibility.violations,
)


consequences = calculate_consequences(
    strategy_a
)

print("\nConsequences:")

print(
    "Budget Used:",
    consequences.budget_used_usd,
)

print(
    "Remaining Budget:",
    consequences.remaining_budget_usd,
)

print(
    "Engineering Used:",
    consequences.engineering_used_hours,
)

print(
    "Remaining Engineering:",
    consequences.remaining_engineering_hours,
)