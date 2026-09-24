# Experiment Governor Backend

FastAPI and PostgreSQL implementation of Experiment Governor API Contract v1.1.

## Local setup

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
$env:PYTHONPATH = "backend"
.\.venv\Scripts\python.exe -m pytest backend\tests -q
```

## Docker setup

```powershell
docker compose up --build postgres backend
```

The API is available at `http://localhost:8000`, with interactive documentation at
`http://localhost:8000/docs`.

The backend container applies migrations and idempotently seeds PulseBoard on startup.

Use `GET /health` for liveness and `GET /ready` for database-backed readiness.
Experiment-plan uploads accept JSON text or multipart PDF, DOCX, and UTF-8 TXT
files up to `IMPORT_MAX_BYTES` (5 MiB by default).
