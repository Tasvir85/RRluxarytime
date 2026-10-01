import { getProvider } from "./providers";
import { optimizeModel, validateModel } from "./model-processing.server";

const BUCKET = "project-assets";
type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
type Job = { id: string; project_id: string; user_id: string; provider: string; status: string; provider_job_id: string | null; started_at: string | null; metadata: unknown };

export const FRIENDLY: Record<string, string> = {
  NO_IMAGES: "Please upload all 5 product photos first.",
  IMAGE_QUALITY: "One or more photos need replacing before generation.",
  PROVIDER_UNAVAILABLE: "The 3D generation service is unavailable right now. Please try again later.",
  GENERATION_FAILED: "3D generation could not be completed. Please review the issue and try again.",
  PROVIDER_TIMEOUT: "3D generation took too long and was stopped. Please try again.",
  DOWNLOAD_FAILED: "We couldn't retrieve the finished model. Please try again.",
  INVALID_GLB: "The generated model is not valid.",
  OPTIMIZATION_FAILED: "We couldn't optimize the model.",
  STORAGE_FAILED: "We couldn't save the model. Please try again.",
  UNKNOWN: "Something went wrong. Please try again.",
};
const TIMEOUT_MS = 30 * 60 * 1000;

class PipelineError extends Error {
  constructor(public code: string, message?: string) { super(message ?? FRIENDLY[code] ?? code); }
}

async function setJob(admin: Admin, id: string, patch: Record<string, unknown>) {
  const { error } = await admin.from("generation_jobs").update(patch as never).eq("id", id);
  if (error) throw new PipelineError("UNKNOWN", error.message);
}

async function nextVersion(admin: Admin, projectId: string) {
  const { data } = await admin.from("model_versions").select("version").eq("project_id", projectId).order("version", { ascending: false }).limit(1);
  return (data?.[0]?.version ?? 0) + 1;
}

/** Validates + optimizes an already-stored original; never touches the original file. */
export async function processVersion(admin: Admin, versionId: string, bytes: Uint8Array) {
  const { data: v } = await admin.from("model_versions").select("*").eq("id", versionId).single();
  if (!v) throw new PipelineError("UNKNOWN", "Version not found");
  const validation = await validateModel(bytes);
  if (!validation.ok) {
    await admin.from("model_versions").update({ status: "failed", validation: validation as never, quality: "attention" }).eq("id", versionId);
    throw new PipelineError(validation.errors[0]?.code ?? "INVALID_GLB", validation.errors[0]?.message);
  }
  await admin.from("model_versions").update({ status: "optimizing", validation: validation as never }).eq("id", versionId);
  const { bytes: opt, result } = await optimizeModel(bytes);
  const optimizedPath = v.original_path!.replace(/original\.glb$/, "optimized.glb");
  const up = await admin.storage.from(BUCKET).upload(optimizedPath, opt, { contentType: "model/gltf-binary", upsert: true });
  if (up.error) throw new PipelineError("STORAGE_FAILED", up.error.message);
  await admin.from("model_versions").update({
    status: "review", optimization: result as never, optimized_path: optimizedPath, optimized_size: opt.byteLength,
    quality: validation.quality,
  }).eq("id", versionId);
  return { validation, result };
}

async function fail(admin: Admin, job: Job, e: unknown) {
  const code = e instanceof PipelineError ? e.code : "UNKNOWN";
  const message = e instanceof Error ? e.message : String(e);
  console.error("[pipeline] job failed", job.id, code, message);
  await admin.from("generation_jobs").update({ status: "FAILED", stage: "failed", error_code: code, error_message: message, failed_at: new Date().toISOString() }).eq("id", job.id);
  await admin.from("usage_events").insert({ user_id: job.user_id, project_id: job.project_id, job_id: job.id, provider: job.provider, generation_type: "image_to_3d", status: "failed",
    duration_ms: job.started_at ? Date.now() - Date.parse(job.started_at) : null });
}

/** Moves a job forward as far as it can right now. Safe to call repeatedly (polling or cron). */
export async function advanceJob(admin: Admin, jobId: string, origin: string) {
  const { data: job } = await admin.from("generation_jobs").select("*").eq("id", jobId).single();
  if (!job) return;
  const provider = getProvider(job.provider);
  try {
    if (job.status === "QUEUED") {
      await setJob(admin, job.id, { status: "ANALYZING", stage: "Checking product photos", progress: 5, started_at: new Date().toISOString() });
      const { data: imgs } = await admin.from("product_images").select("slot,path,analysis").eq("project_id", job.project_id);
      if (!imgs || imgs.length < 5) throw new PipelineError("NO_IMAGES");
      const bad = imgs.filter((i) => (i.analysis as { status?: string } | null)?.status === "error");
      if (bad.length) throw new PipelineError("IMAGE_QUALITY", `Please replace: ${bad.map((b) => b.slot).join(", ")}.`);
      const { data: p } = await admin.from("projects").select("brand_name,product_name,category,description").eq("id", job.project_id).single();
      const imageUrls = await Promise.all(imgs.map(async (i) => {
        const { data } = await admin.storage.from(BUCKET).createSignedUrl(i.path, 3600 * 6);
        return { slot: i.slot, url: data?.signedUrl ?? "" };
      }));
      const input = {
        projectId: job.project_id, imageUrls,
        product: { brand: p?.brand_name ?? "", name: p?.product_name ?? "", category: p?.category ?? "", description: p?.description ?? "" },
        instructions: "Create the most faithful 3D representation possible from the supplied product references. Preserve shape, proportions, colours, materials, surface finish, logos, labels, caps, buttons, handles and all visible details. Do not invent features that are not visible.",
      };
      let started;
      try { started = await provider.generate3DModel(input); } catch (e) { throw new PipelineError("PROVIDER_UNAVAILABLE", (e as Error).message); }
      await setJob(admin, job.id, { status: "GENERATING", stage: "Generating 3D model", progress: 10, provider_job_id: started.jobId,
        input_images: imgs.map((i) => ({ slot: i.slot, path: i.path })) as never });
      return advanceJob(admin, jobId, origin);
    }
    if (job.status === "GENERATING") {
      if (job.started_at && Date.now() - Date.parse(job.started_at) > TIMEOUT_MS) throw new PipelineError("PROVIDER_TIMEOUT");
      const s = await provider.getGenerationStatus(job.provider_job_id!);
      if (s.status === "failed" || s.status === "cancelled") throw new PipelineError(s.errorCode ?? "GENERATION_FAILED", s.error);
      if (s.status !== "ready") { await setJob(admin, job.id, { progress: 10 + Math.round(s.progress * 0.6) }); return; }
      await setJob(admin, job.id, { status: "DOWNLOADING", stage: "Processing model", progress: 72, actual_cost: s.actualCost ?? null });
      // fall through within this call
      const { url } = await provider.downloadModel(job.provider_job_id!);
      const res = await fetch(new URL(url, origin)).catch(() => null);
      if (!res?.ok) throw new PipelineError("DOWNLOAD_FAILED");
      const bytes = new Uint8Array(await res.arrayBuffer());
      const version = await nextVersion(admin, job.project_id);
      const { data: v, error: vErr } = await admin.from("model_versions").insert({
        project_id: job.project_id, user_id: job.user_id, version, source: provider.isMock ? "mock" : "provider", provider: provider.id,
        status: "validating", filename: provider.isMock ? "sample-product.glb" : `generated-v${version}.glb`, original_size: bytes.byteLength,
        metadata: { job_id: job.id, mock: provider.isMock } as never,
      }).select().single();
      if (vErr || !v) throw new PipelineError("STORAGE_FAILED", vErr?.message);
      const originalPath = `${job.user_id}/${job.project_id}/models/${v.id}/original.glb`;
      const up = await admin.storage.from(BUCKET).upload(originalPath, bytes, { contentType: "model/gltf-binary" });
      if (up.error) throw new PipelineError("STORAGE_FAILED", up.error.message);
      await admin.from("model_versions").update({ original_path: originalPath }).eq("id", v.id);
      await setJob(admin, job.id, { status: "VALIDATING", stage: "Checking model", progress: 80, model_version_id: v.id });
      await setJob(admin, job.id, { status: "OPTIMIZING", stage: "Optimizing model", progress: 90 });
      try { await processVersion(admin, v.id, bytes); }
      catch (e) { throw e instanceof PipelineError ? e : new PipelineError("OPTIMIZATION_FAILED", (e as Error).message); }
      await setJob(admin, job.id, { status: "READY_FOR_REVIEW", stage: "Ready for review", progress: 100, completed_at: new Date().toISOString() });
      await admin.from("usage_events").insert({ user_id: job.user_id, project_id: job.project_id, job_id: job.id, provider: provider.id, generation_type: "image_to_3d",
        status: "completed", estimated_cost: provider.estimatedCost, actual_cost: s.actualCost ?? null,
        duration_ms: job.started_at ? Date.now() - Date.parse(job.started_at) : null });
    }
  } catch (e) {
    await fail(admin, job as Job, e);
  }
}

/** Makes an approved version the project's active model (and syncs website fields). */
export async function activateVersion(admin: Admin, projectId: string, versionId: string) {
  const { data: v } = await admin.from("model_versions").select("*").eq("id", versionId).eq("project_id", projectId).single();
  if (!v) throw new Error("Model version not found");
  if (v.status !== "review" && v.status !== "approved") throw new Error("This model version can't be used.");
  const now = new Date().toISOString();
  if (v.status !== "approved") await admin.from("model_versions").update({ status: "approved", approved_at: now }).eq("id", versionId);
  const { error } = await admin.from("projects").update({
    active_model_version_id: versionId, model_path: v.optimized_path ?? v.original_path, model_url: null,
    model_source: v.source === "upload" ? "upload" : "mock", model_status: "ready",
    model_filename: v.filename, model_size: v.optimized_size ?? v.original_size,
  }).eq("id", projectId);
  if (error) throw new Error(error.message);
  await admin.from("generation_jobs").update({ status: "APPROVED", stage: "Approved" }).eq("model_version_id", versionId).eq("status", "READY_FOR_REVIEW");
}
