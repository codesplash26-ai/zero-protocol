# Zero Protocol — Experiment Governor

**CodeSplash'26 Agentic AI Phase · Theme 2: AI Startup Co-Founder**

Experiment Governor is an agentic decision system that helps early-stage founders
decide which experiment, or conditional sequence of experiments, to run next under
real constraints: budget, engineering capacity, customer traffic, dependencies and
protected commitments.

## Problem

Startups have more candidate experiments than capacity. Picking one in isolation can
consume hours reserved for a critical commitment, hide opportunity cost, commit to a
large build before a cheap test resolves its key assumption, or leave a plan stale
after something changes. Experiment Governor treats experiments as
information-producing actions: it evaluates what each consumes and what it unlocks,
recommends a feasible sequence, requires founder approval for consequential actions,
and replans when a material event changes the constraints — with every step audited.

## Team

**Zero Protocol** — University of Peradeniya

- Arnikan U. (team leader, frontend and product)
- Ananthasagaran N. (backend)
- Sanjeevan U. (AI agent and optimization)

## Architecture

| Service | Technology | Responsibility |
|---|---|---|
| `frontend` | React 19 + TypeScript (Vite), served by nginx | Founder dashboard: overview, decision, experiments, approvals, events, audit trail |
| `backend` | FastAPI, SQLAlchemy, Alembic | Authoritative state, deterministic feasibility/consequence/materiality engines, approval policy, controlled actions, audit log |
| `postgres` | PostgreSQL 16 | Versioned organization state and all decision records |
| `agent` | LangGraph, Google OR-Tools CP-SAT, Groq / Gemini | Governor worker: interprets the goal, generates and evaluates strategies, optimizes, recommends, replans |

**Why these choices:** LangGraph gives a stateful, inspectable agent workflow that
mixes model steps with deterministic ones. CP-SAT enforces hard resource constraints
exactly instead of trusting an LLM with arithmetic. FastAPI + Pydantic provide typed,
validated contracts, and PostgreSQL is the single transactional source of truth.
React + TypeScript keeps the dashboard typed against the same contract. Docker Compose
runs the whole system with one command.

The backend is the only authority for state versions, resources, experiment
lifecycle, approvals, events, receipts and audit records. Agent output is validated
before it is persisted, and the browser never changes authoritative state locally.

## Prerequisites

- Docker with Docker Compose v2 (Docker Desktop on Windows/macOS)
- Optional: a Groq and/or Gemini API key. Without keys the system still runs using the
  built-in rule-based fallback (see Change Log).

Node.js 22 and Python 3.11 are only needed for running checks outside Docker.

## Run with Docker Compose

```bash
docker compose up --build
```

| URL | What |
|---|---|
| http://localhost:5173 | Landing page (problem, features, how it works) → *Try the live demo* opens the dashboard |
| http://localhost:5173/overview | Experiment Governor dashboard |
| http://localhost:8000/docs | Interactive API documentation |
| http://localhost:8000/ready | Backend + database readiness |

Database migrations and the PulseBoard demo seed run automatically when the backend
starts. To return to the initial demo state, click **Reset demo** in the app header
(or run `docker compose down -v`, then `docker compose up --build`).

### Configuration (optional)

Everything has working defaults. To use LLM providers, create a `.env` file next to
`docker-compose.yml` (see `.env.example`); it is git-ignored and must not be committed.

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY` | empty | Primary LLM provider (skipped when empty) |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Groq model |
| `GEMINI_API_KEY` | empty | Secondary LLM provider (skipped when empty) |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Gemini model |
| `INTERNAL_SERVICE_KEY` | `local-development-only` | Shared secret between agent and backend internal endpoints; change it for shared environments |
| `FRONTEND_PORT` / `BACKEND_PORT` / `POSTGRES_PORT` | `5173` / `8000` / `5432` | Host ports |
| `AGENT_POLL_INTERVAL_SECONDS` | `2` | How often the agent worker checks for queued runs |
| `DEMO_MODE` | `true` in Compose (`false` otherwise) | Enables *Reset demo* (`POST /api/v1/demo/reset`); set `false` outside demos |

## Demo walkthrough (PulseBoard)

The seeded startup has a $4,000 budget, 60 engineering hours (36 reserved for the
protected Enterprise SSO commitment), 10,000 sessions and a $2,000 approval
threshold. Experiments: **A** pricing test ($600, 6h), **B** annual-plan checkout
($2,500, 24h, depends on A), **C** referral prototype ($1,800, 16h).

Click **Try the live demo** on the landing page. A **Guided demo** panel lists the seven
steps below and ticks each one off from live backend state; the **Next step** bar at the
top of every page also shows what to do next.

1. **Decision** → *Run Governor*. The Governor recommends starting **A** (a cheap
   prerequisite whose result decides whether B is worth funding).
2. **Approvals** → A is within the threshold, so no approval is needed → *Start A*
   (state v2).
3. **Events** → Quick Events → *A succeeded* (v3).
4. **Events** → Quick Events → *Enterprise SSO frees 18h* (v4). The backend classifies
   it as material. (*Custom event…* opens the full event form.)
5. *Trigger Governor Re-Plan* → the Governor now recommends **B**.
6. **Approvals** → B costs $2,500 (above $2,000) → *Approve and start B* (v5).
7. **Audit Trail** → the full goal → recommendation → approval → action → event →
   replan chain.

LLM-backed runs take roughly 10–60 seconds; the rule-based fallback responds in about
a second.

**Try a change:** add experiments on the Experiments page (they are named D, E, …),
then click *Re-run Governor* on the Decision page when it reports the plan is out of
date. **Reset demo** in the header restores the starting point at any time.

## Local checks

```bash
# Backend (from repository root)
python -m pip install -r backend/requirements-dev.txt
python -m ruff check backend
python -m pytest backend/tests -q

# Agent
python -m pip install -r agent/requirements.txt
cd agent && python -m pytest -q && cd ..

# Frontend
cd frontend && npm ci && npm run lint && npm run build
```

`npm run dev` serves the frontend on Vite and proxies `/api` to
`http://localhost:8000` (override with `VITE_DEV_API_TARGET`).

## Known limitations and assumptions

- Single demo organization (PulseBoard) and a synthetic scenario; there is no
  authentication or role-based access control. Founder decisions are recorded with
  the actor `founder`.
- All actions are simulated, reversible state changes; the system never moves money or
  touches production systems.
- *Reset demo* deletes all data and re-seeds PulseBoard; it is meant for demos only and is
  disabled unless `DEMO_MODE=true`. The guided demo follows the seeded PulseBoard story.
- Evidence comes from the seeded evidence store; live external search is not
  implemented.
- Experiment-plan import: the backend accepts import jobs, but no interpreter
  processes them yet, so *Import Experiment Plan* is disabled in the UI. Manual
  *Add Experiment* works.
- The decision workspace stores only the recommended strategy (alternatives are not
  persisted); sensitivity analysis is not implemented.
- If no strategy is feasible (e.g. budget exhausted), the Governor run ends as
  `FAILED` with an explanation rather than a "no action" recommendation.
- The dashboard polls for run progress instead of using server-sent events.
- LLM outputs vary between runs; all numbers, feasibility and approvals are always
  decided by deterministic backend code.

## Change Log

Changes from the Proposal Phase design, with reasons.

| Change | Reason |
|---|---|
| **Agent worker + run claim/fail endpoints.** The backend queues decision runs; a long-running agent worker claims them through internal endpoints, runs the LangGraph Governor and marks runs `FAILED` on error. Stuck runs time out after 10 minutes. | The original agent ran once for a manually configured decision, so runs started from the UI never completed. |
| **Rule-based deterministic LLM fallback.** Order is Groq → Gemini → rule-based provider; providers without a key are skipped. The fallback uses only facts already in the graph's inputs, and its recommendations are labelled `[Deterministic fallback]`. | Keeps the full system runnable offline and without API keys, and protects the demo from provider outages. |
| **Frontend integrated with the live backend.** Typed API client (idempotency keys, error handling, timeouts), shared data provider, and all pages driven by real endpoints; mock data and browser-side state changes removed. | The frontend was built against mock data during parallel development. |
| **Decision-scoped strategy IDs** (migration `20260926_0007`). Candidate strategies are keyed by `(decision_id, id)`. | Strategy IDs were globally unique, so a second decision recommending an equivalent strategy failed with `STRATEGY_ID_CONFLICT`. |
| **Agent strategy validation.** Generated candidates that break the backend's consistency rules are dropped before evaluation. | An invalid LLM-generated candidate intermittently failed an entire replan with `INVALID_STRATEGY`. |
| **Polling instead of server-sent events** for run progress. | Simpler and sufficient for the MVP. |
| **`current_executable_experiment_id` not exposed.** The executable experiment is the first `now` entry of the recommendation and the approval's `experiment_id`. | Kept consistent with the implemented backend contract. |
| **Replan result reported** as `REPLANNED` / `PRESERVED` instead of always `NEW_RECOMMENDATION`. | Matches the contract's decision-run result semantics. |
| **Letter IDs for new experiments.** New experiments continue the seeded sequence (D, E, … Z, AA) instead of random `EXP-…` IDs; IDs remain server-generated and opaque to clients. | Keeps the demo story and approval labels readable. |
| **Landing page and guided demo.** A public landing page at `/` presents the problem, differentiation and features; the dashboard moved to `/overview`. A collapsible seven-step guide walks through the PulseBoard story and ticks steps off from backend state. | First-time users and judges could not tell what the product does or how to try it. |
| **One-click demo reset** (`POST /api/v1/demo/reset`, only when `DEMO_MODE=true`). Restores the seeded starting point in one transaction; runs in progress are abandoned safely. | Lets anyone rerun the demo without a terminal. |
| **Demo guidance.** Next-step bar on every page, *Re-run Governor* with an out-of-date-plan warning when experiments are added after a recommendation, approval queue limited to the current decision, and one-click Quick Events. Re-running uses the existing `POST /decisions`. | Testing showed first-time users could not tell what to do next or re-run the Governor after changes. |
