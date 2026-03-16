import { NextResponse } from "next/server";

import type {
  CharacterBuilderMode,
  CharacterConsistencyMode,
  CharacterConsistencyStrength,
  CharacterStyleType,
  HiddenPromptEngineInput,
} from "@/lib/character-builder/types";
import { runPromptEngine } from "@/lib/character-builder/prompt-engine";
import {
  createInitialGenerationJobInput,
  createImageJobInsertPayload,
  createPrimaryReferenceImageInsertPayload,
  generateInitialCharacterCandidatesWithService,
  getSelectedCandidate,
  mapInitialCandidatesToImageInsertPayloads,
} from "@/lib/image-generation/service";
import type { ImageModerationSnapshot, ImageProvider } from "@/lib/image-generation/types";
import {
  createCharacterImage,
  setPrimaryCharacterImage,
  setReferenceCharacterImage,
} from "@/lib/character-repository/images";
import {
  createCharacterImageJob,
  markCharacterImageJobCompleted,
  markCharacterImageJobFailed,
  markCharacterImageJobProcessing,
} from "@/lib/character-repository/image-jobs";
import {
  getCustomCharacterById,
  setCustomCharacterImageLinks,
} from "@/lib/character-repository/custom-characters";

type GenerateImageRouteBody = {
  userId: string;
  characterId: string;
  provider?: ImageProvider;
  styleType: CharacterStyleType;
  builderMode: CharacterBuilderMode;
  hiddenPromptInput: HiddenPromptEngineInput;
  selectedCandidateId?: string | null;
  candidateCount?: number;
  model?: string | null;
  moderation?: Partial<ImageModerationSnapshot>;
  variationType?: string | null;
  consistencyMode?: CharacterConsistencyMode;
  consistencyStrength?: CharacterConsistencyStrength;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBody(input: unknown): GenerateImageRouteBody | null {
  if (!isRecord(input)) return null;

  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const characterId =
    typeof input.characterId === "string" ? input.characterId.trim() : "";
  const provider =
    input.provider === "runware" ? input.provider : "runware";
  const styleType =
    input.styleType === "realistic" || input.styleType === "anime"
      ? input.styleType
      : null;
  const builderMode =
    input.builderMode === "preset" || input.builderMode === "custom_prompt"
      ? input.builderMode
      : null;

  if (!userId || !characterId || !styleType || !builderMode) {
    return null;
  }

  const hiddenPromptInput = input.hiddenPromptInput;
  if (!isRecord(hiddenPromptInput)) {
    return null;
  }

  return {
    userId,
    characterId,
    provider,
    styleType,
    builderMode,
    hiddenPromptInput: hiddenPromptInput as HiddenPromptEngineInput,
    selectedCandidateId:
      typeof input.selectedCandidateId === "string"
        ? input.selectedCandidateId
        : null,
    candidateCount:
      typeof input.candidateCount === "number" ? input.candidateCount : undefined,
    model: typeof input.model === "string" ? input.model : null,
    moderation: isRecord(input.moderation)
      ? (input.moderation as Partial<ImageModerationSnapshot>)
      : undefined,
    variationType:
      typeof input.variationType === "string" ? input.variationType : null,
    consistencyMode:
      input.consistencyMode === "none" ||
      input.consistencyMode === "seed_only" ||
      input.consistencyMode === "reference_guided"
        ? input.consistencyMode
        : undefined,
    consistencyStrength:
      input.consistencyStrength === "strict" ||
      input.consistencyStrength === "soft"
        ? input.consistencyStrength
        : undefined,
  };
}

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...(extra ?? {}),
    },
    { status },
  );
}

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

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const body = parseBody(rawBody);

    if (!body) {
      return jsonError("Invalid request body.");
    }

    const character = await getCustomCharacterById(body.characterId, body.userId);
    if (!character) {
      return jsonError("Character not found.", 404);
    }

    const moderation = normalizeModerationSnapshot(body.moderation);

    const promptEngineOutput = runPromptEngine(body.hiddenPromptInput);

    if (promptEngineOutput.moderationFlags.needsBlock) {
      return jsonError("Prompt blocked by moderation.", 400, {
        reasons: promptEngineOutput.moderationFlags.reasons,
      });
    }

    const jobInput = createInitialGenerationJobInput({
      userId: body.userId,
      characterId: body.characterId,
      provider: body.provider ?? "runware",
      styleType: body.styleType,
      builderMode: body.builderMode,
      hiddenPromptInput: body.hiddenPromptInput,
      promptEngineOutput,
      model: body.model ?? null,
      moderation,
    });

    const jobInsertPayload = createImageJobInsertPayload(jobInput);
    const job = await createCharacterImageJob(jobInsertPayload);

    await markCharacterImageJobProcessing(job.id);

    const generationResult = await generateInitialCharacterCandidatesWithService({
      provider: body.provider ?? "runware",
      styleType: body.styleType,
      builderMode: body.builderMode,
      hiddenPromptInput: body.hiddenPromptInput,
      promptEngineOutput,
      candidateCount: body.candidateCount,
      model: body.model ?? null,
    });

    if (!generationResult.ok) {
      await markCharacterImageJobFailed({
        jobId: job.id,
        errorCode: generationResult.errorCode,
        errorMessage: generationResult.errorMessage,
      });

      return NextResponse.json(
        {
          ok: false,
          provider: generationResult.provider,
          kind: generationResult.kind,
          errorCode: generationResult.errorCode,
          errorMessage: generationResult.errorMessage,
        },
        { status: 400 },
      );
    }

    const selectedCandidate =
      getSelectedCandidate(
        generationResult.candidates,
        body.selectedCandidateId ?? null,
      ) ?? generationResult.candidates[0] ?? null;

    const imagePayloads = mapInitialCandidatesToImageInsertPayloads({
      userId: body.userId,
      characterId: body.characterId,
      jobId: job.id,
      candidates: generationResult.candidates,
      selectedCandidateId: selectedCandidate?.tempId ?? null,
      moderation,
    });

    const savedImages = [];
    for (const payload of imagePayloads) {
      const image = await createCharacterImage(payload);
      savedImages.push(image);
    }

    let primaryImage = savedImages.find((image) => image.is_primary) ?? null;

    if (!primaryImage && selectedCandidate) {
      const fallbackPrimary = await createCharacterImage(
        createPrimaryReferenceImageInsertPayload({
          userId: body.userId,
          characterId: body.characterId,
          jobId: job.id,
          candidate: selectedCandidate,
          moderation,
        }),
      );
      primaryImage = fallbackPrimary;
    }

    if (primaryImage) {
      await setPrimaryCharacterImage(body.characterId, primaryImage.id);
      await setReferenceCharacterImage(primaryImage.id, true);

      await setCustomCharacterImageLinks({
        characterId: body.characterId,
        userId: body.userId,
        avatarImageId: primaryImage.id,
        primaryReferenceImageId: primaryImage.id,
        baseGenerationId: job.id,
        primaryImageUrl: primaryImage.public_url,
        imageStatus: "ready",
        imageVisibility: character.image_visibility ?? "private",
        imagePromptVersion: character.image_prompt_version ?? 1,
        imageLastGeneratedAt: new Date().toISOString(),
        imageGenerationEnabled: true,
        consistencyStatus: "ready",
      });
    }

    await markCharacterImageJobCompleted({
      jobId: job.id,
      externalJobId: generationResult.externalJobId ?? null,
    });

    return NextResponse.json({
      ok: true,
      provider: generationResult.provider,
      kind: generationResult.kind,
      jobId: job.id,
      characterId: body.characterId,
      promptSummary: promptEngineOutput.promptSummary,
      canonicalPrompt: promptEngineOutput.canonicalPrompt,
      negativePrompt: promptEngineOutput.negativePrompt,
      moderationFlags: promptEngineOutput.moderationFlags,
      generationHints: promptEngineOutput.generationHints,
      identityLock: promptEngineOutput.identityLock,
      selectedCandidateId: selectedCandidate?.tempId ?? null,
      primaryImageId: primaryImage?.id ?? null,
      primaryImageUrl: primaryImage?.public_url ?? null,
      candidates: generationResult.candidates,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected image generation error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
