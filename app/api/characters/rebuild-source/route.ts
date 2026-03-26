import { NextResponse } from "next/server";
import { buildLegacyRebuildSourcePayload } from "@/lib/create-character/legacy-rebuild";
import { getLegacyCharacterState } from "@/lib/legacy-character-state";
import { createClient } from "@/lib/supabase/server";

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const characterId = url.searchParams.get("id")?.trim();

  if (!characterId) {
    return jsonError("Character id is required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError("Authentication required.", 401);
  }

  const { data, error } = await supabase
    .from("custom_characters")
    .select("id, name, archetype, tags, scenario, payload, style_type")
    .eq("id", characterId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data) {
    return jsonError("Character not found.", 404);
  }

  const legacyState = getLegacyCharacterState({
    styleType: data.style_type,
    payload: data.payload,
  });

  if (!legacyState.isLegacyAnime) {
    return jsonError("Only legacy anime characters can use rebuild import.", 400);
  }

  const payload = buildLegacyRebuildSourcePayload({
    id: data.id,
    name: data.name,
    archetype: data.archetype,
    tags: Array.isArray(data.tags) ? data.tags : [],
    scenario: data.scenario,
    payload: data.payload,
  });

  return NextResponse.json({
    ok: true,
    ...payload,
  });
}
