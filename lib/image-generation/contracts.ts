import type {
  BatchJudgeSummary,
  ImageGenerationProfile,
  ImageQualityTier,
  ImageReferenceStrategy,
  CharacterImagePromptInput,
  CharacterImageSafetyInput,
  ImageModerationSnapshot,
  ImageProvider,
  GeneratedImageCandidate,
} from "@/lib/image-generation/types";

export type GenerateImageRouteBody = {
  userId?: string;
  characterId: string;
  provider?: ImageProvider;
  kind?: "avatar" | "gallery";
  studioMode?: "normal" | "adult";
  promptInput: CharacterImagePromptInput;
  safety: CharacterImageSafetyInput;
  previewImageUrl?: string | null;
  previewResolvedPrompt?: string | null;
  previewNegativePrompt?: string | null;
  consistencySourceImageUrl?: string | null;
  consistencyStrength?: "soft" | "strict" | null;
  seedImageUrl?: string | null;
  seedStrength?: number | null;
  baseSeed?: number | null;
  selectedCandidateId?: string | null;
  candidateCount?: number;
  model?: string | null;
  generationProfile?: ImageGenerationProfile;
  qualityTier?: ImageQualityTier;
  referenceStrategy?: ImageReferenceStrategy;
  moderation?: Partial<ImageModerationSnapshot>;
  previewOnly?: boolean;
};

export type GenerateImageRouteSuccess = {
  ok: true;
  imageUrl?: string | null;
  savedImageId?: string | null;
  primaryImageUrl?: string | null;
  externalJobId?: string | null;
  promptSummary?: string | null;
  canonicalPrompt?: string | null;
  negativePrompt?: string | null;
  revisedPrompt?: string | null;
  revisedNegativePrompt?: string | null;
  generationProfile?: ImageGenerationProfile | null;
  qualityTier?: ImageQualityTier | null;
  referenceStrategy?: ImageReferenceStrategy | null;
  providerModel?: string | null;
  candidates?: GeneratedImageCandidate[];
  judgeSummary?: BatchJudgeSummary | null;
  previewMode?: boolean;
  errorMessage?: string;
};

export type GenerateImageRouteFailure = {
  ok: false;
  error?: string;
  errorMessage?: string;
  errorCode?: string;
  blockedRequestReason?: string | null;
  safeAlternatives?: string[];
  reasons?: string[];
  matchedTerms?: string[];
};

export type GenerateImageRouteResponse =
  | GenerateImageRouteSuccess
  | GenerateImageRouteFailure;
