import type { LovoraCustomCharacter } from "./custom-character-adapter";
import { buildCustomCharacterFromBuilder } from "./custom-character-adapter";
import type { CharacterBuilderInput, CharacterScenario } from "./character-engine";

const STORAGE_KEY = "lovora.custom-characters.v3";
const LEGACY_STORAGE_KEYS = [
  STORAGE_KEY,
  "lovora.custom-characters.v2",
] as const;

type DeleteResult = {
  ok: boolean;
  deleted: boolean;
};

export type StoredCharacterRecord = LovoraCustomCharacter;

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

function normalizeScenario(scenario?: CharacterScenario): CharacterScenario | undefined {
  if (!scenario) return undefined;

  const normalized: CharacterScenario = {
    setting: clean(scenario.setting),
    relationshipToUser: clean(scenario.relationshipToUser),
    sceneGoal: clean(scenario.sceneGoal),
    tone: clean(scenario.tone),
    openingState: clean(scenario.openingState),
  };

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeDateString(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function hasValidMetadata(value: unknown): value is LovoraCustomCharacter["metadata"] {
  if (!isRecord(value)) return false;

  return (
    typeof value.genderPresentation === "string" &&
    typeof value.ageVibe === "string" &&
    typeof value.backgroundVibe === "string" &&
    typeof value.replyLength === "string" &&
    typeof value.speechStyle === "string" &&
    typeof value.relationshipPace === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.version === "number" &&
    typeof value.source === "string"
  );
}

function hasValidEngine(value: unknown): value is LovoraCustomCharacter["engine"] {
  if (!isRecord(value)) return false;
  return typeof value.systemPrompt === "string" && isRecord(value.traits);
}

function hasValidMemorySeed(value: unknown): value is LovoraCustomCharacter["memorySeed"] {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.identity) &&
    Array.isArray(value.behavior) &&
    Array.isArray(value.scenario)
  );
}

function hasValidTraitBadges(value: unknown): value is LovoraCustomCharacter["traitBadges"] {
  if (!Array.isArray(value)) return false;

  return value.every(
    (item) =>
      isRecord(item) &&
      typeof item.label === "string" &&
      typeof item.tone === "string"
  );
}

function hasValidCharacterShape(value: unknown): value is LovoraCustomCharacter {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    typeof value.archetype === "string" &&
    typeof value.headline === "string" &&
    typeof value.description === "string" &&
    typeof value.greeting === "string" &&
    typeof value.previewMessage === "string" &&
    typeof value.backstory === "string" &&
    typeof value.avatarFallback === "string" &&
    Array.isArray(value.tags) &&
    hasValidTraitBadges(value.traitBadges) &&
    typeof value.scenarioSummary === "string" &&
    hasValidMemorySeed(value.memorySeed) &&
    hasValidEngine(value.engine) &&
    hasValidMetadata(value.metadata)
  );
}

function normalizeTags(value: string[]): string[] {
  return uniq(
    value
      .filter((tag) => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean)
  ).slice(0, 16);
}

function normalizeStoredCharacter(value: unknown): StoredCharacterRecord | null {
  if (!hasValidCharacterShape(value)) return null;

  const slug = toSlug(value.slug || value.name);
  if (!slug) return null;

  const createdAt = safeDateString(value.metadata.createdAt);
  const updatedAt = safeDateString(value.metadata.updatedAt, createdAt);

  return {
    ...value,
    id: clean(value.id) || `custom_${slug}`,
    slug,
    name: clean(value.name) || "Custom Character",
    headline: clean(value.headline) || "Scene-aware companion",
    description: clean(value.description) || "A custom character created in Lovora.",
    greeting: clean(value.greeting) || `Hey. I'm ${clean(value.name) || "your character"}.`,
    previewMessage:
      clean(value.previewMessage) ||
      `Hey. I'm ${clean(value.name) || "your character"}. Say something interesting.`,
    backstory: clean(value.backstory) || "",
    tags: normalizeTags(value.tags),
    scenario: normalizeScenario(value.scenario),
    scenarioSummary: clean(value.scenarioSummary) || "Open-ended character",
    traitBadges: value.traitBadges.slice(0, 8),
    metadata: {
      ...value.metadata,
      createdAt,
      updatedAt,
      version: Math.max(3, value.metadata.version),
    },
  };
}

function readStorageRawFromKey(key: string): unknown[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readStorageRaw(): unknown[] {
  for (const key of LEGACY_STORAGE_KEYS) {
    const records = readStorageRawFromKey(key);
    if (records.length > 0) return records;
  }
  return [];
}

function writeStorage(characters: StoredCharacterRecord[]): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    for (const key of LEGACY_STORAGE_KEYS) {
      if (key !== STORAGE_KEY) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore write failures
  }
}

function makeUniqueSlug(baseSlug: string, used: Set<string>): string {
  let candidate = baseSlug || "custom-character";
  let counter = 2;

  while (used.has(candidate)) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }

  used.add(candidate);
  return candidate;
}

function normalizeAndResolve(characters: StoredCharacterRecord[]): StoredCharacterRecord[] {
  const byRecency = [...characters].sort((a, b) => {
    const aTime = new Date(a.metadata.updatedAt).getTime();
    const bTime = new Date(b.metadata.updatedAt).getTime();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });

  const usedSlugs = new Set<string>();
  const seenIds = new Set<string>();
  const normalized: StoredCharacterRecord[] = [];

  for (const character of byRecency) {
    const baseSlug = toSlug(character.slug || character.name) || "custom-character";
    const nextSlug = makeUniqueSlug(baseSlug, usedSlugs);
    const nextId = clean(character.id) || `custom_${nextSlug}`;

    if (seenIds.has(nextId)) {
      continue;
    }

    seenIds.add(nextId);
    normalized.push({
      ...character,
      slug: nextSlug,
      id: nextId,
      metadata: {
        ...character.metadata,
        updatedAt: safeDateString(character.metadata.updatedAt),
        createdAt: safeDateString(character.metadata.createdAt),
        version: Math.max(3, character.metadata.version),
      },
    });
  }

  return normalized;
}

function normalizeAll(rawItems: unknown[]): StoredCharacterRecord[] {
  return normalizeAndResolve(
    rawItems
      .map((item) => normalizeStoredCharacter(item))
      .filter((item): item is StoredCharacterRecord => item !== null)
  );
}

export function getStoredCustomCharacters(): StoredCharacterRecord[] {
  const rawItems = readStorageRaw();
  const normalized = normalizeAll(rawItems);

  const shouldRewrite =
    normalized.length !== rawItems.length ||
    LEGACY_STORAGE_KEYS.some((key) => key !== STORAGE_KEY && readStorageRawFromKey(key).length > 0);

  if (shouldRewrite) {
    writeStorage(normalized);
  }

  return normalized;
}

export function getStoredCustomCharacterBySlug(slug: string): StoredCharacterRecord | undefined {
  const normalizedSlug = toSlug(slug);
  return getStoredCustomCharacters().find((item) => item.slug === normalizedSlug);
}

export function getStoredCustomCharacterById(id: string): StoredCharacterRecord | undefined {
  return getStoredCustomCharacters().find((item) => item.id === id);
}

export function saveCustomCharacter(character: LovoraCustomCharacter): StoredCharacterRecord[] {
  const normalized = normalizeStoredCharacter({
    ...character,
    metadata: {
      ...character.metadata,
      updatedAt: new Date().toISOString(),
      version: 3,
    },
  });

  if (!normalized) {
    return getStoredCustomCharacters();
  }

  const existing = getStoredCustomCharacters().filter(
    (item) => item.slug !== normalized.slug && item.id !== normalized.id
  );

  const next = normalizeAndResolve([normalized, ...existing]);
  writeStorage(next);
  return next;
}

export function saveBuilderCharacter(input: CharacterBuilderInput): StoredCharacterRecord[] {
  const character = buildCustomCharacterFromBuilder(input);
  return saveCustomCharacter(character);
}

export function deleteStoredCustomCharacterBySlug(slug: string): DeleteResult {
  const normalizedSlug = toSlug(slug);
  const existing = getStoredCustomCharacters();
  const next = existing.filter((item) => item.slug !== normalizedSlug);

  if (next.length === existing.length) {
    return { ok: true, deleted: false };
  }

  writeStorage(next);
  return { ok: true, deleted: true };
}

export function deleteStoredCustomCharacterById(id: string): DeleteResult {
  const existing = getStoredCustomCharacters();
  const next = existing.filter((item) => item.id !== id);

  if (next.length === existing.length) {
    return { ok: true, deleted: false };
  }

  writeStorage(next);
  return { ok: true, deleted: true };
}

export function customCharacterExists(slug: string): boolean {
  return Boolean(getStoredCustomCharacterBySlug(slug));
}

export function repairCustomCharactersStorage(): StoredCharacterRecord[] {
  const repaired = normalizeAll(readStorageRaw());
  writeStorage(repaired);
  return repaired;
}

export function clearCustomCharactersStorage(): void {
  if (!isBrowser()) return;

  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
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
  clear: clearCustomCharactersStorage,
};

export function getCustomCharacters(): StoredCharacterRecord[] {
  return getStoredCustomCharacters();
}

export function addCustomCharacter(character: LovoraCustomCharacter): StoredCharacterRecord[] {
  return saveCustomCharacter(character);
}

export function removeCustomCharacter(slug: string): DeleteResult {
  return deleteStoredCustomCharacterBySlug(slug);
}

export function getCustomCharacterBySlug(slug: string): StoredCharacterRecord | undefined {
  return getStoredCustomCharacterBySlug(slug);
}

export function hasCustomCharacter(slug: string): boolean {
  return customCharacterExists(slug);
}

export function clearCustomCharacters(): void {
  clearCustomCharactersStorage();
}

