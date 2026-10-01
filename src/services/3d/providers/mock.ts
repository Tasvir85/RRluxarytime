import type { ThreeDProvider } from "./types";

const SAMPLE = "/models/sample-product.glb";
const DURATION_MS = 25_000;

/**
 * Development stand-in. NOT real AI: it ignores the photos and returns a sample
 * bottle. Progress is derived from the job's start time on the server, so it
 * keeps advancing while the browser is closed.
 */
export const mockProvider: ThreeDProvider = {
  id: "mock",
  isMock: true,
  estimatedCost: 0,
  async generate3DModel({ projectId }) {
    return { jobId: `mock-${projectId.slice(0, 8)}-${Date.now()}`, status: "queued", progress: 0 };
  },
  async getGenerationStatus(jobId) {
    const started = Number(jobId.split("-").pop());
    const elapsed = Date.now() - (Number.isFinite(started) ? started : 0);
    if (elapsed >= DURATION_MS) return { jobId, status: "ready", progress: 100, modelUrl: SAMPLE, actualCost: 0 };
    return { jobId, status: "processing", progress: Math.round((elapsed / DURATION_MS) * 100) };
  },
  async downloadModel() {
    return { url: SAMPLE };
  },
  async cancelGeneration() {},
};
