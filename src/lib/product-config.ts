/**
 * Single source of truth for the 3D product.
 *
 * Drop a model at `public/models/product.glb` (or point this at any GLB/GLTF
 * URL) and the scene loads it instead of the built-in procedural watch — no
 * other file needs to change.
 */
export const PRODUCT_MODEL_URL: string | null = null;

export type ProductVariant = {
  id: string;
  name: string;
  reference: string;
  price: string;
  /** Case + bracelet metal */
  metal: string;
  /** Dial base */
  dial: string;
  /** Markers, hands, accents */
  accent: string;
  strap: string;
  note: string;
};

export const PRODUCT = {
  brand: "Aurum",
  model: "Aurum Meridian",
  tagline: "Where design, technology and craftsmanship meet.",
  headline: "Designed to be experienced.",
} as const;

export const VARIANTS: ProductVariant[] = [
  {
    id: "onyx",
    name: "Meridian Onyx",
    reference: "MR-01 / 40mm",
    price: "€18,400",
    metal: "#c9ccd2",
    dial: "#0e1013",
    accent: "#e8d9ac",
    strap: "#14161a",
    note: "Sandblasted titanium case over a lacquered onyx dial.",
  },
  {
    id: "champagne",
    name: "Meridian Champagne",
    reference: "MR-02 / 40mm",
    price: "€23,900",
    metal: "#e3bd7c",
    dial: "#241c12",
    accent: "#f6e7c0",
    strap: "#2a1d14",
    note: "Solid rose-gold case, hand-finished guilloché centre.",
  },
  {
    id: "abyss",
    name: "Meridian Abyss",
    reference: "MR-03 / 40mm",
    price: "€21,200",
    metal: "#aeb6c2",
    dial: "#0d1c2b",
    accent: "#cfe4f2",
    strap: "#0b1620",
    note: "Steel case with a fumé blue dial, graded to black.",
  },
];

export const SPECS = [
  { label: "Movement", value: "In-house AR-7 automatic" },
  { label: "Power reserve", value: "120 hours" },
  { label: "Case", value: "40mm grade-5 titanium" },
  { label: "Crystal", value: "Double-domed sapphire" },
  { label: "Water resistance", value: "100m" },
  { label: "Components", value: "241, assembled by hand" },
];
