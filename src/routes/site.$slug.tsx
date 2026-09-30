import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveModelUrl } from "@/lib/projects";
import { SiteTemplate } from "@/components/studio/SiteTemplate";

export const Route = createFileRoute("/site/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Product experience" },
      { name: "description", content: "An interactive 3D product experience." },
      { property: "og:title", content: "Product experience" },
      { property: "og:description", content: "An interactive 3D product experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicSite,
});

function PublicSite() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["site", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const url = await resolveModelUrl(data).catch(() => null);
      if (typeof document !== "undefined") document.title = `${data.product_name || data.name} — ${data.brand_name}`;
      return { project: data, url };
    },
  });
  if (isLoading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!data)
    return (
      <div className="grid min-h-screen place-items-center text-center">
        <div>
          <p className="font-display text-2xl">This site isn't available.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground underline">Go home</Link>
        </div>
      </div>
    );
  return <SiteTemplate project={data.project} modelUrl={data.url} />;
}
