import { randomUUID } from "crypto";

import type {
  CharacterOutputType,
  HiddenPromptEngineInput,
} from "@/lib/character-builder/types";
import type {
  GeneratedImageCandidate,
  InitialGenerationServiceResult,
  PromptEngineOutputLike,
} from "@/lib/image-generation/types";

type GenerateXaiInitialCharacterCandidatesParams = {
  provider: "xai";
  styleType: string;
  builderMode: string;
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutputLike;
  candidateCount?: number;
  model?: string | null;
};

type XaiImageGenerationResponse = {
  created?: number;
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
};

const XAI_DEFAULT_MODEL =
  process.env.XAI_IMAGE_MODEL?.trim() || "grok-imagine-image";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getXaiBaseUrl() {
  return (process.env.XAI_BASE_URL?.trim() || "https://api.x.ai/v1").replace(/\/+$/, "");
}

function getXaiApiKey() {
  return getRequiredEnv("XAI_API_KEY");
}

function inferOutputType(args: {
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutputLike;
}): CharacterOutputType {
  const requested = args.hiddenPromptInput.customPrompt?.helperOutputType;
  if (
    requested === "portrait" ||
    requested === "upper_body" ||
    requested === "selfie" ||
    requested === "full_body"
  ) {
    return requested;
  }

  const hinted = args.promptEngineOutput.generationHints?.outputType;
  if (
    hinted === "portrait" ||
    hinted === "upper_body" ||
    hinted === "selfie" ||
    hinted === "full_body"
  ) {
    return hinted;
  }

  return "upper_body";
}

function getAspectRatio(outputType: CharacterOutputType) {
  if (outputType === "full_body") return "2:3";
  if (outputType === "selfie") return "1:1";
  return "3:4";
}

function getResolution(outputType: CharacterOutputType) {
  return outputType === "full_body" ? "2k" : "1k";
}

function buildCanonicalPromptForXai(args: {
  promptEngineOutput: PromptEngineOutputLike;
  outputType: CharacterOutputType;
}) {
  const enforcedFraming =
    args.outputType === "full_body"
      ? "full-body framing with the entire silhouette clearly visible, no portrait crop"
      : "body-readable upper-body framing with visible chest, stomach line, waist, and upper hips, no portrait crop, no face-only crop";

  return [
    args.promptEngineOutput.canonicalPrompt,
    enforcedFraming,
    "selected body traits must remain visible",
    "do not collapse into a passport portrait or tight headshot",
  ]
    .filter(Boolean)
    .join(", ");
}

async function callXaiImageGeneration(args: {
  prompt: string;
  model: string;
  n: number;
  aspectRatio: string;
  resolution: string;
}) {
  const response = await fetch(`${getXaiBaseUrl()}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getXaiApiKey()}`,
    },
    body: JSON.stringify({
      model: args.model,
      prompt: args.prompt,
      n: args.n,
      aspect_ratio: args.aspectRatio,
      resolution: args.resolution,
    }),
  });

  const payload = (await response.json().catch(() => null)) as XaiImageGenerationResponse | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? "xAI image generation failed."
        : "xAI image generation failed.";
    throw new Error(message);
  }

  return payload;
}

export async function generateInitialCharacterCandidatesWithXai(
  params: GenerateXaiInitialCharacterCandidatesParams,
): Promise<InitialGenerationServiceResult> {
  try {
    const outputType = inferOutputType({
      hiddenPromptInput: params.hiddenPromptInput,
      promptEngineOutput: params.promptEngineOutput,
    });
    const candidateCount = Math.max(1, params.candidateCount ?? 1);
    const model = params.model ?? XAI_DEFAULT_MODEL;
    const prompt = buildCanonicalPromptForXai({
      promptEngineOutput: params.promptEngineOutput,
      outputType,
    });

    const payload = await callXaiImageGeneration({
      prompt,
      model,
      n: candidateCount,
      aspectRatio: getAspectRatio(outputType),
      resolution: getResolution(outputType),
    });

    const candidates: GeneratedImageCandidate[] = [];
    for (const [index, item] of (payload?.data ?? []).entries()) {
      if (!item.url) continue;
      candidates.push({
        tempId: `xai-${index}-${randomUUID()}`,
        imageUrl: item.url,
        width: null,
        height: null,
        seed: null,
        model,
        prompt,
        negativePrompt: params.promptEngineOutput.negativePrompt ?? null,
      });
    }

    if (candidates.length === 0) {
      return {
        ok: false,
        provider: "xai",
        kind: "initial",
        errorCode: "XAI_EMPTY_RESULT",
        errorMessage: "xAI returned no image candidates.",
      };
    }

    return {
      ok: true,
      provider: "xai",
      kind: "initial",
      externalJobId: null,
      candidates,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "xai",
      kind: "initial",
      errorCode: "XAI_REQUEST_FAILED",
      errorMessage: error instanceof Error ? error.message : "xAI image request failed.",
    };
  }
}
