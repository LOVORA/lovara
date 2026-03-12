import type {
  LovoraCustomCharacter,
  CustomCharacterTraitBadge,
  CustomCharacterMemorySeed,
} from "./custom-character-adapter";
import { buildCustomCharacterFromBuilder } from "./custom-character-adapter";
import type { CharacterBuilderInput, CharacterScenario } from "./character-engine";

const STORAGE_KEY = "lovora.custom-characters.v2";

type StoredCharacterRecord = LovoraCustomCharacter;

type DeleteResult = {
  ok: boolean;
  deleted: boolean;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function toSlug(input: string): string {
  return input
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeSafeSlug(name: string, archetype?: string): string {
  const base = toSlug(name) || "custom-character";
  const suffix = archetype ? toSlug(archetype) : "";
  const combined = suffix ? `${base}-${suffix}` : base;
  return combined.slice(0, 72).replace(/-+$/g, "") || "custom-character";
}

function makeId(slug: string): string {
  return `custom_${slug}`;
}

function getAvatarFallback(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return letters || "LC";
}

function normalizeScenario(input?: CharacterScenario): CharacterScenario | undefined {
  if (!input || typeof input !== "object") return undefined;

  const normalized: CharacterScenario = {
    setting: clean(input.setting),
    relationshipToUser: clean(input.relationshipToUser),
    sceneGoal: clean(input.sceneGoal),
    tone: clean(input.tone),
    openingState: clean(input.openingState),
  };

  const hasAny = Object.values(normalized).some(Boolean);
  return hasAny ? normalized : undefined;
}

function normalizeStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return uniq(
    value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, max)
  );
}

function normalizeTraitBadges(value: unknown): CustomCharacterTraitBadge[] {
  if (!Array.isArray(value)) return [];

  const allowedTones: CustomCharacterTraitBadge["tone"][] = [
    "neutral",
    "soft",
    "warm",
    "bold",
    "mysterious",
  ];

  const result: CustomCharacterTraitBadge[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const rawLabel = "label" in item ? item.label : undefined;
    const rawTone = "tone" in item ? item.tone : undefined;

    const label = typeof rawLabel === "string" ? rawLabel.trim() : "";
    const tone =
      typeof rawTone === "string" && allowedTones.includes(rawTone as CustomCharacterTraitBadge["tone"])
        ? (rawTone as CustomCharacterTraitBadge["tone"])
        : "neutral";

    if (!label) continue;
    if (result.some((badge) => badge.label === label)) continue;

    result.push({ label, tone });

    if (result.length >= 8) break;
  }

  return result;
}

function normalizeMemorySeed(value: unknown): CustomCharacterMemorySeed {
  const fallback: CustomCharacterMemorySeed = {
    identity: [],
    behavior: [],
    scenario: [],
  };

  if (!value || typeof value !== "object") return fallback;

  const record = value as Partial<CustomCharacterMemorySeed>;

  return {
    identity: normalizeStringArray(record.identity, 12),
    behavior: normalizeStringArray(record.behavior, 12),
    scenario: normalizeStringArray(record.scenario, 12),
  };
}

function safeJsonParse(value: string | null): unknown {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeCharacterRecord(raw: unknown): StoredCharacterRecord | null {
  if (!isRecord(raw)) return null;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return null;

  const archetype =
    typeof raw.archetype === "string" && raw.archetype.trim()
      ? raw.archetype.trim()
      : "sweetheart";

  const slugSource =
    typeof raw.slug === "string" && raw.slug.trim()
      ? raw.slug.trim()
      : makeSafeSlug(name, archetype);

  const slug = toSlug(slugSource) || makeSafeSlug(name, archetype);
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : makeId(slug);

  const headline =
    typeof raw.headline === "string" && raw.headline.trim()
      ? raw.headline.trim()
      : `${name} • custom character`;

  const description =
    typeof raw.description === "string" && raw.description.trim()
      ? raw.description.trim()
      : "Custom character";

  const greeting =
    typeof raw.greeting === "string" && raw.greeting.trim()
      ? raw.greeting.trim()
      : `${name} is here.`;

  const previewMessage =
    typeof raw.previewMessage === "string" && raw.previewMessage.trim()
      ? raw.previewMessage.trim()
      : greeting;

  const backstory =
    typeof raw.backstory === "string" && raw.backstory.trim()
      ? raw.backstory.trim()
      : description;

  const avatarFallback =
    typeof raw.avatarFallback === "string" && raw.avatarFallback.trim()
      ? raw.avatarFallback.trim()
      : getAvatarFallback(name);

  const scenario = normalizeScenario(raw.scenario as CharacterScenario | undefined);

  const scenarioSummary =
    typeof raw.scenarioSummary === "string" && raw.scenarioSummary.trim()
      ? raw.scenarioSummary.trim()
      : scenario
      ? [
          scenario.setting ? `Setting: ${scenario.setting}` : "",
          scenario.relationshipToUser ? `Relationship: ${scenario.relationshipToUser}` : "",
          scenario.tone ? `Tone: ${scenario.tone}` : "",
        ]
          .filter(Boolean)
          .join(" • ") || "Open-ended character"
      : "Open-ended character";

  const tags = normalizeStringArray(raw.tags, 12);
  const traitBadges = normalizeTraitBadges(raw.traitBadges);
  const memorySeed = normalizeMemorySeed(raw.memorySeed);

  const rawEngine = isRecord(raw.engine) ? raw.engine : {};
  const systemPrompt =
    typeof rawEngine.systemPrompt === "string" ? rawEngine.systemPrompt : "";

  const rawTraits = isRecord(rawEngine.traits) ? rawEngine.traits : {};
  const engineTraits = {
    initiativeLevel: numberOr(rawTraits.initiativeLevel, 0),
    verbalAssertiveness: numberOr(rawTraits.verbalAssertiveness, 0),
    affectionWarmth: numberOr(rawTraits.affectionWarmth, 0),
    jealousyExpression: numberOr(rawTraits.jealousyExpression, 0),
    emotionalOpenness: numberOr(rawTraits.emotionalOpenness, 0),
    mysteryProjection: numberOr(rawTraits.mysteryProjection, 0),
    teasingFrequency: numberOr(rawTraits.teasingFrequency, 0),
    humorSharpness: numberOr(rawTraits.humorSharpness, 0),
    attachmentSpeed: numberOr(rawTraits.attachmentSpeed, 0),
    sceneLeadership: numberOr(rawTraits.sceneLeadership, 0),
    reassuranceStyle: numberOr(rawTraits.reassuranceStyle, 0),
    responseDensity: numberOr(rawTraits.responseDensity, 0),
    sensoryLanguage: numberOr(rawTraits.sensoryLanguage, 0),
    vulnerabilityVisibility: numberOr(rawTraits.vulnerabilityVisibility, 0),
    responseTemperature: numberOr(rawTraits.responseTemperature, 0),
    sceneAttunement: numberOr(rawTraits.sceneAttunement, 0),
    contextualRestraint: numberOr(rawTraits.contextualRestraint, 0),
    socialWarmth: numberOr(rawTraits.socialWarmth, 0),
    emotionalPressure: numberOr(rawTraits.emotionalPressure, 0),
  };

  const rawMetadata = isRecord(raw.metadata) ? raw.metadata : {};
  const now = new Date().toISOString();

  const metadata = {
    genderPresentation:
      typeof rawMetadata.genderPresentation === "string" && rawMetadata.genderPresentation.trim()
        ? rawMetadata.genderPresentation.trim()
        : "feminine",
    ageVibe:
      typeof rawMetadata.ageVibe === "string" && rawMetadata.ageVibe.trim()
        ? rawMetadata.ageVibe.trim()
        : "",
    backgroundVibe:
      typeof rawMetadata.backgroundVibe === "string" && rawMetadata.backgroundVibe.trim()
        ? rawMetadata.backgroundVibe.trim()
        : "",
    replyLength:
      typeof rawMetadata.replyLength === "string" && rawMetadata.replyLength.trim()
        ? rawMetadata.replyLength.trim()
        : "balanced",
    speechStyle:
      typeof rawMetadata.speechStyle === "string" && rawMetadata.speechStyle.trim()
        ? rawMetadata.speechStyle.trim()
        : "natural",
    relationshipPace:
      typeof rawMetadata.relationshipPace === "string" && rawMetadata.relationshipPace.trim()
        ? rawMetadata.relationshipPace.trim()
        : "balanced",
    createdAt:
      typeof rawMetadata.createdAt === "string" && rawMetadata.createdAt.trim()
        ? rawMetadata.createdAt.trim()
        : now,
    updatedAt:
      typeof rawMetadata.updatedAt === "string" && rawMetadata.updatedAt.trim()
        ? rawMetadata.updatedAt.trim()
        : now,
    version:
      typeof rawMetadata.version === "number" && Number.isFinite(rawMetadata.version)
        ? rawMetadata.version
        : 2,
    source:
      typeof rawMetadata.source === "string" && rawMetadata.source.trim()
        ? rawMetadata.source.trim()
        : "custom-builder",
  };

  return {
    id,
    slug,
    name,
    archetype: archetype as StoredCharacterRecord["archetype"],
    headline,
    description,
    greeting,
    previewMessage,
    backstory,
    avatarFallback,
    tags,
    traitBadges,
    scenario,
    scenarioSummary,
    memorySeed,
    engine: {
      systemPrompt,
      traits: engineTraits,
    },
    metadata: metadata as StoredCharacterRecord["metadata"],
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function compareCharacters(a: StoredCharacterRecord, b: StoredCharacterRecord): number {
  const aTime = Date.parse(a.metadata.updatedAt || a.metadata.createdAt || "");
  const bTime = Date.parse(b.metadata.updatedAt || b.metadata.createdAt || "");

  const safeATime = Number.isFinite(aTime) ? aTime : 0;
  const safeBTime = Number.isFinite(bTime) ? bTime : 0;

  if (safeATime !== safeBTime) return safeBTime - safeATime;

  return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
}

function dedupeAndRepairSlugs(
  characters: StoredCharacterRecord[]
): StoredCharacterRecord[] {
  const usedSlugs = new Set<string>();
  const usedIds = new Set<string>();

  return characters.map((character) => {
    let slug = toSlug(character.slug) || makeSafeSlug(character.name, character.archetype);
    const baseSlug = slug;
    let counter = 2;

    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    usedSlugs.add(slug);

    let id = character.id?.trim() || makeId(slug);
    if (usedIds.has(id)) {
      id = makeId(slug);
    }
    usedIds.add(id);

    return {
      ...character,
      id,
      slug,
    };
  });
}

function readRawCharacters(): StoredCharacterRecord[] {
  if (!isBrowser()) return [];

  const parsed = safeJsonParse(window.localStorage.getItem(STORAGE_KEY));
  const items = Array.isArray(parsed) ? parsed : [];

  const normalized = items
    .map((item) => normalizeCharacterRecord(item))
    .filter((item): item is StoredCharacterRecord => Boolean(item));

  return dedupeAndRepairSlugs(normalized).sort(compareCharacters);
}

function writeRawCharacters(characters: StoredCharacterRecord[]): StoredCharacterRecord[] {
  const normalized = dedupeAndRepairSlugs(
    characters
      .map((item) => normalizeCharacterRecord(item))
      .filter((item): item is StoredCharacterRecord => Boolean(item))
  ).sort(compareCharacters);

  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      return normalized;
    }
  }

  return normalized;
}

export function getStoredCustomCharacters(): StoredCharacterRecord[] {
  return readRawCharacters();
}

export function getStoredCustomCharacterBySlug(
  slug: string
): StoredCharacterRecord | null {
  const safeSlug = toSlug(slug);
  if (!safeSlug) return null;

  const characters = readRawCharacters();
  return characters.find((character) => character.slug === safeSlug) ?? null;
}

export function getStoredCustomCharacterById(
  id: string
): StoredCharacterRecord | null {
  const safeId = clean(id);
  if (!safeId) return null;

  const characters = readRawCharacters();
  return characters.find((character) => character.id === safeId) ?? null;
}

export function saveCustomCharacter(
  character: StoredCharacterRecord
): StoredCharacterRecord {
  const normalized = normalizeCharacterRecord(character);
  if (!normalized) {
    throw new Error("Invalid custom character payload.");
  }

  const existing = readRawCharacters();
  const withoutSameId = existing.filter((item) => item.id !== normalized.id);

  const timestamp = new Date().toISOString();

  const prepared: StoredCharacterRecord = {
    ...normalized,
    metadata: {
      ...normalized.metadata,
      createdAt:
        existing.find((item) => item.id === normalized.id)?.metadata.createdAt ||
        normalized.metadata.createdAt ||
        timestamp,
      updatedAt: timestamp,
    },
  };

  const saved = writeRawCharacters([prepared, ...withoutSameId]);
  return (
    saved.find((item) => item.id === prepared.id) ??
    saved.find((item) => item.slug === prepared.slug) ??
    prepared
  );
}

export function saveBuilderCharacter(
  input: CharacterBuilderInput
): StoredCharacterRecord {
  const character = buildCustomCharacterFromBuilder(input);
  return saveCustomCharacter(character);
}

export function deleteStoredCustomCharacterBySlug(slug: string): DeleteResult {
  const safeSlug = toSlug(slug);
  if (!safeSlug) return { ok: false, deleted: false };

  const before = readRawCharacters();
  const after = before.filter((character) => character.slug !== safeSlug);

  if (after.length === before.length) {
    return { ok: true, deleted: false };
  }

  writeRawCharacters(after);
  return { ok: true, deleted: true };
}

export function deleteStoredCustomCharacterById(id: string): DeleteResult {
  const safeId = clean(id);
  if (!safeId) return { ok: false, deleted: false };

  const before = readRawCharacters();
  const after = before.filter((character) => character.id !== safeId);

  if (after.length === before.length) {
    return { ok: true, deleted: false };
  }

  writeRawCharacters(after);
  return { ok: true, deleted: true };
}

export function customCharacterExists(slug: string): boolean {
  return Boolean(getStoredCustomCharacterBySlug(slug));
}

export function repairCustomCharactersStorage(): StoredCharacterRecord[] {
  const repaired = writeRawCharacters(readRawCharacters());
  return repaired;
}

export function replaceAllStoredCustomCharacters(
  characters: StoredCharacterRecord[]
): StoredCharacterRecord[] {
  return writeRawCharacters(characters);
}

export function duplicateStoredCustomCharacter(
  slug: string
): StoredCharacterRecord | null {
  const existing = getStoredCustomCharacterBySlug(slug);
  if (!existing) return null;

  const timestamp = new Date().toISOString();
  const duplicateBaseSlug = `${existing.slug}-copy`;

  const duplicated: StoredCharacterRecord = {
    ...existing,
    id: makeId(`${duplicateBaseSlug}-${Date.now()}`),
    slug: duplicateBaseSlug,
    name: `${existing.name} Copy`,
    metadata: {
      ...existing.metadata,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  return saveCustomCharacter(duplicated);
}

export function upsertStoredCustomCharacter(
  character: StoredCharacterRecord
): StoredCharacterRecord {
  return saveCustomCharacter(character);
}

export function clearAllStoredCustomCharacters(): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const customCharactersStorage = {
  key: STORAGE_KEY,
  list: getStoredCustomCharacters,
  getBySlug: getStoredCustomCharacterBySlug,
  getById: getStoredCustomCharacterById,
  save: saveCustomCharacter,
  saveFromBuilder: saveBuilderCharacter,
  deleteBySlug: deleteStoredCustomCharacterBySlug,
  deleteById: deleteStoredCustomCharacterById,
  exists: customCharacterExists,
  repair: repairCustomCharactersStorage,
  replaceAll: replaceAllStoredCustomCharacters,
  duplicate: duplicateStoredCustomCharacter,
  upsert: upsertStoredCustomCharacter,
  clear: clearAllStoredCustomCharacters,
};
