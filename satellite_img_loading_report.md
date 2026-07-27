# Satellite Image Loading Report

## The Problem

Satellite imagery can be extremely large — often 500 MB or more per file, with
resolutions exceeding 50,000 × 40,000 pixels. Standard web browsers cannot
display images of this size directly; they run out of memory or freeze. Users
need to zoom in to see fine details (like individual buildings or vehicles),
but loading the entire high-resolution image at once is impractical.

Additionally, many satellite images are multi-spectral. A single TIFF file may
contain multiple bands (e.g., red, green, blue, near-infrared), each
representing different wavelengths. These bands need to be processed and
coloured before display, which adds computational cost.

## Architecture Overview

We implemented a **tiled rendering system** inspired by how Google Maps works.
Instead of loading one massive image, the image is divided into a grid of
smaller square "tiles". Only the tiles visible on screen are loaded at any
time. As the user zooms in, finer tiles are fetched to provide more detail.

The system has two main parts:

### 1. Backend (Python / FastAPI)

The backend is responsible for reading the original TIFF file and serving image
data in a browser-friendly format.

- **Render endpoint** (`/api/cog/render`): Returns a full downscaled preview
  (max 2048 × 2048 pixels) for quick viewing when zoomed out. This is the
  first thing the user sees when opening an image.

- **Tile endpoint** (`/api/cog/tile/{z}/{x}/{y}.png`): Returns a 256 × 256
  pixel PNG for a specific tile at a specific zoom level. The parameters
  `z`, `x`, `y` form a standard tile coordinate system — `z` is the zoom
  level, and `(x, y)` is the grid position.

#### Performance Optimisation

The original implementation read the **entire** TIFF file from disk for every
single tile request. For a 500 MB file, this meant decompressing roughly 100
MB of pixel data each time, making the system unusably slow.

We made two key improvements:

- **Overview pages**: Most TIFF files contain pre-built lower-resolution
  copies of the image (called overviews or pyramids). When the user is
  zoomed out, the backend reads from a smaller overview instead of the
  full-resolution data. For example, at the most zoomed-out level, it reads
  a 314-pixel-wide overview instead of the 10,050-pixel original — a
  1,000× reduction in data.

- **In-memory caching**: Once a page is read from disk, its pixel data is
  kept in memory. Subsequent tile requests for the same image reuse the
  cached data instantly. Since the front-end typically requests 20–30 tiles
  in parallel when the user zooms in, only the first request hits the disk.

### 2. Frontend (React / TypeScript)

The frontend renders tiles inside a Konva.js canvas, which handles zooming
and panning like a map application.

- **Zoom model**: Zoom level 1 = the entire image fits the screen. Higher
  values mean the image is magnified. Tiles only start loading when zoom
  reaches 200% (level 2), because below that the downscaled render looks
  good enough.

- **Tile computation**: For each frame, the frontend calculates which tiles
  are visible and which zoom level matches the current magnification. A
  continuous animation loop (`requestAnimationFrame`) detects viewport
  changes and triggers new tile downloads.

- **Progressive loading**: When the user zooms in, the exact tiles for the
  new zoom level may not have loaded yet. The frontend shows a "fallback"
  tile from a coarser zoom level, stretched to fill the space at 60%
  opacity. As the correct tiles arrive, they replace the blurry fallbacks
  — creating a smooth "blurry-to-sharp" transition.

- **Pre-fetching**: Tiles outside the visible area are also loaded (2 rows
  and columns ahead). This means panning the view feels instant because
  nearby tiles are already in memory.

- **Tile cleanup**: Old tiles from very different zoom levels are removed
  from memory to prevent the browser from running out of RAM. Tiles within
  2 zoom levels of the current view are kept for fast fallback.

### 3. Upload Pipeline

Getting the satellite image from the user's computer to the annotation canvas
involves several stages:

#### Drive Authentication (OAuth 2.0)

Initially, Google Drive access used a **service account**, which has no personal
storage quota — the account's 15 GB Drive was effectively useless. We switched
to **OAuth 2.0** with a refresh token stored in `.env`. This uses the
developer's personal Google Drive quota (15 GB for Google accounts).

When the backend starts, it uses the refresh token to obtain short-lived access
tokens. If the refresh token fails, it falls back to the service account.

#### Pre-Caching During Upload

Originally, when a TIFF was uploaded:
1. Upload to Drive (slow — network-bound)
2. Return Drive URL
3. User opens annotation page
4. COG endpoint downloads the 500 MB TIFF from Drive to local cache (slow —
   another network download)

This meant the **first load took minutes** — the backend had to download the
entire file from Drive before serving any tiles.

We fixed this by **pre-caching during upload**: the backend writes the file
bytes directly to the local COG cache directory as soon as they're received.
The annotation page's COG endpoint finds the file already on disk and serves
it instantly — no Drive download needed.

#### Background Drive Upload

Even with pre-caching, the upload endpoint blocked the response until the Drive
upload completed (potentially minutes for a 500 MB file on slow internet). The
frontend progress bar would reach 100% (bytes received by backend) and then
show "Processing..." indefinitely.

We moved the Drive upload to a **background `asyncio.create_task`**:

1. Backend receives bytes (milliseconds — localhost)
2. Writes to local cache (fast — disk-bound, ~1 second)
3. **Returns immediately** with a `cache://<hash>.tif` URL
4. Drive upload runs in the background concurrently
5. Frontend saves the `cache://` URL to Supabase — annotation page works
   immediately using the cached copy

The COG endpoint recognises `cache://` URLs and serves them directly from the
local disk without any download.

#### Concurrent Download Prevention

When multiple tile requests arrive for the same image simultaneously (typical
when zooming in), the backend uses `asyncio.Event` per cache key to ensure
only one download task runs per URL. Others wait on the event and reuse the
result.

#### Annotation Page Feedback

While the first COG render is processing (reading the TIFF overview into
memory), the annotation page shows a "Loading satellite image..." spinner so
the user knows the system is working.

## Results

Before the optimisations, zooming into a large satellite image took several
seconds per tile (or failed entirely). After implementing the tile system
with overview selection and caching:

- Zooming and panning are responsive, with tiles appearing progressively
- The first tile load takes ~1–2 seconds (reading the overview from disk);
  subsequent tiles load in milliseconds
- Uploads return in under 1 second (local cache write) instead of minutes
  (Drive upload)
- Memory usage stays under control: only visible tiles plus ~2 rows of
  pre-fetched tiles are kept
- Multi-band processing (e.g., NDVI visualisation) loads individual bands
  on demand without blocking the interface

## Remaining Work

- The backend still reads the entire overview page into memory, even when
  only a small region is needed. A future optimisation would read only the
  overlapping internal tiles from the TIFF file, reducing the initial load
  further.
- For extremely high zoom levels (beyond 1000%), the full-resolution page
  is required, which triggers a large read on the first request. This could
  be mitigated by streaming or progressive decoding.
- Background Drive upload does not update the Supabase `file_url` when
  complete — the record retains the `cache://` URL. A sync step is needed
  to replace it with the real Drive URL once the upload finishes.
