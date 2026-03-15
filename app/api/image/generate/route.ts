import { NextResponse } from "next/server";
import {
  requestImageGeneration,
  type CharacterImagePromptInput,
  type CharacterImageSafetyInput,
  type ImageProvider,
} from "@/lib/image-provider";

type GenerateImageRouteBody = {
  provider?: ImageProvider;
  characterId?: string;
  promptInput?: CharacterImagePromptInput;
  safety?: CharacterImageSafetyInput;
};

type GenerateImageRouteResponse = {
  ok: boolean;
  imageUrl?: string | null;
  externalJobId?: string | null;
  revisedPrompt?: string | null;
  revisedNegativePrompt?: string | null;
  errorMessage?: string | null;
};

function jsonError(errorMessage: string, status = 400) {
  const payload: GenerateImageRouteResponse = {
    ok: false,
    errorMessage,
  };

  return NextResponse.json(payload, { status });
}

function parseBody(input: unknown): GenerateImageRouteBody {
  if (!input || typeof input !== "object") {
    return {};
  }

  return input as GenerateImageRouteBody;
}

export async function POST(request: Request) {
  const body = parseBody(await request.json().catch(() => null));

  if (!body.provider) {
    return jsonError("provider is required.");
  }

  if (!body.characterId || typeof body.characterId !== "string") {
    return jsonError("characterId is required.");
  }

  if (!body.promptInput || typeof body.promptInput !== "object") {
    return jsonError("promptInput is required.");
  }

  if (!body.safety || typeof body.safety !== "object") {
    return jsonError("safety object is required.");
  }

  try {
    const result = await requestImageGeneration({
      provider: body.provider,
      kind: "avatar",
      characterId: body.characterId,
      promptInput: body.promptInput,
      safety: body.safety,
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected image generation error.";

    return jsonError(message, 500);
  }
}
