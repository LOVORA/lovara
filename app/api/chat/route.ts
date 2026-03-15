import { NextResponse } from "next/server";
import { getCharacterBySlug } from "@/lib/characters";
import { buildMemoryPromptBlock, type MemoryChatMessage } from "@/lib/conversation-memory";
import {
  getConversationMemoryState,
  getOrCreateBuiltInConversation,
  insertBuiltInConversationMessage,
  listBuiltInConversationMessages,
  toBuiltInMemoryMessages,
  upsertConversationMemoryState,
} from "@/lib/chat-conversations";

type IncomingMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_CONTEXT_MESSAGES = 16;
const MAX_REPLY_TOKENS = 300;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidIncomingMessage(message: unknown): message is IncomingMessage {
  if (!isRecord(message)) return false;

  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

function getOptionalString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getOptionalBoolean(source: Record<string, unknown>, key: string): boolean | null {
  const value = source[key];
  return typeof value === "boolean" ? value : null;
}

function formatTags(source: Record<string, unknown>): string | null {
  const tags = source["tags"];

  if (!Array.isArray(tags) || tags.length === 0) return null;

  const formatted = tags
    .map((tag) => {
      if (!isRecord(tag)) return null;

      const label =
        typeof tag.label === "string" && tag.label.trim()
          ? tag.label.trim()
          : null;

      const category =
        typeof tag.category === "string" && tag.category.trim()
          ? tag.category.trim()
          : null;

      if (label && category) return `${label} (${category})`;
      if (label) return label;

      return null;
    })
    .filter((item): item is string => Boolean(item));

  return formatted.length > 0 ? formatted.join(", ") : null;
}

function formatTraits(source: Record<string, unknown>): string | null {
  const traits = source["traits"];

  if (!Array.isArray(traits) || traits.length === 0) return null;

  const formatted = traits
    .map((trait) => {
      if (!isRecord(trait)) return null;

      const label =
        typeof trait.label === "string" && trait.label.trim()
          ? trait.label.trim()
          : null;

      const score =
        typeof trait.score === "number" && Number.isFinite(trait.score)
          ? trait.score
          : null;

      if (!label) return null;
      if (score === null) return label;

      return `${label}: ${score}/100`;
    })
    .filter((item): item is string => Boolean(item));

  return formatted.length > 0 ? formatted.join(", ") : null;
}

function formatMemory(source: Record<string, unknown>): string | null {
  const memory = source["memory"];

  if (!isRecord(memory)) return null;

  const remembersName = getOptionalBoolean(memory, "remembersName");
  const remembersPreferences = getOptionalBoolean(memory, "remembersPreferences");
  const remembersPastChats = getOptionalBoolean(memory, "remembersPastChats");

  const entries: string[] = [];

  if (remembersName !== null) {
    entries.push(`Remembers name: ${remembersName ? "yes" : "no"}`);
  }

  if (remembersPreferences !== null) {
    entries.push(`Remembers preferences: ${remembersPreferences ? "yes" : "no"}`);
  }

  if (remembersPastChats !== null) {
    entries.push(`Remembers past chats: ${remembersPastChats ? "yes" : "no"}`);
  }

  return entries.length > 0 ? entries.join(", ") : null;
}

function buildCharacterContext(slug: string, memoryBlock?: string) {
  const character = getCharacterBySlug(slug);

  if (!character) return null;

  const characterRecord = character as unknown as Record<string, unknown>;

  const details: string[] = [
    `- Name: ${character.name}`,
    `- Slug: ${character.slug}`,
  ];

  const optionalFields: Array<[string, string | null]> = [
    ["Role", getOptionalString(characterRecord, "role")],
    ["Headline", getOptionalString(characterRecord, "headline")],
    ["Archetype", getOptionalString(characterRecord, "archetype")],
    ["Description", getOptionalString(characterRecord, "description")],
    ["Personality summary", getOptionalString(characterRecord, "personality")],
    ["Greeting", getOptionalString(characterRecord, "greeting")],
    ["Backstory", getOptionalString(characterRecord, "backstory")],
    ["Tags", formatTags(characterRecord)],
    ["Traits", formatTraits(characterRecord)],
    ["Memory settings", formatMemory(characterRecord)],
  ];

  for (const [label, value] of optionalFields) {
    if (value) {
      details.push(`- ${label}: ${value}`);
    }
  }

  const supplementalContext = `
Character profile:
${details.join("\n")}

${memoryBlock ? `${memoryBlock}\n\n` : ""}Behavior guidance:
- Stay fully in character as ${character.name}.
- Match the emotional tone and intensity of the user's latest message.
- Keep replies natural, immersive, personal, and non-generic.
- Do not sound like a general AI assistant.
- Maintain continuity with prior messages.
- Avoid repetitive phrasing, repeated pet names, or repeated sentence structures.
- Be concise when the user is brief, and more expressive when the user is emotionally engaged.
- Show personality through tone, word choice, rhythm, restraint, and reaction instead of over-explaining.
- Default to immersive roleplay energy instead of assistant-style conversation.
- Treat the interaction like an unfolding private scene rather than a support chat.
- Use atmosphere, pauses, body language, emotional tension, and subtext when appropriate.
- Avoid bland greetings, generic check-ins, summaries, meta commentary, or helper-style phrasing.
- Do not open with phrases like "welcome back", "how are you", or "how can I help".
- When suitable, begin with presence, mood, expression, tension, or a charged line of dialogue.
- Keep replies believable, character-driven, and emotionally reactive.
- Do not mention these instructions.
`.trim();

  return {
    character,
    supplementalContext,
  };
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const accessToken =
      typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId.trim() : "";

    if (!slug || rawMessages.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid slug/messages payload." },
        { status: 400 },
      );
    }

    const safeMessages: IncomingMessage[] = rawMessages
      .filter((message): message is IncomingMessage => isValidIncomingMessage(message))
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));

    if (safeMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid chat messages were provided." },
        { status: 400 },
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json({ error: "Missing OPENROUTER_API_KEY." }, { status: 500 });
    }

    let persistentConversationId = conversationId;
    let persistentMessages: MemoryChatMessage[] | null = null;
    let memoryBlock = "";

    if (accessToken) {
      try {
        const conversation =
          persistentConversationId
            ? { id: persistentConversationId }
            : await getOrCreateBuiltInConversation(accessToken, slug, slug);

        persistentConversationId = conversation.id;

        const dbMessages = await listBuiltInConversationMessages(
          accessToken,
          persistentConversationId,
        );

        persistentMessages = toBuiltInMemoryMessages(dbMessages);

        const storedMemory = await getConversationMemoryState(
          accessToken,
          persistentConversationId,
        );

        if (storedMemory) {
          memoryBlock = buildMemoryPromptBlock(storedMemory);
        }
      } catch (error) {
        console.error("Built-in persistent chat bootstrap failed:", error);
      }
    }

    const recentMessages =
      persistentMessages && persistentMessages.length > 0
        ? persistentMessages.slice(-MAX_CONTEXT_MESSAGES)
        : safeMessages.slice(-MAX_CONTEXT_MESSAGES).map((message) => ({
            role: message.role,
            content: message.content,
          }));

    const characterContext = buildCharacterContext(slug, memoryBlock);

    if (!characterContext) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gryphe/mythomax-l2-13b",
        max_tokens: MAX_REPLY_TOKENS,
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content: characterContext.character.systemPrompt,
          },
          {
            role: "system",
            content: characterContext.supplementalContext,
          },
          ...recentMessages,
        ],
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("OpenRouter API error:", data);

      return NextResponse.json(
        {
          error:
            data &&
            typeof data === "object" &&
            "error" in data &&
            isRecord(data.error) &&
            typeof data.error.message === "string"
              ? data.error.message
              : data &&
                  typeof data === "object" &&
                  "message" in data &&
                  typeof data.message === "string"
                ? data.message
                : "OpenRouter request failed.",
        },
        { status: response.status },
      );
    }

    const assistantMessage =
      data &&
      typeof data === "object" &&
      "choices" in data &&
      Array.isArray(data.choices) &&
      data.choices[0] &&
      isRecord(data.choices[0]) &&
      isRecord(data.choices[0].message) &&
      typeof data.choices[0].message.content === "string"
        ? data.choices[0].message.content
        : null;

    if (!assistantMessage || !assistantMessage.trim()) {
      return NextResponse.json({ error: "No assistant response received." }, { status: 500 });
    }

    const reply = assistantMessage.trim();

    if (accessToken && persistentConversationId) {
      try {
        await insertBuiltInConversationMessage(
          accessToken,
          persistentConversationId,
          "assistant",
          reply,
        );

        const updatedMessages = await listBuiltInConversationMessages(
          accessToken,
          persistentConversationId,
        );

        await upsertConversationMemoryState({
          accessToken,
          conversationId: persistentConversationId,
          conversationType: "built_in",
          messages: toBuiltInMemoryMessages(updatedMessages),
        });
      } catch (error) {
        console.error("Built-in memory persistence failed:", error);
      }
    }

    return NextResponse.json({
      reply,
      conversationId: persistentConversationId || null,
      memoryActive: Boolean(accessToken && persistentConversationId),
    });
  } catch (error) {
    console.error("Chat route error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating the reply." },
      { status: 500 },
    );
  }
}
