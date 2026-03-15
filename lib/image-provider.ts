export type ImageProvider = "mage" | "self-hosted-comfy";

export type ImageGenerationStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type ImageGenerationKind = "avatar" | "variation";

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
  nsfwLevel?: "none" | "suggestive" | "adult";
};

export type UnifiedImageGenerationRequest = {
  provider?: ImageProvider;
  kind: ImageGenerationKind;
  characterId: string;
  jobId?: string;
  promptInput: CharacterImagePromptInput;
  safety: CharacterImageSafetyInput;
};

export type UnifiedImageGenerationResult = {
  ok: boolean;
  provider: ImageProvider;
  status: ImageGenerationStatus;
  externalJobId?: string | null;
  imageUrl?: string | null;
  revisedPrompt?: string | null;
  revisedNegativePrompt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  raw?: unknown;
};

export type UnifiedImageProviderConfig = {
  provider: ImageProvider;
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs: number;
};

function readEnv(name: string): string | undefined {
  const value =
    typeof process !== "undefined" ? process.env[name] : undefined;
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getDefaultImageProvider(): ImageProvider {
  const configured =
    readEnv("IMAGE_PROVIDER") ??
    readEnv("NEXT_PUBLIC_IMAGE_PROVIDER") ??
    "mage";

  if (configured === "self-hosted-comfy") {
    return "self-hosted-comfy";
  }

  return "mage";
}

export function getImageProviderConfig(
  provider: ImageProvider = getDefaultImageProvider(),
): UnifiedImageProviderConfig {
  if (provider === "self-hosted-comfy") {
    return {
      provider,
      enabled: true,
      baseUrl: readEnv("COMFYUI_BASE_URL"),
      apiKey: readEnv("COMFYUI_API_KEY"),
      timeoutMs: Number(readEnv("COMFYUI_TIMEOUT_MS") ?? "120000"),
    };
  }

  return {
    provider: "mage",
    enabled: true,
    baseUrl: readEnv("MAGE_API_BASE_URL"),
    apiKey: readEnv("MAGE_API_KEY"),
    timeoutMs: Number(readEnv("MAGE_TIMEOUT_MS") ?? "120000"),
  };
}

export function assertImageSafety(input: CharacterImageSafetyInput) {
  if (!input.isAdultOnly) {
    throw new Error("ADULT_ONLY_REQUIRED");
  }

  if (!input.subjectDeclared18Plus) {
    throw new Error("SUBJECT_MUST_BE_18_PLUS");
  }

  if (!input.consentConfirmed) {
    throw new Error("CONSENT_REQUIRED");
  }

  if (input.depictsRealPerson) {
    throw new Error("REAL_PERSON_NOT_ALLOWED");
  }

  if (input.depictsPublicFigure) {
    throw new Error("PUBLIC_FIGURE_NOT_ALLOWED");
  }

  if (input.nonConsensualFlag) {
    throw new Error("NON_CONSENSUAL_NOT_ALLOWED");
  }

  if (input.underageRiskFlag) {
    throw new Error("UNDERAGE_RISK_BLOCKED");
  }

  if (input.illegalContentFlag) {
    throw new Error("ILLEGAL_CONTENT_BLOCKED");
  }
}

export function buildAdultAvatarPrompt(input: CharacterImagePromptInput) {
  const parts = [
    "adult fictional character portrait, age 21+",
    input.characterName ? `character name: ${input.characterName}` : "",
    input.archetype ? `archetype: ${input.archetype}` : "",
    input.visualAura ? `visual aura: ${input.visualAura}` : "",
    input.ageBand ? `age band: ${input.ageBand}` : "",
    input.genderPresentation
      ? `gender presentation: ${input.genderPresentation}`
      : "",
    input.region ? `region-inspired look: ${input.region}` : "",
    input.hair ? `hair: ${input.hair}` : "",
    input.eyes ? `eyes: ${input.eyes}` : "",
    input.outfit ? `outfit: ${input.outfit}` : "",
    input.palette ? `color palette: ${input.palette}` : "",
    input.camera ? `camera framing: ${input.camera}` : "",
    input.avatarStyle ? `avatar style: ${input.avatarStyle}` : "",
    input.bodyType ? `body type: ${input.bodyType}` : "",
    input.pose ? `pose: ${input.pose}` : "",
    input.expression ? `expression: ${input.expression}` : "",
    input.environment ? `environment: ${input.environment}` : "",
    input.nsfwLevel === "adult"
      ? "tasteful erotic adult aesthetic, clearly adult, consensual, fictional"
      : input.nsfwLevel === "suggestive"
        ? "suggestive adult aesthetic, sensual but restrained, clearly adult"
        : "fully clothed premium portrait",
    "high detail, cinematic lighting, premium portrait, cohesive face, clean anatomy",
  ].filter(Boolean);

  return parts.join(", ");
}

export function buildAdultAvatarNegativePrompt() {
  return [
    "minor",
    "underage",
    "child",
    "teen",
    "young-looking",
    "school uniform",
    "non-consensual",
    "coercion",
    "rape",
    "forced",
    "real person",
    "celebrity",
    "public figure",
    "watermark",
    "text",
    "extra fingers",
    "bad hands",
    "deformed anatomy",
    "low quality",
    "blurry",
  ].join(", ");
}

export function normalizeImageProviderResult(args: {
  provider: ImageProvider;
  raw: unknown;
  status?: ImageGenerationStatus;
  externalJobId?: string | null;
  imageUrl?: string | null;
  revisedPrompt?: string | null;
  revisedNegativePrompt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}): UnifiedImageGenerationResult {
  return {
    ok: !args.errorMessage,
    provider: args.provider,
    status: args.status ?? (args.errorMessage ? "failed" : "completed"),
    externalJobId: args.externalJobId ?? null,
    imageUrl: args.imageUrl ?? null,
    revisedPrompt: args.revisedPrompt ?? null,
    revisedNegativePrompt: args.revisedNegativePrompt ?? null,
    errorCode: args.errorCode ?? null,
    errorMessage: args.errorMessage ?? null,
    raw: args.raw,
  };
}

export async function requestImageGeneration(
  request: UnifiedImageGenerationRequest,
): Promise<UnifiedImageGenerationResult> {
  assertImageSafety(request.safety);

  const provider = request.provider ?? getDefaultImageProvider();
  const response = await fetch("/api/image/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...request,
      provider,
      prompt: buildAdultAvatarPrompt(request.promptInput),
      negativePrompt: buildAdultAvatarNegativePrompt(),
    }),
  });

  const data = (await response.json()) as UnifiedImageGenerationResult;

  if (!response.ok) {
    return {
      ok: false,
      provider,
      status: "failed",
      errorCode: data.errorCode ?? "REQUEST_FAILED",
      errorMessage: data.errorMessage ?? "Image generation request failed.",
      raw: data.raw ?? data,
    };
  }

  return data;
}
