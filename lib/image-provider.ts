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

function compact(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(", ");
}

function buildPositivePrompt(input: CharacterImagePromptInput) {
  return compact([
    `${input.characterName}, fictional adult character`,
    input.ageBand ? `age ${input.ageBand}` : undefined,
    input.genderPresentation,
    input.region,
    input.archetype,
    input.visualAura,
    input.avatarStyle,
    input.bodyType,
    input.hair,
    input.eyes,
    input.outfit,
    input.palette ? `color palette ${input.palette}` : undefined,
    input.camera,
    input.pose,
    input.expression,
    input.environment,
    "high detail",
    "cinematic lighting",
    "coherent anatomy",
    "premium portrait",
    input.nsfwLevel === "adult"
      ? "adult fictional character, tasteful erotic energy"
      : input.nsfwLevel === "suggestive"
        ? "suggestive styling"
        : undefined,
  ]);
}

function buildNegativePrompt() {
  return compact([
    "minor",
    "young-looking",
    "child",
    "teen",
    "underage",
    "real person",
    "celebrity",
    "public figure",
    "non-consensual",
    "rape",
    "violence",
    "gore",
    "bestiality",
    "incest",
    "low quality",
    "blurry",
    "deformed hands",
    "extra fingers",
    "bad anatomy",
    "duplicate body",
    "watermark",
    "text",
    "logo",
  ]);
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestMageImage(args: {
  prompt: string;
  negativePrompt: string;
  kind: "avatar" | "gallery";
}): Promise<RequestImageGenerationResult> {
  const baseUrl = process.env.NEXT_PUBLIC_MAGE_API_BASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_MAGE_API_KEY;

  if (!baseUrl) {
    return {
      ok: false,
      errorMessage: "NEXT_PUBLIC_MAGE_API_BASE_URL is missing.",
    };
  }

  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      prompt: args.prompt,
      negative_prompt: args.negativePrompt,
      kind: args.kind,
    }),
  });

  const payload = await safeJson(response);

  if (!response.ok) {
    return {
      ok: false,
      errorMessage:
        (payload &&
          typeof payload === "object" &&
          typeof (payload as Record<string, unknown>).message === "string" &&
          ((payload as Record<string, unknown>).message as string)) ||
        "Mage request failed.",
    };
  }

  const data =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const imageUrl =
    typeof data.imageUrl === "string"
      ? data.imageUrl
      : typeof data.image_url === "string"
        ? data.image_url
        : null;

  const externalJobId =
    typeof data.jobId === "string"
      ? data.jobId
      : typeof data.job_id === "string"
        ? data.job_id
        : typeof data.id === "string"
          ? data.id
          : null;

  const revisedPrompt =
    typeof data.revisedPrompt === "string"
      ? data.revisedPrompt
      : typeof data.revised_prompt === "string"
        ? data.revised_prompt
        : args.prompt;

  const revisedNegativePrompt =
    typeof data.revisedNegativePrompt === "string"
      ? data.revisedNegativePrompt
      : typeof data.revised_negative_prompt === "string"
        ? data.revised_negative_prompt
        : args.negativePrompt;

  if (imageUrl) {
    return {
      ok: true,
      imageUrl,
      externalJobId: null,
      revisedPrompt,
      revisedNegativePrompt,
    };
  }

  if (externalJobId) {
    return {
      ok: true,
      imageUrl: null,
      externalJobId,
      revisedPrompt,
      revisedNegativePrompt,
    };
  }

  return {
    ok: false,
    errorMessage: "Mage returned neither imageUrl nor job id.",
  };
}

async function requestComfyImage(args: {
  prompt: string;
  negativePrompt: string;
  kind: "avatar" | "gallery";
}): Promise<RequestImageGenerationResult> {
  const baseUrl = process.env.NEXT_PUBLIC_COMFY_API_BASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_COMFY_API_KEY;

  if (!baseUrl) {
    return {
      ok: false,
      errorMessage: "NEXT_PUBLIC_COMFY_API_BASE_URL is missing.",
    };
  }

  const workflow = {
    prompt: {
      "3": {
        class_type: "KSampler",
        inputs: {
          seed: Math.floor(Math.random() * 1_000_000_000),
          steps: args.kind === "avatar" ? 28 : 30,
          cfg: 6.5,
          sampler_name: "euler",
          scheduler: "normal",
          denoise: 1,
          model: ["4", 0],
          positive: ["6", 0],
          negative: ["7", 0],
          latent_image: ["5", 0],
        },
      },
      "4": {
        class_type: "CheckpointLoaderSimple",
        inputs: {
          ckpt_name: "model.safetensors",
        },
      },
      "5": {
        class_type: "EmptyLatentImage",
        inputs: {
          width: 832,
          height: 1216,
          batch_size: 1,
        },
      },
      "6": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: args.prompt,
          clip: ["4", 1],
        },
      },
      "7": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: args.negativePrompt,
          clip: ["4", 1],
        },
      },
      "8": {
        class_type: "VAEDecode",
        inputs: {
          samples: ["3", 0],
          vae: ["4", 2],
        },
      },
      "9": {
        class_type: "SaveImage",
        inputs: {
          filename_prefix: "lovora_avatar",
          images: ["8", 0],
        },
      },
    },
  };

  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(workflow),
  });

  const payload = await safeJson(response);

  if (!response.ok) {
    return {
      ok: false,
      errorMessage:
        (payload &&
          typeof payload === "object" &&
          typeof (payload as Record<string, unknown>).error === "string" &&
          ((payload as Record<string, unknown>).error as string)) ||
        "ComfyUI request failed.",
    };
  }

  const data =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const externalJobId =
    typeof data.prompt_id === "string"
      ? data.prompt_id
      : typeof data.jobId === "string"
        ? data.jobId
        : null;

  if (!externalJobId) {
    return {
      ok: false,
      errorMessage: "ComfyUI did not return a prompt id.",
    };
  }

  return {
    ok: true,
    imageUrl: null,
    externalJobId,
    revisedPrompt: args.prompt,
    revisedNegativePrompt: args.negativePrompt,
  };
}

export async function requestImageGeneration(
  args: RequestImageGenerationArgs,
): Promise<RequestImageGenerationResult> {
  ensureSafety(args.safety);

  const prompt = buildPositivePrompt(args.promptInput);
  const negativePrompt = buildNegativePrompt();

  if (!prompt.trim()) {
    return {
      ok: false,
      errorMessage: "Prompt could not be built.",
    };
  }

  if (args.provider === "mage") {
    return requestMageImage({
      prompt,
      negativePrompt,
      kind: args.kind,
    });
  }

  return requestComfyImage({
    prompt,
    negativePrompt,
    kind: args.kind,
  });
}
