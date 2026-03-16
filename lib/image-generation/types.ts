import type {
  CharacterBuilderMode,
  CharacterConsistencyMode,
  CharacterConsistencyStrength,
  CharacterImageInsert,
  CharacterImageJobInsert,
  CharacterStyleType,
  HiddenPromptEngineInput,
  PromptEngineOutput,
} from "../character-builder/types";

export type ImageProvider = "runware";

export type ImageGenerationKind = "avatar" | "variation";

export type ImageModerationSnapshot = {
  isAdultOnly: boolean;
  subjectDeclared18Plus: boolean;
  consentConfirmed: boolean;
  depictsRealPerson: boolean;
  depictsPublicFigure: boolean;
  nonConsensualFlag: boolean;
  underageRiskFlag: boolean;
  illegalContentFlag: boolean;
  moderationStatus: "pending" | "approved" | "blocked";
  moderationNotes?: string | null;
};

export type ImageGenerationCandidate = {
  tempId: string;
  imageUrl: string;
  seed: number | null;
  width: number | null;
  height: number | null;
  model: string | null;
  provider: ImageProvider;
  promptUsed: string | null;
  negativePromptUsed: string | null;
};

export type GenerateInitialCharacterCandidatesParams = {
  provider: ImageProvider;
  styleType: CharacterStyleType;
  builderMode: CharacterBuilderMode;
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutput;
  candidateCount?: number;
  model?: string | null;
};

export type GenerateVariationParams = {
  provider: ImageProvider;
  characterId: string;
  styleType: CharacterStyleType;
  basePrompt: string;
  negativePrompt: string;
  variationPromptDelta: string;
  primaryReferenceImageUrl: string;
  referenceImageUrls?: string[];
  baseSeed?: number | null;
  consistencyMode: CharacterConsistencyMode;
  consistencyStrength: CharacterConsistencyStrength;
  model?: string | null;
};

export type ImageGenerationSuccessResult = {
  ok: true;
  provider: ImageProvider;
  kind: ImageGenerationKind;
  candidates: ImageGenerationCandidate[];
  externalJobId?: string | null;
  model?: string | null;
  raw?: unknown;
};

export type ImageGenerationErrorResult = {
  ok: false;
  provider: ImageProvider;
  kind: ImageGenerationKind;
  errorCode: string;
  errorMessage: string;
  raw?: unknown;
};

export type ImageGenerationResult =
  | ImageGenerationSuccessResult
  | ImageGenerationErrorResult;

export type RunwareTextToImageRequest = {
  positivePrompt: string;
  negativePrompt: string;
  width?: number;
  height?: number;
  numberResults?: number;
  model?: string;
  seed?: number;
};

export type RunwareReferenceImage = {
  url: string;
  weight?: number;
};

export type RunwarePhotoMakerRequest = {
  positivePrompt: string;
  negativePrompt: string;
  inputImages: RunwareReferenceImage[];
  width?: number;
  height?: number;
  numberResults?: number;
  model?: string;
  seed?: number;
};

export type ImageJobCreateInput = {
  userId: string;
  characterId: string;
  provider: ImageProvider;
  kind: ImageGenerationKind;
  styleType: CharacterStyleType;
  builderMode: CharacterBuilderMode;
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutput;
  model?: string | null;
  variationType?: string | null;
  referenceImageIds?: string[];
  seed?: number | null;
  moderation: ImageModerationSnapshot;
};

export type ImageJobUpdateStatusInput = {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  externalJobId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type SaveGeneratedImageInput = {
  userId: string;
  characterId: string;
  jobId: string | null;
  image: ImageGenerationCandidate;
  imageType: CharacterImageInsert["imageType"];
  variantKind: CharacterImageInsert["variantKind"];
  isPrimary: boolean;
  isReference: boolean;
  moderation: ImageModerationSnapshot;
};

export type SelectPrimaryReferenceCandidateInput = {
  characterId: string;
  candidate: ImageGenerationCandidate;
  promptEngineOutput: PromptEngineOutput;
};

export type BuildVariationRequestInput = {
  characterId: string;
  styleType: CharacterStyleType;
  lockedCanonicalPrompt: string;
  lockedNegativePrompt: string;
  primaryReferenceImageUrl: string;
  variationPromptDelta: string;
  consistencyMode: CharacterConsistencyMode;
  consistencyStrength: CharacterConsistencyStrength;
  baseSeed?: number | null;
  model?: string | null;
};

export type BuildVariationRequestOutput = {
  positivePrompt: string;
  negativePrompt: string;
  referenceImageUrls: string[];
  seed: number | null;
};

export type ImageProviderConfig = {
  provider: ImageProvider;
  apiKeyEnvName: string;
  baseUrlEnvName: string;
  defaultModel: string;
};

export const IMAGE_PROVIDER_CONFIGS: Record<ImageProvider, ImageProviderConfig> =
  {
    runware: {
      provider: "runware",
      apiKeyEnvName: "RUNWARE_API_KEY",
      baseUrlEnvName: "RUNWARE_API_BASE_URL",
      defaultModel: "runware:101@1",
    },
  };

export type CharacterImageJobRepositoryInsert = CharacterImageJobInsert & {
  userId: string;
  characterId: string;
  kind: ImageGenerationKind;
  moderation: ImageModerationSnapshot;
};

export type CharacterImageRepositoryInsert = CharacterImageInsert & {
  userId: string;
  characterId: string;
  jobId: string | null;
  moderation: ImageModerationSnapshot;
};

export type InitialGenerationDefaults = {
  width: number;
  height: number;
  numberResults: number;
};

export type VariationGenerationDefaults = {
  width: number;
  height: number;
  numberResults: number;
};

export const INITIAL_GENERATION_DEFAULTS: InitialGenerationDefaults = {
  width: 832,
  height: 1216,
  numberResults: 4,
};

export const VARIATION_GENERATION_DEFAULTS: VariationGenerationDefaults = {
  width: 832,
  height: 1216,
  numberResults: 2,
};
