import { NextResponse } from "next/server";
import { getAdminRouteAccess } from "@/lib/admin-auth";
import {
  getAdminCommunityCharacterById,
  mergeCustomCharacterAdminPayload,
} from "@/lib/character-admin";
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

    const params = (await context.params) as { id?: string };
    const id = typeof params.id === "string" ? params.id : "";
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Character not found." },
        { status: 404 },
      );
    }
    const admin = createAdminClient();
    const existing = await getAdminCommunityCharacterById(admin as never, id);

    if (!existing) {
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

    const visibility =
      raw.visibility === "public" ? "public" : ("private" as "public" | "private");

    const payload = mergeCustomCharacterAdminPayload({
      payload: existing.payload,
      visibility,
      publicShareId: clean(
        typeof raw.publicShareId === "string" ? raw.publicShareId : "",
      ),
      publicTagline: clean(
        typeof raw.publicTagline === "string" ? raw.publicTagline : "",
      ),
      publicTeaser: clean(
        typeof raw.publicTeaser === "string" ? raw.publicTeaser : "",
      ),
      surfaceVisibility: {
        showInProfessionalList: false,
        showInCommunityList: raw.showInCommunityList !== false,
        chatEnabled: raw.chatEnabled !== false,
        showInChatsSidebar: raw.showInChatsSidebar !== false,
        showInPhotoStudio: raw.showInPhotoStudio !== false,
      },
    });

    const { error } = await admin
      .from("custom_characters")
      .update({
        name: clean(typeof raw.name === "string" ? raw.name : existing.name),
        archetype: clean(
          typeof raw.archetype === "string" ? raw.archetype : existing.archetype,
        ),
        headline: clean(
          typeof raw.headline === "string" ? raw.headline : existing.headline,
        ),
        description: clean(
          typeof raw.description === "string" ? raw.description : existing.description,
        ),
        payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

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
