import type {
  CharacterImageJobRepositoryInsert,
  CharacterImageRepositoryInsert,
  GeneratedImageCandidate,
  ImageModerationSnapshot,
  InitialGenerationJobInput,
  InitialGenerationServiceArgs,
  InitialGenerationServiceResult,
} from "@/lib/image-generation/types";
import {
  generateCharacterVariationCandidates,
  generateInitialCharacterCandidates,
} from "@/lib/image-generation/runware";

type CreatePrimaryReferenceImageInsertPayloadArgs = {
  userId: string;
  characterId: string;
  jobId: string;
  candidate: GeneratedImageCandidate;
  moderation: ImageModerationSnapshot;
  hiddenPromptInput?: Record<string, unknown>;
};

type MapInitialCandidatesToImageInsertPayloadsArgs = {
  userId: string;
  characterId: string;
  jobId: string;
  candidates: GeneratedImageCandidate[];
  selectedCandidateId: string | null;
  moderation: ImageModerationSnapshot;
  hiddenPromptInput?: Record<string, unknown>;
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
  return {
    userId: input.userId,
    characterId: input.characterId,
    provider: input.provider,
    kind: "avatar",
    promptInputJson: input.hiddenPromptInput,
    canonicalPrompt: input.promptEngineOutput.canonicalPrompt,
    negativePrompt: input.promptEngineOutput.negativePrompt,
    styleType: input.styleType,
    requestMode: input.builderMode,
    variationType: null,
    model: input.model ?? "runware-default",
    moderation: input.moderation,
  };
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
        provider: "runware",
        kind: "initial",
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      };
    }

    return {
      ok: true,
      provider: "runware",
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
      provider: "runware",
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
  provider: "runware";
  styleType: string;
  characterId: string;
  basePrompt: string;
  negativePrompt: string;
  primaryReferenceImageUrl: string;
  variationPromptDelta: string;
  consistencyStrength?: "soft" | "strict" | null;
  baseSeed?: number | null;
  model?: string | null;
  referenceImageUrls?: string[] | null;
}): Promise<InitialGenerationServiceResult> {
  try {
    return await generateCharacterVariationCandidates({
      characterId: args.characterId,
      styleType: args.styleType,
      basePrompt: args.basePrompt,
      negativePrompt: args.negativePrompt,
      primaryReferenceImageUrl: args.primaryReferenceImageUrl,
      variationPromptDelta: args.variationPromptDelta,
      consistencyStrength: args.consistencyStrength ?? "strict",
      consistencyMode: "reference_guided",
      baseSeed: args.baseSeed ?? null,
      model: args.model ?? null,
      referenceImageUrls: args.referenceImageUrls ?? null,
    });
  } catch (error) {
    return {
      ok: false,
      provider: "runware",
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
    modelUsed: candidate.model ?? "runware-default",
    providerUsed: "runware",
    workflowName: "runware-avatar-v1",
    promptInputJson: args.hiddenPromptInput ?? {},
    promptSnapshot: candidate.prompt ?? null,
    negativePromptSnapshot: candidate.negativePrompt ?? null,
    isPrimary: candidate.tempId === args.selectedCandidateId,
    isReference: candidate.tempId === args.selectedCandidateId,
    sortOrder: index,
    moderation: args.moderation,
  }));
}

export function createPrimaryReferenceImageInsertPayload(
  args: CreatePrimaryReferenceImageInsertPayloadArgs,
): CharacterImageRepositoryInsert {
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
    modelUsed: args.candidate.model ?? "runware-default",
    providerUsed: "runware",
    workflowName: "runware-avatar-v1",
    promptInputJson: args.hiddenPromptInput ?? {},
    promptSnapshot: args.candidate.prompt ?? null,
    negativePromptSnapshot: args.candidate.negativePrompt ?? null,
    isPrimary: true,
    isReference: true,
    sortOrder: 0,
    moderation: args.moderation,
  };
}
