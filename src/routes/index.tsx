import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { ProductScene } from "@/components/3d/ProductScene";
import {
  Collection,
  BackgroundSelector,
  Craft,
  Hero,
  Movement,
  Nav,
  ProductGallery,
  Variants,
  type StageBackground,
} from "@/components/site/Sections";
import { PRODUCT, VARIANTS } from "@/lib/product-config";
import { stage } from "@/lib/product-stage";

const TITLE = "Aurum Meridian — Designed to be experienced";
const DESCRIPTION =
  "An interactive 3D presentation of the Aurum Meridian automatic watch. Rotate, zoom and scroll through the case, the movement and the collection.";

export const Route = createFileRoute("/")({
  // The WebGL stage is browser-only — never server-render the canvas.
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExperiencePage,
});

function ExperiencePage() {
  const [variant, setVariant] = useState(VARIANTS[2]!);
  const [background, setBackground] = useState<StageBackground>("obsidian");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const trigger = ScrollTrigger.create({
      trigger: scroller.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        stage.progress = self.progress;
      },
    });
    return () => trigger.kill();
  }, []);

  return (
    <div ref={scroller} className={`stage-${background} relative transition-colors duration-700`}>
      <ProductScene variant={variant} />

      <div className="pointer-events-none relative z-20">
        <Nav />
        <Hero />
        <ProductGallery />
        <Craft />
        <Variants
          active={variant}
          onSelect={setVariant}
          onStyleApply={(recommendedVariant, recommendedBackground) => {
            setVariant(recommendedVariant);
            setBackground(recommendedBackground);
          }}
        />
        <Movement />
        <Collection active={variant} />
      </div>
      <BackgroundSelector value={background} onChange={setBackground} />

      {/* Subtle vignette keeps the product the brightest thing on screen */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 55%, oklch(0.1 0.004 260 / 0.35) 100%)",
        }}
        aria-hidden="true"
      />
      <span className="sr-only">{PRODUCT.model}</span>
    </div>
  );
}
