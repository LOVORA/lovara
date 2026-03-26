import { NextResponse } from "next/server";

import { getCharacterBySlug } from "@/lib/characters";
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

function normalizeOpeningText(value?: string | null) {
  return clean(value)
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .toLocaleLowerCase("en");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = clean(url.searchParams.get("slug"));

    if (!slug) {
      return NextResponse.json({ ok: false, error: "Missing slug." }, { status: 400 });
    }

    const character = getCharacterBySlug(slug);
    if (!character) {
      return NextResponse.json({ ok: false, error: "Character not found." }, { status: 404 });
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

    const { data: existingConversation, error: existingConversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("character_slug", slug)
      .maybeSingle();

    if (existingConversationError) {
      return NextResponse.json(
        { ok: false, error: existingConversationError.message },
        { status: 500 },
      );
    }

    let conversation = existingConversation;

    if (!conversation) {
      const { error: upsertError } = await supabase
        .from("conversations")
        .upsert(
          {
            user_id: user.id,
            character_slug: slug,
            title: `Chat with ${clean(character.name) || "Character"}`,
          },
          { onConflict: "user_id,character_slug" },
        );

      if (upsertError) {
        return NextResponse.json(
          { ok: false, error: upsertError.message },
          { status: 500 },
        );
      }

      const { data: finalConversation, error: finalConversationError } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("character_slug", slug)
        .single();

      if (finalConversationError || !finalConversation) {
        return NextResponse.json(
          {
            ok: false,
            error: finalConversationError?.message || "Could not load conversation.",
          },
          { status: 500 },
        );
      }

      conversation = finalConversation;
    }

    const { data: existingMessages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { ok: false, error: messagesError.message },
        { status: 500 },
      );
    }

    let messages = existingMessages ?? [];

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

    const existingAssistantMessage =
      messages.find(
        (message) =>
          typeof message?.role === "string" &&
          message.role === "assistant" &&
          typeof message.content === "string" &&
          clean(message.content),
      ) ?? null;

    if (messages.length === 0) {
      let openingPack = {
        scenarioSummary: "",
        openingBeat: "",
        greeting: clean(character.greeting),
        previewMessage: clean(character.previewMessage),
        sceneAnchors: [] as string[],
        memorySeeds: [] as string[],
      };

      const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
      if (openRouterApiKey) {
        try {
          openingPack = await generateScenarioOpeningPack({
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
        } catch {
          // Fall back to the static built-in opening.
        }
      }

      const seededGreeting = buildRecognitionAwareGreeting({
        baseGreeting: openingPack.greeting,
        contract: recognitionContract,
      });

      if (
        normalizeOpeningText(existingAssistantMessage?.content) !==
        normalizeOpeningText(seededGreeting)
      ) {
        const { error: seedError } = await supabase.from("messages").insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: "assistant",
          content: seededGreeting,
        });

        if (seedError) {
          return NextResponse.json(
            { ok: false, error: seedError.message },
            { status: 500 },
          );
        }

        const { data: seededMessages, error: seededMessagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("user_id", user.id)
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true });

        if (seededMessagesError) {
          return NextResponse.json(
            { ok: false, error: seededMessagesError.message },
            { status: 500 },
          );
        }

        messages = seededMessages ?? [];
      }
    }

    return NextResponse.json({
      ok: true,
      conversation,
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not bootstrap chat.",
      },
      { status: 500 },
    );
  }
}
