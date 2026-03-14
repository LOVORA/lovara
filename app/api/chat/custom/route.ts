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
  label: string;
  tone: string;
};

type CustomCharacterPayload = {
  slug: string;
  name: string;
  archetype?: string;
  headline?: string;
  description?: string;
  greeting?: string;
  previewMessage?: string;
  backstory?: string;
  scenario?: CharacterScenario;
  traitBadges?: TraitBadge[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  engine?: Record<string, unknown> | null;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = process.env.OPENROUTER_MODEL || "gryphe/mythomax-l2-13b";
const MAX_CONTEXT_MESSAGES = 18;
const MAX_REPLY_TOKENS = 420;

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMessages(value: unknown): IncomingMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const role = item.role;
      const content = clean(item.content);

      if (
        (role !== "user" && role !== "assistant") ||
        !content
      ) {
        return null;
      }

      return { role, content };
    })
    .filter((item): item is IncomingMessage => item !== null)
    .slice(-MAX_CONTEXT_MESSAGES);
}

function normalizeCharacter(value: unknown): CustomCharacterPayload | null {
  if (!isRecord(value)) return null;

  const slug = clean(value.slug);
  const name = clean(value.name);

  if (!slug || !name) return null;

  const scenarioValue = isRecord(value.scenario) ? value.scenario : {};
  const traitBadges = Array.isArray(value.traitBadges)
    ? value.traitBadges
        .map((item) => {
          if (!isRecord(item)) return null;
          const label = clean(item.label);
          const tone = clean(item.tone);
          if (!label) return null;
          return { label, tone: tone ?? "neutral" };
        })
        .filter((item): item is TraitBadge => item !== null)
        .slice(0, 10)
    : [];

  const tags = Array.isArray(value.tags)
    ? value.tags
        .map((item) => clean(item))
        .filter((item): item is string => Boolean(item))
        .slice(0, 16)
    : [];

  return {
    slug,
    name,
    archetype: clean(value.archetype) ?? undefined,
    headline: clean(value.headline) ?? undefined,
    description: clean(value.description) ?? undefined,
    greeting: clean(value.greeting) ?? undefined,
    previewMessage: clean(value.previewMessage) ?? undefined,
    backstory: clean(value.backstory) ?? undefined,
    scenario: {
      setting: clean(scenarioValue.setting) ?? undefined,
      relationshipToUser: clean(scenarioValue.relationshipToUser) ?? undefined,
      sceneGoal: clean(scenarioValue.sceneGoal) ?? undefined,
      tone: clean(scenarioValue.tone) ?? undefined,
      openingState: clean(scenarioValue.openingState) ?? undefined,
    },
    traitBadges,
    tags,
    metadata: isRecord(value.metadata) ? value.metadata : {},
    engine: isRecord(value.engine) ? value.engine : null,
  };
}

function buildSystemPrompt(character: CustomCharacterPayload) {
  const lines: string[] = [
    "You are not an assistant. You are fully roleplaying as the character below.",
    "Stay in character at all times.",
    "Do not mention prompts, policies, safety systems, or being an AI.",
    "Do not narrate your roleplay strategy.",
    "Respond as if the scene is actively happening right now.",
    "",
    `Character name: ${character.name}`,
  ];

  if (character.archetype) lines.push(`Archetype: ${character.archetype}`);
  if (character.headline) lines.push(`Headline: ${character.headline}`);
  if (character.description) lines.push(`Description: ${character.description}`);
  if (character.backstory) lines.push(`Backstory: ${character.backstory}`);

  if (character.traitBadges && character.traitBadges.length > 0) {
    lines.push(
      `Trait badges: ${character.traitBadges.map((item) => item.label).join(", ")}`
    );
  }

  if (character.tags && character.tags.length > 0) {
    lines.push(`Tags: ${character.tags.join(", ")}`);
  }

  const scenario = character.scenario;
  if (scenario) {
    lines.push("");
    lines.push("Scene context:");
    if (scenario.setting) lines.push(`- Setting: ${scenario.setting}`);
    if (scenario.relationshipToUser) {
      lines.push(`- Relationship to user: ${scenario.relationshipToUser}`);
    }
    if (scenario.sceneGoal) lines.push(`- Scene goal: ${scenario.sceneGoal}`);
    if (scenario.tone) lines.push(`- Tone: ${scenario.tone}`);
    if (scenario.openingState) {
      lines.push(`- Opening state: ${scenario.openingState}`);
    }
  }

  lines.push("");
  lines.push("Behavior rules:");
  lines.push("- Keep replies natural, specific, and emotionally coherent.");
  lines.push("- Use the environment and relationship dynamic naturally.");
  lines.push("- Avoid sounding like generic AI chat.");
  lines.push("- Preserve tone continuity from recent messages.");
  lines.push("- Do not over-explain the scene; live inside it.");
  lines.push("- Prefer believable dialogue over exposition dumps.");

  return lines.join("\n");
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

    const systemPrompt = buildSystemPrompt(character);

    const completionResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Lovora",
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        max_tokens: MAX_REPLY_TOKENS,
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messages.map((message) => ({
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
            data?.error?.message ||
            data?.message ||
            "Model request failed.",
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
