import { randomUUID } from "crypto";

import type {
  BuildVariationRequestInput,
  BuildVariationRequestOutput,
  GenerateInitialCharacterCandidatesParams,
  GenerateVariationParams,
  ImageGenerationCandidate,
  ImageGenerationErrorResult,
  ImageGenerationResult,
  ImageGenerationSuccessResult,
  ImageProvider,
  ImageProviderConfig,
  RunwarePhotoMakerRequest,
  RunwareReferenceImage,
  RunwareTextToImageRequest,
} from "./types";
import {
  IMAGE_PROVIDER_CONFIGS,
  INITIAL_GENERATION_DEFAULTS,
  VARIATION_GENERATION_DEFAULTS,
} from "./types";

type RunwareResponseItem = {
  taskType?: string;
  taskUUID?: string;
  imageURL?: string;
  imageBase64Data?: string;
  imageDataURI?: string;
  seed?: number;
  width?: number;
  height?: number;
  model?: string;
  error?: boolean;
  errorMessage?: string;
  message?: string;
};

type RunwareApiResponse = RunwareResponseItem[] | { data?: RunwareResponseItem[] };

function getRunwareConfig(): ImageProviderConfig {
  return IMAGE_PROVIDER_CONFIGS.runware;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getRunwareBaseUrl(): string {
  const config = getRunwareConfig();
  return getRequiredEnv(config.baseUrlEnvName).replace(/\/+$/, "");
}

function getRunwareApiKey(): string {
  const config = getRunwareConfig();
  return getRequiredEnv(config.apiKeyEnvName);
}

function getDefaultRunwareModel(): string {
  return IMAGE_PROVIDER_CONFIGS.runware.defaultModel;
}

function normalizeCandidates(
  provider: ImageProvider,
  items: RunwareResponseItem[],
  promptUsed: string,
  negativePromptUsed: string,
): ImageGenerationCandidate[] {
  return items
    .filter((item) => typeof item.imageURL === "string" && item.imageURL.length > 0)
    .map((item, index) => ({
      tempId: `${provider}-${item.taskUUID ?? randomUUID()}-${index}`,
      imageUrl: item.imageURL as string,
      seed: typeof item.seed === "number" ? item.seed : null,
      width: typeof item.width === "number" ? item.width : null,
      height: typeof item.height === "number" ? item.height : null,
      model: typeof item.model === "string" ? item.model : null,
      provider,
      promptUsed,
      negativePromptUsed,
    }));
}

function extractRunwareItems(raw: unknown): RunwareResponseItem[] {
  if (Array.isArray(raw)) {
    return raw as RunwareResponseItem[];
  }

  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    Array.isArray((raw as { data?: unknown }).data)
  ) {
    return (raw as { data: RunwareResponseItem[] }).data;
  }

  return [];
}

async function callRunware(tasks: unknown[]): Promise<RunwareApiResponse> {
  const response = await fetch(`${getRunwareBaseUrl()}/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getRunwareApiKey()}`,
    },
    body: JSON.stringify(tasks),
  });

  const raw = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      raw && typeof raw === "object" && "message" in raw
        ? String((raw as { message?: unknown }).message ?? "Runware request failed")
        : "Runware request failed";

    throw new Error(message);
  }

  return raw as RunwareApiResponse;
}

function buildTextToImageTask(
  request: RunwareTextToImageRequest,
): Record<string, unknown> {
  return {
    taskType: "imageInference",
    taskUUID: randomUUID(),
    outputType: "URL",
    outputFormat: "JPG",
    positivePrompt: request.positivePrompt,
    negativePrompt: request.negativePrompt,
    width: request.width ?? INITIAL_GENERATION_DEFAULTS.width,
    height: request.height ?? INITIAL_GENERATION_DEFAULTS.height,
    model: request.model ?? getDefaultRunwareModel(),
    numberResults: request.numberResults ?? INITIAL_GENERATION_DEFAULTS.numberResults,
    ...(typeof request.seed === "number" ? { seed: request.seed } : {}),
  };
}

function buildPhotoMakerTask(
  request: RunwarePhotoMakerRequest,
): Record<string, unknown> {
  return {
    taskType: "imageInference",
    taskUUID: randomUUID(),
    outputType: "URL",
    outputFormat: "JPG",
    positivePrompt: request.positivePrompt,
    negativePrompt: request.negativePrompt,
    model: request.model ?? getDefaultRunwareModel(),
    width: request.width ?? VARIATION_GENERATION_DEFAULTS.width,
    height: request.height ?? VARIATION_GENERATION_DEFAULTS.height,
    numberResults: request.numberResults ?? VARIATION_GENERATION_DEFAULTS.numberResults,
    ...(typeof request.seed === "number" ? { seed: request.seed } : {}),
    photoMaker: {
      inputImages: request.inputImages.map((image) => ({
        imageURL: image.url,
        weight: typeof image.weight === "number" ? image.weight : 1,
      })),
    },
  };
}

function buildErrorResult(
  kind: "avatar" | "variation",
  error: unknown,
): ImageGenerationErrorResult {
  return {
    ok: false,
    provider: "runware",
    kind,
    errorCode: "RUNWARE_REQUEST_FAILED",
    errorMessage: error instanceof Error ? error.message : "Runware request failed",
    raw: error,
  };
}

function buildSuccessResult(
  kind: "avatar" | "variation",
  candidates: ImageGenerationCandidate[],
  raw: unknown,
  model?: string | null,
): ImageGenerationSuccessResult {
  return {
    ok: true,
    provider: "runware",
    kind,
    candidates,
    model: model ?? null,
    raw,
  };
}

export function buildVariationRequest(
  input: BuildVariationRequestInput,
): BuildVariationRequestOutput {
  const positivePrompt = [
    input.lockedCanonicalPrompt,
    input.variationPromptDelta,
    input.consistencyStrength === "strict"
      ? "preserve same face identity, preserve same body identity"
      : "keep similar identity, allow light scene variation",
  ]
    .filter(Boolean)
    .join(", ");

  const referenceImageUrls = [input.primaryReferenceImageUrl];

  return {
    positivePrompt,
    negativePrompt: input.lockedNegativePrompt,
    referenceImageUrls,
    seed: input.consistencyMode === "seed_only" ? input.baseSeed ?? null : input.baseSeed ?? null,
  };
}

export async function generateInitialCharacterCandidates(
  params: GenerateInitialCharacterCandidatesParams,
): Promise<ImageGenerationResult> {
  try {
    const task = buildTextToImageTask({
      positivePrompt: params.promptEngineOutput.canonicalPrompt,
      negativePrompt: params.promptEngineOutput.negativePrompt,
      numberResults:
        params.candidateCount ?? INITIAL_GENERATION_DEFAULTS.numberResults,
      model: params.model ?? getDefaultRunwareModel(),
      width: INITIAL_GENERATION_DEFAULTS.width,
      height: INITIAL_GENERATION_DEFAULTS.height,
    });

    const raw = await callRunware([task]);
    const items = extractRunwareItems(raw);
    const candidates = normalizeCandidates(
      "runware",
      items,
      params.promptEngineOutput.canonicalPrompt,
      params.promptEngineOutput.negativePrompt,
    );

    if (candidates.length === 0) {
      return {
        ok: false,
        provider: "runware",
        kind: "avatar",
        errorCode: "RUNWARE_EMPTY_RESULT",
        errorMessage: "Runware returned no image candidates.",
        raw,
      };
    }

    return buildSuccessResult(
      "avatar",
      candidates,
      raw,
      params.model ?? getDefaultRunwareModel(),
    );
  } catch (error) {
    return buildErrorResult("avatar", error);
  }
}

export async function generateCharacterVariation(
  params: GenerateVariationParams,
): Promise<ImageGenerationResult> {
  try {
    const built = buildVariationRequest({
      characterId: params.characterId,
      styleType: params.styleType,
      lockedCanonicalPrompt: params.basePrompt,
      lockedNegativePrompt: params.negativePrompt,
      primaryReferenceImageUrl: params.primaryReferenceImageUrl,
      variationPromptDelta: params.variationPromptDelta,
      consistencyMode: params.consistencyMode,
      consistencyStrength: params.consistencyStrength,
      baseSeed: params.baseSeed ?? null,
      model: params.model ?? null,
    });

    const inputImages: RunwareReferenceImage[] = [
      { url: params.primaryReferenceImageUrl, weight: 1 },
      ...(params.referenceImageUrls ?? [])
        .filter((url) => url && url !== params.primaryReferenceImageUrl)
        .slice(0, 3)
        .map((url) => ({ url, weight: 0.85 })),
    ];

    const task = buildPhotoMakerTask({
      positivePrompt: built.positivePrompt,
      negativePrompt: built.negativePrompt,
      inputImages,
      model: params.model ?? getDefaultRunwareModel(),
      numberResults: VARIATION_GENERATION_DEFAULTS.numberResults,
      width: VARIATION_GENERATION_DEFAULTS.width,
      height: VARIATION_GENERATION_DEFAULTS.height,
      seed: built.seed ?? undefined,
    });

    const raw = await callRunware([task]);
    const items = extractRunwareItems(raw);
    const candidates = normalizeCandidates(
      "runware",
      items,
      built.positivePrompt,
      built.negativePrompt,
    );

    if (candidates.length === 0) {
      return {
        ok: false,
        provider: "runware",
        kind: "variation",
        errorCode: "RUNWARE_EMPTY_VARIATION_RESULT",
        errorMessage: "Runware returned no variation candidates.",
        raw,
      };
    }

    return buildSuccessResult(
      "variation",
      candidates,
      raw,
      params.model ?? getDefaultRunwareModel(),
    );
  } catch (error) {
    return buildErrorResult("variation", error);
  }
}
