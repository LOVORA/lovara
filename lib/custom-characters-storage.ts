export const CUSTOM_CHARACTERS_STORAGE_KEY = "lovora_custom_characters";

export type StoredCustomCharacter = {
  slug: string;
  name?: string;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['".,!?]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureStoredCharacter(value: unknown): StoredCustomCharacter | null {
  if (!isRecord(value)) return null;

  const rawSlug =
    typeof value.slug === "string" && value.slug.trim()
      ? value.slug
      : typeof value.name === "string" && value.name.trim()
      ? value.name
      : null;

  if (!rawSlug) return null;

  const slug = normalizeSlug(rawSlug);
  if (!slug) return null;

  return {
    ...value,
    slug,
    name: typeof value.name === "string" ? value.name : slug,
  };
}

function safeReadRaw(): unknown[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CUSTOM_CHARACTERS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(characters: StoredCustomCharacter[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    CUSTOM_CHARACTERS_STORAGE_KEY,
    JSON.stringify(characters)
  );
}

export function getCustomCharacters<T extends StoredCustomCharacter = StoredCustomCharacter>(): T[] {
  const rawItems = safeReadRaw();

  const normalized = rawItems
    .map((item) => ensureStoredCharacter(item))
    .filter((item): item is StoredCustomCharacter => item !== null);

  const dedupedMap = new Map<string, StoredCustomCharacter>();

  for (const item of normalized) {
    dedupedMap.set(item.slug, item);
  }

  const deduped = Array.from(dedupedMap.values());

  if (deduped.length !== rawItems.length) {
    writeRaw(deduped);
  }

  return deduped as T[];
}

export function saveCustomCharacters<T extends StoredCustomCharacter>(characters: T[]) {
  const normalized = characters
    .map((item) => ensureStoredCharacter(item))
    .filter((item): item is StoredCustomCharacter => item !== null);

  const dedupedMap = new Map<string, StoredCustomCharacter>();

  for (const item of normalized) {
    dedupedMap.set(item.slug, item);
  }

  writeRaw(Array.from(dedupedMap.values()));
}

export function addCustomCharacter<T extends StoredCustomCharacter>(character: T): T[] {
  const normalizedCharacter = ensureStoredCharacter(character);

  if (!normalizedCharacter) {
    return getCustomCharacters<T>();
  }

  const existing = getCustomCharacters<T>();
  const withoutSameSlug = existing.filter(
    (item) => normalizeSlug(item.slug) !== normalizedCharacter.slug
  );

  const next = [normalizedCharacter as T, ...withoutSameSlug];
  saveCustomCharacters(next);
  return next;
}

export function removeCustomCharacter(slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  const existing = getCustomCharacters();
  const next = existing.filter((item) => item.slug !== normalizedSlug);
  saveCustomCharacters(next);
  return next;
}

export function getCustomCharacterBySlug<T extends StoredCustomCharacter = StoredCustomCharacter>(
  slug: string
): T | undefined {
  const normalizedSlug = normalizeSlug(slug);
  return getCustomCharacters<T>().find((item) => item.slug === normalizedSlug);
}

export function hasCustomCharacter(slug: string): boolean {
  return Boolean(getCustomCharacterBySlug(slug));
}

export function clearCustomCharacters() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CUSTOM_CHARACTERS_STORAGE_KEY);
}
