import type {
  GeneratedImageCandidate,
  ImageModerationSnapshot,
  ImageProvider,
  InitialGenerationJobInput,
  InitialGenerationServiceArgs,
  InitialGenerationServiceResult,
} from "@/lib/image-generation/types";
import { generateInitialCharacterCandidates } from "@/lib/image-generation/runware";

type CreateImageJobInsertPayloadResult = {
  user_id: string;
  character_id: string;
  provider: ImageProvider;
  status: "queued";
  request_type: "avatar";
  prompt_version: number;
  prompt_input: Record<string, unknown>;
  resolved_prompt: string;
  negative_prompt: string;
  style_type: string;
  request_mode: string;
  variation_type: string | null;
  model: string;
  workflow_name: string;
  moderation_status: string;
  moderation_notes: string | null;
  is_adult_only: boolean;
  subject_declared_18_plus: boolean;
  consent_confirmed: boolean;
  depicts_real_person: boolean;
  depicts_public_figure: boolean;
  non_consensual_flag: boolean;
  underage_risk_flag: boolean;
  illegal_content_flag: boolean;
};

type CreatePrimaryReferenceImageInsertPayloadArgs = {
  userId: string;
  characterId: string;
  jobId: string;
  candidate: GeneratedImageCandidate;
  moderation: ImageModerationSnapshot;
};

type MapInitialCandidatesToImageInsertPayloadsArgs = {
  userId: string;
  characterId: string;
  jobId: string;
  candidates: GeneratedImageCandidate[];
  selectedCandidateId: string | null;
  moderation: ImageModerationSnapshot;
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
): CreateImageJobInsertPayloadResult {
  return {
    user_id: input.userId,
    character_id: input.characterId,
    provider: input.provider,
    status: "queued",
    request_type: "avatar",
    prompt_version: 1,
    prompt_input: input.hiddenPromptInput,
    resolved_prompt: input.promptEngineOutput.canonicalPrompt,
    negative_prompt: input.promptEngineOutput.negativePrompt,
    style_type: input.styleType,
    request_mode: input.builderMode,
    variation_type: null,
    model: input.model ?? "runware-default",
    workflow_name: "runware-avatar-v1",
    moderation_status: input.moderation.moderationStatus,
    moderation_notes: input.moderation.moderationNotes ?? null,
    is_adult_only: input.moderation.isAdultOnly,
    subject_declared_18_plus: input.moderation.subjectDeclared18Plus,
    consent_confirmed: input.moderation.consentConfirmed,
    depicts_real_person: input.moderation.depictsRealPerson,
    depicts_public_figure: input.moderation.depictsPublicFigure,
    non_consensual_flag: input.moderation.nonConsensualFlag,
    underage_risk_flag: input.moderation.underageRiskFlag,
    illegal_content_flag: input.moderation.illegalContentFlag,
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
) {
  return args.candidates.map((candidate, index) => ({
    user_id: args.userId,
    character_id: args.characterId,
    job_id: args.jobId,
    kind: "avatar",
    image_type: index === 0 ? "reference" : "gallery",
    variant_kind: "base",
    source: "generated",
    visibility: "private",
    public_url: candidate.imageUrl,
    width: candidate.width ?? null,
    height: candidate.height ?? null,
    seed: candidate.seed ?? null,
    model: candidate.model ?? "runware-default",
    model_used: candidate.model ?? "runware-default",
    provider_used: "runware",
    workflow_name: "runware-avatar-v1",
    prompt_version: 1,
    prompt_input: {},
    resolved_prompt: candidate.prompt ?? null,
    negative_prompt: candidate.negativePrompt ?? null,
    prompt_snapshot: candidate.prompt ?? null,
    negative_prompt_snapshot: candidate.negativePrompt ?? null,
    is_primary: candidate.tempId === args.selectedCandidateId,
    is_reference: candidate.tempId === args.selectedCandidateId,
    sort_order: index,
    is_adult_only: args.moderation.isAdultOnly,
    subject_declared_18_plus: args.moderation.subjectDeclared18Plus,
    consent_confirmed: args.moderation.consentConfirmed,
    depicts_real_person: args.moderation.depictsRealPerson,
    depicts_public_figure: args.moderation.depictsPublicFigure,
    moderation_status: args.moderation.moderationStatus,
    moderation_notes: args.moderation.moderationNotes ?? null,
  }));
}

export function createPrimaryReferenceImageInsertPayload(
  args: CreatePrimaryReferenceImageInsertPayloadArgs,
) {
  return {
    user_id: args.userId,
    character_id: args.characterId,
    job_id: args.jobId,
    kind: "avatar",
    image_type: "reference",
    variant_kind: "base",
    source: "generated",
    visibility: "private",
    public_url: args.candidate.imageUrl,
    width: args.candidate.width ?? null,
    height: args.candidate.height ?? null,
    seed: args.candidate.seed ?? null,
    model: args.candidate.model ?? "runware-default",
    model_used: args.candidate.model ?? "runware-default",
    provider_used: "runware",
    workflow_name: "runware-avatar-v1",
    prompt_version: 1,
    prompt_input: {},
    resolved_prompt: args.candidate.prompt ?? null,
    negative_prompt: args.candidate.negativePrompt ?? null,
    prompt_snapshot: args.candidate.prompt ?? null,
    negative_prompt_snapshot: args.candidate.negativePrompt ?? null,
    is_primary: true,
    is_reference: true,
    sort_order: 0,
    is_adult_only: args.moderation.isAdultOnly,
    subject_declared_18_plus: args.moderation.subjectDeclared18Plus,
    consent_confirmed: args.moderation.consentConfirmed,
    depicts_real_person: args.moderation.depictsRealPerson,
    depicts_public_figure: args.moderation.depictsPublicFigure,
    moderation_status: args.moderation.moderationStatus,
    moderation_notes: args.moderation.moderationNotes ?? null,
  };
}
