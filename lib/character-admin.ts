import type { SupabaseClient } from "@supabase/supabase-js";
import type { Character } from "@/lib/characters";
import { characters, getCharacterBySlug } from "@/lib/characters";
import type { Database, Json } from "@/types/supabase";

type AnySupabase = Pick<SupabaseClient<Database>, "from">;
type BuiltInOverrideRow =
  Database["public"]["Tables"]["built_in_character_overrides"]["Row"];
type CustomCharacterRow = Database["public"]["Tables"]["custom_characters"]["Row"];

export type CharacterSurfaceVisibility = {
  showInProfessionalList: boolean;
  showInCommunityList: boolean;
  chatEnabled: boolean;
  showInChatsSidebar: boolean;
  showInPhotoStudio: boolean;
};

export type ManagedBuiltInCharacter = Character & {
  adminVisibility: CharacterSurfaceVisibility;
  adminSortOrder: number;
  adminOverride: BuiltInOverrideRow | null;
};

export type AdminEditableCustomCharacter = Pick<
  CustomCharacterRow,
  | "id"
  | "slug"
  | "name"
  | "archetype"
  | "headline"
  | "description"
  | "payload"
  | "updated_at"
  | "user_id"
>;

type AdminVisibilityInput = Partial<CharacterSurfaceVisibility>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function getCustomCharacterVisibility(
  payload: unknown,
): CharacterSurfaceVisibility {
  const record = toRecord(payload);
  const visibility = typeof record.visibility === "string" ? record.visibility : "";
  const adminVisibility = toRecord(record.adminVisibility);

  return {
    showInProfessionalList: false,
    showInCommunityList:
      visibility === "public" && adminVisibility.showInCommunityList !== false,
    chatEnabled: adminVisibility.chatEnabled !== false,
    showInChatsSidebar: adminVisibility.showInChatsSidebar !== false,
    showInPhotoStudio: adminVisibility.showInPhotoStudio !== false,
  };
}

export function mergeCustomCharacterAdminPayload(args: {
  payload: Json | null;
  visibility?: "public" | "private";
  surfaceVisibility: AdminVisibilityInput;
  publicShareId?: string;
  publicTagline?: string;
  publicTeaser?: string;
}): Json {
  const payload = toRecord(args.payload);
  const adminVisibility = toRecord(payload.adminVisibility);
  const fallbackShareId =
    typeof payload.publicShareId === "string" ? payload.publicShareId : "";
  const fallbackTagline =
    typeof payload.publicTagline === "string" ? payload.publicTagline : "";
  const fallbackTeaser =
    typeof payload.publicTeaser === "string" ? payload.publicTeaser : "";

  const nextAdminVisibility = {
    ...adminVisibility,
    ...args.surfaceVisibility,
  };

  return {
    ...payload,
    visibility: args.visibility ?? (payload.visibility === "public" ? "public" : "private"),
    adminVisibility: nextAdminVisibility,
    publicShareId: args.publicShareId ?? fallbackShareId,
    publicTagline: args.publicTagline ?? fallbackTagline,
    publicTeaser: args.publicTeaser ?? fallbackTeaser,
  } satisfies Record<string, Json>;
}

function applyBuiltInOverride(
  character: Character,
  override: BuiltInOverrideRow | null,
  index: number,
): ManagedBuiltInCharacter {
  const visibility: CharacterSurfaceVisibility = {
    showInProfessionalList: override?.is_listed_in_professional ?? true,
    showInCommunityList: false,
    chatEnabled: override?.is_chat_enabled ?? true,
    showInChatsSidebar: override?.is_visible_in_sidebar ?? true,
    showInPhotoStudio: override?.is_visible_in_photo_studio ?? true,
  };

  return {
    ...character,
    role: override?.role_label?.trim() || character.role,
    headline: override?.headline?.trim() || character.headline,
    description: override?.description?.trim() || character.description,
    adminVisibility: visibility,
    adminSortOrder: typeof override?.sort_order === "number" ? override.sort_order : index,
    adminOverride: override,
  };
}

export async function listBuiltInCharacterOverrides(client: AnySupabase) {
  const { data, error } = await client
    .from("built_in_character_overrides")
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BuiltInOverrideRow[];
}

export async function listManagedBuiltInCharacters(client: AnySupabase) {
  const overrides = await listBuiltInCharacterOverrides(client);
  const overrideMap = new Map(overrides.map((item) => [item.character_slug, item]));

  return characters
    .map((character, index) =>
      applyBuiltInOverride(character, overrideMap.get(character.slug) ?? null, index),
    )
    .sort((left, right) => left.adminSortOrder - right.adminSortOrder);
}

export async function getManagedBuiltInCharacterBySlug(
  client: AnySupabase,
  slug: string,
) {
  const baseCharacter = getCharacterBySlug(slug);
  if (!baseCharacter) return null;

  const { data, error } = await client
    .from("built_in_character_overrides")
    .select("*")
    .eq("character_slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const index = characters.findIndex((item) => item.slug === slug);
  return applyBuiltInOverride(baseCharacter, (data as BuiltInOverrideRow | null) ?? null, index);
}

export async function listAdminCommunityCharacters(client: AnySupabase, limit = 80) {
  const { data, error } = await client
    .from("custom_characters")
    .select("id, slug, name, archetype, headline, description, payload, updated_at, user_id")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdminEditableCustomCharacter[];
}

export async function getAdminCommunityCharacterById(
  client: AnySupabase,
  id: string,
) {
  const { data, error } = await client
    .from("custom_characters")
    .select("id, slug, name, archetype, headline, description, payload, updated_at, user_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AdminEditableCustomCharacter | null) ?? null;
}
