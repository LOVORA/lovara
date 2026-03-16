import {
  buildHiddenPromptEngineInputFromCustomPrompt,
  buildHiddenPromptEngineInputFromPreset,
  runPromptEngine,
} from "@/lib/character-builder/prompt-engine";
import type {
  CharacterAgeBand,
  CharacterOutputType,
  HiddenPromptEngineInput,
  PromptEngineOutput,
} from "@/lib/character-builder/types";
import { CHARACTER_DEFAULTS } from "@/lib/character-builder/constants";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LegacyStudioFormLike = {
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

export type LegacyDraftLike = {
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

export type LegacyAvatarPromptInput = {
  characterName: string;
  archetype?: string;
  visualAura?: string;
  ageBand?: CharacterAgeBand;
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
  nsfwLevel?: "adult";
};

const STRUCTURED_KEYS = [
  "Region note",
  "Visual aura",
  "Interest anchors",
  "Response directive",
  "Key memories",
  "Example message",
  "User role",
  "Nickname for user",
  "Boundaries",
  "Greeting style",
  "Chat mode",
  "Avatar style",
  "Hair",
  "Eyes",
  "Outfit",
  "Palette",
  "Camera",
  "Photo pack",
  "Image prompt",
  "Dynamism",
  "Relationship stage",
  "Jealousy",
  "Attachment",
  "Protectiveness",
  "Conversation initiative",
  "Affection style",
  "Conflict style",
  "Emotional availability",
  "Message format",
  "Linguistic flavor",
  "Chemistry template",
  "Current energy",
  "Public tagline",
  "Public teaser",
  "Public tags",
] as const;

type StructuredKey = (typeof STRUCTURED_KEYS)[number];

export type LegacyStructuredNotes = Record<StructuredKey, string>;

function extractStructuredLine(source: string, prefix: string) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^${escaped}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function removeStructuredLine(source: string, prefix: string) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`^${escaped}:\\s*.+$(\\n)?`, "m"), "").trim();
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

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

function toSafeObject(value: Json, fallback: Record<string, Json> = {}) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, Json>) }
    : fallback;
}

export function parseLegacyStructuredNotes(
  customNotes: string,
): LegacyStructuredNotes {
  const result = {} as LegacyStructuredNotes;

  for (const key of STRUCTURED_KEYS) {
    result[key] = extractStructuredLine(customNotes, key);
  }

  return result;
}

export function getLegacyBodyNotes(customNotes: string): string {
  let result = customNotes;

  for (const key of STRUCTURED_KEYS) {
    result = removeStructuredLine(result, key);
  }

  return result.trim();
}

export function buildLegacyHiddenPromptInput(
  form: LegacyStudioFormLike,
): HiddenPromptEngineInput {
  const parsedAge = Number(form.age);
  const ageValue = Number.isFinite(parsedAge)
    ? Math.min(55, Math.max(18, parsedAge))
    : 25;

  const normalizedAgeBand = normalizeAgeBand(ageValue);
  const notes = parseLegacyStructuredNotes(form.customNotes);
  const bodyNotes = getLegacyBodyNotes(form.customNotes);
  const interestTags = parseCsv(notes["Interest anchors"]);
  const publicTags = parseCsv(notes["Public tags"]);
  const imagePrompt = notes["Image prompt"];
  const outputType = normalizeOutputType(notes["Camera"], notes["Photo pack"]);

  const bodyType =
    publicTags.find((tag) =>
      ["athletic", "slim", "curvy", "lean", "toned"].includes(
        tag.toLowerCase(),
      ),
    ) ?? "";

  const eyeColor =
    notes["Eyes"].toLowerCase().includes("green")
      ? "green"
      : notes["Eyes"].toLowerCase().includes("blue")
        ? "blue"
        : notes["Eyes"].toLowerCase().includes("grey")
          ? "grey"
          : notes["Eyes"].toLowerCase().includes("hazel")
            ? "hazel"
            : notes["Eyes"]
              ? "brown"
              : "";

  const hairColor =
    notes["Hair"].toLowerCase().includes("black")
      ? "black"
      : notes["Hair"].toLowerCase().includes("blonde")
        ? "blonde"
        : notes["Hair"].toLowerCase().includes("auburn")
          ? "auburn"
          : notes["Hair"].toLowerCase().includes("brown")
            ? "brown"
            : "";

  if (imagePrompt.trim()) {
    return buildHiddenPromptEngineInputFromCustomPrompt({
      styleType: "realistic",
      customPrompt: {
        promptText: [
          imagePrompt,
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
    styleType: "realistic",
    presetSelections: {
      ageBand: normalizedAgeBand,
      region: form.region || notes["Region note"] || "global",
      skinTone: "",
      genderPresentation: form.genderPresentation || "",
      eyeColor,
      eyeShape: "",
      faceShape: "",
      lipStyle: "",
      noseType: "",
      makeupLevel: "",
      hairColor,
      hairLength: notes["Hair"] || "",
      hairTexture: "",
      hairstyle: notes["Hair"] || "",
      bodyType,
      bustSize: "",
      hipsType: "",
      heightImpression: "",
      waistDefinition: "",
      mainVibe: notes["Visual aura"] || form.coreVibes[0] || "",
      energy: notes["Current energy"] || "",
      personaFlavor: form.archetype || "",
      outfitType: notes["Outfit"] || "",
      outfitColor: notes["Palette"] || "",
      exposureLevel: "",
      sceneType: form.setting || "",
      cameraFraming: notes["Camera"] || "",
      lightingType: notes["Avatar style"] || "",
      poseEnergy: "",
      expression: notes["Current energy"] || "",
      realismStrength: "high",
      detailLevel: "high",
      variationGoal: notes["Photo pack"] || interestTags.join(", "),
    },
  });
}

export function buildLegacyBuilderV2Summary(form: LegacyStudioFormLike): {
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutput;
  notes: LegacyStructuredNotes;
  bodyNotes: string;
} {
  const hiddenPromptInput = buildLegacyHiddenPromptInput(form);
  const promptEngineOutput = runPromptEngine(hiddenPromptInput);
  const notes = parseLegacyStructuredNotes(form.customNotes);

  return {
    hiddenPromptInput,
    promptEngineOutput,
    notes,
    bodyNotes: getLegacyBodyNotes(form.customNotes),
  };
}

export function enrichLegacyDraftWithBuilderV2(
  draft: LegacyDraftLike,
  form: LegacyStudioFormLike,
): LegacyDraftLike {
  const { hiddenPromptInput, promptEngineOutput, notes } =
    buildLegacyBuilderV2Summary(form);

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

export function buildLegacyAvatarPromptInputCompat(
  form: LegacyStudioFormLike,
): LegacyAvatarPromptInput {
  const parsedAge = Number(form.age);
  const ageValue = Number.isFinite(parsedAge)
    ? Math.min(55, Math.max(18, parsedAge))
    : 25;

  const notes = parseLegacyStructuredNotes(form.customNotes);
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
    hair: notes["Hair"] || undefined,
    eyes: notes["Eyes"] || undefined,
    outfit: notes["Outfit"] || undefined,
    palette: notes["Palette"] || undefined,
    camera: notes["Camera"] || undefined,
    avatarStyle: notes["Avatar style"] || undefined,
    bodyType: bodyType || undefined,
    pose:
      notes["Relationship stage"] === "rivals"
        ? "confident pose"
        : notes["Relationship stage"] === "lovers"
          ? "intimate pose"
          : "composed portrait pose",
    expression: firstExpression,
    environment: form.setting || undefined,
    nsfwLevel: "adult",
  };
}
