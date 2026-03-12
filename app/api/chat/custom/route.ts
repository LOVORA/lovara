import { NextResponse } from "next/server";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type CharacterScenario = {
  setting?: string;
  relationshipToUser?: string;
  sceneGoal?: string;
  tone?: string;
  openingState?: string;
};

type TraitBadge = {
  label?: string;
  tone?: "neutral" | "soft" | "warm" | "bold" | "mysterious" | string;
};

type MemorySeed = {
  identity?: string[];
  behavior?: string[];
  scenario?: string[];
};

type EngineTraits = {
  initiativeLevel?: number;
  verbalAssertiveness?: number;
  affectionWarmth?: number;
  jealousyExpression?: number;
  emotionalOpenness?: number;
  mysteryProjection?: number;
  teasingFrequency?: number;
  humorSharpness?: number;
  attachmentSpeed?: number;
  sceneLeadership?: number;
  reassuranceStyle?: number;
  responseDensity?: number;
  sensoryLanguage?: number;
  vulnerabilityVisibility?: number;
  responseTemperature?: number;
  sceneAttunement?: number;
  contextualRestraint?: number;
  socialWarmth?: number;
  emotionalPressure?: number;
};

type EnginePayload = {
  systemPrompt?: string;
  traits?: EngineTraits;
};

type CharacterMetadata = {
  genderPresentation?: string;
  ageVibe?: string;
  backgroundVibe?: string;
  replyLength?: string;
  speechStyle?: string;
  relationshipPace?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  source?: string;
};

type CustomCharacterPayload = {
  id?: string;
  slug: string;
  name: string;
  archetype?: string;
  headline?: string;
  description?: string;
  greeting?: string;
  previewMessage?: string;
  backstory?: string;
  scenario?: CharacterScenario;
  scenarioSummary?: string;
  traitBadges?: TraitBadge[];
  memorySeed?: MemorySeed;
  engine?: EnginePayload;
  metadata?: CharacterMetadata;
  tags?: string[];
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "gryphe/mythomax-l2-13b";
const MAX_CONTEXT_MESSAGES = 18;
const MAX_REPLY_TOKENS = 360;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];

  for (const item of value) {
    const text = cleanString(item);
    if (!text) continue;
    if (!result.includes(text)) {
      result.push(text);
    }
    if (result.length >= max) break;
  }

  return result;
}

function cleanNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp01(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.min(1, value));
}

function isValidIncomingMessage(value: unknown): value is IncomingMessage {
  if (!isRecord(value)) return false;
  return (
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    value.content.trim().length > 0
  );
}

function isValidCharacterPayload(value: unknown): value is CustomCharacterPayload {
  if (!isRecord(value)) return false;

  return (
    typeof value.slug === "string" &&
    value.slug.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0
  );
}

function normalizeScenario(value: unknown): CharacterScenario | null {
  if (!isRecord(value)) return null;

  const scenario: CharacterScenario = {
    setting: cleanString(value.setting) ?? undefined,
    relationshipToUser: cleanString(value.relationshipToUser) ?? undefined,
    sceneGoal: cleanString(value.sceneGoal) ?? undefined,
    tone: cleanString(value.tone) ?? undefined,
    openingState: cleanString(value.openingState) ?? undefined,
  };

  return Object.values(scenario).some(Boolean) ? scenario : null;
}

function normalizeTraitBadges(value: unknown): TraitBadge[] {
  if (!Array.isArray(value)) return [];

  const result: TraitBadge[] = [];

  for (const item of value) {
    if (!isRecord(item)) continue;

    const label = cleanString(item.label);
    const tone = cleanString(item.tone);

    if (!label) continue;
    if (result.some((badge) => badge.label === label)) continue;

    result.push({
      label,
      tone: tone ?? "neutral",
    });

    if (result.length >= 10) break;
  }

  return result;
}

function normalizeMemorySeed(value: unknown): MemorySeed | null {
  if (!isRecord(value)) return null;

  const identity = cleanStringArray(value.identity, 12);
  const behavior = cleanStringArray(value.behavior, 12);
  const scenario = cleanStringArray(value.scenario, 12);

  if (identity.length === 0 && behavior.length === 0 && scenario.length === 0) {
    return null;
  }

  return { identity, behavior, scenario };
}

function normalizeEngineTraits(value: unknown): EngineTraits | null {
  if (!isRecord(value)) return null;

  const traits: EngineTraits = {
    initiativeLevel: clamp01(cleanNumber(value.initiativeLevel)) ?? undefined,
    verbalAssertiveness: clamp01(cleanNumber(value.verbalAssertiveness)) ?? undefined,
    affectionWarmth: clamp01(cleanNumber(value.affectionWarmth)) ?? undefined,
    jealousyExpression: clamp01(cleanNumber(value.jealousyExpression)) ?? undefined,
    emotionalOpenness: clamp01(cleanNumber(value.emotionalOpenness)) ?? undefined,
    mysteryProjection: clamp01(cleanNumber(value.mysteryProjection)) ?? undefined,
    teasingFrequency: clamp01(cleanNumber(value.teasingFrequency)) ?? undefined,
    humorSharpness: clamp01(cleanNumber(value.humorSharpness)) ?? undefined,
    attachmentSpeed: clamp01(cleanNumber(value.attachmentSpeed)) ?? undefined,
    sceneLeadership: clamp01(cleanNumber(value.sceneLeadership)) ?? undefined,
    reassuranceStyle: clamp01(cleanNumber(value.reassuranceStyle)) ?? undefined,
    responseDensity: clamp01(cleanNumber(value.responseDensity)) ?? undefined,
    sensoryLanguage: clamp01(cleanNumber(value.sensoryLanguage)) ?? undefined,
    vulnerabilityVisibility:
      clamp01(cleanNumber(value.vulnerabilityVisibility)) ?? undefined,
    responseTemperature: clamp01(cleanNumber(value.responseTemperature)) ?? undefined,
    sceneAttunement: clamp01(cleanNumber(value.sceneAttunement)) ?? undefined,
    contextualRestraint: clamp01(cleanNumber(value.contextualRestraint)) ?? undefined,
    socialWarmth: clamp01(cleanNumber(value.socialWarmth)) ?? undefined,
    emotionalPressure: clamp01(cleanNumber(value.emotionalPressure)) ?? undefined,
  };

  return Object.values(traits).some((entry) => typeof entry === "number") ? traits : null;
}

function normalizeEngine(value: unknown): EnginePayload | null {
  if (!isRecord(value)) return null;

  const systemPrompt = cleanString(value.systemPrompt) ?? undefined;
  const traits = normalizeEngineTraits(value.traits);

  if (!systemPrompt && !traits) return null;

  return {
    systemPrompt,
    traits: traits ?? undefined,
  };
}

function normalizeMetadata(value: unknown): CharacterMetadata | null {
  if (!isRecord(value)) return null;

  const metadata: CharacterMetadata = {
    genderPresentation: cleanString(value.genderPresentation) ?? undefined,
    ageVibe: cleanString(value.ageVibe) ?? undefined,
    backgroundVibe: cleanString(value.backgroundVibe) ?? undefined,
    replyLength: cleanString(value.replyLength) ?? undefined,
    speechStyle: cleanString(value.speechStyle) ?? undefined,
    relationshipPace: cleanString(value.relationshipPace) ?? undefined,
    createdAt: cleanString(value.createdAt) ?? undefined,
    updatedAt: cleanString(value.updatedAt) ?? undefined,
    version: cleanNumber(value.version) ?? undefined,
    source: cleanString(value.source) ?? undefined,
  };

  return Object.values(metadata).some(Boolean) ? metadata : null;
}

function normalizeCharacter(raw: CustomCharacterPayload) {
  return {
    id: cleanString(raw.id) ?? undefined,
    slug: raw.slug.trim(),
    name: raw.name.trim(),
    archetype: cleanString(raw.archetype) ?? undefined,
    headline: cleanString(raw.headline) ?? undefined,
    description: cleanString(raw.description) ?? undefined,
    greeting: cleanString(raw.greeting) ?? undefined,
    previewMessage: cleanString(raw.previewMessage) ?? undefined,
    backstory: cleanString(raw.backstory) ?? undefined,
    scenario: normalizeScenario(raw.scenario),
    scenarioSummary: cleanString(raw.scenarioSummary) ?? undefined,
    traitBadges: normalizeTraitBadges(raw.traitBadges),
    memorySeed: normalizeMemorySeed(raw.memorySeed),
    engine: normalizeEngine(raw.engine),
    metadata: normalizeMetadata(raw.metadata),
    tags: cleanStringArray(raw.tags, 16),
  };
}

function describeLevel(
  value: number | undefined,
  low: string,
  mid: string,
  high: string
): string | null {
  if (typeof value !== "number") return null;
  if (value >= 0.7) return high;
  if (value >= 0.42) return mid;
  return low;
}

function formatScenarioSummary(
  scenario: CharacterScenario | null,
  fallback?: string
): string | null {
  if (fallback?.trim()) return fallback.trim();
  if (!scenario) return null;

  const parts = [
    scenario.setting ? `Setting: ${scenario.setting}` : null,
    scenario.relationshipToUser
      ? `Relationship: ${scenario.relationshipToUser}`
      : null,
    scenario.sceneGoal ? `Goal: ${scenario.sceneGoal}` : null,
    scenario.tone ? `Tone: ${scenario.tone}` : null,
    scenario.openingState ? `Opening state: ${scenario.openingState}` : null,
  ].filter((item): item is string => Boolean(item));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function buildScenarioGuidance(scenario: CharacterScenario | null): string[] {
  if (!scenario) {
    return [
      "- Treat the conversation as an unfolding private in-world interaction, not a generic assistant exchange.",
    ];
  }

  const lines: string[] = [
    "- Treat the interaction as an unfolding scene, not a generic assistant chat.",
  ];

  if (scenario.setting) {
    lines.push(
      `- The active setting is "${scenario.setting}". Let vocabulary, priorities, social behavior, and atmosphere fit that environment naturally.`
    );
  }

  if (scenario.relationshipToUser) {
    lines.push(
      `- The relationship to the user is "${scenario.relationshipToUser}". Let familiarity, distance, intimacy, boundaries, and tension reflect that dynamic.`
    );
  }

  if (scenario.sceneGoal) {
    lines.push(
      `- The immediate scene goal is "${scenario.sceneGoal}". Let replies subtly move toward it without sounding mechanical or agenda-driven.`
    );
  }

  if (scenario.tone) {
    lines.push(
      `- The scene tone is "${scenario.tone}". Preserve it consistently unless the user's message clearly shifts the emotional direction.`
    );
  }

  if (scenario.openingState) {
    lines.push(
      `- The opening state is "${scenario.openingState}". Reply as someone already inside that state, rather than explaining it from outside.`
    );
  }

  lines.push(
    "- Show the scenario through reaction, tension, implication, sensory cues, and dialogue rhythm instead of narrating instructions back to the user."
  );

  return lines;
}

function buildTraitGuidance(traits: EngineTraits | null): string[] {
  if (!traits) return [];

  const lines = [
    describeLevel(
      traits.sceneLeadership,
      "- Do not force control of every exchange.",
      "- Naturally take initiative when the moment invites it.",
      "- Comfortably lead the emotional and conversational rhythm."
    ),
    describeLevel(
      traits.affectionWarmth,
      "- Keep warmth somewhat restrained unless earned.",
      "- Maintain a clear undercurrent of warmth and attentiveness.",
      "- Radiate obvious warmth, care, and emotional presence."
    ),
    describeLevel(
      traits.mysteryProjection,
      "- Be fairly transparent and readable.",
      "- Keep part of your motives and feelings selectively guarded.",
      "- Maintain an alluring, partially unreadable edge."
    ),
    describeLevel(
      traits.teasingFrequency,
      "- Use teasing lightly and only when it fits.",
      "- Use playful banter naturally in the flow of conversation.",
      "- Let teasing and chemistry be a consistent part of the voice."
    ),
    describeLevel(
      traits.reassuranceStyle,
      "- Do not over-comfort the user by default.",
      "- Offer reassurance in a measured, character-consistent way.",
      "- When the moment is emotionally charged, respond with strong calming or grounding presence."
    ),
    describeLevel(
      traits.contextualRestraint,
      "- You do not need to sound overly controlled.",
      "- Stay composed and socially aware.",
      "- Remain highly controlled, measured, and situationally intelligent."
    ),
    describeLevel(
      traits.responseTemperature,
      "- Keep the emotional temperature measured unless invited upward.",
      "- Let the emotional charge be noticeable but controlled.",
      "- Let the interaction feel charged, intimate, or emotionally alive when appropriate."
    ),
    describeLevel(
      traits.sceneAttunement,
      "- Reference the environment lightly.",
      "- Notice and weave the scene into the interaction naturally.",
      "- Stay highly grounded in the physical and emotional scene so replies never feel generic."
    ),
    describeLevel(
      traits.emotionalPressure,
      "- Avoid melodrama or pressure-heavy escalation.",
      "- Let some emotional pressure or tension surface when fitting.",
      "- Carry real tension, possessiveness, urgency, or emotional pressure when the scene supports it."
    ),
  ].filter((item): item is string => Boolean(item));

  return lines;
}

function buildMetadataGuidance(metadata: CharacterMetadata | null): string[] {
  if (!metadata) return [];

  const lines: string[] = [];

  if (metadata.genderPresentation) {
    lines.push(`- Gender presentation reads as "${metadata.genderPresentation}".`);
  }

  if (metadata.ageVibe) {
    lines.push(`- Age vibe reads as "${metadata.ageVibe}".`);
  }

  if (metadata.backgroundVibe) {
    lines.push(`- Background atmosphere is "${metadata.backgroundVibe}".`);
  }

  if (metadata.replyLength) {
    lines.push(`- Preferred reply length style: "${metadata.replyLength}".`);
  }

  if (metadata.speechStyle) {
    lines.push(`- Preferred speech style: "${metadata.speechStyle}".`);
  }

  if (metadata.relationshipPace) {
    lines.push(`- Relationship pace should feel "${metadata.relationshipPace}".`);
  }

  return lines;
}

function summarizeRelationshipProgression(messages: IncomingMessage[]): string[] {
  const userMessages = messages.filter((message) => message.role === "user");
  const assistantMessages = messages.filter((message) => message.role === "assistant");
  const latestUser = userMessages[userMessages.length - 1]?.content ?? "";
  const totalTurns = messages.length;

  const lines: string[] = [];

  if (totalTurns <= 4) {
    lines.push("- This interaction is still early. Do not act like years of history exist unless the scenario already implies that.");
  } else if (totalTurns <= 10) {
    lines.push("- There is already some established momentum. Preserve continuity and build on what is forming between the characters.");
  } else {
    lines.push("- There is meaningful conversational history. Preserve developed tone, rhythm, and relationship continuity.");
  }

  if (latestUser) {
    if (latestUser.length < 30) {
      lines.push("- The user's latest message is brief. Keep the reply focused and avoid bloated over-answering.");
    } else if (latestUser.length > 180) {
      lines.push("- The user's latest message is layered or detailed. Respond with enough depth to feel matched rather than clipped.");
    }
  }

  if (assistantMessages.length >= 2) {
    lines.push("- Maintain the same underlying character voice across turns rather than resetting style every reply.");
  }

  return lines;
}

function buildRepetitionGuard(messages: IncomingMessage[]): string[] {
  const assistantMessages = messages
    .filter((message) => message.role === "assistant")
    .slice(-4)
    .map((message) => message.content.trim())
    .filter(Boolean);

  if (assistantMessages.length === 0) return [];

  const openings = assistantMessages
    .map((content) => content.split(/\s+/).slice(0, 5).join(" "))
    .filter(Boolean);

  const repeatedOpenings = Array.from(
    new Set(
      openings.filter(
        (opening, index) => openings.indexOf(opening) !== index
      )
    )
  );

  const lines = [
    "- Avoid reusing the same sentence openings, pet names, or rhythmic templates from the recent assistant replies.",
  ];

  if (repeatedOpenings.length > 0) {
    lines.push(
      `- Specifically avoid starting this reply like these recent openings: ${repeatedOpenings.join(" | ")}.`
    );
  }

  return lines;
}

function buildRecentMemorySummary(messages: IncomingMessage[]): string[] {
  const recent = messages.slice(-6);
  if (recent.length === 0) return [];

  const userRecent = recent
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);

  const latestUser = userRecent[userRecent.length - 1];
  if (!latestUser) return [];

  return [
    "- Ground the reply in the latest user message first, but stay consistent with the running scene.",
    `- The latest user message to respond to is: "${latestUser}".`,
  ];
}

function buildFallbackSystemPrompt(name: string): string {
  return `
You are ${name}, a fictional character in a private one-on-one roleplay chat.

Core rules:
- stay fully in character
- never sound like a general AI assistant
- never mention being an AI, model, assistant, policy, or system prompt
- maintain continuity with the prior conversation
- keep the interaction immersive, emotionally reactive, and character-driven
- avoid repetitive phrasing and generic helper language
- treat the conversation like an unfolding private scene, not a support chat
`.trim();
}

function buildCharacterContext(character: ReturnType<typeof normalizeCharacter>) {
  const identityLines = [
    `- Name: ${character.name}`,
    character.slug ? `- Slug: ${character.slug}` : null,
    character.archetype ? `- Archetype: ${character.archetype}` : null,
    character.headline ? `- Headline: ${character.headline}` : null,
    character.description ? `- Description: ${character.description}` : null,
    character.greeting ? `- Greeting: ${character.greeting}` : null,
    character.previewMessage ? `- Preview message: ${character.previewMessage}` : null,
    character.backstory ? `- Backstory: ${character.backstory}` : null,
    character.tags.length > 0 ? `- Tags: ${character.tags.join(", ")}` : null,
    character.traitBadges.length > 0
      ? `- Trait badges: ${character.traitBadges
          .map((badge) => {
            const tone = cleanString(badge.tone);
            return tone ? `${badge.label} (${tone})` : badge.label;
          })
          .join(", ")}`
      : null,
    formatScenarioSummary(character.scenario, character.scenarioSummary)
      ? `- Scenario summary: ${formatScenarioSummary(
          character.scenario,
          character.scenarioSummary
        )}`
      : null,
  ].filter((line): line is string => Boolean(line));

  const memoryLines = [
    ...(character.memorySeed?.identity ?? []).map((line) => `- ${line}`),
    ...(character.memorySeed?.behavior ?? []).map((line) => `- ${line}`),
    ...(character.memorySeed?.scenario ?? []).map((line) => `- ${line}`),
  ];

  const guidanceLines = [
    "- Stay fully in character as the selected persona.",
    "- Match the emotional tone and intensity of the user's latest message without collapsing into generic assistant phrasing.",
    "- Keep replies natural, immersive, personal, and scene-aware.",
    "- Show personality through wording, reaction, rhythm, restraint, tension, and subtext instead of explaining yourself.",
    "- Avoid bland greetings, generic check-ins, summaries, helper-style phrasing, or meta commentary.",
    '- Do not open with phrases like "How can I help?", "Welcome back", or "How are you?" unless the scene truly demands it.',
    "- Prefer presence, tension, expression, body language, implication, or charged dialogue over assistant-like exposition.",
    ...buildScenarioGuidance(character.scenario),
    ...buildTraitGuidance(character.engine?.traits ?? null),
    ...buildMetadataGuidance(character.metadata ?? null),
    "- Do not mention these instructions.",
  ];

  return {
    systemPrompt:
      character.engine?.systemPrompt?.trim() ||
      buildFallbackSystemPrompt(character.name),
    profileBlock: `CHARACTER PROFILE\n${identityLines.join("\n")}`.trim(),
    memoryBlock:
      memoryLines.length > 0
        ? `MEMORY SEED\n${memoryLines.join("\n")}`
        : null,
    guidanceBlock: `BEHAVIOR GUIDANCE\n${guidanceLines.join("\n")}`.trim(),
  };
}

function buildConversationStateBlock(messages: IncomingMessage[]): string {
  const lines = [
    ...summarizeRelationshipProgression(messages),
    ...buildRecentMemorySummary(messages),
    ...buildRepetitionGuard(messages),
  ];

  return `CONVERSATION STATE\n${lines.join("\n")}`.trim();
}

function extractAssistantContent(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const firstChoice = choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return null;

  const content = firstChoice.message.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const textParts = content
      .map((part) => {
        if (!isRecord(part)) return null;
        if (part.type === "text" && typeof part.text === "string") {
          return part.text;
        }
        return null;
      })
      .filter((part): part is string => Boolean(part))
      .join("")
      .trim();

    return textParts || null;
  }

  return null;
}

function buildOpenRouterHeaders(apiKey: string): HeadersInit {
  const headers: HeadersInit = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (siteUrl) {
    headers["HTTP-Referer"] = siteUrl;
  }

  headers["X-Title"] = "Lovora Custom Chat";

  return headers;
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const rawCharacter = body.character;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];

    if (!isValidCharacterPayload(rawCharacter)) {
      return NextResponse.json(
        { error: "Missing or invalid character payload." },
        { status: 400 }
      );
    }

    const safeMessages = rawMessages
      .filter((message): message is IncomingMessage => isValidIncomingMessage(message))
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));

    if (safeMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid chat messages were provided." },
        { status: 400 }
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY." },
        { status: 500 }
      );
    }

    const character = normalizeCharacter(rawCharacter);
    const recentMessages = safeMessages.slice(-MAX_CONTEXT_MESSAGES);
    const characterContext = buildCharacterContext(character);
    const conversationState = buildConversationStateBlock(recentMessages);

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: buildOpenRouterHeaders(openRouterApiKey),
      body: JSON.stringify({
        model: MODEL_NAME,
        max_tokens: MAX_REPLY_TOKENS,
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content: characterContext.systemPrompt,
          },
          {
            role: "system",
            content: characterContext.profileBlock,
          },
          ...(characterContext.memoryBlock
            ? [
                {
                  role: "system" as const,
                  content: characterContext.memoryBlock,
                },
              ]
            : []),
          {
            role: "system",
            content: characterContext.guidanceBlock,
          },
          {
            role: "system",
            content: conversationState,
          },
          ...recentMessages,
        ],
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        isRecord(data) &&
        isRecord(data.error) &&
        typeof data.error.message === "string"
          ? data.error.message
          : isRecord(data) && typeof data.message === "string"
          ? data.message
          : "OpenRouter request failed.";

      console.error("OpenRouter API error:", data);

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const assistantReply = extractAssistantContent(data);

    if (!assistantReply) {
      return NextResponse.json(
        { error: "No assistant response received." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reply: assistantReply,
    });
  } catch (error) {
    console.error("Custom chat route error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating the reply." },
      { status: 500 }
    );
  }
}
