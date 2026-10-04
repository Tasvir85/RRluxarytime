import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const outfitInput = z.object({
  dataUrl: z.string().max(11_000_000).refine(
    (value) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
    "Please choose a JPEG, PNG, or WebP photo.",
  ),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const recommendWatchForOutfit = createServerFn({ method: "POST" })
  .inputValidator((data) => outfitInput.parse(data))
  .handler(async ({ data }) => {
    const encoded = data.dataUrl.split(",")[1] ?? "";
    if (encoded.length * 0.75 > 8 * 1024 * 1024) {
      return { recommendation: null, error: "Choose a photo smaller than 8 MB." };
    }
    const { analyzeOutfitPhoto } = await import("./outfit-style.server.ts");
    return analyzeOutfitPhoto(data);
  });