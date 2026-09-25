from langgraph.graph import (
    END,
    START,
    StateGraph,
)

from nodes.check_approval import (
    check_approval_node,
)
from nodes.detect_newly_unlocked import (
    detect_newly_unlocked_node,
)
from nodes.evaluate_candidates import (
    evaluate_candidates_node,
)
from nodes.generate_recommendation import (
    generate_recommendation_node,
)
from nodes.generate_strategies import (
    generate_strategies_node,
)
from nodes.handle_event import (
    handle_event_node,
)
from nodes.optimize import (
    optimize_node,
)
from nodes.persist_optimization import (
    persist_optimization_node,
)
from nodes.persist_recommendation import (
    persist_recommendation_node,
)
from nodes.retrieve_audit import (
    retrieve_audit_node,
)
from nodes.strategic_evaluation import (
    strategic_evaluation_node,
)
from state import AgentState


def materiality_router(
    state: AgentState,
) -> str:

    materiality = (
        state[
            "materiality_result"
        ]
    )

    if materiality[
        "potentially_material"
    ]:
        return "replan"

    return "continue"


def build_replan_graph():

    workflow = StateGraph(
        AgentState
    )

    workflow.add_node(
        "handle_event",
        handle_event_node,
    )

    workflow.add_node(
        "detect_newly_unlocked",
        detect_newly_unlocked_node,
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

    workflow.add_node(
        "persist_optimization",
        persist_optimization_node,
    )

    workflow.add_node(
        "strategic_evaluation",
        strategic_evaluation_node,
    )

    workflow.add_node(
        "generate_recommendation",
        generate_recommendation_node,
    )

    workflow.add_node(
        "check_approval",
        check_approval_node,
    )
    workflow.add_node(
        "persist_recommendation",
        persist_recommendation_node,
    )
    workflow.add_node(
        "retrieve_audit",
        retrieve_audit_node,
    )

    workflow.add_edge(
        START,
        "handle_event",
    )

    workflow.add_conditional_edges(
        "handle_event",
        materiality_router,
        {
            "replan":
                "detect_newly_unlocked",

            "continue":
                END,
        },
    )

    workflow.add_edge(
        "detect_newly_unlocked",
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
        "persist_optimization",
    )

    workflow.add_edge(
        "persist_optimization",
        "strategic_evaluation",
    )

    workflow.add_edge(
        "strategic_evaluation",
        "generate_recommendation",
    )

    workflow.add_edge(
        "generate_recommendation",
        "check_approval",
    )

    workflow.add_edge(
        "check_approval",
        "persist_recommendation",
    )

    workflow.add_edge(
        "persist_recommendation",
        "retrieve_audit",
    )

    workflow.add_edge(
        "retrieve_audit",
        END,
    )

    return workflow.compile()
