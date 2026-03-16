import { supabase } from "@/lib/supabase";
import type {
  CharacterImagePromptInput,
  ImageProvider,
} from "@/lib/image-provider";

export const CHARACTER_IMAGES_BUCKET =
  process.env.NEXT_PUBLIC_CHARACTER_IMAGES_BUCKET || "character-images";

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

type QueryResult<T> = Promise<{ data: T; error: { message: string } | null }>;

type UpdateBuilder = {
  eq(column: string, value: string): QueryResult<unknown>;
};

type UpdateCapableTable = {
  update(values: Record<string, unknown>): UpdateBuilder;
};

type InsertSelectionBuilder<T> = {
  select(columns: string): {
    single(): QueryResult<T>;
  };
};

type InsertCapableTable<T> = {
  insert(values: Record<string, unknown>): InsertSelectionBuilder<T>;
};

function asUpdateCapableTable(tableName: string): UpdateCapableTable {
  return supabase.from(tableName) as unknown as UpdateCapableTable;
}

function asInsertCapableTable<T>(tableName: string): InsertCapableTable<T> {
  return supabase.from(tableName) as unknown as InsertCapableTable<T>;
}

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

async function clearPrimaryImageForCharacter(characterId: string) {
  const table = asUpdateCapableTable("character_images");

  const { error } = await table
    .update({ is_primary: false })
    .eq("character_id", characterId);

  if (error) {
    throw new Error(error.message);
  }
}

async function setCharacterAvatarReference(characterId: string, imageId: string) {
  const table = asUpdateCapableTable("custom_characters");

  const { error } = await table
    .update({
      avatar_image_id: imageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", characterId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createCharacterImageJob(
  input: CreateCharacterImageJobInput,
): Promise<CharacterImageJobRecord> {
  const user = await getCurrentUserOrThrow();

  const now = new Date().toISOString();
  const provider = input.provider ?? "mage";
  const model = input.model ?? "unknown-model";
  const workflowName = input.workflowName ?? "character-avatar-v1";

  const row = {
    user_id: user.id,
    character_id: input.characterId,
    provider,
    engine: provider,
    model,
    workflow_name: workflowName,
    status: "processing",
    request_type: "generate",
    prompt_version: 1,
    prompt_input: buildPublicPromptSnapshot(input.promptInput),
    resolved_prompt: null,
    negative_prompt: null,
    error_code: null,
    error_message: null,
    moderation_status: "pending" as ImageModerationStatus,
    moderation_notes: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };

  const table = asInsertCapableTable<CharacterImageJobRecord>("character_image_jobs");

  const { data, error } = await table.insert(row).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CharacterImageJobRecord;
}

export async function markCharacterImageJobCompleted(
  input: MarkCharacterImageJobCompletedInput,
) {
  const table = asUpdateCapableTable("character_image_jobs");

  const { error } = await table
    .update({
      status: "completed",
      moderation_status: "approved",
      moderation_notes: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.jobId);

  if (error) {
    throw new Error(error.message);
  }

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

  if (input.isPrimary) {
    await clearPrimaryImageForCharacter(input.characterId);
  }

  const imageRow = {
    id: input.imageId,
    user_id: user.id,
    character_id: input.characterId,
    job_id: input.jobId,
    kind: "avatar",
    source: input.provider ?? "generated",
    visibility: "private",
    storage_bucket: bucket,
    storage_path: filePath,
    public_url: publicUrl,
    width: null,
    height: null,
    mime_type: input.mimeType || "image/png",
    file_size_bytes:
      typeof input.blob.size === "number" ? input.blob.size : null,
    provider: input.provider ?? "mage",
    engine: input.provider ?? "mage",
    model: input.model ?? "unknown-model",
    workflow_name: input.workflowName ?? "character-avatar-v1",
    request_type: "generate",
    prompt_version: 1,
    prompt_input: buildPublicPromptSnapshot(input.promptInput),
    resolved_prompt: input.resolvedPrompt ?? null,
    negative_prompt: input.negativePrompt ?? null,
    moderation_status: "approved" as ImageModerationStatus,
    moderation_notes: null,
    is_primary: Boolean(input.isPrimary),
    created_at: now,
    updated_at: now,
  };

  const table = asInsertCapableTable<Record<string, unknown>>("character_images");

  const { data, error } = await table.insert(imageRow).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  if (input.isPrimary) {
    await setCharacterAvatarReference(input.characterId, input.imageId);
  }

  return data as Record<string, unknown>;
}
