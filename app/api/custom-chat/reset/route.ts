import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  buildRecognitionAwareGreeting,
  buildUserRecognitionContract,
  getProfileDisplayName,
  getUserRecognitionMemory,
} from "@/lib/user-recognition";
import { generateScenarioOpeningPack } from "@/lib/chat/scenario-generation";
import { resolveAccessibleCustomCharacterById } from "@/lib/server/custom-character-ownership";

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function normalizeOpeningText(value?: string | null) {
  return clean(value)
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .toLocaleLowerCase("en");
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? clean(item) : ""))
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const conversationId =
      typeof raw?.conversationId === "string" ? clean(raw.conversationId) : "";

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

    const { data: conversation, error: conversationError } = await supabase
      .from("custom_conversations")
      .select("id, custom_character_id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (conversationError) {
      return NextResponse.json(
        { ok: false, error: conversationError.message },
        { status: 500 },
      );
    }

    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: "Conversation not found for the current account." },
        { status: 404 },
      );
    }

    const characterRow =
      conversation.custom_character_id &&
      typeof conversation.custom_character_id === "string"
        ? await resolveAccessibleCustomCharacterById({
            supabase,
            userId: user.id,
            characterId: conversation.custom_character_id,
          })
        : null;

    if (!characterRow) {
      return NextResponse.json(
        { ok: false, error: "Character not found for this conversation." },
        { status: 404 },
      );
    }

    const { error: deleteMessagesError } = await supabase
      .from("custom_messages")
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

    const profileDisplayName = await getProfileDisplayName(supabase as never, user.id);
    const recognitionMemory =
      conversation?.custom_character_id &&
      typeof conversation.custom_character_id === "string"
        ? await getUserRecognitionMemory(supabase as never, user.id, {
            customCharacterId: conversation.custom_character_id,
          })
        : null;
    const recognitionContract = buildUserRecognitionContract({
      memory: recognitionMemory,
      profileDisplayName,
    });
    const payload = toRecord(characterRow.payload);
    const storedOpeningPack = toRecord(payload.grokScenarioPack);
    let baseGreeting =
      typeof storedOpeningPack.greeting === "string"
        ? clean(storedOpeningPack.greeting)
        : typeof characterRow.greeting === "string"
          ? clean(characterRow.greeting)
          : "";

    if (!baseGreeting) {
      const scenario = toRecord(characterRow.scenario);
      const metadata = toRecord(payload.metadata);
      const sceneProfile = toRecord(metadata.sceneProfile);
      const identity = toRecord(payload.identity);
      const customNotes = toRecord(payload.customNotes);
      const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();

      if (openRouterApiKey) {
        try {
          const generatedOpening = await generateScenarioOpeningPack({
            apiKey: openRouterApiKey,
            characterName: clean(characterRow.name),
            archetype:
              typeof characterRow.archetype === "string" ? characterRow.archetype : "",
            description:
              typeof characterRow.description === "string" ? characterRow.description : "",
            backstory:
              typeof characterRow.backstory === "string" ? characterRow.backstory : "",
            setting:
              typeof scenario.setting === "string"
                ? scenario.setting
                : typeof sceneProfile.setting === "string"
                  ? sceneProfile.setting
                  : "",
            relationshipToUser:
              typeof scenario.relationshipToUser === "string"
                ? scenario.relationshipToUser
                : "",
            sceneGoal:
              typeof scenario.sceneGoal === "string" ? scenario.sceneGoal : "",
            tone: typeof scenario.tone === "string" ? scenario.tone : "",
            openingState:
              typeof scenario.openingState === "string" ? scenario.openingState : "",
            customScenario:
              typeof payload.customScenario === "string" ? payload.customScenario : "",
            userRole:
              typeof customNotes["User role"] === "string"
                ? clean(customNotes["User role"] as string)
                : "",
            tags: Array.isArray(characterRow.tags)
              ? characterRow.tags.filter(
                  (tag): tag is string => typeof tag === "string" && clean(tag).length > 0,
                )
              : [],
            identityHints: [
              typeof identity.age === "string" ? identity.age : "",
              typeof identity.region === "string" ? identity.region : "",
              typeof identity.genderPresentation === "string"
                ? identity.genderPresentation
                : "",
            ],
            recognitionHints: [
              typeof scenario.relationshipToUser === "string"
                ? scenario.relationshipToUser
                : "",
              typeof customNotes["Relationship dynamic"] === "string"
                ? clean(customNotes["Relationship dynamic"] as string)
                : "",
            ],
            visualHints: toStringArray(toRecord(toRecord(payload.metadata).visualProfile).highlights),
            existingGreeting:
              typeof characterRow.greeting === "string" ? characterRow.greeting : "",
            existingPreviewMessage:
              typeof characterRow.preview_message === "string"
                ? characterRow.preview_message
                : "",
          });
          baseGreeting = generatedOpening.greeting;
        } catch {
          baseGreeting =
            typeof characterRow.greeting === "string" ? clean(characterRow.greeting) : "";
        }
      }
    }

    const nextGreeting = buildRecognitionAwareGreeting({
      baseGreeting,
      contract: recognitionContract,
    });
    const normalizedGreeting = normalizeOpeningText(nextGreeting);
    if (normalizedGreeting) {
      const { error: seedError } = await supabase.from("custom_messages").insert({
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
    }

    const { error: updateConversationError } = await supabase
      .from("custom_conversations")
      .update({
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
      .from("custom_messages")
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
        error:
          error instanceof Error ? error.message : "Could not reset conversation.",
      },
      { status: 500 },
    );
  }
}
