import { NextResponse } from "next/server";

import { deleteCharacterImage, getCharacterImageById } from "@/lib/character-repository/images";
import { createClient } from "@/lib/supabase/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    if (!isRecord(raw)) {
      return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }

    const imageId = typeof raw.imageId === "string" ? raw.imageId.trim() : "";
    const characterId =
      typeof raw.characterId === "string" ? raw.characterId.trim() : "";

    if (!imageId || !characterId) {
      return NextResponse.json(
        { ok: false, error: "imageId and characterId are required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    const image = await getCharacterImageById(imageId);

    if (!image || image.user_id !== user.id || image.character_id !== characterId) {
      return NextResponse.json({ ok: false, error: "Image not found." }, { status: 404 });
    }

    if (image.image_type === "avatar" || image.is_primary) {
      return NextResponse.json(
        { ok: false, error: "Primary avatar images cannot be deleted from this action." },
        { status: 400 },
      );
    }

    await deleteCharacterImage(imageId);

    return NextResponse.json({ ok: true, imageId, characterId });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not delete the image.",
      },
      { status: 500 },
    );
  }
}
