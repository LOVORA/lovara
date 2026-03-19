import {
  buildStudioAvatarPromptInput,
  buildStudioBuilderSummary,
  buildStudioHiddenPromptInput,
  enrichDraftWithStudioBuilder,
  type StudioAvatarPromptInput,
  type StudioDraftLike,
  type StudioFormLike,
} from "@/lib/create-character/studio-builder";
import {
  getStructuredBodyNotes,
  readStructuredNotes,
  type StudioStructuredNoteMap,
} from "@/lib/create-character/studio-notes";

export type LegacyStudioFormLike = StudioFormLike;
export type LegacyDraftLike = StudioDraftLike;
export type LegacyAvatarPromptInput = StudioAvatarPromptInput;
export type LegacyStructuredNotes = StudioStructuredNoteMap;

export function parseLegacyStructuredNotes(
  customNotes: string,
): LegacyStructuredNotes {
  return readStructuredNotes(customNotes);
}

export function getLegacyBodyNotes(customNotes: string): string {
  return getStructuredBodyNotes(customNotes);
}

export function buildLegacyHiddenPromptInput(form: LegacyStudioFormLike) {
  return buildStudioHiddenPromptInput(form);
}

export function buildLegacyBuilderV2Summary(form: LegacyStudioFormLike) {
  return buildStudioBuilderSummary(form);
}

export function enrichLegacyDraftWithBuilderV2(
  draft: LegacyDraftLike,
  form: LegacyStudioFormLike,
) {
  return enrichDraftWithStudioBuilder(draft, form);
}

export function buildLegacyAvatarPromptInputCompat(
  form: LegacyStudioFormLike,
) {
  return buildStudioAvatarPromptInput(form);
}
