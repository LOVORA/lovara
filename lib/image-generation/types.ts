export type ImageProvider = "runware";

export type ImageGenerationKind = "initial" | "variation";

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
