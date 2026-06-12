# AML Platform

A computer vision platform — manage datasets, annotate images with AI-assisted tools, train models, and build ML workflows.

## Tech Stack

| Layer      | Stack                                                           |
| ---------- | --------------------------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite 8, Tailwind CSS 4, Konva (canvas)   |
| Backend    | Python 3.12, FastAPI, SQLAlchemy, Alembic                       |
| Database   | SQLite (dev), PostgreSQL (prod), Supabase (auth + storage)      |
| Storage    | Google Drive API (image upload), Supabase (metadata)            |
| CI         | GitHub Actions — frontend (pnpm) + backend (pip)                |

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (only pnpm — npm/yarn will refuse to install)
- **Python** 3.12+
- **(Optional)** Docker Desktop for local Postgres
- **Google Cloud** project with Drive API enabled (for image upload)
- **Supabase** project (for auth, database, and RLS)

## Project Structure

```
AML_Platform/
├── frontend/               # React SPA (pnpm)
│   ├── src/
│   │   ├── api/            # API client (Drive upload, Supabase)
│   │   ├── components/     # UI components
│   │   │   ├── AnnotationBox/     # Bounding box annotation rendering
│   │   │   ├── AnnotationCanvas/  # Canvas with drawing tools
│   │   │   ├── AnnotationPolygon/ # Polygon annotation rendering
│   │   │   ├── VirtualGallery/    # Virtual-scrolled image gallery
│   │   │   ├── Uploader/          # Google Drive upload dialog
│   │   │   ├── Sidebar/           # App & project sidebar
│   │   │   └── ui/                # Shared primitives
│   │   ├── contexts/        # Auth & app context
│   │   ├── hooks/           # Custom hooks (datasets, images, upload)
│   │   ├── pages/           # Route pages
│   │   │   └── projects/pages/
│   │   │       ├── annotation/    # Annotation studio (canvas, tools)
│   │   │       ├── datasets/      # Dataset explorer & gallery
│   │   │       ├── dashboard/     # Project dashboard
│   │   │       └── ...
│   │   ├── store/           # Zustand state management
│   │   └── utils/           # Supabase client, project mapping
│   ├── .npmrc
│   └── package.json
├── backend/                # FastAPI server
│   ├── app/
│   │   ├── api/routes/     # Route handlers (health, projects)
│   │   ├── core/           # Config, settings
│   │   ├── db/             # Database session & base
│   │   └── models/         # SQLAlchemy models (User)
│   ├── alembic/            # Migrations
│   └── .env.example
├── docker-compose.yml      # Postgres 16 (dev)
├── Makefile
└── .github/workflows/
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

Opens at `http://localhost:5173`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
APP_NAME=AML_Platform-backend
ENVIRONMENT=local
API_PREFIX=/api
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=sqlite:///./dev.db
```

Create a `frontend/.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

## Key Features

### Annotation Studio
- **6 tools**: Select, Pan, Bounding Box, Polygon, Brush, Eraser
- Keyboard shortcuts (V/H/B/P/W/E, [+/- zoom, Ctrl+Z/Y undo/redo)
- Annotation history with undo/redo (up to 50 steps)
- Resizable left/right panels with class list and properties
- Hover highlighting, drag/resize existing annotations
- Locked annotation support

### Dataset Management
- Create, rename, delete datasets
- Image gallery with virtual scrolling (supports thousands of images)
- Search by class label, filter by status
- Click-to-annotate from gallery

### Image Upload (Google Drive)
- OAuth 2.0 via Google Identity Services
- Resumable upload to Google Drive
- Metadata stored in Supabase (`dataset_images` table)
- Images served via Google's CDN thumbnail URL
- Upload progress tracking and cancellation

### Authentication
- Supabase Auth (email/password)
- Google OAuth sign-in
- Protected routes and row-level security

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

### Backend

| Command                          | Description            |
| -------------------------------- | ---------------------- |
| `uvicorn main:app --reload`      | Dev server             |
| `mypy .`                         | Type check             |
| `alembic upgrade head`           | Run migrations         |
| `alembic revision --autogenerate -m "message"` | New migration |

### Docker (Postgres)

```powershell
docker compose up -d postgres    # Start Postgres
docker compose down              # Stop Postgres
```

## Routes

| Route        | Page                     | Description                          |
| ------------ | ------------------------ | ------------------------------------ |
| `dashboard`  | Dashboard                | Stats, charts, activity feed         |
| `projects`   | ProjectsView             | Project grid with search/filter      |
| `datasets`   | DatasetsView             | Dataset explorer & image gallery     |
| `annotation` | AnnotationStudio         | Canvas annotation (bbox/polygon/brush) |
| `workflow`   | WorkflowBuilder          | Visual pipeline builder (React Flow) |
| `auth/*`     | AuthFlow                 | Login, signup, onboarding, invite    |

## Database Schema

### `datasets`
Stores dataset metadata per project.

| Column        | Type      | Notes                        |
|---------------|-----------|------------------------------|
| id            | UUID      | Primary key                  |
| project_id    | TEXT      | References projects(id)      |
| name          | TEXT      |                              |
| image_count   | INTEGER   | Incremented on upload        |
| class_count   | INTEGER   | Populated during annotation  |
| tags          | TEXT[]    |                              |
| storage_bytes | BIGINT    |                              |

### `dataset_images`
Stores per-image metadata linked to Google Drive.

| Column       | Type      | Notes                              |
|--------------|-----------|------------------------------------|
| id           | UUID      | Primary key                        |
| dataset_id   | UUID      | FK to datasets(id)                 |
| file_name    | TEXT      |                                    |
| file_url     | TEXT      | `lh3.googleusercontent.com/d/{id}` |
| width/height | INTEGER   | Currently placeholder (0)          |
| class_labels | TEXT[]    | Populated during annotation        |

Row-level security (RLS) policies restrict access to the owning user's projects.

## Code Conventions

- **Variables & functions** — `snake_case`
- **Booleans** — prefix with `is_`, `has_`, `can_` (`is_dark_mode`)
- **No `null`** — use `undefined`
- **No `console.log`** — use `console.warn`, `console.error`, or `console.info`
- ESLint enforces these rules automatically.

## CI

Pushes/PRs to `main` trigger:

- **Frontend** — `pnpm install --frozen-lockfile` → lint → format check → build
- **Backend** — `pip install` → `mypy .`
