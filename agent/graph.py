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
from nodes.interpret_goal import (
    interpret_goal_node,
)
from nodes.load_context import (
    load_context_node,
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
from nodes.plan_evidence import (
    plan_evidence_node,
)
from nodes.retrieve_audit import (
    retrieve_audit_node,
)
from nodes.strategic_evaluation import (
    strategic_evaluation_node,
)
from state import AgentState


def build_graph(detect_unlocked: bool = False):
    """Build the Governor decision graph.

    Replan runs set detect_unlocked so strategies can continue from
    experiments whose dependencies have just completed successfully.
    """

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

    workflow.add_node(
        "persist_optimization",
        persist_optimization_node,
    )

    workflow.add_edge(
        START,
        "load_context",
    )

    if detect_unlocked:
        workflow.add_node(
            "detect_newly_unlocked",
            detect_newly_unlocked_node,
        )
        workflow.add_edge(
            "load_context",
            "detect_newly_unlocked",
        )
        workflow.add_edge(
            "detect_newly_unlocked",
            "interpret_goal",
        )
    else:
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
