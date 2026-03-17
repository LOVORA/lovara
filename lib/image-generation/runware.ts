import { randomUUID } from "crypto";

import type {
  GeneratedImageCandidate,
  InitialGenerationServiceResult,
  PromptEngineOutputLike,
} from "./types";

type GenerateInitialCharacterCandidatesParams = {
  provider: "runware";
  styleType: string;
  builderMode: string;
  hiddenPromptInput: Record<string, unknown>;
  promptEngineOutput: PromptEngineOutputLike;
  candidateCount?: number;
  model?: string | null;
};

type GenerateVariationParams = {
  characterId: string;
  styleType: string;
  basePrompt: string;
  negativePrompt: string;
  primaryReferenceImageUrl: string;
  variationPromptDelta: string;
  consistencyMode?: string | null;
  consistencyStrength?: string | null;
  baseSeed?: number | null;
  model?: string | null;
  referenceImageUrls?: string[] | null;
};

type BuildVariationRequestInput = {
  characterId: string;
  styleType: string;
  lockedCanonicalPrompt: string;
  lockedNegativePrompt: string;
  primaryReferenceImageUrl: string;
  variationPromptDelta: string;
  consistencyMode?: string | null;
  consistencyStrength?: string | null;
  baseSeed?: number | null;
  model?: string | null;
};

type BuildVariationRequestOutput = {
  positivePrompt: string;
  negativePrompt: string;
  referenceImageUrls: string[];
  seed: number | null;
};

type RunwareReferenceImage = {
  url: string;
  weight?: number;
};

type RunwareTextToImageRequest = {
  positivePrompt: string;
  negativePrompt: string;
  width?: number;
  height?: number;
  numberResults?: number;
  model?: string | null;
  seed?: number;
};

type RunwarePhotoMakerRequest = {
  positivePrompt: string;
  negativePrompt: string;
  inputImages: RunwareReferenceImage[];
  width?: number;
  height?: number;
  numberResults?: number;
  model?: string | null;
  seed?: number;
};

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

type RunwareApiResponse =
  | RunwareResponseItem[]
  | {
      data?: RunwareResponseItem[];
      errors?: Array<{ message?: string }>;
      message?: string;
    };

const RUNWARE_DEFAULT_MODEL =
  process.env.RUNWARE_MODEL?.trim() || "runware:101@1";

const INITIAL_GENERATION_DEFAULTS = {
  width: 832,
  height: 1216,
  numberResults: 4,
  steps: 30,
  cfgScale: 7.5,
} as const;

const VARIATION_GENERATION_DEFAULTS = {
  width: 832,
  height: 1216,
  numberResults: 4,
  steps: 30,
  cfgScale: 7.5,
  strength: 0.7,
} as const;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getRunwareBaseUrl(): string {
  return getRequiredEnv("RUNWARE_BASE_URL").replace(/\/+$/, "");
}

function getRunwareApiKey(): string {
  return getRequiredEnv("RUNWARE_API_KEY");
}

function ensurePhotoMakerTriggerWord(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "rwre portrait";
  return /\brwre\b/i.test(trimmed) ? trimmed : `rwre ${trimmed}`;
}

function normalizeCandidates(
  items: RunwareResponseItem[],
  promptUsed: string,
  negativePromptUsed: string,
): GeneratedImageCandidate[] {
  return items
    .filter(
      (item) => typeof item.imageURL === "string" && item.imageURL.length > 0,
    )
    .map((item, index) => ({
      tempId: `runware-${item.taskUUID ?? randomUUID()}-${index}`,
      imageUrl: item.imageURL as string,
      seed: typeof item.seed === "number" ? item.seed : null,
      width: typeof item.width === "number" ? item.width : null,
      height: typeof item.height === "number" ? item.height : null,
      model: typeof item.model === "string" ? item.model : null,
      prompt: promptUsed,
      negativePrompt: negativePromptUsed,
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

function extractRunwareErrorMessage(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;

  if ("message" in raw && typeof (raw as { message?: unknown }).message === "string") {
    return (raw as { message: string }).message;
  }

  if (
    "errors" in raw &&
    Array.isArray((raw as { errors?: unknown }).errors) &&
    (raw as { errors: Array<{ message?: string }> }).errors[0]?.message
  ) {
    return (raw as { errors: Array<{ message?: string }> }).errors[0].message ?? null;
  }

  return null;
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
    throw new Error(extractRunwareErrorMessage(raw) ?? "Runware request failed");
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
    model: request.model ?? RUNWARE_DEFAULT_MODEL,
    numberResults: request.numberResults ?? INITIAL_GENERATION_DEFAULTS.numberResults,
    steps: INITIAL_GENERATION_DEFAULTS.steps,
    CFGScale: INITIAL_GENERATION_DEFAULTS.cfgScale,
  };
}

function buildPhotoMakerTask(
  request: RunwarePhotoMakerRequest,
): Record<string, unknown> {
  return {
    taskType: "photoMaker",
    taskUUID: randomUUID(),
    outputType: "URL",
    outputFormat: "JPG",
    inputImages: request.inputImages.map((image: RunwareReferenceImage) => image.url),
    positivePrompt: ensurePhotoMakerTriggerWord(request.positivePrompt),
    negativePrompt: request.negativePrompt,
    model: request.model ?? RUNWARE_DEFAULT_MODEL,
    width: request.width ?? VARIATION_GENERATION_DEFAULTS.width,
    height: request.height ?? VARIATION_GENERATION_DEFAULTS.height,
    numberResults:
      request.numberResults ?? VARIATION_GENERATION_DEFAULTS.numberResults,
    steps: VARIATION_GENERATION_DEFAULTS.steps,
    CFGScale: VARIATION_GENERATION_DEFAULTS.cfgScale,
    strength: VARIATION_GENERATION_DEFAULTS.strength,
    ...(typeof request.seed === "number" ? { seed: request.seed } : {}),
  };
}

export function buildVariationRequest(
  input: BuildVariationRequestInput,
): BuildVariationRequestOutput {
  const positivePrompt = [
    input.lockedCanonicalPrompt,
    input.variationPromptDelta,
    input.consistencyStrength === "strict"
      ? "preserve same face identity, preserve same body identity, same character"
      : "keep similar identity, allow light scene variation, same character",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    positivePrompt: ensurePhotoMakerTriggerWord(positivePrompt),
    negativePrompt: input.lockedNegativePrompt,
    referenceImageUrls: [input.primaryReferenceImageUrl],
    seed: input.baseSeed ?? null,
  };
}

export async function generateInitialCharacterCandidates(
  params: GenerateInitialCharacterCandidatesParams,
): Promise<InitialGenerationServiceResult> {
  try {
    const task = buildTextToImageTask({
      positivePrompt: params.promptEngineOutput.canonicalPrompt,
      negativePrompt: params.promptEngineOutput.negativePrompt,
      numberResults:
        params.candidateCount ?? INITIAL_GENERATION_DEFAULTS.numberResults,
      model: params.model ?? RUNWARE_DEFAULT_MODEL,
      width: INITIAL_GENERATION_DEFAULTS.width,
      height: INITIAL_GENERATION_DEFAULTS.height,
    });

    const raw = await callRunware([task]);
    const items = extractRunwareItems(raw);
    const candidates = normalizeCandidates(
      items,
      params.promptEngineOutput.canonicalPrompt,
      params.promptEngineOutput.negativePrompt,
    );

    if (candidates.length === 0) {
      return {
        ok: false,
        provider: "runware",
        kind: "initial",
        errorCode: "RUNWARE_EMPTY_RESULT",
        errorMessage: "Runware returned no image candidates.",
      };
    }

    return {
      ok: true,
      provider: "runware",
      kind: "initial",
      externalJobId: null,
      candidates,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "runware",
      kind: "initial",
      errorCode: "RUNWARE_REQUEST_FAILED",
      errorMessage:
        error instanceof Error ? error.message : "Runware request failed",
    };
  }
}

export async function generateCharacterVariation(
  params: GenerateVariationParams,
) {
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
    ...((params.referenceImageUrls ?? [])
      .filter(
        (url: string) => url && url !== params.primaryReferenceImageUrl,
      )
      .slice(0, 3)
      .map((url: string) => ({ url, weight: 0.85 }))),
  ];

  const task = buildPhotoMakerTask({
    positivePrompt: built.positivePrompt,
    negativePrompt: built.negativePrompt,
    inputImages,
    model: params.model ?? RUNWARE_DEFAULT_MODEL,
    numberResults: VARIATION_GENERATION_DEFAULTS.numberResults,
    width: VARIATION_GENERATION_DEFAULTS.width,
    height: VARIATION_GENERATION_DEFAULTS.height,
    seed: built.seed ?? undefined,
  });

  return callRunware([task]);
}
