import { supabase } from "@/lib/supabase";
import type { CharacterImageRepositoryInsert } from "../image-generation/types";

export type DbCharacterImage = {
  id: string;
  user_id: string;
  character_id: string;
  job_id: string | null;

  kind: string;
  source: string;
  visibility: string;

  storage_bucket: string | null;
  storage_path: string | null;
  public_url: string | null;

  width: number | null;
  height: number | null;
  mime_type: string | null;
  file_size_bytes: number | null;

  seed: number | null;
  steps: number | null;
  cfg_scale: number | null;
  sampler: string | null;
  model: string | null;
  workflow_name: string | null;

  prompt_version: number;
  prompt_input: Record<string, unknown>;
  resolved_prompt: string | null;
  negative_prompt: string | null;

  is_primary: boolean;
  sort_order: number;

  is_adult_only: boolean;
  subject_declared_18_plus: boolean;
  consent_confirmed: boolean;
  depicts_real_person: boolean;
  depicts_public_figure: boolean;
  moderation_status: "pending" | "approved" | "blocked";
  moderation_notes: string | null;

  image_type: "avatar" | "reference" | "variation" | "gallery" | null;
  variant_kind:
    | "base"
    | "outfit"
    | "selfie"
    | "pose"
    | "location"
    | "full_body"
    | null;
  is_reference: boolean;
  model_used: string | null;
  provider_used: string | null;
  prompt_snapshot: string | null;
  negative_prompt_snapshot: string | null;

  created_at: string;
  updated_at: string;
};

export type CreateCharacterImageInput = CharacterImageRepositoryInsert;

export type UpdateCharacterImageInput = {
  imageId: string;
  patch: Partial<{
    storage_bucket: string | null;
    storage_path: string | null;
    public_url: string | null;
    width: number | null;
    height: number | null;
    mime_type: string | null;
    file_size_bytes: number | null;
    is_primary: boolean;
    is_reference: boolean;
    visibility: string;
    image_type: DbCharacterImage["image_type"];
    variant_kind: DbCharacterImage["variant_kind"];
    model_used: string | null;
    provider_used: string | null;
    prompt_snapshot: string | null;
    negative_prompt_snapshot: string | null;
  }>;
};

type UntypedSupabase = {
  from: (table: string) => {
    insert: (values: unknown) => {
      select: (columns?: string) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
    select: (columns?: string) => {
      eq: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        order: (
          column: string,
          options?: { ascending?: boolean },
        ) => Promise<{ data: unknown; error: unknown }>;
      };
      order: (
        column: string,
        options?: { ascending?: boolean },
      ) => Promise<{ data: unknown; error: unknown }>;
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
    };
    update: (values: unknown) => {
      eq: (column: string, value: unknown) => {
        select: (columns?: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
    delete: () => {
      eq: (column: string, value: unknown) => Promise<{ error: unknown }>;
    };
  };
};

const db = supabase as unknown as UntypedSupabase;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "Unknown Supabase error");
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function mapImageType(
  value: unknown,
): DbCharacterImage["image_type"] {
  return value === "avatar" ||
    value === "reference" ||
    value === "variation" ||
    value === "gallery"
    ? value
    : null;
}

function mapVariantKind(
  value: unknown,
): DbCharacterImage["variant_kind"] {
  return value === "base" ||
    value === "outfit" ||
    value === "selfie" ||
    value === "pose" ||
    value === "location" ||
    value === "full_body"
    ? value
    : null;
}

function mapModerationStatus(
  value: unknown,
): DbCharacterImage["moderation_status"] {
  return value === "pending" || value === "approved" || value === "blocked"
    ? value
    : "pending";
}

function mapCharacterImageRow(row: Record<string, unknown>): DbCharacterImage {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    character_id: String(row.character_id ?? ""),
    job_id: asNullableString(row.job_id),

    kind: String(row.kind ?? "avatar"),
    source: String(row.source ?? "generated"),
    visibility: String(row.visibility ?? "private"),

    storage_bucket: asNullableString(row.storage_bucket),
    storage_path: asNullableString(row.storage_path),
    public_url: asNullableString(row.public_url),

    width: asNullableNumber(row.width),
    height: asNullableNumber(row.height),
    mime_type: asNullableString(row.mime_type),
    file_size_bytes: asNullableNumber(row.file_size_bytes),

    seed: asNullableNumber(row.seed),
    steps: asNullableNumber(row.steps),
    cfg_scale: asNullableNumber(row.cfg_scale),
    sampler: asNullableString(row.sampler),
    model: asNullableString(row.model),
    workflow_name: asNullableString(row.workflow_name),

    prompt_version: typeof row.prompt_version === "number" ? row.prompt_version : 1,
    prompt_input: asObject(row.prompt_input),
    resolved_prompt: asNullableString(row.resolved_prompt),
    negative_prompt: asNullableString(row.negative_prompt),

    is_primary: typeof row.is_primary === "boolean" ? row.is_primary : false,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,

    is_adult_only: typeof row.is_adult_only === "boolean" ? row.is_adult_only : true,
    subject_declared_18_plus:
      typeof row.subject_declared_18_plus === "boolean"
        ? row.subject_declared_18_plus
        : true,
    consent_confirmed:
      typeof row.consent_confirmed === "boolean" ? row.consent_confirmed : true,
    depicts_real_person:
      typeof row.depicts_real_person === "boolean" ? row.depicts_real_person : false,
    depicts_public_figure:
      typeof row.depicts_public_figure === "boolean"
        ? row.depicts_public_figure
        : false,
    moderation_status: mapModerationStatus(row.moderation_status),
    moderation_notes: asNullableString(row.moderation_notes),

    image_type: mapImageType(row.image_type),
    variant_kind: mapVariantKind(row.variant_kind),
    is_reference: typeof row.is_reference === "boolean" ? row.is_reference : false,
    model_used: asNullableString(row.model_used),
    provider_used: asNullableString(row.provider_used),
    prompt_snapshot: asNullableString(row.prompt_snapshot),
    negative_prompt_snapshot: asNullableString(row.negative_prompt_snapshot),

    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function buildCreatePayload(input: CreateCharacterImageInput) {
  return {
    user_id: input.userId,
    character_id: input.characterId,
    job_id: input.jobId,

    kind: input.imageType === "gallery" ? "avatar" : input.imageType ?? "avatar",
    source: "generated",
    visibility: "private",

    storage_bucket: input.storageBucket,
    storage_path: input.storagePath,
    public_url: input.imageUrl,

    width: input.width,
    height: input.height,
    mime_type: input.mimeType,
    file_size_bytes: input.fileSizeBytes,

    seed: input.seed,
    steps: null,
    cfg_scale: null,
    sampler: null,
    model: input.modelUsed,
    workflow_name: input.workflowName ?? null,

    prompt_version: 1,
    prompt_input: input.promptInputJson ?? {},
    resolved_prompt: input.promptSnapshot ?? null,
    negative_prompt: input.negativePromptSnapshot ?? null,

    is_primary: input.isPrimary ?? false,
    sort_order: input.sortOrder ?? 0,

    is_adult_only: input.moderation.isAdultOnly,
    subject_declared_18_plus: input.moderation.subjectDeclared18Plus,
    consent_confirmed: input.moderation.consentConfirmed,
    depicts_real_person: input.moderation.depictsRealPerson,
    depicts_public_figure: input.moderation.depictsPublicFigure,
    moderation_status: input.moderation.moderationStatus,
    moderation_notes: input.moderation.moderationNotes ?? null,

    image_type: input.imageType,
    variant_kind: input.variantKind ?? null,
    is_reference: input.isReference ?? false,
    model_used: input.modelUsed ?? null,
    provider_used: input.providerUsed ?? null,
    prompt_snapshot: input.promptSnapshot ?? null,
    negative_prompt_snapshot: input.negativePromptSnapshot ?? null,
  };
}

export async function createCharacterImage(
  input: CreateCharacterImageInput,
): Promise<DbCharacterImage> {
  const payload = buildCreatePayload(input);

  const { data, error } = await db
    .from("character_images")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) {
    throw asError(error);
  }

  if (!data) {
    throw new Error("Failed to create character image.");
  }

  return mapCharacterImageRow(data as Record<string, unknown>);
}

export async function getCharacterImageById(
  imageId: string,
): Promise<DbCharacterImage | null> {
  const { data, error } = await db
    .from("character_images")
    .select("*")
    .eq("id", imageId)
    .maybeSingle();

  if (error) {
    throw asError(error);
  }

  if (!data) {
    return null;
  }

  return mapCharacterImageRow(data as Record<string, unknown>);
}

export async function listCharacterImages(
  characterId: string,
): Promise<DbCharacterImage[]> {
  const query = db
    .from("character_images")
    .select("*")
    .eq("character_id", characterId);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw asError(error);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row) => mapCharacterImageRow(row as Record<string, unknown>));
}

export async function listJobImages(
  jobId: string,
): Promise<DbCharacterImage[]> {
  const query = db
    .from("character_images")
    .select("*")
    .eq("job_id", jobId);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw asError(error);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row) => mapCharacterImageRow(row as Record<string, unknown>));
}

export async function updateCharacterImage(
  input: UpdateCharacterImageInput,
): Promise<DbCharacterImage> {
  const { data, error } = await db
    .from("character_images")
    .update(input.patch)
    .eq("id", input.imageId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw asError(error);
  }

  if (!data) {
    throw new Error("Failed to update character image.");
  }

  return mapCharacterImageRow(data as Record<string, unknown>);
}

export async function setPrimaryCharacterImage(
  characterId: string,
  imageId: string,
): Promise<void> {
  const currentImages = await listCharacterImages(characterId);

  const currentPrimary = currentImages.find((image) => image.is_primary);

  if (currentPrimary && currentPrimary.id !== imageId) {
    await updateCharacterImage({
      imageId: currentPrimary.id,
      patch: {
        is_primary: false,
      },
    });
  }

  await updateCharacterImage({
    imageId,
    patch: {
      is_primary: true,
    },
  });
}

export async function setReferenceCharacterImage(
  imageId: string,
  isReference = true,
): Promise<DbCharacterImage> {
  return updateCharacterImage({
    imageId,
    patch: {
      is_reference: isReference,
    },
  });
}

export async function deleteCharacterImage(imageId: string): Promise<void> {
  const { error } = await db
    .from("character_images")
    .delete()
    .eq("id", imageId);

  if (error) {
    throw asError(error);
  }
}
