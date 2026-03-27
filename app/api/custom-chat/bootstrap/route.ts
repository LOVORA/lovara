import { NextResponse } from "next/server";

import { getCustomCharacterVisibility } from "@/lib/character-admin";
import {
  createSupabaseStorageSigner,
  resolveCharacterPrimaryImage,
} from "@/lib/character-image-assets";
import { normalizeStoredMemoryState } from "@/lib/conversation-memory";
import { createClient } from "@/lib/supabase/server";
import {
  buildRecognitionAwareGreeting,
  buildUserRecognitionContract,
  ensureUserRecognitionMemory,
  getProfileDisplayName,
} from "@/lib/user-recognition";
import { resolveAccessibleCustomCharacterBySlug } from "@/lib/server/custom-character-ownership";
import { generateScenarioOpeningPack } from "@/lib/chat/scenario-generation";

type CharacterImageRow = {
  id?: string | null;
  character_id: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  public_url: string | null;
  is_primary?: boolean | null;
  image_type?: string | null;
  created_at?: string | null;
};

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

function extractLiveTuningSnapshot(value: unknown) {
  const tone =
    value && typeof value === "object" && value !== null && "toneState" in value
      ? (value as { toneState?: Record<string, unknown> }).toneState ?? {}
      : {};

  return {
    adjustments: Array.isArray(tone.live_tuning_preferences)
      ? tone.live_tuning_preferences
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [],
    rejectLastReplyStyle: tone.live_tuning_reject_last_style === true,
    rejectedReplyExcerpt:
      typeof tone.live_tuning_rejected_excerpt === "string"
        ? clean(tone.live_tuning_rejected_excerpt)
        : undefined,
  };
}

function extractReplyCorrectionSnapshot(value: unknown) {
  const tone =
    value && typeof value === "object" && value !== null && "toneState" in value
      ? (value as { toneState?: Record<string, unknown> }).toneState ?? {}
      : {};

  const recentRatings = Array.isArray(tone.reply_feedback_history)
    ? tone.reply_feedback_history.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : [];

  return {
    latestRating:
      typeof tone.reply_feedback_latest === "string"
        ? clean(tone.reply_feedback_latest)
        : undefined,
    recentRatings,
    activeCorrectionSummary: Array.isArray(tone.reply_feedback_active_summary)
      ? tone.reply_feedback_active_summary
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [],
    targetExcerpt:
      typeof tone.reply_feedback_target_excerpt === "string"
        ? clean(tone.reply_feedback_target_excerpt)
        : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = clean(url.searchParams.get("slug"));

    if (!slug) {
      return NextResponse.json({ ok: false, error: "Missing slug." }, { status: 400 });
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

    const characterRow = await resolveAccessibleCustomCharacterBySlug({
      supabase,
      userId: user.id,
      slug,
    });

    if (!characterRow) {
      return NextResponse.json(
        { ok: false, error: "CHARACTER_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (!getCustomCharacterVisibility(characterRow.payload).chatEnabled) {
      return NextResponse.json(
        { ok: false, error: "CHARACTER_NOT_FOUND" },
        { status: 404 },
      );
    }

    const { data: existingConversation, error: existingConversationError } =
      await supabase
        .from("custom_conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("custom_character_id", characterRow.id)
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
        .from("custom_conversations")
        .upsert(
          {
            user_id: user.id,
            custom_character_id: characterRow.id,
            title: clean(characterRow.name) || "Custom character",
          },
          {
            onConflict: "user_id,custom_character_id",
          },
        );

      if (upsertError) {
        return NextResponse.json(
          { ok: false, error: upsertError.message },
          { status: 500 },
        );
      }

      const { data: finalConversation, error: finalConversationError } =
        await supabase
          .from("custom_conversations")
          .select("*")
          .eq("user_id", user.id)
          .eq("custom_character_id", characterRow.id)
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
      .from("custom_messages")
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
    const profileDisplayName = await getProfileDisplayName(supabase as never, user.id);
    const scenario = toRecord(characterRow.scenario);
    const payload = toRecord(characterRow.payload);
    const customNotes = toRecord(payload.customNotes);

    const recognitionMemory = await ensureUserRecognitionMemory({
      supabase: supabase as never,
      userId: user.id,
      scope: { customCharacterId: characterRow.id },
      relationshipToUser:
        typeof scenario.relationshipToUser === "string" ? scenario.relationshipToUser : "",
      openingState:
        typeof scenario.openingState === "string" ? scenario.openingState : "",
      userRole: typeof customNotes["User role"] === "string" ? customNotes["User role"] : "",
      profileDisplayName,
    });
    const recognitionContract = buildUserRecognitionContract({
      memory: recognitionMemory,
      profileDisplayName,
      relationshipToUser:
        typeof scenario.relationshipToUser === "string" ? scenario.relationshipToUser : "",
      openingState:
        typeof scenario.openingState === "string" ? scenario.openingState : "",
      userRole: typeof customNotes["User role"] === "string" ? customNotes["User role"] : "",
    });
    const storedOpeningPack = toRecord(payload.grokScenarioPack);
    const storedScenarioSummary =
      typeof storedOpeningPack.scenarioSummary === "string"
        ? clean(storedOpeningPack.scenarioSummary)
        : typeof payload.scenarioSummary === "string"
          ? clean(payload.scenarioSummary)
          : "";
    const storedOpeningBeat =
      typeof storedOpeningPack.openingBeat === "string"
        ? clean(storedOpeningPack.openingBeat)
        : "";
    const storedPreviewMessage =
      typeof storedOpeningPack.previewMessage === "string"
        ? clean(storedOpeningPack.previewMessage)
        : typeof characterRow.preview_message === "string"
          ? clean(characterRow.preview_message)
          : "";
    let openingPack = {
      scenarioSummary: storedScenarioSummary,
      openingBeat: storedOpeningBeat,
      greeting: typeof characterRow.greeting === "string" ? clean(characterRow.greeting) : "",
      previewMessage: storedPreviewMessage,
      sceneAnchors: toStringArray(storedOpeningPack.sceneAnchors),
      memorySeeds: toStringArray(storedOpeningPack.memorySeeds),
    };

    if (!openingPack.greeting && typeof characterRow.greeting === "string") {
      openingPack.greeting = clean(characterRow.greeting);
    }

    if (messages.length === 0 && !storedOpeningPack.greeting) {
      const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
      if (openRouterApiKey) {
        try {
          const metadata = toRecord(payload.metadata);
          const sceneProfile = toRecord(metadata.sceneProfile);
          const identity = toRecord(payload.identity);
          const customNotes = toRecord(payload.customNotes);

          openingPack = await generateScenarioOpeningPack({
            apiKey: openRouterApiKey,
            characterName: clean(characterRow.name),
            archetype: typeof characterRow.archetype === "string" ? characterRow.archetype : "",
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
              profileDisplayName ? `User display name: ${profileDisplayName}` : "",
            ],
            existingGreeting:
              typeof characterRow.greeting === "string" ? characterRow.greeting : "",
            existingPreviewMessage:
              typeof characterRow.preview_message === "string"
                ? characterRow.preview_message
                : "",
          });
        } catch {
          // Fall back to the stored local opening content.
        }
      }
    }

    const openingGreeting = buildRecognitionAwareGreeting({
      baseGreeting: openingPack.greeting,
      contract: recognitionContract,
    });
    const firstAssistantMessage =
      messages.find(
        (message) =>
          typeof message?.role === "string" &&
          message.role === "assistant" &&
          typeof message.content === "string" &&
          clean(message.content),
      ) ?? null;

    if (
      messages.length === 0 &&
      normalizeOpeningText(firstAssistantMessage?.content) !==
        normalizeOpeningText(openingGreeting)
    ) {
      const { error: seedError } = await supabase
        .from("custom_messages")
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: "assistant",
          content: openingGreeting,
        });

      if (seedError) {
        return NextResponse.json(
          { ok: false, error: seedError.message },
          { status: 500 },
        );
      }

      const { data: seededMessages, error: seededMessagesError } = await supabase
        .from("custom_messages")
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

    const { data: memoryRow, error: memoryError } = await supabase
      .from("conversation_memory_state")
      .select("*")
      .eq("user_id", user.id)
      .eq("conversation_id", conversation.id)
      .maybeSingle();

    if (memoryError) {
      return NextResponse.json(
        { ok: false, error: memoryError.message },
        { status: 500 },
      );
    }

    const { data: imageRows } = await supabase
      .from("character_images")
      .select(
        "id, character_id, storage_bucket, storage_path, public_url, is_primary, image_type, created_at",
      )
      .eq("character_id", characterRow.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);

    const primaryAvatar = await resolveCharacterPrimaryImage({
      rows: (imageRows ?? []) as CharacterImageRow[],
      signUrl: createSupabaseStorageSigner(supabase as never),
      fallbackUrl:
        typeof characterRow.primary_image_url === "string"
          ? characterRow.primary_image_url
          : null,
    });

    const memoryState = memoryRow ? normalizeStoredMemoryState(memoryRow) : null;
    const responseCharacter = {
      ...characterRow,
      greeting: openingPack.greeting || characterRow.greeting,
      preview_message: openingPack.previewMessage || characterRow.preview_message,
      payload: {
        ...payload,
        scenarioSummary: openingPack.scenarioSummary || payload.scenarioSummary,
        openingPack: {
          ...toRecord(payload.openingPack),
          ...openingPack,
        },
      },
    };

    return NextResponse.json({
      ok: true,
      character: responseCharacter,
      conversation,
      messages,
      memoryState,
      liveTuning: extractLiveTuningSnapshot(memoryState),
      replyCorrection: extractReplyCorrectionSnapshot(memoryState),
      avatarUrl: primaryAvatar?.resolvedUrl ?? characterRow.primary_image_url ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not bootstrap custom chat.",
      },
      { status: 500 },
    );
  }
}
