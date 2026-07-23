# AML_Platform — Version 1.0 Weekly Progress Report

**Project Name:** AML_Platform (Advanced Machine Learning Platform)
**Team:** Nethphorn Tepbrathna, Hun Norahdinaro, Pheng Phearak Both
**Report Period:** Weeks 1–8 (May – July 2026)
**Current Status:** Production-Ready Core Features Implemented

---

## Executive Summary

AML_Platform is a comprehensive web-based image annotation and machine learning platform that handles both standard images and massive satellite imagery. Over 8 weeks we built a complete system supporting user authentication, dataset management, standard and satellite image annotation, AI-powered auto-segmentation (SAM 2.1 + SAM 3), Google Drive cloud storage integration, YOLO/SAM model training, and real-time dashboard analytics.

The platform is end-to-end functional: users upload images, annotate them manually or with AI assistance, train custom models on their annotations, and manage everything through an intuitive dashboard.

---

## Week 1: Foundation & Quality Infrastructure

### Frontend Architecture Refactoring
- **Clean folder structure**: `api/`, `hooks/`, `components/`, `pages/`, `store/`, `utils/`, `config/`, `constants/`
- **Shared API client** (`src/api/client.ts`): Axios instance with auth token interceptor, error handling (401, 403, 404, 429, 500)
- **Centralized navigation** (`src/config/navigation.ts`): adding a menu item takes one line
- **Extracted reusable components**: Header (`header.tsx`), Sidebar (`app_sidebar.tsx`, `project_sidebar.tsx`), Page Placeholder (`page_placeholder.tsx`)
- **Separated routing** with `RootLayout.tsx` and project sub-router (`ProjectRouter.tsx`)
- **Custom hooks for data fetching**: `use_dashboard_stats.ts`, `use_recent_projects.ts`, `use_keyboard_shortcuts.ts`, `use_projects.ts`, `use_datasets.ts`, `use_dataset_images.ts`, `use_alerts.ts`, and more (17 total)
- **Zustand store** (`projectStore.ts`): global project state with search, filter, sort, CRUD, pin/duplicate

### Quality Guardrails
- **Pre-commit hooks (Lefthook)** (`lefthook.yml`):
  - Prettier auto-format
  - ESLint checks: naming conventions (snake_case), complexity ≤ 15, nesting ≤ 2 levels, trailing whitespace, EOF fixer, YAML validation, large file detection
- **Pre-push checks**: TypeScript type-check (`tsc -b`), `pnpm audit` for security vulnerabilities
- **GitHub CI** (`.github/workflows/`):
  - `frontend-ci.yml`: `pnpm install --frozen-lockfile` → lint → format:check → build
  - `backend-ci.yml`: `pip install` → `mypy .`
- **Code conventions** (enforced by ESLint): `snake_case` variables/functions, boolean prefix (`is_`/`has_`/`can_`), no `null` (use `undefined`), no suppression comments, no `console.log`

### Authentication System (Supabase)
- **Sign-up**: full name, email, password with confirmation; social login (GitHub, Google)
- **Email verification** via 6-digit OTP with focused-input UX (auto-advance, paste support) and resend button
- **Full-screen loading** overlay while auth initializes (prevents flash of unauthenticated content)
- **Auth pages redirect** to `/home` when user is already signed in
- **Login**: email/password, social auth, one-click sign-out
- **Normalized error messages**: user-friendly strings for duplicate email, invalid credentials, expired OTP, etc.
- **Protected routes** with Row-Level Security (RLS)
- **Auth context** (`auth_context.tsx`): session management, Supabase auth integration

**Dependencies added**: `@supabase/supabase-js`, `@supabase/ssr`

---

## Week 2: Google Drive Integration & Database Design

### Client-Side Upload Pipeline
- **Browser-based upload** directly to Google Drive API — no backend server involved in upload pipeline
- **Resumable upload API** handles large files
- **AbortController support** for upload cancellation
- **Upload context** (`app_context.tsx`): uploader open/close, new project wizard, mobile menu
- **Upload components**: `Uploader/index.tsx`, `drag_drop_zone.tsx`, `file_item.tsx`, `upload_queue.tsx`, `upload_dialog.tsx`, `upload_footer.tsx`
- **Google OAuth hook** (`use_google_auth.ts`): Google Identity Services integration
- **Backend upload route** (`upload.py`): Drive upload with local caching + background Drive sync

### Database Schema (Supabase PostgreSQL)

| Table | Purpose | Key Columns |
|---|---|---|
| `projects` | Project metadata | id, user_id, name, type, status, drive_folder_id |
| `datasets` | Dataset metadata | id, project_id, name, image_count, class_count, tags, storage_bytes |
| `dataset_images` | Per-image metadata | id, dataset_id, file_name, file_url (Google CDN), class_labels, width, height |

- **Row-Level Security (RLS)**: users can only access their own project's data
- `image_count` auto-increments after each successful upload
- No local file storage — images served from Google's CDN (`lh3.googleusercontent.com/d/...`)

### FastAPI Local Database (SQLite / PostgreSQL)

| Table | Purpose |
|---|---|
| `annotations` | Per-image annotations (type, class_id, coordinates, metadata) |
| `class_labels` | Class definitions per dataset (name, color, YOLO index) |
| `training_runs` | Training job records (status, epochs, metrics, accuracy, loss) |
| `segmentation_masks` | SAM mask data (COCO RLE format) |
| `projects` | Mirrored from Supabase |
| `users` | Legacy user table |

- Tables auto-create on first request — no manual migration needed in development

### UI Optimization (40% Tailwind Reduction)
- Centralized styles in `src/styles/global.css`
- Extracted repeated Tailwind patterns into utility classes via `@apply`
- Standardized: `.btn-primary`, `.page-layout`, `.stat-card`, `.loading-spinner`
- Zero regressions — all linting checks and builds passed

---

## Week 3: Annotation Tool & Platform Refinement

### Unified Branding
- Application officially renamed to `AML_Platform`

### Smart Google Drive Sync
- Image uploads auto-route to user-specific Google Drive folders
- Real-time progress indicator for upload transparency
- Folder structure: `test_folder/{user_id}/{project_name}/{dataset_name}/`
- **Lazy folder creation**: project folder created on project creation, dataset subfolder on dataset creation
- **Folder IDs persisted** in `drive_folder_id` column on both `projects` and `datasets` tables
- **Google OAuth tokens persisted** in session storage with expiry handling to maintain sign-in across reloads

### Fire-and-Forget Upload (Background Drive Sync)
- Files saved to local server cache immediately, Drive upload runs concurrently in background
- Supabase initially receives a `cache://` URL so the UI is responsive
- Background task polls Drive completion via `GET /api/upload/drive/status` endpoint
- Real Drive `file_url` replaces `cache://` URL after Drive finishes — no re-insertion needed
- **"Processing..."** state shown after upload reaches 100% while Drive sync completes
- **Broken image window**: non-TIFF images may briefly show broken thumbnails until the real Drive URL arrives
- **Drive file deletion**: Google Drive files are also deleted when images are removed from a dataset

### Dataset Management Enhancements
- Fixed target dataset selection for adding images to existing sets
- Corrected image preview logic
- Enabled "Delete" button for individual image management
- Removed redundant Tag, Move, Zoom buttons (streamlined UI)

### Delete Project Dialog
- **Confirmation requires typing** the exact project name to enable the delete button (prevents accidental deletion)
- **Toast notifications** for deletion success and failure with auto-dismiss
- **Inline error feedback** and loading spinner during deletion
- **Enter key support** to confirm deletion (Shift+Enter prevents submission)

### TIFF Cover Photo Support
- Cover photos and upload previews for TIFF files handled via `src/utils/tiff.ts`
- `geotiff.js` reads the TIFF locally, renders the first band as a grayscale PNG thumbnail (≤200px), and returns a data URL
- TIFF detection and conversion in both project creation wizard and project card upload flows

### Annotation Workspace
- **6 tools**: Select, Pan, Bounding Box, Polygon, Brush, Eraser
- **Keyboard shortcuts**: V/H/B/P/W/E for tools, +/- zoom, Ctrl+Z/Y undo/redo
- **Annotation history**: undo/redo (up to 50 steps)
- **Dynamic image navigation**: prev/next controls, integrated sidebar for dataset browsing
- **Hover highlighting**, drag/resize, locked annotations
- **Resizable panels**: left panel (class list), right panel (properties)
- **Model selection dialog** for inference: user picks a model, predictions run and merge into annotations
- **Auto-detect flow**: predictions persisted into saved annotations; new class names auto-create missing classes

### Label Management
- Fully functional class management: add, edit, delete annotation classes
- System save via Supabase — annotations persisted to backend database
- Classes synced to backend (survives cache clears)

### Backend API Routes (12 route files)

| File | Endpoints | Purpose |
|---|---|---|
| `health.py` | `GET /api/health` | Health check |
| `projects.py` | `GET /api/projects` | List projects |
| `annotations.py` | `GET/POST/DELETE /api/annotations/{image_id}`, `POST /api/annotations/batch` | Annotation CRUD + batch save |
| `classes.py` | `GET/PUT /api/classes/{dataset_id}`, `PUT .../reorder` | Class labels CRUD + reorder |
| `training.py` | `GET/POST/PATCH/DELETE /api/training/{project_id}[/{run_id}]` | Training runs CRUD |
| `export.py` | `POST /api/datasets/export/yolo` | YOLO-format ZIP export |
| `inference.py` | `POST /api/inference` | YOLO inference |
| `segment.py` | `POST /api/segment` | SAM 2.1/SAM 3 segmentation |
| `segment.py` (legacy) | `POST /api/segmentation/{project_id}/predict` | SAM prediction (old path) |
| `upload.py` | Drive upload, status, folder creation, image deletion | Google Drive file management |
| `inference.py` | `POST /api/inference` | Run YOLO inference on an image |
| `cog.py` | COG info, render, tile, convert | Satellite imagery serving |

### Dashboard Accuracy & Analytics
- Home Page and Project Dashboard pull **live metrics from the database**
- Real-time statistics for datasets and project progress
- Full project deletion with associated metadata security
- **Backend RPC** (`supabase.rpc('get_bulk_project_stats')`): server-side aggregation for dashboard stats
- Recent projects show real image counts and annotation progress (annotated/total)
- Activity feed (`use_activity_feed.ts`) with real data
- Live alerts (`use_alerts.ts`): training failures, low accuracy, empty datasets, running jobs

---

## Week 5: Satellite Image Support & COG Rendering Pipeline

### Major Breakthrough: Satellite Image Support
Complete rendering pipeline for massive satellite images (GeoTIFFs, .TIF, .JP2):

- **Upload**: Satellite images upload through Google Drive like normal images; TIFFs auto-route to COG rendering pipeline
- **Server-side rendering** (`cog.py`): reads individual bands from GeoTIFFs, applies colormaps
- **8 Color Palettes** (`colormaps.ts`): Grayscale, Jet, Hot, Coolwarm, Viridis, Plasma, Inferno, Turbo (256-entry RGB LUT arrays)
- **Band selector** in annotation sidebar for multi-spectral visualization
- **Opacity controls** for overlaying multiple bands
- **Tile-based zooming**: only visible portion loaded — large files stay fast

### COG Rend Pipeline Architecture

```
User uploads .tif → Google Drive → Annotation page detects .tif URL
  → geotiff.js loads via HTTP Range requests
  → Renders to offscreen canvas with selected palette/band
  → Canvas → blob URL → loaded as Konva Image background
  → Annotations (bbox, polygon, brush) drawn on top
```

### Backend COG Routes (`cog.py`)
| Endpoint | Purpose |
|---|---|
| `GET /api/cog/info` | COG metadata (width, height, bands, min/max) |
| `GET /api/cog/render` | Full downscaled preview (max 2048×2048) |
| `GET /api/cog/tile/{z}/{x}/{y}.png` | 256×256 tile at specific zoom level |
| `POST /api/cog/convert` | TIFF-to-COG conversion |
| `GET /api/cog/files/{filename}` | Serve cached COG files |

### Frontend COG Hooks
| Hook | Purpose |
|---|---|
| `use_cog_background.ts` | Renders COG to blob URL for Konva background |
| `use_cog_layers.ts` | Manages overlay COG layers (add/update/remove) |
| `use_cog_image_info.ts` | Fetches COG image metadata |

### COG Canvas Components
| Component | Purpose |
|---|---|
| `cog_layer.tsx` | Konva layer for a single COG raster |
| `cog_tile_layer.tsx` | Tile-based Konva layer (map-style loading) |
| `types.ts` | `CogLayerInfo` interface |
| `layer_panel.tsx` | COG layer management panel |
| `satellite_panel.tsx` | Satellite imagery controls panel |
| `palette_dropdown.tsx` | Color palette selector |

### Project Creation Enhancements
- **2-Step Create Wizard** (`CreateProjectWizard/`):
  - Step 1: Name, description, project type, optional cover photo
  - Step 2: Create new dataset, pick existing, or skip
- **Better Project Cards**: type-specific icons (detection, segmentation, COG), hover animations, live image count, annotation progress
- **Pin/Unpin Projects**: saved to database

### COG Satellite Training Integration (`cog_utils.py`)
- **COG-to-RGB rendering**: tifffile → normalize bands → RGB PNG (up to 4096×4096)
- **Tiling**: split into 512×512 non-overlapping tiles (skip tiny edge tiles)
- **Annotation remapping**: convert percentage coords to tile-local coordinates, clip/warp annotations per tile
- **YOLO format**: bbox clipping, normalized label files per tile
- **SAM format**: polygon offset → OpenCV mask → COCO RLE per tile
- Modified `trainer_yolo.py` and `trainer_sam.py` to detect COG files and expand into tiles

---

## Week 7: SAM3 AI Integration & Tiled Rendering

### SAM3 Model Integration (Meta Segment Anything Model 3)
- **Text-prompted auto-segmentation**: enter prompt like "pedestrian crossing", "buildings", "cars"
- **Model selector** (`model_selector.tsx`): choose SAM 2.1 or SAM 3
- **Backend inference** (`segment_sam3.py`): loads `facebook/sam3` from HuggingFace (gated, ~4.5 GB)
- **Hugging Face token required**: `HF_TOKEN` in `backend/.env`
- **Mask-to-polygon conversion**: masks → GeoJSON polygons → rendered on annotation canvas
- **Thread-safe**: single-model inference, concurrent request handling

### SAM 2.1 Integration (`segment.py`)
- Interactive segmentation with point/box prompts
- Automatic full-image mask generation
- Mask data stored as COCO RLE in backend database

### SAM Training Pipeline Fixes
- **Checkpoint download**: replaced Facebook CDN URL (returning 403) with `hf_hub_download` from Hugging Face Hub (`ybelkada/segment-anything`)
- **Polygon → pixel mask conversion**: `_annotations_to_masks()` queries the `Annotation` table instead of the empty `SegmentationMask` table; converts percentage-based polygon coordinates to pixel-coordinate binary masks
- **COCO RLE decoding**: `rle_to_mask()` decodes both uncompressed arrays and compressed-string RLE via `pycocotools.mask`
- **Dependencies added**: `segment-anything`, `pycocotools>=2.0`

### Tiled Rendering for Massive Satellite Images (Google Maps-Style)
- **256×256 tile pyramid**: only loads visible tiles on screen
- **Overview pages**: reads smaller pre-built pyramid levels when zoomed out (1,000× data reduction)
- **In-memory caching**: once a page is read from disk, subsequent tiles use cached data (20–30 parallel tile requests)
- **Progressive loading**: blurry fallback from coarser zoom level at 60% opacity until sharp tiles arrive
- **Pre-fetching**: loads 2 rows/columns ahead of visible area for instant panning
- **Tile cleanup**: old tiles from distant zoom levels removed from memory (keeps ±2 zoom levels)
- **Zoom model**: level 1 = full image fits screen; tiles start loading at 200% zoom (level 2)

### Upload Performance Optimizations
- **Pre-caching during upload**: backend writes file bytes directly to local COG cache on receipt
- **Background Drive upload**: `asyncio.create_task` — returns immediately with `cache://` URL, Drive upload runs concurrently
- **Concurrent download prevention**: `asyncio.Event` per cache key ensures one download per URL
- **Annotation page feedback**: "Loading satellite image..." spinner during first COG render

### Band Selector UI Enhancement
- **Viewport button**: layers icon at top-right of canvas → dropdown with clickable band/palette options
- **Single-click selection**: removes intermediate dropdown-within-dropdown pattern
- **Dynamic bands**: dropdown shows Band 0, Band 1, etc. based on actual file band count
- **Proper state management**: `bg_band` as state variable instead of hardcoded 0

---

## Week 8: Platform Refinement & Alert System

### Global Search
- **Header search bar**: debounced (200ms) Supabase query searches projects + datasets by name
- **Dropdown results**: shows matching projects (blue badge) and datasets (green badge)
- **Type indicator**: right-aligned "Project" / "Dataset" badge on each result
- **Enter key**: navigates to `/projects` page
- **Empty store fallback**: fetches projects from Supabase when Zustand store is empty
- **Stale response guard**: `search_query_ref` prevents slow responses from overwriting newer results

### Notification/Alert System
- **Bell icon**: clickable, opens dropdown with system alerts
- **Alert types**: training failures (red), low accuracy (amber), running jobs (blue), empty datasets (amber)
- **Unviewed tracking**: blue dot only shows for unseen alerts — persists via `localStorage` scoped to user email key (`last_viewed_alert_ids_{email}`)
- **Live refresh**: listens to `upload-complete` and `datasets-changed` DOM events
- **Alert hook** (`use_alerts.ts`): checks training failures, running jobs, low accuracy (< 50%), empty datasets

### Header User Menu
- **User initials avatar** from `user_metadata.full_name`
- **Expanded dropdown** (w-72) with user info, Settings link (`/settings`), and Sign Out
- **Click-outside-to-close** behavior on menu dismissal

### Home Page Dashboard
- **Time-based greeting**: "Good morning/afternoon/evening, {name}"
- **Skeleton loading states** while data fetches
- **Empty state messages** when no projects or activity exist
- Activity feed (`use_activity_feed.ts`) merges dataset creation, uploads (grouped), and training runs sorted by timestamp (top 5)
- Dashboard stats use `supabase.rpc('get_dashboard_stats')` — counts `dataset_images` rows and sums `file_size_bytes` server-side via SECURITY DEFINER RPC
- Real-time subscriptions refresh stats on window refocus

### Annotation Save Improvements
- `save_image_class_labels()` calls `supabase.rpc('update_image_class_labels', ...)` — bypasses RLS
- Writes unique class IDs to `dataset_images.class_labels`; "Saved" only shown on full success
- Dispatches `CustomEvent('annotations-saved')` for cross-component refresh

### Project/Dataset Ownership Enforcement
- Search queries filter by authenticated user ID
- Dataset search scoped to user's project IDs (matching `use_alerts.ts` pattern)

---

## Technical Architecture Overview

### Frontend (React SPA)

| Component | Technology |
|---|---|
| Framework | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS 4 + Custom utility classes |
| Canvas | Konva.js (annotation drawing) |
| State Management | Zustand + React Context |
| Routing | React Router 7 |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | Supabase Auth |
| HTTP | Axios (custom API client) |

**File count**: ~145 TypeScript/TSX files

### Backend (FastAPI)

| Component | Technology |
|---|---|
| API | FastAPI (Python 3.12+) |
| Database | SQLAlchemy, SQLite (dev), PostgreSQL (prod) |
| Migrations | Alembic |
| ML | Ultralytics YOLO11n, SAM 2.1, SAM 3 (PyTorch) |
| Storage | Google Drive API (OAuth 2.0 + Service Account fallback) |
| Image Processing | geotiff.js, tifffile, GDAL/rio-cogeo |

**File count**: ~40 Python files

### Dual Database Pattern

| Database | Purpose |
|---|---|
| **Supabase** (PostgreSQL) | Auth, storage, project/dataset/image metadata, RLS |
| **SQLite/Postgres** (FastAPI) | Annotations, class labels, training runs, segmentation masks |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│               Frontend (React + Vite)                │
│  React 19 · TypeScript · Tailwind CSS 4 · Konva     │
│  Zustand · React Router 7 · Recharts · Lucide       │
│  Google Identity Services (OAuth)                   │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP (Axios)
┌──────────────────▼──────────────────────────────────┐
│               Backend (FastAPI)                      │
│  Python 3.12+ · SQLAlchemy · Alembic                │
│  Ultralytics (YOLO11n) · SAM 2.1/3 · PyTorch        │
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

---

## Features — Complete Inventory

### ✅ User Features
- [x] User registration with email verification (6-digit OTP + focused-input UX)
- [x] Social login (GitHub, Google)
- [x] Secure login/logout
- [x] Profile management
- [x] Full-screen loading during auth initialization
- [x] Auth pages redirect when already signed in
- [x] Normalized user-friendly error messages

### ✅ Dataset Management
- [x] Create, rename, delete datasets
- [x] Upload images (standard + satellite/GeoTIFF)
- [x] Fire-and-forget upload (cache:// URL immediate, Drive URL in background)
- [x] Upload status polling (`GET /api/upload/drive/status`)
- [x] "Processing..." state after upload reaches 100%
- [x] Delete images from datasets (including associated Drive files)
- [x] TIFF cover photo support (geotiff.js → grayscale PNG thumbnail)
- [x] Virtual-scrolled image gallery (supports thousands of images)
- [x] Search by class label, filter by status
- [x] Click-to-annotate from gallery

### ✅ Annotation Studio
- [x] 6 tools: Select, Pan, Bounding Box, Polygon, Brush, Eraser
- [x] Keyboard shortcuts
- [x] Annotation history with undo/redo (50 steps)
- [x] Resizable panels
- [x] Hover highlighting, drag/resize, locked annotations
- [x] Classes synced to backend (survives cache clears)
- [x] Image navigation (prev/next)
- [x] Model selection dialog for inference
- [x] Auto-detect flow: predictions merged into annotations
- [x] Automatic class creation for new inference results
- [x] Annotation save bypasses RLS via `update_image_class_labels` RPC

### ✅ AI Segmentation
- [x] SAM 2.1 interactive (point/box prompts)
- [x] SAM 2.1 automatic (full-image mask generation)
- [x] **SAM 3 text-prompted auto-segmentation** (via HuggingFace)
- [x] Mask data stored as COCO RLE

### ✅ Satellite Support (COG Pipeline)
- [x] Upload GeoTIFFs and large satellite images
- [x] Tile-based zooming (Google Maps style)
- [x] 8 color palettes (heatmap, NDVI, grayscale, etc.)
- [x] Band selector
- [x] Opacity controls
- [x] Progressive loading with blur placeholders
- [x] COG training integration (tiling + annotation remapping)

### ✅ Training Pipeline
- [x] YOLO11n training via Ultralytics
- [x] SAM 2.1 fine-tuning (mask decoder)
- [x] Background thread with live progress
- [x] Per-epoch metrics chart (mAP50 + loss)
- [x] 70/15/15 train/val/test split
- [x] Training cancellation
- [x] Model weights saved locally + download link
- [x] Satellite/COG training (tiled)
- [x] SAM checkpoint via Hugging Face Hub (fixed Facebook CDN 403)
- [x] Polygon → pixel-coordinate mask conversion for SAM training
- [x] COCO RLE mask decoding via `pycocotools`
- [x] Task-type-aware training (detect vs. segment)

### ✅ Dashboard & Analytics
- [x] Real-time dashboard stats via `supabase.rpc('get_dashboard_stats')`
- [x] Live annotation progress (annotated/total)
- [x] Recent projects with configurable result limit (default: 4)
- [x] Activity feed (merges dataset creation, uploads, training runs)
- [x] Time-based greeting on Home page
- [x] Skeleton loading states and empty-state messages
- [x] Auto-refresh on window refocus
- [x] Live alerts (training failures, low accuracy, empty datasets, running jobs)
- [x] Notification bell with unviewed tracking (`localStorage` scoped per user email)

### ✅ Google Drive Integration
- [x] OAuth 2.0 upload (resumable, cancellable)
- [x] OAuth tokens persisted in session storage with expiry
- [x] CDN thumbnail delivery (`lh3.googleusercontent.com/d/{drive_file_id}`)
- [x] Service account fallback for training and image access
- [x] Fire-and-forget upload with background Drive sync
- [x] Upload status polling endpoint
- [x] User-specific folder organization (`test_folder/{user_id}/{project_name}/{dataset_name}/`)
- [x] Lazy folder creation on project/dataset creation
- [x] Drive file deletion when images are removed from dataset

### ✅ Delete Project Dialog
- [x] Exact-name typing confirmation to enable deletion
- [x] Toast notifications for success/failure
- [x] Enter key to confirm (Shift+Enter prevents)
- [x] Loading spinner during deletion

### ✅ Model Weights & Export
- [x] YOLO-format ZIP export with `data.yaml`, normalized labels, split folders
- [x] Model weights download link for completed runs
- [x] Usable externally (Colab, local training)

### ✅ Header & Navigation
- [x] User initials avatar from profile name
- [x] Expanded user dropdown (Settings, Sign Out)
- [x] Click-outside-to-close behavior
- [x] Global search bar with debounced project/dataset lookup

### ✅ Quality & Infrastructure
- [x] ESLint with naming conventions, complexity limits
- [x] Prettier consistent formatting
- [x] Lefthook pre-commit/push hooks
- [x] GitHub CI (frontend + backend)
- [x] TypeScript strict mode
- [x] Centralized components and configuration
- [x] Dark/light theme
- [x] Hooks stop loading when unauthenticated + cancellation for stale updates

---

## Codebase Statistics

| Metric | Value |
|---|---|
| Frontend TypeScript/TSX files | ~145 |
| Backend Python files | ~40 |
| Configuration files | ~20 |
| Custom React hooks | 17 |
| Zustand stores | 1 |
| React contexts | 2 |
| API route files | 12 |
| SQLAlchemy models | 6 |
| Pydantic schemas | 7 |
| Training modules | 8 |
| Utility modules | 3 |
| Database migrations | 2 |
| CI workflow files | 2 |
| Documentation files | 6 |

---

## Configuration & Scripts

### Frontend Commands

| Command | Description |
|---|---|
| `pnpm run dev` | Start Vite dev server |
| `pnpm run build` | Production build (`tsc -b && vite build`) |
| `pnpm run lint` | ESLint check |
| `pnpm run format` | Prettier format |
| `pnpm run format:check` | Prettier check |
| `pnpm exec tsc -b` | TypeScript type-check |
| `pnpm run test` | Vitest unit tests |
| `pnpm run e2e` | Playwright E2E tests |

### Backend Commands

| Command | Description |
|---|---|
| `make run-backend` | Uvicorn dev server |
| `make lint-backend` | Ruff check + MyPy |
| `make format-backend` | Ruff format |
| `make migrate-backend` | Alembic upgrade |
| `make db-up` | Docker compose Postgres |
| `make db-down` | Docker compose stop |

### Key Config Files

| File | Purpose |
|---|---|
| `eslint.config.js` | ESLint: snake_case, no null, complexity ≤15, depth ≤2 |
| `.prettierrc` | Tabs, LF, single quotes, no trailing commas, no semicolons |
| `tsconfig.json` | Strict mode, ES2023 target, JSX react-jsx |
| `lefthook.yml` | Pre-commit: prettier + eslint; Pre-push: tsc + audit |
| `vite.config.ts` | React plugin, Tailwind, API proxy to localhost:8000 |
| `playwright.config.ts` | E2E tests on port 4173 |
| `.pre-commit-config.yaml` | Python pre-commit hooks |
| `docker-compose.yml` | Postgres 16 Alpine (dev) |
| `Makefile` | Backend convenience targets |

---

## Routes Map

### Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/login` | Login | Email/password + social login |
| `/signup` | SignUp | Registration with name, email, password |
| `/forgot` | ForgotPassword | Password recovery |
| `/home` | Home | Dashboard: stats grid, activity feed, alerts |
| `/dashboard` | Dashboard | Charts, stat cards, recent activity |
| `/settings` | Settings | User settings |
| `/projects` | ProjectsView | Project grid with search/filter/sort |
| `/projects/:id/dashboard` | ProjectDashboard | Per-project stats, progress, quick actions |
| `/projects/:id/datasets` | DatasetExplorer | Dataset gallery, search, create/delete/rename |
| `/projects/:id/annotation` | AnnotationStudio | Canvas with 6 tools + AI segmentation |
| `/projects/:id/training` | TrainingPage | Training runs, progress, metrics, export |
| `/projects/:id/models` | ModelsPage | Trained model management |

### Backend API Endpoints

| Method | Route | Description |
|---|---|---|
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
| POST | `/api/segment` | SAM segmentation |
| POST | `/api/upload/drive` | File upload to Drive |
| GET | `/api/cog/info` | COG metadata |
| GET | `/api/cog/render` | COG preview render |
| GET | `/api/cog/tile/{z}/{x}/{y}.png` | COG tile |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `APP_NAME` | AML_Platform-backend |
| `ENVIRONMENT` | `local` or `production` |
| `DATABASE_URL` | SQLite or PostgreSQL connection |
| `CORS_ORIGINS` | Allowed origins |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON or file path for Drive API (fallback) |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Refresh token for offline access |
| `HF_TOKEN` | HuggingFace token (SAM3 gated model) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `VITE_API_BASE_URL` | Backend URL (defaults to `/api` proxy) |

---

## GitHub CI/CD

| Workflow | Steps |
|---|---|
| **Frontend CI** | `pnpm install --frozen-lockfile` → lint → format:check → build |
| **Backend CI** | `pip install` → `mypy .` |

Both run on push/PR to `main`. PR protection blocks merge unless all checks pass.

---

## Known Issues & Technical Debt

| Issue | Status | Notes |
|---|---|---|
| Width/Height placeholder (0) during upload | Unresolved | Needs to be computed after upload completes |
| Google Drive API rate limits | Monitoring | Free tier limits apply for large uploads |
| SAM3 GPU requirements | Architecture constraint | Requires CUDA-capable GPU for optimal performance |
| COG processing time | Monitoring | Large satellite images can take minutes to convert |
| Cache URL not replaced with Drive URL | Backlog | Background Drive upload keeps `cache://` URL in Supabase |
| Broken image window on non-TIFF uploads | Backlog | Images briefly show broken thumbnails until Drive URL replaces `cache://` |
| Full overview page read on first tile | Backlog | Could optimize to read only overlapping internal tiles |
| No test files exist | Backlog | Playwright + Vitest configured but no tests written |

---

## Development Conventions

- **Variables & functions**: `snake_case`
- **Booleans**: prefix with `is_`, `has_`, `can_` (e.g., `is_dark_mode`)
- **No `null`**: use `undefined`
- **No `console.log`**: use `console.warn`, `console.error`, or `console.info`
- **No suppression comments**: `eslint-disable`, `ts-expect-error`, `@ts-ignore` not allowed
- **Config files**: never modify `eslint.config.js`, `tsconfig*.json`, `vite.config.ts`, `.prettierrc`, `.npmrc`, `lefthook.yml`, `Makefile`, `docker-compose.yml`, or `.github/` files
- **Lint/Build must pass**: always run `pnpm run lint`, `pnpm run build`, `pnpm run format` before committing

---

## Next Steps

### Immediate Priorities
1. Complete testing suite (unit + E2E)
2. Fix width/height computation during upload
3. Replace `cache://` URLs with real Drive URLs after background sync

### Future Features (Weeks 9+)
- **Model Training Pipeline**: full end-to-end training from annotated datasets
- **Team Collaboration**: shared projects, roles, permissions
- **Deployment & Scalability**: production environment setup
- **Advanced Analytics**: richer dashboard metrics and reporting
- **Batch Processing**: bulk annotation and export
- **Annotation Refinement Tools**: manual mask editing, curve adjustments

---

*Report prepared by AML_Platform Team — July 2026 — Version 1.0*
