import { randomUUID } from "crypto";

import type {
  CharacterOutputType,
  HiddenPromptEngineInput,
} from "@/lib/character-builder/types";
import {
  buildInitialDiversityVariants,
  buildVariationDiversityVariants,
} from "@/lib/image-generation/diversity-blueprints";
import {
  REFERENCE_REALISM_NEGATIVE_ANCHORS,
  REFERENCE_REALISM_POSITIVE_ANCHORS,
} from "@/lib/create-character/reference-realism";
import type {
  GeneratedImageCandidate,
  InitialGenerationServiceResult,
  PromptEngineOutputLike,
  VariationLockContract,
} from "./types";

type GenerateInitialCharacterCandidatesParams = {
  provider: "runware";
  styleType: string;
  builderMode: string;
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutputLike;
  candidateCount?: number;
  model?: string | null;
};

type GenerateVariationParams = {
  characterId: string;
  provider: "runware";
  styleType: string;
  basePrompt: string;
  negativePrompt: string;
  primaryReferenceImageUrl: string;
  variationPromptDelta: string;
  variationLockContract?: VariationLockContract | null;
  consistencyMode?: string | null;
  consistencyStrength?: string | null;
  baseSeed?: number | null;
  model?: string | null;
  referenceImageUrls?: string[] | null;
  candidateCount?: number | null;
  outputType?: CharacterOutputType | null;
};

type BuildVariationRequestInput = {
  characterId: string;
  styleType: string;
  lockedCanonicalPrompt: string;
  lockedNegativePrompt: string;
  primaryReferenceImageUrl: string;
  variationPromptDelta: string;
  variationLockContract?: VariationLockContract | null;
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

type RunwareTextToImageRequest = {
  positivePrompt: string;
  negativePrompt: string;
  width?: number;
  height?: number;
  numberResults?: number;
  model?: string | null;
  seed?: number;
  taskUUID?: string;
  referenceImages?: string[] | null;
  seedImage?: string | null;
  strength?: number | null;
  providerSettings?: Record<string, unknown>;
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
const RUNWARE_MAX_PROMPT_LENGTH = 3000;
const RUNWARE_SAFE_POSITIVE_PROMPT_LENGTH = 2900;
const RUNWARE_SAFE_NEGATIVE_PROMPT_LENGTH = 2900;

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
  strength: 15,
} as const;

function isGrokImagineImageModel(model?: string | null) {
  return (model ?? "").trim().toLowerCase() === "xai:grok-imagine@image";
}

function supportsReferenceImages(model?: string | null) {
  const normalized = (model ?? "").trim().toLowerCase();
  if (!normalized) return false;
  if (isGrokImagineImageModel(normalized)) return true;
  return (
    normalized.includes("juggernaut") ||
    normalized.startsWith("civitai:133005@")
  );
}

function getBalancedSeedStrength(model?: string | null) {
  if (supportsReferenceImages(model)) {
    return 0.78;
  }

  return 0.75;
}

function getInitialDimensions(outputType?: unknown, model?: string | null) {
  if (isGrokImagineImageModel(model)) {
    if (outputType === "selfie") {
      return { width: 1024, height: 1024 };
    }

    if (outputType === "full_body") {
      return { width: 864, height: 1296 };
    }

    return { width: 896, height: 1280 };
  }

  if (outputType === "selfie") {
    return { width: 1024, height: 1024 };
  }

  if (outputType === "full_body") {
    return { width: 896, height: 1344 };
  }

  return {
    width: INITIAL_GENERATION_DEFAULTS.width,
    height: INITIAL_GENERATION_DEFAULTS.height,
  };
}

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

function normalizePromptLength(args: {
  value: string;
  fallback: string;
  maxLength: number;
}) {
  const normalized = args.value.trim();
  const base = normalized || args.fallback;

  if (base.length <= args.maxLength) {
    return base;
  }

  const parts = base
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const kept: string[] = [];
  let currentLength = 0;

  for (const part of parts) {
    const nextLength =
      currentLength === 0 ? part.length : currentLength + 2 + part.length;

    if (nextLength > args.maxLength) {
      continue;
    }

    kept.push(part);
    currentLength = nextLength;
  }

  if (kept.length > 0) {
    return kept.join(", ");
  }

  return base.slice(0, args.maxLength).trim() || args.fallback.slice(0, args.maxLength);
}

function buildSafePositivePrompt(value: string) {
  return normalizePromptLength({
    value,
    fallback: "adult realistic upper-body photo",
    maxLength: RUNWARE_SAFE_POSITIVE_PROMPT_LENGTH,
  }).slice(0, RUNWARE_MAX_PROMPT_LENGTH);
}

function buildSafeNegativePrompt(value: string) {
  return normalizePromptLength({
    value,
    fallback: "low quality, bad anatomy",
    maxLength: RUNWARE_SAFE_NEGATIVE_PROMPT_LENGTH,
  }).slice(0, RUNWARE_MAX_PROMPT_LENGTH);
}

function sanitizeGrokPromptForModeration(value: string) {
  const replacements: Array<[RegExp, string]> = [
    [/\btrue nude\b/gi, "tasteful artistic nude"],
    [/\bfully nude\b/gi, "artistic nude adult styling"],
    [/\bfull nude\b/gi, "artistic nude styling"],
    [/\bunclothed\b/gi, "tastefully nude"],
    [/\bno clothing remnants\b/gi, "clean styling continuity"],
    [/\bno clothing\b/gi, "no wardrobe drift"],
    [/\bno bra\b/gi, "no wardrobe drift"],
    [/\bno lingerie\b/gi, "no intimatewear drift"],
    [/\bno robe\b/gi, "no wardrobe drift"],
    [/\bno shirt\b/gi, "no wardrobe drift"],
    [/\bno dress\b/gi, "no wardrobe drift"],
    [/\bno underwear\b/gi, "no wardrobe drift"],
    [/\bunderwear\b/gi, "wardrobe"],
    [/\blingerie\b/gi, "luxury intimatewear"],
    [/\bimplied nude\b/gi, "sensual strategically covered styling"],
    [/\bfull reveal\b/gi, "too-explicit reveal"],
    [/\bfetishes?\b/gi, "private preferences"],
    [/\bexplicit\b/gi, "overt"],
    [/\bpornographic\b/gi, "overly explicit"],
    [/\bnsfw\b/gi, "adult-only"],
  ];

  let output = value;
  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }

  return output
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,+/g, ",")
    .trim();
}

function splitPromptClauses(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueClauses(parts: Array<string | null | undefined | false>) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const part of parts) {
    const value = typeof part === "string" ? part.trim() : "";
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

function pickClausesByKeywords(value: string, keywords: string[]) {
  return splitPromptClauses(value).filter((part) => {
    const lowered = part.toLowerCase();
    return keywords.some((keyword) => lowered.includes(keyword));
  });
}

function cleanContractValue(value?: string | null) {
  return value?.trim() ?? "";
}

function buildStrictVariationPositivePrompt(input: BuildVariationRequestInput) {
  const contract = input.variationLockContract;

  return uniqueClauses([
    ...REFERENCE_REALISM_POSITIVE_ANCHORS,
    "same adult fictional woman",
    "same exact face identity",
    "same face identity",
    contract?.ageValue ? `same believable ${contract.ageValue}-year-old read` : null,
    cleanContractValue(contract?.ageBand) ? `same ${cleanContractValue(contract?.ageBand)} age-band appearance` : null,
    cleanContractValue(contract?.hair)
      ? `same ${cleanContractValue(contract?.hair)}`
      : "same hair identity",
    cleanContractValue(contract?.eyes)
      ? `same ${cleanContractValue(contract?.eyes)}`
      : null,
    cleanContractValue(contract?.skinTone)
      ? `same ${cleanContractValue(contract?.skinTone)} skin tone`
      : "same skin tone",
    "same body identity",
    "same facial proportions",
    "same eye spacing, hairline, brow line, nose balance, and lip balance",
    "do not redesign the woman",
    "same silhouette",
    contract?.faceBias === "soft_feminine" ? "soft feminine adult face" : null,
    contract?.faceBias === "soft_feminine"
      ? "smooth feminine face, gentle jawline"
      : null,
    contract?.nudityMode === "implied_nude"
      ? "implied nude only, strategic natural white lower-body coverage, non-graphic intimate presentation"
      : null,
    contract?.nudityMode === "covered" && cleanContractValue(contract?.outfit)
      ? `exact outfit ${cleanContractValue(contract?.outfit)}`
      : null,
    contract?.nudityMode === "covered" && cleanContractValue(contract?.outfitIntent)
      ? cleanContractValue(contract?.outfitIntent)
      : null,
    cleanContractValue(contract?.bodyType)
      ? `same ${cleanContractValue(contract?.bodyType)} body type`
      : null,
    cleanContractValue(contract?.bustSize)
      ? `same ${cleanContractValue(contract?.bustSize)} bust`
      : null,
    cleanContractValue(contract?.breastType)
      ? `same ${cleanContractValue(contract?.breastType)} breast shape`
      : null,
    cleanContractValue(contract?.buttSize)
      ? `same ${cleanContractValue(contract?.buttSize)} butt`
      : null,
    cleanContractValue(contract?.waistDefinition)
      ? `same ${cleanContractValue(contract?.waistDefinition)} waist`
      : null,
    ...(contract?.hiddenVisualSectionPrompts ?? []).slice(0, 6),
    cleanContractValue(contract?.masterVisualPrompt)
      ? cleanContractValue(contract?.masterVisualPrompt)
      : null,
    cleanContractValue(contract?.profession)
      ? `same profession cue ${cleanContractValue(contract?.profession)}`
      : null,
    cleanContractValue(contract?.backgroundIntent)
      ? `same background logic ${cleanContractValue(contract?.backgroundIntent)}`
      : null,
    contract?.bodyReadPriority === "high" ? "upper-body or full-body only" : null,
    cleanContractValue(contract?.poseFamily)
      ? `exact new pose family ${cleanContractValue(contract?.poseFamily)}`
      : null,
    contract?.framingBias === "full_body"
      ? "full-body pose read must remain clear with full silhouette visibility"
      : null,
    contract?.framingBias === "upper_body"
      ? "upper-body pose read with visible torso, waist, and stomach line"
      : null,
    ...(contract?.selectionContractSummary ?? []).slice(0, 8),
    ...(contract?.imageMoodContractSummary ?? []).slice(0, 4),
    "realistic natural lifestyle photo",
    "natural indoor or practical daylight photo with believable room scale",
    "soft flattering but realistic skin and facial texture",
    "simple lived-in background without glossy studio polish",
    ...pickClausesByKeywords(input.variationPromptDelta, [
      "body language",
      "pose behavior",
      "pose detail",
      "pose lock",
      "body line",
      "crop discipline",
      "gaze direction",
      "hand language",
      "shoulder",
      "torso",
      "waist",
      "hip",
      "hips",
      "leg",
      "legs",
      "knee",
      "knees",
      "spine",
      "posture",
      "standing",
      "seated",
      "sitting",
      "kneeling",
      "recline",
      "reclining",
      "lying",
      "mirror",
      "window",
      "chair",
      "couch",
      "bed",
      "doorway",
      "profile",
      "over-the-shoulder",
      "new pose",
      "fresh pose",
      "camera angle",
      "different crop",
      "framing",
      "upper-body",
      "full-body",
      "fresh composition",
      "new body orientation",
      "lighting change",
      "show more of the body",
      "same woman, different shot",
    ]),
    "new pose and crop only",
  ]).join(", ");
}

function buildStrictVariationNegativePrompt(input: BuildVariationRequestInput) {
  const contract = input.variationLockContract;
  const lockedNegatives = pickClausesByKeywords(input.lockedNegativePrompt, [
    "identity drift",
    "different person",
    "different woman",
    "wrong skin tone",
    "wrong bust size",
    "wrong breast shape",
    "wrong butt size",
    "pregnant body",
    "cgi skin",
    "wax",
    "uncanny",
    "mannequin",
    "plastic breasts",
    "hard jawline",
    "masculine facial structure",
    "background mismatch",
    "profession mismatch",
    "wrong outfit",
    "wrong nudity class",
    "passport photo",
    "face-only crop",
    "cropped torso",
  ]);

  return uniqueClauses([
    ...REFERENCE_REALISM_NEGATIVE_ANCHORS,
    ...lockedNegatives,
    "identity drift",
    "face drift",
    "different woman",
    "different face shape",
    "changed eye spacing",
    "changed hairline",
    "different brow shape",
    "altered facial structure",
    "changed hair identity",
    "changed body proportions",
    "changed silhouette",
    cleanContractValue(contract?.outfit) ? "wrong outfit" : null,
    cleanContractValue(contract?.outfit) ? "wardrobe drift" : null,
    contract?.nudityMode ? "wrong nudity class" : null,
    contract?.nudityMode === "implied_nude"
      ? "full nude reveal, complete unclothed full reveal, explicit genital reveal, digital censor block"
      : null,
    cleanContractValue(contract?.bustSize) ? "wrong bust size" : null,
    cleanContractValue(contract?.breastType) ? "wrong breast shape" : null,
    cleanContractValue(contract?.buttSize) ? "wrong butt size" : null,
    cleanContractValue(contract?.bodyType) && contract?.bodyType !== "pregnant"
      ? "pregnant body"
      : null,
    cleanContractValue(contract?.poseFamily) ? "same pose family repetition" : null,
    contract?.framingBias ? "wrong framing bias" : null,
    contract?.selectionContractSummary?.length
      ? "selected contract summary ignored"
      : null,
    contract?.imageMoodContractSummary?.length ? "flattened generic mood" : null,
    cleanContractValue(contract?.profession) ? "profession mismatch" : null,
    cleanContractValue(contract?.backgroundIntent) ? "background mismatch" : null,
    contract?.faceBias === "soft_feminine" ? "masculine facial structure" : null,
    contract?.faceBias === "soft_feminine" ? "hard jawline" : null,
    contract?.faceBias === "soft_feminine" ? "harsh brow ridge" : null,
    contract?.faceBias === "soft_feminine" ? "overly angular face" : null,
    "cgi skin",
    "wax skin",
    "uncanny face",
    "plastic skin sheen",
    "fake background blur",
    "unreal room scale",
    "editorial glamour look",
    "mannequin stance",
    "plastic breasts",
    "impossible waist to hip ratio",
    "passport photo",
    "face-only crop",
    "cropped torso",
  ]).join(", ");
}

function normalizeCandidatesFromTaskMeta(
  items: RunwareResponseItem[],
  taskMeta: Map<
    string,
    {
      promptUsed: string;
      negativePromptUsed: string;
    }
  >,
): GeneratedImageCandidate[] {
  return items
    .filter(
      (item) => typeof item.imageURL === "string" && item.imageURL.length > 0,
    )
    .map((item, index) => {
      const meta = item.taskUUID ? taskMeta.get(item.taskUUID) : null;

      return {
        tempId: `runware-${item.taskUUID ?? randomUUID()}-${index}`,
        imageUrl: item.imageURL as string,
        seed: typeof item.seed === "number" ? item.seed : null,
        width: typeof item.width === "number" ? item.width : null,
        height: typeof item.height === "number" ? item.height : null,
        model: typeof item.model === "string" ? item.model : null,
        prompt: meta?.promptUsed ?? null,
        negativePrompt: meta?.negativePromptUsed ?? null,
      };
    });
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

  if ("error" in raw && typeof (raw as { error?: unknown }).error === "string") {
    const code =
      "code" in raw && typeof (raw as { code?: unknown }).code === "string"
        ? ` (${(raw as { code: string }).code})`
        : "";
    return `${(raw as { error: string }).error}${code}`;
  }

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
  const positivePrompt = buildSafePositivePrompt(request.positivePrompt);
  const negativePrompt = buildSafeNegativePrompt(request.negativePrompt);
  const model = request.model ?? RUNWARE_DEFAULT_MODEL;
  const isGrokModel = isGrokImagineImageModel(model);
  const buildGrokGuardrailPrompt = (rawNegativePrompt: string) => {
    const clauses = rawNegativePrompt
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);

    if (clauses.length === 0) return "";

    return clauses
      .map((clause, index) =>
        index === 0
          ? `avoid ${clause}`
          : index === clauses.length - 1
            ? `and avoid ${clause}`
            : `avoid ${clause}`,
      )
      .join(", ");
  };
  const grokPositivePrompt = isGrokModel
    ? buildSafePositivePrompt(
        sanitizeGrokPromptForModeration(
          [
          positivePrompt,
          negativePrompt ? buildGrokGuardrailPrompt(negativePrompt) : null,
        ]
          .filter(Boolean)
          .join(", "),
        ),
      )
    : positivePrompt;

  return {
    taskType: "imageInference",
    taskUUID: request.taskUUID ?? randomUUID(),
    outputType: "URL",
    outputFormat: "JPG",
    positivePrompt: grokPositivePrompt,
    width: request.width ?? INITIAL_GENERATION_DEFAULTS.width,
    height: request.height ?? INITIAL_GENERATION_DEFAULTS.height,
    model,
    numberResults: request.numberResults ?? INITIAL_GENERATION_DEFAULTS.numberResults,
    ...(!isGrokModel
      ? {
          steps: INITIAL_GENERATION_DEFAULTS.steps,
          CFGScale: INITIAL_GENERATION_DEFAULTS.cfgScale,
        }
      : {}),
    ...(!isGrokModel ? { negativePrompt } : {}),
    ...(supportsReferenceImages(model) && request.referenceImages?.length
      ? { referenceImages: request.referenceImages.slice(0, 2) }
      : {}),
    ...(request.seedImage ? { seedImage: request.seedImage } : {}),
    ...(request.seedImage && typeof request.strength === "number"
      ? { strength: request.strength }
      : {}),
    ...(request.providerSettings ? { providerSettings: request.providerSettings } : {}),
    ...(!isGrokModel && typeof request.seed === "number" ? { seed: request.seed } : {}),
  };
}

export function buildVariationRequest(
  input: BuildVariationRequestInput,
): BuildVariationRequestOutput {
  const positivePrompt =
    input.consistencyStrength === "strict"
      ? buildStrictVariationPositivePrompt(input)
      : [
          input.variationPromptDelta,
          input.lockedCanonicalPrompt,
          "keep similar identity, allow light scene variation, preserve recognizable face, same character, environment may vary more than identity",
        ]
          .filter(Boolean)
          .join(", ");

  const variationNegativePrompt =
    input.consistencyStrength === "strict"
      ? buildStrictVariationNegativePrompt(input)
      : [
          input.lockedNegativePrompt,
          "major identity drift, noticeably different face, wrong body silhouette, changed facial structure",
        ]
          .filter(Boolean)
          .join(", ");

  return {
    positivePrompt,
    negativePrompt: variationNegativePrompt,
    referenceImageUrls: [input.primaryReferenceImageUrl],
    seed: input.baseSeed ?? null,
  };
}

export async function generateInitialCharacterCandidates(
  params: GenerateInitialCharacterCandidatesParams,
): Promise<InitialGenerationServiceResult> {
  try {
    const outputType = params.promptEngineOutput.generationHints?.outputType;
    const resolvedModel = params.model ?? RUNWARE_DEFAULT_MODEL;
    const dimensions = getInitialDimensions(outputType, resolvedModel);
    const refreshSeed = Math.floor(Math.random() * 2_000_000_000);

    const variants = buildInitialDiversityVariants({
      hiddenPromptInput: params.hiddenPromptInput,
      promptEngineOutput: params.promptEngineOutput,
      candidateCount:
        params.candidateCount ?? INITIAL_GENERATION_DEFAULTS.numberResults,
      baseSeed: refreshSeed,
    });

    const taskMeta = new Map<
      string,
      {
        promptUsed: string;
        negativePromptUsed: string;
      }
    >();

    const tasks = variants.map((variant) => {
      const taskUUID = randomUUID();
      const positivePrompt = buildSafePositivePrompt([
        params.promptEngineOutput.canonicalPrompt,
        variant.positiveDelta,
      ]
        .filter(Boolean)
        .join(", "));
      const negativePrompt = buildSafeNegativePrompt([
        params.promptEngineOutput.negativePrompt,
        variant.negativeDelta,
      ]
        .filter(Boolean)
        .join(", "));

      taskMeta.set(taskUUID, {
        promptUsed: positivePrompt,
        negativePromptUsed: negativePrompt,
      });

      return buildTextToImageTask({
        taskUUID,
        positivePrompt,
        negativePrompt,
        numberResults: 1,
        model: resolvedModel,
        width: dimensions.width,
        height: dimensions.height,
        seed: variant.seed,
      });
    });

    const raw = await callRunware(tasks);
    const items = extractRunwareItems(raw);
    const candidates = normalizeCandidatesFromTaskMeta(items, taskMeta);

    if (candidates.length === 0) {
      return {
        ok: false,
        provider: params.provider,
        kind: "initial",
        errorCode: "RUNWARE_EMPTY_RESULT",
        errorMessage: "Runware returned no image candidates.",
      };
    }

    return {
      ok: true,
      provider: params.provider,
      kind: "initial",
      externalJobId: null,
      candidates,
    };
  } catch (error) {
    return {
      ok: false,
      provider: params.provider,
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
    variationLockContract: params.variationLockContract ?? null,
    consistencyMode: params.consistencyMode,
    consistencyStrength: params.consistencyStrength,
    baseSeed: params.baseSeed ?? null,
    model: params.model ?? null,
  });

  const variants = buildVariationDiversityVariants({
    characterId: params.characterId,
    styleType: params.styleType,
    basePrompt: params.basePrompt,
    variationPromptDelta: params.variationPromptDelta,
    variationLockContract: params.variationLockContract ?? null,
    outputType: params.outputType ?? "upper_body",
    candidateCount:
      params.candidateCount ?? VARIATION_GENERATION_DEFAULTS.numberResults,
    consistencyLocked: params.consistencyStrength !== "soft",
    baseSeed: built.seed ?? params.baseSeed ?? null,
  });

  const dimensions = getInitialDimensions(
    params.outputType ?? "upper_body",
    params.model ?? RUNWARE_DEFAULT_MODEL,
  );
  const tasks = variants.map((variant, index) =>
    buildTextToImageTask({
      taskUUID: randomUUID(),
      positivePrompt: [built.positivePrompt, variant.positiveDelta]
        .filter(Boolean)
        .join(", "),
      negativePrompt: [built.negativePrompt, variant.negativeDelta]
        .filter(Boolean)
        .join(", "),
      model: params.model ?? RUNWARE_DEFAULT_MODEL,
      numberResults: 1,
      width: dimensions.width,
      height: dimensions.height,
      referenceImages: supportsReferenceImages(params.model ?? RUNWARE_DEFAULT_MODEL)
        ? (
            params.referenceImageUrls?.filter((url) => typeof url === "string" && url.trim().length > 0) ??
            [params.primaryReferenceImageUrl]
          ).slice(0, 2)
        : null,
      seedImage:
        !isGrokImagineImageModel(params.model ?? RUNWARE_DEFAULT_MODEL)
          ? params.primaryReferenceImageUrl
          : null,
      strength:
        !isGrokImagineImageModel(params.model ?? RUNWARE_DEFAULT_MODEL)
          ? getBalancedSeedStrength(params.model ?? RUNWARE_DEFAULT_MODEL)
          : null,
      seed:
        typeof built.seed === "number"
          ? built.seed + index * 101
          : variant.seed,
    }),
  );

  return callRunware(tasks);
}

export async function generateCharacterVariationCandidates(
  params: GenerateVariationParams,
): Promise<InitialGenerationServiceResult> {
  try {
  const built = buildVariationRequest({
      characterId: params.characterId,
      styleType: params.styleType,
      lockedCanonicalPrompt: params.basePrompt,
      lockedNegativePrompt: params.negativePrompt,
    primaryReferenceImageUrl: params.primaryReferenceImageUrl,
    variationPromptDelta: params.variationPromptDelta,
    variationLockContract: params.variationLockContract ?? null,
    consistencyMode: params.consistencyMode,
    consistencyStrength: params.consistencyStrength,
      baseSeed: params.baseSeed ?? null,
      model: params.model ?? null,
    });

    const variants = buildVariationDiversityVariants({
      characterId: params.characterId,
      styleType: params.styleType,
      basePrompt: params.basePrompt,
      variationPromptDelta: params.variationPromptDelta,
      variationLockContract: params.variationLockContract ?? null,
      outputType: params.outputType ?? "upper_body",
      candidateCount:
        params.candidateCount ?? VARIATION_GENERATION_DEFAULTS.numberResults,
      consistencyLocked: params.consistencyStrength !== "soft",
    });
    const raw = await generateCharacterVariation(params);
    const items = extractRunwareItems(raw);
    const candidates = items
      .filter(
        (item) => typeof item.imageURL === "string" && item.imageURL.length > 0,
      )
      .map((item, index) => {
        const variant = variants[index] ?? variants[0];
        return {
          tempId: `runware-${item.taskUUID ?? randomUUID()}-${index}`,
          imageUrl: item.imageURL as string,
          seed: typeof item.seed === "number" ? item.seed : variant?.seed ?? null,
          width: typeof item.width === "number" ? item.width : null,
          height: typeof item.height === "number" ? item.height : null,
          model: typeof item.model === "string" ? item.model : null,
          prompt:
            [built.positivePrompt, variant?.positiveDelta]
              .filter(Boolean)
              .join(", ") || null,
          negativePrompt:
            [built.negativePrompt, variant?.negativeDelta]
              .filter(Boolean)
              .join(", ") || null,
        } satisfies GeneratedImageCandidate;
      });

    if (candidates.length === 0) {
      return {
        ok: false,
        provider: params.provider,
        kind: "variation",
        errorCode: "RUNWARE_EMPTY_VARIATION_RESULT",
        errorMessage: "Runware returned no variation candidates.",
      };
    }

    return {
      ok: true,
      provider: params.provider,
      kind: "variation",
      externalJobId: null,
      candidates,
    };
  } catch (error) {
    return {
      ok: false,
      provider: params.provider,
      kind: "variation",
      errorCode: "RUNWARE_VARIATION_FAILED",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Runware variation request failed",
    };
  }
}
