import type {
  CharacterImagePromptInput,
  CharacterImageSafetyInput,
  ImageModerationSnapshot,
  ImageProvider,
} from "@/lib/image-generation/types";

export type GenerateImageRouteBody = {
  userId?: string;
  characterId: string;
  provider?: ImageProvider;
  kind?: "avatar" | "gallery";
  promptInput: CharacterImagePromptInput;
  safety: CharacterImageSafetyInput;
  previewImageUrl?: string | null;
  previewResolvedPrompt?: string | null;
  previewNegativePrompt?: string | null;
  consistencySourceImageUrl?: string | null;
  consistencyStrength?: "soft" | "strict" | null;
  baseSeed?: number | null;
  selectedCandidateId?: string | null;
  candidateCount?: number;
  model?: string | null;
  moderation?: Partial<ImageModerationSnapshot>;
};

export type GenerateImageRouteSuccess = {
  ok: true;
  imageUrl?: string | null;
  primaryImageUrl?: string | null;
  externalJobId?: string | null;
  promptSummary?: string | null;
  canonicalPrompt?: string | null;
  negativePrompt?: string | null;
  revisedPrompt?: string | null;
  revisedNegativePrompt?: string | null;
  errorMessage?: string;
};

export type GenerateImageRouteFailure = {
  ok: false;
  error?: string;
  errorMessage?: string;
};

export type GenerateImageRouteResponse =
  | GenerateImageRouteSuccess
  | GenerateImageRouteFailure;
