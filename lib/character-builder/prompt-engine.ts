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
import { deriveVisualChoiceProfile } from "@/lib/create-character/choice-weighting";
import {
  REFERENCE_REALISM_NEGATIVE_ANCHORS,
  REFERENCE_REALISM_POSITIVE_ANCHORS,
  normalizeActiveOutputType,
} from "@/lib/create-character/reference-realism";
import { inspectOriginalityFromHiddenInput } from "@/lib/image-generation/originality-guard";

const BLOCKED_TERMS = [
  "child",
  "minor",
  "underage",
  "teen",
  "schoolgirl",
  "school boy",
  "loli",
  "shota",
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

function sanitizeOriginalityText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\banime\b/gi, "illustrated")
    .replace(/\bmanga\b/gi, "illustrated")
    .replace(/\bcelebrity\b/gi, "fictional adult")
    .replace(/\bpublic figure\b/gi, "fictional adult")
    .replace(/\breal person\b/gi, "fictional adult")
    .replace(/\breal woman\b/gi, "fictional adult")
    .replace(/\breal man\b/gi, "fictional adult")
    .replace(/\binspired\s+by\b/gi, "built around")
    .replace(/\blooks?\s+like\b/gi, "keeps")
    .trim();
}

function sanitizeHiddenInputForOriginality(
  input: HiddenPromptEngineInput,
): HiddenPromptEngineInput {
  if (input.builderMode === "custom_prompt") {
    return {
      ...input,
      customPrompt: input.customPrompt
        ? {
            ...input.customPrompt,
            promptText: sanitizeOriginalityText(input.customPrompt.promptText),
            helperVibe: sanitizeOriginalityText(input.customPrompt.helperVibe),
            locks: input.customPrompt.locks
              ? {
                  ...input.customPrompt.locks,
                  region: sanitizeOriginalityText(input.customPrompt.locks.region),
                  eyeColor: sanitizeOriginalityText(
                    input.customPrompt.locks.eyeColor,
                  ),
                  hairColor: sanitizeOriginalityText(
                    input.customPrompt.locks.hairColor,
                  ),
                }
              : input.customPrompt.locks,
          }
        : input.customPrompt,
    };
  }

  return {
    ...input,
    presetSelections: input.presetSelections
      ? {
          ...input.presetSelections,
          region: sanitizeOriginalityText(input.presetSelections.region),
          profession: sanitizeOriginalityText(input.presetSelections.profession),
          skinTone: sanitizeOriginalityText(input.presetSelections.skinTone),
          eyeColor: sanitizeOriginalityText(input.presetSelections.eyeColor),
          eyeShape: sanitizeOriginalityText(input.presetSelections.eyeShape),
          makeupLevel: sanitizeOriginalityText(input.presetSelections.makeupLevel),
          hairColor: sanitizeOriginalityText(input.presetSelections.hairColor),
          hairLength: sanitizeOriginalityText(input.presetSelections.hairLength),
          hairTexture: sanitizeOriginalityText(input.presetSelections.hairTexture),
          hairstyle: sanitizeOriginalityText(input.presetSelections.hairstyle),
          mainVibe: sanitizeOriginalityText(input.presetSelections.mainVibe),
          energy: sanitizeOriginalityText(input.presetSelections.energy),
          personaFlavor: sanitizeOriginalityText(
            input.presetSelections.personaFlavor,
          ),
          outfitType: sanitizeOriginalityText(input.presetSelections.outfitType),
          outfitColor: sanitizeOriginalityText(input.presetSelections.outfitColor),
          sceneType: sanitizeOriginalityText(input.presetSelections.sceneType),
          backgroundIntent: sanitizeOriginalityText(
            input.presetSelections.backgroundIntent,
          ),
          outfitIntent: sanitizeOriginalityText(input.presetSelections.outfitIntent),
          cameraFraming: sanitizeOriginalityText(
            input.presetSelections.cameraFraming,
          ),
          lightingType: sanitizeOriginalityText(input.presetSelections.lightingType),
          poseEnergy: sanitizeOriginalityText(input.presetSelections.poseEnergy),
          expression: sanitizeOriginalityText(input.presetSelections.expression),
          variationGoal: sanitizeOriginalityText(
            input.presetSelections.variationGoal,
          ),
        }
      : input.presetSelections,
  };
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
    case "40-49":
      return "adult 40-49 years old";
    case "50-59":
      return "adult 50-59 years old";
    case "60-70":
      return "adult 60-70 years old";
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
      helperType === "portrait" ||
      helperType === "upper_body"
    ) {
      return normalizeActiveOutputType(helperType);
    }
  }

  const sceneType = input.presetSelections?.sceneType?.toLowerCase() ?? "";
  const cameraFraming =
    input.presetSelections?.cameraFraming?.toLowerCase() ?? "";

  if (sceneType.includes("selfie") || cameraFraming.includes("selfie")) {
    return "selfie";
  }

  return normalizeActiveOutputType(
    cameraFraming.includes("full") || sceneType.includes("full-body")
      ? "full_body"
      : cameraFraming.includes("selfie") || sceneType.includes("selfie")
        ? "selfie"
        : "upper_body",
  );
}

function moderateInput(input: HiddenPromptEngineInput): PromptEngineModerationFlags {
  // Only inspect user-originating hidden input text here.
  // Brand/style/lookalike moderation is handled separately by originality guard,
  // and internal guardrails like "no anime exaggeration" should not block generation.
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
      : [
          input.presetSelections?.ageBand,
          input.presetSelections?.region,
          input.presetSelections?.profession,
          input.presetSelections?.relationshipToUser,
          input.presetSelections?.relationshipDynamic,
          input.presetSelections?.behaviorMode,
          input.presetSelections?.skinTone,
          input.presetSelections?.genderPresentation,
          input.presetSelections?.eyeColor,
          input.presetSelections?.eyeShape,
          input.presetSelections?.faceShape,
          input.presetSelections?.lipStyle,
          input.presetSelections?.noseType,
          input.presetSelections?.makeupLevel,
          input.presetSelections?.hairColor,
          input.presetSelections?.hairLength,
          input.presetSelections?.hairTexture,
          input.presetSelections?.hairstyle,
          input.presetSelections?.bodyType,
          input.presetSelections?.bustSize,
          input.presetSelections?.breastType,
          input.presetSelections?.hipsType,
          input.presetSelections?.buttSize,
          input.presetSelections?.heightImpression,
          input.presetSelections?.waistDefinition,
          input.presetSelections?.mainVibe,
          input.presetSelections?.energy,
          input.presetSelections?.personaFlavor,
          input.presetSelections?.outfitType,
          input.presetSelections?.outfitColor,
          input.presetSelections?.exposureLevel,
          input.presetSelections?.sceneType,
          input.presetSelections?.backgroundIntent,
          input.presetSelections?.outfitIntent,
          input.presetSelections?.nudityMode,
          input.presetSelections?.faceBias,
          input.presetSelections?.bodyReadPriority,
          input.presetSelections?.cameraFraming,
          input.presetSelections?.lightingType,
          input.presetSelections?.poseEnergy,
          input.presetSelections?.expression,
          input.presetSelections?.realismStrength,
          input.presetSelections?.detailLevel,
          input.presetSelections?.variationGoal,
          input.presetSelections?.hobbies,
          input.presetSelections?.fetishes,
          input.presetSelections?.extraPersonalityDetails,
          input.presetSelections?.extraPhysicalDetails,
        ]
          .filter(Boolean)
          .join(" ");

  const lower = rawText.toLowerCase();
  const reasons = BLOCKED_TERMS.filter((term) => lower.includes(term));
  const originality = inspectOriginalityFromHiddenInput(
    sanitizeHiddenInputForOriginality(input),
  );

  return {
    needsBlock: reasons.length > 0 || originality.decision === "block",
    reasons: compactParts([...reasons, ...originality.reasons]),
    matchedTerms: originality.matchedTerms,
    blockedRequestReason: originality.blockedReason,
    safetyDecision: originality.decision,
    suggestedOriginalAlternatives: originality.safeAlternatives,
    normalizedRequestProfile: originality.normalizedRequestProfile,
  };
}

function buildPresetIdentityRefinements(
  preset: NonNullable<HiddenPromptEngineInput["presetSelections"]>,
): string[] {
  const bustSizeAnchor =
    preset.bustSize === "flat"
      ? "very small breasts"
      : preset.bustSize === "small"
        ? "small breasts"
        : preset.bustSize === "medium"
          ? "medium breasts"
          : preset.bustSize === "large" || preset.bustSize === "full"
            ? "large breasts"
            : preset.bustSize === "xl" || preset.bustSize === "very full"
              ? "very large breasts"
              : preset.bustSize;
  const breastTypeAnchor =
    preset.breastType === "regular" || preset.breastType === "natural"
      ? "natural breast shape"
      : preset.breastType === "perky"
        ? "perky breast shape"
        : preset.breastType === "saggy" || preset.breastType === "soft lower-set"
          ? "soft lower-hanging breast shape"
          : preset.breastType === "torpedo"
            ? "forward-projecting breast shape"
            : preset.breastType === "fake" || preset.breastType === "augmented"
              ? "augmented breast shape"
              : preset.breastType === "round full"
                ? "round full breast shape"
              : preset.breastType;
  const buttSizeAnchor =
    preset.buttSize === "small"
      ? "small butt"
      : preset.buttSize === "perky"
        ? "perky butt"
        : preset.buttSize === "athletic"
        ? "athletic glutes"
        : preset.buttSize === "medium"
          ? "medium butt"
            : preset.buttSize === "big" || preset.buttSize === "full"
              ? "large butt"
              : preset.buttSize === "very full"
                ? "very full butt"
              : preset.buttSize;
  const visualChoice = deriveVisualChoiceProfile({
    ageValue: preset.ageValue ?? null,
    ageBand: preset.ageBand,
    region: preset.region,
    profession: preset.profession,
    tone: preset.energy,
    visualAura: preset.mainVibe,
    bodyType: preset.bodyType,
    outfit: preset.outfitType,
    lightingMood: preset.lightingType,
    expression: preset.expression,
    camera: preset.cameraFraming,
  });

  return compactParts([
    "single adult subject",
    "consistent facial identity",
    "coherent facial proportions",
    "stable eye spacing and jawline",
    "face remains readable under styling and lighting changes",
    preset.eyeColor || preset.eyeShape ? "defined eye area with clean symmetry" : null,
    preset.hairColor || preset.hairstyle ? "consistent hair identity from root to silhouette" : null,
    preset.bodyType ? "stable body proportions matching the selected silhouette" : null,
    preset.bodyType && preset.bodyType !== "pregnant"
      ? "flat non-pregnant abdomen unless pregnancy is explicitly selected"
      : null,
    preset.bodyType === "pregnant"
      ? "clearly pregnant body with visible pregnant belly"
      : null,
    bustSizeAnchor ? `chest size must clearly read as ${bustSizeAnchor}` : null,
    bustSizeAnchor
      ? `selected chest size is a hard visual requirement and must not be reduced or hidden: ${bustSizeAnchor}`
      : null,
    breastTypeAnchor
      ? `breast shape must clearly read as ${breastTypeAnchor}`
      : null,
    breastTypeAnchor
      ? `selected breast shape is a hard visual requirement and must stay clearly visible: ${breastTypeAnchor}`
      : null,
    buttSizeAnchor ? `butt size must clearly read as ${buttSizeAnchor}` : null,
    buttSizeAnchor
      ? `selected butt size is a hard visual requirement and must not be flattened or hidden: ${buttSizeAnchor}`
      : null,
    preset.bustSize || preset.breastType || preset.hipsType || preset.buttSize || preset.waistDefinition
      ? "balanced torso and lower-body proportions"
      : null,
    preset.bustSize || preset.breastType || preset.buttSize
      ? "body-visible framing where chest, waist, hips, and upper legs remain readable"
      : null,
    preset.bustSize || preset.breastType || preset.buttSize
      ? "selected body proportions must remain visible in the final image instead of collapsing into a portrait crop"
      : null,
    preset.skinTone ? "skin tone consistency across face and body" : null,
    preset.faceBias === "soft_feminine"
      ? "soft feminine adult face with smooth facial transitions"
      : null,
    preset.faceBias === "soft_feminine"
      ? "gentle jawline and feminine cheek and eye area"
      : null,
    preset.bodyReadPriority === "high"
      ? "upper-body or full-body framing with readable torso, waist, and hips"
      : null,
    ...(preset.identityLockHints ?? []),
    ...visualChoice.identityRefinements,
  ]);
}

function buildPresetAestheticRefinements(
  preset: NonNullable<HiddenPromptEngineInput["presetSelections"]>,
): string[] {
  const visualChoice = deriveVisualChoiceProfile({
    ageValue: preset.ageValue ?? null,
    ageBand: preset.ageBand,
    region: preset.region,
    visualAura: preset.mainVibe,
    bodyType: preset.bodyType,
    outfit: preset.outfitType,
    lightingMood: preset.lightingType,
    accessoryVibe: preset.variationGoal,
    expression: preset.expression,
  });

  return compactParts([
    "cohesive styling",
    "grounded real-person presentation",
    "wardrobe, hair, makeup, and accessories stay believable and natural together",
    "real-world wardrobe and beauty logic with no glossy studio-styled drift",
    preset.profession
      ? `selected profession should remain visually readable: ${preset.profession}`
      : null,
    preset.outfitType ? `outfit built around ${preset.outfitType}` : null,
    preset.outfitType ? "outfit must remain visually obvious and readable" : null,
    preset.outfitIntent ? preset.outfitIntent : null,
    preset.nudityMode === "true_nude"
      ? "true nude contract with no clothing or underwear added"
      : null,
    preset.nudityMode === "implied_nude"
      ? "implied nude contract with strategic coverage and no full nude escalation"
      : null,
    preset.outfitColor ? `${preset.outfitColor} wardrobe palette kept consistent` : null,
    preset.mainVibe ? `${preset.mainVibe} emotional presence` : null,
    preset.personaFlavor ? `${preset.personaFlavor} character flavor` : null,
    preset.energy ? `${preset.energy} body energy` : null,
    preset.exposureLevel ? `${preset.exposureLevel} styling restraint` : null,
    preset.hobbies ? `${preset.hobbies} hobby cues kept subtle and believable` : null,
    ...(preset.constitutionHints ?? []).slice(0, 8),
    ...visualChoice.aestheticRefinements,
  ]);
}

function buildPresetSceneRefinements(
  preset: NonNullable<HiddenPromptEngineInput["presetSelections"]>,
  outputType: CharacterOutputType,
): string[] {
  const visualChoice = deriveVisualChoiceProfile({
    ageValue: preset.ageValue ?? null,
    ageBand: preset.ageBand,
    profession: preset.profession || preset.personaFlavor,
    sceneType: preset.sceneType || preset.backgroundIntent,
    setting: preset.backgroundIntent || preset.sceneType,
    visualAura: preset.mainVibe,
    bodyType: preset.bodyType,
    outfit: preset.outfitType,
    lightingMood: preset.lightingType,
    expression: preset.expression,
    camera: preset.cameraFraming,
  });

  return compactParts([
    "single-subject composition",
    "clean background separation",
    "scene reads like a believable real photo rather than a staged fashion image",
    "background should feel naturally lived-in with believable room scale",
    "clear subject priority with grounded atmosphere",
    preset.profession
      ? `selected profession must read clearly in the setting: ${preset.profession}`
      : null,
    preset.outfitType
      ? "framing should keep enough body and wardrobe visibility to clearly read the selected outfit"
      : null,
    preset.sceneType ? `${preset.sceneType} mood` : null,
    preset.backgroundIntent ? preset.backgroundIntent : null,
    preset.outfitIntent ? preset.outfitIntent : null,
    preset.bodyReadPriority === "high"
      ? "framing must keep chest, waist, hips, and outfit read visible"
      : null,
    preset.nudityMode === "true_nude"
      ? "clear unclothed adult body read with no clothing remnants"
      : null,
    preset.nudityMode === "implied_nude"
      ? "strategically covered body read without full nude reveal"
      : null,
    preset.lightingType ? `${preset.lightingType} light shaping` : null,
    preset.poseEnergy ? `${preset.poseEnergy} body language` : null,
    preset.expression ? `${preset.expression} facial expression` : null,
    preset.relationshipToUser
      ? `relationship context should remain visible: ${preset.relationshipToUser}`
      : null,
    preset.relationshipDynamic
      ? `scene chemistry should match ${preset.relationshipDynamic}`
      : null,
    preset.behaviorMode ? `behavior should read as ${preset.behaviorMode}` : null,
    preset.variationGoal ? `${preset.variationGoal} variation goal` : null,
    outputType === "upper_body"
      ? "camera attention stays on face, torso, and natural upper-body framing"
      : null,
    outputType === "upper_body" && preset.bodyReadPriority === "high"
      ? "upper-body framing must still show the stomach line, torso, waist, and upper hips instead of a face-only crop"
      : null,
    outputType === "selfie"
      ? "credible handheld phone-camera perspective with natural angle"
      : null,
    outputType === "full_body"
      ? "full silhouette preserved with legs, posture, and stance readable"
      : null,
    ...(preset.constitutionHints ?? []).slice(0, 10),
    ...visualChoice.sceneRefinements,
  ]);
}

function buildPoseContractPromptParts(
  preset: NonNullable<HiddenPromptEngineInput["presetSelections"]>,
): string[] {
  const poseContract = preset.poseContract;
  if (!poseContract) return [];

  return compactParts([
    `exact pose family: ${poseContract.poseFamily}`,
    poseContract.posePrompt,
    poseContract.bodyLinePrompt,
    poseContract.cropDiscipline,
    `gaze direction: ${poseContract.gazeDirection}`,
    `hand language: ${poseContract.handLanguage}`,
    poseContract.framingBias === "full_body"
      ? "full-body pose framing with readable full silhouette"
      : "upper-body pose framing with visible torso, waist, and stomach line",
    "pose contract should remain a first-class image decision",
  ]);
}

function buildPresetQualityRefinements(
  preset: NonNullable<HiddenPromptEngineInput["presetSelections"]>,
): string[] {
  const visualChoice = deriveVisualChoiceProfile({
    ageValue: preset.ageValue ?? null,
    ageBand: preset.ageBand,
    profession: preset.profession || preset.personaFlavor,
    sceneType: preset.sceneType || preset.backgroundIntent,
    visualAura: preset.mainVibe,
    bodyType: preset.bodyType,
    outfit: preset.outfitType,
    lightingMood: preset.lightingType,
    expression: preset.expression,
  });

  return compactParts([
    "high-detail natural finish",
    "clean subject focus",
    "clean subject isolation",
    "realistic photo quality",
    "crisp, high-clarity realistic image quality",
    "lively natural light with richer color separation",
    "healthy skin tone rendering with brighter but believable light",
    "controlled natural depth and real-camera lens feel",
    "identity-first composition",
    "authentic lifestyle photo finish",
    "non-editorial realism with believable room and clothing detail",
    ...REFERENCE_REALISM_POSITIVE_ANCHORS,
    preset.faceBias === "soft_feminine"
      ? "soft feminine beauty-first realism with smooth facial structure"
      : null,
    preset.faceBias === "soft_feminine"
      ? "pretty realistic adult face without hard angular facial planes"
      : null,
    preset.realismStrength ? `${preset.realismStrength} realism treatment` : null,
    preset.detailLevel ? `${preset.detailLevel} texture density` : null,
    ...(preset.constitutionHints ?? []).slice(0, 10),
    ...visualChoice.qualityRefinements,
  ]);
}

function buildSelectionContractPromptParts(
  preset: NonNullable<HiddenPromptEngineInput["presetSelections"]>,
) {
  const contract = preset.selectionPromptContract;

  if (!contract) {
    return {
      identity: [] as string[],
      aesthetics: [] as string[],
      scene: [] as string[],
      quality: [] as string[],
      summary: [] as string[],
    };
  }

  return {
    identity: compactParts([
      ...contract.identity,
      ...contract.face,
      ...contract.hair,
      ...contract.body,
    ]),
    aesthetics: compactParts([
      ...contract.outfit,
      ...contract.imageMood,
      ...contract.extraPhysical,
    ]),
    scene: compactParts([
      ...contract.scenario,
      ...contract.hobbies,
      ...contract.fetishes,
    ]),
    quality: compactParts([
      ...contract.personality,
      ...contract.extraPersonality,
    ]),
    summary: compactParts(contract.promptSummary),
  };
}

function buildPresetBlock(input: HiddenPromptEngineInput): PromptTemplateBlock {
  const preset = input.presetSelections;
  const block = createEmptyPromptTemplateBlock();
  const outputType = inferOutputType(input);

  if (!preset) return block;
  const contractParts = buildSelectionContractPromptParts(preset);
  const poseContractParts = buildPoseContractPromptParts(preset);

  block.identity.push(
    ...compactParts([
      toAdultAgeToken(preset.ageBand),
      typeof preset.ageValue === "number"
        ? `adult ${preset.ageValue} years old`
        : null,
      preset.region ? `${preset.region} adult woman with clear facial features` : null,
      preset.profession ? `${preset.profession} role` : null,
      preset.relationshipToUser
        ? `${preset.relationshipToUser} relationship context`
        : null,
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
      preset.bustSize ? `${preset.bustSize} bust size` : null,
      preset.breastType ? `${preset.breastType} breast shape` : null,
      preset.hipsType ? `${preset.hipsType} hips` : null,
      preset.buttSize ? `${preset.buttSize} butt size` : null,
      preset.heightImpression
        ? `${preset.heightImpression} height impression`
        : null,
      preset.waistDefinition ? `${preset.waistDefinition} waist` : null,
      ...(preset.identityLockHints ?? []),
    ]),
    ...poseContractParts,
    ...contractParts.identity,
    ...buildPresetIdentityRefinements(preset),
  );

  block.aesthetics.push(
    ...compactParts([
      preset.mainVibe ? `${preset.mainVibe} vibe` : null,
      preset.energy ? `${preset.energy} energy` : null,
      preset.personaFlavor ? `${preset.personaFlavor} persona` : null,
      preset.profession ? `${preset.profession} profession` : null,
      preset.outfitType || null,
      preset.outfitIntent || null,
      preset.nudityMode === "true_nude"
        ? "true nude unclothed body"
        : preset.nudityMode === "implied_nude"
          ? "implied nude strategic coverage"
          : null,
      preset.faceBias === "soft_feminine" ? "soft feminine face" : null,
      preset.bodyReadPriority === "high" ? "high body readability" : null,
      preset.outfitColor ? `${preset.outfitColor} color palette` : null,
      preset.exposureLevel ? `${preset.exposureLevel} exposure level` : null,
      preset.backgroundIntent || null,
      ...(preset.hiddenVisualSectionPrompts ?? []).slice(0, 6),
      preset.masterVisualPrompt || null,
      ...(preset.constitutionHints ?? []).slice(0, 8),
    ]),
    ...contractParts.aesthetics,
    ...buildPresetAestheticRefinements(preset),
  );

  block.scene.push(
    ...compactParts([
      preset.sceneType ? `${preset.sceneType} scene` : null,
      preset.backgroundIntent ? `${preset.backgroundIntent} background` : null,
      preset.cameraFraming ? `${preset.cameraFraming} framing` : null,
      preset.lightingType ? `${preset.lightingType} lighting` : null,
      preset.poseEnergy ? `${preset.poseEnergy} pose` : null,
      preset.expression ? `${preset.expression} expression` : null,
      preset.behaviorMode ? `${preset.behaviorMode} behavior mode` : null,
      ...(preset.hiddenVisualSectionPrompts ?? []).slice(0, 6),
      ...(preset.constitutionHints ?? []).slice(0, 10),
    ]),
    ...poseContractParts,
    ...contractParts.scene,
    ...buildPresetSceneRefinements(preset, outputType),
  );

  block.quality.push(
    ...compactParts([
      preset.realismStrength ? `${preset.realismStrength} realism` : null,
      preset.detailLevel ? `${preset.detailLevel} detail level` : null,
      preset.variationGoal || null,
      preset.hobbies ? `${preset.hobbies} hobby note` : null,
      preset.fetishes ? `${preset.fetishes} preference note` : null,
      preset.extraPersonalityDetails || null,
      preset.extraPhysicalDetails || null,
      "fictional adult character",
      "non-real-person",
      preset.masterVisualPrompt || null,
      ...(preset.constitutionHints ?? []).slice(0, 10),
    ]),
    ...contractParts.quality,
    ...buildPresetQualityRefinements(preset),
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

  block.scene.push(
    ...compactParts([
      custom.helperOutputType ? `${custom.helperOutputType} framing` : null,
      "single-subject composition",
      "coherent facial identity",
      "clean scene focus",
    ]),
  );

  block.quality.push(
    ...compactParts([
      "authentic realistic photo finish",
      "consistent subject identity",
      "clean anatomy and composition",
      "grounded lifestyle-photo realism",
    ]),
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
      typeof preset?.ageValue === "number"
        ? `adult ${preset.ageValue} years old`
        : null,
      preset?.region,
      preset?.skinTone,
      preset?.eyeColor,
      preset?.hairColor,
      preset?.hairLength,
      preset?.hairTexture,
      preset?.hairstyle,
      preset?.bodyType,
      preset?.bustSize,
      preset?.breastType,
      preset?.hipsType,
      preset?.buttSize,
      preset?.faceBias === "soft_feminine" ? "soft feminine face" : null,
      preset?.mainVibe,
      ...(preset?.selectionPromptContract?.identity ?? []),
      ...(preset?.selectionPromptContract?.face ?? []),
      ...(preset?.selectionPromptContract?.hair ?? []),
      ...(preset?.selectionPromptContract?.body ?? []),
      ...(preset?.identityLockHints ?? []),
    ]),
    mutableTokens: compactParts([
      preset?.profession,
      preset?.outfitType,
      preset?.outfitIntent,
      preset?.nudityMode === "true_nude"
        ? "true nude unclothed body"
        : preset?.nudityMode === "implied_nude"
          ? "implied nude strategic coverage"
          : null,
      preset?.bodyReadPriority === "high" ? "high body readability" : null,
      preset?.outfitColor,
      preset?.sceneType,
      preset?.backgroundIntent,
      preset?.cameraFraming,
      preset?.lightingType,
      preset?.poseEnergy,
      preset?.expression,
      preset?.variationGoal,
      ...(preset?.selectionPromptContract?.outfit ?? []),
      ...(preset?.selectionPromptContract?.scenario ?? []),
      ...(preset?.selectionPromptContract?.imageMood ?? []),
      ...(preset?.constitutionHints ?? []),
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
    diversityMode: "combinatorial_v2",
    candidateStrategy: "multi_prompt_spread",
    choiceWeightVersion: "life_stage_choice_weighting_v1",
    lifeStageMode: "adult_realism_v1",
    behaviorDerivationMode: "hidden_choice_weighting_v1",
    selectionCompilerVersion: "full_selection_compiler_v1",
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
            "same selfie composition every time",
          ]
      : generationHints.outputType === "full_body"
        ? [
            "cut off legs",
            "missing feet",
            "cropped knees",
            "bad full body proportions",
            "full-body mannequin stance",
          ]
        : [
            "cropped hairline",
            "cropped shoulders",
            "awkward upper-body crop",
            "editorial headshot clone",
            "face-only crop",
            "passport photo",
            "shoulders-only crop",
            "tight close-up crop",
            "cropped torso",
          ];

  const styleExtras = [
    ...REFERENCE_REALISM_NEGATIVE_ANCHORS,
    "cgi skin",
    "wax face",
    "unnatural skin retouching",
    "editorial over-retouching",
    "editorial makeup look",
    "fashion shoot pose",
    "beauty campaign look",
    "surreal contrast",
    "exaggerated glamour",
    "stylized face symmetry",
    "uncanny face",
    "mannequin stance",
    "plastic breasts",
    "impossible waist to hip ratio",
  ];

  const preset = input.presetSelections;
  const fidelityExtras = compactParts([
    preset?.eyeColor ? "dull eyes" : null,
    preset?.hairColor || preset?.hairstyle ? "hairline inconsistency" : null,
    preset?.outfitType ? "broken wardrobe continuity" : null,
    preset?.outfitColor ? "wrong outfit color" : null,
    preset?.profession ? "profession mismatch" : null,
    preset?.backgroundIntent ? "background mismatch" : null,
    preset?.outfitIntent ? "incompatible outfit styling" : null,
    preset?.nudityMode ? "wrong nudity class" : null,
    preset?.bodyType ? "incorrect body silhouette" : null,
    preset?.bodyType && preset.bodyType !== "pregnant" ? "pregnant body" : null,
    preset?.bodyType === "pregnant" ? "non-pregnant flat abdomen" : null,
    preset?.bustSize ? "wrong bust size" : null,
    preset?.breastType ? "wrong breast shape" : null,
    preset?.buttSize ? "wrong butt size" : null,
    preset?.bustSize || preset?.breastType || preset?.hipsType || preset?.buttSize || preset?.waistDefinition
      ? "torso proportion drift"
      : null,
    preset?.expression ? "expression mismatch" : null,
    preset?.lightingType ? "lighting mismatch" : null,
    preset?.sceneType ? "scene mismatch" : null,
    preset?.cameraFraming ? "camera framing mismatch" : null,
    preset?.faceBias === "soft_feminine" ? "masculine facial structure" : null,
    preset?.faceBias === "soft_feminine" ? "hard jawline" : null,
    preset?.faceBias === "soft_feminine" ? "coarse facial planes" : null,
    preset?.faceBias === "soft_feminine" ? "overly angular face" : null,
    preset?.faceBias === "soft_feminine" ? "harsh brow ridge" : null,
    preset?.faceBias === "soft_feminine" ? "rugged face" : null,
    preset?.bodyReadPriority === "high" ? "unreadable torso silhouette" : null,
    preset?.bodyReadPriority === "high" ? "hidden waist line" : null,
    preset?.selectionPromptContract?.outfit.length ? "wrong wardrobe class" : null,
    preset?.selectionPromptContract?.face.length ? "face identity drift" : null,
    preset?.selectionPromptContract?.hair.length ? "hair silhouette drift" : null,
    preset?.selectionPromptContract?.body.length ? "body selection drift" : null,
    preset?.selectionPromptContract?.scenario.length ? "role or scenario mismatch" : null,
    preset?.nudityMode === "true_nude" ? "bra" : null,
    preset?.nudityMode === "true_nude" ? "lingerie" : null,
    preset?.nudityMode === "true_nude" ? "robe" : null,
    preset?.nudityMode === "true_nude" ? "shirt straps" : null,
    preset?.nudityMode === "true_nude" ? "underwear edges" : null,
    preset?.nudityMode === "implied_nude" ? "fully nude full reveal" : null,
    typeof preset?.ageValue === "number" && preset.ageValue >= 30
      ? "overly youthful face"
      : null,
    typeof preset?.ageValue === "number" && preset.ageValue <= 24
      ? "overly aged face"
      : null,
  ]);

  const lockExtras = identityLock.immutableTokens.flatMap((token) => {
    const lowered = token.toLowerCase();

    if (lowered.includes("hair")) return ["wrong hair color", "wrong hairstyle"];
    if (lowered.includes("eye")) return ["wrong eye color"];
    if (lowered.includes("adult")) return ["younger-looking subject"];
    if (lowered.includes("skin")) return ["wrong skin tone"];
    return [];
  });

  return buildNegativePrompt([
    ...outputTypeExtras,
    ...styleExtras,
    ...fidelityExtras,
    ...lockExtras,
    ...(preset?.negativeConstitutionHints ?? []),
  ]);
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
          ...(input.presetSelections?.selectionPromptContract?.promptSummary ?? []),
          input.presetSelections?.mainVibe,
          input.presetSelections?.region,
          input.presetSelections?.profession,
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
