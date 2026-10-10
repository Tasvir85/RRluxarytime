import { ArrowDown, ArrowUpRight, Check, Compass, Gem, Hand, Layers, Palette } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { OutfitStylist } from "@/components/site/OutfitStylist";
import { PRODUCT, SPECS, VARIANTS, type ProductVariant } from "@/lib/product-config";
import { cn } from "@/lib/utils";
import packagingFront from "@/assets/meridian-packaging-front.jpg";
import braceletDetail from "@/assets/meridian-bracelet-detail.jpg";
import packagingTop from "@/assets/meridian-packaging-top.jpg";
import boxClose from "@/assets/meridian-box-close.jpg";

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-15%" },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
};

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export type StageBackground = "obsidian" | "pearl" | "burgundy";

const BACKGROUNDS: { id: StageBackground; label: string; swatch: string }[] = [
  { id: "obsidian", label: "Obsidian", swatch: "bg-stage-obsidian" },
  { id: "pearl", label: "Pearl", swatch: "bg-stage-pearl" },
  { id: "burgundy", label: "Burgundy", swatch: "bg-stage-burgundy" },
];

export function BackgroundSelector({
  value,
  onChange,
}: {
  value: StageBackground;
  onChange: (background: StageBackground) => void;
}) {
  return (
    <div className="pointer-events-auto fixed right-5 bottom-5 z-30 flex items-center gap-1 rounded-full border border-border bg-card/80 p-1.5 shadow-lg backdrop-blur-md md:right-10 md:bottom-8">
      <Palette className="mx-1 size-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      {BACKGROUNDS.map((background) => (
        <Button
          key={background.id}
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(background.id)}
          aria-label={`${background.label} background`}
          aria-pressed={value === background.id}
          title={background.label}
          className="relative size-8 rounded-full hover:bg-secondary"
        >
          <span className={cn("size-4 rounded-full border border-border", background.swatch)} />
          {value === background.id ? (
            <Check className="absolute size-3 text-foreground drop-shadow" strokeWidth={2.5} />
          ) : null}
        </Button>
      ))}
    </div>
  );
}

export function Nav() {
  return (
    <header className="pointer-events-none fixed top-0 right-0 left-0 z-30 flex items-center justify-between px-6 py-6 md:px-12">
      <span className="font-display text-sm tracking-[0.42em] uppercase">{PRODUCT.brand}</span>
      <span className="eyebrow hidden md:inline">{PRODUCT.model}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => scrollToSection("acquire")}
        className="pointer-events-auto eyebrow h-auto rounded-none border-b border-transparent px-0 pb-0.5 text-foreground shadow-none hover:border-primary hover:bg-transparent hover:text-primary"
      >
        Enquire
      </Button>
    </header>
  );
}

export function Hero() {
  return (
    <section id="hero" className="relative flex min-h-screen scroll-mt-0 items-center">
      <div className="w-full px-6 md:px-12">
        <motion.div {...fade} className="max-w-[34rem] md:max-w-[52vw] lg:max-w-xl">
          <p className="eyebrow">Reference MR-01 — Automatic</p>
          <h1 className="mt-6 font-display text-[clamp(2.6rem,6.4vw,5.2rem)] leading-[0.95] tracking-[-0.03em] uppercase">
            Designed to be
            <span className="text-gold"> experienced.</span>
          </h1>
          <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-muted-foreground">
            {PRODUCT.tagline}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button
              type="button"
              onClick={() => scrollToSection("product-gallery")}
              className="pointer-events-auto h-auto rounded-full px-7 py-3 text-[0.7rem] font-medium tracking-[0.22em] uppercase transition-transform duration-300 hover:scale-[1.03]"
            >
              Explore product
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => scrollToSection("variants")}
              className="pointer-events-auto h-auto rounded-full bg-transparent px-7 py-3 text-[0.7rem] font-medium tracking-[0.22em] uppercase shadow-none hover:border-primary hover:bg-transparent hover:text-primary"
            >
              Discover the collection
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-6 flex items-center gap-8 md:left-12">
        <span className="eyebrow flex items-center gap-2">
          <ArrowDown className="size-3.5" strokeWidth={1.5} /> Scroll
        </span>
        <span className="eyebrow hidden items-center gap-2 md:flex">
          <Hand className="size-3.5" strokeWidth={1.5} /> Drag to rotate
        </span>
      </div>
    </section>
  );
}

const PRODUCT_VIEWS = [
  { src: packagingFront, label: "Meridian and presentation case" },
  { src: braceletDetail, label: "Wide five-link bracelet and polished case" },
  { src: packagingTop, label: "Complete Meridian presentation set" },
  { src: boxClose, label: "Meridian in its lacquer presentation case" },
] as const;

export function ProductGallery() {
  return (
    <section id="product-gallery" className="relative flex min-h-screen scroll-mt-0 items-center py-24">
      <div className="w-full px-6 md:px-12">
        <motion.div {...fade} className="max-w-xl">
          <p className="eyebrow">The complete presentation</p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.05]">Crafted beyond the case.</h2>
        </motion.div>
        <motion.div {...fade} className="mt-8 grid max-w-[70rem] grid-cols-2 gap-2 md:w-[64%] md:gap-3">
          {PRODUCT_VIEWS.map((view, index) => (
            <figure key={view.src} className="group relative aspect-[4/3] overflow-hidden rounded-sm border border-hairline bg-card">
              <img src={view.src} alt={view.label} width={1280} height={960} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-3 pt-8 pb-3 text-[0.62rem] tracking-[0.12em] text-foreground uppercase">
                0{index + 1} · {view.label}
              </figcaption>
            </figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function Craft() {
  return (
    <section id="craft" className="relative flex min-h-screen scroll-mt-0 items-center justify-end">
      <div className="w-full px-6 md:w-1/2 md:px-12">
        <motion.div {...fade}>
          <p className="eyebrow">01 — Craft</p>
          <h2 className="mt-5 font-display text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.05] tracking-[-0.02em]">
            Six hundred hours in a single case.
          </h2>
          <dl className="mt-10 divide-y divide-border">
            {SPECS.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-6 py-4">
                <dt className="eyebrow">{s.label}</dt>
                <dd className="text-right text-sm text-foreground">{s.value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>
    </section>
  );
}

export function Variants({
  active,
  onSelect,
  onStyleApply,
}: {
  active: ProductVariant;
  onSelect: (v: ProductVariant) => void;
  onStyleApply: (variant: ProductVariant, background: StageBackground) => void;
}) {
  return (
    <section id="variants" className="relative flex min-h-screen scroll-mt-0 items-center">
      <div className="w-full px-6 md:w-1/2 md:px-12">
        <motion.div {...fade}>
          <p className="eyebrow">02 — The line</p>
          <h2 className="mt-5 font-display text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.05] tracking-[-0.02em]">
            Three executions.
          </h2>
          <div className="mt-10 space-y-2">
            {VARIANTS.map((v) => {
              const isActive = v.id === active.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelect(v)}
                  className={cn(
                    "pointer-events-auto flex w-full items-center gap-4 rounded-sm border px-4 py-4 text-left transition-colors duration-300",
                    isActive
                      ? "border-primary/50 bg-card"
                      : "border-hairline hover:border-border hover:bg-card/60",
                  )}
                >
                  <span
                    className="size-8 shrink-0 rounded-full ring-1 ring-border"
                    style={{
                      background: `linear-gradient(135deg, ${v.metal}, ${v.dial} 70%)`,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground">{v.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{v.note}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs text-muted-foreground">{v.reference}</span>
                    <span className="mt-1 block text-sm text-primary">{v.price}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="pointer-events-auto mt-6">
            <OutfitStylist onApply={onStyleApply} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function Movement() {
  const pillars = [
    { icon: Gem, title: "Sapphire", copy: "Double-domed, anti-reflective on both faces." },
    { icon: Layers, title: "241 parts", copy: "Every bridge chamfered and polished by hand." },
    { icon: Compass, title: "±2 s / day", copy: "Chronometer-certified in five positions." },
  ];
  return (
    <section id="movement" className="relative flex min-h-screen scroll-mt-0 flex-col justify-end pb-20">
      <div className="px-6 md:px-12">
        <motion.p {...fade} className="eyebrow">
          03 — The movement
        </motion.p>
        <motion.div {...fade} className="mt-8 grid gap-10 border-t border-hairline pt-10 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title}>
              <p.icon className="size-5 text-primary" strokeWidth={1.25} />
              <h3 className="mt-4 font-display text-lg tracking-tight">{p.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {p.copy}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function Collection({ active }: { active: ProductVariant }) {
  return (
    <section id="acquire" className="relative flex min-h-screen scroll-mt-0 flex-col items-center justify-end pb-14 text-center">
      <motion.div {...fade} className="px-6">
        <p className="eyebrow">04 — Acquire</p>
        <h2 className="mt-5 font-display text-[clamp(2rem,4.6vw,3.6rem)] leading-[1] tracking-[-0.03em] uppercase">
          Wear the <span className="text-gold">{active.name}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Private viewings at our Geneva and Tokyo ateliers. {active.reference} —{" "}
          {active.price}.
        </p>
        <button
          type="button"
          className="pointer-events-auto mt-9 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-[0.7rem] font-medium tracking-[0.22em] text-primary-foreground uppercase transition-transform duration-300 hover:scale-[1.03]"
        >
          Request a viewing <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
        </button>
      </motion.div>
      <footer className="mt-16 flex w-full items-center justify-between px-6 pt-6 text-muted-foreground hairline-t md:px-12">
        <span className="font-display text-xs tracking-[0.42em] uppercase">{PRODUCT.brand}</span>
        <span className="text-[0.7rem] tracking-[0.18em] uppercase">Geneva · Tokyo · Milan</span>
      </footer>
    </section>
  );
}
