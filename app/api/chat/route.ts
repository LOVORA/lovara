import { NextResponse } from "next/server";
import { characters } from "../../../lib/characters";

type IncomingMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug = body?.slug;
    const messages = body?.messages;

    if (!slug || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Missing or invalid slug/messages payload." },
        { status: 400 }
      );
    }

    const character = characters.find((item) => item.slug === slug);

    if (!character) {
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

    const safeMessages: IncomingMessage[] = messages.filter(
      (message: unknown): message is IncomingMessage => {
        if (!message || typeof message !== "object") return false;

        const candidate = message as IncomingMessage;

        return (
          (candidate.role === "user" || candidate.role === "assistant") &&
          typeof candidate.content === "string" &&
          candidate.content.trim().length > 0
        );
      }
    );

    if (safeMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid chat messages were provided." },
        { status: 400 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
            content: character.systemPrompt,
          },
          ...safeMessages,
        ],
      }),
    });

    const data = await response.json();

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

    return NextResponse.json({ reply: assistantMessage.trim() });
  } catch (error) {
    console.error("Chat route error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating the reply." },
      { status: 500 }
    );
  }
}
