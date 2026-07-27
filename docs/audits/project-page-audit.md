# Project Page Audit

> Generated: 2026-07-09
> Context: Full audit of the project page sections (Dashboard, Datasets, Models, Training, Deployment, Workflow, Annotation)

---

## Overall Architecture

The project page is served by `ProjectRouter.tsx` (143 lines), which conditionally renders a `ProjectSidebar` + main content area. Six sub-pages are routed via manual URL path parsing (not nested `<Route>` components): **Dashboard, Datasets, Models, Training, Deployment, Workflow**, plus an **Annotation Studio** that replaces the sidebar entirely.

### Cross-cutting issues

1. **Sub-route detection uses fragile manual path-splitting** instead of React Router's `useMatch` or nested `<Route>` components. A URL structure change would silently break navigation.

2. **`APP_CONTEXT.Provider` is inside the route element** in `App.tsx`, re-mounting on every route change and causing unnecessary re-renders.

3. **Function-call components everywhere** — `stat_card()`, `create_dataset_dialog()`, `toast_bar()`, `empty_runs_state()` etc. are called as plain functions, not JSX. They have no lifecycle, hooks, or context access.

---

## 1. Dashboard (`pages/dashboard/index.tsx`, 164 lines)

### Current State
- 8 stat cards in a 4-column grid: Images, Annotation Progress, Datasets, Classes, Annotations, Project Type, Members, Storage Used
- Quick Actions card (Create Datasets ✓, Start Annotation ✓, Export Dataset ❌ no-op)
- Team Members card (renders nothing when empty — leaves a blank gap)
- Uses `use_project_stats` hook (real data), plus `project` prop from ProjectRouter

### Issues

| Issue | Why It Matters |
|-------|---------------|
| **"Export Dataset" action is a no-op** (`on_click: () => {}`) | Users expect actions to work. Dead button erodes trust. |
| **Team Members card hides completely when empty** (`return undefined`) | Creates a visual gap in the grid. Should show "No members yet." |
| **8 stat cards in 4-col grid = 2 rows of 4** | Last row looks unbalanced; missing a card for "Active Models" or "Recent Activity" to make 9, or use a more flexible layout. |
| **`project.datasetCount` fallback may be stale** | Falls back to the Zustand store value which could be outdated if not refreshed recently. |
| **No navigation breadcrumb** | User must use sidebar to navigate elsewhere; no visual hint of where they are within the project. |
| **No recent training runs widget** | Users must manually navigate to Training to see if a run completed. |
| **No inline help or onboarding hints** | New users see 8 numbers with no explanation of what they mean or what to do next. |

### Opportunities
- Replace the "Export Dataset" stub with a real export flow (reuse `export_yolo()` from `training/index.tsx`)
- Add a "Recent Training Runs" mini-widget (last 3 runs with status badge and accuracy)
- Replace the linear stat grid with a more visual layout: highlight Annotation Progress as a large circular progress ring
- Add dataset creation as an inline form instead of a dialog overlay

---

## 2. Datasets (`pages/datasets/index.tsx`, 584 lines)

### Current State
Two views: dataset list (grid/table toggle) and dataset explorer (opens VirtualGallery). CRUD with rename/delete dialogs. Search + filter + grid/list toggle. Toast notifications.

### Issues

| Issue | Why It Matters |
|-------|---------------|
| **Search filters on every keystroke with no debounce** | For large datasets, re-filtering on every keypress wastes CPU. |
| **Empty search results show no CTA** | "No datasets match your search" with no "Clear filters" button — dead end. |
| **Dialog patterns duplicated inline** (`rename_dialog`, `delete_dialog`) | Same overlay/modal structure repeated 3x in the same file. |
| **Delete confirmation lacks Escape key handler** | Tab can escape the modal (no focus trap). |
| **`mousedown` listener added on every `menu_open` change** | Heavy — should use a single delegated listener. |
| **Toast notifications stack infinitely** | No limit on visible toasts. 10+ rapid operations bury the screen. |
| **No bulk image operations** | Users must select images one by one in the gallery. No "select all" or batch delete. |

### Opportunities
- Add debounce (250ms) to the search input
- Extract a shared `ConfirmDialog` component for rename/delete dialogs
- Add a toast cap (max 3-5 visible, oldest auto-dismisses)
- Add a dropdown bulk action bar when images are selected (Delete, Download, Move to Dataset)
- Show a dataset summary card (total images, total storage, last updated) at the top of each dataset row

---

## 3. Models (`pages/models/index.tsx`, 149 lines)

### Current State
Static grid of `SUPPORTED_MODELS` constants with status badges (Available/Coming Soon). "Select Model" navigates to Training page. Search bar + Filter + "New Model" are non-functional stubs.

### Issues

| Issue | Why It Matters |
|-------|---------------|
| **Entirely hardcoded data** | No API integration — models come from a constant file. Any new model requires a code deploy. |
| **"New Model" and "Filter" buttons are stubs** | They render as interactive buttons but do nothing. Confusing and erodes trust. |
| **No loading/error state** | Since data is hardcoded, there's no error handling or loading pattern for when a real API is added. |
| **"Models" implies management, but it's only a picker** | No way to view model details, version history, or performance metrics. |
| **No custom model upload** | Users who train custom models (via Training page) cannot see them here. |

### Opportunities
- Replace hardcoded constants with a real API fetch for supported models
- Show user-trained models alongside pre-built ones
- Add "View Details" per model — show architecture, expected accuracy, training time estimates
- Remove or implement the stub buttons

---

## 4. Training (`pages/training/index.tsx`, 1033 lines)

### Current State
Full training job lifecycle: create, monitor (with 3s polling), delete, and download weights. Stat cards (Active Jobs, Avg Accuracy, Avg Loss, Total GPU Hours). Table with expandable SVG mini-charts for accuracy/loss. 3s polling for active runs.

### Issues

| Issue | Why It Matters |
|-------|---------------|
| **1033 lines — easily the most complex file** | Mixes rendering, data fetching, business logic, export, SVG chart generation, and dialog state. |
| **3-second polling with no pause when tab is hidden** | Wastes API calls when the user is on another tab. |
| **No pagination — all runs render at once** | Projects with 100+ training runs will cause a slow table. |
| **Duplicate Supabase query** for project task type (also fetched in ProjectRouter) | Redundant network call. |
| **Duplicate image fetch logic** in `perform_create` and `perform_export` | Same Supabase query, same mapping. |
| **`compute_stats` regex for duration parsing is fragile** | A duration like `3d 12h` would break it. |
| **SVG mini-charts are fixed 200x80** | Not responsive. |
| **No confirmation dialog before deleting a training run** | Accidental deletion is permanent. |
| **Dialog passes 12+ individual state setters** as props | Refactoring nightmare. |

### Opportunities
- Extract the training dialog into a separate component with its own state management
- Extract `perform_create` and `perform_export` into `api/training.ts`
- Add pagination to the training runs query
- Add `visibilitychange` listener to pause polling when tab is hidden
- Add a "Refresh" manual button alongside the auto-polling
- Replace raw SVG mini-charts with a small Recharts sparkline component
- Add run comparison — select 2-3 completed runs and overlay their accuracy/loss charts

---

## 5. Deployment (`pages/deployment/index.tsx`, 240 lines)

### Current State
Static table of 5 hardcoded mock deployments. Search bar (partial filtering), stub "New Deployment" and "Filter" buttons. `MoreVertical` icons are decorative (no click handler).

### Issues

| Issue | Why It Matters |
|-------|---------------|
| **100% hardcoded mock data** | Not connected to any real deployment system. The entire page is decorative. |
| **"New Deployment" and "Filter" buttons do nothing** | Two non-functional buttons on a single page. |
| **`MoreVertical` icons have opacity-0 group-hover:opacity-100 but no click handler** | Users see an icon and expect an action; nothing happens. |
| **No loading, empty, or error states** | Even as a mockup, there's no pattern for when real data is introduced. |

### Opportunities
- Replace with a real integration or remove the page if deployment isn't implemented yet
- If keeping as a placeholder: remove the stub buttons, show a banner "Deployment coming soon"

---

## 6. Workflow (`pages/workflow/index.tsx`, 428 lines)

### Current State
React Flow canvas with 3 hardcoded nodes (Data Source → LLM Inference → Response). Properties panel. Simulated execution with fake setTimeout delays. No save/load.

### Issues

| Issue | Why It Matters |
|-------|---------------|
| **100% hardcoded mock data** | Not connected to any workflow engine. Execution is a `setTimeout` animation. |
| **Node label editing mutates a local snapshot** — doesn't update node state | Editing a node name appears to work but resets on re-render. |
| **No save/load functionality** | Any custom nodes/edges are lost on page refresh. |
| **`mouse_square` SVG icon is defined twice** (as named function and as `const MOUSE_SQUARE`) | Dead code. |
| **No ability to add new nodes from the toolbar** | Users can only interact with the 3 initial nodes. |

### Opportunities
- Complete the feature or remove it
- If implementing: connect to a real workflow backend, add a node palette/toolbar, add save/load with Supabase persistence

---

## 7. Annotation Studio (`pages/annotation/index.tsx`, 1003 lines)

### Current State
Three-panel layout with resizable panels, top toolbar, left tool panel, center canvas, right properties/layers panel, bottom filmstrip. Full annotation toolset (BBox, Polygon, Brush, Auto-Segment). Undo/redo history stack (50 steps). Model inference integration.

### Issues

| Issue | Why It Matters |
|-------|---------------|
| **1003 lines — very long file** | Mixes rendering, data fetching, business logic in a single file. |
| **`handle_segment_click` and `handle_sam_auto_segment`** have near-identical polygon processing logic | Could be extracted to a shared function. |
| **`render_canvas_content` takes 25+ individual props** | Could be refactored to accept a single configuration object. |
| **No confirmation dialog when navigating away with unsaved changes** | Users can lose work by accidentally clicking Back. |
| **The properties panel uses hardcoded resolution calculation** (`(ann.x / 100) * 800` assumes 800x600 base) | Incorrect for non-standard image sizes. |
| **`classes` debounce timeout could fire after unmount** | Potential memory leak or state update on unmounted component. |

### Opportunities
- Extract sub-components from `index.tsx` into separate files
- Add `beforeunload` + React Router `useBlocker` for unsaved changes
- Use actual image dimensions from the loaded image
- Clean up debounce timeout in useEffect cleanup

---

## Cross-Cutting Issues

| Issue | Pages Affected | Why It Matters |
|-------|---------------|---------------|
| **No keyboard navigation on card grids** | ProjectsView, Models, Training table | Excludes keyboard-only users |
| **No focus management on route change** | All pages | Screen readers don't know the page changed |
| **No `useMemo` on filtered/sorted arrays** | ProjectsView, Datasets, Models, Training | Unnecessary re-computation on every render |
| **Function-call components instead of JSX** | ALL pages | No React lifecycle, no hooks, no context |
| **No shared `ConfirmDialog` component** | Datasets, Training, ProjectsView | Same pattern repeated 5+ times |
| **No `aria-current="page"` on sidebar** | Sidebar components | Screen readers can't identify the active page |
| **Stale-while-refresh absent** | ALL hooks | No caching; re-fetches on every mount |

---

## Suggested New Features

| Feature | Page | Why It Matters |
|---------|------|---------------|
| **Inline quick-start wizard** (first-time user sees "Upload images → Annotate → Train → Deploy" stepper) | Dashboard | Reduces time-to-first-value for new users |
| **Training run comparison view** (select 2+ completed runs, overlay charts) | Training | Users need to compare model versions to pick the best one |
| **Image-level search in datasets** (search by annotation label, filename) | Datasets | Essential for finding specific images in large datasets |
| **Batch annotation mode** (apply same class to multiple images at once) | Annotation | Speeds up repetitive annotation tasks |
| **Deployment metrics dashboard** (inference latency, request count, error rate) | Deployment | Users need to monitor deployed models in production |
| **Smart defaults and templates** (pre-configured model+dataset pairs for common tasks) | Training | Reduces setup time for standard use cases |
| **Export to multiple formats** (COCO, Pascal VOC, YOLO, TFRecord) | Datasets | Different downstream tools require different formats |

---

## Implementation Priority

| Priority | Effort | Change | Status |
|----------|--------|--------|--------|
| **P0** | Low | Fix dynamic Tailwind classes in all project pages (broken hover styles) | ✅ Done |
| **P0** | Low | Remove stub buttons or make them functional | ❌ |
| **P0** | Medium | Code-split project sub-pages with `React.lazy()` | ❌ |
| **P1** | Low | Add `useMemo` to filtered/sorted lists | ❌ |
| **P1** | Low | Add keyboard nav to card grids and context menus | ❌ |
| **P1** | Medium | Extract shared `ConfirmDialog` component | ❌ |
| **P1** | Medium | Add tab-visibility pause to Training polling | ❌ |
| **P2** | Low | Wire real data to Deployment page or replace with placeholder banner | ❌ |
| **P2** | Medium | Add pagination to Training runs | ❌ |
| **P2** | High | Full Workflow implementation or removal | ❌ |
| **P3** | Low | Training run comparison | ❌ |
| **P3** | Medium | Batch annotation tools | ❌ |
| **P3** | High | Real deployment integration | ❌ |
