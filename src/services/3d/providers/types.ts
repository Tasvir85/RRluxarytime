export type GenerationStatus = "queued" | "processing" | "ready" | "failed" | "cancelled";

export type GenerationJob = {
  jobId: string;
  status: GenerationStatus;
  progress: number;
  modelUrl?: string;
  error?: string;
  errorCode?: string;
  actualCost?: number;
};

/** Structured, faithful request built from the approved photos + product info. */
export type GenerateInput = {
  projectId: string;
  imageUrls: { slot: string; url: string }[];
  product: { brand: string; name: string; category: string; description: string };
  instructions: string;
};

/** Every 3D generation provider implements this. Runs server-side only. */
export interface ThreeDProvider {
  readonly id: string;
  /** True for demo providers whose output is NOT generated from the photos. */
  readonly isMock: boolean;
  readonly estimatedCost: number;
  generate3DModel(input: GenerateInput): Promise<GenerationJob>;
  getGenerationStatus(jobId: string): Promise<GenerationJob>;
  /** Returns a URL (absolute, or app-relative for the mock) to the produced GLB. */
  downloadModel(jobId: string): Promise<{ url: string }>;
  cancelGeneration(jobId: string): Promise<void>;
}
