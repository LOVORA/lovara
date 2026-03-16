import { supabase } from "@/lib/supabase";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CustomCharacterVisibility = "private" | "public";
export type CustomCharacterBuilderMode = "preset" | "custom_prompt" | null;
export type CustomCharacterStyleType = "realistic" | "anime" | null;
export type CustomCharacterConsistencyStatus = "draft" | "locked" | "ready";

export type DbCustomCharacter = {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  archetype: string;
  headline: string;
  description: string;
  greeting: string;
  preview_message: string;
  backstory: string;
  tags: string[];
  trait_badges: Json;
  scenario: Json;
  metadata: Json;
  payload: Json;
  avatar_image_id: string | null;
  primary_image_url: string | null;
  image_status: string;
  image_visibility: string;
  image_prompt_version: number;
  image_last_generated_at: string | null;
  image_generation_enabled: boolean;
  builder_mode: CustomCharacterBuilderMode;
  style_type: CustomCharacterStyleType;
  primary_reference_image_id: string | null;
  base_generation_id: string | null;
  consistency_status: CustomCharacterConsistencyStatus;
  prompt_version: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateCustomCharacterInput = {
  userId: string;
  slug: string;
  name: string;
  archetype?: string;
  headline?: string;
  description?: string;
  greeting?: string;
  previewMessage?: string;
  backstory?: string;
  tags?: string[];
  traitBadges?: Json;
  scenario?: Json;
  metadata?: Json;
  payload?: Json;
  builderMode?: CustomCharacterBuilderMode;
  styleType?: CustomCharacterStyleType;
  consistencyStatus?: CustomCharacterConsistencyStatus;
  promptVersion?: string | null;
};

export type UpdateCustomCharacterInput = {
  id: string;
  userId: string;
  slug?: string;
  name?: string;
  archetype?: string;
  headline?: string;
  description?: string;
  greeting?: string;
  previewMessage?: string;
  backstory?: string;
  tags?: string[];
  traitBadges?: Json;
  scenario?: Json;
  metadata?: Json;
  payload?: Json;
  builderMode?: CustomCharacterBuilderMode;
  styleType?: CustomCharacterStyleType;
  consistencyStatus?: CustomCharacterConsistencyStatus;
  promptVersion?: string | null;
};

export type SetCharacterImageLinksInput = {
  characterId: string;
  userId: string;
  avatarImageId?: string | null;
  primaryReferenceImageId?: string | null;
  baseGenerationId?: string | null;
  primaryImageUrl?: string | null;
  imageStatus?: string;
  imageVisibility?: string;
  imagePromptVersion?: number;
  imageLastGeneratedAt?: string | null;
  imageGenerationEnabled?: boolean;
  consistencyStatus?: CustomCharacterConsistencyStatus;
};

export type PublishCustomCharacterInput = {
  characterId: string;
  userId: string;
  visibility: CustomCharacterVisibility;
  payload?: Json;
};

function normalizeStringArray(value?: string[]): string[] {
  if (!value) return [];
  return value.map((item) => item.trim()).filter(Boolean);
}

function asObjectJson(value: Json | undefined, fallback: Json): Json {
  return value ?? fallback;
}

function mapCustomCharacterRow(row: Record<string, unknown>): DbCustomCharacter {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    archetype: String(row.archetype ?? "custom"),
    headline: String(row.headline ?? ""),
    description: String(row.description ?? ""),
    greeting: String(row.greeting ?? ""),
    preview_message: String(row.preview_message ?? ""),
    backstory: String(row.backstory ?? ""),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    trait_badges: (row.trait_badges as Json) ?? [],
    scenario: (row.scenario as Json) ?? {},
    metadata: (row.metadata as Json) ?? {},
    payload: (row.payload as Json) ?? {},
    avatar_image_id:
      typeof row.avatar_image_id === "string" ? row.avatar_image_id : null,
    primary_image_url:
      typeof row.primary_image_url === "string" ? row.primary_image_url : null,
    image_status: String(row.image_status ?? "none"),
    image_visibility: String(row.image_visibility ?? "private"),
    image_prompt_version:
      typeof row.image_prompt_version === "number"
        ? row.image_prompt_version
        : 1,
    image_last_generated_at:
      typeof row.image_last_generated_at === "string"
        ? row.image_last_generated_at
        : null,
    image_generation_enabled:
      typeof row.image_generation_enabled === "boolean"
        ? row.image_generation_enabled
        : true,
    builder_mode:
      row.builder_mode === "preset" || row.builder_mode === "custom_prompt"
        ? row.builder_mode
        : null,
    style_type:
      row.style_type === "realistic" || row.style_type === "anime"
        ? row.style_type
        : null,
    primary_reference_image_id:
      typeof row.primary_reference_image_id === "string"
        ? row.primary_reference_image_id
        : null,
    base_generation_id:
      typeof row.base_generation_id === "string" ? row.base_generation_id : null,
    consistency_status:
      row.consistency_status === "draft" ||
      row.consistency_status === "locked" ||
      row.consistency_status === "ready"
        ? row.consistency_status
        : "draft",
    prompt_version:
      typeof row.prompt_version === "string" ? row.prompt_version : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function buildCreatePayload(input: CreateCustomCharacterInput) {
  return {
    user_id: input.userId,
    slug: input.slug,
    name: input.name,
    archetype: input.archetype ?? "custom",
    headline: input.headline ?? "",
    description: input.description ?? "",
    greeting: input.greeting ?? "",
    preview_message: input.previewMessage ?? "",
    backstory: input.backstory ?? "",
    tags: normalizeStringArray(input.tags),
    trait_badges: asObjectJson(input.traitBadges, []),
    scenario: asObjectJson(input.scenario, {}),
    metadata: asObjectJson(input.metadata, {}),
    payload: asObjectJson(input.payload, {}),
    builder_mode: input.builderMode ?? "preset",
    style_type: input.styleType ?? "realistic",
    consistency_status: input.consistencyStatus ?? "draft",
    prompt_version: input.promptVersion ?? null,
  };
}

function buildUpdatePayload(input: UpdateCustomCharacterInput) {
  const payload: Record<string, unknown> = {};

  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.name !== undefined) payload.name = input.name;
  if (input.archetype !== undefined) payload.archetype = input.archetype;
  if (input.headline !== undefined) payload.headline = input.headline;
  if (input.description !== undefined) payload.description = input.description;
  if (input.greeting !== undefined) payload.greeting = input.greeting;
  if (input.previewMessage !== undefined) {
    payload.preview_message = input.previewMessage;
  }
  if (input.backstory !== undefined) payload.backstory = input.backstory;
  if (input.tags !== undefined) payload.tags = normalizeStringArray(input.tags);
  if (input.traitBadges !== undefined) payload.trait_badges = input.traitBadges;
  if (input.scenario !== undefined) payload.scenario = input.scenario;
  if (input.metadata !== undefined) payload.metadata = input.metadata;
  if (input.payload !== undefined) payload.payload = input.payload;
  if (input.builderMode !== undefined) payload.builder_mode = input.builderMode;
  if (input.styleType !== undefined) payload.style_type = input.styleType;
  if (input.consistencyStatus !== undefined) {
    payload.consistency_status = input.consistencyStatus;
  }
  if (input.promptVersion !== undefined) payload.prompt_version = input.promptVersion;

  return payload;
}

function ensurePayloadVisibility(
  payload: Json,
  visibility: CustomCharacterVisibility,
): Json {
  const base =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, Json | undefined>) }
      : {};

  base.visibility = visibility;
  return base;
}

export async function createCustomCharacter(
  input: CreateCustomCharacterInput,
): Promise<DbCustomCharacter> {
  const { data, error } = await supabase
    .from("custom_characters")
    .insert(buildCreatePayload(input))
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Failed to create custom character.");

  return mapCustomCharacterRow(data as Record<string, unknown>);
}

export async function updateCustomCharacter(
  input: UpdateCustomCharacterInput,
): Promise<DbCustomCharacter> {
  const { data, error } = await supabase
    .from("custom_characters")
    .update(buildUpdatePayload(input))
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Failed to update custom character.");

  return mapCustomCharacterRow(data as Record<string, unknown>);
}

export async function getCustomCharacterById(
  characterId: string,
  userId: string,
): Promise<DbCustomCharacter | null> {
  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("id", characterId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapCustomCharacterRow(data as Record<string, unknown>);
}

export async function getCustomCharacterBySlug(
  slug: string,
  userId: string,
): Promise<DbCustomCharacter | null> {
  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("slug", slug)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapCustomCharacterRow(data as Record<string, unknown>);
}

export async function getPublicCustomCharacterByShareSlug(
  slug: string,
): Promise<DbCustomCharacter | null> {
  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("slug", slug)
    .eq("image_visibility", "public")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapCustomCharacterRow(data as Record<string, unknown>);
}

export async function listUserCustomCharacters(
  userId: string,
): Promise<DbCustomCharacter[]> {
  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as Record<string, unknown>[]).map(mapCustomCharacterRow);
}

export async function setCustomCharacterImageLinks(
  input: SetCharacterImageLinksInput,
): Promise<DbCustomCharacter> {
  const updatePayload: Record<string, unknown> = {};

  if (input.avatarImageId !== undefined) {
    updatePayload.avatar_image_id = input.avatarImageId;
  }
  if (input.primaryReferenceImageId !== undefined) {
    updatePayload.primary_reference_image_id = input.primaryReferenceImageId;
  }
  if (input.baseGenerationId !== undefined) {
    updatePayload.base_generation_id = input.baseGenerationId;
  }
  if (input.primaryImageUrl !== undefined) {
    updatePayload.primary_image_url = input.primaryImageUrl;
  }
  if (input.imageStatus !== undefined) {
    updatePayload.image_status = input.imageStatus;
  }
  if (input.imageVisibility !== undefined) {
    updatePayload.image_visibility = input.imageVisibility;
  }
  if (input.imagePromptVersion !== undefined) {
    updatePayload.image_prompt_version = input.imagePromptVersion;
  }
  if (input.imageLastGeneratedAt !== undefined) {
    updatePayload.image_last_generated_at = input.imageLastGeneratedAt;
  }
  if (input.imageGenerationEnabled !== undefined) {
    updatePayload.image_generation_enabled = input.imageGenerationEnabled;
  }
  if (input.consistencyStatus !== undefined) {
    updatePayload.consistency_status = input.consistencyStatus;
  }

  const { data, error } = await supabase
    .from("custom_characters")
    .update(updatePayload)
    .eq("id", input.characterId)
    .eq("user_id", input.userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Failed to update character image links.");

  return mapCustomCharacterRow(data as Record<string, unknown>);
}

export async function publishCustomCharacter(
  input: PublishCustomCharacterInput,
): Promise<DbCustomCharacter> {
  const existing = await getCustomCharacterById(input.characterId, input.userId);

  if (!existing) {
    throw new Error("Custom character not found.");
  }

  const nextPayload = ensurePayloadVisibility(
    existing.payload ?? {},
    input.visibility,
  );

  const { data, error } = await supabase
    .from("custom_characters")
    .update({
      payload: input.payload
        ? ensurePayloadVisibility(input.payload, input.visibility)
        : nextPayload,
      image_visibility: input.visibility,
    })
    .eq("id", input.characterId)
    .eq("user_id", input.userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Failed to publish custom character.");

  return mapCustomCharacterRow(data as Record<string, unknown>);
}

export async function deleteCustomCharacter(
  characterId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("custom_characters")
    .delete()
    .eq("id", characterId)
    .eq("user_id", userId);

  if (error) throw error;
}
