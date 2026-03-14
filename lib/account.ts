"use client";

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/types/supabase";

export type CharacterScenario = {
  setting?: string;
  relationshipToUser?: string;
  sceneGoal?: string;
  tone?: string;
  openingState?: string;
};

type CustomCharacterRow = Database["public"]["Tables"]["custom_characters"]["Row"];
type CustomCharacterInsert = Database["public"]["Tables"]["custom_characters"]["Insert"];
type CustomCharacterUpdate = Database["public"]["Tables"]["custom_characters"]["Update"];

export type DbProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

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
  trait_badges: Array<{ label: string; tone?: string }>;
  scenario: CharacterScenario;
  metadata: Record<string, unknown>;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DbCustomConversation = {
  id: string;
  user_id: string;
  custom_character_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type DbCustomMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type CharacterDraftInput = {
  name: string;
  archetype: string;
  headline: string;
  description: string;
  greeting: string;
  previewMessage: string;
  backstory: string;
  tags: string[];
  traitBadges: Array<{ label: string; tone?: string }>;
  scenario: CharacterScenario;
  payload?: Record<string, unknown>;
};

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

function cleanOptional(value?: string | null): string | undefined {
  const trimmed = clean(value);
  return trimmed ? trimmed : undefined;
}

function slugify(value?: string | null): string {
  return (value ?? "")
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => clean(tag))
        .filter(Boolean)
        .slice(0, 16)
    )
  );
}

function normalizeScenario(scenario?: CharacterScenario): CharacterScenario {
  return {
    setting: cleanOptional(scenario?.setting),
    relationshipToUser: cleanOptional(scenario?.relationshipToUser),
    sceneGoal: cleanOptional(scenario?.sceneGoal),
    tone: cleanOptional(scenario?.tone),
    openingState: cleanOptional(scenario?.openingState),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJson(value: unknown): Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJson(item));
  }

  if (isPlainObject(value)) {
    const result: { [key: string]: Json } = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = toJson(nestedValue);
    }

    return result;
  }

  return String(value);
}

function toRecord(value: Json | null | undefined): Record<string, unknown> {
  if (isPlainObject(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toScenario(value: Json | null | undefined): CharacterScenario {
  if (!isPlainObject(value)) {
    return {};
  }

  return {
    setting: typeof value.setting === "string" ? value.setting : undefined,
    relationshipToUser:
      typeof value.relationshipToUser === "string"
        ? value.relationshipToUser
        : undefined,
    sceneGoal: typeof value.sceneGoal === "string" ? value.sceneGoal : undefined,
    tone: typeof value.tone === "string" ? value.tone : undefined,
    openingState:
      typeof value.openingState === "string" ? value.openingState : undefined,
  };
}

function toTraitBadges(
  value: Json | null | undefined
): Array<{ label: string; tone?: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isPlainObject(item)) return null;

      const label = typeof item.label === "string" ? item.label.trim() : "";
      const tone = typeof item.tone === "string" ? item.tone.trim() : undefined;

      if (!label) return null;

      return tone ? { label, tone } : { label };
    })
    .filter(
      (item): item is { label: string; tone?: string } => item !== null
    );
}

function mapCharacterRow(row: CustomCharacterRow): DbCustomCharacter {
  return {
    id: row.id,
    user_id: row.user_id,
    slug: row.slug,
    name: row.name,
    archetype: row.archetype,
    headline: row.headline,
    description: row.description,
    greeting: row.greeting,
    preview_message: row.preview_message,
    backstory: row.backstory,
    tags: Array.isArray(row.tags) ? row.tags : [],
    trait_badges: toTraitBadges(row.trait_badges),
    scenario: toScenario(row.scenario),
    metadata: toRecord(row.metadata),
    payload: toRecord(row.payload),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function requireUser(): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  return user;
}

export async function ensureProfile(user?: User): Promise<DbProfile> {
  const authUser = user ?? (await requireUser());

  const payload = {
    id: authUser.id,
    email: authUser.email ?? null,
    display_name:
      typeof authUser.user_metadata?.display_name === "string"
        ? authUser.user_metadata.display_name
        : null,
    avatar_url: null,
  };

  const { error: upsertError } = await supabase.from("profiles").upsert(payload);

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not load profile.");
  }

  return data as DbProfile;
}

export async function getProfileSummary() {
  const user = await requireUser();
  const profile = await ensureProfile(user);

  const { count: characterCount, error: characterCountError } = await supabase
    .from("custom_characters")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (characterCountError) {
    throw new Error(characterCountError.message);
  }

  const { count: conversationCount, error: conversationCountError } = await supabase
    .from("custom_conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (conversationCountError) {
    throw new Error(conversationCountError.message);
  }

  return {
    user,
    profile,
    characterCount: characterCount ?? 0,
    conversationCount: conversationCount ?? 0,
  };
}

export async function updateDisplayName(displayName: string): Promise<DbProfile> {
  const user = await requireUser();
  const value = clean(displayName);

  const { error: authError } = await supabase.auth.updateUser({
    data: { display_name: value },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: value })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return ensureProfile(user);
}

export async function updatePassword(nextPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: nextPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function makeUniqueSlug(userId: string, baseValue: string): Promise<string> {
  const baseSlug = slugify(baseValue) || "custom-character";

  const { data, error } = await supabase
    .from("custom_characters")
    .select("slug")
    .eq("user_id", userId)
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    throw new Error(error.message);
  }

  const existing = new Set((data ?? []).map((row) => row.slug));

  if (!existing.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (existing.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}

export async function listMyCustomCharacters(): Promise<DbCustomCharacter[]> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as CustomCharacterRow[]).map(mapCharacterRow);
}

export async function getMyCustomCharacterBySlug(
  slug: string
): Promise<DbCustomCharacter | null> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("user_id", user.id)
    .eq("slug", slugify(slug))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapCharacterRow(data as CustomCharacterRow) : null;
}

export async function createMyCustomCharacter(
  input: CharacterDraftInput
): Promise<DbCustomCharacter> {
  const user = await requireUser();
  const slug = await makeUniqueSlug(user.id, input.name);

  const payload: CustomCharacterInsert = {
    user_id: user.id,
    slug,
    name: clean(input.name),
    archetype: clean(input.archetype) || "custom",
    headline: clean(input.headline),
    description: clean(input.description),
    greeting: clean(input.greeting),
    preview_message: clean(input.previewMessage),
    backstory: clean(input.backstory),
    tags: normalizeTags(input.tags),
    trait_badges: toJson(input.traitBadges.slice(0, 8)),
    scenario: toJson(normalizeScenario(input.scenario)),
    metadata: toJson({
      source: "supabase",
      version: 1,
      createdBy: "lovora-web",
      updatedAt: new Date().toISOString(),
    }),
    payload: toJson(input.payload ?? {}),
  };

  const { data, error } = await supabase
    .from("custom_characters")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not create character.");
  }

  return mapCharacterRow(data as CustomCharacterRow);
}

export async function updateMyCustomCharacter(
  id: string,
  input: CharacterDraftInput
): Promise<DbCustomCharacter> {
  const user = await requireUser();

  const { data: currentData, error: currentError } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const current = (currentData as CustomCharacterRow | null) ?? null;

  if (currentError || !current) {
    throw new Error(currentError?.message || "Character not found.");
  }

  let nextSlug = current.slug;
  const proposedBaseSlug = slugify(input.name) || "custom-character";

  if (proposedBaseSlug !== current.slug) {
    nextSlug = await makeUniqueSlug(user.id, input.name);
  }

  const currentMetadata =
    isPlainObject(current.metadata) ? current.metadata : {};

  const updatePayload: CustomCharacterUpdate = {
    slug: nextSlug,
    name: clean(input.name),
    archetype: clean(input.archetype) || "custom",
    headline: clean(input.headline),
    description: clean(input.description),
    greeting: clean(input.greeting),
    preview_message: clean(input.previewMessage),
    backstory: clean(input.backstory),
    tags: normalizeTags(input.tags),
    trait_badges: toJson(input.traitBadges.slice(0, 8)),
    scenario: toJson(normalizeScenario(input.scenario)),
    metadata: toJson({
      ...currentMetadata,
      source: "supabase",
      version: 1,
      updatedAt: new Date().toISOString(),
    }),
    payload: toJson(input.payload ?? current.payload ?? {}),
  };

  const { data, error } = await supabase
    .from("custom_characters")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not update character.");
  }

  return mapCharacterRow(data as CustomCharacterRow);
}

export async function deleteMyCustomCharacter(id: string): Promise<void> {
  const user = await requireUser();

  const { error } = await supabase
    .from("custom_characters")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getOrCreateConversationForCharacter(
  character: Pick<DbCustomCharacter, "id" | "name">,
): Promise<DbCustomConversation> {
  const user = await requireUser();

  const { data: existing, error: existingError } = await supabase
    .from("custom_conversations")
    .select("*")
    .eq("user_id", user.id)
    .eq("custom_character_id", character.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing as DbCustomConversation;
  }

  const { error: upsertError } = await supabase
    .from("custom_conversations")
    .upsert(
      {
        user_id: user.id,
        custom_character_id: character.id,
        title: clean(character.name) || "Custom character",
      },
      {
        onConflict: "user_id,custom_character_id",
      },
    );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const { data: finalRow, error: finalRowError } = await supabase
    .from("custom_conversations")
    .select("*")
    .eq("user_id", user.id)
    .eq("custom_character_id", character.id)
    .single();

  if (finalRowError || !finalRow) {
    throw new Error(finalRowError?.message || "Could not load conversation.");
  }

  return finalRow as DbCustomConversation;
}

export async function listConversationMessages(
  conversationId: string
): Promise<DbCustomMessage[]> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from("custom_messages")
    .select("*")
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DbCustomMessage[];
}

export async function insertConversationMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<DbCustomMessage> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from("custom_messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role,
      content: clean(content),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not save message.");
  }

  return data as DbCustomMessage;
}

export async function ensureGreetingMessage(
  conversationId: string,
  greeting: string
): Promise<DbCustomMessage[]> {
  const existing = await listConversationMessages(conversationId);

  if (existing.length > 0) {
    return existing;
  }

  await insertConversationMessage(conversationId, "assistant", greeting);
  return listConversationMessages(conversationId);
}

export async function resetConversation(
  conversationId: string,
  greeting: string
): Promise<DbCustomMessage[]> {
  const user = await requireUser();

  const { error: deleteError } = await supabase
    .from("custom_messages")
    .delete()
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await insertConversationMessage(conversationId, "assistant", greeting);
  return listConversationMessages(conversationId);
}
