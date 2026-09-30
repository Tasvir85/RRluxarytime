export type GenerationStatus = "queued" | "processing" | "ready" | "failed" | "cancelled";

export type GenerationJob = {
  jobId: string;
  status: GenerationStatus;
  progress: number;
  modelUrl?: string;
  error?: string;
};

export type GenerateInput = { projectId: string; imageUrls: string[] };

/** Every 3D generation provider implements this. Runs server-side only. */
export interface ThreeDProvider {
  readonly id: string;
  generate3DModel(input: GenerateInput): Promise<GenerationJob>;
  getGenerationStatus(jobId: string): Promise<GenerationJob>;
  downloadModel(jobId: string): Promise<{ url: string }>;
  cancelGeneration(jobId: string): Promise<void>;
}
