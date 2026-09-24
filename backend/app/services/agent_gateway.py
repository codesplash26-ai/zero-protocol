from typing import Protocol


class AgentGateway(Protocol):
    def dispatch_initial(self, run_id: str) -> None: ...

    def dispatch_replan(self, run_id: str) -> None: ...

    def dispatch_import(self, import_id: str) -> None: ...


class PersistedRunAgentGateway:
    """Leaves the durable QUEUED run for the agent worker to claim."""

    def dispatch_initial(self, run_id: str) -> None:
        return None

    def dispatch_replan(self, run_id: str) -> None:
        return None

    def dispatch_import(self, import_id: str) -> None:
        return None


_gateway = PersistedRunAgentGateway()


def get_agent_gateway() -> AgentGateway:
    return _gateway

