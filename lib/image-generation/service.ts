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
import {
  generateCharacterVariation,
  generateInitialCharacterCandidates,
} from "./runware";
import type {
  BuildVariationRequestInput,
  BuildVariationRequestOutput,
  CharacterImageJobRepositoryInsert,
  CharacterImageRepositoryInsert,
  GenerateInitialCharacterCandidatesParams,
  GenerateVariationParams,
  ImageGenerationCandidate,
  ImageGenerationResult,
  ImageModerationSnapshot,
  ImageProvider,
  ImageProviderConfig,
  ImageProviderConfig as _ImageProviderConfig,
  ImageJobCreateInput,
  SaveGeneratedImageInput,
  SelectPrimaryReferenceCandidateInput,
} from "./types";
import { IMAGE_PROVIDER_CONFIGS } from "./types";

function normalizeModerationSnapshot(
  moderation?: Partial<ImageModerationSnapshot>,
): ImageModerationSnapshot {
  return {
    isAdultOnly: moderation?.isAdultOnly ?? true,
    subjectDeclared18Plus: moderation?.subjectDeclared18Plus ?? true,
    consentConfirmed: moderation?.consentConfirmed ?? true,
    depictsRealPerson: moderation?.depictsRealPerson ?? false,
    depictsPublicFigure: moderation?.depictsPublicFigure ?? false,
    nonConsensualFlag: moderation?.nonConsensualFlag ?? false,
    underageRiskFlag: moderation?.underageRiskFlag ?? false,
    illegalContentFlag: moderation?.illegalContentFlag ?? false,
    moderationStatus: moderation?.moderationStatus ?? "approved",
    moderationNotes: moderation?.moderationNotes ?? null,
  };
}

function inferJobStatusFromResult(
  result: ImageGenerationResult,
): "queued" | "processing" | "completed" | "failed" {
  return result.ok ? "completed" : "failed";
}

function buildPromptInputJson(
  hiddenPromptInput: HiddenPromptEngineInput,
): Record<string, unknown> {
  return {
    styleType: hiddenPromptInput.styleType,
    builderMode: hiddenPromptInput.builderMode,
    presetSelections: hiddenPromptInput.presetSelections ?? null,
    customPrompt: hiddenPromptInput.customPrompt ?? null,
  };
}

function mapVariationKind(
  variationType: string | null | undefined,
): CharacterImageInsert["variantKind"] {
  switch (variationType) {
    case "outfit":
    case "selfie":
    case "pose":
    case "location":
    case "full_body":
      return variationType;
    default:
      return "base";
  }
}

export function getImageProviderConfig(provider: ImageProvider): ImageProviderConfig {
  return IMAGE_PROVIDER_CONFIGS[provider];
}

export function createImageJobInsertPayload(
  input: ImageJobCreateInput,
): CharacterImageJobRepositoryInsert {
  const moderation = normalizeModerationSnapshot(input.moderation);

  const base: CharacterImageJobInsert = {
    provider: input.provider,
    model: input.model ?? null,
    styleType: input.styleType,
    requestMode: input.builderMode,
    promptInputJson: buildPromptInputJson(input.hiddenPromptInput),
    canonicalPrompt: input.promptEngineOutput.canonicalPrompt,
    negativePrompt: input.promptEngineOutput.negativePrompt,
    seed: input.seed ?? null,
    referenceImageIds: input.referenceImageIds ?? [],
    variationType: input.variationType ?? null,
  };

  return {
    ...base,
    userId: input.userId,
    characterId: input.characterId,
    kind: input.kind,
    moderation,
  };
}

export function createCharacterImageInsertPayload(
  input: SaveGeneratedImageInput,
): CharacterImageRepositoryInsert {
  const moderation = normalizeModerationSnapshot(input.moderation);

  return {
    userId: input.userId,
    characterId: input.characterId,
    jobId: input.jobId,
    imageType: input.imageType,
    variantKind: input.variantKind,
    imageUrl: input.image.imageUrl,
    storageBucket: null,
    storagePath: null,
    width: input.image.width,
    height: input.image.height,
    mimeType: "image/jpeg",
    fileSizeBytes: null,
    seed: input.image.seed,
    modelUsed: input.image.model,
    providerUsed: input.image.provider,
    promptSnapshot: input.image.promptUsed,
    negativePromptSnapshot: input.image.negativePromptUsed,
    isPrimary: input.isPrimary,
    isReference: input.isReference,
    moderation,
  };
}

export function createPrimaryReferenceImageInsertPayload(args: {
  userId: string;
  characterId: string;
  jobId: string | null;
  candidate: ImageGenerationCandidate;
  moderation?: Partial<ImageModerationSnapshot>;
}): CharacterImageRepositoryInsert {
  return createCharacterImageInsertPayload({
    userId: args.userId,
    characterId: args.characterId,
    jobId: args.jobId,
    image: args.candidate,
    imageType: "reference",
    variantKind: "base",
    isPrimary: true,
    isReference: true,
    moderation: normalizeModerationSnapshot(args.moderation),
  });
}

export function selectPrimaryReferenceCandidate(
  input: SelectPrimaryReferenceCandidateInput,
): {
  primaryReferenceImageUrl: string;
  promptSummary: string;
  canonicalPrompt: string;
  negativePrompt: string;
} {
  return {
    primaryReferenceImageUrl: input.candidate.imageUrl,
    promptSummary: input.promptEngineOutput.promptSummary,
    canonicalPrompt: input.promptEngineOutput.canonicalPrompt,
    negativePrompt: input.promptEngineOutput.negativePrompt,
  };
}

export function buildVariationRequestFromService(
  input: BuildVariationRequestInput,
): BuildVariationRequestOutput {
  const positivePrompt = [
    input.lockedCanonicalPrompt,
    input.variationPromptDelta,
    input.consistencyStrength === "strict"
      ? "preserve same face identity, preserve same body identity"
      : "keep similar identity, allow light scene variation",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    positivePrompt,
    negativePrompt: input.lockedNegativePrompt,
    referenceImageUrls: [input.primaryReferenceImageUrl],
    seed:
      input.consistencyMode === "seed_only"
        ? input.baseSeed ?? null
        : input.baseSeed ?? null,
  };
}

export async function generateInitialCharacterCandidatesWithService(
  params: GenerateInitialCharacterCandidatesParams,
): Promise<ImageGenerationResult> {
  return generateInitialCharacterCandidates(params);
}

export async function generateCharacterVariationWithService(
  params: GenerateVariationParams,
): Promise<ImageGenerationResult> {
  return generateCharacterVariation(params);
}

export function createInitialGenerationJobInput(args: {
  userId: string;
  characterId: string;
  provider: ImageProvider;
  styleType: CharacterStyleType;
  builderMode: CharacterBuilderMode;
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutput;
  model?: string | null;
  seed?: number | null;
  moderation?: Partial<ImageModerationSnapshot>;
}): ImageJobCreateInput {
  return {
    userId: args.userId,
    characterId: args.characterId,
    provider: args.provider,
    kind: "avatar",
    styleType: args.styleType,
    builderMode: args.builderMode,
    hiddenPromptInput: args.hiddenPromptInput,
    promptEngineOutput: args.promptEngineOutput,
    model: args.model ?? null,
    seed: args.seed ?? null,
    referenceImageIds: [],
    moderation: normalizeModerationSnapshot(args.moderation),
  };
}

export function createVariationGenerationJobInput(args: {
  userId: string;
  characterId: string;
  provider: ImageProvider;
  styleType: CharacterStyleType;
  builderMode: CharacterBuilderMode;
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutput;
  model?: string | null;
  seed?: number | null;
  referenceImageIds?: string[];
  variationType?: string | null;
  moderation?: Partial<ImageModerationSnapshot>;
}): ImageJobCreateInput {
  return {
    userId: args.userId,
    characterId: args.characterId,
    provider: args.provider,
    kind: "variation",
    styleType: args.styleType,
    builderMode: args.builderMode,
    hiddenPromptInput: args.hiddenPromptInput,
    promptEngineOutput: args.promptEngineOutput,
    model: args.model ?? null,
    seed: args.seed ?? null,
    referenceImageIds: args.referenceImageIds ?? [],
    variationType: args.variationType ?? null,
    moderation: normalizeModerationSnapshot(args.moderation),
  };
}

export function mapInitialCandidatesToImageInsertPayloads(args: {
  userId: string;
  characterId: string;
  jobId: string | null;
  candidates: ImageGenerationCandidate[];
  selectedCandidateId?: string | null;
  moderation?: Partial<ImageModerationSnapshot>;
}): CharacterImageRepositoryInsert[] {
  const moderation = normalizeModerationSnapshot(args.moderation);

  return args.candidates.map((candidate) =>
    createCharacterImageInsertPayload({
      userId: args.userId,
      characterId: args.characterId,
      jobId: args.jobId,
      image: candidate,
      imageType: candidate.tempId === args.selectedCandidateId ? "avatar" : "gallery",
      variantKind: "base",
      isPrimary: candidate.tempId === args.selectedCandidateId,
      isReference: candidate.tempId === args.selectedCandidateId,
      moderation,
    }),
  );
}

export function mapVariationCandidatesToImageInsertPayloads(args: {
  userId: string;
  characterId: string;
  jobId: string | null;
  candidates: ImageGenerationCandidate[];
  variationType?: string | null;
  moderation?: Partial<ImageModerationSnapshot>;
}): CharacterImageRepositoryInsert[] {
  const moderation = normalizeModerationSnapshot(args.moderation);
  const variantKind = mapVariationKind(args.variationType);

  return args.candidates.map((candidate) =>
    createCharacterImageInsertPayload({
      userId: args.userId,
      characterId: args.characterId,
      jobId: args.jobId,
      image: candidate,
      imageType: "variation",
      variantKind,
      isPrimary: false,
      isReference: false,
      moderation,
    }),
  );
}

export function buildImageJobStatusUpdate(args: {
  jobId: string;
  result: ImageGenerationResult;
}): {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  externalJobId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
} {
  if (args.result.ok) {
    return {
      jobId: args.jobId,
      status: inferJobStatusFromResult(args.result),
      externalJobId: args.result.externalJobId ?? null,
      errorCode: null,
      errorMessage: null,
    };
  }

  return {
    jobId: args.jobId,
    status: "failed",
    errorCode: args.result.errorCode,
    errorMessage: args.result.errorMessage,
    externalJobId: null,
  };
}

export function getSelectedCandidate(
  candidates: ImageGenerationCandidate[],
  selectedCandidateId?: string | null,
): ImageGenerationCandidate | null {
  if (!selectedCandidateId) return null;
  return candidates.find((candidate) => candidate.tempId === selectedCandidateId) ?? null;
}
