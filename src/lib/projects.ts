import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];

export const BUCKET = "project-assets";
export const SLOTS = ["front", "back", "left", "right", "top"] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABELS: Record<Slot, string> = {
  front: "Front",
  back: "Back",
  left: "Left",
  right: "Right",
  top: "Top / Angle",
};

/** Development-only stand-in for a real AI 3D generator. */
export const MOCK_MODEL_URL = "/models/sample-product.glb";

export const TEMPLATES = [
  { id: "luxury", label: "Luxury" },
  { id: "minimal", label: "Minimal" },
  { id: "tech", label: "Technology" },
];

export const BACKGROUNDS: Record<string, { label: string; css: string }> = {
  studio: {
    label: "Dark studio",
    css: "radial-gradient(ellipse 80% 60% at 65% 40%, oklch(0.24 0.008 260), oklch(0.12 0.004 260) 70%)",
  },
  midnight: {
    label: "Midnight blue",
    css: "radial-gradient(ellipse 80% 60% at 65% 40%, oklch(0.26 0.04 250), oklch(0.11 0.02 255) 70%)",
  },
  warm: {
    label: "Warm bronze",
    css: "radial-gradient(ellipse 80% 60% at 65% 40%, oklch(0.27 0.03 60), oklch(0.12 0.01 50) 70%)",
  },
};

export type Feature = { title: string; text: string };
export type Spec = { label: string; value: string };
export type SiteConfig = {
  logoText: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaUrl: string;
  primaryColor: string;
  background: string;
  story: string;
  materials: string;
  features: Feature[];
  specs: Spec[];
};

export function siteConfig(p: Pick<Project, "config" | "brand_name" | "product_name" | "description">): SiteConfig {
  const c = (p.config ?? {}) as Partial<SiteConfig>;
  return {
    logoText: c.logoText || p.brand_name || "Brand",
    headline: c.headline || "Designed to be experienced.",
    subheadline: c.subheadline || "Where design, technology and craftsmanship meet.",
    ctaLabel: c.ctaLabel || "Discover more",
    ctaUrl: c.ctaUrl || "#contact",
    primaryColor: c.primaryColor || "#d9c38a",
    background: c.background && BACKGROUNDS[c.background] ? c.background : "studio",
    story: c.story || p.description || "",
    materials: c.materials || "",
    features: Array.isArray(c.features) ? c.features : [],
    specs: Array.isArray(c.specs) ? c.specs : [],
  };
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "product"
  );
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Resolve a loadable URL for a project's model (signed for private storage). */
export async function resolveModelUrl(p: Pick<Project, "model_source" | "model_url" | "model_path">) {
  if (p.model_source === "mock" && p.model_url) return p.model_url;
  if (p.model_path) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(p.model_path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }
  return null;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MIN_IMAGE_PX = 400;
export const MAX_MODEL_BYTES = 50 * 1024 * 1024;

export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

export async function validateImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return { error: "Please use a JPG, PNG or WebP image." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "This image is larger than 10 MB." };
  try {
    const dims = await readImageSize(file);
    if (dims.width < MIN_IMAGE_PX || dims.height < MIN_IMAGE_PX)
      return { error: `Image must be at least ${MIN_IMAGE_PX}×${MIN_IMAGE_PX}px.` };
    return { dims };
  } catch {
    return { error: "We couldn't read this image. Please try another file." };
  }
}

export async function validateGlb(file: File): Promise<string | null> {
  if (!file.name.toLowerCase().endsWith(".glb")) return "Please upload a .glb file.";
  if (file.size > MAX_MODEL_BYTES) return "This model is larger than 50 MB.";
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (String.fromCharCode(...head) !== "glTF") return "This file isn't a valid GLB model.";
  try {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    await new GLTFLoader().parseAsync(await file.arrayBuffer(), "");
  } catch {
    return "This GLB couldn't be opened. It may be damaged or use unsupported features.";
  }
  return null;
}
