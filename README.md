# AML Platform

A computer vision platform — manage datasets, annotate images with AI-assisted tools, train YOLO/SAM models, and build ML workflows.

## Tech Stack

| Layer      | Stack                                                           |
| ---------- | --------------------------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite 8, Tailwind CSS 4, Konva (canvas)   |
| Backend    | Python 3.12+, FastAPI, SQLAlchemy, Alembic, Ultralytics (YOLO), SAM 2.1 |
| Database   | SQLite (dev), PostgreSQL (prod), Supabase (auth + storage)      |
| Storage    | Google Drive API (image upload, CDN thumbnails), Supabase       |
| CI         | GitHub Actions — frontend (pnpm) + backend (pip)                |

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (only pnpm — npm/yarn will refuse to install)
- **Python** 3.12+
- **Ultralytics** — auto-downloads YOLO11n on first training run (requires internet)
- **(Optional)** Docker Desktop for local Postgres
- **Google Cloud** project with Drive API enabled (for image upload)
- **Supabase** project (for auth, database, and RLS)

## Project Structure

```
aml_platform/
├── frontend/               # React SPA (pnpm)
│   ├── src/
│   │   ├── api/            # API clients (training, annotations, classes, export)
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
│   │   ├── api/routes/     # Route handlers (health, projects, annotations, training, classes, export)
│   │   ├── core/           # Config, settings
│   │   ├── db/             # Database session & base
│   │   ├── models/         # SQLAlchemy models (TrainingRun, Annotation, ClassLabel)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── training/       # YOLO training orchestrator (background thread)
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
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env -Force
uvicorn app.main:app --reload
```

Health check: `GET http://127.0.0.1:8000/api/health`

> Tables are auto-created on first request (no Alembic migration needed for dev).

### 2) Frontend

```powershell
cd frontend
pnpm install
pnpm run dev
```

Opens at `http://localhost:5173`.

> **Note:** The annotation studio, training runs, and export features require the backend server to be running. Without it, annotations and training operations will not be saved.

## Environment Variables

### Backend (`backend/.env`)

Copy from `backend/.env.example`:

```env
APP_NAME=AML_Platform-backend
ENVIRONMENT=local
API_PREFIX=/api
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=sqlite:///./dev.db
```

**Google Service Account** — required only as a fallback when OAuth fails:

| Option | Value |
|--------|-------|
| Inline JSON | `GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}` |
| File path | `GOOGLE_SERVICE_ACCOUNT_KEY=./vizlabel-498314-d6b987d88174.json` |

**Google OAuth 2.0** — required for image upload to Drive (has storage quota):

| Variable | Description |
|----------|-------------|
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth client ID from Google Cloud Console |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Refresh token for offline access (obtained once) |

OAuth replaces the service account because service accounts have zero Drive storage quota.
To obtain the refresh token:

1. Create an OAuth 2.0 Client ID (Desktop app type) in Google Cloud Console
2. Add `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` to `.env`
3. Run `python -c "from app.utils.google_drive_auth import interactive_auth; interactive_auth()"` from `backend/`
4. Follow the URL, authorise, paste the code — it saves the refresh token to `drive_token.json`
5. Copy `google_drive_refresh_token` from that file into `.env`

> The backend uses OAuth first, falling back to service account if the refresh fails.

### Frontend (`frontend/.env.local`)

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
- Classes synced to backend (survives cache clears)
- **Backend required** — annotations are persisted to SQLite via the FastAPI server

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

### Training Pipeline
- **YOLO11n** model training via Ultralytics
- **SAM 2.1** fine-tuning (mask decoder only, BCE + Dice loss)
- Background thread with live progress (epoch count, accuracy, loss)
- Per-epoch metrics chart (mAP50 accuracy + loss curve)
- 70/15/15 train/val/test split (test held for evaluation)
- Training cancellation support
- Model weights saved locally (`backend/models/<run_id>/best.pt`)

### AI Segmentation (SAM 2.1 / SAM 3)

- **SAM 2.1** — Interactive segmentation with point/box prompts; automatic full-image mask generation
- **SAM 3** — Text-prompted automatic segmentation (e.g. "car", "building", "tree")
- Thread-safe single-model inference
- Mask data stored as COCO RLE in the backend database

#### SAM 3 Prerequisites

1. **Hugging Face token** — SAM 3 is a gated model. Accept the license at
   [facebook/sam3](https://huggingface.co/facebook/sam3), then authenticate using one of:

   ```powershell
   # Method 1 — CLI login (persistent, recommended)
   huggingface-cli login
   ```

   ```env
   # Method 2 — Environment variable (backend/.env)
   HF_TOKEN=hf_your_token_here
   ```

2. **Model download** (~4.5 GB) — Automatically downloaded to Hugging Face cache on first use
   (`~/.cache/huggingface/hub/models--facebook--sam3/`). One-time download, cached forever.

#### How to Use

1. Open an image in the **Annotation Studio**
2. Select the **Auto-Detect** tool
3. Choose **SAM 3** from the model selector
4. (Optional) Enter a text prompt — describes what to detect (e.g. "car", "person")
   — Leave blank to fall back to the currently selected class name
5. Click **Run Detection** — masks are generated and added as polygon annotations

### YOLO Export
- Export annotations + images as a YOLO-format ZIP
- Includes `data.yaml`, normalized `.txt` labels, and split folders
- Can be used externally (e.g., Google Colab, local training)

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
| `uvicorn app.main:app --reload`  | Dev server (required for annotation & training) |
| `mypy .`                         | Type check             |
| `alembic upgrade head`           | Run migrations         |
| `alembic revision --autogenerate -m "message"` | New migration |

### Makefile (root)

| Target            | Description                      |
| ----------------- | -------------------------------- |
| `lint-backend`    | Ruff check + MyPy                |
| `format-backend`  | Ruff format                      |
| `install-backend` | Create venv + install deps       |
| `run-backend`     | Uvicorn dev server               |
| `migrate-backend` | Alembic upgrade                  |
| `db-up`           | Docker compose Postgres          |
| `db-down`         | Docker compose stop              |

### Docker (Postgres)

```powershell
docker compose up -d postgres    # Start Postgres
docker compose down              # Stop Postgres
```

## Routes

| Route                    | Page                     | Description                              |
| ------------------------ | ------------------------ | ---------------------------------------- |
| `dashboard`              | Dashboard                | Stats, charts, activity feed             |
| `projects`               | ProjectsView             | Project grid with search/filter          |
| `datasets`               | DatasetsView             | Dataset explorer & image gallery         |
| `annotation/:imageId`    | AnnotationStudio         | Canvas annotation (bbox/polygon/brush)   |
| `training`               | TrainingPage             | Training runs, progress, metrics, export |
| `models`                 | ModelsPage               | Trained model management (mock)          |
| `deployment`             | DeploymentPage           | Model deployment (mock)                  |
| `workflow`               | WorkflowBuilder          | Visual pipeline builder (React Flow)     |
| `auth/*`                 | AuthFlow                 | Login, signup, onboarding, invite        |

### Backend API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/projects` | List projects |
| GET/POST/DELETE | `/api/annotations/{image_id}` | Image annotations CRUD |
| POST | `/api/annotations/batch` | Batch annotation save |
| GET/PUT | `/api/classes/{dataset_id}` | Class labels CRUD |
| PUT | `/api/classes/{dataset_id}/reorder` | Reorder class indices |
| GET/POST/PATCH/DELETE | `/api/training/{project_id}[/{run_id}]` | Training runs CRUD |
| POST | `/api/training/{project_id}/{run_id}/start` | Start training |
| GET | `/api/training/{project_id}/{run_id}/weights` | Download model weights |
| POST | `/api/datasets/export/yolo` | YOLO format export |
| POST | `/api/inference` | YOLO inference |
| POST | `/api/segmentation/{project_id}/predict` | SAM 2.1 prediction |

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

### `annotations`
Stores image annotations per image.

| Column       | Type      | Notes                                |
|--------------|-----------|--------------------------------------|
| id           | TEXT      | UUID primary key                     |
| image_id     | TEXT      | References dataset_images(id)        |
| type         | TEXT      | `bbox`, `polygon`, `brush`           |
| class_id     | TEXT      | References class_labels(id)          |
| coordinates  | TEXT      | JSON — percentage coords (0–100)     |
| metadata     | TEXT      | JSON — brush points, opacity, etc.   |
| created_at   | DATETIME  |                                      |
| updated_at   | DATETIME  |                                      |

### `training_runs`
Stores model training jobs per project.

| Column        | Type      | Notes                                |
|---------------|-----------|--------------------------------------|
| id            | INTEGER   | Auto-increment primary key            |
| project_id    | TEXT      | References projects(id)              |
| dataset_id    | TEXT      | References datasets(id)              |
| name          | TEXT      |                                      |
| model_type    | TEXT      | e.g. `Object Detection (YOLO)`       |
| epochs        | INTEGER   |                                      |
| status        | TEXT      | `queued`, `Running`, `Completed`, `Failed` |
| accuracy      | REAL      | Final mAP50 (0–1)                    |
| loss          | REAL      | Final loss value                     |
| current_epoch | INTEGER   | Live progress                        |
| duration      | TEXT      | Formatted string (e.g. `00h 05m 23s`) |
| metrics       | TEXT      | JSON — per-epoch accuracy/loss array |
| error_message | TEXT      |                                      |
| created_at    | DATETIME  |                                      |
| started_at    | DATETIME  |                                      |
| completed_at  | DATETIME  |                                      |

### `class_labels`
Stores class definitions per dataset (synced between frontend and backend).

| Column     | Type      | Notes                         |
|------------|-----------|-------------------------------|
| id         | TEXT      | UUID primary key              |
| dataset_id | TEXT      | References datasets(id)       |
| name       | TEXT      | Class name                    |
| color      | TEXT      | Hex color for display         |
| index      | INTEGER   | YOLO class index              |

## Git Ignored Files

These files are auto-generated and not committed:

| File / Directory           | Reason                                       |
|----------------------------|----------------------------------------------|
| `backend/dev.db`           | Local SQLite database (auto-created)         |
| `backend/models/`          | Trained model weights `.pt` files            |
| `backend/yolo11n.pt`      | Ultralytics base model (auto-downloaded)     |
| `backend/stderr.txt`       | Runtime log                                  |
| `backend/stdout.txt`       | Runtime log                                  |

Teammates should run the backend once — tables auto-create on the first request.

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
