import { mockProvider } from "./mock";
import type { ThreeDProvider } from "./types";

/** Provider adapter: add real providers here; the app only talks to this. */
const PROVIDERS: Record<string, ThreeDProvider> = { mock: mockProvider };

export function getProvider(id = "mock"): ThreeDProvider {
  return PROVIDERS[id] ?? mockProvider;
}
export type { ThreeDProvider } from "./types";
