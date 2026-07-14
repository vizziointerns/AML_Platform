# Project Report: AML Platform (datature-clone)

## Overview

A full-stack computer vision platform for managing datasets, annotating images with AI-assisted tools, training YOLO/SAM models, and building ML workflows. The project is a clone of the Datature platform.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React + Vite)            │
│  React 19 · TypeScript · Tailwind CSS 4 · Konva     │
│  Zustand · React Router 7 · Ant Design · Recharts   │
│  Google Identity Services (OAuth)                   │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP (Axios)
┌──────────────────▼──────────────────────────────────┐
│                   Backend (FastAPI)                   │
│  Python 3.12+ · SQLAlchemy · Alembic                │
│  Ultralytics (YOLO11n) · SAM 2.1 · PyTorch          │
│  Google Service Account (Drive API)                 │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐    ┌────────────────────┐
│  Supabase    │    │  SQLite / Postgres  │
│  Auth        │    │  Annotations        │
│  Storage     │    │  Training Runs      │
│  Metadata    │    │  Class Labels       │
│  RLS         │    │  Segmentation      │
└──────────────┘    └────────────────────┘
```

### Dual Database Pattern

| Database | Purpose |
|----------|---------|
| **Supabase** (PostgreSQL) | Auth, storage, project/dataset/image metadata, RLS policies |
| **SQLite/Postgres** (FastAPI) | Annotations, class labels, training runs, segmentation masks |

Tables auto-create on first API request via `_ensure_table()` — no manual migration needed in development.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Konva, Zustand, React Router 7, Ant Design 6, Recharts, React Flow, Lucide React |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.x, Alembic, Ultralytics, SAM 2.1, PyTorch, httpx, PyJWT |
| Database | SQLite (dev), PostgreSQL 16 (prod), Supabase |
| Storage | Google Drive API (upload + CDN thumbnails), Supabase Storage |
| Auth | Supabase Auth (email/password, Google OAuth) |
| CI | GitHub Actions (pnpm + pip) |
| Package | pnpm 9+ (frontend), pip/venv (backend) |

---

## Project Structure

```
datature-clone/
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios API clients
│   │   ├── components/       # UI components (AnnotationBox, AnnotationCanvas,
│   │   │                     #   AnnotationPolygon, VirtualGallery, Uploader, Sidebar, ui)
│   │   ├── contexts/         # AuthProvider, AppProvider
│   │   ├── hooks/            # Custom hooks (datasets, images, upload, auth, shortcuts)
│   │   ├── pages/            # Route pages (AuthFlow, Dashboard, Projects/*,
│   │   │                     #   annotation, datasets, training, models, deployment, workflow)
│   │   ├── store/            # Zustand state (projectStore)
│   │   ├── utils/            # Supabase client, Google Drive utils, auth errors
│   │   ├── styles/           # Global CSS (Tailwind)
│   │   ├── config/           # Navigation config
│   │   └── constants/        # Model definitions, TaskType
│   └── ...
├── backend/
│   ├── app/
│   │   ├── api/routes/       # Route handlers (health, projects, annotations,
│   │   │                     #   classes, training, export, inference, segment)
│   │   ├── core/             # Config, settings (Pydantic)
│   │   ├── db/               # Database session, base model
│   │   ├── models/           # SQLAlchemy models (Project, Annotation, ClassLabel,
│   │   │                     #   TrainingRun, SegmentationMask, User)
│   │   ├── schemas/          # Pydantic schemas (request/response)
│   │   ├── training/         # Training orchestrators (YOLO, SAM), inference, segmentation
│   │   └── utils/            # Google service account auth
│   ├── alembic/              # Migrations
│   └── .env.example
├── docker-compose.yml        # Postgres 16 Alpine (dev)
├── Makefile                  # Backend convenience targets
├── README.md
└── AGENTS.md                 # AI agent development rules
```

---

## Features

### 1. Annotation Studio
- **6 tools**: Select, Pan, Bounding Box, Polygon, Brush, Eraser
- Keyboard shortcuts (V/H/B/P/W/E, +/- zoom, Ctrl+Z/Y undo/redo)
- Annotation history with undo/redo (up to 50 steps)
- Resizable left/right panels (class list, properties)
- Hover highlighting, drag/resize, locked annotations
- Classes synced to backend (survives cache clears)
- Backend required — annotations persisted to SQLite via FastAPI

### 2. Dataset Management
- Create, rename, delete datasets
- Virtual-scrolled image gallery (supports thousands of images)
- Search by class label, filter by status
- Click-to-annotate from gallery

### 3. Image Upload (Google Drive)
- OAuth 2.0 via Google Identity Services
- Resumable upload to Google Drive with progress tracking + cancellation
- Metadata stored in Supabase (`dataset_images` table)
- Images served via Google CDN thumbnail URL

### 4. Training Pipeline
- **YOLO11n** training via Ultralytics
- **SAM 2.1** fine-tuning (mask decoder only, BCE + Dice loss)
- Background thread with live progress (epoch count, accuracy, loss)
- Per-epoch metrics chart (mAP50 + loss curve)
- 70/15/15 train/val/test split
- Training cancellation support
- Model weights saved locally (`backend/models/<run_id>/best.pt`)

### 5. AI Segmentation (SAM 2.1)
- Interactive segmentation with point/box prompts
- Automatic segmentation (full-image mask generation)
- Thread-safe single-model inference
- Mask data stored as COCO RLE

### 6. YOLO Export
- Export annotations + images as YOLO-format ZIP
- Includes `data.yaml`, normalized `.txt` labels, and split folders
- Usable externally (Google Colab, local training)

### 7. Authentication
- Supabase Auth (email/password)
- Google OAuth sign-in
- Protected routes and row-level security

### 8. COG Satellite Imagery Support
- **Project type**: COG (Cloud Optimized GeoTIFF) selectable at project creation — separate from Detection/Segmentation projects
- **Upload**: `.tif` / `.tiff` files accepted in the same upload dialog as regular images
- **Client-side rendering**: geotiff.js loads COG files via HTTP Range requests, renders to offscreen canvas
- **Raster controls**: Right sidebar shows palette (8 colormaps), band selector, and opacity slider for the current image
- **Annotation on raster**: All annotation tools (bbox, polygon, brush, etc.) work on top of the rendered raster layer
- **Overlay COG layers**: Additional `.tif` URLs can be added as separate overlay layers on top of the background
- **Color palettes**: Grayscale, Jet, Hot, Coolwarm, Viridis, Plasma, Inferno, Turbo — defined as 256-entry RGB LUTs
- **Auto-min/max**: Per-band min/max computed automatically unless explicitly overridden
- **Status**: Implemented but untested with real satellite imagery (no access to sample files yet)

### 9. Workflow Builder
- Visual pipeline builder using React Flow
- Configurable ML workflow nodes

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `APP_NAME` | Application name |
| `ENVIRONMENT` | `local` or `production` |
| `API_PREFIX` | `/api` |
| `CORS_ORIGINS` | Allowed origins |
| `DATABASE_URL` | SQLite or PostgreSQL connection |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON content or file path for Drive API access |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `SUPABASE_DATABASE_URL` | Direct Postgres connection string |
| `CLOUDFLARE_*` | Cloudflare R2/D1 config (not actively used) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `VITE_GOOGLE_API_KEY` | Google API key |
| `VITE_API_BASE_URL` | Backend URL (defaults to `/api` proxy) |

## COG Satellite Imagery — Why COG?

Satellite imagery (GeoTIFF files) is fundamentally different from regular photos. A single satellite image can be **hundreds of megabytes to gigabytes** in size, with multiple spectral bands (red, green, blue, near-infrared, etc.). Normal image viewers and annotation tools can't handle these files — they'd crash trying to load the whole thing into memory.

**COG (Cloud Optimized GeoTIFF)** solves this by:
- **Loading only what you see** — Instead of downloading the entire massive file, COG reads just the pixels visible on your screen (via HTTP Range requests). Zoom in, and it loads higher resolution data for that area. Pan around, and it streams new tiles.
- **Working in a browser** — No need for desktop GIS software like QGIS or ArcGIS. Everything runs in the browser using geotiff.js, so users can view and annotate satellite imagery right where they do their regular annotation work.
- **Keeping the existing annotation tools** — Bounding boxes, polygons, brush masks, and all other annotation tools work on satellite imagery the same way they work on regular photos. The underlying file format is invisible to the user.
- **Multiple visualizations** — Switch between color palettes (grayscale, heat maps, vegetation indices) and spectral bands to highlight different features. This helps annotators identify roads, buildings, water bodies, vegetation, etc.
- **No tile server needed** — Traditional satellite imagery pipelines require a tile server (like TMS/WMS) to chop and serve tiles. COG skips that entirely — the browser reads the file directly.

In short: COG lets the platform handle **professional-grade satellite imagery** without needing any extra infrastructure, desktop software, or complex pipelines. It's the modern standard for distributing geospatial data on the web.

## COG Satellite Imagery — Implementation Details

### How It Works

```
User uploads .tif file
       │
       ▼
Google Drive (same as JPEG upload)
       │
       ▼
Annotation page detects .tif URL
       │
       ▼
geotiff.js loads via HTTP Range requests
       │
       ▼
Renders to offscreen canvas with selected palette/band
       │
       ▼
Canvas → blob URL → loaded as Konva Image background
       │
       ▼
Annotations (bbox, polygon, brush) drawn on top
```

### Key Files

| File | Purpose |
|---|---|
| `frontend/src/utils/cog.ts` | COG loading, metadata, rendering (geotiff.js), `is_tiff_url()` |
| `frontend/src/utils/colormaps.ts` | 8 color palettes as 256-entry RGB LUT arrays |
| `frontend/src/hooks/use_cog_background.ts` | Renders COG to blob URL for background display |
| `frontend/src/hooks/use_cog_layers.ts` | Manages overlay COG layers (add/update/remove) |
| `frontend/src/components/AnnotationCanvas/cog_layer.tsx` | Konva layer component for a single COG raster |
| `frontend/src/components/AnnotationCanvas/types.ts` | `CogLayerInfo` interface |
| `frontend/src/components/AnnotationCanvas/index.tsx` | Renders COG layers between background and mask layers |
| `frontend/src/pages/projects/pages/annotation/render.tsx` | `render_bg_raster_controls`, `render_satellite_layers_panel` |

### Next Steps

1. **Test with real COG files** — source from USGS, Sentinel Hub, or Hugging Face
2. **Thumbnail strip** — pre-render thumbnails for `.tif` files (currently shows empty for COG images)
3. **Training pipeline** — train models on satellite imagery (requires separate model config)
4. **Multi-band composites** — RGB composite from 3 separate bands instead of single-band pseudocolor

---

## Google Integration

### Client-Side (Google OAuth)
- **File**: `frontend/src/hooks/use_google_auth.ts`
- Uses Google Identity Services with `VITE_GOOGLE_CLIENT_ID`
- Access token stored in memory/localStorage for Drive API calls

### Server-Side (Service Account)
- **File**: `backend/app/utils/google_service_account.py`
- Generates OAuth 2.0 tokens via JWT assertion (RS256)
- Scope: `https://www.googleapis.com/auth/drive.readonly`
- Token cached in-memory for 30 minutes, auto-refreshed
- Used by training pipeline to download images from Google Drive
- Configured via `GOOGLE_SERVICE_ACCOUNT_KEY` env var

### Google Drive Folder Structure
```
test_folder/
  └── {user_id}/
      └── {project_name}/
          └── {dataset_name}/
```

---

## Database Schema

### Supabase Tables

| Table | Description |
|---|---|
| `projects` | Project metadata (id, name, user_id, drive_folder_id) |
| `datasets` | Dataset metadata (id, project_id, name, image_count, class_count, tags) |
| `dataset_images` | Image metadata (id, dataset_id, file_name, file_url, class_labels) |

### FastAPI Tables (auto-created)

| Table | Description |
|---|---|
| `projects` | Mirrored from Supabase with additional fields |
| `annotations` | Per-image annotations (type, class_id, coordinates, metadata) |
| `class_labels` | Class definitions per dataset (name, color, YOLO index) |
| `training_runs` | Training job records (status, epochs, metrics, accuracy, loss) |
| `segmentation_masks` | SAM mask data (COCO RLE format) |
| `users` | Legacy user table |

---

## Quick Start

### Prerequisites
- Node.js 20+, pnpm 9+
- Python 3.12+
- Docker Desktop (optional, for local Postgres)
- Google Cloud project with Drive API enabled
- Supabase project

### Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env -Force
# Edit .env with your credentials (Supabase, Google service account)
uvicorn app.main:app --reload
```

### Frontend
```powershell
cd frontend
pnpm install
pnpm run dev
```

### Verification
- Frontend: `http://localhost:5173`
- Backend: `GET http://127.0.0.1:8000/api/health`

---

## CI/CD

GitHub Actions runs on push/PR to `main`:

| Workflow | Steps |
|---|---|
| **Frontend CI** | `pnpm install --frozen-lockfile` → lint → format:check → build |
| **Backend CI** | `pip install` → `mypy .` |

---

## Development Notes

- **Code style**: snake_case for variables/functions, boolean prefix with `is_`/`has_`/`can_`, no `null` (use `undefined`)
- **No suppression comments**: eslint-disable, ts-expect-error, @ts-ignore not allowed
- **Lint/build must pass**: `pnpm run lint`, `pnpm run build`, `pnpm run format` before committing
- **Backend auto-creates tables**: No Alembic migration needed for dev — tables created on first request
- **TypeScript build**: `tsc -b && vite build` (configured in root scripts)
