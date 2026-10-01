import { mockProvider } from "./mock";
import type { ThreeDProvider } from "./types";

/**
 * Provider adapter. To add a real provider: implement ThreeDProvider in a new
 * file (reading its key from process.env inside its methods), register it here,
 * and set THREED_PROVIDER=<id>. Nothing else in the app changes.
 */
const PROVIDERS: Record<string, ThreeDProvider> = { mock: mockProvider };

export function getProvider(id?: string | null): ThreeDProvider {
  const wanted = id ?? process.env["THREED_PROVIDER"] ?? "mock";
  return PROVIDERS[wanted] ?? mockProvider;
}
export type { ThreeDProvider, GenerateInput, GenerationJob } from "./types";
