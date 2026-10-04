import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, ImagePlus, LoaderCircle, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { recommendWatchForOutfit } from "@/lib/outfit-style.functions";
import { VARIANTS, type ProductVariant } from "@/lib/product-config";
import type { StageBackground } from "./Sections";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

type Recommendation = {
  variantId: "onyx" | "champagne" | "abyss";
  backgroundId: StageBackground;
  outfitSummary: string;
  recommendation: string;
  rationale: string;
  palette: string[];
};

export function OutfitStylist({
  onApply,
}: {
  onApply: (variant: ProductVariant, background: StageBackground) => void;
}) {
  const recommend = useServerFn(recommendWatchForOutfit);
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  const resetPhoto = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setMimeType(null);
    setResult(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Choose a photo smaller than 8 MB.");
      return;
    }
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setMimeType(file.type);
  };

  const analyze = async () => {
    const file = fileInput.current?.files?.[0];
    if (!file || !mimeType) return;
    setLoading(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Photo unreadable"));
        reader.onerror = () => reject(new Error("Photo unreadable"));
        reader.readAsDataURL(file);
      });
      const response = await recommend({ data: { dataUrl, mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" } });
      if (response.error || !response.recommendation) {
        setError(response.error ?? "We couldn’t style this photo right now.");
      } else {
        setResult(response.recommendation);
      }
    } catch {
      setError("We couldn’t read or style this photo. Please try another image.");
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!result) return;
    const variant = VARIANTS.find((item) => item.id === result.variantId);
    if (!variant) return;
    onApply(variant, result.backgroundId);
    setOpen(false);
    document.getElementById("variants")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="pointer-events-auto h-auto rounded-full bg-card/50 px-5 py-2.5 text-[0.65rem] tracking-[0.18em] uppercase backdrop-blur-md hover:border-primary hover:bg-card">
          <Sparkles aria-hidden="true" /> Style with your outfit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-border bg-card p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-hairline px-6 py-5 pr-12">
          <p className="eyebrow">Aurum private styling</p>
          <DialogTitle className="font-display text-2xl">Find your perfect pairing</DialogTitle>
          <DialogDescription>Upload an outfit photo for a private watch and studio-color recommendation.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-6 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="sr-only" aria-label="Upload outfit photo" />
            {preview ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-border bg-muted">
                <img src={preview} alt="Selected outfit" className="h-full w-full object-cover" />
                <Button type="button" size="icon" variant="secondary" onClick={resetPhoto} className="absolute right-3 bottom-3" aria-label="Remove outfit photo" title="Remove photo">
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInput.current?.click()} className="flex aspect-[4/5] w-full cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed border-border bg-muted/50 px-6 text-center transition-colors hover:border-primary/60 hover:bg-muted">
                <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card"><ImagePlus className="size-5 text-primary" aria-hidden="true" /></span>
                <span className="mt-4 text-sm font-medium text-foreground">Choose outfit photo</span>
                <span className="mt-2 text-xs text-muted-foreground">JPEG, PNG or WebP · up to 8 MB</span>
              </button>
            )}
          </div>

          <div className="flex min-h-72 flex-col">
            {result ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 text-primary"><Check className="size-4" aria-hidden="true" /><span className="eyebrow text-primary">Stylist’s selection</span></div>
                <p className="mt-5 text-xs text-muted-foreground">{result.outfitSummary}</p>
                <h3 className="mt-2 font-display text-3xl">{result.recommendation}</h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{result.rationale}</p>
                <div className="mt-6 flex flex-wrap gap-2" aria-label="Detected outfit palette">
                  {result.palette.map((color) => <span key={color} className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">{color}</span>)}
                </div>
                <div className="mt-auto pt-8"><Button type="button" onClick={apply} className="w-full"><Sparkles aria-hidden="true" /> Apply this pairing</Button></div>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center">
                <Camera className="size-6 text-primary" strokeWidth={1.4} aria-hidden="true" />
                <h3 className="mt-4 font-display text-xl">A considered recommendation</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Your photo is used only to assess the visible outfit’s palette, materials and mood for this recommendation.</p>
                {error ? <p role="alert" className="mt-5 border-l-2 border-destructive pl-3 text-sm text-destructive">{error}</p> : null}
                <Button type="button" onClick={preview ? analyze : () => fileInput.current?.click()} disabled={loading} className="mt-8 w-full">
                  {loading ? <><LoaderCircle className="animate-spin" aria-hidden="true" /> Styling your look…</> : preview ? <><Sparkles aria-hidden="true" /> Get recommendation</> : <><ImagePlus aria-hidden="true" /> Choose photo</>}
                </Button>
                {preview ? <Button type="button" variant="ghost" onClick={() => fileInput.current?.click()} disabled={loading} className="mt-2 w-full">Choose another photo</Button> : null}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}