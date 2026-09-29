import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudioHeader } from "./dashboard";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project — Aurum Studio" },
      { name: "description", content: "Edit your 3D product experience." },
      { property: "og:title", content: "Project — Aurum Studio" },
      { property: "og:description", content: "Edit your 3D product experience." },
    ],
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="min-h-screen bg-background">
      <StudioHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← All projects</Link>
        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading project…</p>}
        {!isLoading && !data && <p className="mt-6">This project doesn't exist or you don't have access.</p>}
        {data && (
          <>
            <h1 className="mt-4 font-display text-3xl font-bold">{data.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {[data.brand_name, data.product_name, data.category].filter(Boolean).join(" · ")} · {data.status}
            </p>
            <p className="mt-8 rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
              Photos, 3D model, website settings and publishing are coming next.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
