import { NextResponse } from "next/server";
import { getAdminRouteAccess } from "@/lib/admin-auth";
import { getCharacterBySlug } from "@/lib/characters";
import { createAdminClient } from "@/lib/supabase-admin";

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

export async function POST(
  request: Request,
  context: { params: Promise<unknown> },
) {
  try {
    const access = await getAdminRouteAccess();
    if (!access) {
      return NextResponse.json(
        { ok: false, error: "Admin access required." },
        { status: 403 },
      );
    }

    const params = (await context.params) as { slug?: string };
    const slug = typeof params.slug === "string" ? params.slug : "";
    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Character not found." },
        { status: 404 },
      );
    }
    if (!getCharacterBySlug(slug)) {
      return NextResponse.json(
        { ok: false, error: "Character not found." },
        { status: 404 },
      );
    }

    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const sortOrder =
      typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? raw.sortOrder
        : null;

    const payload = {
      character_slug: slug,
      role_label: clean(typeof raw.roleLabel === "string" ? raw.roleLabel : ""),
      headline: clean(typeof raw.headline === "string" ? raw.headline : ""),
      description: clean(typeof raw.description === "string" ? raw.description : ""),
      is_listed_in_professional: raw.showInProfessionalList !== false,
      is_chat_enabled: raw.chatEnabled !== false,
      is_visible_in_sidebar: raw.showInChatsSidebar !== false,
      is_visible_in_photo_studio: raw.showInPhotoStudio !== false,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("built_in_character_overrides")
      .upsert(payload, { onConflict: "character_slug" });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not update character.",
      },
      { status: 500 },
    );
  }
}
