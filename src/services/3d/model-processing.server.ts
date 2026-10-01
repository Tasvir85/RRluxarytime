import { WebIO } from "@gltf-transform/core";
import { dedup, prune, weld } from "@gltf-transform/functions";

export type Validation = {
  ok: boolean;
  quality: "ready" | "attention";
  errors: { code: string; message: string }[];
  warnings: string[];
  stats: {
    bytes: number; meshes: number; primitives: number; triangles: number; materials: number;
    textures: number; maxTexturePx: number; hasUVs: boolean; hasNormals: boolean;
    bbox: [number, number, number] | null;
  };
};

const MAX_BYTES = 50 * 1024 * 1024;
const TRI_BUDGET = 300_000;

function pngJpegSize(b: Uint8Array): number {
  // PNG: width/height at 16..24; JPEG: scan SOF markers
  if (b[0] === 0x89 && b[1] === 0x50) {
    const v = new DataView(b.buffer, b.byteOffset);
    return Math.max(v.getUint32(16), v.getUint32(20));
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1]!;
      if (m >= 0xc0 && m <= 0xc3) return Math.max((b[i + 5]! << 8) | b[i + 6]!, (b[i + 7]! << 8) | b[i + 8]!);
      i += 2 + ((b[i + 2]! << 8) | b[i + 3]!);
    }
  }
  return 0;
}

export async function validateModel(bytes: Uint8Array): Promise<Validation> {
  const errors: Validation["errors"] = [];
  const warnings: string[] = [];
  const stats: Validation["stats"] = {
    bytes: bytes.byteLength, meshes: 0, primitives: 0, triangles: 0, materials: 0, textures: 0,
    maxTexturePx: 0, hasUVs: true, hasNormals: true, bbox: null,
  };
  if (bytes.byteLength > MAX_BYTES) errors.push({ code: "MODEL_TOO_LARGE", message: "The model is larger than 50 MB." });
  if (String.fromCharCode(...bytes.slice(0, 4)) !== "glTF")
    errors.push({ code: "INVALID_GLB", message: "This file isn't a valid GLB model." });
  if (errors.length) return { ok: false, quality: "attention", errors, warnings, stats };

  let doc;
  try {
    doc = await new WebIO().readBinary(bytes);
  } catch (e) {
    return { ok: false, quality: "attention", warnings, stats,
      errors: [{ code: "CORRUPTED_MODEL", message: `The model couldn't be opened (${(e as Error).message}).` }] };
  }
  const root = doc.getRoot();
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of root.listMeshes()) {
    stats.meshes++;
    for (const prim of mesh.listPrimitives()) {
      stats.primitives++;
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const idx = prim.getIndices();
      stats.triangles += Math.floor((idx ? idx.getCount() : pos.getCount()) / 3);
      if (!prim.getAttribute("NORMAL")) stats.hasNormals = false;
      if (!prim.getAttribute("TEXCOORD_0")) stats.hasUVs = false;
      const pmin = pos.getMin([]), pmax = pos.getMax([]);
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, pmin[i] ?? 0); max[i] = Math.max(max[i]!, pmax[i] ?? 0); }
    }
  }
  stats.materials = root.listMaterials().length;
  stats.textures = root.listTextures().length;
  for (const t of root.listTextures()) {
    const img = t.getImage();
    if (!img) errors.push({ code: "MISSING_TEXTURE", message: "A texture image is missing from the model." });
    else stats.maxTexturePx = Math.max(stats.maxTexturePx, pngJpegSize(img));
  }
  if (stats.meshes === 0 || stats.triangles === 0) errors.push({ code: "NO_GEOMETRY", message: "The model contains no visible geometry." });
  if (Number.isFinite(min[0])) {
    stats.bbox = [max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!];
    const big = Math.max(...stats.bbox), small = Math.min(...stats.bbox);
    if (big <= 0) errors.push({ code: "ZERO_SIZE", message: "The model has no size." });
    else if (big > 1000 || big < 0.001) warnings.push("The model's scale is unusual; it will be auto-fitted on the website.");
    if (small > 0 && big / small > 50) warnings.push("The model is extremely flat or thin — please check its shape.");
  }
  if (stats.triangles > TRI_BUDGET) warnings.push("Model geometry is heavier than recommended for web delivery.");
  if (stats.maxTexturePx > 0 && stats.maxTexturePx < 1024) warnings.push("Texture resolution may affect close-up viewing.");
  if (stats.maxTexturePx > 4096) warnings.push("Textures are very large and may slow loading on phones.");
  if (!stats.hasNormals) warnings.push("Some surfaces have no lighting information and may look flat.");
  if (!stats.hasUVs && stats.textures > 0) warnings.push("Some parts can't display textures correctly.");
  if (stats.materials === 0) warnings.push("The model has no materials and will appear plain grey.");

  const ok = errors.length === 0;
  return { ok, quality: ok && warnings.length === 0 ? "ready" : "attention", errors, warnings, stats };
}

export type Optimization = {
  ok: boolean; originalBytes: number; optimizedBytes: number;
  applied: string[]; pending: string[]; error?: string;
};

/** Lossless web optimization. The original is never modified. */
export async function optimizeModel(bytes: Uint8Array): Promise<{ bytes: Uint8Array; result: Optimization }> {
  const pending = ["Texture resizing & compression (needs image tooling — pending)", "Draco compression (pending)", "LOD generation (pending)"];
  try {
    const io = new WebIO();
    const doc = await io.readBinary(bytes);
    await doc.transform(dedup(), weld(), prune());
    const out = await io.writeBinary(doc);
    const better = out.byteLength <= bytes.byteLength ? out : bytes;
    return {
      bytes: better,
      result: { ok: true, originalBytes: bytes.byteLength, optimizedBytes: better.byteLength,
        applied: ["Removed duplicate data", "Merged identical vertices", "Removed unused resources"], pending },
    };
  } catch (e) {
    return { bytes, result: { ok: false, originalBytes: bytes.byteLength, optimizedBytes: bytes.byteLength, applied: [], pending, error: (e as Error).message } };
  }
}
