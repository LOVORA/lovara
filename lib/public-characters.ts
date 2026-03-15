import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/supabase";

type CustomCharacterRow = Database["public"]["Tables"]["custom_characters"]["Row"];

export type PublicCustomCharacter = {
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
  scenario: {
    setting?: string;
    relationshipToUser?: string;
    sceneGoal?: string;
    tone?: string;
    openingState?: string;
  };
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function toScenario(value: unknown) {
  if (!isPlainObject(value)) return {};

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

function mapPublicCharacter(row: CustomCharacterRow): PublicCustomCharacter {
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
    scenario: toScenario(row.scenario),
    payload: toRecord(row.payload),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listPublicCustomCharacters(): Promise<PublicCustomCharacter[]> {
  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("payload->>visibility", "public")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as CustomCharacterRow[]).map(mapPublicCharacter);
}

export async function getPublicCustomCharacterByShareId(
  shareId: string,
): Promise<PublicCustomCharacter | null> {
  const trimmed = shareId.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("payload->>visibility", "public")
    .eq("payload->>publicShareId", trimmed)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapPublicCharacter(data as CustomCharacterRow) : null;
}
