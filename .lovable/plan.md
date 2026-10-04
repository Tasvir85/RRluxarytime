# AI Outfit Styling and Luxury Bracelet Upgrade

## What will be built

- Add an in-page “Style with your outfit” experience where shoppers can upload one outfit photo.
- Analyze the photo securely with Lovable AI and recommend one existing Aurum watch variant plus a coordinated scene background.
- Show the recommendation, concise styling rationale, detected palette, and an “Apply this pairing” action that updates the live 3D watch and background.
- Rebuild the procedural watch bracelet as a wider, continuous premium multi-link band with substantial end links, tapered articulation, polished/brushed contrast, and a complete clasp.

## Experience

- Place the styling entry point near the collection controls so it feels like part of shopping, not a separate technical tool.
- Use a refined upload dialog with photo preview, replace/remove controls, progress, clear validation, AI errors, and retry.
- Accept JPEG, PNG, and WebP outfit photos with client and server size/type checks.
- Keep all current navigation, scrolling, watch interaction, background choices, and system-time watch hands working.

## Technical details

- Add a one-shot TanStack server function for outfit analysis; the image and prompt stay inside the server request boundary.
- Use AI Gateway with `openai/gpt-6-astra` on the Responses API, multimodal image input, required reasoning options, structured output, and safe schema-recovery handling.
- Keep `LOVABLE_API_KEY` server-only and return only the recommendation fields needed by the page.
- Map model output to the fixed existing watch/background IDs, preventing arbitrary colors or invalid selections.
- Refactor bracelet geometry in `WatchModel` without changing the product scene architecture or external-model loading path.

## Verification

- Test upload validation, successful AI recommendation, apply action, retry/error states, and every dialog control.
- Inspect the watch and bracelet at desktop and mobile widths, including the current 1069×681 view, for overlap and visual continuity.
- Confirm the preview builds cleanly with no runtime or console errors.
