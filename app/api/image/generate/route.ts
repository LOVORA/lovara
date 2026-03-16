import { NextResponse } from "next/server";

import type {
  CharacterBuilderMode,
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
import type { ImageModerationSnapshot } from "@/lib/image-generation/types";
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

type ServiceImageProvider = "runware";
type PublicImageProvider = "mage" | "self-hosted-comfy";

type CharacterImageSafetyInput = {
  isAdultOnly: boolean;
  subjectDeclared18Plus: boolean;
  consentConfirmed: boolean;
  depictsRealPerson: boolean;
  depictsPublicFigure: boolean;
  nonConsensualFlag: boolean;
  underageRiskFlag: boolean;
  illegalContentFlag: boolean;
};

type CharacterImagePromptInput = {
  characterName: string;
  archetype?: string;
  visualAura?: string;
  ageBand?: "18-20" | "21-24" | "25-29" | "30-39" | "40+";
  genderPresentation?: string;
  region?: string;
  hair?: string;
  eyes?: string;
  outfit?: string;
  palette?: string;
  camera?: string;
  avatarStyle?: string;
  bodyType?: string;
  pose?: string;
  expression?: string;
  environment?: string;
  nsfwLevel?: "adult" | "suggestive" | "none";
};

type GenerateImageRouteBody = {
  userId: string;
  characterId: string;
  provider?: PublicImageProvider;
  kind?: "avatar" | "gallery";
  promptInput: CharacterImagePromptInput;
  safety: CharacterImageSafetyInput;
  selectedCandidateId?: string | null;
  candidateCount?: number;
  model?: string | null;
  moderation?: Partial<ImageModerationSnapshot>;
};

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

function isPublicProvider(value: unknown): value is PublicImageProvider {
  return value === "mage" || value === "self-hosted-comfy";
}

/**
 * Geçici uyumluluk:
 * lib/image-generation/types.ts şu an sadece "runware" kabul ediyor.
 * Dışarıda mage/comfy kullansak da iç servis katmanına tek geçerli provider veriyoruz.
 */
function toServiceProvider(_provider: PublicImageProvider): ServiceImageProvider {
  return "runware";
}

function buildHiddenPromptInputFromRequest(args: {
  promptInput: CharacterImagePromptInput;
}): HiddenPromptEngineInput {
  const styleType: CharacterStyleType =
    args.promptInput.avatarStyle?.toLowerCase().includes("anime") ? "anime" : "realistic";

  const builderMode: CharacterBuilderMode = "preset";

  return {
    styleType,
    builderMode,
    presetSelections: {
      ageBand: args.promptInput.ageBand ?? "",
      region: args.promptInput.region ?? "",
      archetype: args.promptInput.archetype ?? "",
      visualAura: args.promptInput.visualAura ?? "",
      genderPresentation: args.promptInput.genderPresentation ?? "",
      hair: args.promptInput.hair ?? "",
      eyes: args.promptInput.eyes ?? "",
      outfit: args.promptInput.outfit ?? "",
      palette: args.promptInput.palette ?? "",
      camera: args.promptInput.camera ?? "",
      avatarStyle: args.promptInput.avatarStyle ?? "",
      bodyType: args.promptInput.bodyType ?? "",
      pose: args.promptInput.pose ?? "",
      expression: args.promptInput.expression ?? "",
      environment: args.promptInput.environment ?? "",
    },
  } as HiddenPromptEngineInput;
}

function parseBody(input: unknown): GenerateImageRouteBody | null {
  if (!isRecord(input)) return null;
  if (!isRecord(input.promptInput)) return null;
  if (!isRecord(input.safety)) return null;

  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const characterId =
    typeof input.characterId === "string" ? input.characterId.trim() : "";

  if (!userId || !characterId) {
    return null;
  }

  return {
    userId,
    characterId,
    provider: isPublicProvider(input.provider) ? input.provider : "mage",
    kind: input.kind === "gallery" ? "gallery" : "avatar",
    promptInput: input.promptInput as CharacterImagePromptInput,
    safety: input.safety as CharacterImageSafetyInput,
    selectedCandidateId:
      typeof input.selectedCandidateId === "string" ? input.selectedCandidateId : null,
    candidateCount:
      typeof input.candidateCount === "number" ? input.candidateCount : undefined,
    model: typeof input.model === "string" ? input.model : null,
    moderation: isRecord(input.moderation)
      ? (input.moderation as Partial<ImageModerationSnapshot>)
      : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const body = parseBody(rawBody);

    if (!body) {
      return jsonError("Invalid request body.");
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

    const hiddenPromptInput = buildHiddenPromptInputFromRequest({
      promptInput: body.promptInput,
    });

    const promptEngineOutput = runPromptEngine(hiddenPromptInput);

    if (promptEngineOutput.moderationFlags.needsBlock) {
      return jsonError("Prompt blocked by moderation.", 400, {
        reasons: promptEngineOutput.moderationFlags.reasons,
      });
    }

    const character = await getCustomCharacterById(body.characterId, body.userId);
    if (!character) {
      return jsonError("Character not found.", 404);
    }

    const serviceProvider = toServiceProvider(body.provider ?? "mage");

    const jobInput = createInitialGenerationJobInput({
      userId: body.userId,
      characterId: body.characterId,
      provider: serviceProvider,
      styleType: hiddenPromptInput.styleType,
      builderMode: hiddenPromptInput.builderMode,
      hiddenPromptInput,
      promptEngineOutput,
      model: body.model ?? null,
      moderation,
    });

    const jobInsertPayload = createImageJobInsertPayload(jobInput);
    const job = await createCharacterImageJob(jobInsertPayload);

    await markCharacterImageJobProcessing(job.id);

    const generationResult = await generateInitialCharacterCandidatesWithService({
      provider: serviceProvider,
      styleType: hiddenPromptInput.styleType,
      builderMode: hiddenPromptInput.builderMode,
      hiddenPromptInput,
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
      primaryImage = await createCharacterImage(
        createPrimaryReferenceImageInsertPayload({
          userId: body.userId,
          characterId: body.characterId,
          jobId: job.id,
          candidate: selectedCandidate,
          moderation,
        }),
      );
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
      provider: body.provider ?? "mage",
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
