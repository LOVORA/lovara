import { supabase } from "@/lib/supabase";
import type { CharacterPromptProfileInsert } from "../character-builder/types";

export type DbCharacterPromptProfile = {
  id: string;
  character_id: string;
  raw_user_prompt: string | null;
  canonical_prompt: string;
  negative_prompt: string;
  prompt_summary: string | null;
  prompt_version: string | null;
  model_preference: string | null;
  provider_preference: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsertCharacterPromptProfileInput = {
  characterId: string;
  profile: CharacterPromptProfileInsert;
};

function mapPromptProfileRow(
  row: Record<string, unknown>,
): DbCharacterPromptProfile {
  return {
    id: String(row.id ?? ""),
    character_id: String(row.character_id ?? ""),
    raw_user_prompt:
      typeof row.raw_user_prompt === "string" ? row.raw_user_prompt : null,
    canonical_prompt: String(row.canonical_prompt ?? ""),
    negative_prompt: String(row.negative_prompt ?? ""),
    prompt_summary:
      typeof row.prompt_summary === "string" ? row.prompt_summary : null,
    prompt_version:
      typeof row.prompt_version === "string" ? row.prompt_version : null,
    model_preference:
      typeof row.model_preference === "string" ? row.model_preference : null,
    provider_preference:
      typeof row.provider_preference === "string"
        ? row.provider_preference
        : null,
    is_locked: typeof row.is_locked === "boolean" ? row.is_locked : false,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function buildUpsertPayload(input: UpsertCharacterPromptProfileInput) {
  return {
    character_id: input.characterId,
    raw_user_prompt: input.profile.raw_user_prompt,
    canonical_prompt: input.profile.canonical_prompt,
    negative_prompt: input.profile.negative_prompt,
    prompt_summary: input.profile.prompt_summary,
    prompt_version: input.profile.prompt_version,
    model_preference: input.profile.model_preference,
    provider_preference: input.profile.provider_preference,
    is_locked: input.profile.is_locked,
  };
}

export async function upsertCharacterPromptProfile(
  input: UpsertCharacterPromptProfileInput,
): Promise<DbCharacterPromptProfile> {
  const payload = buildUpsertPayload(input);

  const { data, error } = await supabase
    .from("character_prompt_profiles")
    .upsert(payload as never, {
      onConflict: "character_id",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to upsert character prompt profile.");
  }

  return mapPromptProfileRow(data as unknown as Record<string, unknown>);
}

export async function getCharacterPromptProfile(
  characterId: string,
): Promise<DbCharacterPromptProfile | null> {
  const { data, error } = await supabase
    .from("character_prompt_profiles")
    .select("*")
    .eq("character_id", characterId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPromptProfileRow(data as unknown as Record<string, unknown>);
}

export async function deleteCharacterPromptProfile(
  characterId: string,
): Promise<void> {
  const { error } = await supabase
    .from("character_prompt_profiles")
    .delete()
    .eq("character_id", characterId);

  if (error) {
    throw error;
  }
}
