import { NextResponse } from "next/server";

import { buildStudioImagePromptSummary } from "@/lib/create-character/studio-builder";
import {
  deriveLifeStageProfile,
  deriveVisualChoiceProfile,
} from "@/lib/create-character/choice-weighting";
import { normalizeActiveOutputType } from "@/lib/create-character/reference-realism";
import type { GenerateImageRouteBody } from "@/lib/image-generation/contracts";
import {
  createInitialGenerationJobInput,
  createImageJobInsertPayload,
  createPrimaryReferenceImageInsertPayload,
  generateInitialCharacterCandidatesWithService,
  generateVariationCandidatesWithService,
  getSelectedCandidate,
  mapGalleryCandidatesToImageInsertPayloads,
  mapInitialCandidatesToImageInsertPayloads,
} from "@/lib/image-generation/service";
import type {
  CharacterImagePromptInput,
  CharacterImageRepositoryInsert,
  CharacterImageSafetyInput,
  ImageGenerationProfile,
  ImageModerationSnapshot,
  ImageProvider,
  VariationLockContract,
} from "@/lib/image-generation/types";
import { persistRemoteCharacterImageToBucket } from "@/lib/character-image-bucket";
import { inspectOriginalityFromPromptInput } from "@/lib/image-generation/originality-guard";
import { getLegacyCharacterState } from "@/lib/legacy-character-state";
import {
  createCharacterImageWithClient,
  listCharacterImagesWithClient,
  setPrimaryCharacterImageWithClient,
  setReferenceCharacterImageWithClient,
  updateCharacterImageWithClient,
} from "@/lib/character-repository/images";
import {
  createCharacterImageJobWithClient,
  markCharacterImageJobCompletedWithClient,
  markCharacterImageJobFailedWithClient,
  markCharacterImageJobProcessingWithClient,
} from "@/lib/character-repository/image-jobs";
import {
  setCustomCharacterImageLinksWithClient,
} from "@/lib/character-repository/custom-characters";
import { getCharacterBySlug } from "@/lib/characters";
import { resolveAccessibleCustomCharacterById } from "@/lib/server/custom-character-ownership";
import { createClient } from "@/lib/supabase/server";

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

function buildBlockedRequestMessage(blockedRequestReason: string | null | undefined) {
  switch (blockedRequestReason) {
    case "franchise_character":
      return "Only original fictional characters are allowed. Franchise and copyrighted character requests are blocked.";
    case "real_person_lookalike":
      return "Real-person, celebrity, and lookalike requests are blocked in this image flow.";
    case "protected_style":
      return "Protected style-mimic requests such as anime or brand-specific looks are blocked in this image flow.";
    case "named_character_reference":
      return "Named character references are blocked. Please create a fully original character instead.";
    default:
      return "This image request is blocked. Please keep it original, realistic, and fictional.";
  }
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
    depictsFranchiseCharacter: moderation?.depictsFranchiseCharacter ?? false,
    depictsProtectedStyleRequest: moderation?.depictsProtectedStyleRequest ?? false,
    lookalikeRiskFlag: moderation?.lookalikeRiskFlag ?? false,
    namedCharacterReferenceFlag: moderation?.namedCharacterReferenceFlag ?? false,
    blockedRequestReason: moderation?.blockedRequestReason ?? null,
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
    studioMode:
      input.studioMode === "adult" || input.promptInput.studioMode === "adult"
        ? "adult"
        : "normal",
    promptInput: input.promptInput as CharacterImagePromptInput,
    safety: input.safety as CharacterImageSafetyInput,
    selectedCandidateId:
      typeof input.selectedCandidateId === "string"
        ? input.selectedCandidateId
        : null,
    candidateCount:
      typeof input.candidateCount === "number" ? input.candidateCount : undefined,
    model: typeof input.model === "string" ? input.model : null,
    generationProfile:
      input.generationProfile === "identity_locked_gallery"
        ? "identity_locked_gallery"
        : "identity_locked_avatar",
    qualityTier: input.qualityTier === "premium" ? "premium" : "max",
    referenceStrategy:
      input.referenceStrategy === "single_avatar_lock"
        ? "single_avatar_lock"
        : "stacked_character_reference",
    moderation: isRecord(input.moderation)
      ? (input.moderation as Partial<ImageModerationSnapshot>)
      : undefined,
    previewOnly: input.previewOnly === true,
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

function pickAutoProvider(): ImageProvider {
  return "runware";
}

function getDefaultProviderModel(args: {
  provider: ImageProvider;
  model: string | null;
  kind: "avatar" | "gallery";
  studioMode: "normal" | "adult";
  generationProfile: ImageGenerationProfile;
  useConsistencyReference: boolean;
}) {
  if (args.model) return args.model;
  const resolved =
    process.env.RUNWARE_MODEL?.trim() ||
    process.env.RUNWARE_CREATE_AVATAR_MODEL?.trim();
  if (!resolved) {
    throw new Error("RUNWARE_MODEL is required for image generation.");
  }
  return resolved;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getCustomCharacterWithRetry(args: {
  serverSupabase: Awaited<ReturnType<typeof createClient>> | null;
  characterId: string;
  userId: string | undefined;
  attempts?: number;
  delayMs?: number;
}) {
  const { serverSupabase, characterId, userId } = args;
  if (!serverSupabase || !userId) return null;

  const attempts = Math.max(1, args.attempts ?? 5);
  const delayMs = Math.max(0, args.delayMs ?? 150);

  for (let index = 0; index < attempts; index += 1) {
    const character = await resolveAccessibleCustomCharacterById({
      supabase: serverSupabase as never,
      characterId,
      userId,
      attempts: 1,
    });

    if (character) {
      return character;
    }

    if (index < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return null;
}

async function hasStartedConversationAccess(args: {
  serverSupabase: Awaited<ReturnType<typeof createClient>> | null;
  userId: string | undefined;
  characterId: string;
}) {
  const { serverSupabase, userId, characterId } = args;
  if (!serverSupabase || !userId || !characterId.trim()) return false;

  const { data: customConversation, error: customConversationError } =
    await serverSupabase
      .from("custom_conversations")
      .select("custom_character_id")
      .eq("user_id", userId)
      .eq("custom_character_id", characterId)
      .limit(1)
      .maybeSingle();

  if (customConversationError) {
    throw new Error(customConversationError.message);
  }

  if (customConversation?.custom_character_id) {
    return true;
  }

  const { data: builtInConversation, error: builtInConversationError } =
    await serverSupabase
      .from("conversations")
      .select("character_slug")
      .eq("user_id", userId)
      .eq("character_slug", characterId)
      .limit(1)
      .maybeSingle();

  if (builtInConversationError) {
    throw new Error(builtInConversationError.message);
  }

  return Boolean(builtInConversation?.character_slug);
}

function sanitizeStudioPromptInputForOriginality(
  promptInput: CharacterImagePromptInput,
): CharacterImagePromptInput {
  const sanitizeText = (value: string | undefined) =>
    value
      ?.replace(/\banime\b/gi, "illustrated")
      .replace(/\bmanga\b/gi, "illustrated")
      .replace(/\bcelebrity\b/gi, "fictional adult")
      .replace(/\bpublic figure\b/gi, "fictional adult")
      .replace(/\breal person\b/gi, "fictional adult")
      .replace(/\breal woman\b/gi, "fictional adult")
      .replace(/\breal man\b/gi, "fictional adult")
      .replace(/\blooks?\s+like\b/gi, "keeps")
      .replace(/\binspired\s+by\b/gi, "built around")
      .trim();

  return {
    ...promptInput,
    characterName: "same fictional adult character",
    archetype: sanitizeText(promptInput.archetype),
    visualAura: sanitizeText(promptInput.visualAura),
    region: sanitizeText(promptInput.region),
    hair: sanitizeText(promptInput.hair),
    eyes: sanitizeText(promptInput.eyes),
    outfit: sanitizeText(promptInput.outfit),
    palette: sanitizeText(promptInput.palette),
    avatarStyle: sanitizeText(promptInput.avatarStyle),
    expression: sanitizeText(promptInput.expression),
    environment: sanitizeText(promptInput.environment),
    signatureDetail: sanitizeText(promptInput.signatureDetail),
  };
}

function sanitizeStudioGenerationPromptInput(
  promptInput: CharacterImagePromptInput,
): CharacterImagePromptInput {
  const filterVisualLines = (lines?: string[] | null) =>
    (lines ?? []).filter((line) => {
      const lowered = line.toLowerCase();
      return ![
        "relationship",
        "user",
        "bond",
        "dynamic",
        "permission",
        "escalation",
        "nickname",
        "scene chemistry",
        "core relationship",
        "role truth",
        "intimacy",
      ].some((term) => lowered.includes(term));
    });

  return {
    ...promptInput,
    relationshipToUser: undefined,
    relationshipDynamic: undefined,
    hobbies: undefined,
    fetishes: undefined,
    extraPersonalityDetails: undefined,
    extraPhysicalDetails: undefined,
    selectionPromptContract: undefined,
    selectionContractSummary: undefined,
    behaviorContractSummary: undefined,
    imageMoodContractSummary: undefined,
    hiddenVisualSectionPrompts: undefined,
    masterVisualPrompt: undefined,
    visualConstitution: filterVisualLines(promptInput.visualConstitution),
    visualIdentityLock: filterVisualLines(promptInput.visualIdentityLock),
    negativeConstitutionHints: filterVisualLines(
      promptInput.negativeConstitutionHints,
    ),
  };
}

async function setCustomCharacterImageLinksWithRetry(args: {
  serverSupabase: Awaited<ReturnType<typeof createClient>> | null;
  input: Parameters<typeof setCustomCharacterImageLinksWithClient>[1];
  attempts?: number;
  delayMs?: number;
}) {
  const { serverSupabase, input } = args;
  if (!serverSupabase) {
    throw new Error("Image storage session could not be established.");
  }

  const attempts = Math.max(1, args.attempts ?? 6);
  const delayMs = Math.max(0, args.delayMs ?? 150);
  let lastError: unknown = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await setCustomCharacterImageLinksWithClient(
        serverSupabase as never,
        input,
      );
    } catch (error) {
      lastError = error;

      if (index < attempts - 1) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to update character image links.");
}

function canMutateCustomCharacterImageLinks(args: {
  customCharacter: { user_id?: string | null } | null;
  userId: string | undefined;
}) {
  return Boolean(
    args.customCharacter &&
      args.userId &&
      args.customCharacter.user_id &&
      args.customCharacter.user_id === args.userId,
  );
}

function buildVariationLockContract(
  promptInput: CharacterImagePromptInput,
): VariationLockContract {
  return {
    ageValue: promptInput.ageValue ?? null,
    ageBand: promptInput.ageBand ?? null,
    outfit: promptInput.outfit ?? null,
    outfitIntent: promptInput.outfitIntent ?? null,
    nudityMode: promptInput.nudityMode ?? null,
    bodyType: promptInput.bodyType ?? null,
    bustSize: promptInput.bustSize ?? null,
    breastType: promptInput.breastType ?? null,
    buttSize: promptInput.buttSize ?? null,
    waistDefinition: promptInput.waistDefinition ?? null,
    skinTone: promptInput.skinTone ?? null,
    hair: promptInput.hair ?? null,
    eyes: promptInput.eyes ?? null,
    faceBias: promptInput.faceBias ?? null,
    profession: promptInput.profession ?? null,
    backgroundIntent: promptInput.backgroundIntent ?? null,
    bodyReadPriority: promptInput.bodyReadPriority ?? null,
    poseFamily: promptInput.poseContract?.poseFamily ?? null,
    framingBias: promptInput.poseContract?.framingBias ?? null,
    selectionContractSummary: promptInput.selectionContractSummary ?? null,
    imageMoodContractSummary: promptInput.imageMoodContractSummary ?? null,
    hiddenVisualSectionPrompts: promptInput.hiddenVisualSectionPrompts ?? null,
    masterVisualPrompt: promptInput.masterVisualPrompt ?? null,
  };
}

function isDraftCharacterId(characterId: string) {
  return characterId.startsWith("draft-");
}

function buildConsistencyVariationDelta(promptInput: CharacterImagePromptInput) {
  const lifeStageProfile = deriveLifeStageProfile({
    ageValue: promptInput.ageValue ?? null,
    ageBand: promptInput.ageBand,
  });
  const visualChoiceProfile = deriveVisualChoiceProfile({
    ageValue: promptInput.ageValue ?? null,
    ageBand: promptInput.ageBand,
    archetype: promptInput.archetype,
    profession: promptInput.profession,
    region: promptInput.region,
    visualAura: promptInput.visualAura,
    bodyType: promptInput.bodyType,
    outfit: promptInput.outfit,
    lightingMood: promptInput.lightingMood,
    expression: promptInput.expression,
    accessoryVibe: promptInput.accessoryVibe,
    signatureDetail: promptInput.signatureDetail,
    camera: promptInput.camera,
    hair: promptInput.hair,
    eyes: promptInput.eyes,
  });

  return [
    ...(promptInput.selectionContractSummary ?? []).slice(0, 10),
    ...(promptInput.imageMoodContractSummary ?? []).slice(0, 6),
    "same character identity",
    "same exact face identity",
    "same face identity",
    "same facial bone structure",
    "same eye spacing and facial proportions",
    "same eye shape, brow read, nose balance, and lip balance",
    "same hairline and same mature face design",
    "same body proportions",
    "same skin tone and overall silhouette",
    `preserve the same adult life-stage presence: ${lifeStageProfile.maturityFrame}`,
    `keep facial maturity and styling polish consistent: ${visualChoiceProfile.faceMaturity}`,
    promptInput.hair ? `keep ${promptInput.hair}` : "",
    promptInput.hairTexture ? `keep ${promptInput.hairTexture} hair texture` : "",
    promptInput.eyes ? `keep ${promptInput.eyes}` : "",
    promptInput.skinTone ? `keep ${promptInput.skinTone} skin tone` : "",
    promptInput.bodyType ? `keep ${promptInput.bodyType} body type` : "",
    promptInput.bodyType && promptInput.bodyType !== "pregnant"
      ? "keep a clearly non-pregnant abdomen"
      : "",
    promptInput.bodyType === "pregnant"
      ? "keep a clearly pregnant abdomen"
      : "",
    promptInput.bustSize
      ? `must preserve ${promptInput.bustSize} bust proportions exactly`
      : "",
    promptInput.breastType
      ? `must preserve ${promptInput.breastType} breast shape exactly`
      : "",
    promptInput.hipsType ? `keep ${promptInput.hipsType} hip proportions` : "",
    promptInput.buttSize
      ? `keep ${promptInput.buttSize} butt proportions exactly`
      : "",
    promptInput.waistDefinition
      ? `keep ${promptInput.waistDefinition} waist definition`
      : "",
    promptInput.outfit
      ? `must preserve the exact selected outfit: ${promptInput.outfit}`
      : "",
    promptInput.outfitIntent
      ? `keep wardrobe and styling compatible with this exact outfit rule: ${promptInput.outfitIntent}`
      : "",
    promptInput.nudityMode === "implied_nude"
      ? "must preserve implied nude mode exactly with elegant natural white lower-body coverage and no explicit reveal"
      : "",
    promptInput.profession
      ? `profession must remain visible and believable: ${promptInput.profession}`
      : "",
    promptInput.photoPack ? `apply shot pack direction: ${promptInput.photoPack}` : "",
    promptInput.environment
      ? `keep scene compatibility with ${promptInput.environment}`
      : "keep the same broad environment logic while face and body identity stay locked",
    promptInput.backgroundIntent
      ? `background must stay profession-compatible and believable: ${promptInput.backgroundIntent}`
      : "",
    promptInput.lightingMood
      ? `keep lighting compatible with ${promptInput.lightingMood}`
      : "",
    promptInput.camera ? `use ${promptInput.camera} framing` : "",
    promptInput.sceneNote
      ? `carry this scene note into the photo: ${promptInput.sceneNote}`
      : "",
    promptInput.faceBias === "soft_feminine"
      ? "keep the same soft feminine face bias with a gentle jawline and smooth facial transitions"
      : "",
    "do not redesign the woman",
    "do not change the face shape, hairline, or eye spacing",
    promptInput.bodyReadPriority === "high"
      ? "keep chest, waist, hips, and body proportions clearly readable in frame"
      : "",
    "keep the image in the same natural realistic photo band",
    "use natural indoor daylight or practical room light with believable warmth",
    "keep skin realistic and flattering without glossy beauty-filter polish",
    "background should stay simple, believable, and naturally lived-in",
    "keep the same framing contract instead of inventing a new crop",
    "use body-readable upper-body framing with visible stomach line, waist, chest, and upper hips unless the prompt already explicitly locks full-body framing",
    "a reroll may vary naturally, but should not rewrite the composition contract",
    "make outfit, profession, and background cues readable in the frame",
    "avoid tight close-up headshot unless the prompt explicitly demands it",
    "avoid face-only crop and shoulders-only crop",
    promptInput.signatureDetail
      ? `keep signature detail: ${promptInput.signatureDetail}`
      : "",
    `allow body language changes inside this rule: ${visualChoiceProfile.postureDiscipline}`,
    `keep gaze and expression character coherent: ${visualChoiceProfile.gazeStyle}`,
    ...(promptInput.visualIdentityLock ?? []),
    ...(promptInput.visualConstitution ?? []).slice(0, 12),
    "same prompt contract, fresh render",
    promptInput.studioMode === "adult"
      ? "camera and crop may adapt if the selected adult preset requires a different body arrangement"
      : "keep camera framing stable",
    promptInput.studioMode === "adult"
      ? "the selected adult pose must visibly differ from the original avatar pose"
      : "keep crop discipline stable",
    promptInput.studioMode === "adult"
      ? "do not repeat the original avatar pose when the selected preset calls for a new body arrangement"
      : "do not invent a new pose family or new camera plan",
    promptInput.outfit
      ? "do not change the selected outfit or wardrobe class"
      : "wardrobe should stay consistent with the existing character styling",
    promptInput.nudityMode === "implied_nude"
      ? "keep implied nude coverage non-graphic with natural white lower-body coverage and no explicit reveal"
      : "",
    promptInput.profession
      ? "do not drift into a different profession, role, or incompatible work context"
      : "",
    promptInput.backgroundIntent
      ? "do not switch into an incompatible background or wrong environment logic"
      : "",
    ...(promptInput.selectionContractSummary ?? []).length
      ? ["do not drift away from the selected contract summary"]
      : [],
    ...(promptInput.imageMoodContractSummary ?? []).length
      ? ["do not flatten the selected mood into a generic expression"]
      : [],
    promptInput.faceBias === "soft_feminine"
      ? "do not drift into masculine or overly angular facial structure"
      : "",
    "do not change bust size or breast shape",
    "face, body, and overall identity must not change",
    promptInput.studioMode === "adult"
      ? "preserve face, body, and age identity while allowing the selected adult preset to change the pose and camera plan"
      : "preserve overall styling and framing while generating a fresh image",
    "same woman, same locked prompt, fresh render",
    "avoid portrait crop drift",
    "avoid repeated tight close crop",
  ]
    .filter(Boolean)
    .join(", ");
}

function buildConsistencyReferenceBundle(args: {
  sourceUrl: string;
  imageRows: Awaited<ReturnType<typeof listCharacterImagesWithClient>>;
}) {
  const seen = new Set<string>();
  const ordered = [
    args.sourceUrl,
    ...args.imageRows
      .slice()
      .sort((left, right) => {
        const leftScore =
          (left.is_reference ? 100 : 0) +
          (left.is_primary ? 50 : 0) +
          (left.is_liked_reference ? 40 : 0) +
          (left.image_type === "reference" ? 25 : 0) +
          (left.reference_rank ?? 0) +
          ((left.quality_score ?? 0) / 10);
        const rightScore =
          (right.is_reference ? 100 : 0) +
          (right.is_primary ? 50 : 0) +
          (right.is_liked_reference ? 40 : 0) +
          (right.image_type === "reference" ? 25 : 0) +
          (right.reference_rank ?? 0) +
          ((right.quality_score ?? 0) / 10);
        return rightScore - leftScore;
      })
      .map((image) => image.public_url)
      .filter((url): url is string => Boolean(url)),
  ].filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  return ordered.slice(0, 4);
}

function pickConsistencySeed(args: {
  preferredSeed: number | null;
  imageRows: Awaited<ReturnType<typeof listCharacterImagesWithClient>>;
}) {
  if (typeof args.preferredSeed === "number") return args.preferredSeed;

  const source = args.imageRows.find((image) => image.is_reference || image.is_primary);
  if (typeof source?.seed === "number") return source.seed;

  const fallback = args.imageRows.find((image) => typeof image.seed === "number");
  return typeof fallback?.seed === "number" ? fallback.seed : null;
}

async function createBucketBackedImageInsertPayload(
  payload: CharacterImageRepositoryInsert,
): Promise<CharacterImageRepositoryInsert> {
  if (!payload.imageUrl) {
    return payload;
  }

  const storedImage = await persistRemoteCharacterImageToBucket({
    characterId: payload.characterId,
    sourceUrl: payload.imageUrl,
  });

  return {
    ...payload,
    storageBucket: storedImage.storageBucket,
    storagePath: storedImage.storagePath,
    imageUrl: storedImage.publicUrl ?? payload.imageUrl,
    mimeType: payload.mimeType ?? storedImage.mimeType,
    fileSizeBytes: payload.fileSizeBytes ?? storedImage.fileSizeBytes,
  };
}

export async function POST(request: Request) {
  let createdJobId: string | null = null;
  let serverSupabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    const rawBody = await request.json().catch(() => null);
    const body = parseBody(rawBody);

    if (!body) {
      return jsonError("Invalid request body.");
    }
    const requestBody = body;

    const isDraft = isDraftCharacterId(requestBody.characterId);
    serverSupabase = isDraft ? null : await createClient();

    if (!isDraft && !requestBody.userId) {
      return jsonError("User authentication required.", 401);
    }

    const effectivePromptInput =
      requestBody.kind === "gallery"
        ? sanitizeStudioGenerationPromptInput(requestBody.promptInput)
        : requestBody.promptInput;

    let moderation = normalizeModerationSnapshot(requestBody.moderation);

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
      moderation.depictsFranchiseCharacter ||
      moderation.depictsProtectedStyleRequest ||
      moderation.lookalikeRiskFlag ||
      moderation.namedCharacterReferenceFlag ||
      moderation.nonConsensualFlag ||
      moderation.underageRiskFlag ||
      moderation.illegalContentFlag
    ) {
      return jsonError(
        buildBlockedRequestMessage(moderation.blockedRequestReason),
        400,
        {
          errorCode: "ORIGINALITY_BLOCKED",
          blockedRequestReason: moderation.blockedRequestReason ?? null,
        },
      );
    }

    const { hiddenPromptInput, promptEngineOutput } =
      buildStudioImagePromptSummary(effectivePromptInput);

    const originalityGuard =
      requestBody.kind === "gallery"
        ? {
            decision: "allow" as const,
            reasons: [],
            matchedTerms: [],
            blockedReason: null,
            safeAlternatives: [],
            normalizedRequestProfile: {
              identityTokens: [],
              sceneTokens: [],
              styleTokens: [],
            },
            flags: {
              depictsFranchiseCharacter: false,
              depictsProtectedStyleRequest: false,
              lookalikeRiskFlag: false,
              namedCharacterReferenceFlag: false,
              depictsRealPerson: false,
              depictsPublicFigure: false,
            },
          }
        : inspectOriginalityFromPromptInput(
            sanitizeStudioPromptInputForOriginality(effectivePromptInput),
          );
    moderation = {
      ...moderation,
      depictsRealPerson:
        moderation.depictsRealPerson || originalityGuard.flags.depictsRealPerson,
      depictsPublicFigure:
        moderation.depictsPublicFigure || originalityGuard.flags.depictsPublicFigure,
      depictsFranchiseCharacter:
        moderation.depictsFranchiseCharacter ||
        originalityGuard.flags.depictsFranchiseCharacter,
      depictsProtectedStyleRequest:
        moderation.depictsProtectedStyleRequest ||
        originalityGuard.flags.depictsProtectedStyleRequest,
      lookalikeRiskFlag:
        moderation.lookalikeRiskFlag || originalityGuard.flags.lookalikeRiskFlag,
      namedCharacterReferenceFlag:
        moderation.namedCharacterReferenceFlag ||
        originalityGuard.flags.namedCharacterReferenceFlag,
      blockedRequestReason:
        moderation.blockedRequestReason ?? originalityGuard.blockedReason,
      moderationNotes:
        originalityGuard.matchedTerms.length > 0
          ? `Matched originality guard terms: ${originalityGuard.matchedTerms.join(", ")}`
          : moderation.moderationNotes,
      moderationStatus:
        originalityGuard.decision === "block"
          ? "blocked"
          : moderation.moderationStatus,
    };

    if (originalityGuard.decision === "block") {
      return jsonError(
        buildBlockedRequestMessage(originalityGuard.blockedReason),
        400,
        {
          errorCode: "ORIGINALITY_BLOCKED",
          blockedRequestReason: originalityGuard.blockedReason,
          safeAlternatives: originalityGuard.safeAlternatives,
          reasons: originalityGuard.reasons,
          matchedTerms: originalityGuard.matchedTerms,
        },
      );
    }

    if (requestBody.kind !== "gallery" && promptEngineOutput.moderationFlags.needsBlock) {
      return jsonError(
        buildBlockedRequestMessage(
          promptEngineOutput.moderationFlags.blockedRequestReason,
        ),
        400,
        {
          errorCode: "PROMPT_MODERATION_BLOCKED",
          blockedRequestReason:
            promptEngineOutput.moderationFlags.blockedRequestReason ?? null,
          reasons: promptEngineOutput.moderationFlags.reasons,
          safeAlternatives:
            promptEngineOutput.moderationFlags.suggestedOriginalAlternatives ?? [],
        },
      );
    }

    const usePreviewImage =
      !isDraft &&
      Boolean(requestBody.previewImageUrl && requestBody.previewImageUrl.trim().length > 0);

    const customCharacter =
      !isDraft && requestBody.userId && serverSupabase
        ? await getCustomCharacterWithRetry({
            serverSupabase,
            characterId: requestBody.characterId,
            userId: requestBody.userId,
          })
        : null;
    const builtInCharacter =
      !isDraft && !customCharacter ? getCharacterBySlug(requestBody.characterId) : null;
    const hasConversationAccess =
      !isDraft && requestBody.userId && serverSupabase
        ? await hasStartedConversationAccess({
            serverSupabase,
            userId: requestBody.userId,
            characterId: requestBody.characterId,
          })
        : false;

    if (
      !isDraft &&
      !usePreviewImage &&
      requestBody.kind !== "gallery" &&
      !customCharacter &&
      !builtInCharacter &&
      !hasConversationAccess
    ) {
      return jsonError("Character not found.", 404);
    }

    if (customCharacter) {
      const legacyState = getLegacyCharacterState({
        styleType: customCharacter.style_type,
        payload: customCharacter.payload,
      });

      if (legacyState.isLegacyAnime) {
        return jsonError(
          "This character comes from a frozen legacy anime flow. Rebuild it as a realistic original before generating new photos.",
          400,
          {
            errorCode: "LEGACY_STYLE_FROZEN",
            safeAlternatives: [
              "Open the realistic rebuild flow for this character, then generate a new photo from the rebuilt version.",
            ],
          },
        );
      }
    }

    const useConsistencyReference =
      Boolean(
        requestBody.consistencySourceImageUrl &&
          requestBody.consistencySourceImageUrl.trim().length > 0,
      ) && !usePreviewImage;

    const existingImages =
      !isDraft && useConsistencyReference && serverSupabase
        ? await listCharacterImagesWithClient(
            serverSupabase as never,
            requestBody.characterId,
          )
        : [];
    const consistencyReferenceUrls = useConsistencyReference
      ? buildConsistencyReferenceBundle({
          sourceUrl: requestBody.consistencySourceImageUrl!,
          imageRows: existingImages,
        })
      : [];
    const consistencySeed = useConsistencyReference
      ? pickConsistencySeed({
          preferredSeed: requestBody.baseSeed ?? null,
          imageRows: existingImages,
        })
      : null;
    const variationLockContract = buildVariationLockContract(effectivePromptInput);
    const normalizedOutputType = normalizeActiveOutputType(
      promptEngineOutput.generationHints?.outputType as string | null,
    );

    const effectiveCandidateCount =
      typeof requestBody.candidateCount === "number"
        ? requestBody.candidateCount
        : requestBody.previewOnly
          ? 4
          : requestBody.generationProfile === "identity_locked_avatar"
            ? 1
            : undefined;

    async function executeGenerationAttempt() {
      const selectedProvider = pickAutoProvider();
      const selectedProviderModel = getDefaultProviderModel({
        provider: selectedProvider,
        model: requestBody.model ?? null,
        kind: requestBody.kind ?? "avatar",
        studioMode: requestBody.studioMode ?? "normal",
        generationProfile:
          requestBody.generationProfile ?? "identity_locked_avatar",
        useConsistencyReference,
      });
      const resolvedProviderModel = selectedProviderModel;

      const generationResult = usePreviewImage
        ? {
            ok: true as const,
            provider: selectedProvider,
            kind: "initial" as const,
            externalJobId: null,
            candidates: [
              {
                tempId: "preview-selected",
                imageUrl: requestBody.previewImageUrl!,
                width: null,
                height: null,
                seed: null,
                model: selectedProviderModel,
                prompt:
                  requestBody.previewResolvedPrompt ??
                  promptEngineOutput.canonicalPrompt ??
                  null,
                negativePrompt:
                  requestBody.previewNegativePrompt ??
                  promptEngineOutput.negativePrompt ??
                  null,
              },
            ],
          }
        : useConsistencyReference
          ? await generateVariationCandidatesWithService({
              provider: selectedProvider,
              styleType: hiddenPromptInput.styleType,
              characterId: requestBody.characterId,
              basePrompt: promptEngineOutput.canonicalPrompt,
              negativePrompt: promptEngineOutput.negativePrompt,
              primaryReferenceImageUrl: requestBody.consistencySourceImageUrl!,
              variationPromptDelta: buildConsistencyVariationDelta(
                effectivePromptInput,
              ),
              variationLockContract,
              consistencyStrength: requestBody.consistencyStrength ?? "strict",
              baseSeed:
                typeof consistencySeed === "number"
                  ? consistencySeed
                  : consistencySeed,
              candidateCount: effectiveCandidateCount,
              outputType: normalizedOutputType,
              model: selectedProviderModel,
              referenceImageUrls: consistencyReferenceUrls,
            })
          : await generateInitialCharacterCandidatesWithService({
              provider: selectedProvider,
              styleType: hiddenPromptInput.styleType,
              builderMode: hiddenPromptInput.builderMode,
              hiddenPromptInput,
              promptEngineOutput,
              candidateCount: effectiveCandidateCount,
              model: selectedProviderModel,
            });

      return { generationResult, resolvedProviderModel };
    }

    let resolvedProviderModel = getDefaultProviderModel({
      provider: "runware",
      model: requestBody.model ?? null,
      kind: requestBody.kind ?? "avatar",
      studioMode: requestBody.studioMode ?? "normal",
      generationProfile: requestBody.generationProfile ?? "identity_locked_avatar",
      useConsistencyReference,
    });
    const attempt = await executeGenerationAttempt();
    const generationResult = attempt.generationResult;
    resolvedProviderModel = attempt.resolvedProviderModel;
    const judgeSummary = null;

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
        requestBody.selectedCandidateId ?? null,
      ) ?? generationResult.candidates[0] ?? null;

    if (isDraft || requestBody.previewOnly) {
      return NextResponse.json({
        ok: true,
        provider: generationResult.provider,
        kind: requestBody.kind ?? "avatar",
        characterId: requestBody.characterId,
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
        generationProfile: requestBody.generationProfile ?? "identity_locked_avatar",
        qualityTier: requestBody.qualityTier ?? "max",
        referenceStrategy:
          requestBody.referenceStrategy ??
          (useConsistencyReference
            ? "stacked_character_reference"
            : "single_avatar_lock"),
        providerModel: resolvedProviderModel,
        candidates: generationResult.candidates,
        judgeSummary,
        previewMode: true,
      });
    }

    if (usePreviewImage) {
      if (!serverSupabase || !requestBody.userId) {
        return jsonError("Image storage session could not be established.", 500);
      }

      if (
        canMutateCustomCharacterImageLinks({
          customCharacter,
          userId: requestBody.userId,
        })
      ) {
        await setCustomCharacterImageLinksWithRetry({
          serverSupabase,
          input: {
            characterId: requestBody.characterId,
            userId: requestBody.userId,
            avatarImageId: null,
            primaryReferenceImageId: null,
            baseGenerationId: null,
            primaryImageUrl:
              selectedCandidate?.imageUrl ?? requestBody.previewImageUrl ?? null,
            imageStatus: "ready",
            imageVisibility: customCharacter?.image_visibility ?? "private",
            imagePromptVersion: customCharacter?.image_prompt_version ?? 1,
            imageLastGeneratedAt: new Date().toISOString(),
            imageGenerationEnabled: true,
            consistencyStatus: "ready",
          },
        });
      }

      return NextResponse.json({
        ok: true,
        provider: generationResult.provider,
        kind: requestBody.kind ?? "avatar",
        characterId: requestBody.characterId,
        promptSummary: promptEngineOutput.promptSummary,
        canonicalPrompt: promptEngineOutput.canonicalPrompt,
        negativePrompt: promptEngineOutput.negativePrompt,
        moderationFlags: promptEngineOutput.moderationFlags,
        generationHints: promptEngineOutput.generationHints,
        identityLock: promptEngineOutput.identityLock,
        selectedCandidateId: selectedCandidate?.tempId ?? null,
        primaryImageId: null,
        primaryImageUrl: selectedCandidate?.imageUrl ?? requestBody.previewImageUrl ?? null,
        imageUrl: selectedCandidate?.imageUrl ?? requestBody.previewImageUrl ?? null,
        externalJobId: generationResult.externalJobId ?? null,
        generationProfile: requestBody.generationProfile ?? "identity_locked_avatar",
        qualityTier: requestBody.qualityTier ?? "max",
        referenceStrategy:
          requestBody.referenceStrategy ??
          "single_avatar_lock",
        providerModel: resolvedProviderModel,
        candidates: generationResult.candidates,
        judgeSummary,
        previewMode: false,
      });
    }

    if (!serverSupabase) {
      return jsonError("Image storage session could not be established.", 500);
    }
    const job = await createCharacterImageJobWithClient(
      serverSupabase as never,
      createImageJobInsertPayload(
        createInitialGenerationJobInput({
          userId: requestBody.userId!,
          characterId: requestBody.characterId,
          provider: generationResult.provider,
          styleType: hiddenPromptInput.styleType,
          builderMode:
            requestBody.kind === "gallery" ? "gallery" : hiddenPromptInput.builderMode,
          hiddenPromptInput,
          promptEngineOutput,
          model: resolvedProviderModel,
          moderation,
        }),
      ),
    );

    createdJobId = job.id;

    await markCharacterImageJobProcessingWithClient(
      serverSupabase as never,
      job.id,
    );

    if (requestBody.kind !== "gallery") {
      const existingCharacterImages = await listCharacterImagesWithClient(
        serverSupabase as never,
        requestBody.characterId,
      );

      for (const image of existingCharacterImages) {
        if (!image.is_primary) continue;

        await updateCharacterImageWithClient(serverSupabase as never, {
          imageId: image.id,
          patch: {
            is_primary: false,
          },
        });
      }
    }

    const imagePayloads =
      requestBody.kind === "gallery"
        ? mapGalleryCandidatesToImageInsertPayloads({
            userId: requestBody.userId!,
            characterId: requestBody.characterId,
            jobId: job.id,
            candidates: generationResult.candidates,
            moderation,
            hiddenPromptInput: hiddenPromptInput as Record<string, unknown>,
            providerUsed: generationResult.provider,
            providerModel: resolvedProviderModel,
            judgeSummary,
          })
        : mapInitialCandidatesToImageInsertPayloads({
            userId: requestBody.userId!,
            characterId: requestBody.characterId,
            jobId: job.id,
            candidates: generationResult.candidates,
            selectedCandidateId: selectedCandidate?.tempId ?? null,
            moderation,
            hiddenPromptInput: hiddenPromptInput as Record<string, unknown>,
            providerUsed: generationResult.provider,
            providerModel: resolvedProviderModel,
            judgeSummary,
          });

    const savedImages = [];
    for (const payload of imagePayloads) {
      const bucketBackedPayload =
        await createBucketBackedImageInsertPayload(payload);
      const image = await createCharacterImageWithClient(
        serverSupabase as never,
        bucketBackedPayload,
      );
      savedImages.push(image);
    }

    let primaryImage =
      requestBody.kind === "gallery"
        ? null
        : savedImages.find((image) => image.is_primary) ?? null;

    if (!primaryImage && selectedCandidate && requestBody.kind !== "gallery") {
      const bucketBackedPrimaryPayload = await createBucketBackedImageInsertPayload(
        createPrimaryReferenceImageInsertPayload({
          userId: requestBody.userId!,
          characterId: requestBody.characterId,
          jobId: job.id,
          candidate: selectedCandidate,
          moderation,
          hiddenPromptInput: hiddenPromptInput as Record<string, unknown>,
          providerUsed: generationResult.provider,
          providerModel: resolvedProviderModel,
          judgeSummary,
        }),
      );

      primaryImage = await createCharacterImageWithClient(
        serverSupabase as never,
        bucketBackedPrimaryPayload,
      );
    }

    if (primaryImage) {
      await setPrimaryCharacterImageWithClient(
        serverSupabase as never,
        requestBody.characterId,
        primaryImage.id,
      );
      await setReferenceCharacterImageWithClient(
        serverSupabase as never,
        primaryImage.id,
        true,
      );

      if (
        canMutateCustomCharacterImageLinks({
          customCharacter,
          userId: requestBody.userId,
        })
      ) {
        await setCustomCharacterImageLinksWithClient(
          serverSupabase as never,
          {
          characterId: requestBody.characterId,
          userId: requestBody.userId!,
          avatarImageId: primaryImage.id,
          primaryReferenceImageId: primaryImage.id,
          baseGenerationId: job.id,
          primaryImageUrl: primaryImage.public_url,
          imageStatus: "ready",
          imageVisibility: customCharacter?.image_visibility ?? "private",
          imagePromptVersion: customCharacter?.image_prompt_version ?? 1,
          imageLastGeneratedAt: new Date().toISOString(),
          imageGenerationEnabled: true,
          consistencyStatus: "ready",
          },
        );
      }
    }

    await markCharacterImageJobCompletedWithClient(
      serverSupabase as never,
      {
        jobId: job.id,
        externalJobId: generationResult.externalJobId ?? null,
      },
    );

    return NextResponse.json({
      ok: true,
      provider: generationResult.provider,
      kind: requestBody.kind ?? "avatar",
      jobId: job.id,
      characterId: requestBody.characterId,
      promptSummary: promptEngineOutput.promptSummary,
      canonicalPrompt: promptEngineOutput.canonicalPrompt,
      negativePrompt: promptEngineOutput.negativePrompt,
      moderationFlags: promptEngineOutput.moderationFlags,
      generationHints: promptEngineOutput.generationHints,
      identityLock: promptEngineOutput.identityLock,
      selectedCandidateId: selectedCandidate?.tempId ?? null,
      savedImageId: primaryImage?.id ?? savedImages[0]?.id ?? null,
      primaryImageId: primaryImage?.id ?? null,
      primaryImageUrl:
        primaryImage?.public_url ?? savedImages[0]?.public_url ?? null,
      imageUrl:
        primaryImage?.public_url ?? savedImages[0]?.public_url ?? null,
      externalJobId: generationResult.externalJobId ?? null,
      generationProfile:
        requestBody.kind === "gallery"
          ? "identity_locked_gallery"
          : "identity_locked_avatar",
      qualityTier: requestBody.qualityTier ?? "max",
      referenceStrategy:
        requestBody.kind === "gallery"
          ? "stacked_character_reference"
          : "single_avatar_lock",
      providerModel: resolvedProviderModel,
      candidates: generationResult.candidates,
      judgeSummary,
      previewMode: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected image generation error.";

    if (createdJobId) {
      try {
        if (serverSupabase) {
          await markCharacterImageJobFailedWithClient(
            serverSupabase as never,
            {
              jobId: createdJobId,
              errorCode: "UNEXPECTED_IMAGE_GENERATION_ERROR",
              errorMessage: message,
            },
          );
        }
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
