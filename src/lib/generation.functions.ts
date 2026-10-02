import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { getProvider } from "@/services/3d/providers";

const projectInput = z.object({ projectId: z.string().uuid() });
const jobInput = z.object({ jobId: z.string().uuid() });
const versionInput = z.object({ projectId: z.string().uuid(), versionId: z.string().uuid() });
const uploadInput = z.object({
  projectId: z.string().uuid(),
  path: z.string().min(1).max(500),
  filename: z.string().trim().min(1).max(240),
  size: z.number().int().positive().max(50 * 1024 * 1024),
});

async function requireOwnedProject(
  supabase: SupabaseClient<Database>,
  projectId: string,
) {
  const { data, error } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (error || !data) throw new Error("Project not found or access denied.");
}

export const startGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireOwnedProject(context.supabase, data.projectId);
    const { count, error: imageError } = await context.supabase
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("project_id", data.projectId);
    if (imageError) throw new Error(imageError.message);
    if ((count ?? 0) < 5) throw new Error("Please upload all 5 product photos first.");

    const { data: running } = await context.supabase
      .from("generation_jobs")
      .select("id")
      .eq("project_id", data.projectId)
      .in("status", ["QUEUED", "ANALYZING", "GENERATING", "DOWNLOADING", "VALIDATING", "OPTIMIZING"])
      .maybeSingle();
    if (running) return { jobId: running.id };

    const { data: last } = await context.supabase
      .from("generation_jobs")
      .select("job_number")
      .eq("project_id", data.projectId)
      .order("job_number", { ascending: false })
      .limit(1);
    const provider = getProvider();
    const { data: job, error } = await context.supabase
      .from("generation_jobs")
      .insert({
        project_id: data.projectId,
        user_id: context.userId,
        job_number: (last?.[0]?.job_number ?? 0) + 1,
        provider: provider.id,
        estimated_cost: provider.estimatedCost,
      })
      .select("id")
      .single();
    if (error || !job) throw new Error(error?.message ?? "Generation couldn't be started.");
    await context.supabase.from("projects").update({ model_status: "processing" }).eq("id", data.projectId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { advanceJob } = await import("@/services/3d/pipeline.server");
    const request = getRequest();
    await advanceJob(supabaseAdmin, job.id, request ? new URL(request.url).origin : "http://localhost:8080");
    return { jobId: job.id };
  });

export const advanceGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => jobInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: owned } = await context.supabase.from("generation_jobs").select("id").eq("id", data.jobId).maybeSingle();
    if (!owned) throw new Error("Generation job not found or access denied.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { advanceJob } = await import("@/services/3d/pipeline.server");
    const request = getRequest();
    await advanceJob(supabaseAdmin, data.jobId, request ? new URL(request.url).origin : "http://localhost:8080");
    return { ok: true };
  });

export const approveModelVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => versionInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireOwnedProject(context.supabase, data.projectId);
    const { data: version } = await context.supabase
      .from("model_versions").select("id").eq("id", data.versionId).eq("project_id", data.projectId).maybeSingle();
    if (!version) throw new Error("Model version not found or access denied.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { activateVersion } = await import("@/services/3d/pipeline.server");
    await activateVersion(supabaseAdmin, data.projectId, data.versionId);
    return { ok: true };
  });

export const processUploadedModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => uploadInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireOwnedProject(context.supabase, data.projectId);
    const expectedPrefix = `${context.userId}/${data.projectId}/models/`;
    if (!data.path.startsWith(expectedPrefix)) throw new Error("Invalid model storage path.");
    const { data: latest } = await context.supabase
      .from("model_versions").select("version").eq("project_id", data.projectId).order("version", { ascending: false }).limit(1);
    const { data: version, error } = await context.supabase.from("model_versions").insert({
      project_id: data.projectId,
      user_id: context.userId,
      version: (latest?.[0]?.version ?? 0) + 1,
      source: "upload",
      status: "validating",
      original_path: data.path,
      original_size: data.size,
      filename: data.filename,
    }).select("id").single();
    if (error || !version) throw new Error(error?.message ?? "The model version couldn't be created.");
    await context.supabase.from("projects").update({ model_status: "processing" }).eq("id", data.projectId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const download = await supabaseAdmin.storage.from("project-assets").download(data.path);
    if (download.error) throw new Error(download.error.message);
    const { processVersion } = await import("@/services/3d/pipeline.server");
    try {
      await processVersion(supabaseAdmin, version.id, new Uint8Array(await download.data.arrayBuffer()));
      return { versionId: version.id };
    } catch (cause) {
      await context.supabase.from("projects").update({ model_status: "failed" }).eq("id", data.projectId);
      throw cause;
    }
  });

/** Kept as a compatibility alias for older imports. */
export const generate3D = startGeneration;