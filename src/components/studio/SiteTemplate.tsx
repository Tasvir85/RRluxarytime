import { lazy, Suspense } from "react";
import { BACKGROUNDS, type Project, siteConfig } from "@/lib/projects";

const ModelViewer = lazy(() => import("./ModelViewer").then((m) => ({ default: m.ModelViewer })));

type Props = { project: Project; modelUrl: string | null };

/** The public product website. Used by both the live preview and /site/:slug. */
export function SiteTemplate({ project, modelUrl }: Props) {
  const c = siteConfig(project);
  const accent = c.primaryColor;
  const bg = BACKGROUNDS[c.background]!.css;
  const name = project.product_name || project.name;

  return (
    <div className="min-h-screen text-foreground" style={{ background: bg }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <span className="font-display text-lg font-bold tracking-[0.2em] uppercase">{c.logoText}</span>
        <a href={c.ctaUrl} className="text-xs uppercase tracking-[0.2em] hover:opacity-80" style={{ color: accent }}>
          {c.ctaLabel}
        </a>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-6 px-5 pb-10 sm:px-8 lg:min-h-[80vh] lg:grid-cols-[1fr_1.2fr]">
        <div className="order-2 lg:order-1">
          <p className="eyebrow mb-4" style={{ color: accent }}>
            {project.brand_name} {project.category && `· ${project.category}`}
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.02] tracking-tight uppercase sm:text-5xl lg:text-6xl">
            {c.headline}
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">{c.subheadline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={c.ctaUrl}
              className="rounded-sm px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground"
              style={{ background: accent }}
            >
              {c.ctaLabel}
            </a>
            <a href="#story" className="rounded-sm border border-border px-6 py-3 text-xs uppercase tracking-[0.2em]">
              Explore {name}
            </a>
          </div>
        </div>
        <div className="order-1 h-[52vh] min-h-[320px] lg:order-2 lg:h-[72vh]">
          {modelUrl ? (
            <Suspense fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">Loading 3D model…</div>}>
              <ModelViewer url={modelUrl} className="h-full w-full" />
            </Suspense>
          ) : (
            <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              3D model coming soon
            </div>
          )}
        </div>
      </section>

      {c.story && (
        <section id="story" className="hairline-t mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
          <p className="eyebrow mb-4" style={{ color: accent }}>The story</p>
          <p className="font-display text-2xl leading-snug sm:text-3xl">{c.story}</p>
        </section>
      )}

      {c.features.length > 0 && (
        <section className="hairline-t mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <p className="eyebrow mb-10" style={{ color: accent }}>Features</p>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.map((f, i) => (
              <div key={i}>
                <h3 className="font-display text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.materials && (
        <section className="hairline-t mx-auto max-w-3xl px-5 py-20 sm:px-8">
          <p className="eyebrow mb-4" style={{ color: accent }}>Materials & details</p>
          <p className="text-lg text-muted-foreground">{c.materials}</p>
        </section>
      )}

      {c.specs.length > 0 && (
        <section className="hairline-t mx-auto max-w-3xl px-5 py-20 sm:px-8">
          <p className="eyebrow mb-6" style={{ color: accent }}>Specifications</p>
          <dl className="divide-y divide-border">
            {c.specs.map((s, i) => (
              <div key={i} className="flex justify-between gap-6 py-4 text-sm">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="text-right">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section id="contact" className="hairline-t px-5 py-24 text-center sm:px-8">
        <h2 className="font-display text-3xl font-bold uppercase sm:text-4xl">{name}</h2>
        <a
          href={c.ctaUrl}
          className="mt-8 inline-block rounded-sm px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground"
          style={{ background: accent }}
        >
          {c.ctaLabel}
        </a>
      </section>

      <footer className="hairline-t px-5 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {c.logoText}
      </footer>
    </div>
  );
}
