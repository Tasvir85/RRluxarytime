import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Sparkles, Monitor, Tablet, Smartphone, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudioHeader } from "./dashboard";
import { ModelViewer } from "@/components/studio/ModelViewer";
import { SiteTemplate } from "@/components/studio/SiteTemplate";
import { generate3D } from "@/lib/generation.functions";
import {
  BACKGROUNDS, BUCKET, SLOTS, SLOT_LABELS, TEMPLATES, formatBytes, resolveModelUrl, siteConfig,
  validateGlb, validateImage, type ProductImage, type Project, type SiteConfig, type Slot,
} from "@/lib/projects";

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

function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
  });
}

function useModelUrl(p: Project | null | undefined) {
  return useQuery({
    queryKey: ["model-url", p?.id, p?.model_path, p?.model_url],
    enabled: !!p && p.model_status === "ready",
    queryFn: () => resolveModelUrl(p!),
  });
}

function ProjectPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useProject(id);
  return (
    <div className="min-h-screen bg-background">
      <StudioHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← All projects</Link>
        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading project…</p>}
        {!isLoading && !data && <p className="mt-6">This project doesn't exist or you don't have access.</p>}
        {data && (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold">{data.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[data.brand_name, data.product_name, data.category].filter(Boolean).join(" · ")} · {data.status}
                </p>
              </div>
              <PublishBar project={data} />
            </div>
            <Tabs defaultValue="details" className="mt-8">
              <TabsList className="flex-wrap">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="model">3D model</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="details"><DetailsTab project={data} /></TabsContent>
              <TabsContent value="photos"><PhotosTab project={data} /></TabsContent>
              <TabsContent value="model"><ModelTab project={data} /></TabsContent>
              <TabsContent value="website"><WebsiteTab project={data} /></TabsContent>
              <TabsContent value="preview"><PreviewTab project={data} /></TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}

function useSave(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Project>) => {
      const { error } = await supabase.from("projects").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

function PublishBar({ project }: { project: Project }) {
  const save = useSave(project.id);
  const published = project.status === "published";
  const canPublish = project.model_status === "ready";
  return (
    <div className="flex items-center gap-3">
      {published && (
        <Link to="/site/$slug" params={{ slug: project.slug }} target="_blank" className="flex items-center gap-1 text-sm text-gold">
          /site/{project.slug} <ExternalLink className="h-3 w-3" />
        </Link>
      )}
      <Button
        disabled={save.isPending || (!published && !canPublish)}
        title={!canPublish ? "Add a 3D model first" : undefined}
        onClick={() =>
          save.mutate(
            published
              ? { status: "draft", published_at: null }
              : { status: "published", published_at: new Date().toISOString() },
            { onSuccess: () => toast.success(published ? "Unpublished" : "Your site is live") },
          )
        }
      >
        {published ? "Unpublish" : "Publish"}
      </Button>
    </div>
  );
}

function DetailsTab({ project }: { project: Project }) {
  const save = useSave(project.id);
  const [f, setF] = useState({
    name: project.name, brand_name: project.brand_name, product_name: project.product_name,
    category: project.category, template: project.template, description: project.description,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="mt-6 grid max-w-2xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.name.trim()) return toast.error("Project name is required.");
        save.mutate(f, { onSuccess: () => toast.success("Saved") });
      }}
    >
      {(["name", "brand_name", "product_name", "category"] as const).map((k) => (
        <div key={k} className="grid gap-1.5">
          <Label htmlFor={k}>{k.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}</Label>
          <Input id={k} value={f[k]} onChange={set(k)} />
        </div>
      ))}
      <div className="grid gap-1.5">
        <Label htmlFor="template">Style</Label>
        <select id="template" value={f.template} onChange={set("template")} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={f.description} onChange={set("description")} rows={4} />
      </div>
      <Button type="submit" disabled={save.isPending} className="w-fit">Save details</Button>
    </form>
  );
}

function PhotosTab({ project }: { project: Project }) {
  const qc = useQueryClient();
  const key = ["images", project.id];
  const { data: images = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("product_images").select("*").eq("project_id", project.id);
      if (error) throw error;
      const withUrls = await Promise.all(
        (data as ProductImage[]).map(async (img) => {
          const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(img.path, 3600);
          return { ...img, url: s?.signedUrl ?? "" };
        }),
      );
      return withUrls;
    },
  });
  const [busy, setBusy] = useState<Slot | null>(null);

  async function upload(slot: Slot, file: File) {
    const v = await validateImage(file);
    if ("error" in v) return toast.error(v.error);
    setBusy(slot);
    try {
      const { data: u } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${u.user!.id}/${project.id}/${slot}/${Date.now()}.${ext}`;
      const existing = images.find((i) => i.slot === slot);
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      if (existing) {
        await supabase.storage.from(BUCKET).remove([existing.path]);
        await supabase.from("product_images").delete().eq("id", existing.id);
      }
      const { error } = await supabase.from("product_images").insert({
        project_id: project.id, slot, path, filename: file.name, size: file.size,
        width: v.dims!.width, height: v.dims!.height,
      });
      if (error) throw error;
      toast.success(`${SLOT_LABELS[slot]} photo uploaded`);
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(img: ProductImage) {
    await supabase.storage.from(BUCKET).remove([img.path]);
    const { error } = await supabase.from("product_images").delete().eq("id", img.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">
        {images.length}/5 photos · JPG, PNG or WebP, up to 10 MB, at least 400×400px.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {SLOTS.map((slot) => {
          const img = images.find((i) => i.slot === slot);
          return (
            <div key={slot} className="rounded-lg border border-border p-3">
              <p className="eyebrow mb-2">{SLOT_LABELS[slot]}</p>
              <label className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60">
                {img?.url ? <img src={img.url} alt={SLOT_LABELS[slot]} className="h-full w-full object-cover" /> : <Upload className="h-5 w-5" />}
                {busy === slot && <span className="absolute inset-0 grid place-items-center bg-background/70 text-xs">Uploading…</span>}
                <input
                  type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`Upload ${SLOT_LABELS[slot]} photo`}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(slot, f); e.target.value = ""; }}
                />
              </label>
              {img && (
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{img.width}×{img.height} · {formatBytes(img.size)}</span>
                  <button aria-label="Remove photo" onClick={() => remove(img)} className="hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModelTab({ project }: { project: Project }) {
  const save = useSave(project.id);
  const qc = useQueryClient();
  const gen = useServerFn(generate3D);
  const { data: url } = useModelUrl(project);
  const [busy, setBusy] = useState<string | null>(null);

  async function uploadGlb(file: File) {
    setBusy("Checking model…");
    const err = await validateGlb(file);
    if (err) { setBusy(null); return toast.error(err); }
    setBusy("Uploading model…");
    try {
      const { data: u } = await supabase.auth.getUser();
      const path = `${u.user!.id}/${project.id}/model/${Date.now()}.glb`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: "model/gltf-binary" });
      if (error) throw error;
      if (project.model_path) await supabase.storage.from(BUCKET).remove([project.model_path]);
      await save.mutateAsync({
        model_path: path, model_url: null, model_source: "upload", model_status: "ready",
        model_filename: file.name, model_size: file.size,
      });
      toast.success("Model ready");
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setBusy("Generating 3D model…");
    try {
      await gen({ data: { projectId: project.id } });
      toast.success("3D model generated (sample model)");
    } catch (e) {
      toast.error((e as Error).message || "Generation failed");
    } finally {
      qc.invalidateQueries({ queryKey: ["project", project.id] });
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-6">
        <div className="rounded-lg border border-border p-4">
          <p className="eyebrow mb-2">Option A · From photos</p>
          <p className="mb-3 text-sm text-muted-foreground">Uses your 5 photos. For now this uses a sample model while real AI generation is being connected.</p>
          <Button onClick={generate} disabled={!!busy}><Sparkles className="mr-2 h-4 w-4" />Generate 3D product</Button>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="eyebrow mb-2">Option B · Upload GLB</p>
          <p className="mb-3 text-sm text-muted-foreground">A .glb file up to 50 MB.</p>
          <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
            <Upload className="mr-2 h-4 w-4" />Choose .glb file
            <input type="file" accept=".glb,model/gltf-binary" className="sr-only" aria-label="Upload GLB model" disabled={!!busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadGlb(f); e.target.value = ""; }} />
          </label>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Status: <span className="text-foreground">{busy ?? project.model_status}</span></p>
          {project.model_filename && <p>File: {project.model_filename} · {formatBytes(project.model_size)}</p>}
        </div>
      </div>
      <div className="h-[460px] rounded-lg border border-border" style={{ background: BACKGROUNDS.studio!.css }}>
        {url ? <ModelViewer url={url} className="h-full w-full" /> : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">No model yet</div>
        )}
      </div>
    </div>
  );
}

function WebsiteTab({ project }: { project: Project }) {
  const save = useSave(project.id);
  const [c, setC] = useState<SiteConfig>(() => siteConfig(project));
  useEffect(() => setC(siteConfig(project)), [project.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const text = (k: keyof SiteConfig, label: string, area = false) => (
    <div className="grid gap-1.5">
      <Label htmlFor={k}>{label}</Label>
      {area ? (
        <Textarea id={k} rows={3} value={c[k] as string} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
      ) : (
        <Input id={k} value={c[k] as string} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
      )}
    </div>
  );
  return (
    <form className="mt-6 grid max-w-2xl gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate({ config: c as never }, { onSuccess: () => toast.success("Website saved") }); }}>
      {text("logoText", "Logo text")}
      {text("headline", "Headline")}
      {text("subheadline", "Subheadline")}
      <div className="grid grid-cols-2 gap-4">{text("ctaLabel", "Button label")}{text("ctaUrl", "Button link")}</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="primaryColor">Accent colour</Label>
          <Input id="primaryColor" type="color" value={c.primaryColor} onChange={(e) => setC({ ...c, primaryColor: e.target.value })} className="h-10 p-1" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="background">Background</Label>
          <select id="background" value={c.background} onChange={(e) => setC({ ...c, background: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            {Object.entries(BACKGROUNDS).map(([k, b]) => <option key={k} value={k}>{b.label}</option>)}
          </select>
        </div>
      </div>
      {text("story", "Product story", true)}
      {text("materials", "Materials & details", true)}
      <ListEditor label="Features" items={c.features.map((f) => [f.title, f.text])} placeholders={["Title", "Description"]}
        onChange={(v) => setC({ ...c, features: v.map(([title, text]) => ({ title, text })) })} />
      <ListEditor label="Specifications" items={c.specs.map((s) => [s.label, s.value])} placeholders={["Label", "Value"]}
        onChange={(v) => setC({ ...c, specs: v.map(([label, value]) => ({ label, value })) })} />
      <Button type="submit" disabled={save.isPending} className="w-fit">Save website</Button>
    </form>
  );
}

function ListEditor({ label, items, placeholders, onChange }: {
  label: string; items: [string, string][]; placeholders: [string, string]; onChange: (v: [string, string][]) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {items.map(([a, b], i) => (
        <div key={i} className="flex gap-2">
          <Input placeholder={placeholders[0]} value={a} onChange={(e) => onChange(items.map((it, j) => (j === i ? [e.target.value, it[1]] : it)))} />
          <Input placeholder={placeholders[1]} value={b} onChange={(e) => onChange(items.map((it, j) => (j === i ? [it[0], e.target.value] : it)))} />
          <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...items, ["", ""]])}>Add</Button>
    </div>
  );
}

const DEVICES = [
  { id: "desktop", icon: Monitor, w: "100%" },
  { id: "tablet", icon: Tablet, w: "820px" },
  { id: "mobile", icon: Smartphone, w: "390px" },
] as const;

function PreviewTab({ project }: { project: Project }) {
  const { data: url } = useModelUrl(project);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const w = DEVICES.find((d) => d.id === device)!.w;
  return (
    <div className="mt-6">
      <div className="mb-4 flex gap-2">
        {DEVICES.map((d) => (
          <Button key={d.id} variant={device === d.id ? "default" : "outline"} size="sm" onClick={() => setDevice(d.id)} aria-label={`${d.id} preview`}>
            <d.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <div className="mx-auto max-h-[80vh] overflow-auto rounded-lg border border-border" style={{ width: w, maxWidth: "100%" }}>
        <SiteTemplate project={project} modelUrl={url ?? null} />
      </div>
    </div>
  );
}
