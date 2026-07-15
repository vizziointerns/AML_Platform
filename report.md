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
- **YOLO11n** training via Ultralytics (object detection)
- **SAM 2.1** fine-tuning (mask decoder only, BCE + Dice loss) (segmentation)
- **Satellite imagery training** — both YOLO and SAM trainers now support COG/GeoTIFF images
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
3. **Multi-band composites** — RGB composite from 3 separate bands instead of single-band pseudocolor
4. **Train on real satellite data** — run end-to-end training with a proper satellite dataset
5. **Overlapping tiles** — configurable stride for overlapping tile boundaries to improve edge detection

---

## COG Satellite Imagery — Training Integration

Satellite imagery training was the natural next step after getting annotation working. The core challenge: satellite images (GeoTIFF/COG files) are fundamentally different from regular photos — they're often gigabytes in size, multi-spectral, and can't be fed into models the same way as JPEGs. Here's what was involved.

### The Problem

The existing training pipeline (`trainer_yolo.py` and `trainer_sam.py`) worked like this:
1. Download each image from Google Drive (with a **10MB file size limit**)
2. Treat the downloaded file as a JPEG/PNG that OpenCV/PIL can read directly
3. Use annotation coordinates (stored as percentages of the full image) directly

This breaks for satellite imagery because:
- COG files are often **500MB–2GB** (well past the 10MB limit)
- They're **GeoTIFF format**, not JPEG/PNG — OpenCV can't read them directly
- They're **absolutely massive** (10,000×10,000 pixels or more) — models expect 512×512 or 256×256 inputs
- Annotations at 1% of 10,000px span many tiles — they need to be **clipped and remapped** per tile

### The Solution: `cog_utils.py`

We built a new module `backend/app/training/cog_utils.py` that sits between the raw data and the trainers. It handles three things:

**1. COG-to-RGB rendering**

Instead of downloading the raw TIFF (which is huge and multi-spectral), we:
- Download the COG with **no size limit** (removed the 10MB cap for COG files)
- Read it with `tifffile` to get the raw band data
- If the file has 3+ bands, use the first three as Red, Green, Blue channels
- If it has 1 band (e.g., grayscale), repeat it across all 3 channels
- **Normalize each channel independently** — satellite data often has wildly different value ranges per band
- Save as a standard RGB PNG file at up to 4096×4096 resolution

This gives us a regular image that any vision model can work with, while preserving the visual information from the satellite data.

**2. Tiling**

Even rendered to RGB, a 10,000×10,000 pixel image is too big for any model. We added automatic tiling:
- Split the rendered image into **512×512 pixel non-overlapping tiles**
- Skip tiny edge tiles (less than 25% of tile size)
- Each tile becomes its own training sample

This is a standard technique in satellite deep learning (often called "patchify"). A single satellite image might produce 100+ tiles.

**3. Annotation remapping**

This is the trickiest part. Annotations on a 10,000px-wide image are stored as percentages (e.g., "this building is at 45.5% X, 30.2% Y"). After tiling, each tile needs its own annotations — but only for objects that actually fall within that tile.

For each tile we:
- Convert all annotations from percentages to pixel coordinates on the full image
- Check which annotations overlap with the tile boundaries
- Skip annotations with less than 25% overlap with the tile (to avoid training on tiny slivers)
- Remap the overlapping portion to **tile-local coordinates** (X=0 at the tile's left edge)
- Normalize back to 0-1 range relative to the tile's dimensions

For YOLO (bounding boxes): we clip bbox coordinates to the tile and generate standard YOLO-format label lines.
For SAM (polygons): we offset polygon vertices by the tile position, fill a mask using OpenCV, and generate a COCO RLE-format mask per tile.

### How It Works in Practice

```
COG .tif file (500MB, 10000x10000, 4 bands)
       │
       ▼
download_cog() — no size limit, Drive service account auth
       │
       ▼
render_cog_to_rgb() — tifffile → normalize bands → RGB PNG
       │
       ▼
tile_image() — split into 512×512 tiles (up to ~400 tiles)
       │
       ▼
For each tile:
  ├── remap_annotations_to_tile_yolo() — clip bboxes to tile
  └── save tile PNG + YOLO .txt label file

       │
       ▼
Trainer (YOLO or SAM) receives tiles as if they were original images
```

### What Changed

| File | Change |
|---|---|
| `backend/app/training/cog_utils.py` | **New** — COG download, RGB render, tiling, annotation remapping |
| `backend/app/training/trainer_yolo.py` | Detects COG files, expands into tiles with per-tile YOLO labels |
| `backend/app/training/trainer_sam.py` | Detects COG files, expands into tiles with per-tile polygon masks |
| `frontend/src/constants/models.ts` | `get_model_for_task()` defaults to YOLO for COG projects; `get_training_task_types()` returns both detect+segment for COG |
| `frontend/src/pages/projects/pages/training/index.tsx` | Training dialog shows a dropdown to choose YOLO or SAM for COG projects |

### What This Enables

- **End-to-end satellite object detection** — annotate buildings, vehicles, ships, etc. on COG imagery → train a YOLO model on the tiles → deploy the model
- **End-to-end satellite segmentation** — annotate land cover, roads, water bodies as polygons → fine-tune SAM on the tiles → segment new satellite images
- **Mixed datasets** — regular JPEG images and COG TIFFs can coexist in the same dataset and training run
- **No external tools** — everything runs through the existing annotation studio and training pipeline. No QGIS, no GDAL, no separate tile servers.

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
