# Datature Clone

Monorepo:

- `frontend/`: React + TypeScript + Vite (pnpm)
- `backend/`: FastAPI + Python 3.12

## Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.12+
- (Optional) Docker Desktop (for local Postgres)

## Quick Start

### 1) Backend

Create and activate the virtual environment:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create local environment file:

```powershell
Copy-Item .env.example .env -Force
```

Run migrations (SQLite by default):

```powershell
alembic upgrade head
```

Run the API:

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

- `GET http://127.0.0.1:8000/api/health`

### 2) Frontend

Install and run:

```powershell
cd ..\frontend
pnpm install
pnpm run dev
```

The frontend dev server proxies `/api` to `http://127.0.0.1:8000`.

## Development Database (Postgres)

Start Postgres:

```powershell
cd ..
docker compose up -d postgres
```

Then set `DATABASE_URL` in `backend/.env`, for example:

```text
DATABASE_URL=postgresql+psycopg://datature:datature@localhost:5432/datature
```

Apply migrations:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
alembic upgrade head
```

## Testing

### Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# Type check
mypy .

# Run unit tests
python -m pytest
```

### Frontend

```powershell
cd frontend

# Lint
pnpm run lint

# Format check
pnpm run format:check

# Type check
pnpm exec tsc -b

# Unit tests
pnpm exec vitest run

# E2E tests (requires dev server or CI)
pnpm exec playwright test

# Production build (full verification)
pnpm run build
```

## Code Quality

Run these before pushing:

### Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
mypy .
```

### Frontend

```powershell
cd frontend
pnpm run lint
pnpm run format:check
pnpm exec tsc -b
pnpm run build
```

### Pre-push hooks (lefthook)

Lefthook runs lint, format check, type check, and audit automatically on `git push`.
Install once per clone:

```powershell
cd frontend
pnpm exec lefthook install
```

To run all hooks manually:

```powershell
pnpm exec lefthook run pre-commit
pnpm exec lefthook run pre-push
```

## Makefile

From repo root:

```powershell
make help
make lint-backend
make format-backend
make run-backend
make migrate-backend
make db-up
make db-down
```
