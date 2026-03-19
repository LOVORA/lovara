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
import {
  getStructuredBodyNotes,
  parseCsv,
  readStructuredNotes,
  type StudioStructuredNoteMap,
} from "@/lib/create-character/studio-notes";

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
  tone: string;
  setting: string;
  relationshipToUser: string;
  sceneGoal: string;
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
  visualAura?: string;
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
  avatarStyle?: string;
  bodyType?: string;
  bustSize?: string;
  hipsType?: string;
  waistDefinition?: string;
  heightImpression?: string;
  exposureLevel?: string;
  pose?: string;
  expression?: string;
  lightingMood?: string;
  environment?: string;
  signatureDetail?: string;
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
  return "40+";
}

function normalizeOutputType(
  camera: string,
  photoPack: string,
): CharacterOutputType {
  const source = `${camera} ${photoPack}`.toLowerCase();

  if (source.includes("selfie")) return "selfie";
  if (source.includes("full") || source.includes("body")) return "full_body";
  return "portrait";
}

function inferStudioStyleType(
  avatarStyle?: string | null,
): HiddenPromptEngineInput["styleType"] {
  return avatarStyle?.toLowerCase().includes("anime") ? "anime" : "realistic";
}

function inferStudioEyeColor(descriptor: string) {
  if (descriptor.toLowerCase().includes("green")) return "green";
  if (descriptor.toLowerCase().includes("blue")) return "blue";
  if (descriptor.toLowerCase().includes("grey")) return "grey";
  if (descriptor.toLowerCase().includes("hazel")) return "hazel";
  return descriptor ? "brown" : "";
}

function inferStudioHairColor(descriptor: string) {
  if (descriptor.toLowerCase().includes("black")) return "black";
  if (descriptor.toLowerCase().includes("blonde")) return "blonde";
  if (descriptor.toLowerCase().includes("auburn")) return "auburn";
  if (descriptor.toLowerCase().includes("brown")) return "brown";
  return "";
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
    ? Math.min(55, Math.max(18, parsedAge))
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

  const eyeColor = inferStudioEyeColor(notes["Eyes"]);
  const hairColor = inferStudioHairColor(notes["Hair"]);
  const visualExpansion = buildVisualPromptExpansion({
    archetype: form.archetype,
    avatarStyle: notes["Avatar style"],
    skinTone: notes["Skin tone"],
    bodyType: notes["Body type"] || bodyType,
    bustSize: notes["Bust size"],
    hipsType: notes["Hip shape"],
    waistDefinition: notes["Waist definition"],
    heightImpression: notes["Height impression"],
    hair: notes["Hair"],
    hairTexture: notes["Hair texture"],
    eyes: notes["Eyes"],
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
  });

  if (imagePrompt.trim()) {
    return buildHiddenPromptEngineInputFromCustomPrompt({
      styleType,
      customPrompt: {
        promptText: [
          imagePrompt,
          visualExpansion.detailPhrase,
          visualExpansion.qualityPhrase,
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
      ageBand: normalizedAgeBand,
      region: form.region || notes["Region note"] || "global",
      skinTone: notes["Skin tone"] || "",
      genderPresentation: form.genderPresentation || "",
      eyeColor,
      eyeShape: notes["Eye shape"] || "",
      faceShape: "",
      lipStyle: "",
      noseType: "",
      makeupLevel: notes["Makeup style"] || "",
      hairColor,
      hairLength: notes["Hair"] || "",
      hairTexture: notes["Hair texture"] || "",
      hairstyle: notes["Hair"] || "",
      bodyType: notes["Body type"] || bodyType,
      bustSize: notes["Bust size"] || "",
      hipsType: notes["Hip shape"] || "",
      heightImpression: notes["Height impression"] || "",
      waistDefinition: notes["Waist definition"] || "",
      mainVibe: notes["Visual aura"] || form.coreVibes[0] || "",
      energy: notes["Current energy"] || "",
      personaFlavor: form.archetype || "",
      outfitType: notes["Outfit"] || "",
      outfitColor: notes["Palette"] || "",
      exposureLevel: notes["Exposure level"] || "",
      sceneType: form.setting || "",
      cameraFraming: notes["Camera"] || "",
      lightingType: notes["Lighting mood"] || notes["Avatar style"] || "",
      poseEnergy:
        notes["Relationship stage"] === "rivals"
          ? "challenging poised stance"
          : notes["Relationship stage"] === "lovers"
            ? "intimate confident stance"
            : "composed portrait stance",
      expression: notes["Current energy"] || "",
      realismStrength: "high",
      detailLevel: "ultra high",
      variationGoal: [
        notes["Photo pack"],
        notes["Accessory vibe"],
        notes["Signature detail"],
        interestTags.join(", "),
        visualExpansion.detailPhrase,
      ]
        .filter(Boolean)
        .join(", "),
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
  const visualExpansion = buildVisualPromptExpansion({
    archetype: promptInput.archetype,
    avatarStyle: promptInput.avatarStyle,
    skinTone: promptInput.skinTone,
    bodyType: promptInput.bodyType,
    bustSize: promptInput.bustSize,
    hipsType: promptInput.hipsType,
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
    imagePrompt: "",
    signatureDetail: promptInput.signatureDetail,
    pose: promptInput.pose,
  });

  return buildHiddenPromptEngineInputFromPreset({
    styleType: inferStudioStyleType(promptInput.avatarStyle),
    presetSelections: {
      ageBand: promptInput.ageBand ?? "",
      region: promptInput.region ?? "",
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
      hipsType: promptInput.hipsType ?? "",
      heightImpression: promptInput.heightImpression ?? "",
      waistDefinition: promptInput.waistDefinition ?? "",
      mainVibe: promptInput.visualAura ?? "",
      energy: promptInput.expression ?? "",
      personaFlavor: promptInput.archetype ?? "",
      outfitType: promptInput.outfit ?? "",
      outfitColor: promptInput.palette ?? "",
      exposureLevel: promptInput.exposureLevel ?? "",
      sceneType: promptInput.environment ?? "",
      cameraFraming: promptInput.camera ?? "",
      lightingType: promptInput.lightingMood ?? promptInput.avatarStyle ?? "",
      poseEnergy: promptInput.pose ?? "",
      expression: promptInput.expression ?? "",
      realismStrength: "high",
      detailLevel: "ultra high",
      variationGoal: [
        promptInput.characterName ?? "",
        promptInput.accessoryVibe ?? "",
        promptInput.signatureDetail ?? "",
        visualExpansion.detailPhrase,
      ]
        .filter(Boolean)
        .join(", "),
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
): StudioAvatarPromptInput {
  const parsedAge = Number(form.age);
  const ageValue = Number.isFinite(parsedAge)
    ? Math.min(55, Math.max(18, parsedAge))
    : 25;

  const notes = readStructuredNotes(form.customNotes);
  const publicTags = parseCsv(notes["Public tags"]);

  const bodyType =
    publicTags.find((tag) =>
      ["athletic", "slim", "curvy", "lean", "toned"].includes(
        tag.toLowerCase(),
      ),
    ) ?? "";

  const firstExpression =
    notes["Current energy"] ||
    (form.tone.includes("playful")
      ? "playful"
      : form.tone.includes("cold")
        ? "guarded"
        : "composed");

  return {
    characterName: form.name.trim() || "Untitled character",
    archetype: form.archetype || undefined,
    visualAura: notes["Visual aura"] || undefined,
    ageBand: normalizeAgeBand(ageValue),
    genderPresentation: form.genderPresentation || undefined,
    region: form.region.trim() || undefined,
    skinTone: notes["Skin tone"] || undefined,
    hair: notes["Hair"] || undefined,
    hairTexture: notes["Hair texture"] || undefined,
    eyes: notes["Eyes"] || undefined,
    eyeShape: notes["Eye shape"] || undefined,
    makeupStyle: notes["Makeup style"] || undefined,
    accessoryVibe: notes["Accessory vibe"] || undefined,
    outfit: notes["Outfit"] || undefined,
    palette: notes["Palette"] || undefined,
    camera: notes["Camera"] || undefined,
    avatarStyle: notes["Avatar style"] || undefined,
    bodyType: notes["Body type"] || bodyType || undefined,
    bustSize: notes["Bust size"] || undefined,
    hipsType: notes["Hip shape"] || undefined,
    waistDefinition: notes["Waist definition"] || undefined,
    heightImpression: notes["Height impression"] || undefined,
    exposureLevel: notes["Exposure level"] || undefined,
    pose:
      notes["Relationship stage"] === "rivals"
        ? "confident pose"
        : notes["Relationship stage"] === "lovers"
          ? "intimate pose"
          : "composed portrait pose",
    expression: firstExpression,
    lightingMood: notes["Lighting mood"] || undefined,
    environment: form.setting || undefined,
    signatureDetail: notes["Signature detail"] || undefined,
    nsfwLevel: "adult",
  };
}
