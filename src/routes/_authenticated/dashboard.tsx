import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, LogOut, Archive, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TEMPLATES, slugify, type Project } from "@/lib/projects";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your projects — Aurum Studio" },
      { name: "description", content: "Manage your 3D product experiences." },
      { property: "og:title", content: "Your projects — Aurum Studio" },
      { property: "og:description", content: "Manage your 3D product experiences." },
    ],
  }),
  component: Dashboard,
});

export function StudioHeader() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/dashboard" className="font-display text-sm font-bold tracking-[0.3em] uppercase">Aurum Studio</Link>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
      </div>
    </header>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, del }: { id: string; del: boolean }) => {
      const { error } = del
        ? await supabase.from("projects").delete().eq("id", id)
        : await supabase.from("projects").update({ status: "archived" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: () => toast.error("We couldn't update this project. Please try again."),
  });

  return (
    <div className="min-h-screen bg-background">
      <StudioHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-gold">Workspace</p>
            <h1 className="mt-2 font-display text-3xl font-bold">Your projects</h1>
          </div>
          <CreateProject />
        </div>

        {isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading projects…</p>}
        {error && <p className="mt-10 text-sm text-destructive">We couldn't load your projects. Please refresh.</p>}
        {projects && projects.length === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-border p-12 text-center">
            <p className="font-display text-xl">Create your first product experience.</p>
            <p className="mt-2 text-sm text-muted-foreground">Start a project, add photos and a 3D model, then publish.</p>
          </div>
        )}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <Link to="/projects/$id" params={{ id: p.id }} className="min-w-0">
                  <h2 className="truncate font-display text-lg font-semibold hover:underline">{p.name}</h2>
                  <p className="truncate text-sm text-muted-foreground">{[p.brand_name, p.product_name].filter(Boolean).join(" · ") || "No product details yet"}</p>
                </Link>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{p.status}</span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Created {new Date(p.created_at).toLocaleDateString()}</p>
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm"><Link to="/projects/$id" params={{ id: p.id }}>Open</Link></Button>
                {p.status !== "archived" && (
                  <Button size="sm" variant="ghost" aria-label="Archive" onClick={() => update.mutate({ id: p.id, del: false })}><Archive className="h-4 w-4" /></Button>
                )}
                <Button size="sm" variant="ghost" aria-label="Delete"
                  onClick={() => confirm(`Delete "${p.name}"? This can't be undone.`) && update.mutate({ id: p.id, del: true })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function CreateProject() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", brand_name: "", product_name: "", category: "", template: "luxury" });
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: async () => {
      const slug = `${slugify(f.name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from("projects").insert({ ...f, slug }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => navigate({ to: "/projects/$id", params: { id } }),
    onError: (e) => { console.error(e); toast.error("We couldn't create the project. Please try again."); },
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New project</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="Project name"><Input required value={f.name} onChange={set("name")} placeholder="AURA Perfume" /></Field>
          <Field label="Brand name"><Input value={f.brand_name} onChange={set("brand_name")} /></Field>
          <Field label="Product name"><Input value={f.product_name} onChange={set("product_name")} /></Field>
          <Field label="Category"><Input value={f.category} onChange={set("category")} placeholder="Fragrance" /></Field>
          <Field label="Template">
            <select value={f.template} onChange={set("template")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create project"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
