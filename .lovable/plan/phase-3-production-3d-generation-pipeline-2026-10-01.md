# Phase 3 — Production 3D generation pipeline

Upgrade the existing Studio from a "click → sample bottle" demo into a real job-based pipeline. Everything that works today stays: projects, photos, GLB upload, viewer, website settings, preview, publish, public site. The sample bottle stays, clearly labelled "Sample model (demo provider) — not AI generated".

## What the user will see

**Photos tab**
- Each of the 5 photos gets a check badge: Front ✓, Back ✓ … or "Needs replacing" with a plain reason (blurry, too small, product cut off, duplicate of another view).
- A "Photo set" summary with consistency warnings (e.g. "The Back photo's colours differ noticeably from the others"). Warnings never block; the user can choose "Continue anyway".

**3D model tab (redesigned as a review studio, same look and feel)**
- Status line in plain words: Checking product photos → Generating 3D model → Processing model → Optimizing model → Ready for review → Approved / Generation failed.
- Progress bar that keeps going if the browser is closed; returning later shows the current state.
- Side-by-side review: the 5 photos next to the 3D viewer (rotate, zoom, pan, reset, fullscreen, preset angles Front / ¾ / Side / Back / Top).
- Quality badge: "Model ready" or "Model needs attention" with simple explanations; "Advanced details" reveals polygon count, materials, textures, file sizes, error codes.
- Buttons: Approve & use on website, Regenerate, Retry (on failure).
- Model versions list (v1, v2, v3…) showing source (Demo generator / Uploaded GLB), date, status, which one is active, and "Restore" for previous approved versions.
- Generation history: "Generation #2 — Completed — Model v1", "Generation #1 — Failed — photo quality".
- In-app notifications (toast + banner): "Your 3D model is ready for review." / "3D generation could not be completed…".

**GLB upload** goes through the same validate → optimize → review → approve path and becomes a model version like any other.

**Website / public site** always shows the active approved model. Switching the active version updates the live site instantly, no republish needed. Previous approved model is never lost when a new generation fails.

**Admin view** (`/admin/jobs`, only for accounts given the admin role): job ID, project, provider, status, started/completed, duration, failure reason, provider job ID, cost. Normal customers never see it.

## Not included (per your brief)
Billing, credits, subscriptions, agency mode, custom domains, analytics, email/SMS notifications, a real paid AI 3D provider. The real provider is a drop-in later: implement one file + add its key as a secret + set `THREED_PROVIDER`.

## Technical details

**Database (new)**
- `generation_jobs`: project, user, provider, status (QUEUED, ANALYZING, GENERATING, DOWNLOADING, VALIDATING, OPTIMIZING, READY_FOR_REVIEW, APPROVED, FAILED, CANCELLED), stage, progress, attempt, provider_job_id, input image refs, output model_version_id, error_code/message, metadata, estimated/actual cost, started/completed/failed timestamps.
- `model_versions`: project, version number, source (upload | mock | provider), provider, status, original_path, optimized_path, thumbnails jsonb, validation jsonb, optimization jsonb, quality (ready | attention), approved_at.
- `projects.active_model_version_id`; existing `model_*` columns kept and synced on activation so the current website code keeps working.
- `usage_events`: provider, type, job, estimated/actual cost, duration, status.
- `user_roles` + `has_role()` for the admin view.
- `product_images.analysis` jsonb for per-photo results.
- Transition guard in SQL (trigger) rejecting invalid state changes.
- RLS: owner-only for jobs/versions/usage; admins can read jobs; anon can read only the active version's optimized file of a published project. Storage layout `user/project/models/{version}/original.glb | optimized.glb | thumbs/*.webp`, policies updated accordingly.

**Background processing**
- `startGeneration` server function creates the job and returns immediately.
- `advanceJob(jobId)` step function moves a job one stage forward (calls provider status, downloads, validates, optimizes). Driven by two callers: the page's polling, and a server endpoint `/api/public/jobs/tick` run every minute by a scheduled database job, so work continues with the browser closed.
- Mock provider simulates a realistic async job (queued → processing over ~30s by timestamp), copies the sample GLB into storage as the "original", and is labelled as mock everywhere.
- Provider registry selected by `THREED_PROVIDER` env (default `mock`); keys only read server-side.

**Analysis, validation, optimization**
- Photo checks in the browser on upload: type/size/dimensions, blur (edge sharpness), product touching edges (cropping), perceptual-hash duplicates, colour-histogram consistency across the set. Results saved per photo.
- Model validation on the server with glTF-Transform (pure JS): format, size, meshes, triangle count, materials, textures, UVs, normals, bounding box/scale, missing resources, corruption.
- Optimization on the server: dedupe, prune unused, weld, quantize; original never overwritten. Texture resizing/compression and Draco are marked "pending" (need image tooling unavailable on the server runtime) and reported honestly in the optimization result.
- Thumbnails (5 angles) rendered in the browser from the viewer when a version reaches review, uploaded to storage, shown on dashboard cards.

**Verification**
Build/typecheck, then a browser walkthrough: upload photos → generate → close/reopen → review → approve → regenerate → restore v1 → GLB upload path → published site shows active model; second-user access check.
