import {
  buildHiddenPromptEngineInputFromCustomPrompt,
  buildHiddenPromptEngineInputFromPreset,
  runPromptEngine,
} from "@/lib/character-builder/prompt-engine";
import { CHARACTER_DEFAULTS } from "@/lib/character-builder/constants";
import type {
  CharacterAgeBand,
  CharacterOutputType,
  HiddenPromptEngineInput,
  PromptEngineOutput,
} from "@/lib/character-builder/types";
import type { CharacterImagePromptInput } from "@/lib/image-generation/types";
import { buildVisualPromptExpansion } from "@/lib/create-character/deep-prompting";
import { deriveVisualChoiceProfile } from "@/lib/create-character/choice-weighting";
import {
  buildSelectionCompilerOutputFromStudioSource,
  FULL_SELECTION_COMPILER_VERSION,
} from "@/lib/create-character/full-selection-compiler";
import {
  normalizeActiveOutputType,
  normalizeReferenceAvatarStyle,
  normalizeReferenceCamera,
  normalizeReferenceLightingMood,
  normalizeReferencePhotoPack,
} from "@/lib/create-character/reference-realism";
import {
  getRandomAvatarPosePreset,
  type AvatarPosePreset,
} from "@/lib/avatar-pose-library";
import type { PosePromptContract } from "@/lib/create-character/pose-prompt-contract";
import { deriveVisualPromptCompatibility } from "@/lib/create-character/visual-compatibility";
import {
  getStructuredBodyNotes,
  parseCsv,
  readStructuredNotes,
  type StudioStructuredNoteMap,
} from "@/lib/create-character/studio-notes";
import type { SelectionPromptContract } from "@/lib/create-character/selection-prompt-contract";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StudioFormLike = {
  mode: "quick" | "deep";
  name: string;
  age: string;
  region: string;
  archetype: string;
  genderPresentation: string;
  visibility: "private" | "public";
  coreVibes: string[];
  warmth: number;
  assertiveness: number;
  mystery: number;
  playfulness: number;
  replyLength?: string;
  speechStyle?: string;
  relationshipPace?: string;
  tone: string;
  setting: string;
  relationshipToUser: string;
  sceneGoal: string;
  openingState?: string;
  customScenario?: string;
  customNotes: string;
};

export type StudioDraftLike = {
  name: string;
  slug: string;
  archetype: string;
  headline: string;
  description: string;
  greeting: string;
  previewMessage: string;
  backstory: string;
  tags: string[];
  traitBadges: Json;
  scenario: Json;
  metadata: Json;
  payload: Json;
};

export type StudioAvatarPromptInput = {
  characterName: string;
  archetype?: string;
  profession?: string;
  relationshipToUser?: string;
  relationshipDynamic?: string;
  sceneType?: string;
  behaviorMode?: string;
  visualAura?: string;
  ageValue?: number;
  ageBand?: CharacterAgeBand;
  genderPresentation?: string;
  region?: string;
  skinTone?: string;
  hair?: string;
  hairTexture?: string;
  eyes?: string;
  eyeShape?: string;
  makeupStyle?: string;
  accessoryVibe?: string;
  outfit?: string;
  palette?: string;
  camera?: string;
  photoPack?: string;
  avatarStyle?: string;
  bodyType?: string;
  bustSize?: string;
  breastType?: string;
  hipsType?: string;
  buttSize?: string;
  waistDefinition?: string;
  heightImpression?: string;
  exposureLevel?: string;
  pose?: string;
  poseContract?: PosePromptContract;
  expression?: string;
  lightingMood?: string;
  environment?: string;
  backgroundIntent?: string;
  outfitIntent?: string;
  nudityMode?: "covered" | "implied_nude" | "true_nude";
  faceBias?: "neutral" | "soft_feminine";
  bodyReadPriority?: "standard" | "high";
  sceneNote?: string;
  hobbies?: string;
  fetishes?: string;
  extraPersonalityDetails?: string;
  extraPhysicalDetails?: string;
  signatureDetail?: string;
  visualConstitution?: string[];
  visualIdentityLock?: string[];
  negativeConstitutionHints?: string[];
  hiddenVisualSectionPrompts?: string[];
  masterVisualPrompt?: string;
  selectionPromptContract?: SelectionPromptContract;
  selectionContractSummary?: string[];
  behaviorContractSummary?: string[];
  imageMoodContractSummary?: string[];
  nsfwLevel?: "adult";
};

export type StudioBuilderSummary = {
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutput;
  notes: StudioStructuredNoteMap;
  bodyNotes: string;
};

export type StudioImagePromptSummary = {
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutput;
};

function normalizeAgeBand(age: number): CharacterAgeBand {
  if (age <= 20) return "18-20";
  if (age <= 24) return "21-24";
  if (age <= 29) return "25-29";
  if (age <= 39) return "30-39";
  if (age <= 49) return "40-49";
  if (age <= 59) return "50-59";
  return "60-70";
}

function normalizeOutputType(
  camera: string,
  photoPack: string,
): CharacterOutputType {
  const source = `${camera} ${photoPack}`.toLowerCase();

  if (source.includes("selfie")) return normalizeActiveOutputType("selfie");
  if (source.includes("full") || source.includes("body")) {
    return normalizeActiveOutputType("full_body");
  }
  return normalizeActiveOutputType("upper_body");
}

function inferStudioStyleType(
  avatarStyle?: string | null,
): HiddenPromptEngineInput["styleType"] {
  void avatarStyle;
  return "realistic";
}

function inferStudioEyeColor(descriptor: string) {
  if (descriptor.toLowerCase().includes("green")) return "green";
  if (descriptor.toLowerCase().includes("blue")) return "blue";
  if (descriptor.toLowerCase().includes("grey")) return "grey";
  if (descriptor.toLowerCase().includes("hazel")) return "hazel";
  return descriptor ? "brown" : "";
}

function inferStudioHairColor(descriptor: string) {
  const value = descriptor.toLowerCase();
  if (value.includes("light blonde")) return "light blonde";
  if (value.includes("blonde")) return "blonde";
  if (value.includes("grey")) return "grey";
  if (value.includes("black")) return "black";
  if (value.includes("white")) return "white";
  if (value.includes("pink")) return "pink";
  if (value.includes("purple")) return "purple";
  if (value.includes("green")) return "green";
  if (value.includes("blue")) return "blue";
  if (value.includes("lilac")) return "lilac";
  if (value.includes("orange")) return "orange";
  if (value.includes("auburn")) return "auburn";
  if (value.includes("brown")) return "brown";
  return "";
}

function normalizeBustSizeAnchor(value?: string) {
  const normalized = value?.trim().toLowerCase() ?? "";
  switch (normalized) {
    case "flat":
      return "very small breasts";
    case "small":
      return "small breasts";
    case "medium":
      return "medium breasts";
    case "large":
    case "full":
      return "large breasts";
    case "xl":
    case "very full":
      return "very large breasts";
    default:
      return value?.trim() ?? "";
  }
}

function normalizeBreastTypeAnchor(value?: string) {
  const normalized = value?.trim().toLowerCase() ?? "";
  switch (normalized) {
    case "regular":
    case "natural":
      return "natural breast shape";
    case "perky":
      return "perky breast shape";
    case "saggy":
    case "soft lower-set":
      return "soft lower-hanging breast shape";
    case "torpedo":
      return "forward-projecting breast shape";
    case "fake":
    case "augmented":
      return "augmented breast shape";
    case "round full":
      return "round full breast shape";
    default:
      return value?.trim() ?? "";
  }
}

function normalizeButtSizeAnchor(value?: string) {
  const normalized = value?.trim().toLowerCase() ?? "";
  switch (normalized) {
    case "small":
      return "small butt";
    case "perky":
      return "perky butt";
    case "athletic":
      return "athletic glutes";
    case "medium":
      return "medium butt";
    case "big":
    case "full":
      return "large butt";
    case "very full":
      return "very full butt";
    default:
      return value?.trim() ?? "";
  }
}

function buildPosePromptContract(args: {
  posePreset: AvatarPosePreset;
  cropDiscipline?: string | null;
  gazeDirection?: string | null;
  handLanguage?: string | null;
}): PosePromptContract {
  return {
    poseFamily: args.posePreset.family,
    posePrompt: args.posePreset.posePrompt,
    bodyLinePrompt: args.posePreset.bodyLinePrompt,
    framingBias: args.posePreset.framingBias,
    cropDiscipline:
      args.cropDiscipline?.trim() ||
      (args.posePreset.framingBias === "full_body"
        ? "full-body framing with readable silhouette and clear leg line"
        : "upper-body framing with readable torso, waist, chest, and upper hips"),
    gazeDirection: args.gazeDirection?.trim() || "natural adult eye line with readable pose intent",
    handLanguage: args.handLanguage?.trim() || "hands should support the pose and body silhouette",
    posePriority: "high",
  };
}

function toSafeObject(value: Json, fallback: Record<string, Json> = {}) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, Json>) }
    : fallback;
}

export function buildStudioHiddenPromptInput(
  form: StudioFormLike,
): HiddenPromptEngineInput {
  const parsedAge = Number(form.age);
  const ageValue = Number.isFinite(parsedAge)
    ? Math.min(70, Math.max(18, parsedAge))
    : 25;

  const normalizedAgeBand = normalizeAgeBand(ageValue);
  const notes = readStructuredNotes(form.customNotes);
  const bodyNotes = getStructuredBodyNotes(form.customNotes);
  const interestTags = parseCsv(notes["Interest anchors"]);
  const publicTags = parseCsv(notes["Public tags"]);
  const imagePrompt = notes["Image prompt"];
  const outputType = normalizeOutputType(notes["Camera"], notes["Photo pack"]);
  const styleType = inferStudioStyleType(notes["Avatar style"]);

  const bodyType =
    publicTags.find((tag) =>
      ["athletic", "slim", "curvy", "lean", "toned"].includes(
        tag.toLowerCase(),
      ),
    ) ?? "";

  const eyeColor = inferStudioEyeColor(notes["Eye color"] || notes["Eyes"]);
  const hairDescriptor =
    [
      notes["Hair color"],
      notes["Hair style"] === "custom"
        ? notes["Custom hairstyle"]
        : notes["Hair style"],
      notes["Hair texture"],
      notes["Hair"],
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || notes["Hair"];
  const hairColor = inferStudioHairColor(notes["Hair color"] || notes["Hair"]);
  const bustSizeAnchor = normalizeBustSizeAnchor(notes["Bust size"]);
  const breastTypeAnchor = normalizeBreastTypeAnchor(notes["Breast type"]);
  const buttSizeAnchor = normalizeButtSizeAnchor(notes["Butt size"]);
  const mandatoryBodyReadHints = [
    bustSizeAnchor ? `Selected chest size must stay visually obvious: ${bustSizeAnchor}.` : "",
    breastTypeAnchor
      ? `Selected breast shape must stay visually obvious: ${breastTypeAnchor}.`
      : "",
    buttSizeAnchor ? `Selected butt size must stay visually obvious: ${buttSizeAnchor}.` : "",
    notes["Hip shape"]
      ? `Selected hip silhouette must stay visible: ${notes["Hip shape"]}.`
      : "",
    notes["Waist definition"]
      ? `Selected waist definition must stay visible: ${notes["Waist definition"]}.`
      : "",
    bustSizeAnchor || breastTypeAnchor || buttSizeAnchor
      ? "Do not let framing, crop, styling, or pose hide the selected body proportions."
      : "",
  ].filter(Boolean);
  const visualExpansion = buildVisualPromptExpansion({
    archetype: form.archetype,
    avatarStyle: notes["Avatar style"],
    ageValue,
    ageBand: normalizedAgeBand,
    genderPresentation: form.genderPresentation,
    skinTone: notes["Skin tone"],
    bodyType: notes["Body type"] || bodyType,
    bustSize: notes["Bust size"],
    breastType: notes["Breast type"],
    hipsType: notes["Hip shape"],
    buttSize: notes["Butt size"],
    waistDefinition: notes["Waist definition"],
    heightImpression: notes["Height impression"],
    hair: hairDescriptor,
    hairTexture: notes["Hair texture"],
    eyes: notes["Eye color"] || notes["Eyes"],
    eyeShape: notes["Eye shape"],
    makeupStyle: notes["Makeup style"],
    accessoryVibe: notes["Accessory vibe"],
    outfit: notes["Outfit"],
    palette: notes["Palette"],
    camera: notes["Camera"],
    lightingMood: notes["Lighting mood"],
    environment: form.setting,
    expression: notes["Current energy"],
    visualAura: notes["Visual aura"],
    imagePrompt,
    signatureDetail: notes["Signature detail"],
    nudityMode: "covered",
    faceBias:
      form.genderPresentation?.toLowerCase().includes("femin")
        ? "soft_feminine"
        : "neutral",
    bodyReadPriority:
      notes["Body type"] ||
      notes["Bust size"] ||
      notes["Breast type"] ||
      notes["Butt size"]
        ? "high"
        : "standard",
  });
  const visualChoiceProfile = deriveVisualChoiceProfile({
    ageValue,
    ageBand: normalizedAgeBand,
    archetype: form.archetype,
    profession: notes["Profession"],
    relationshipToUser: form.relationshipToUser,
    relationshipDynamic: notes["Relationship dynamic"],
    sceneType: notes["Scene type"],
    behaviorMode: notes["Behavior mode"],
    coreVibes: form.coreVibes,
    warmth: form.warmth,
    assertiveness: form.assertiveness,
    mystery: form.mystery,
    playfulness: form.playfulness,
    region: form.region,
    tone: [form.tone, notes["Current energy"]].filter(Boolean).join(" "),
    setting: form.setting,
    visualAura: notes["Visual aura"],
    bodyType: notes["Body type"] || bodyType,
    outfit: notes["Outfit"],
    lightingMood: notes["Lighting mood"],
    expression: notes["Current energy"],
    accessoryVibe: notes["Accessory vibe"],
    signatureDetail: notes["Signature detail"],
    camera: notes["Camera"],
    hair: hairDescriptor,
    eyes: notes["Eye color"] || notes["Eyes"],
  });
  const selectionCompiler = buildSelectionCompilerOutputFromStudioSource({
    name: form.name,
    age: form.age,
    region: form.region,
    archetype: form.archetype,
    genderPresentation: form.genderPresentation,
    coreVibes: form.coreVibes,
    warmth: form.warmth,
    assertiveness: form.assertiveness,
    mystery: form.mystery,
    playfulness: form.playfulness,
    replyLength: form.replyLength ?? "",
    speechStyle: form.speechStyle ?? "",
    relationshipPace: form.relationshipPace ?? "",
    setting: form.setting,
    relationshipToUser: form.relationshipToUser,
    sceneGoal: form.sceneGoal,
    tone: form.tone,
    openingState: form.openingState ?? "",
    customScenario: form.customScenario ?? "",
    customNotes: form.customNotes,
  });
  const visualCompatibility = deriveVisualPromptCompatibility({
    profession: notes["Profession"],
    outfit: notes["Outfit"],
    setting: form.setting,
    sceneType: notes["Scene type"],
    relationshipToUser: form.relationshipToUser,
    relationshipDynamic: notes["Relationship dynamic"],
    behaviorMode: notes["Behavior mode"],
    customScenario: form.customScenario,
    genderPresentation: form.genderPresentation,
    bodyType: notes["Body type"] || bodyType,
    bustSize: notes["Bust size"],
    breastType: notes["Breast type"],
    buttSize: notes["Butt size"],
  });

  if (imagePrompt.trim()) {
    return buildHiddenPromptEngineInputFromCustomPrompt({
      styleType,
      customPrompt: {
        promptText: [
          imagePrompt,
          visualExpansion.detailPhrase,
          visualExpansion.qualityPhrase,
          ...visualCompatibility.promptAnchors,
          ...visualCompatibility.realismAnchors,
          visualChoiceProfile.faceMaturity,
          visualChoiceProfile.stylingPolish,
          visualChoiceProfile.postureDiscipline,
          visualChoiceProfile.environmentTexture,
          ...selectionCompiler.visualConstitutionProfile.imagePromptAdditions,
          `adult ${ageValue} years old`,
          form.tone,
          form.setting,
          form.relationshipToUser,
          form.sceneGoal,
          bodyNotes,
        ]
          .filter(Boolean)
          .join(", "),
        helperOutputType: outputType,
        helperVibe:
          notes["Visual aura"] ||
          form.coreVibes.join(", ") ||
          form.tone ||
          "romantic",
        locks: {
          ageBand: normalizedAgeBand,
          region: form.region || notes["Region note"] || "",
          eyeColor,
          hairColor,
        },
      },
    });
  }

  return buildHiddenPromptEngineInputFromPreset({
    styleType,
    presetSelections: {
      ageValue,
      ageBand: normalizedAgeBand,
      region: form.region || notes["Region note"] || "global",
      profession: notes["Profession"] || "",
      relationshipToUser: form.relationshipToUser || "",
      relationshipDynamic: notes["Relationship dynamic"] || "",
      behaviorMode: notes["Behavior mode"] || "",
      skinTone: notes["Skin tone"] || "",
      genderPresentation: form.genderPresentation || "",
      eyeColor,
      eyeShape: notes["Eye shape"] || "",
      faceShape: "",
      lipStyle: "",
      noseType: "",
      makeupLevel: notes["Makeup style"] || "",
      hairColor,
      hairLength: hairDescriptor || "",
      hairTexture: notes["Hair texture"] || "",
      hairstyle: hairDescriptor || "",
      bodyType: notes["Body type"] || bodyType,
      bustSize: notes["Bust size"] || "",
      breastType: notes["Breast type"] || "",
      hipsType: notes["Butt size"] || notes["Hip shape"] || "",
      buttSize: notes["Butt size"] || "",
      heightImpression: notes["Height impression"] || "",
      waistDefinition: notes["Waist definition"] || "",
      mainVibe: notes["Visual aura"] || form.coreVibes[0] || "",
      energy: notes["Current energy"] || "",
      personaFlavor: form.archetype || "",
      outfitType: notes["Outfit"] || "",
      outfitColor: notes["Palette"] || "",
      exposureLevel: notes["Exposure level"] || "",
        sceneType: form.setting || "",
        backgroundIntent: visualCompatibility.backgroundIntent,
        outfitIntent: visualCompatibility.outfitIntent,
        nudityMode: visualCompatibility.nudityMode,
        faceBias: visualCompatibility.faceBias,
        bodyReadPriority: visualCompatibility.bodyReadPriority,
        cameraFraming: notes["Camera"] || "",
      lightingType: notes["Lighting mood"] || notes["Avatar style"] || "",
      poseEnergy:
        [
          notes["Relationship stage"] === "rivals"
            ? "challenging poised stance"
            : notes["Relationship stage"] === "lovers"
              ? "intimate confident stance"
              : "composed natural stance",
          visualChoiceProfile.postureDiscipline,
        ]
          .filter(Boolean)
          .join(", "),
      expression: [notes["Current energy"] || "", visualChoiceProfile.expressionStyle]
        .filter(Boolean)
        .join(", "),
      realismStrength: "high",
      detailLevel: "ultra high",
      variationGoal: [
        notes["Photo pack"],
        notes["Accessory vibe"],
        notes["Signature detail"],
        notes["Outfit"],
        notes["Body type"],
        bustSizeAnchor,
        breastTypeAnchor,
        buttSizeAnchor,
        ...mandatoryBodyReadHints,
        notes["Extra physical details"],
        interestTags.join(", "),
        ...visualCompatibility.promptAnchors,
        visualExpansion.detailPhrase,
        visualChoiceProfile.faceMaturity,
        visualChoiceProfile.environmentTexture,
      ]
        .filter(Boolean)
        .join(", "),
      hobbies: notes["Hobbies"] || "",
      fetishes: notes["Fetishes"] || "",
      extraPersonalityDetails: notes["Extra personality details"] || "",
      extraPhysicalDetails: notes["Extra physical details"] || "",
      constitutionHints:
        [
          ...selectionCompiler.visualPromptCompileResult.positiveIdentity,
          ...selectionCompiler.visualPromptCompileResult.positiveFace,
          ...selectionCompiler.visualPromptCompileResult.positiveHair,
          ...selectionCompiler.visualPromptCompileResult.positiveBody,
          ...selectionCompiler.visualPromptCompileResult.positiveWardrobe,
          ...selectionCompiler.visualPromptCompileResult.positivePhotoLanguage,
          ...mandatoryBodyReadHints,
          ...selectionCompiler.selectionPromptContract.scenario,
          ...selectionCompiler.selectionPromptContract.extraPhysical,
          ...selectionCompiler.visualConstitutionProfile.imagePromptAdditions,
          ...visualCompatibility.sceneAnchors,
          ...visualCompatibility.realismAnchors,
        ],
      identityLockHints:
        [
          ...selectionCompiler.selectionPromptContract.identity,
          ...selectionCompiler.selectionPromptContract.face,
          ...selectionCompiler.selectionPromptContract.hair,
          ...selectionCompiler.visualPromptCompileResult.selectedDescriptors.flatMap(
            (descriptor) => descriptor.identityLockAnchors,
          ),
          ...selectionCompiler.visualConstitutionProfile.identityLockAdditions,
        ],
      negativeConstitutionHints:
        [
          ...selectionCompiler.visualPromptCompileResult.negativeDrift,
          ...selectionCompiler.visualConstitutionProfile.negativeGuardrails,
          ...visualCompatibility.negativeAnchors,
        ],
      selectionPromptContract: selectionCompiler.selectionPromptContract,
    },
  });
}

export function buildStudioBuilderSummary(
  form: StudioFormLike,
): StudioBuilderSummary {
  const hiddenPromptInput = buildStudioHiddenPromptInput(form);
  const promptEngineOutput = runPromptEngine(hiddenPromptInput);
  const notes = readStructuredNotes(form.customNotes);

  return {
    hiddenPromptInput,
    promptEngineOutput,
    notes,
    bodyNotes: getStructuredBodyNotes(form.customNotes),
  };
}

export function buildStudioHiddenPromptInputFromImagePrompt(
  promptInput: CharacterImagePromptInput,
): HiddenPromptEngineInput {
  const hair = promptInput.hair?.trim() ?? "";
  const eyes = promptInput.eyes?.trim() ?? "";
  const sceneType = [
    promptInput.environment,
    promptInput.photoPack,
    promptInput.sceneNote,
  ]
    .filter(Boolean)
    .join(", ");
  const lightingType = [
    promptInput.lightingMood,
    promptInput.avatarStyle,
    promptInput.photoPack,
  ]
    .filter(Boolean)
    .join(", ");
  const visualExpansion = buildVisualPromptExpansion({
    archetype: promptInput.archetype,
    avatarStyle: promptInput.avatarStyle,
    ageValue: promptInput.ageValue,
    ageBand: promptInput.ageBand,
    genderPresentation: promptInput.genderPresentation,
    skinTone: promptInput.skinTone,
    bodyType: promptInput.bodyType,
    bustSize: promptInput.bustSize,
    breastType: promptInput.breastType,
    hipsType: promptInput.hipsType,
    buttSize: promptInput.buttSize,
    waistDefinition: promptInput.waistDefinition,
    heightImpression: promptInput.heightImpression,
    hair: promptInput.hair,
    hairTexture: promptInput.hairTexture,
    eyes: promptInput.eyes,
    eyeShape: promptInput.eyeShape,
    makeupStyle: promptInput.makeupStyle,
    accessoryVibe: promptInput.accessoryVibe,
    outfit: promptInput.outfit,
    palette: promptInput.palette,
    camera: promptInput.camera,
    lightingMood: promptInput.lightingMood,
    environment: promptInput.environment,
    expression: promptInput.expression,
    visualAura: promptInput.visualAura,
    imagePrompt: promptInput.sceneNote ?? "",
    signatureDetail: promptInput.signatureDetail,
    pose: promptInput.pose,
    nudityMode: promptInput.nudityMode,
    faceBias: promptInput.faceBias,
    bodyReadPriority: promptInput.bodyReadPriority,
  });
  const visualChoiceProfile = deriveVisualChoiceProfile({
    ageValue: promptInput.ageValue ?? null,
    ageBand: promptInput.ageBand,
    archetype: promptInput.archetype,
    profession: promptInput.profession,
    region: promptInput.region,
    relationshipToUser: promptInput.relationshipToUser,
    relationshipDynamic: promptInput.relationshipDynamic,
    sceneType: promptInput.sceneType,
    behaviorMode: promptInput.behaviorMode,
    visualAura: promptInput.visualAura,
    bodyType: promptInput.bodyType,
    outfit: promptInput.outfit,
    lightingMood: promptInput.lightingMood,
    expression: promptInput.expression,
    accessoryVibe: promptInput.accessoryVibe,
    signatureDetail: promptInput.signatureDetail,
    camera: promptInput.camera,
    hair: promptInput.hair,
    eyes: promptInput.eyes,
  });
  const constitutionHints = [
    ...(promptInput.poseContract
      ? [
          `Exact pose family: ${promptInput.poseContract.poseFamily}.`,
          promptInput.poseContract.posePrompt,
          promptInput.poseContract.bodyLinePrompt,
          `Crop discipline: ${promptInput.poseContract.cropDiscipline}.`,
          `Gaze direction: ${promptInput.poseContract.gazeDirection}.`,
          `Hand language: ${promptInput.poseContract.handLanguage}.`,
        ]
      : []),
    ...(promptInput.selectionPromptContract?.face ?? []),
    ...(promptInput.selectionPromptContract?.hair ?? []),
    ...(promptInput.selectionPromptContract?.body ?? []),
    ...(promptInput.selectionPromptContract?.outfit ?? []),
    ...(promptInput.selectionPromptContract?.scenario ?? []),
    ...(promptInput.selectionPromptContract?.imageMood ?? []),
    ...(promptInput.selectionPromptContract?.extraPhysical ?? []),
    ...(promptInput.visualConstitution ?? []),
    ...(promptInput.hiddenVisualSectionPrompts ?? []),
    ...(promptInput.masterVisualPrompt ? [promptInput.masterVisualPrompt] : []),
    ...(promptInput.backgroundIntent ? [promptInput.backgroundIntent] : []),
    ...(promptInput.outfitIntent ? [promptInput.outfitIntent] : []),
    ...visualChoiceProfile.sceneRefinements,
    ...visualChoiceProfile.aestheticRefinements,
  ].filter(Boolean);
  const identityLockHints = [
    ...(promptInput.selectionPromptContract?.identity ?? []),
    ...(promptInput.selectionPromptContract?.face ?? []),
    ...(promptInput.selectionPromptContract?.hair ?? []),
    ...(promptInput.visualIdentityLock ?? []),
    ...visualChoiceProfile.identityRefinements,
  ].filter(Boolean);

  return buildHiddenPromptEngineInputFromPreset({
    styleType: inferStudioStyleType(promptInput.avatarStyle),
    presetSelections: {
      ageValue: promptInput.ageValue ?? null,
      ageBand: promptInput.ageBand ?? "",
      region: promptInput.region ?? "",
      profession: promptInput.profession ?? "",
      relationshipToUser: promptInput.relationshipToUser ?? "",
      relationshipDynamic: promptInput.relationshipDynamic ?? "",
      behaviorMode: promptInput.behaviorMode ?? "",
      skinTone: promptInput.skinTone ?? "",
      genderPresentation: promptInput.genderPresentation ?? "",
      eyeColor: inferStudioEyeColor(eyes),
      eyeShape: promptInput.eyeShape ?? "",
      faceShape: "",
      lipStyle: "",
      noseType: "",
      makeupLevel: promptInput.makeupStyle ?? "",
      hairColor: inferStudioHairColor(hair),
      hairLength: hair,
      hairTexture: promptInput.hairTexture ?? "",
      hairstyle: hair,
      bodyType: promptInput.bodyType ?? "",
      bustSize: promptInput.bustSize ?? "",
      breastType: promptInput.breastType ?? "",
      hipsType: promptInput.hipsType ?? "",
      buttSize: promptInput.buttSize ?? "",
      heightImpression: promptInput.heightImpression ?? "",
      waistDefinition: promptInput.waistDefinition ?? "",
      mainVibe: promptInput.visualAura ?? "",
      energy: promptInput.expression ?? "",
      personaFlavor: promptInput.archetype ?? "",
      outfitType: promptInput.outfit ?? "",
      outfitColor: promptInput.palette ?? "",
      exposureLevel: promptInput.exposureLevel ?? "",
      sceneType: promptInput.sceneType ?? sceneType,
      backgroundIntent: promptInput.backgroundIntent ?? "",
      outfitIntent: promptInput.outfitIntent ?? "",
      nudityMode: promptInput.nudityMode ?? "covered",
      faceBias: promptInput.faceBias ?? "neutral",
      bodyReadPriority: promptInput.bodyReadPriority ?? "standard",
      cameraFraming: promptInput.camera ?? "",
      lightingType,
      poseEnergy: [
        promptInput.poseContract?.posePrompt ?? "",
        promptInput.poseContract?.bodyLinePrompt ?? "",
        promptInput.poseContract?.cropDiscipline ?? "",
        promptInput.poseContract?.gazeDirection
          ? `gaze direction: ${promptInput.poseContract.gazeDirection}`
          : "",
        promptInput.poseContract?.handLanguage
          ? `hand language: ${promptInput.poseContract.handLanguage}`
          : "",
        promptInput.pose ?? "",
        visualChoiceProfile.postureDiscipline,
      ]
        .filter(Boolean)
        .join(", "),
      poseContract: promptInput.poseContract,
      expression: [promptInput.expression ?? "", visualChoiceProfile.expressionStyle]
        .filter(Boolean)
        .join(", "),
      realismStrength: "high",
      detailLevel: "ultra high",
      variationGoal: [
        promptInput.characterName ?? "",
        promptInput.accessoryVibe ?? "",
        promptInput.signatureDetail ?? "",
        promptInput.photoPack ?? "",
        promptInput.outfit ?? "",
        normalizeBustSizeAnchor(promptInput.bustSize),
        normalizeBreastTypeAnchor(promptInput.breastType),
        normalizeButtSizeAnchor(promptInput.buttSize),
        promptInput.sceneNote ?? "",
        promptInput.backgroundIntent ?? "",
        promptInput.outfitIntent ?? "",
        visualExpansion.detailPhrase,
        visualChoiceProfile.faceMaturity,
        visualChoiceProfile.environmentTexture,
      ]
        .filter(Boolean)
        .join(", "),
      hobbies: promptInput.hobbies ?? "",
      fetishes: promptInput.fetishes ?? "",
      extraPersonalityDetails: promptInput.extraPersonalityDetails ?? "",
      extraPhysicalDetails: promptInput.extraPhysicalDetails ?? "",
      constitutionHints,
      hiddenVisualSectionPrompts: promptInput.hiddenVisualSectionPrompts ?? [],
      masterVisualPrompt: promptInput.masterVisualPrompt ?? "",
      identityLockHints,
      negativeConstitutionHints: promptInput.negativeConstitutionHints ?? [],
      selectionPromptContract: promptInput.selectionPromptContract,
    },
  });
}

export function buildStudioImagePromptSummary(
  promptInput: CharacterImagePromptInput,
): StudioImagePromptSummary {
  const hiddenPromptInput =
    buildStudioHiddenPromptInputFromImagePrompt(promptInput);

  return {
    hiddenPromptInput,
    promptEngineOutput: runPromptEngine(hiddenPromptInput),
  };
}

export function enrichDraftWithStudioBuilder(
  draft: StudioDraftLike,
  form: StudioFormLike,
): StudioDraftLike {
  const { hiddenPromptInput, promptEngineOutput, notes } =
    buildStudioBuilderSummary(form);

  const metadata = toSafeObject(draft.metadata);
  const payload = toSafeObject(draft.payload);
  const scenario = toSafeObject(draft.scenario);

  metadata.builderV2 = true;
  metadata.styleType = hiddenPromptInput.styleType;
  metadata.builderMode = hiddenPromptInput.builderMode;
  metadata.promptVersion = CHARACTER_DEFAULTS.promptVersion;
  metadata.promptSummary = promptEngineOutput.promptSummary;
  metadata.canonicalPrompt = promptEngineOutput.canonicalPrompt;
  metadata.negativePrompt = promptEngineOutput.negativePrompt;
  metadata.identityLock = promptEngineOutput.identityLock as unknown as Json;
  metadata.generationHints =
    promptEngineOutput.generationHints as unknown as Json;
  metadata.moderationFlags =
    promptEngineOutput.moderationFlags as unknown as Json;
  metadata.selectionCompilerVersion = FULL_SELECTION_COMPILER_VERSION;

  scenario.builderV2 = {
    styleType: hiddenPromptInput.styleType,
    builderMode: hiddenPromptInput.builderMode,
    visualAura: notes["Visual aura"] || "",
    avatarStyle: notes["Avatar style"] || "",
    hair: notes["Hair"] || "",
    eyes: notes["Eyes"] || "",
    outfit: notes["Outfit"] || "",
    palette: notes["Palette"] || "",
    camera: notes["Camera"] || "",
    photoPack: notes["Photo pack"] || "",
  } as unknown as Json;

  payload.builderV2 = true;
  payload.styleType = hiddenPromptInput.styleType;
  payload.builderMode = hiddenPromptInput.builderMode;
  payload.promptVersion = CHARACTER_DEFAULTS.promptVersion;
  payload.promptSummary = promptEngineOutput.promptSummary;
  payload.publicTagline =
    notes["Public tagline"] || (payload.publicTagline as string) || "";
  payload.publicTeaser =
    notes["Public teaser"] || (payload.publicTeaser as string) || "";
  payload.publicTags = parseCsv(notes["Public tags"]) as unknown as Json;

  return {
    ...draft,
    metadata,
    payload,
    scenario,
  };
}

export function buildStudioAvatarPromptInput(
  form: StudioFormLike,
  options?: {
    posePreset?: AvatarPosePreset | null;
    seed?: number | null;
  },
): StudioAvatarPromptInput {
  const parsedAge = Number(form.age);
  const ageValue = Number.isFinite(parsedAge)
    ? Math.min(70, Math.max(18, parsedAge))
    : 25;

  const notes = readStructuredNotes(form.customNotes);
  const publicTags = parseCsv(notes["Public tags"]);
  const hairDescriptor =
    [
      notes["Hair color"],
      notes["Hair style"] === "custom"
        ? notes["Custom hairstyle"]
        : notes["Hair style"],
      notes["Hair texture"],
      notes["Hair"],
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || notes["Hair"];
  const bodyType =
    publicTags.find((tag) =>
      ["athletic", "slim", "curvy", "lean", "toned"].includes(
        tag.toLowerCase(),
      ),
    ) ?? "";
  const visualChoiceProfile = deriveVisualChoiceProfile({
    ageValue,
    ageBand: normalizeAgeBand(ageValue),
    archetype: form.archetype,
    profession: notes["Profession"],
    relationshipToUser: form.relationshipToUser,
    relationshipDynamic: notes["Relationship dynamic"],
    sceneType: notes["Scene type"],
    behaviorMode: notes["Behavior mode"],
    coreVibes: form.coreVibes,
    warmth: form.warmth,
    assertiveness: form.assertiveness,
    mystery: form.mystery,
    playfulness: form.playfulness,
    region: form.region,
    tone: [form.tone, notes["Current energy"]].filter(Boolean).join(" "),
    setting: form.setting,
    visualAura: notes["Visual aura"],
    bodyType: notes["Body type"] || bodyType,
    outfit: notes["Outfit"],
    lightingMood: notes["Lighting mood"],
    expression: notes["Current energy"],
    accessoryVibe: notes["Accessory vibe"],
    signatureDetail: notes["Signature detail"],
    camera: notes["Camera"],
    hair: notes["Hair"],
    eyes: notes["Eyes"],
  });
  const selectionCompiler = buildSelectionCompilerOutputFromStudioSource({
    name: form.name,
    age: form.age,
    region: form.region,
    archetype: form.archetype,
    genderPresentation: form.genderPresentation,
    coreVibes: form.coreVibes,
    warmth: form.warmth,
    assertiveness: form.assertiveness,
    mystery: form.mystery,
    playfulness: form.playfulness,
    replyLength: form.replyLength ?? "",
    speechStyle: form.speechStyle ?? "",
    relationshipPace: form.relationshipPace ?? "",
    setting: form.setting,
    relationshipToUser: form.relationshipToUser,
    sceneGoal: form.sceneGoal,
    tone: form.tone,
    openingState: form.openingState ?? "",
    customScenario: form.customScenario ?? "",
    customNotes: form.customNotes,
  });
  const visualCompatibility = deriveVisualPromptCompatibility({
    profession: notes["Profession"],
    outfit: notes["Outfit"],
    setting: form.setting,
    sceneType: notes["Scene type"],
    relationshipToUser: form.relationshipToUser,
    relationshipDynamic: notes["Relationship dynamic"],
    behaviorMode: notes["Behavior mode"],
    customScenario: form.customScenario,
    genderPresentation: form.genderPresentation,
    bodyType: notes["Body type"] || bodyType,
    bustSize: notes["Bust size"],
    breastType: notes["Breast type"],
    buttSize: notes["Butt size"],
  });

  const firstExpression =
    notes["Current energy"] ||
    (form.tone.includes("playful")
      ? "softly playful"
      : form.tone.includes("cold")
        ? "guarded"
        : "calm");
  const posePreset =
    options?.posePreset ??
    getRandomAvatarPosePreset({
      usage: "create",
      seed: options?.seed ?? null,
    });
  const poseContract = buildPosePromptContract({
    posePreset,
    gazeDirection: "natural adult eye line with readable pose intent",
    handLanguage: "hands should support the pose and body silhouette",
  });
  const bustSizeAnchor = normalizeBustSizeAnchor(notes["Bust size"]);
  const breastTypeAnchor = normalizeBreastTypeAnchor(notes["Breast type"]);
  const buttSizeAnchor = normalizeButtSizeAnchor(notes["Butt size"]);
  const mandatoryBodyReadHints = [
    bustSizeAnchor ? `Selected chest size must stay visually obvious: ${bustSizeAnchor}.` : "",
    breastTypeAnchor
      ? `Selected breast shape must stay visually obvious: ${breastTypeAnchor}.`
      : "",
    buttSizeAnchor ? `Selected butt size must stay visually obvious: ${buttSizeAnchor}.` : "",
    notes["Hip shape"]
      ? `Selected hip silhouette must stay visible: ${notes["Hip shape"]}.`
      : "",
    notes["Waist definition"]
      ? `Selected waist definition must stay visible: ${notes["Waist definition"]}.`
      : "",
    bustSizeAnchor || breastTypeAnchor || buttSizeAnchor
      ? "Do not let framing, crop, styling, or pose hide the selected body proportions."
      : "",
  ].filter(Boolean);

  return {
    characterName: form.name.trim() || "Untitled character",
    archetype: form.archetype || undefined,
    profession: notes["Profession"] || undefined,
    relationshipToUser: form.relationshipToUser || undefined,
    relationshipDynamic: notes["Relationship dynamic"] || undefined,
    sceneType: notes["Scene type"] || form.setting || undefined,
    behaviorMode: notes["Behavior mode"] || undefined,
    visualAura: notes["Visual aura"] || undefined,
    ageValue,
    ageBand: normalizeAgeBand(ageValue),
    genderPresentation: form.genderPresentation || undefined,
    region: form.region.trim() || undefined,
    skinTone: notes["Skin tone"] || undefined,
    hair: hairDescriptor || undefined,
    hairTexture: notes["Hair texture"] || undefined,
    eyes: notes["Eye color"] || notes["Eyes"] || undefined,
    eyeShape: notes["Eye shape"] || undefined,
    makeupStyle: notes["Makeup style"] || undefined,
    accessoryVibe: notes["Accessory vibe"] || undefined,
    outfit: notes["Outfit"] || undefined,
    palette: notes["Palette"] || undefined,
    camera: normalizeReferenceCamera(notes["Camera"] || posePreset.camera),
    photoPack: normalizeReferencePhotoPack(notes["Photo pack"] || posePreset.photoPack),
    avatarStyle: normalizeReferenceAvatarStyle(
      notes["Avatar style"] || "reference-style natural realism",
    ),
    bodyType: notes["Body type"] || bodyType || undefined,
    bustSize: notes["Bust size"] || undefined,
    breastType: notes["Breast type"] || undefined,
    hipsType: notes["Butt size"] || notes["Hip shape"] || undefined,
    buttSize: notes["Butt size"] || undefined,
    waistDefinition: notes["Waist definition"] || undefined,
    heightImpression: notes["Height impression"] || undefined,
    exposureLevel: notes["Exposure level"] || undefined,
    pose: [
      poseContract.posePrompt,
      poseContract.bodyLinePrompt,
      `exact pose family: ${poseContract.poseFamily}`,
      poseContract.cropDiscipline,
      posePreset.framingBias === "full_body"
        ? "show most of the body whenever possible with a full-body lifestyle frame"
        : "upper-body framing must still keep the torso, waist, stomach line, and hip line visible",
      posePreset.framingBias === "full_body"
        ? "keep the full silhouette, legs, hips, waist, and outfit clearly visible"
        : "body-readable upper-body frame with visible waist and hips, never a face-only crop",
      `gaze direction: ${poseContract.gazeDirection}`,
      `hand language: ${poseContract.handLanguage}`,
      bustSizeAnchor || breastTypeAnchor || buttSizeAnchor
        ? "body-visible framing with a readable torso, waist, hips, and upper legs"
        : "",
      ...mandatoryBodyReadHints,
      "never a passport-style portrait, never a tight headshot, never a shoulders-only crop",
      notes["Relationship stage"] === "rivals"
        ? "confident presence"
        : notes["Relationship stage"] === "lovers"
          ? "natural intimate body language"
          : "natural adult body language",
      visualChoiceProfile.postureDiscipline,
      posePreset.avoidPortraitCrop
        ? "avoid tight passport-style close crop"
        : "",
    ]
      .filter(Boolean)
      .join(", "),
    poseContract,
    expression: [firstExpression, visualChoiceProfile.expressionStyle]
      .filter(Boolean)
      .join(", "),
    lightingMood: normalizeReferenceLightingMood(
      notes["Lighting mood"] || "soft daylight or neutral indoor light",
    ),
    environment:
      visualCompatibility.backgroundIntent ||
      form.setting ||
      "natural indoor lifestyle setting",
    backgroundIntent: visualCompatibility.backgroundIntent || undefined,
    outfitIntent: visualCompatibility.outfitIntent || undefined,
    nudityMode: visualCompatibility.nudityMode,
    faceBias: visualCompatibility.faceBias,
    bodyReadPriority: visualCompatibility.bodyReadPriority,
    sceneNote: [
      ...(selectionCompiler.selectionPromptContract.scenario ?? []),
      ...(selectionCompiler.selectionPromptContract.imageMood ?? []),
      getStructuredBodyNotes(form.customNotes),
      notes["Outfit"],
      notes["Profession"],
      form.relationshipToUser,
      notes["Relationship dynamic"],
      notes["Scene type"],
      notes["Behavior mode"],
      form.customScenario,
      notes["Body type"],
      bustSizeAnchor,
      breastTypeAnchor,
      buttSizeAnchor,
      ...mandatoryBodyReadHints,
      notes["Hobbies"],
      notes["Fetishes"],
      notes["Extra personality details"],
      notes["Extra physical details"],
      ...visualCompatibility.promptAnchors,
    ]
      .filter(Boolean)
      .join(". ") || undefined,
    hobbies: notes["Hobbies"] || undefined,
    fetishes: notes["Fetishes"] || undefined,
    extraPersonalityDetails: notes["Extra personality details"] || undefined,
    extraPhysicalDetails: notes["Extra physical details"] || undefined,
    signatureDetail: notes["Signature detail"] || undefined,
    visualConstitution:
      [
        ...selectionCompiler.visualPromptCompileResult.positiveIdentity,
        ...selectionCompiler.visualPromptCompileResult.positiveFace,
        ...selectionCompiler.visualPromptCompileResult.positiveHair,
        ...selectionCompiler.visualPromptCompileResult.positiveBody,
        ...selectionCompiler.visualPromptCompileResult.positiveWardrobe,
        ...selectionCompiler.visualPromptCompileResult.positivePhotoLanguage,
        ...selectionCompiler.selectionPromptContract.extraPhysical,
        ...selectionCompiler.visualConstitutionProfile.imagePromptAdditions,
        ...visualCompatibility.sceneAnchors,
        ...visualCompatibility.realismAnchors,
      ],
    visualIdentityLock:
      [
        ...selectionCompiler.selectionPromptContract.identity,
        ...selectionCompiler.selectionPromptContract.face,
        ...selectionCompiler.selectionPromptContract.hair,
        ...selectionCompiler.visualPromptCompileResult.selectedDescriptors.flatMap(
          (descriptor) => descriptor.identityLockAnchors,
        ),
        ...selectionCompiler.visualConstitutionProfile.identityLockAdditions,
      ],
    negativeConstitutionHints:
      [
        ...selectionCompiler.visualPromptCompileResult.negativeDrift,
        ...selectionCompiler.visualConstitutionProfile.negativeGuardrails,
        ...visualCompatibility.negativeAnchors,
      ],
    hiddenVisualSectionPrompts:
      selectionCompiler.visualPromptCompileResult.hiddenSectionPrompts,
    masterVisualPrompt:
      selectionCompiler.visualPromptCompileResult.masterVisualPrompt.join(" "),
    selectionPromptContract: selectionCompiler.selectionPromptContract,
    selectionContractSummary: selectionCompiler.selectionPromptContract.promptSummary,
    behaviorContractSummary: selectionCompiler.selectionPromptContract.personality,
    imageMoodContractSummary: selectionCompiler.selectionPromptContract.imageMood,
    nsfwLevel: "adult",
  };
}
