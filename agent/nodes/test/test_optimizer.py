from tools.mock_backend import (
    get_current_state,
    get_experiments,
)

from optimizer.cp_sat_optimizer import (
    find_feasible_combinations,
)


def test_initial_cp_sat():

    state = get_current_state()
    experiments = get_experiments()

    result = find_feasible_combinations(
        state,
        experiments,
    )

    assert ["A"] in (
        result.feasible_combinations
    )

    assert ["C"] in (
        result.feasible_combinations
    )

    assert ["A", "B"] not in (
        result.feasible_combinations
    )