import type { StructuredNoteKey } from "@/lib/create-character/studio-editor";
import type { StudioFormState } from "@/lib/custom-character-studio";

export type SetStudioField = <K extends keyof StudioFormState>(
  key: K,
  value: StudioFormState[K],
) => void;

export type RebuildCustomNotes = (
  next: Partial<Record<StructuredNoteKey, string>>,
  nextBodyNotes?: string,
) => void;
