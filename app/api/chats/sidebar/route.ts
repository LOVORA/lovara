import { NextResponse } from "next/server";

import {
  createSupabaseStorageSigner,
  resolveCharacterImageMap,
} from "@/lib/character-image-assets";
import { getCharacterBySlug } from "@/lib/characters";
import { createClient } from "@/lib/supabase/server";

type CustomConversationRow = {
  id: string;
  custom_character_id: string;
  updated_at: string | null;
};

type BuiltInConversationRow = {
  id: string;
  character_slug: string;
  updated_at: string | null;
};

type CustomCharacterRow = {
  id: string;
  slug: string;
  name: string;
  primary_image_url: string | null;
};

type CharacterImageRow = {
  character_id: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  public_url: string | null;
  is_primary?: boolean | null;
  image_type?: string | null;
  created_at?: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const [{ data: builtInRows, error: builtInError }, { data: customRows, error: customError }] =
      await Promise.all([
        supabase
          .from("conversations")
          .select("id, character_slug, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(20),
        supabase
          .from("custom_conversations")
          .select("id, custom_character_id, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);

    if (builtInError) {
      return NextResponse.json(
        { ok: false, error: builtInError.message },
        { status: 500 },
      );
    }

    if (customError) {
      return NextResponse.json(
        { ok: false, error: customError.message },
        { status: 500 },
      );
    }

    const builtInConversationRows = (builtInRows ?? []) as BuiltInConversationRow[];
    const customConversationRows = (customRows ?? []) as CustomConversationRow[];

    const customCharacterIds = Array.from(
      new Set(customConversationRows.map((row) => row.custom_character_id).filter(Boolean)),
    );

    const { data: customCharacterRowsRaw, error: customCharacterError } =
      customCharacterIds.length > 0
        ? await supabase
            .from("custom_characters")
            .select("id, slug, name, primary_image_url")
            .in("id", customCharacterIds)
        : { data: [], error: null };

    if (customCharacterError) {
      return NextResponse.json(
        { ok: false, error: customCharacterError.message },
        { status: 500 },
      );
    }

    const customCharacterRows = (customCharacterRowsRaw ?? []) as CustomCharacterRow[];
    const customCharacterMap = new Map(customCharacterRows.map((row) => [row.id, row]));

    const builtInSlugs = Array.from(
      new Set(
        builtInConversationRows
          .map((row) => row.character_slug)
          .filter((slug): slug is string => Boolean(slug) && Boolean(getCharacterBySlug(slug))),
      ),
    );

    const imageCharacterIds = customCharacterRows.map((row) => row.id);
    const { data: imageRowsRaw } =
      imageCharacterIds.length > 0
        ? await supabase
            .from("character_images")
            .select(
              "character_id, storage_bucket, storage_path, public_url, is_primary, image_type, created_at",
            )
            .eq("user_id", user.id)
            .in("character_id", imageCharacterIds)
            .order("created_at", { ascending: false })
        : { data: [] };

    const imageMap = await resolveCharacterImageMap({
      rows: (imageRowsRaw ?? []) as CharacterImageRow[],
      signUrl: createSupabaseStorageSigner(supabase as never),
      fallbackByCharacterId: new Map([
        ...customCharacterRows.map((row) => [row.id, row.primary_image_url ?? null] as const),
        ...builtInSlugs.map((slug) => [slug, getCharacterBySlug(slug)?.image ?? null] as const),
      ]),
    });

    const builtInItems = builtInConversationRows
      .filter((row) => typeof row.character_slug === "string" && row.character_slug)
      .map((row) => {
        const slug = row.character_slug;
        const character = getCharacterBySlug(slug);
        if (!character) return null;

        return {
          id: `built-in:${row.id}`,
          slug,
          name: character.name,
          avatarUrl: imageMap.get(slug) ?? character.image ?? null,
          chatHref: `/chat/${slug}`,
          kind: "built-in" as const,
          updatedAt: row.updated_at ?? "",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const customItems = customConversationRows
      .map((row) => {
        const character = customCharacterMap.get(row.custom_character_id);
        if (!character?.slug) return null;

        return {
          id: `custom:${row.id}`,
          slug: character.slug,
          name: character.name,
          avatarUrl: imageMap.get(character.id) ?? character.primary_image_url ?? null,
          chatHref: `/chat/custom/${character.slug}`,
          kind: "custom" as const,
          updatedAt: row.updated_at ?? "",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const items = [...customItems, ...builtInItems]
      .sort((left, right) => {
        const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
        const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
        return rightTime - leftTime;
      })
      .slice(0, 20);

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load chats sidebar.",
      },
      { status: 500 },
    );
  }
}
