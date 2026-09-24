# Zero Protocol — Experiment Governor

Experiment Governor is an auditable decision system for selecting, authorizing,
executing, and adapting product experiments under budget, engineering, traffic,
dependency, and commitment constraints.

## Repository services

- `backend`: FastAPI, SQLAlchemy, Alembic, PostgreSQL, deterministic policy and
  controlled state transitions.
- `frontend`: React/Vite interface, built and served by nginx in Compose.
- `agent`: Governor reasoning and optimization service owned by the AI workstream.

The backend is authoritative for state versions, resources, experiment lifecycle,
approvals, events, action receipts, imports, and audit records. Agent output is
validated before persistence and the browser never mutates authoritative state
locally.

## Run the shared stack

Copy `.env.example` to `.env` and change `INTERNAL_SERVICE_KEY` for shared
environments. Then run:

```powershell
docker compose up --build
```

The frontend is available at `http://localhost:5173`, the API at
`http://localhost:8000`, and API documentation at `http://localhost:8000/docs`.
Migrations and the idempotent PulseBoard seed run automatically before the API
starts. The optional current agent demo can be started with:

```powershell
docker compose --profile agent up --build agent
```

## Local verification

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
.\.venv\Scripts\python.exe -m ruff check backend
.\.venv\Scripts\python.exe -m pytest backend\tests -q

cd frontend
npm ci
npm run lint
npm run build
```

The backend test suite includes the seeded v1→v5 flow: initial recommendation,
controlled start of A, successful completion, SSO capacity release, materiality,
replanning, action-scoped approval of B, controlled start of B, and complete audit
trace. It also covers text/PDF/DOCX/TXT import jobs, draft interpretation, human
confirmation, and evidence mapping.

## Operations

- `GET /health` verifies the API process.
- `GET /ready` verifies API and database readiness.
- `docker compose config --quiet` validates deployment configuration.
- CI checks backend lint/tests/migrations, frontend lint/build, and Compose syntax.
