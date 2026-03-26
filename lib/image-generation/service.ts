import type {
  BatchJudgeSummary,
  CharacterImageJobRepositoryInsert,
  CharacterImageRepositoryInsert,
  GeneratedImageCandidate,
  ImageProvider,
  ImageModerationSnapshot,
  InitialGenerationJobInput,
  InitialGenerationServiceArgs,
  InitialGenerationServiceResult,
  VariationLockContract,
} from "@/lib/image-generation/types";
import {
  generateCharacterVariationCandidates,
  generateInitialCharacterCandidates,
} from "@/lib/image-generation/runware";

type CreatePrimaryReferenceImageInsertPayloadArgs = {
  userId: string;
  characterId: string;
  jobId: string | null;
  candidate: GeneratedImageCandidate;
  moderation: ImageModerationSnapshot;
  hiddenPromptInput?: Record<string, unknown>;
  providerUsed?: ImageProvider;
  providerModel?: string | null;
  judgeSummary?: BatchJudgeSummary | null;
};

type MapInitialCandidatesToImageInsertPayloadsArgs = {
  userId: string;
  characterId: string;
  jobId: string | null;
  candidates: GeneratedImageCandidate[];
  selectedCandidateId: string | null;
  moderation: ImageModerationSnapshot;
  hiddenPromptInput?: Record<string, unknown>;
  providerUsed?: ImageProvider;
  providerModel?: string | null;
  judgeSummary?: BatchJudgeSummary | null;
};

function normalizeCandidate(candidate: GeneratedImageCandidate): GeneratedImageCandidate {
  return {
    tempId: candidate.tempId,
    imageUrl: candidate.imageUrl,
    width: candidate.width ?? null,
    height: candidate.height ?? null,
    seed: candidate.seed ?? null,
    model: candidate.model ?? null,
    prompt: candidate.prompt ?? null,
    negativePrompt: candidate.negativePrompt ?? null,
  };
}

export function createInitialGenerationJobInput(
  input: InitialGenerationJobInput,
): InitialGenerationJobInput {
  return input;
}

export function createImageJobInsertPayload(
  input: InitialGenerationJobInput,
): CharacterImageJobRepositoryInsert {
  const generationProfile =
    input.builderMode === "gallery"
      ? "identity_locked_gallery"
      : "identity_locked_avatar";

  return {
    userId: input.userId,
    characterId: input.characterId,
    provider: input.provider,
    kind: input.builderMode === "gallery" ? "variation" : "avatar",
    promptInputJson: input.hiddenPromptInput,
    canonicalPrompt: input.promptEngineOutput.canonicalPrompt,
    negativePrompt: input.promptEngineOutput.negativePrompt,
    styleType: input.styleType,
    requestMode: input.builderMode,
    variationType: null,
    model: input.model ?? "runware-default",
    generationProfile,
    qualityTier: "max",
    referenceStrategy:
      generationProfile === "identity_locked_gallery"
        ? "stacked_character_reference"
        : "single_avatar_lock",
    providerModel: input.model ?? "runware-default",
    moderation: input.moderation,
  };
}

export function mapGalleryCandidatesToImageInsertPayloads(args: {
  userId: string;
  characterId: string;
  jobId: string | null;
  candidates: GeneratedImageCandidate[];
  moderation: ImageModerationSnapshot;
  hiddenPromptInput?: Record<string, unknown>;
  providerUsed?: ImageProvider;
  providerModel?: string | null;
  judgeSummary?: BatchJudgeSummary | null;
}): CharacterImageRepositoryInsert[] {
  return args.candidates.map((candidate, index) => ({
    userId: args.userId,
    characterId: args.characterId,
    jobId: args.jobId,
    imageType: "gallery",
    variantKind: index === 0 ? "pose" : "location",
    imageUrl: candidate.imageUrl,
    width: candidate.width ?? null,
    height: candidate.height ?? null,
    seed: candidate.seed ?? null,
    modelUsed: args.providerModel ?? candidate.model ?? "runware-default",
    providerUsed: args.providerUsed ?? "runware",
    workflowName: "runware-gallery-v1",
    promptInputJson: {
      ...(args.hiddenPromptInput ?? {}),
      generationProfile: "identity_locked_gallery",
      qualityTier: "max",
      referenceStrategy: "stacked_character_reference",
      providerUsed: args.providerUsed ?? "runware",
      providerModel: args.providerModel ?? candidate.model ?? "runware-default",
      judgeSummary: args.judgeSummary ?? null,
    },
    promptSnapshot: candidate.prompt ?? null,
    negativePromptSnapshot: candidate.negativePrompt ?? null,
    isPrimary: false,
    isReference: false,
    sortOrder: index,
    generationProfile: "identity_locked_gallery",
    qualityTier: "max",
    referenceStrategy: "stacked_character_reference",
    providerModel: args.providerModel ?? candidate.model ?? "runware-default",
    qualityScore:
      args.judgeSummary?.reports.find((report) => report.candidateId === candidate.tempId)
        ?.score ?? null,
    qualityFlags:
      args.judgeSummary?.reports.find((report) => report.candidateId === candidate.tempId)
        ?.flags ?? null,
    judgeVersion: args.judgeSummary?.judgeVersion ?? null,
    moderation: args.moderation,
  }));
}

export async function generateInitialCharacterCandidatesWithService(
  args: InitialGenerationServiceArgs,
): Promise<InitialGenerationServiceResult> {
  try {
    const result = await generateInitialCharacterCandidates({
      provider: "runware",
      styleType: args.styleType,
      builderMode: args.builderMode,
      hiddenPromptInput: args.hiddenPromptInput,
      promptEngineOutput: args.promptEngineOutput,
      candidateCount: args.candidateCount,
      model: args.model ?? null,
    });

    if (!result.ok) {
      return {
        ok: false,
        provider: args.provider,
        kind: "initial",
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      };
    }

    return {
      ok: true,
      provider: args.provider,
      kind: "initial",
      externalJobId: null,
      candidates: result.candidates.map(
  (
    candidate: {
      tempId: string;
      imageUrl: string;
      width?: number | null;
      height?: number | null;
      seed?: number | null;
      model?: string | null;
      promptUsed?: string | null;
      negativePromptUsed?: string | null;
    },
  ) =>
    normalizeCandidate({
      tempId: candidate.tempId,
      imageUrl: candidate.imageUrl,
      width: candidate.width ?? null,
      height: candidate.height ?? null,
      seed: candidate.seed ?? null,
      model: candidate.model ?? null,
      prompt: candidate.promptUsed ?? null,
      negativePrompt: candidate.negativePromptUsed ?? null,
    }),
),
    };
  } catch (error) {
    return {
      ok: false,
      provider: args.provider,
      kind: "initial",
      errorCode: "RUNWARE_GENERATION_FAILED",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown Runware generation error.",
    };
  }
}

export async function generateVariationCandidatesWithService(args: {
  provider: ImageProvider;
  styleType: string;
  characterId: string;
  basePrompt: string;
  negativePrompt: string;
  primaryReferenceImageUrl: string;
  variationPromptDelta: string;
  variationLockContract?: VariationLockContract | null;
  consistencyStrength?: "soft" | "strict" | null;
  baseSeed?: number | null;
  model?: string | null;
  referenceImageUrls?: string[] | null;
  candidateCount?: number | null;
  outputType?: "portrait" | "upper_body" | "selfie" | "full_body" | null;
}): Promise<InitialGenerationServiceResult> {
  try {
    return await generateCharacterVariationCandidates({
      provider: "runware",
      characterId: args.characterId,
      styleType: args.styleType,
      basePrompt: args.basePrompt,
      negativePrompt: args.negativePrompt,
      primaryReferenceImageUrl: args.primaryReferenceImageUrl,
      variationPromptDelta: args.variationPromptDelta,
      variationLockContract: args.variationLockContract ?? null,
      consistencyStrength: args.consistencyStrength ?? "strict",
      consistencyMode: "reference_guided",
      baseSeed: args.baseSeed ?? null,
      model: args.model ?? null,
      referenceImageUrls: args.referenceImageUrls ?? null,
      candidateCount: args.candidateCount ?? null,
      outputType: args.outputType ?? null,
    });
  } catch (error) {
    return {
      ok: false,
      provider: args.provider,
      kind: "variation",
      errorCode: "RUNWARE_VARIATION_FAILED",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown Runware variation error.",
    };
  }
}

export function getSelectedCandidate(
  candidates: GeneratedImageCandidate[],
  selectedCandidateId: string | null,
): GeneratedImageCandidate | null {
  if (!candidates.length) return null;

  if (!selectedCandidateId) {
    return candidates[0] ?? null;
  }

  return (
    candidates.find((candidate) => candidate.tempId === selectedCandidateId) ?? null
  );
}

export function mapInitialCandidatesToImageInsertPayloads(
  args: MapInitialCandidatesToImageInsertPayloadsArgs,
): CharacterImageRepositoryInsert[] {
  const providerUsed = args.providerUsed ?? "runware";
  const providerModelFallback = "runware-default";
  const workflowName = "runware-avatar-v1";

  return args.candidates.map((candidate, index) => ({
    userId: args.userId,
    characterId: args.characterId,
    jobId: args.jobId,
    imageType: index === 0 ? "reference" : "gallery",
    variantKind: "base",
    imageUrl: candidate.imageUrl,
    width: candidate.width ?? null,
    height: candidate.height ?? null,
    seed: candidate.seed ?? null,
    modelUsed: args.providerModel ?? candidate.model ?? providerModelFallback,
    providerUsed,
    workflowName,
    promptInputJson: {
      ...(args.hiddenPromptInput ?? {}),
      generationProfile: "identity_locked_avatar",
      qualityTier: "max",
      referenceStrategy: "single_avatar_lock",
      providerUsed,
      providerModel: args.providerModel ?? candidate.model ?? providerModelFallback,
      judgeSummary: args.judgeSummary ?? null,
    },
    promptSnapshot: candidate.prompt ?? null,
    negativePromptSnapshot: candidate.negativePrompt ?? null,
    isPrimary: candidate.tempId === args.selectedCandidateId,
    isReference: candidate.tempId === args.selectedCandidateId,
    sortOrder: index,
    generationProfile: "identity_locked_avatar",
    qualityTier: "max",
    referenceStrategy: "single_avatar_lock",
    providerModel: args.providerModel ?? candidate.model ?? providerModelFallback,
    qualityScore:
      args.judgeSummary?.reports.find((report) => report.candidateId === candidate.tempId)
        ?.score ?? null,
    qualityFlags:
      args.judgeSummary?.reports.find((report) => report.candidateId === candidate.tempId)
        ?.flags ?? null,
    judgeVersion: args.judgeSummary?.judgeVersion ?? null,
    moderation: args.moderation,
  }));
}

export function createPrimaryReferenceImageInsertPayload(
  args: CreatePrimaryReferenceImageInsertPayloadArgs,
): CharacterImageRepositoryInsert {
  const providerUsed = args.providerUsed ?? "runware";
  const providerModelFallback = "runware-default";
  const workflowName = "runware-avatar-v1";

  return {
    userId: args.userId,
    characterId: args.characterId,
    jobId: args.jobId,
    imageType: "reference",
    variantKind: "base",
    imageUrl: args.candidate.imageUrl,
    width: args.candidate.width ?? null,
    height: args.candidate.height ?? null,
    seed: args.candidate.seed ?? null,
    modelUsed: args.providerModel ?? args.candidate.model ?? providerModelFallback,
    providerUsed,
    workflowName,
    promptInputJson: {
      ...(args.hiddenPromptInput ?? {}),
      generationProfile: "identity_locked_avatar",
      qualityTier: "max",
      referenceStrategy: "single_avatar_lock",
      providerUsed,
      providerModel: args.providerModel ?? args.candidate.model ?? providerModelFallback,
      judgeSummary: args.judgeSummary ?? null,
    },
    promptSnapshot: args.candidate.prompt ?? null,
    negativePromptSnapshot: args.candidate.negativePrompt ?? null,
    isPrimary: true,
    isReference: true,
    sortOrder: 0,
    generationProfile: "identity_locked_avatar",
    qualityTier: "max",
    referenceStrategy: "single_avatar_lock",
    providerModel: args.providerModel ?? args.candidate.model ?? providerModelFallback,
    qualityScore:
      args.judgeSummary?.reports.find(
        (report) => report.candidateId === args.candidate.tempId,
      )?.score ?? null,
    qualityFlags:
      args.judgeSummary?.reports.find(
        (report) => report.candidateId === args.candidate.tempId,
      )?.flags ?? null,
    judgeVersion: args.judgeSummary?.judgeVersion ?? null,
    moderation: args.moderation,
  };
}
