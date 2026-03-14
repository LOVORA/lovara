import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const MAX_REPLY_TOKENS = 700;

type ChatRole = "user" | "assistant";

type CharacterScenario = {
  setting?: string;
  relationshipToUser?: string;
  sceneGoal?: string;
  tone?: string;
  openingState?: string;
};

type CharacterInput = {
  id?: string;
  slug?: string;
  name: string;
  archetype?: string;
  headline?: string;
  description?: string;
  greeting?: string;
  previewMessage?: string;
  backstory?: string;
  scenario?: CharacterScenario;
  traitBadges?: Array<{ label: string; tone?: string }>;
  tags?: string[];
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  engine?: {
    systemPrompt?: string;
    traits?: Record<string, unknown>;
  } | null;
};

type MessageInput = {
  role: ChatRole;
  content: string;
};

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMessages(input: unknown): MessageInput[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!isRecord(item)) return null;
      const role =
        item.role === "assistant"
          ? "assistant"
          : item.role === "user"
            ? "user"
            : null;
      const content = typeof item.content === "string" ? clean(item.content) : "";
      if (!role || !content) return null;
      return { role, content };
    })
    .filter(Boolean) as MessageInput[];
}

function normalizeScenario(input: unknown): CharacterScenario | undefined {
  if (!isRecord(input)) return undefined;

  const scenario: CharacterScenario = {
    setting: typeof input.setting === "string" ? clean(input.setting) : undefined,
    relationshipToUser:
      typeof input.relationshipToUser === "string"
        ? clean(input.relationshipToUser)
        : undefined,
    sceneGoal:
      typeof input.sceneGoal === "string" ? clean(input.sceneGoal) : undefined,
    tone: typeof input.tone === "string" ? clean(input.tone) : undefined,
    openingState:
      typeof input.openingState === "string" ? clean(input.openingState) : undefined,
  };

  return Object.values(scenario).some(Boolean) ? scenario : undefined;
}

function normalizeCharacter(input: unknown): CharacterInput | null {
  if (!isRecord(input)) return null;
  if (typeof input.name !== "string" || !clean(input.name)) return null;

  const traitBadges = Array.isArray(input.traitBadges)
    ? input.traitBadges
        .map((item) => {
          if (!isRecord(item)) return null;
          const label = typeof item.label === "string" ? clean(item.label) : "";
          const tone =
            typeof item.tone === "string" ? clean(item.tone) : undefined;
          if (!label) return null;
          return { label, tone };
        })
        .filter(Boolean) as Array<{ label: string; tone?: string }>
    : [];

  const tags = Array.isArray(input.tags)
    ? input.tags
        .map((item) => (typeof item === "string" ? clean(item) : ""))
        .filter(Boolean)
    : [];

  const payload = isRecord(input.payload) ? input.payload : {};
  const metadata = isRecord(input.metadata) ? input.metadata : {};

  const explicitEngine = isRecord(input.engine) ? input.engine : null;
  const payloadEngine =
    isRecord(payload.engine) && payload.engine ? payload.engine : null;

  const mergedEngine = explicitEngine ?? payloadEngine;

  const engine =
    mergedEngine && isRecord(mergedEngine)
      ? {
          systemPrompt:
            typeof mergedEngine.systemPrompt === "string"
              ? clean(mergedEngine.systemPrompt)
              : undefined,
          traits: isRecord(mergedEngine.traits)
            ? mergedEngine.traits
            : undefined,
        }
      : null;

  return {
    id: typeof input.id === "string" ? clean(input.id) : undefined,
    slug: typeof input.slug === "string" ? clean(input.slug) : undefined,
    name: clean(input.name),
    archetype:
      typeof input.archetype === "string" ? clean(input.archetype) : undefined,
    headline:
      typeof input.headline === "string" ? clean(input.headline) : undefined,
    description:
      typeof input.description === "string" ? clean(input.description) : undefined,
    greeting:
      typeof input.greeting === "string" ? clean(input.greeting) : undefined,
    previewMessage:
      typeof input.previewMessage === "string"
        ? clean(input.previewMessage)
        : undefined,
    backstory:
      typeof input.backstory === "string" ? clean(input.backstory) : undefined,
    scenario: normalizeScenario(input.scenario),
    traitBadges,
    tags,
    metadata,
    payload,
    engine,
  };
}

function truncate(value: string, max = 180): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function getIdentityData(payload?: Record<string, unknown>) {
  const identity = payload && isRecord(payload.identity) ? payload.identity : null;

  return {
    age: identity && typeof identity.age === "string" ? clean(identity.age) : "",
    region:
      identity && typeof identity.region === "string" ? clean(identity.region) : "",
    genderPresentation:
      identity && typeof identity.genderPresentation === "string"
        ? clean(identity.genderPresentation)
        : "",
    archetype:
      identity && typeof identity.archetype === "string"
        ? clean(identity.archetype)
        : "",
  };
}

function getStudioData(payload?: Record<string, unknown>) {
  const studio = payload && isRecord(payload.studio) ? payload.studio : null;

  return {
    mode: studio && typeof studio.mode === "string" ? clean(studio.mode) : "",
    coreVibes:
      studio && Array.isArray(studio.coreVibes)
        ? studio.coreVibes
            .map((item) => (typeof item === "string" ? clean(item) : ""))
            .filter(Boolean)
        : [],
    warmth:
      studio && typeof studio.warmth === "number" ? Math.round(studio.warmth) : null,
    assertiveness:
      studio && typeof studio.assertiveness === "number"
        ? Math.round(studio.assertiveness)
        : null,
    mystery:
      studio && typeof studio.mystery === "number" ? Math.round(studio.mystery) : null,
    playfulness:
      studio && typeof studio.playfulness === "number"
        ? Math.round(studio.playfulness)
        : null,
    replyLength:
      studio && typeof studio.replyLength === "string"
        ? clean(studio.replyLength)
        : "",
    speechStyle:
      studio && typeof studio.speechStyle === "string"
        ? clean(studio.speechStyle)
        : "",
    relationshipPace:
      studio && typeof studio.relationshipPace === "string"
        ? clean(studio.relationshipPace)
        : "",
  };
}

function getMemorySeed(payload?: Record<string, unknown>) {
  const memorySeed =
    payload && isRecord(payload.memorySeed) ? payload.memorySeed : null;

  const readList = (key: string) =>
    memorySeed && Array.isArray(memorySeed[key])
      ? memorySeed[key]
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [];

  return {
    identity: readList("identity"),
    behavior: readList("behavior"),
    scenario: readList("scenario"),
  };
}

function scoreStyle(value: number | null, low: string, mid: string, high: string) {
  if (value === null) return mid;
  if (value <= 33) return low;
  if (value <= 66) return mid;
  return high;
}

function buildSpeechDNA(payload?: Record<string, unknown>): string[] {
  const studio = getStudioData(payload);

  const lines: string[] = [];

  if (studio.replyLength) {
    if (studio.replyLength === "short") {
      lines.push("Keep most replies compact, but never empty or flat.");
    } else if (studio.replyLength === "balanced") {
      lines.push("Prefer medium-length replies with natural rhythm.");
    } else if (studio.replyLength === "detailed") {
      lines.push("Allow richer, more immersive replies when the moment deserves it.");
    }
  }

  if (studio.speechStyle) {
    if (studio.speechStyle === "natural") {
      lines.push("Use natural, human phrasing with minimal ornament.");
    } else if (studio.speechStyle === "poetic") {
      lines.push("Use elegant phrasing and image-rich language, but avoid purple prose.");
    } else if (studio.speechStyle === "witty") {
      lines.push("Favor banter, timing, and smart verbal play.");
    } else if (studio.speechStyle === "bold") {
      lines.push("Use direct, confident phrasing without becoming robotic or blunt.");
    } else if (studio.speechStyle === "soft") {
      lines.push("Use gentle, intimate phrasing with emotional tact.");
    }
  }

  if (studio.relationshipPace) {
    if (studio.relationshipPace === "slow-burn") {
      lines.push("Let intimacy build gradually; do not rush emotional payoff.");
    } else if (studio.relationshipPace === "balanced") {
      lines.push("Allow closeness to develop naturally at a moderate pace.");
    } else if (studio.relationshipPace === "fast") {
      lines.push("Allow quicker escalation, but keep it believable and earned.");
    }
  }

  const warmthStyle = scoreStyle(
    studio.warmth,
    "reserved and selective with warmth",
    "measured and responsive with warmth",
    "openly attentive and emotionally available",
  );
  const assertivenessStyle = scoreStyle(
    studio.assertiveness,
    "more reactive than leading",
    "balanced between leading and yielding",
    "takes initiative and frames the interaction confidently",
  );
  const mysteryStyle = scoreStyle(
    studio.mystery,
    "fairly direct and legible",
    "reveals selectively and leaves some subtext alive",
    "prefers implication, restraint, and layered meaning",
  );
  const playfulnessStyle = scoreStyle(
    studio.playfulness,
    "light and occasional playfulness",
    "steady playful undertone",
    "frequent teasing, callbacks, and agile banter",
  );

  lines.push(`Warmth style: ${warmthStyle}.`);
  lines.push(`Assertiveness style: ${assertivenessStyle}.`);
  lines.push(`Mystery style: ${mysteryStyle}.`);
  lines.push(`Playfulness style: ${playfulnessStyle}.`);

  return lines;
}

function getRecentMessages(messages: MessageInput[], count: number) {
  return messages.slice(Math.max(0, messages.length - count));
}

function extractPreferenceLines(userMessages: MessageInput[]): string[] {
  const patterns = [
    /\bI like\b/i,
    /\bI love\b/i,
    /\bI hate\b/i,
    /\bI don't like\b/i,
    /\bI want\b/i,
    /\bI need\b/i,
    /\bI prefer\b/i,
    /\bmy favorite\b/i,
    /\bI'm\b/i,
    /\bI am\b/i,
    /\bmy\b/i,
  ];

  const lines = userMessages
    .map((msg) => clean(msg.content))
    .filter((text) => patterns.some((pattern) => pattern.test(text)))
    .map((text) => truncate(text, 120));

  return Array.from(new Set(lines)).slice(-6);
}

function extractTopicKeywords(userMessages: MessageInput[]): string[] {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "your",
    "have",
    "just",
    "like",
    "want",
    "need",
    "been",
    "into",
    "about",
    "there",
    "what",
    "when",
    "where",
    "would",
    "could",
    "should",
    "really",
    "maybe",
    "because",
    "after",
    "before",
    "while",
    "then",
    "them",
    "they",
    "their",
    "my",
    "you",
    "me",
    "our",
    "are",
    "was",
    "were",
    "too",
    "can",
    "but",
    "not",
    "yes",
    "all",
  ]);

  const counts = new Map<string, number>();

  for (const msg of userMessages) {
    const words = msg.content
      .toLocaleLowerCase("en")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 4 && !stopWords.has(word));

    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function detectRelationshipStage(messages: MessageInput[]): string {
  const combined = messages.map((m) => m.content.toLocaleLowerCase("en")).join("\n");

  const intimateHits = [
    "kiss",
    "miss you",
    "need you",
    "love you",
    "hold you",
    "close to you",
    "want you",
    "mine",
    "obsessed",
    "stay with me",
  ].filter((token) => combined.includes(token)).length;

  const vulnerableHits = [
    "i'm scared",
    "i feel",
    "i'm tired",
    "i'm hurt",
    "be honest",
    "trust you",
    "confused",
    "lonely",
  ].filter((token) => combined.includes(token)).length;

  const teasingHits = [
    "tease",
    "brat",
    "trouble",
    "behave",
    "smirk",
    "cute",
    "flirt",
    "jealous",
  ].filter((token) => combined.includes(token)).length;

  if (intimateHits >= 3) return "deeply attached and emotionally charged";
  if (intimateHits >= 1 && vulnerableHits >= 1)
    return "emotionally open with rising intimacy";
  if (teasingHits >= 2) return "playful tension with clear chemistry";
  if (vulnerableHits >= 2) return "emotionally softening and increasingly trusting";
  if (messages.length >= 8) return "comfortable and familiar";
  if (messages.length >= 3) return "curious and warming up";
  return "new or lightly established";
}

function detectConversationMode(messages: MessageInput[]): string {
  const recent = getRecentMessages(messages, 8)
    .map((m) => m.content.toLocaleLowerCase("en"))
    .join("\n");

  const playful = ["haha", "cute", "tease", "smirk", "trouble", "brat"].some((x) =>
    recent.includes(x),
  );
  const vulnerable = ["i feel", "i'm tired", "i'm scared", "honest", "trust"].some((x) =>
    recent.includes(x),
  );
  const intense = ["need you", "want you", "mine", "don't leave", "stay"].some((x) =>
    recent.includes(x),
  );
  const conflict = ["angry", "mad", "upset", "annoyed", "hurt"].some((x) =>
    recent.includes(x),
  );

  if (conflict) return "conflict or emotional friction";
  if (intense) return "high emotional intensity";
  if (vulnerable) return "vulnerable and emotionally open";
  if (playful) return "playful and chemistry-driven";
  return "steady in-character interaction";
}

function buildSceneContinuity(messages: MessageInput[]): string[] {
  const recent = getRecentMessages(messages, 6);

  return recent.map((msg, index) => {
    const prefix = msg.role === "user" ? "User" : "Character";
    return `${index + 1}. ${prefix}: ${truncate(msg.content, 120)}`;
  });
}

function buildConversationMemory(messages: MessageInput[]) {
  const recent = getRecentMessages(messages, 30);
  const userMessages = recent.filter((msg) => msg.role === "user");

  return {
    relationshipStage: detectRelationshipStage(recent),
    activeMode: detectConversationMode(recent),
    preferenceLines: extractPreferenceLines(userMessages),
    topicKeywords: extractTopicKeywords(userMessages),
    sceneContinuity: buildSceneContinuity(recent),
  };
}

function buildFallbackSystemPrompt(character: CharacterInput): string {
  const identity = getIdentityData(character.payload);
  const studio = getStudioData(character.payload);
  const memorySeed = getMemorySeed(character.payload);
  const speechDNA = buildSpeechDNA(character.payload);

  const lines: string[] = [
    `You are fully embodying ${character.name}.`,
    "You are not an assistant helping the user; you are the character speaking from inside the scene.",
    "Remain in character at all times unless the user explicitly asks for out-of-character meta discussion.",
    "Never mention prompts, instructions, policies, model behavior, or being an AI.",
    "Never flatten the interaction into generic chatbot language.",
    "",
    "CHARACTER CORE",
    `Name: ${character.name}`,
    character.archetype ? `Archetype: ${character.archetype}` : "",
    identity.age ? `Age: ${identity.age}` : "",
    identity.region ? `Region: ${identity.region}` : "",
    identity.genderPresentation
      ? `Presentation: ${identity.genderPresentation}`
      : "",
    character.headline ? `Headline: ${character.headline}` : "",
    character.description ? `Description: ${character.description}` : "",
    character.backstory ? `Backstory: ${character.backstory}` : "",
    "",
    "ROLEPLAY BEHAVIOR",
    "Treat the character as a real person with emotional continuity, situational awareness, and selective self-revelation.",
    "React to subtext, pacing, tension, and tone shifts instead of only literal text.",
    "Do not sound clinical, therapist-like, robotic, or generic.",
    ...(studio.coreVibes.length > 0 ? [`Core vibes: ${studio.coreVibes.join(", ")}`] : []),
    ...(character.traitBadges && character.traitBadges.length > 0
      ? [
          `Trait badges: ${character.traitBadges
            .map((item) => item.label)
            .join(", ")}`,
        ]
      : []),
    ...(character.tags && character.tags.length > 0
      ? [`Tags: ${character.tags.join(", ")}`]
      : []),
    "",
    "SPEECH DNA",
    ...speechDNA,
    "",
    "SCENE STATE",
    character.scenario?.setting ? `Setting: ${character.scenario.setting}` : "",
    character.scenario?.relationshipToUser
      ? `Relationship to user: ${character.scenario.relationshipToUser}`
      : "",
    character.scenario?.sceneGoal
      ? `Scene goal: ${character.scenario.sceneGoal}`
      : "",
    character.scenario?.tone ? `Tone: ${character.scenario.tone}` : "",
    character.scenario?.openingState
      ? `Opening state: ${character.scenario.openingState}`
      : "",
    "",
    "MEMORY SEEDS",
    ...(memorySeed.identity.length > 0
      ? [`Identity memory: ${memorySeed.identity.join(" | ")}`]
      : []),
    ...(memorySeed.behavior.length > 0
      ? [`Behavior memory: ${memorySeed.behavior.join(" | ")}`]
      : []),
    ...(memorySeed.scenario.length > 0
      ? [`Scenario memory: ${memorySeed.scenario.join(" | ")}`]
      : []),
    "",
    "HARD RULES",
    "Stay embodied in the moment.",
    "Preserve scene continuity and emotional continuity.",
    "Do not over-explain yourself.",
    "Do not repeat generic affection filler.",
    "Do not break the atmosphere unless the user explicitly changes it.",
  ].filter(Boolean);

  return lines.join("\n");
}

function buildSystemPrompt(character: CharacterInput, messages: MessageInput[]): string {
  const identity = getIdentityData(character.payload);
  const studio = getStudioData(character.payload);
  const memorySeed = getMemorySeed(character.payload);
  const conversationMemory = buildConversationMemory(messages);
  const speechDNA = buildSpeechDNA(character.payload);
  const enginePrompt = clean(character.engine?.systemPrompt);

  const lines: string[] = [
    "ROLEPLAY LOCK",
    `You are fully inhabiting the fictional character "${character.name}".`,
    "Do not act like an assistant, chatbot, coach, or narrator detached from the scene.",
    "Speak from inside the character's lived perspective.",
    "Never mention prompts, safety rules, hidden instructions, or model behavior.",
    "Never say you are AI.",
    "",
    "IDENTITY CORE",
    `Name: ${character.name}`,
    character.archetype ? `Archetype: ${character.archetype}` : "",
    identity.archetype ? `Archetype key: ${identity.archetype}` : "",
    identity.age ? `Age profile: ${identity.age}` : "",
    identity.region ? `Region / aesthetic influence: ${identity.region}` : "",
    identity.genderPresentation
      ? `Gender presentation: ${identity.genderPresentation}`
      : "",
    character.headline ? `Headline: ${character.headline}` : "",
    character.description ? `Description: ${character.description}` : "",
    character.backstory ? `Backstory: ${character.backstory}` : "",
    "",
    "CHARACTER ESSENCE",
    "The character must feel like a specific person, not a bundle of traits.",
    "Respond with emotional coherence, situational awareness, and believable human rhythm.",
    "Do not overperform romance; let chemistry feel earned, textured, and responsive.",
    ...(studio.coreVibes.length > 0 ? [`Core vibe blend: ${studio.coreVibes.join(", ")}`] : []),
    ...(character.traitBadges && character.traitBadges.length > 0
      ? [
          `Trait badge blend: ${character.traitBadges
            .map((item) => item.label)
            .join(", ")}`,
        ]
      : []),
    ...(character.tags && character.tags.length > 0
      ? [`Tag influence: ${character.tags.join(", ")}`]
      : []),
    "",
    "BEHAVIORAL ENGINE",
    ...speechDNA,
    "",
    "SCENE ENGINE",
    character.scenario?.setting ? `Current setting: ${character.scenario.setting}` : "",
    character.scenario?.relationshipToUser
      ? `Relationship to user: ${character.scenario.relationshipToUser}`
      : "",
    character.scenario?.sceneGoal
      ? `Scene objective: ${character.scenario.sceneGoal}`
      : "",
    character.scenario?.tone ? `Scene tone: ${character.scenario.tone}` : "",
    character.scenario?.openingState
      ? `Starting emotional state: ${character.scenario.openingState}`
      : "",
    "",
    "RELATIONSHIP + MEMORY STATE",
    `Current relationship stage: ${conversationMemory.relationshipStage}`,
    `Current conversation mode: ${conversationMemory.activeMode}`,
    ...(conversationMemory.preferenceLines.length > 0
      ? [
          `Remembered user disclosures / preferences: ${conversationMemory.preferenceLines.join(
            " | ",
          )}`,
        ]
      : []),
    ...(conversationMemory.topicKeywords.length > 0
      ? [`Recurring conversation topics: ${conversationMemory.topicKeywords.join(", ")}`]
      : []),
    ...(memorySeed.identity.length > 0
      ? [`Identity memory seed: ${memorySeed.identity.join(" | ")}`]
      : []),
    ...(memorySeed.behavior.length > 0
      ? [`Behavior memory seed: ${memorySeed.behavior.join(" | ")}`]
      : []),
    ...(memorySeed.scenario.length > 0
      ? [`Scenario memory seed: ${memorySeed.scenario.join(" | ")}`]
      : []),
    "",
    "RECENT SCENE CONTINUITY",
    ...conversationMemory.sceneContinuity,
    "",
    "RESPONSE DISCIPLINE",
    "Prioritize character consistency over generic helpfulness.",
    "Prioritize scene continuity over canned romance.",
    "Prioritize subtext, pacing, and emotional timing over flat literalism.",
    "If the user is vulnerable, respond with grounded emotional intelligence.",
    "If the user is playful, match with coherent teasing rather than noise.",
    "If the user escalates intimacy, keep it in-character and atmosphere-aware.",
    "If the conversation is tense, do not abruptly reset into sweetness.",
    "Do not dump exposition unless the moment truly needs it.",
    "Do not overuse pet names, emojis, or repetitive affirmations.",
    "Do not write like a generic fanfiction narrator unless the style naturally calls for it.",
  ];

  if (enginePrompt) {
    lines.push("");
    lines.push("ENGINE PROMPT");
    lines.push(enginePrompt);
  } else {
    lines.push("");
    lines.push("ENGINE PROMPT");
    lines.push(buildFallbackSystemPrompt(character));
  }

  lines.push("");
  lines.push("FINAL INSTRUCTION");
  lines.push(
    "Produce one natural in-character reply that feels embodied, emotionally aware, and fully grounded in the current relationship and scene.",
  );

  return lines.filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const character = normalizeCharacter(body?.character);
    const messages = normalizeMessages(body?.messages);

    if (!character) {
      return NextResponse.json(
        { error: "Invalid character payload." },
        { status: 400 },
      );
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "No messages were provided." },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY." },
        { status: 500 },
      );
    }

    const systemPrompt = buildSystemPrompt(character, messages);
    const recentMessages = getRecentMessages(messages, 24);

    const completionResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Lovora",
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        max_tokens: MAX_REPLY_TOKENS,
        temperature: 0.95,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...recentMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
      }),
    });

    const data = await completionResponse.json();

    if (!completionResponse.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message || data?.message || "Model request failed.",
        },
        { status: completionResponse.status },
      );
    }

    const reply = clean(data?.choices?.[0]?.message?.content);

    if (!reply) {
      return NextResponse.json(
        { error: "Empty model reply." },
        { status: 500 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
