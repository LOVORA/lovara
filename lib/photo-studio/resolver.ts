import type { CharacterImagePromptInput } from "@/lib/image-generation/types";
import {
  compilePhotoStudioSelection,
  buildSmartInitialStudioForm,
  normalizeStudioFormState,
} from "@/lib/photo-studio/presets";
import type { ImageStudioFormState } from "@/lib/photo-studio/types";

export function buildImageStudioInitialState(
  args: {
    input: CharacterImagePromptInput;
    latestGalleryImageUrl?: string | null;
  },
): ImageStudioFormState {
  return buildSmartInitialStudioForm({
    input: args.input,
    latestGalleryImageUrl: args.latestGalleryImageUrl,
    latestGalleryExists: Boolean(args.latestGalleryImageUrl),
  });
}

export function applyImageStudioOverrides(args: {
  basePromptInput: CharacterImagePromptInput;
  overrides: ImageStudioFormState;
}): CharacterImagePromptInput {
  return compilePhotoStudioSelection({
    basePromptInput: args.basePromptInput,
    form: normalizeStudioFormState(args.overrides),
  }).promptInput;
}

export function resolveStudioSelection(args: {
  basePromptInput: CharacterImagePromptInput;
  form: ImageStudioFormState;
}) {
  return compilePhotoStudioSelection({
    basePromptInput: args.basePromptInput,
    form: normalizeStudioFormState(args.form),
  });
}
