import { NextResponse } from "next/server";

import { listCharacterImagesWithClient, updateCharacterImageWithClient } from "@/lib/character-repository/images";
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
    const action =
      raw.action === "like_reference" || raw.action === "reject_result"
        ? raw.action
        : null;

    if (!imageId || !characterId || !action) {
      return NextResponse.json(
        { ok: false, error: "imageId, characterId, and action are required." },
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

    const images = await listCharacterImagesWithClient(supabase as never, characterId);
    const image = images.find((item) => item.id === imageId);

    if (!image || image.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Image not found." }, { status: 404 });
    }

    const nextReferenceRank =
      images
        .filter((item) => item.is_liked_reference)
        .reduce((max, item) => Math.max(max, item.reference_rank ?? 0), 0) + 1;

    const updated = await updateCharacterImageWithClient(supabase as never, {
      imageId,
      patch:
        action === "like_reference"
          ? {
              is_reference: true,
              is_liked_reference: true,
              feedback_type: "like_reference",
              reference_rank: nextReferenceRank,
            }
          : {
              feedback_type: "reject_result",
            },
    });

    return NextResponse.json({
      ok: true,
      imageId: updated.id,
      characterId,
      action,
      isReference: updated.is_reference,
      isLikedReference: updated.is_liked_reference,
      referenceRank: updated.reference_rank,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not update reference memory.",
      },
      { status: 500 },
    );
  }
}
