# Datature Clone

A computer vision platform — manage datasets, annotate images, train models, and build ML workflows.

## Tech Stack

| Layer      | Stack                                                           |
| ---------- | --------------------------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite 8, Tailwind CSS 4, Ant Design 6     |
| Backend    | Python 3.12, FastAPI, SQLAlchemy, Alembic                       |
| Database   | SQLite (dev), PostgreSQL (prod)                                 |
| CI         | GitHub Actions — frontend (pnpm) + backend (pip)                |

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (only pnpm — npm/yarn will refuse to install)
- **Python** 3.12+
- **(Optional)** Docker Desktop for local Postgres

## Project Structure

```
datature-clone/
├── frontend/               # React SPA (pnpm)
│   ├── src/
│   │   ├── components/     # UI components (annotation, gallery, uploader, etc.)
│   │   ├── pages/          # Route pages (Dashboard, Projects, Datasets, etc.)
│   │   └── store/          # Zustand state management
│   ├── .npmrc              # Enforces pnpm-only
│   └── package.json
├── backend/                # FastAPI server
│   ├── app/
│   │   ├── api/            # Route handlers
│   │   ├── core/           # Config, settings
│   │   ├── db/             # Database session & base
│   │   └── models/         # SQLAlchemy models
│   ├── alembic/            # Migrations
│   └── .env.example        # Environment template
├── docker-compose.yml      # Postgres 16 (dev)
├── Makefile                # Backend / docker shortcuts
└── .github/workflows/      # CI pipelines
```

## Quick Start

### 1) Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env -Force
alembic upgrade head
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Health check: `GET http://127.0.0.1:8000/api/health`

### 2) Frontend

```powershell
cd frontend
pnpm install
pnpm run dev
```

Opens at `http://localhost:5173`. The dev server proxies `/api` to the backend.

## Package Manager

This project uses **pnpm only**. An `.npmrc` with `engine-strict=true` prevents npm/yarn from installing. If you see an error about `packageManager`, make sure you're using pnpm:

```powershell
npm install -g pnpm   # Install pnpm globally
pnpm --version        # Should be 9.x
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
APP_NAME=datature-clone-backend
ENVIRONMENT=local
API_PREFIX=/api
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=sqlite:///./dev.db    # Switch to Postgres URL for prod
```

## Scripts

### Frontend

| Command                  | Description              |
| ------------------------ | ------------------------ |
| `pnpm run dev`           | Start dev server         |
| `pnpm run build`         | Production build         |
| `pnpm run preview`       | Preview production build |
| `pnpm run lint`          | ESLint                   |
| `pnpm run format:check`  | Prettier check           |
| `pnpm exec tsc -b`       | TypeScript check         |
| `pnpm exec vitest run`   | Unit tests               |
| `pnpm exec playwright test` | E2E tests            |

### Backend

| Command                          | Description            |
| -------------------------------- | ---------------------- |
| `uvicorn main:app --reload`      | Dev server             |
| `mypy .`                         | Type check             |
| `python -m pytest`               | Unit tests             |
| `alembic upgrade head`           | Run migrations         |
| `alembic revision --autogenerate -m "message"` | New migration |

### Docker (Postgres)

```powershell
docker compose up -d postgres    # Start Postgres
docker compose down              # Stop Postgres
```

After starting Postgres, set `DATABASE_URL` in `backend/.env`:

```text
DATABASE_URL=postgresql+psycopg://datature:datature@localhost:5432/datature
```

Then run `alembic upgrade head`.

## Pre-push Hooks

Lefthook runs lint, format check, type check, and audit on `git push`. Install once:

```powershell
cd frontend
pnpm exec lefthook install
```

Run hooks manually:

```powershell
pnpm exec lefthook run pre-commit
pnpm exec lefthook run pre-push
```

## Frontend Architecture

| Route        | Page                     | Description                          |
| ------------ | ------------------------ | ------------------------------------ |
| `dashboard`  | Dashboard                | Stats, charts, activity feed         |
| `projects`   | ProjectsView             | Project grid with search/filter      |
| `datasets`   | DatasetsView             | Dataset explorer & image gallery     |
| `annotation` | AnnotationStudio         | Canvas annotation (bbox/polygon/brush) |
| `workflow`   | WorkflowBuilder          | Visual pipeline builder (React Flow) |
| `models`     | (placeholder)            |                                     |
| `training`   | (placeholder)            |                                     |
| `deployments`| (placeholder)            |                                     |
| `settings`   | (placeholder)            |                                     |
| `auth/*`     | AuthFlow                 | Login, signup, onboarding, invite    |

Key libraries: **Zustand** (state), **React Router** (navigation), **Konva** (annotation canvas), **React Flow** (workflow graphs), **Recharts** (charts).

## Code Conventions

- **Variables** — `snake_case` or `UPPER_CASE`
- **Functions** — `snake_case`
- **Booleans** — prefix with `is_`, `has_`, `can_`, `should_`, `will_`, `did_`
- **No `null`** — use `undefined`
- **No `console.log`** — use `console.warn`, `console.error`, or `console.info`
- ESLint enforces these rules automatically.

## CI

Pushes/PRs to `main` trigger:

- **Frontend** — `pnpm install --frozen-lockfile` → lint → format check → build
- **Backend** — `pip install` → `mypy .`
