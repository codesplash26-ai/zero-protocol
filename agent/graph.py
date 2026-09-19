from langgraph.graph import (
    StateGraph,
    START,
    END,
)

from state import AgentState

from nodes.load_context import (
    load_context_node,
)

from nodes.interpret_goal import (
    interpret_goal_node,
)

from nodes.plan_evidence import (
    plan_evidence_node,
)

from nodes.generate_strategies import (
    generate_strategies_node,
)

from nodes.evaluate_candidates import (
    evaluate_candidates_node,
)

from nodes.optimize import (
    optimize_node,
)


def build_graph():

    workflow = StateGraph(
        AgentState
    )

    workflow.add_node(
        "load_context",
        load_context_node,
    )

    workflow.add_node(
        "interpret_goal",
        interpret_goal_node,
    )

    workflow.add_node(
        "plan_evidence",
        plan_evidence_node,
    )

    workflow.add_node(
        "generate_strategies",
        generate_strategies_node,
    )

    workflow.add_node(
        "evaluate_candidates",
        evaluate_candidates_node,
    )

    workflow.add_node(
        "optimize",
        optimize_node,
    )

    workflow.add_edge(
        START,
        "load_context",
    )

    workflow.add_edge(
        "load_context",
        "interpret_goal",
    )

    workflow.add_edge(
        "interpret_goal",
        "plan_evidence",
    )

    workflow.add_edge(
        "plan_evidence",
        "generate_strategies",
    )

    workflow.add_edge(
        "generate_strategies",
        "evaluate_candidates",
    )

    workflow.add_edge(
        "evaluate_candidates",
        "optimize",
    )

    workflow.add_edge(
        "optimize",
        END,
    )

    return workflow.compile()