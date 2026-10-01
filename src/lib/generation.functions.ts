import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getProvider } from "@/services/3d/providers";

export const generate3D = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { count, error: cErr } = await sb
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("project_id", data.projectId);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) < 5) throw new Error("Please upload all 5 product photos first.");

    await sb.from("projects").update({ model_status: "processing" }).eq("id", data.projectId);
    const provider = getProvider("mock");
    try {
      const job = await provider.generate3DModel({
        projectId: data.projectId,
        imageUrls: [],
        product: { brand: "", name: "", category: "", description: "" },
        instructions: "",
      });
      const status = job.status === "ready" ? job : await provider.getGenerationStatus(job.jobId);
      if (status.status !== "ready" || !status.modelUrl) throw new Error(status.error || "Generation failed");
      const { error } = await sb
        .from("projects")
        .update({
          model_status: "ready",
          model_source: "mock",
          model_url: status.modelUrl,
          model_path: null,
          model_filename: "sample-product.glb",
          model_size: null,
        })
        .eq("id", data.projectId);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      await sb.from("projects").update({ model_status: "failed" }).eq("id", data.projectId);
      throw e;
    }
  });
