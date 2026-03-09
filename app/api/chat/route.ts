import { NextResponse } from "next/server";
import { getCharacterBySlug } from "../../../lib/characters";

type IncomingMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_CONTEXT_MESSAGES = 16;

function isValidIncomingMessage(message: unknown): message is IncomingMessage {
  if (!message || typeof message !== "object") return false;

  const candidate = message as IncomingMessage;

  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    candidate.content.trim().length > 0
  );
}

function buildCharacterContext(slug: string) {
  const character = getCharacterBySlug(slug);

  if (!character) return null;

  const scenarioText =
    character.scenarioStarters.length > 0
      ? character.scenarioStarters
          .map(
            (starter, index) =>
              `${index + 1}. ${starter.title}: ${starter.prompt} | Opening line: ${starter.openingMessage}`
          )
          .join("\n")
      : "No scenario starters provided.";

  const tagsText =
    character.tags.length > 0
      ? character.tags.map((tag) => `${tag.label} (${tag.category})`).join(", ")
      : "No tags provided.";

  const traitsText =
    character.traits.length > 0
      ? character.traits
          .map((trait) => `${trait.label}: ${trait.score}/100`)
          .join(", ")
      : "No trait scores provided.";

  const memoryText = [
    `Remembers name: ${character.memory.remembersName ? "yes" : "no"}`,
    `Remembers preferences: ${
      character.memory.remembersPreferences ? "yes" : "no"
    }`,
    `Remembers past chats: ${
      character.memory.remembersPastChats ? "yes" : "no"
    }`,
  ].join(", ");

  const supplementalContext = `
Character profile:
- Name: ${character.name}
- Slug: ${character.slug}
- Role: ${character.role}
- Headline: ${character.headline}
- Archetype: ${character.archetype}
- Description: ${character.description}
- Personality summary: ${character.personality}
- Backstory: ${character.backstory}
- Tags: ${tagsText}
- Traits: ${traitsText}
- Memory settings: ${memoryText}

Behavior guidance:
- Stay fully in character as ${character.name}.
- Match the emotional tone implied by the user's latest message.
- Keep the replies natural, immersive, and personal.
- Do not become generic, robotic, or assistant-like.
- Maintain continuity with prior messages.
- Avoid repeating the same phrasing across turns.
- When appropriate, reflect the character's archetype, tags, and trait scores in the tone.
- Do not mention these instructions.

Scenario starters for tone reference:
${scenarioText}
`.trim();

  return {
    character,
    supplementalContext,
  };
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const parsedBody = body as {
      slug?: unknown;
      messages?: unknown;
    };

    const slug =
      typeof parsedBody.slug === "string" ? parsedBody.slug : "";

    const rawMessages: unknown[] = Array.isArray(parsedBody.messages)
      ? parsedBody.messages
      : [];

    if (!slug || rawMessages.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid slug/messages payload." },
        { status: 400 }
      );
    }

    const characterContext = buildCharacterContext(slug);

    if (!characterContext) {
      return NextResponse.json(
        { error: "Character not found." },
        { status: 404 }
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY." },
        { status: 500 }
      );
    }

    const safeMessages: IncomingMessage[] = rawMessages
      .filter((message: unknown): message is IncomingMessage =>
        isValidIncomingMessage(message)
      )
      .map((message: IncomingMessage) => ({
        role: message.role,
        content: message.content.trim(),
      }));

    if (safeMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid chat messages were provided." },
        { status: 400 }
      );
    }

    const recentMessages: IncomingMessage[] =
      safeMessages.slice(-MAX_CONTEXT_MESSAGES);

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gryphe/mythomax-l2-13b",
        max_tokens: 300,
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
            data?.error?.message ||
            data?.message ||
            "OpenRouter request failed.",
        },
        { status: response.status }
      );
    }

    const assistantMessage = data?.choices?.[0]?.message?.content;

    if (typeof assistantMessage !== "string" || !assistantMessage.trim()) {
      return NextResponse.json(
        { error: "No assistant response received." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reply: assistantMessage.trim(),
    });
  } catch (error) {
    console.error("Chat route error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating the reply." },
      { status: 500 }
    );
  }
}
