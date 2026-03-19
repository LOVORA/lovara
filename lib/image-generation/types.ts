export type ImageProvider = "runware";

export type CharacterImageSafetyInput = {
  isAdultOnly: boolean;
  subjectDeclared18Plus: boolean;
  consentConfirmed: boolean;
  depictsRealPerson: boolean;
  depictsPublicFigure: boolean;
  nonConsensualFlag: boolean;
  underageRiskFlag: boolean;
  illegalContentFlag: boolean;
};

export type CharacterImagePromptInput = {
  characterName: string;
  archetype?: string;
  visualAura?: string;
  ageBand?: "18-20" | "21-24" | "25-29" | "30-39" | "40+";
  genderPresentation?: string;
  region?: string;
  skinTone?: string;
  hair?: string;
  hairTexture?: string;
  eyes?: string;
  eyeShape?: string;
  makeupStyle?: string;
  accessoryVibe?: string;
  outfit?: string;
  palette?: string;
  camera?: string;
  avatarStyle?: string;
  bodyType?: string;
  bustSize?: string;
  hipsType?: string;
  waistDefinition?: string;
  heightImpression?: string;
  exposureLevel?: string;
  pose?: string;
  expression?: string;
  lightingMood?: string;
  environment?: string;
  signatureDetail?: string;
  nsfwLevel?: "adult" | "suggestive" | "none";
};

export type ImageGenerationKind = "initial" | "variation";

export type CharacterImageKind = "avatar" | "variation";

export type CharacterImageType =
  | "avatar"
  | "reference"
  | "variation"
  | "gallery";

export type CharacterImageVariantKind =
  | "base"
  | "outfit"
  | "selfie"
  | "pose"
  | "location"
  | "full_body";

export type ImageJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type ImageModerationStatus = "pending" | "approved" | "blocked";

export type ImageModerationSnapshot = {
  isAdultOnly: boolean;
  subjectDeclared18Plus: boolean;
  consentConfirmed: boolean;
  depictsRealPerson: boolean;
  depictsPublicFigure: boolean;
  nonConsensualFlag: boolean;
  underageRiskFlag: boolean;
  illegalContentFlag: boolean;
  moderationStatus: ImageModerationStatus;
  moderationNotes?: string | null;
};

export type GeneratedImageCandidate = {
  tempId: string;
  imageUrl: string;
  width?: number | null;
  height?: number | null;
  seed?: number | null;
  model?: string | null;
  prompt?: string | null;
  negativePrompt?: string | null;
};

export type PromptEngineOutputLike = {
  promptSummary: string;
  canonicalPrompt: string;
  negativePrompt: string;
  moderationFlags: {
    needsBlock: boolean;
    reasons: string[];
  };
  generationHints?: Record<string, unknown>;
  identityLock?: Record<string, unknown>;
};

export type InitialGenerationJobInput = {
  userId: string;
  characterId: string;
  provider: ImageProvider;
  styleType: string;
  builderMode: string;
  hiddenPromptInput: Record<string, unknown>;
  promptEngineOutput: PromptEngineOutputLike;
  model?: string | null;
  moderation: ImageModerationSnapshot;
};

export type InitialGenerationServiceArgs = {
  provider: ImageProvider;
  styleType: string;
  builderMode: string;
  hiddenPromptInput: Record<string, unknown>;
  promptEngineOutput: PromptEngineOutputLike;
  candidateCount?: number;
  model?: string | null;
};

export type InitialGenerationServiceResult =
  | {
      ok: true;
      provider: ImageProvider;
      kind: ImageGenerationKind;
      externalJobId?: string | null;
      candidates: GeneratedImageCandidate[];
    }
  | {
      ok: false;
      provider: ImageProvider;
      kind: ImageGenerationKind;
      errorCode: string;
      errorMessage: string;
    };

export type CharacterImageJobRepositoryInsert = {
  userId: string;
  characterId: string;
  provider: ImageProvider;
  kind: CharacterImageKind;
  promptInputJson: Record<string, unknown>;
  canonicalPrompt: string;
  negativePrompt: string;
  moderation: ImageModerationSnapshot;
  styleType: string;
  requestMode: string;
  referenceImageIds?: unknown;
  variationType?: string | null;
  seed?: number | null;
  model?: string | null;
};

export type CharacterImageRepositoryInsert = {
  userId: string;
  characterId: string;
  jobId: string | null;
  imageType: CharacterImageType;
  variantKind?: CharacterImageVariantKind | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  imageUrl?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  seed?: number | null;
  modelUsed?: string | null;
  providerUsed?: string | null;
  workflowName?: string | null;
  promptInputJson?: Record<string, unknown>;
  promptSnapshot?: string | null;
  negativePromptSnapshot?: string | null;
  isPrimary?: boolean;
  isReference?: boolean;
  sortOrder?: number;
  moderation: ImageModerationSnapshot;
};

export const IMAGE_PROVIDER_CONFIGS: Record<
  ImageProvider,
  {
    label: string;
  }
> = {
  runware: {
    label: "Runware",
  },
};
