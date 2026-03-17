export type ImageProvider = "runware";

export type CharacterImageSafetyInput = {
  isAdultOnly: boolean;
  subjectDeclared18Plus: boolean;
  consentConfirmed: boolean;
  depictsRealPerson: boolean;
  depictsPublicFigure: boolean;
  nonConsensualFlag: boolean;
  underageRiskFlag: boolean;
  illegalContentFlag: boolean;
};

export type CharacterImagePromptInput = {
  characterName: string;
  archetype?: string;
  visualAura?: string;
  ageBand?: "18-20" | "21-24" | "25-29" | "30-39" | "40+";
  genderPresentation?: string;
  region?: string;
  hair?: string;
  eyes?: string;
  outfit?: string;
  palette?: string;
  camera?: string;
  avatarStyle?: string;
  bodyType?: string;
  pose?: string;
  expression?: string;
  environment?: string;
  nsfwLevel?: "adult" | "suggestive" | "none";
};

export type RequestImageGenerationArgs = {
  provider: ImageProvider;
  kind: "avatar" | "gallery";
  characterId: string;
  userId?: string;
  promptInput: CharacterImagePromptInput;
  safety: CharacterImageSafetyInput;
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

  const requestBody = {
    characterId: args.characterId,
    provider: "runware" as const,
    kind: args.kind,
    promptInput: args.promptInput,
    safety: args.safety,
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
    | {
        ok?: boolean;
        imageUrl?: string | null;
        primaryImageUrl?: string | null;
        externalJobId?: string | null;
        promptSummary?: string | null;
        canonicalPrompt?: string | null;
        negativePrompt?: string | null;
        revisedPrompt?: string | null;
        revisedNegativePrompt?: string | null;
        error?: string;
        errorMessage?: string;
      }
    | null = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      errorMessage:
        payload?.errorMessage ||
        payload?.error ||
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
