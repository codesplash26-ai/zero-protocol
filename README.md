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

| Requirement | Notes |
|---|---|
| **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux) | Must be running before you start. |
| **Docker Compose v2.24 or newer** | Included with current Docker Desktop. Check with `docker compose version`. |
| **Git** | To clone the repository. |
| **About 8 GB free disk space** | The images total about 3 GB; building needs extra room. |
| **Free ports 5173, 8000 and 5432** | They can be changed in `.env` (see *Configuration*). |
| **Internet access for the first build** | Downloads base images and dependencies. |
| **Groq API key (recommended)** | Optional but recommended; see *Step 2*. |

Nothing else is needed: Node.js and Python run inside the containers.

## Getting started

### Step 1 — Clone the repository

```bash
git clone https://github.com/codesplash26-ai/zero-protocol.git
cd zero-protocol
```

### Step 2 — Add an LLM API key (recommended)

The Governor's reasoning steps use an LLM. The provider order is
**Groq → Gemini → built-in rule-based fallback**, and providers without a key are skipped.

- **Groq is recommended** as the primary provider: in our testing it was the most
  reliable and the fastest. Get a free key at <https://console.groq.com/keys>.
  The free tier has a daily token limit (200,000 tokens per day for the default
  model at the time of writing). When it is reached, the Governor falls back
  automatically and keeps working.
- **Gemini is the secondary option**, used only if Groq is unavailable. Get a key at
  <https://aistudio.google.com/apikey>.
- **No key?** The system still runs end to end using the rule-based fallback;
  recommendations are then labelled `[Deterministic fallback]`.

Create a `.env` file next to `docker-compose.yml` from the template and add your key(s):

```bash
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

```ini
GROQ_API_KEY=your-groq-key       # recommended
GEMINI_API_KEY=your-gemini-key   # optional backup
```

`.env` is git-ignored; never commit it. You can skip this step and add a key later
(restart with `docker compose up -d` after editing `.env`).

### Step 3 — Build and start

```bash
docker compose up --build
```

The first build takes several minutes; later starts take seconds. Four containers
start: `postgres`, `backend`, `agent` and `frontend`. Database migrations and the
PulseBoard demo data are applied automatically. The system is ready when the frontend
container reports healthy (`docker compose ps`) or http://localhost:8000/ready
returns `"status":"ready"`.

### Step 4 — Open the application

| URL | What |
|---|---|
| http://localhost:5173 | Landing page; **Watch it decide** opens the dashboard with the guided demo |
| http://localhost:5173/overview | Experiment Governor dashboard |
| http://localhost:8000/docs | Interactive API documentation |
| http://localhost:8000/ready | Backend and database readiness |

Then follow the *Demo walkthrough* below.

### Step 5 — Reset, stop or clean up

| Action | How |
|---|---|
| Restart the demo from the beginning | **Reset demo** in the app header |
| Stop the system | `Ctrl+C` in the terminal, or `docker compose down` |
| Stop and delete all data | `docker compose down -v` (the next start re-seeds the demo) |

### Troubleshooting

| Symptom | Fix |
|---|---|
| `port is already allocated` | Free the port, or set `FRONTEND_PORT` / `BACKEND_PORT` / `POSTGRES_PORT` in `.env`. |
| `env_file` / `required` error on start | Update Docker Compose to v2.24 or newer. |
| Build fails with `no space left on device` | Free disk space (for example `docker builder prune`) and run the build again. |
| A download fails during the build (for example `npm ci`) | Usually a network blip; run `docker compose up --build` again. |
| Dashboard shows *Backend unavailable* | Wait for the backend to become healthy, then press *Retry*. |
| Recommendations say `[Deterministic fallback]` | No LLM provider answered. Check `docker compose logs agent`: `Groq failed (RateLimitError)` means the free daily token limit is used up (wait, or use another key); `AuthenticationError` means the key is wrong. Fix `.env`, then run `docker compose up -d`. |
| Gemini returns `403 permission denied` | The Google project behind the key has no access; create a key in a new project at <https://aistudio.google.com/apikey>. |

### Configuration

Everything has working defaults; `.env` is only needed for API keys or changes.

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY` | empty | **Recommended** primary LLM provider (skipped when empty) |
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

Click **Watch it decide** on the landing page. A **Guided demo** panel lists the seven
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

**Change the goal:** on the Decision page, *Change goal* offers templates or your own goal
(text, time horizon and protected commitments). Saving records a new goal; run the
Governor again to plan for it. **Reset demo** restores the original goal.

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
- The Governor has no "no action" recommendation. When no remaining experiment fits
  the budget, hours and traffic left (for example at the end of the demo story), the
  dashboard says so and disables *Run Governor*; a run started anyway ends as
  `FAILED`.
- The dashboard polls for run progress instead of using server-sent events.
- LLM outputs vary between runs; all numbers, feasibility and approvals are always
  decided by deterministic backend code.

## Open-source acknowledgements

Built with open-source software, used under their respective licenses:
[React](https://react.dev), [Vite](https://vite.dev), [TypeScript](https://www.typescriptlang.org),
[React Router](https://reactrouter.com), [Lucide](https://lucide.dev) icons,
[FastAPI](https://fastapi.tiangolo.com), [Pydantic](https://docs.pydantic.dev),
[SQLAlchemy](https://www.sqlalchemy.org), [Alembic](https://alembic.sqlalchemy.org),
[PostgreSQL](https://www.postgresql.org), [LangGraph](https://github.com/langchain-ai/langgraph),
[Google OR-Tools](https://developers.google.com/optimization) (CP-SAT), [nginx](https://nginx.org)
and [Docker](https://www.docker.com). LLM access uses the Groq and Google Gemini APIs.

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
| **Simplified workspace UI.** Sidebar grouped by the Governor loop (Decide, Govern, Adapt, Prove) with live badges for pending approvals, unanswered material events and running Governor runs; a journey strip on Overview (Goal → Recommendation → Approval → Action → Event → Replan); plain-language tooltips for jargon; IDs and solver data folded into *Technical details*; a *Present* mode with larger text; one main action per page. The landing page was redesigned to be more visual. Frontend only, derived from existing API data. | Testing showed the dashboard was dense and full of jargon for first-time users and demo audiences. |
| **Founder-defined goals.** *Change goal* on the Decision page creates a new goal through the existing `POST /goals` (templates or custom text, horizon and protected commitments); the newest goal is the active one, and the app flags plans made for a previous goal until the Governor runs again. When no remaining experiment fits the resources left, the Decision page explains why and disables *Run Governor* instead of letting the run fail with provider errors. Frontend only. | The founder's goal was fixed to the seeded PulseBoard goal, so the Governor could not be pointed at a different objective. |
| **Readable failures.** Failed Governor runs, API errors and page crashes show a plain-language cause and next step; raw codes and provider messages are kept in a collapsed *Raw error* / *Error details* section. Frontend only. | Failures showed internal error codes and provider responses that viewers could not act on. |
| **Demo guidance.** Next-step bar on every page, *Re-run Governor* with an out-of-date-plan warning when experiments are added after a recommendation, approval queue limited to the current decision, and one-click Quick Events. Re-running uses the existing `POST /decisions`. | Testing showed first-time users could not tell what to do next or re-run the Governor after changes. |
