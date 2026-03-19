import { NextResponse } from "next/server";

import { buildStudioImagePromptSummary } from "@/lib/create-character/studio-builder";
import type { GenerateImageRouteBody } from "@/lib/image-generation/contracts";
import {
  createInitialGenerationJobInput,
  createImageJobInsertPayload,
  createPrimaryReferenceImageInsertPayload,
  generateInitialCharacterCandidatesWithService,
  generateVariationCandidatesWithService,
  getSelectedCandidate,
  mapInitialCandidatesToImageInsertPayloads,
} from "@/lib/image-generation/service";
import type {
  CharacterImagePromptInput,
  CharacterImageSafetyInput,
  ImageModerationSnapshot,
} from "@/lib/image-generation/types";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function parseBody(input: unknown): GenerateImageRouteBody | null {
  if (!isRecord(input)) return null;
  if (!isRecord(input.promptInput)) return null;
  if (!isRecord(input.safety)) return null;

  const characterId =
    typeof input.characterId === "string" ? input.characterId.trim() : "";

  if (!characterId) {
    return null;
  }

  return {
    userId:
      typeof input.userId === "string" && input.userId.trim()
        ? input.userId.trim()
        : undefined,
    characterId,
    provider: "runware",
    kind: input.kind === "gallery" ? "gallery" : "avatar",
    promptInput: input.promptInput as CharacterImagePromptInput,
    safety: input.safety as CharacterImageSafetyInput,
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
    previewImageUrl:
      typeof input.previewImageUrl === "string" && input.previewImageUrl.trim()
        ? input.previewImageUrl.trim()
        : null,
    previewResolvedPrompt:
      typeof input.previewResolvedPrompt === "string"
        ? input.previewResolvedPrompt
        : null,
    previewNegativePrompt:
      typeof input.previewNegativePrompt === "string"
        ? input.previewNegativePrompt
        : null,
    consistencySourceImageUrl:
      typeof input.consistencySourceImageUrl === "string" &&
      input.consistencySourceImageUrl.trim()
        ? input.consistencySourceImageUrl.trim()
        : null,
    consistencyStrength:
      input.consistencyStrength === "soft" ||
      input.consistencyStrength === "strict"
        ? input.consistencyStrength
        : null,
    baseSeed:
      typeof input.baseSeed === "number" && Number.isFinite(input.baseSeed)
        ? input.baseSeed
        : null,
  };
}

function isDraftCharacterId(characterId: string) {
  return characterId.startsWith("draft-");
}

function buildConsistencyVariationDelta(promptInput: CharacterImagePromptInput) {
  return [
    "same character identity",
    "same face identity",
    promptInput.hair ? `keep ${promptInput.hair}` : "",
    promptInput.eyes ? `keep ${promptInput.eyes}` : "",
    promptInput.bodyType ? `keep ${promptInput.bodyType} body type` : "",
    promptInput.outfit ? `keep ${promptInput.outfit}` : "",
    promptInput.signatureDetail
      ? `keep signature detail: ${promptInput.signatureDetail}`
      : "",
    "fresh composition",
    "light pose change",
    "slight camera variation",
    "preserve overall styling",
  ]
    .filter(Boolean)
    .join(", ");
}

export async function POST(request: Request) {
  let createdJobId: string | null = null;

  try {
    const rawBody = await request.json().catch(() => null);
    const body = parseBody(rawBody);

    if (!body) {
      return jsonError("Invalid request body.");
    }

    const isDraft = isDraftCharacterId(body.characterId);

    if (!isDraft && !body.userId) {
      return jsonError("User authentication required.", 401);
    }

    const moderation = normalizeModerationSnapshot(body.moderation);

    if (!moderation.isAdultOnly) {
      return jsonError("Only adult fictional character generation is allowed.");
    }

    if (!moderation.subjectDeclared18Plus) {
      return jsonError("Character must be explicitly 18+.");
    }

    if (!moderation.consentConfirmed) {
      return jsonError("Consent confirmation is required.");
    }

    if (
      moderation.depictsRealPerson ||
      moderation.depictsPublicFigure ||
      moderation.nonConsensualFlag ||
      moderation.underageRiskFlag ||
      moderation.illegalContentFlag
    ) {
      return jsonError("Prompt blocked by moderation.");
    }

    const { hiddenPromptInput, promptEngineOutput } =
      buildStudioImagePromptSummary(body.promptInput);

    if (promptEngineOutput.moderationFlags.needsBlock) {
      return jsonError("Prompt blocked by moderation.", 400, {
        reasons: promptEngineOutput.moderationFlags.reasons,
      });
    }

    const usePreviewImage =
      !isDraft &&
      Boolean(body.previewImageUrl && body.previewImageUrl.trim().length > 0);
    const useConsistencyReference =
      Boolean(
        body.consistencySourceImageUrl &&
          body.consistencySourceImageUrl.trim().length > 0,
      ) && !usePreviewImage;

    const generationResult = usePreviewImage
      ? {
          ok: true as const,
          provider: "runware" as const,
          kind: "initial" as const,
          externalJobId: null,
          candidates: [
            {
              tempId: "preview-selected",
              imageUrl: body.previewImageUrl!,
              width: null,
              height: null,
              seed: null,
              model: body.model ?? "runware-default",
              prompt:
                body.previewResolvedPrompt ??
                promptEngineOutput.canonicalPrompt ??
                null,
              negativePrompt:
                body.previewNegativePrompt ??
                promptEngineOutput.negativePrompt ??
                null,
            },
          ],
        }
      : useConsistencyReference
        ? await generateVariationCandidatesWithService({
            provider: "runware",
            styleType: hiddenPromptInput.styleType,
            characterId: body.characterId,
            basePrompt: promptEngineOutput.canonicalPrompt,
            negativePrompt: promptEngineOutput.negativePrompt,
            primaryReferenceImageUrl: body.consistencySourceImageUrl!,
            variationPromptDelta: buildConsistencyVariationDelta(
              body.promptInput,
            ),
            consistencyStrength: body.consistencyStrength ?? "strict",
            baseSeed: body.baseSeed ?? null,
            model: body.model ?? null,
          })
        : await generateInitialCharacterCandidatesWithService({
            provider: "runware",
            styleType: hiddenPromptInput.styleType,
            builderMode: hiddenPromptInput.builderMode,
            hiddenPromptInput,
            promptEngineOutput,
            candidateCount: body.candidateCount,
            model: body.model ?? null,
          });

    if (!generationResult.ok) {
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

    if (isDraft) {
      return NextResponse.json({
        ok: true,
        provider: "runware",
        kind: body.kind ?? "avatar",
        characterId: body.characterId,
        promptSummary: promptEngineOutput.promptSummary,
        canonicalPrompt: promptEngineOutput.canonicalPrompt,
        negativePrompt: promptEngineOutput.negativePrompt,
        moderationFlags: promptEngineOutput.moderationFlags,
        generationHints: promptEngineOutput.generationHints,
        identityLock: promptEngineOutput.identityLock,
        selectedCandidateId: selectedCandidate?.tempId ?? null,
        primaryImageId: null,
        primaryImageUrl: selectedCandidate?.imageUrl ?? null,
        imageUrl: selectedCandidate?.imageUrl ?? null,
        externalJobId: generationResult.externalJobId ?? null,
        candidates: generationResult.candidates,
        previewMode: true,
      });
    }

    const character = await getCustomCharacterById(body.characterId, body.userId!);
    if (!character) {
      return jsonError("Character not found.", 404);
    }

    const jobInput = createInitialGenerationJobInput({
      userId: body.userId!,
      characterId: body.characterId,
      provider: "runware",
      styleType: hiddenPromptInput.styleType,
      builderMode: hiddenPromptInput.builderMode,
      hiddenPromptInput,
      promptEngineOutput,
      model: body.model ?? null,
      moderation,
    });

    const jobInsertPayload = createImageJobInsertPayload(jobInput);
    const job = await createCharacterImageJob(jobInsertPayload);
    createdJobId = job.id;

    await markCharacterImageJobProcessing(job.id);

    const imagePayloads = mapInitialCandidatesToImageInsertPayloads({
      userId: body.userId!,
      characterId: body.characterId,
      jobId: job.id,
      candidates: generationResult.candidates,
      selectedCandidateId: selectedCandidate?.tempId ?? null,
      moderation,
      hiddenPromptInput: hiddenPromptInput as Record<string, unknown>,
    });

    const savedImages = [];
    for (const payload of imagePayloads) {
      const image = await createCharacterImage(payload);
      savedImages.push(image);
    }

    let primaryImage = savedImages.find((image) => image.is_primary) ?? null;

    if (!primaryImage && selectedCandidate) {
      primaryImage = await createCharacterImage(
        createPrimaryReferenceImageInsertPayload({
          userId: body.userId!,
          characterId: body.characterId,
          jobId: job.id,
          candidate: selectedCandidate,
          moderation,
          hiddenPromptInput: hiddenPromptInput as Record<string, unknown>,
        }),
      );
    }

    if (primaryImage) {
      await setPrimaryCharacterImage(body.characterId, primaryImage.id);
      await setReferenceCharacterImage(primaryImage.id, true);

      await setCustomCharacterImageLinks({
        characterId: body.characterId,
        userId: body.userId!,
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
      provider: "runware",
      kind: body.kind ?? "avatar",
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
      imageUrl: primaryImage?.public_url ?? null,
      externalJobId: generationResult.externalJobId ?? null,
      candidates: generationResult.candidates,
      previewMode: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected image generation error.";

    if (createdJobId) {
      try {
        await markCharacterImageJobFailed({
          jobId: createdJobId,
          errorCode: "UNEXPECTED_IMAGE_GENERATION_ERROR",
          errorMessage: message,
        });
      } catch {
        // Preserve the original error response if job-status sync also fails.
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
