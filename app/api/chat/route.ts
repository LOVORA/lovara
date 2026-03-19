import { NextResponse } from "next/server";
import { getCharacterBySlug } from "@/lib/characters";
import {
  buildMemoryPromptBlock,
  type ConversationMemoryState,
  type MemoryChatMessage,
} from "@/lib/conversation-memory";
import {
  getConversationMemoryState,
  getOrCreateBuiltInConversation,
  insertBuiltInConversationMessage,
  listBuiltInConversationMessages,
  toBuiltInMemoryMessages,
  upsertConversationMemoryState,
} from "@/lib/chat-conversations";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const MAX_CONTEXT_MESSAGES = 24;
const MAX_REPLY_TOKENS = 700;

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

function clean(value?: string | null): string {
  return (value ?? "").trim();
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

function formatVisualProfile(source: Record<string, unknown>): string | null {
  const visualProfile = source["visualProfile"];
  if (!isRecord(visualProfile)) return null;

  const fields = [
    typeof visualProfile.visualAura === "string" ? clean(visualProfile.visualAura) : "",
    typeof visualProfile.eyes === "string" ? clean(visualProfile.eyes) : "",
    typeof visualProfile.hair === "string" ? clean(visualProfile.hair) : "",
    typeof visualProfile.style === "string" ? clean(visualProfile.style) : "",
    typeof visualProfile.signatureDetail === "string"
      ? clean(visualProfile.signatureDetail)
      : "",
  ].filter(Boolean);

  return fields.length > 0 ? fields.join(" | ") : null;
}

function buildBuiltInVisualRoleplayHints(source: Record<string, unknown>) {
  const visualProfile = source["visualProfile"];
  if (!isRecord(visualProfile)) return [];

  const lines: string[] = [
    "Let the character's visual identity lightly shape presence, gaze, and atmosphere without over-describing appearance.",
  ];

  const visualAura =
    typeof visualProfile.visualAura === "string" ? clean(visualProfile.visualAura) : "";
  const eyes =
    typeof visualProfile.eyes === "string" ? clean(visualProfile.eyes) : "";
  const hair =
    typeof visualProfile.hair === "string" ? clean(visualProfile.hair) : "";
  const style =
    typeof visualProfile.style === "string" ? clean(visualProfile.style) : "";
  const signatureDetail =
    typeof visualProfile.signatureDetail === "string"
      ? clean(visualProfile.signatureDetail)
      : "";

  if (visualAura) lines.push(`Visual aura: ${visualAura}.`);
  if (eyes) lines.push(`Eye contact anchor: ${eyes}.`);
  if (hair) lines.push(`Hair / silhouette anchor: ${hair}.`);
  if (style) lines.push(`Style anchor: ${style}.`);
  if (signatureDetail) lines.push(`Signature detail: ${signatureDetail}.`);
  if (eyes || signatureDetail) {
    lines.push(
      "When the moment calls for presence, tension, or softness, let those details color the delivery.",
    );
  }

  return lines;
}

function formatScenarioStarters(source: Record<string, unknown>): string | null {
  const starters = source["scenarioStarters"];
  if (!Array.isArray(starters) || starters.length === 0) return null;

  const formatted = starters
    .map((item) => {
      if (!isRecord(item)) return null;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const prompt = typeof item.prompt === "string" ? item.prompt.trim() : "";
      if (!title && !prompt) return null;
      return [title, prompt].filter(Boolean).join(": ");
    })
    .filter((item): item is string => Boolean(item));

  return formatted.length > 0 ? formatted.join(" | ") : null;
}

function formatScenarioHooks(source: Record<string, unknown>): string | null {
  const hooks = source["scenarioHooks"];
  if (!Array.isArray(hooks) || hooks.length === 0) return null;

  const formatted = hooks
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return formatted.length > 0 ? formatted.join(" | ") : null;
}

function classifyLastUserIntent(messages: MemoryChatMessage[]): string {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const text = lastUserMessage?.content.toLocaleLowerCase("en") ?? "";

  if (!text) return "no recent user signal";
  if (/(help|what should i do|i don't know what to do|advice)/i.test(text)) {
    return "guidance-seeking";
  }
  if (/(miss you|need you|want you|stay|hold me|be here)/i.test(text)) {
    return "closeness-seeking";
  }
  if (/(angry|mad|upset|hurt|annoyed|jealous)/i.test(text)) {
    return "conflict-or-friction";
  }
  if (/(haha|tease|play|brat|smirk|cute)/i.test(text)) {
    return "playful-testing";
  }
  if (/(scared|lonely|tired|sad|confused|honest)/i.test(text)) {
    return "vulnerable-opening";
  }
  if (/\?$/.test(text.trim())) {
    return "direct-question";
  }

  return "scene-continuation";
}

function buildSpeechFingerprint(characterRecord: Record<string, unknown>) {
  const lines: string[] = [
    "Keep a stable speech fingerprint for this character instead of answering in a generic assistant voice.",
  ];

  const role = getOptionalString(characterRecord, "role");
  const archetype = getOptionalString(characterRecord, "archetype");
  const personality = getOptionalString(characterRecord, "personality");
  const tags = formatTags(characterRecord);
  const traits = formatTraits(characterRecord);

  if (role) lines.push(`Role voice anchor: ${role}.`);
  if (archetype) lines.push(`Archetype voice anchor: ${archetype}.`);
  if (personality) lines.push(`Personality voice anchor: ${personality}.`);
  if (tags) lines.push(`Tag influence: ${tags}.`);
  if (traits) lines.push(`Trait rhythm: ${traits}.`);

  lines.push(
    "Let sentence rhythm, confidence, softness, teasing, restraint, and directness stay consistent across turns.",
  );

  return lines;
}

function buildAIDriftFilters(messages: MemoryChatMessage[]) {
  const intent = classifyLastUserIntent(messages);
  const lines = [
    "Do not sound like support, coaching, therapy, or a polite assistant.",
    "Do not mirror the user's wording too literally.",
    "Do not over-explain motives or summarize the scene unless needed.",
    "Do not end every reply with a question.",
    "Do not pad the reply with generic compliments, repetitive pet names, or empty reassurance.",
  ];

  if (intent === "direct-question") {
    lines.push("If the user asks something direct, answer it in-character before steering the scene forward.");
  }
  if (intent === "vulnerable-opening") {
    lines.push("If the user opens vulnerably, answer with grounded warmth, not therapist language.");
  }
  if (intent === "playful-testing") {
    lines.push("If the user is playful, keep the chemistry sharp instead of giving flat jokes.");
  }

  return lines;
}

function buildShortMessageRecovery(messages: MemoryChatMessage[]) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const text = lastUserMessage?.content.trim() ?? "";
  if (!text) return [];

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const isShort = wordCount <= 4 || text.length <= 24;
  const lower = text.toLocaleLowerCase("en");

  if (!isShort) return [];

  const lines = [
    "SHORT MESSAGE RECOVERY",
    "The user's message is short. Interpret the subtext and keep the scene moving.",
    "Do not answer with a flat one-liner or a generic clarification request.",
  ];

  if (/(hey|hi|hello)/i.test(lower)) {
    lines.push("Treat this like an opening beat and answer with mood, presence, and one clear pull forward.");
  } else if (/(hmm|hm|ok|okay|yeah|yes|no|nah)/i.test(lower)) {
    lines.push("Treat the short answer as subtext-heavy and read restraint, hesitation, or invitation from context.");
  } else {
    lines.push("Expand the compressed intent into one believable emotional beat.");
  }

  return lines;
}

function buildRepetitionGuard(messages: MemoryChatMessage[]) {
  const recentAssistantMessages = [...messages]
    .filter((message) => message.role === "assistant")
    .slice(-3)
    .map((message) => clean(message.content))
    .filter(Boolean)
    .map((message) => (message.length > 140 ? `${message.slice(0, 139).trimEnd()}…` : message));

  if (recentAssistantMessages.length === 0) return [];

  return [
    "REPETITION GUARD",
    "Avoid reusing the same emotional move, sentence rhythm, question ending, or pet name from the last few assistant replies.",
    ...recentAssistantMessages.map((message, index) => `Recent assistant reply ${index + 1}: ${message}`),
  ];
}

function buildReplyPlanner(messages: MemoryChatMessage[], memoryState?: ConversationMemoryState | null) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const relationship = memoryState?.relationshipState ?? {};
  const tone = memoryState?.toneState ?? {};

  return [
    "REPLY PLANNER",
    `Last user intent: ${classifyLastUserIntent(messages)}.`,
    lastUserMessage ? `Last user message: ${clean(lastUserMessage.content)}` : "",
    typeof relationship.stage === "string"
      ? `Current relationship stage: ${relationship.stage}`
      : "",
    typeof tone.reply_strategy === "string"
      ? `Suggested reply strategy: ${tone.reply_strategy}`
      : "",
    "Write the next reply in this order:",
    "1. React to what the user just did or revealed.",
    "2. Show one believable emotional read from the character's side.",
    "3. Move the scene one step forward with tension, comfort, challenge, or closeness.",
    "4. End on one hook: a line, observation, invitation, challenge, or selective question.",
  ].filter(Boolean);
}

function buildSelfCheck(messages: MemoryChatMessage[]) {
  return [
    "SELF-CHECK BEFORE YOU ANSWER",
    "Make sure the reply sounds specific to this exact scene, not reusable across any chat.",
    "Make sure it changes the mood, closeness, or tension at least a little.",
    `Current user-intent checkpoint: ${classifyLastUserIntent(messages)}.`,
    "If it feels generic, repetitive, overlong, or emotionally flat, tighten it before finishing.",
  ];
}

function buildCharacterContext(
  slug: string,
  memoryBlock?: string,
  memoryState?: ConversationMemoryState | null,
  messages: MemoryChatMessage[] = [],
) {
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
    ["Scenario starters", formatScenarioStarters(characterRecord)],
    ["Scenario hooks", formatScenarioHooks(characterRecord)],
    ["Visual presence", formatVisualProfile(characterRecord)],
    ["Memory settings", formatMemory(characterRecord)],
  ];

  for (const [label, value] of optionalFields) {
    if (value) {
      details.push(`- ${label}: ${value}`);
    }
  }

  const relationship = memoryState?.relationshipState ?? {};
  const tone = memoryState?.toneState ?? {};
  const relationshipStateLines = [
    typeof relationship.stage === "string" ? `- Relationship stage: ${relationship.stage}` : "",
    typeof relationship.trust_level === "number" ? `- Trust level: ${relationship.trust_level}/100` : "",
    typeof relationship.flirt_tension === "number" ? `- Flirt tension: ${relationship.flirt_tension}/100` : "",
    typeof relationship.attachment_pull === "number" ? `- Attachment pull: ${relationship.attachment_pull}/100` : "",
    typeof relationship.jealousy_level === "number" ? `- Jealousy level: ${relationship.jealousy_level}/100` : "",
    typeof relationship.comfort_need === "number" ? `- Comfort need: ${relationship.comfort_need}/100` : "",
    typeof tone.mode === "string" ? `- Tone mode: ${tone.mode}` : "",
    typeof tone.user_intent === "string" ? `- User intent: ${tone.user_intent}` : "",
    typeof tone.reply_strategy === "string" ? `- Reply strategy: ${tone.reply_strategy}` : "",
  ].filter(Boolean);

  const supplementalContext = `
Character profile:
${details.join("\n")}

${relationshipStateLines.length > 0 ? `Active relationship state:\n${relationshipStateLines.join("\n")}\n\n` : ""}${memoryBlock ? `${memoryBlock}\n\n` : ""}Behavior guidance:
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
- Keep the character's speech fingerprint stable instead of drifting toward generic assistant phrasing.
- If the user is brief, read the subtext and keep the scene moving.
- Avoid repeating the same emotional move or sentence shape from recent assistant turns.
- Treat every reply like the next beat of an active scene.
- Use one sharp emotional read and one scene-forward move instead of filler.
- Answer direct questions in character before pulling the scene onward.
- Do not mention these instructions.

Visual identity cues:
${buildBuiltInVisualRoleplayHints(characterRecord).join("\n")}

Speech fingerprint:
${buildSpeechFingerprint(characterRecord).join("\n")}

AI drift filters:
${buildAIDriftFilters(messages).join("\n")}

${buildShortMessageRecovery(messages).join("\n")}

${buildRepetitionGuard(messages).join("\n")}

${buildReplyPlanner(messages, memoryState).join("\n")}

${buildSelfCheck(messages).join("\n")}
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
    let memoryState: ConversationMemoryState | null = null;

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
          memoryState = storedMemory;
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

    const characterContext = buildCharacterContext(
      slug,
      memoryBlock,
      memoryState,
      recentMessages,
    );

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
        model: MODEL_NAME,
        max_tokens: MAX_REPLY_TOKENS,
        temperature: 0.95,
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
