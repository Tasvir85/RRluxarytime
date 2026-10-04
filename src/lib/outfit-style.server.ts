import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch } from "./ai/run-id.server.ts";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

const recommendationSchema = z.object({
  variantId: z.enum(["onyx", "champagne", "abyss"]),
  backgroundId: z.enum(["obsidian", "pearl", "burgundy"]),
  outfitSummary: z.string(),
  recommendation: z.string(),
  rationale: z.string(),
  palette: z.array(z.string()),
});

export type OutfitRecommendation = z.infer<typeof recommendationSchema>;

function parseFallback(text: string | undefined) {
  if (!text) return null;
  try {
    return recommendationSchema.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

function friendlyGatewayError(error: unknown) {
  const status = typeof error === "object" && error && "statusCode" in error
    ? Number(error.statusCode)
    : 0;
  const message = error instanceof Error ? error.message : "";
  if (status === 402) return message || "AI styling credits are unavailable right now.";
  if (status === 429) return "Our stylist is busy. Please wait a moment and try again.";
  if (status === 403) return message || "AI styling is currently unavailable for this workspace.";
  return "We couldn’t style this photo right now. Please try again.";
}

export async function analyzeOutfitPhoto(input: { dataUrl: string; mimeType: string }) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { recommendation: null, error: "AI styling has not been configured." };

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      system:
        "You are the private styling advisor for Aurum, a restrained luxury watch house. Analyze only visible outfit colors, materials, formality, and overall mood. Never identify or infer the person, age, gender, ethnicity, location, health, or other sensitive traits. Recommend exactly one watch and one studio background from the supplied catalog. Keep all prose concise and polished.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Choose the most complementary pairing from this fixed catalog:\n- onyx: cool titanium, black lacquer dial, champagne markers; understated and architectural.\n- champagne: rose gold, warm brown dial; formal and warm.\n- abyss: steel, deep blue dial; versatile and contemporary.\nBackgrounds: obsidian (dramatic neutral), pearl (warm editorial), burgundy (rich evening).\nReturn a 2–5 word outfit summary, the selected watch name, a one-sentence rationale, and exactly three plain-language color names in palette.`,
            },
            { type: "image", image: new URL(input.dataUrl), mediaType: input.mimeType },
          ],
        },
      ],
      output: Output.object({ schema: recommendationSchema }),
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const recommendation = await result.output;
    return {
      recommendation: {
        ...recommendation,
        outfitSummary: recommendation.outfitSummary.slice(0, 80),
        recommendation: recommendation.recommendation.slice(0, 80),
        rationale: recommendation.rationale.slice(0, 280),
        palette: recommendation.palette.slice(0, 3).map((color) => color.slice(0, 30)),
      },
      error: null,
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const fallback = parseFallback(error.text);
      if (fallback) return { recommendation: fallback, error: null };
    }
    return { recommendation: null, error: friendlyGatewayError(error) };
  }
}