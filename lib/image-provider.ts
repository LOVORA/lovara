import type {
  CharacterImagePromptInput,
  CharacterImageSafetyInput,
  ImageProvider,
} from "@/lib/image-generation/types";
import type {
  GenerateImageRouteBody,
  GenerateImageRouteFailure,
  GenerateImageRouteResponse,
} from "@/lib/image-generation/contracts";

export type {
  CharacterImagePromptInput,
  CharacterImageSafetyInput,
  ImageProvider,
} from "@/lib/image-generation/types";

export type RequestImageGenerationArgs = {
  provider: ImageProvider;
  kind: "avatar" | "gallery";
  characterId: string;
  userId?: string;
  promptInput: CharacterImagePromptInput;
  safety: CharacterImageSafetyInput;
  previewImageUrl?: string | null;
  previewResolvedPrompt?: string | null;
  previewNegativePrompt?: string | null;
  consistencySourceImageUrl?: string | null;
  consistencyStrength?: "soft" | "strict" | null;
  baseSeed?: number | null;
};

export type RequestImageGenerationResult = {
  ok: boolean;
  imageUrl?: string | null;
  primaryImageUrl?: string | null;
  externalJobId?: string | null;
  revisedPrompt?: string | null;
  revisedNegativePrompt?: string | null;
  errorMessage?: string | null;
};

function ensureSafety(input: CharacterImageSafetyInput) {
  if (!input.isAdultOnly) {
    throw new Error("Only adult character generation is allowed.");
  }

  if (!input.subjectDeclared18Plus) {
    throw new Error("Character must be explicitly 18+.");
  }

  if (!input.consentConfirmed) {
    throw new Error("Consent confirmation is required.");
  }

  if (input.depictsRealPerson) {
    throw new Error("Real-person generation is not allowed in this flow.");
  }

  if (input.depictsPublicFigure) {
    throw new Error("Public-figure generation is not allowed in this flow.");
  }

  if (input.nonConsensualFlag) {
    throw new Error("Non-consensual sexual content is not allowed.");
  }

  if (input.underageRiskFlag) {
    throw new Error("Underage-risk content is blocked.");
  }

  if (input.illegalContentFlag) {
    throw new Error("Illegal sexual content is blocked.");
  }
}

export function getDefaultImageProvider(): ImageProvider {
  return "runware";
}

export async function requestImageGeneration(
  args: RequestImageGenerationArgs,
): Promise<RequestImageGenerationResult> {
  ensureSafety(args.safety);

  const requestBody: GenerateImageRouteBody = {
    characterId: args.characterId,
    provider: args.provider,
    kind: args.kind,
    promptInput: args.promptInput,
    safety: args.safety,
    ...(args.previewImageUrl
      ? {
          previewImageUrl: args.previewImageUrl,
          previewResolvedPrompt: args.previewResolvedPrompt ?? null,
          previewNegativePrompt: args.previewNegativePrompt ?? null,
        }
      : {}),
    ...(args.consistencySourceImageUrl
      ? {
          consistencySourceImageUrl: args.consistencySourceImageUrl,
          consistencyStrength: args.consistencyStrength ?? "strict",
          baseSeed: args.baseSeed ?? null,
        }
      : {}),
    ...(args.userId ? { userId: args.userId } : {}),
  };

  const response = await fetch("/api/image/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const rawText = await response.text();

  let payload:
    | GenerateImageRouteResponse
    | null = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    const errorPayload =
      payload && payload.ok === false
        ? (payload as GenerateImageRouteFailure)
        : null;

    return {
      ok: false,
      errorMessage:
        errorPayload?.errorMessage ||
        errorPayload?.error ||
        rawText ||
        "Image generation request failed.",
    };
  }

  return {
    ok: true,
    imageUrl: payload.imageUrl ?? payload.primaryImageUrl ?? null,
    primaryImageUrl: payload.primaryImageUrl ?? payload.imageUrl ?? null,
    externalJobId: payload.externalJobId ?? null,
    revisedPrompt:
      payload.revisedPrompt ??
      payload.canonicalPrompt ??
      payload.promptSummary ??
      null,
    revisedNegativePrompt:
      payload.revisedNegativePrompt ?? payload.negativePrompt ?? null,
  };
}
