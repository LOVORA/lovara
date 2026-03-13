import type { LovoraCustomCharacter } from "./custom-character-adapter";
import { buildCustomCharacterFromBuilder } from "./custom-character-adapter";
import type { CharacterBuilderInput, CharacterScenario } from "./character-engine";

const STORAGE_KEY = "lovora.custom-characters.v2";

export type StoredCharacterRecord = LovoraCustomCharacter;

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

function normalizeScenario(
  scenario?: CharacterScenario
): CharacterScenario | undefined {
  if (!scenario) return undefined;

  const normalized: CharacterScenario = {
    setting: clean(scenario.setting),
    relationshipToUser: clean(scenario.relationshipToUser),
    sceneGoal: clean(scenario.sceneGoal),
    tone: clean(scenario.tone),
    openingState: clean(scenario.openingState),
  };

  const hasAny = Object.values(normalized).some(Boolean);
  return hasAny ? normalized : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
  if (typeof value.systemPrompt !== "string") return false;
  return isRecord(value.traits);
}

function hasValidMemorySeed(
  value: unknown
): value is LovoraCustomCharacter["memorySeed"] {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.identity) &&
    Array.isArray(value.behavior) &&
    Array.isArray(value.scenario)
  );
}

function hasValidTraitBadges(
  value: unknown
): value is LovoraCustomCharacter["traitBadges"] {
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

function normalizeStoredCharacter(value: unknown): StoredCharacterRecord | null {
  if (!hasValidCharacterShape(value)) return null;

  const slug = toSlug(value.slug || value.name);
  if (!slug) return null;

  return {
    ...value,
    slug,
    tags: uniq(value.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)),
    scenario: normalizeScenario(value.scenario),
    scenarioSummary: clean(value.scenarioSummary) || "Open-ended character",
    metadata: {
      ...value.metadata,
      updatedAt: clean(value.metadata.updatedAt) || value.metadata.createdAt,
    },
  };
}

function readStorageRaw(): unknown[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(characters: StoredCharacterRecord[]): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  } catch {
    // ignore write failures
  }
}

function dedupeCharacters(
  characters: StoredCharacterRecord[]
): StoredCharacterRecord[] {
  const map = new Map<string, StoredCharacterRecord>();

  for (const character of characters) {
    const existing = map.get(character.slug);

    if (!existing) {
      map.set(character.slug, character);
      continue;
    }

    const existingUpdated = new Date(existing.metadata.updatedAt).getTime();
    const nextUpdated = new Date(character.metadata.updatedAt).getTime();

    map.set(
      character.slug,
      Number.isNaN(existingUpdated) || nextUpdated >= existingUpdated
        ? character
        : existing
    );
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.metadata.updatedAt).getTime();
    const bTime = new Date(b.metadata.updatedAt).getTime();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

export function getStoredCustomCharacters(): StoredCharacterRecord[] {
  const rawItems = readStorageRaw();

  const normalized = rawItems
    .map((item) => normalizeStoredCharacter(item))
    .filter((item): item is StoredCharacterRecord => item !== null);

  const deduped = dedupeCharacters(normalized);

  if (deduped.length !== rawItems.length) {
    writeStorage(deduped);
  }

  return deduped;
}

export function getStoredCustomCharacterBySlug(
  slug: string
): StoredCharacterRecord | undefined {
  const normalizedSlug = toSlug(slug);
  return getStoredCustomCharacters().find((item) => item.slug === normalizedSlug);
}

export function getStoredCustomCharacterById(
  id: string
): StoredCharacterRecord | undefined {
  return getStoredCustomCharacters().find((item) => item.id === id);
}

export function saveCustomCharacter(
  character: LovoraCustomCharacter
): StoredCharacterRecord[] {
  const normalized = normalizeStoredCharacter({
    ...character,
    metadata: {
      ...character.metadata,
      updatedAt: new Date().toISOString(),
    },
  });

  if (!normalized) {
    return getStoredCustomCharacters();
  }

  const existing = getStoredCustomCharacters().filter(
    (item) => item.slug !== normalized.slug && item.id !== normalized.id
  );

  const next = dedupeCharacters([normalized, ...existing]);
  writeStorage(next);
  return next;
}

export function saveBuilderCharacter(
  input: CharacterBuilderInput
): StoredCharacterRecord[] {
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
  const repaired = dedupeCharacters(
    readStorageRaw()
      .map((item) => normalizeStoredCharacter(item))
      .filter((item): item is StoredCharacterRecord => item !== null)
  );

  writeStorage(repaired);
  return repaired;
}

export function clearCustomCharactersStorage(): void {
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
  clear: clearCustomCharactersStorage,
};

/**
 * Backward-compatible aliases for older imports still used in parts of the repo.
 * These keep the current page logic working while the repo transitions to the
 * customCharactersStorage API.
 */
export function getCustomCharacters(): StoredCharacterRecord[] {
  return getStoredCustomCharacters();
}

export function addCustomCharacter(
  character: LovoraCustomCharacter
): StoredCharacterRecord[] {
  return saveCustomCharacter(character);
}

export function removeCustomCharacter(slug: string): DeleteResult {
  return deleteStoredCustomCharacterBySlug(slug);
}

export function getCustomCharacterBySlug(
  slug: string
): StoredCharacterRecord | undefined {
  return getStoredCustomCharacterBySlug(slug);
}

export function hasCustomCharacter(slug: string): boolean {
  return customCharacterExists(slug);
}

export function clearCustomCharacters(): void {
  clearCustomCharactersStorage();
}
