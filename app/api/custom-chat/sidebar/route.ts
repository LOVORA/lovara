import { NextResponse } from "next/server";

import {
  createSupabaseStorageSigner,
  resolveCharacterImageMap,
} from "@/lib/character-image-assets";
import { createClient } from "@/lib/supabase/server";

function truncate(value: string | undefined, max = 88) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}...` : value;
}

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

    const { data: conversations, error: conversationsError } = await supabase
      .from("custom_conversations")
      .select("id, custom_character_id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(14);

    if (conversationsError) {
      return NextResponse.json(
        { ok: false, error: conversationsError.message },
        { status: 500 },
      );
    }

    const conversationRows = conversations ?? [];
    const characterIds = conversationRows
      .map((item) => item.custom_character_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    const conversationIds = conversationRows
      .map((item) => item.id)
      .filter((value): value is string => typeof value === "string" && value.length > 0);

    const [{ data: characters }, { data: messages }, { data: publicSamples }] =
      await Promise.all([
        characterIds.length > 0
          ? supabase
              .from("custom_characters")
              .select("id, slug, name, primary_image_url")
              .eq("user_id", user.id)
              .in("id", characterIds)
          : Promise.resolve({ data: [], error: null }),
        conversationIds.length > 0
          ? supabase
              .from("custom_messages")
              .select("conversation_id, content, created_at")
              .eq("user_id", user.id)
              .in("conversation_id", conversationIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("custom_characters")
          .select("id, slug, name, headline, description, payload, primary_image_url")
          .eq("payload->>visibility", "public")
          .order("updated_at", { ascending: false })
          .limit(4),
      ]);

    const allImageCharacterIds = Array.from(
      new Set([
        ...characterIds,
        ...(publicSamples ?? [])
          .map((item) => item.id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ]),
    );

    const { data: imageRows } =
      allImageCharacterIds.length > 0
        ? await supabase
            .from("character_images")
            .select(
              "character_id, storage_bucket, storage_path, public_url, is_primary, image_type, created_at",
            )
            .in("character_id", allImageCharacterIds)
            .order("created_at", { ascending: false })
        : { data: [] };

    const fallbackByCharacterId = new Map<string, string | null>([
      ...((characters ?? []).map((item) => [
        item.id,
        typeof item.primary_image_url === "string" ? item.primary_image_url : null,
      ]) as Array<[string, string | null]>),
      ...((publicSamples ?? []).map((item) => [
        item.id,
        typeof item.primary_image_url === "string" ? item.primary_image_url : null,
      ]) as Array<[string, string | null]>),
    ]);

    const imageMap = await resolveCharacterImageMap({
      rows:
        (imageRows ?? []) as Array<{
          character_id: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          public_url: string | null;
          is_primary?: boolean | null;
          image_type?: string | null;
          created_at?: string | null;
        }>,
      signUrl: createSupabaseStorageSigner(supabase as never),
      fallbackByCharacterId,
    });

    const characterMap = new Map(
      (characters ?? []).map((item) => [
        item.id,
        {
          slug: typeof item.slug === "string" ? item.slug : "",
          name: typeof item.name === "string" ? item.name : "Character",
          imageUrl: imageMap.get(item.id) ?? null,
        },
      ]),
    );

    const lastMessageMap = new Map<string, { content: string; createdAt: string }>();
    for (const item of messages ?? []) {
      if (lastMessageMap.has(item.conversation_id)) continue;
      lastMessageMap.set(item.conversation_id, {
        content: typeof item.content === "string" ? item.content : "",
        createdAt: typeof item.created_at === "string" ? item.created_at : "",
      });
    }

    return NextResponse.json({
      ok: true,
      sidebarChats: conversationRows.map((item) => {
        const match = characterMap.get(item.custom_character_id);
        const lastMessage = lastMessageMap.get(item.id);

        return {
          id: item.id,
          slug: match?.slug || "",
          name: match?.name || (typeof item.title === "string" ? item.title : "Character"),
          title: typeof item.title === "string" ? item.title : match?.name || "Character",
          lastMessage: truncate(lastMessage?.content || "No messages yet.", 72),
          updatedAt:
            lastMessage?.createdAt ||
            (typeof item.updated_at === "string" ? item.updated_at : ""),
          imageUrl: match?.imageUrl ?? null,
        };
      }),
      publicSamples: (publicSamples ?? []).map((item) => ({
        id: item.id,
        slug: typeof item.slug === "string" ? item.slug : "",
        name: typeof item.name === "string" ? item.name : "Character",
        summary: truncate(
          (typeof item.headline === "string" && item.headline) ||
            (typeof item.description === "string" && item.description) ||
            "Open the public card to see the full vibe.",
          82,
        ),
        imageUrl: imageMap.get(item.id) ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not load custom chat sidebar.",
      },
      { status: 500 },
    );
  }
}
