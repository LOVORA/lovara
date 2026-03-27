import { NextResponse } from "next/server";

import { buildMonetizationSnapshot } from "@/lib/monetization";
import {
  buildMessageLimitPayload,
  countMonthlyUserMessages,
  hasReachedMonthlyMessageLimit,
} from "@/lib/monetization-usage";
import { getCustomCharacterVisibility } from "@/lib/character-admin";
import { createClient } from "@/lib/supabase/server";

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

async function requireOwnedConversation(
  conversationId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase
    .from("custom_conversations")
    .select("id, user_id, custom_character_id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Conversation not found for the current account.");
  }

  return data;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const conversationId = clean(url.searchParams.get("conversationId"));

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: "conversationId is required." },
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

    await requireOwnedConversation(conversationId, user.id, supabase);

    const { data, error } = await supabase
      .from("custom_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      messages: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not load messages.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const conversationId =
      typeof raw?.conversationId === "string" ? clean(raw.conversationId) : "";
    const role =
      raw?.role === "assistant" ? "assistant" : raw?.role === "user" ? "user" : null;
    const content = typeof raw?.content === "string" ? clean(raw.content) : "";

    if (!conversationId || !role || !content) {
      return NextResponse.json(
        { ok: false, error: "conversationId, role, and content are required." },
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

    const conversation = await requireOwnedConversation(conversationId, user.id, supabase);

    if (typeof conversation.custom_character_id === "string" && conversation.custom_character_id) {
      const { data: characterRow, error: characterError } = await supabase
        .from("custom_characters")
        .select("payload")
        .eq("id", conversation.custom_character_id)
        .maybeSingle();

      if (characterError) {
        return NextResponse.json(
          { ok: false, error: characterError.message },
          { status: 500 },
        );
      }

      if (!characterRow || !getCustomCharacterVisibility(characterRow.payload).chatEnabled) {
        return NextResponse.json(
          { ok: false, error: "Character not available for chat." },
          { status: 404 },
        );
      }
    }

    if (role === "user") {
      const messagesThisMonth = await countMonthlyUserMessages({
        client: supabase as never,
        userId: user.id,
      });
      const monetization = buildMonetizationSnapshot({
        user,
        usage: {
          characterCount: 0,
          conversationCount: 0,
          publicCharacterCount: 0,
          rerollsThisMonth: 0,
          messagesThisMonth,
        },
      });

      if (hasReachedMonthlyMessageLimit(monetization)) {
        return NextResponse.json(buildMessageLimitPayload(monetization), {
          status: 403,
        });
      }
    }

    const { data, error } = await supabase
      .from("custom_messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role,
        content,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Could not save message." },
        { status: 500 },
      );
    }

    await supabase
      .from("custom_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      message: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not save message.",
      },
      { status: 500 },
    );
  }
}
