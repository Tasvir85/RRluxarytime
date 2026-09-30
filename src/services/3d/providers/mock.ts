import type { ThreeDProvider } from "./types";

const SAMPLE = "/models/sample-product.glb";

/** Development stand-in: returns a sample model instantly. Not real AI. */
export const mockProvider: ThreeDProvider = {
  id: "mock",
  async generate3DModel({ projectId }) {
    return { jobId: `mock-${projectId}-${Date.now()}`, status: "ready", progress: 100, modelUrl: SAMPLE };
  },
  async getGenerationStatus(jobId) {
    return { jobId, status: "ready", progress: 100, modelUrl: SAMPLE };
  },
  async downloadModel() {
    return { url: SAMPLE };
  },
  async cancelGeneration() {},
};
