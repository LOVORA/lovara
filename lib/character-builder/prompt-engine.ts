import type {
  CharacterAgeBand,
  CharacterOutputType,
  HiddenPromptEngineInput,
  PromptEngineGenerationHints,
  PromptEngineIdentityLock,
  PromptEngineModerationFlags,
  PromptEngineOutput,
} from "./types";
import type { PromptTemplateBlock } from "./prompt-templates";
import {
  buildCanonicalPromptFromBlock,
  buildNegativePrompt,
  buildPromptSummary,
  createEmptyPromptTemplateBlock,
  mergePromptTemplateBlocks,
  PROMPT_VERSION,
} from "./prompt-templates";

const BLOCKED_TERMS = [
  "child",
  "minor",
  "underage",
  "teen",
  "schoolgirl",
  "school boy",
  "loli",
  "shota",
  "celebrity",
  "public figure",
  "real person",
  "rape",
  "forced",
  "non-consensual",
  "incest",
  "family sex",
  "bestiality",
] as const;

function normalizeText(value: string | null | undefined | false): string {
  return typeof value === "string" ? value.trim() : "";
}

function compactParts(
  parts: Array<string | null | undefined | false>,
): string[] {
  const seen = new Set<string>();

  return parts
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function toAdultAgeToken(ageBand?: CharacterAgeBand | ""): string | null {
  switch (ageBand) {
    case "18-20":
      return "adult 18-20 years old";
    case "21-24":
      return "adult 21-24 years old";
    case "25-29":
      return "adult 25-29 years old";
    case "30-39":
      return "adult 30-39 years old";
    case "40+":
      return "adult over 40";
    default:
      return "adult subject";
  }
}

function inferOutputType(input: HiddenPromptEngineInput): CharacterOutputType {
  if (input.builderMode === "custom_prompt") {
    const helperType = input.customPrompt?.helperOutputType;
    if (
      helperType === "selfie" ||
      helperType === "full_body" ||
      helperType === "portrait"
    ) {
      return helperType;
    }
  }

  const sceneType = input.presetSelections?.sceneType?.toLowerCase() ?? "";
  const cameraFraming =
    input.presetSelections?.cameraFraming?.toLowerCase() ?? "";

  if (sceneType.includes("selfie") || cameraFraming.includes("selfie")) {
    return "selfie";
  }

  if (cameraFraming.includes("full") || sceneType.includes("full-body")) {
    return "full_body";
  }

  return "portrait";
}

function moderateInput(input: HiddenPromptEngineInput): PromptEngineModerationFlags {
  const rawText =
    input.builderMode === "custom_prompt"
      ? [
          input.customPrompt?.promptText,
          input.customPrompt?.helperVibe,
          input.customPrompt?.locks?.region,
          input.customPrompt?.locks?.eyeColor,
          input.customPrompt?.locks?.hairColor,
        ]
          .filter(Boolean)
          .join(" ")
      : Object.values(input.presetSelections ?? {})
          .flatMap((section) =>
            typeof section === "object" && section !== null
              ? Object.values(section as Record<string, unknown>).map((value) =>
                  typeof value === "string" ? value : "",
                )
              : [],
          )
          .join(" ");

  const lower = rawText.toLowerCase();
  const reasons = BLOCKED_TERMS.filter((term) => lower.includes(term));

  return {
    needsBlock: reasons.length > 0,
    reasons: [...reasons],
  };
}

function buildPresetBlock(input: HiddenPromptEngineInput): PromptTemplateBlock {
  const preset = input.presetSelections;
  const block = createEmptyPromptTemplateBlock();

  if (!preset) return block;

  block.identity.push(
    ...compactParts([
      toAdultAgeToken(preset.ageBand),
      preset.region ? `${preset.region} inspired beauty` : null,
      preset.skinTone ? `${preset.skinTone} skin tone` : null,
      preset.genderPresentation
        ? `${preset.genderPresentation} presentation`
        : null,

      preset.eyeColor ? `${preset.eyeColor} eyes` : null,
      preset.eyeShape ? `${preset.eyeShape} eye shape` : null,
      preset.faceShape ? `${preset.faceShape} face shape` : null,
      preset.lipStyle ? `${preset.lipStyle} lips` : null,
      preset.noseType ? `${preset.noseType} nose` : null,
      preset.makeupLevel ? `${preset.makeupLevel} makeup` : null,

      preset.hairColor ? `${preset.hairColor} hair` : null,
      preset.hairLength ? `${preset.hairLength} hair length` : null,
      preset.hairTexture ? `${preset.hairTexture} hair texture` : null,
      preset.hairstyle ? `${preset.hairstyle} hairstyle` : null,

      preset.bodyType ? `${preset.bodyType} body type` : null,
      preset.bustSize ? `${preset.bustSize} bust` : null,
      preset.hipsType ? `${preset.hipsType} hips` : null,
      preset.heightImpression
        ? `${preset.heightImpression} height impression`
        : null,
      preset.waistDefinition ? `${preset.waistDefinition} waist` : null,
    ]),
  );

  block.aesthetics.push(
    ...compactParts([
      preset.mainVibe ? `${preset.mainVibe} vibe` : null,
      preset.energy ? `${preset.energy} energy` : null,
      preset.personaFlavor ? `${preset.personaFlavor} persona` : null,
      preset.outfitType || null,
      preset.outfitColor ? `${preset.outfitColor} color palette` : null,
      preset.exposureLevel ? `${preset.exposureLevel} exposure level` : null,
    ]),
  );

  block.scene.push(
    ...compactParts([
      preset.sceneType ? `${preset.sceneType} scene` : null,
      preset.cameraFraming ? `${preset.cameraFraming} framing` : null,
      preset.lightingType ? `${preset.lightingType} lighting` : null,
      preset.poseEnergy ? `${preset.poseEnergy} pose` : null,
      preset.expression ? `${preset.expression} expression` : null,
    ]),
  );

  block.quality.push(
    ...compactParts([
      preset.realismStrength ? `${preset.realismStrength} realism` : null,
      preset.detailLevel ? `${preset.detailLevel} detail level` : null,
      preset.variationGoal || null,
      "fictional adult character",
      "non-real-person",
    ]),
  );

  return block;
}

function sanitizeCustomPrompt(prompt: string): string {
  return prompt
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

function buildCustomPromptBlock(
  input: HiddenPromptEngineInput,
): PromptTemplateBlock {
  const custom = input.customPrompt;
  const block = createEmptyPromptTemplateBlock();

  if (!custom) return block;

  const promptText = sanitizeCustomPrompt(custom.promptText);

  block.identity.push(
    ...compactParts([
      "fictional adult character",
      "non-real-person",
      promptText,
      toAdultAgeToken(custom.locks?.ageBand),
      custom.locks?.region ? `${custom.locks.region} inspired beauty` : null,
      custom.locks?.eyeColor ? `${custom.locks.eyeColor} eyes` : null,
      custom.locks?.hairColor ? `${custom.locks.hairColor} hair` : null,
    ]),
  );

  block.aesthetics.push(
    ...compactParts([custom.helperVibe ? `${custom.helperVibe} vibe` : null]),
  );

  return block;
}

function buildIdentityLock(
  input: HiddenPromptEngineInput,
): PromptEngineIdentityLock {
  if (input.builderMode === "custom_prompt") {
    return {
      immutableTokens: compactParts([
        toAdultAgeToken(input.customPrompt?.locks?.ageBand),
        input.customPrompt?.locks?.region,
        input.customPrompt?.locks?.eyeColor,
        input.customPrompt?.locks?.hairColor,
      ]),
      mutableTokens: compactParts([
        input.customPrompt?.helperOutputType,
        input.customPrompt?.helperVibe,
      ]),
    };
  }

  const preset = input.presetSelections;

  return {
    immutableTokens: compactParts([
      toAdultAgeToken(preset?.ageBand),
      preset?.region,
      preset?.skinTone,
      preset?.eyeColor,
      preset?.hairColor,
      preset?.hairLength,
      preset?.hairTexture,
      preset?.hairstyle,
      preset?.bodyType,
      preset?.bustSize,
      preset?.hipsType,
      preset?.mainVibe,
    ]),
    mutableTokens: compactParts([
      preset?.outfitType,
      preset?.outfitColor,
      preset?.sceneType,
      preset?.cameraFraming,
      preset?.lightingType,
      preset?.poseEnergy,
      preset?.expression,
      preset?.variationGoal,
    ]),
  };
}

function buildGenerationHints(
  input: HiddenPromptEngineInput,
): PromptEngineGenerationHints {
  return {
    outputType: inferOutputType(input),
    consistencyMode: "seed_only",
    safetyMode: "strict",
  };
}

function buildContextualNegativePrompt(
  input: HiddenPromptEngineInput,
  generationHints: PromptEngineGenerationHints,
  identityLock: PromptEngineIdentityLock,
): string {
  const outputTypeExtras =
    generationHints.outputType === "selfie"
      ? [
          "bad selfie angle",
          "distorted arm length",
          "phone covering face",
          "awkward handheld crop",
        ]
      : generationHints.outputType === "full_body"
        ? [
            "cut off legs",
            "missing feet",
            "cropped knees",
            "bad full body proportions",
          ]
        : [
            "cropped hairline",
            "cropped shoulders",
            "awkward portrait crop",
          ];

  const styleExtras =
    input.styleType === "anime"
      ? ["messy linework", "muddy shading", "off-model face"]
      : ["cgi skin", "wax face", "unnatural skin retouching"];

  const lockExtras = identityLock.immutableTokens.flatMap((token) => {
    const lowered = token.toLowerCase();

    if (lowered.includes("hair")) return ["wrong hair color", "wrong hairstyle"];
    if (lowered.includes("eye")) return ["wrong eye color"];
    if (lowered.includes("adult")) return ["younger-looking subject"];
    if (lowered.includes("skin")) return ["wrong skin tone"];
    return [];
  });

  return buildNegativePrompt([...outputTypeExtras, ...styleExtras, ...lockExtras]);
}

export function buildHiddenPromptEngineInputFromPreset(args: {
  styleType: HiddenPromptEngineInput["styleType"];
  presetSelections: NonNullable<HiddenPromptEngineInput["presetSelections"]>;
}): HiddenPromptEngineInput {
  return {
    styleType: args.styleType,
    builderMode: "preset",
    presetSelections: args.presetSelections,
  };
}

export function buildHiddenPromptEngineInputFromCustomPrompt(args: {
  styleType: HiddenPromptEngineInput["styleType"];
  customPrompt: NonNullable<HiddenPromptEngineInput["customPrompt"]>;
}): HiddenPromptEngineInput {
  return {
    styleType: args.styleType,
    builderMode: "custom_prompt",
    customPrompt: args.customPrompt,
  };
}

export function runPromptEngine(
  input: HiddenPromptEngineInput,
): PromptEngineOutput {
  const moderationFlags = moderateInput(input);
  const generationHints = buildGenerationHints(input);
  const identityLock = buildIdentityLock(input);

  if (moderationFlags.needsBlock) {
    return {
      promptSummary: "Blocked request",
      canonicalPrompt: "",
      negativePrompt: buildNegativePrompt(),
      moderationFlags,
      generationHints,
      identityLock,
    };
  }

  const baseBlock =
    input.builderMode === "custom_prompt"
      ? buildCustomPromptBlock(input)
      : buildPresetBlock(input);

  const mergedBlock = mergePromptTemplateBlocks(baseBlock, {
    quality: [`prompt version ${PROMPT_VERSION}`, "adult-only fictional subject"],
  });

  const canonicalPrompt = buildCanonicalPromptFromBlock(mergedBlock, {
    styleType: input.styleType,
    builderMode: input.builderMode,
    outputType: generationHints.outputType,
  });

  const negativePrompt = buildContextualNegativePrompt(
    input,
    generationHints,
    identityLock,
  );

  const promptSummary =
    input.builderMode === "custom_prompt"
      ? buildPromptSummary([
          input.customPrompt?.helperVibe,
          input.customPrompt?.helperOutputType,
          ...identityLock.immutableTokens,
        ])
      : buildPromptSummary([
          input.presetSelections?.mainVibe,
          input.presetSelections?.region,
          input.presetSelections?.eyeColor,
          input.presetSelections?.hairColor,
          input.presetSelections?.sceneType,
          input.presetSelections?.outfitType,
        ]);

  return {
    promptSummary,
    canonicalPrompt,
    negativePrompt,
    moderationFlags,
    generationHints,
    identityLock,
  };
}
