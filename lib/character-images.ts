import { supabase } from "@/lib/supabase";
import type {
  CharacterImagePromptInput,
  ImageProvider,
} from "@/lib/image-provider";
import { CHARACTER_IMAGES_BUCKET } from "@/lib/image-storage";
import {
  createCharacterImage as createRepositoryCharacterImage,
  setPrimaryCharacterImage,
  setReferenceCharacterImage,
} from "@/lib/character-repository/images";
import {
  createCharacterImageJob as createRepositoryCharacterImageJob,
  markCharacterImageJobCompleted as markRepositoryCharacterImageJobCompleted,
} from "@/lib/character-repository/image-jobs";
import { setCustomCharacterImageLinks } from "@/lib/character-repository/custom-characters";

export type ImageModerationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "blocked";

export type CreateCharacterImageJobInput = {
  characterId: string;
  promptInput: CharacterImagePromptInput;
  model?: string;
  workflowName?: string;
  provider?: ImageProvider;
};

export type MarkCharacterImageJobCompletedInput = {
  jobId: string;
};

export type UploadGeneratedCharacterImageInput = {
  characterId: string;
  jobId: string;
  imageId: string;
  blob: Blob;
  extension: string;
  mimeType: string;
  model?: string;
  workflowName?: string;
  provider?: ImageProvider;
  promptInput: CharacterImagePromptInput;
  resolvedPrompt?: string;
  negativePrompt?: string;
  isPrimary?: boolean;
};

type CharacterImageJobRecord = {
  id: string;
  user_id: string;
  character_id: string;
  provider: string;
  engine: string;
  model: string;
  workflow_name: string;
  status: string;
  request_type: string;
  prompt_version: number;
  prompt_input: Record<string, unknown>;
  resolved_prompt: string | null;
  negative_prompt: string | null;
  error_code: string | null;
  error_message: string | null;
  moderation_status: ImageModerationStatus;
  moderation_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function getStorageBucket() {
  return CHARACTER_IMAGES_BUCKET;
}

function getStorageBasePath(characterId: string) {
  return `characters/${characterId}`;
}

function sanitizeFileExtension(extension: string) {
  const cleaned = extension.trim().toLowerCase().replace(/^\./, "");
  if (!cleaned) return "png";
  if (["png", "jpg", "jpeg", "webp"].includes(cleaned)) return cleaned;
  return "png";
}

function buildPublicPromptSnapshot(
  input: CharacterImagePromptInput,
): Record<string, unknown> {
  return {
    characterName: input.characterName,
    archetype: input.archetype ?? null,
    visualAura: input.visualAura ?? null,
    ageBand: input.ageBand ?? null,
    genderPresentation: input.genderPresentation ?? null,
    region: input.region ?? null,
    hair: input.hair ?? null,
    eyes: input.eyes ?? null,
    outfit: input.outfit ?? null,
    palette: input.palette ?? null,
    camera: input.camera ?? null,
    avatarStyle: input.avatarStyle ?? null,
    bodyType: input.bodyType ?? null,
    pose: input.pose ?? null,
    expression: input.expression ?? null,
    environment: input.environment ?? null,
    nsfwLevel: input.nsfwLevel ?? null,
  };
}

async function getCurrentUserOrThrow() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  return user;
}

function buildDefaultModeration() {
  return {
    isAdultOnly: true,
    subjectDeclared18Plus: true,
    consentConfirmed: true,
    depictsRealPerson: false,
    depictsPublicFigure: false,
    nonConsensualFlag: false,
    underageRiskFlag: false,
    illegalContentFlag: false,
    moderationStatus: "approved" as const,
    moderationNotes: null,
  };
}

export async function createCharacterImageJob(
  input: CreateCharacterImageJobInput,
) {
  const user = await getCurrentUserOrThrow();

  return createRepositoryCharacterImageJob({
    userId: user.id,
    characterId: input.characterId,
    provider: input.provider ?? "runware",
    kind: "avatar",
    promptInputJson: buildPublicPromptSnapshot(input.promptInput),
    canonicalPrompt: "",
    negativePrompt: "",
    styleType: "realistic",
    requestMode: "preset",
    model: input.model ?? "runware-default",
    moderation: buildDefaultModeration(),
  }) as unknown as CharacterImageJobRecord;
}

export async function markCharacterImageJobCompleted(
  input: MarkCharacterImageJobCompletedInput,
) {
  await markRepositoryCharacterImageJobCompleted({
    jobId: input.jobId,
    completedAt: new Date().toISOString(),
  });

  return { ok: true };
}

export async function uploadGeneratedCharacterImage(
  input: UploadGeneratedCharacterImageInput,
) {
  const user = await getCurrentUserOrThrow();
  const bucket = getStorageBucket();
  const extension = sanitizeFileExtension(input.extension);
  const fileName = `${input.imageId}.${extension}`;
  const filePath = `${getStorageBasePath(input.characterId)}/${fileName}`;
  const now = new Date().toISOString();

  const uploadResult = await supabase.storage
    .from(bucket)
    .upload(filePath, input.blob, {
      upsert: true,
      contentType: input.mimeType || "image/png",
    });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const publicUrlResult = supabase.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = publicUrlResult.data?.publicUrl ?? null;

  const image = await createRepositoryCharacterImage({
    userId: user.id,
    characterId: input.characterId,
    jobId: input.jobId,
    imageType: "avatar",
    variantKind: "base",
    storageBucket: bucket,
    storagePath: filePath,
    imageUrl: publicUrl,
    mimeType: input.mimeType || "image/png",
    fileSizeBytes: typeof input.blob.size === "number" ? input.blob.size : null,
    modelUsed: input.model ?? "runware-default",
    providerUsed: input.provider ?? "runware",
    workflowName: input.workflowName ?? "character-avatar-v1",
    promptInputJson: buildPublicPromptSnapshot(input.promptInput),
    promptSnapshot: input.resolvedPrompt ?? null,
    negativePromptSnapshot: input.negativePrompt ?? null,
    isPrimary: Boolean(input.isPrimary),
    isReference: Boolean(input.isPrimary),
    moderation: buildDefaultModeration(),
  });

  if (input.isPrimary) {
    await setPrimaryCharacterImage(input.characterId, image.id);
    await setReferenceCharacterImage(image.id, true);
    await setCustomCharacterImageLinks({
      characterId: input.characterId,
      userId: user.id,
      avatarImageId: image.id,
      primaryReferenceImageId: image.id,
      baseGenerationId: input.jobId,
      primaryImageUrl: publicUrl,
      imageStatus: "ready",
      imageVisibility: "private",
      imagePromptVersion: 1,
      imageLastGeneratedAt: now,
      imageGenerationEnabled: true,
      consistencyStatus: "ready",
    });
  }

  return image as unknown as Record<string, unknown>;
}
