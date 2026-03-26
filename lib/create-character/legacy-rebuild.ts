import { readBuilderV2Payload } from "@/lib/character-builder/payload-readers";
import {
  composeStructuredNotes,
  getStructuredBodyNotes,
  readStructuredNotes,
  type StudioStructuredNoteMap,
} from "@/lib/create-character/studio-notes";
import {
  normalizeReferenceAvatarStyle,
  normalizeReferenceCamera,
  normalizeReferenceLightingMood,
  normalizeReferencePhotoPack,
} from "@/lib/create-character/reference-realism";
import {
  ARCHETYPE_OPTIONS,
  CORE_VIBE_OPTIONS,
  defaultStudioForm,
  GENDER_OPTIONS,
  REPLY_LENGTH_OPTIONS,
  RELATIONSHIP_PACE_OPTIONS,
  SPEECH_STYLE_OPTIONS,
  type StudioFormState,
} from "@/lib/custom-character-studio";

type LegacyRebuildSourceInput = {
  id: string;
  name: string;
  archetype: string | null;
  tags: string[] | null;
  scenario: unknown;
  payload: unknown;
};

export type LegacyRebuildSourcePayload = {
  sourceCharacterId: string;
  sourceName: string;
  noticeTitle: string;
  noticeMessage: string;
  form: StudioFormState;
};

const ARCHETYPE_SET = new Set(ARCHETYPE_OPTIONS.map((option) => option.value));
const CORE_VIBE_SET = new Set(CORE_VIBE_OPTIONS.map((option) => option.id));
const GENDER_SET = new Set(GENDER_OPTIONS.map((option) => option.value));
const REPLY_LENGTH_SET = new Set(REPLY_LENGTH_OPTIONS.map((option) => option.value));
const SPEECH_STYLE_SET = new Set(SPEECH_STYLE_OPTIONS.map((option) => option.value));
const RELATIONSHIP_PACE_SET = new Set(
  RELATIONSHIP_PACE_OPTIONS.map((option) => option.value),
);

const PROTECTED_STYLE_PATTERN =
  /\b(anime|manga|pixar|disney|ghibli|marvel|dc|naruto|elsa|spider[- ]?man)\b/i;
const LOOKALIKE_PATTERN =
  /\b(look like|looks like|similar to|in the style of|style of)\b/i;
const REAL_PERSON_PATTERN =
  /\b(celebrity|actor|actress|influencer|model|singer|real person|public figure)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampMeter(value: number | null, fallback: number) {
  if (value === null) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function containsBlockedStyle(value: string) {
  return (
    PROTECTED_STYLE_PATTERN.test(value) ||
    LOOKALIKE_PATTERN.test(value) ||
    REAL_PERSON_PATTERN.test(value)
  );
}

function sanitizeBodyNotes(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !containsBlockedStyle(line))
    .join("\n");
}

function sanitizeAvatarStyle(value: string) {
  if (!value || containsBlockedStyle(value)) {
    return "reference-style natural realism";
  }

  return normalizeReferenceAvatarStyle(value);
}

function sanitizeCamera(value: string) {
  return normalizeReferenceCamera(value);
}

function sanitizePhotoPack(value: string) {
  return normalizeReferencePhotoPack(value);
}

function sanitizeLightingMood(value: string) {
  return normalizeReferenceLightingMood(value);
}

function sanitizeOpenText(value: string) {
  return containsBlockedStyle(value) ? "" : value;
}

function normalizeAge(value: string, fallback: string) {
  const digits = value.match(/\d{1,2}/)?.[0];
  if (!digits) return fallback;

  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) return fallback;

  return String(Math.max(18, Math.min(70, numeric)));
}

function normalizeScenario(
  primary: Record<string, unknown>,
  fallback: Record<string, unknown>,
) {
  return {
    setting: asString(primary.setting) || asString(fallback.setting),
    relationshipToUser:
      asString(primary.relationshipToUser) ||
      asString(primary.relationship) ||
      asString(fallback.relationshipToUser),
    sceneGoal:
      asString(primary.sceneGoal) ||
      asString(primary.objective) ||
      asString(fallback.sceneGoal),
    tone: asString(primary.tone) || asString(fallback.tone),
    openingState:
      asString(primary.openingState) || asString(fallback.openingState),
  };
}

function pickArchetype(value: string, fallback: StudioFormState["archetype"]) {
  return ARCHETYPE_SET.has(value as StudioFormState["archetype"])
    ? (value as StudioFormState["archetype"])
    : fallback;
}

function pickGender(
  value: string,
  fallback: StudioFormState["genderPresentation"],
) {
  return GENDER_SET.has(value as StudioFormState["genderPresentation"])
    ? (value as StudioFormState["genderPresentation"])
    : fallback;
}

function pickMode(value: string, fallback: StudioFormState["mode"]) {
  return value === "quick" || value === "deep" ? value : fallback;
}

function pickVisibility(
  value: string,
  fallback: StudioFormState["visibility"],
) {
  return value === "public" || value === "private" ? value : fallback;
}

function pickReplyLength(
  value: string,
  fallback: StudioFormState["replyLength"],
) {
  return REPLY_LENGTH_SET.has(value as StudioFormState["replyLength"])
    ? (value as StudioFormState["replyLength"])
    : fallback;
}

function pickSpeechStyle(
  value: string,
  fallback: StudioFormState["speechStyle"],
) {
  return SPEECH_STYLE_SET.has(value as StudioFormState["speechStyle"])
    ? (value as StudioFormState["speechStyle"])
    : fallback;
}

function pickRelationshipPace(
  value: string,
  fallback: StudioFormState["relationshipPace"],
) {
  return RELATIONSHIP_PACE_SET.has(value as StudioFormState["relationshipPace"])
    ? (value as StudioFormState["relationshipPace"])
    : fallback;
}

function pickCoreVibes(
  value: unknown,
  fallback: StudioFormState["coreVibes"],
) {
  const next = asStringArray(value).filter((item): item is StudioFormState["coreVibes"][number] =>
    CORE_VIBE_SET.has(item as StudioFormState["coreVibes"][number]),
  );

  return next.length > 0 ? next.slice(0, 5) : fallback;
}

function buildSanitizedCustomNotes(payload: unknown) {
  const payloadRecord = toRecord(payload);
  const builderInput = toRecord(payloadRecord.builderInput);
  const builderPayload = readBuilderV2Payload(payloadRecord);
  const rawCustomNotes = asString(builderInput.customNotes);
  const parsedNotes = readStructuredNotes(rawCustomNotes);
  const bodyNotes = sanitizeBodyNotes(getStructuredBodyNotes(rawCustomNotes));

  const nextNotes: Partial<StudioStructuredNoteMap> = {
    ...parsedNotes,
    "Visual aura":
      parsedNotes["Visual aura"] || builderPayload.visualProfile.visualAura,
    Hair: parsedNotes.Hair || builderPayload.visualProfile.hair,
    Eyes: parsedNotes.Eyes || builderPayload.visualProfile.eyes,
    Outfit: parsedNotes.Outfit || builderPayload.visualProfile.outfit,
    Palette: parsedNotes.Palette || builderPayload.visualProfile.palette,
    Camera: sanitizeCamera(parsedNotes.Camera || builderPayload.visualProfile.camera),
    "Photo pack": sanitizePhotoPack(
      parsedNotes["Photo pack"] || builderPayload.visualProfile.photoPack,
    ),
    "Lighting mood": sanitizeLightingMood(
      parsedNotes["Lighting mood"],
    ),
    "Public tagline":
      parsedNotes["Public tagline"] || builderPayload.publicProfile.tagline,
    "Public teaser":
      parsedNotes["Public teaser"] || builderPayload.publicProfile.teaser,
    "Public tags":
      parsedNotes["Public tags"] ||
      builderPayload.publicProfile.tags.join(", "),
  };

  nextNotes["Avatar style"] = sanitizeAvatarStyle(
    parsedNotes["Avatar style"] || builderPayload.visualProfile.avatarStyle,
  );
  nextNotes["Image prompt"] = sanitizeOpenText(parsedNotes["Image prompt"]);
  nextNotes["Public tagline"] = sanitizeOpenText(nextNotes["Public tagline"] || "");
  nextNotes["Public teaser"] = sanitizeOpenText(nextNotes["Public teaser"] || "");

  return composeStructuredNotes(nextNotes, bodyNotes);
}

export function buildLegacyRebuildSourcePayload(
  source: LegacyRebuildSourceInput,
): LegacyRebuildSourcePayload {
  const fallback = defaultStudioForm();
  const payload = toRecord(source.payload);
  const identity = toRecord(payload.identity);
  const studio = toRecord(payload.studio);
  const builderInput = toRecord(payload.builderInput);
  const metadata = toRecord(payload.metadata);
  const sceneProfile = toRecord(metadata.sceneProfile);
  const scenario = normalizeScenario(toRecord(source.scenario), sceneProfile);
  const scoreProfile = toRecord(metadata.scoreProfile);

  const safeTags = asStringArray(source.tags).filter(
    (tag) => !containsBlockedStyle(tag),
  );

  const form: StudioFormState = {
    ...fallback,
    name: source.name || fallback.name,
    age: normalizeAge(
      asString(identity.age) || asString(builderInput.ageVibe),
      fallback.age,
    ),
    region: asString(identity.region) || fallback.region,
    archetype: pickArchetype(asString(source.archetype), fallback.archetype),
    genderPresentation: pickGender(
      asString(identity.genderPresentation),
      fallback.genderPresentation,
    ),
    mode: pickMode(asString(studio.mode), "deep"),
    visibility: pickVisibility(asString(payload.visibility), fallback.visibility),
    coreVibes: pickCoreVibes(studio.coreVibes, fallback.coreVibes),
    warmth: clampMeter(asNumber(studio.warmth), fallback.warmth),
    assertiveness: clampMeter(
      asNumber(studio.assertiveness),
      fallback.assertiveness,
    ),
    mystery: clampMeter(asNumber(studio.mystery), fallback.mystery),
    playfulness: clampMeter(asNumber(studio.playfulness), fallback.playfulness),
    replyLength: pickReplyLength(
      asString(studio.replyLength) || asString(builderInput.replyLength),
      fallback.replyLength,
    ),
    speechStyle: pickSpeechStyle(
      asString(studio.speechStyle) || asString(builderInput.speechStyle),
      fallback.speechStyle,
    ),
    relationshipPace: pickRelationshipPace(
      asString(studio.relationshipPace) ||
        asString(builderInput.relationshipPace),
      fallback.relationshipPace,
    ),
    setting: scenario.setting || fallback.setting,
    relationshipToUser:
      scenario.relationshipToUser || fallback.relationshipToUser,
    sceneGoal: scenario.sceneGoal || fallback.sceneGoal,
    tone: scenario.tone || fallback.tone,
    openingState: scenario.openingState || fallback.openingState,
    customScenario: asString(payload.customScenario),
    tags: safeTags.join(", "),
    customNotes: buildSanitizedCustomNotes(payload),
  };

  if (form.warmth === fallback.warmth && asNumber(scoreProfile.affectionate) !== null) {
    form.warmth = clampMeter(asNumber(scoreProfile.affectionate), fallback.warmth);
  }

  return {
    sourceCharacterId: source.id,
    sourceName: source.name,
    noticeTitle: "Legacy style imported",
    noticeMessage:
      "This character came from an older anime-based flow. Its personality and scene setup were imported into a new realistic-only draft, and blocked style cues were removed.",
    form,
  };
}
