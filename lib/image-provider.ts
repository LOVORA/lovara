export type ImageProvider = "mage" | "self-hosted-comfy";

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
  promptInput: CharacterImagePromptInput;
  safety: CharacterImageSafetyInput;
};

export type RequestImageGenerationResult = {
  ok: boolean;
  imageUrl?: string | null;
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
    throw new Error("Public-figure generation is not allowed.");
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
  const envValue =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_DEFAULT_IMAGE_PROVIDER
      : undefined;

  return envValue === "self-hosted-comfy" ? "self-hosted-comfy" : "mage";
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function requestImageGeneration(
  args: RequestImageGenerationArgs,
): Promise<RequestImageGenerationResult> {
  ensureSafety(args.safety);

  const response = await fetch("/api/image/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: args.provider,
      kind: args.kind,
      characterId: args.characterId,
      promptInput: args.promptInput,
      safety: args.safety,
    }),
  });

  const payload = (await safeJson(response)) as
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
    | null;

  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      errorMessage:
        payload?.errorMessage ||
        payload?.error ||
        "Image generation request failed.",
    };
  }

  return {
    ok: true,
    imageUrl: payload.imageUrl ?? payload.primaryImageUrl ?? null,
    externalJobId: payload.externalJobId ?? null,
    revisedPrompt:
      payload.revisedPrompt ?? payload.canonicalPrompt ?? payload.promptSummary ?? null,
    revisedNegativePrompt: payload.revisedNegativePrompt ?? payload.negativePrompt ?? null,
  };
}
