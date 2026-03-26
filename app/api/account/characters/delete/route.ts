import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  removeSavedCharacterFromAccountServer,
  type SavedCharacterSource,
} from "@/lib/server/custom-character-ownership";

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function isSavedCharacterSource(value: string): value is SavedCharacterSource {
  return value === "custom" || value === "community" || value === "professional";
}

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const source = clean(typeof raw?.source === "string" ? raw.source : "");
    const characterId = clean(
      typeof raw?.characterId === "string" ? raw.characterId : "",
    );
    const slug = clean(typeof raw?.slug === "string" ? raw.slug : "");

    if (!isSavedCharacterSource(source) || !characterId || !slug) {
      return NextResponse.json(
        { ok: false, error: "Source, characterId, and slug are required." },
        { status: 400 },
      );
    }

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

    await removeSavedCharacterFromAccountServer({
      supabase: supabase as never,
      userId: user.id,
      source,
      characterId,
      slug,
    });

    revalidatePath("/my-characters");
    revalidatePath(`/my-characters/${slug}`);
    revalidatePath(`/chat/custom/${slug}`);
    revalidatePath(`/chat/${slug}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not delete character.",
      },
      { status: 500 },
    );
  }
}
