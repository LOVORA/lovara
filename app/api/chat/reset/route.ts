import { NextResponse } from "next/server";

import { getManagedBuiltInCharacterBySlug } from "@/lib/character-admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildRecognitionAwareGreeting,
  buildUserRecognitionContract,
  ensureUserRecognitionMemory,
  getProfileDisplayName,
} from "@/lib/user-recognition";
import { generateScenarioOpeningPack } from "@/lib/chat/scenario-generation";

function clean(value?: string | null) {
  return (value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const conversationId =
      typeof raw?.conversationId === "string" ? clean(raw.conversationId) : "";
    const slug = typeof raw?.slug === "string" ? clean(raw.slug) : "";

    if (!conversationId || !slug) {
      return NextResponse.json(
        { ok: false, error: "conversationId and slug are required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const character = await getManagedBuiltInCharacterBySlug(supabase as never, slug);
    if (!character || !character.adminVisibility.chatEnabled) {
      return NextResponse.json({ ok: false, error: "Character not found." }, { status: 404 });
    }
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

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id, character_slug")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (conversationError) {
      return NextResponse.json(
        { ok: false, error: conversationError.message },
        { status: 500 },
      );
    }

    if (!conversation || clean(conversation.character_slug) !== slug) {
      return NextResponse.json(
        { ok: false, error: "Conversation not found for the current account." },
        { status: 404 },
      );
    }

    const { error: deleteMessagesError } = await supabase
      .from("messages")
      .delete()
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId);

    if (deleteMessagesError) {
      return NextResponse.json(
        { ok: false, error: deleteMessagesError.message },
        { status: 500 },
      );
    }

    const { error: deleteMemoryError } = await supabase
      .from("conversation_memory_state")
      .delete()
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId);

    if (deleteMemoryError) {
      return NextResponse.json(
        { ok: false, error: deleteMemoryError.message },
        { status: 500 },
      );
    }

    const relationshipToUser = clean(character.scenario?.relationshipToUser) || clean(character.role);
    const openingState = clean(character.scenario?.openingState);
    const profileDisplayName = await getProfileDisplayName(supabase as never, user.id);
    const recognitionMemory = await ensureUserRecognitionMemory({
      supabase: supabase as never,
      userId: user.id,
      scope: { builtInCharacterSlug: slug },
      relationshipToUser,
      openingState,
      userRole: clean(character.role),
      profileDisplayName,
    });
    const recognitionContract = buildUserRecognitionContract({
      memory: recognitionMemory,
      profileDisplayName,
      relationshipToUser,
      openingState,
      userRole: clean(character.role),
    });

    let openingGreeting = clean(character.greeting);
    const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();

    if (openRouterApiKey) {
      try {
        const generatedOpening = await generateScenarioOpeningPack({
          apiKey: openRouterApiKey,
          characterName: clean(character.name),
          archetype: clean(character.archetype),
          role: clean(character.role),
          description: clean(character.description),
          personality: clean(character.personality),
          backstory: clean(character.backstory),
          setting: clean(character.scenario?.setting),
          relationshipToUser,
          sceneGoal: clean(character.scenario?.sceneGoal),
          tone: clean(character.scenario?.tone),
          openingState,
          userRole: clean(character.role),
          tags: Array.isArray(character.tags)
            ? character.tags.map((tag) =>
                typeof tag === "string" ? tag : clean(tag.label),
              )
            : [],
          visualHints: [
            clean(character.visualProfile?.visualAura),
            clean(character.visualProfile?.eyes),
            clean(character.visualProfile?.hair),
            clean(character.visualProfile?.style),
            clean(character.visualProfile?.signatureDetail),
          ],
          recognitionHints: profileDisplayName
            ? [`User display name: ${profileDisplayName}`]
            : [],
          existingGreeting: clean(character.greeting),
          existingPreviewMessage: clean(character.previewMessage),
        });
        openingGreeting = generatedOpening.greeting;
      } catch {
        openingGreeting = clean(character.greeting);
      }
    }

    const nextGreeting = buildRecognitionAwareGreeting({
      baseGreeting: openingGreeting,
      contract: recognitionContract,
    });

    const { error: seedError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: nextGreeting,
    });

    if (seedError) {
      return NextResponse.json(
        { ok: false, error: seedError.message },
        { status: 500 },
      );
    }

    const { error: updateConversationError } = await supabase
      .from("conversations")
      .update({
        title: `Chat with ${clean(character.name) || "Character"}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (updateConversationError) {
      return NextResponse.json(
        { ok: false, error: updateConversationError.message },
        { status: 500 },
      );
    }

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { ok: false, error: messagesError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      messages: messages ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not reset chat.",
      },
      { status: 500 },
    );
  }
}
