export const CUSTOM_CHARACTERS_STORAGE_KEY = "lovora_custom_characters";

export function getCustomCharacters<T = unknown>(): T[] {
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

export function saveCustomCharacters<T = unknown>(characters: T[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    CUSTOM_CHARACTERS_STORAGE_KEY,
    JSON.stringify(characters)
  );
}

export function addCustomCharacter<T extends { slug: string }>(character: T) {
  const existing = getCustomCharacters<T>();

  const withoutSameSlug = existing.filter((item) => item.slug !== character.slug);
  const next = [character, ...withoutSameSlug];

  saveCustomCharacters(next);

  return next;
}

export function removeCustomCharacter(slug: string) {
  const existing = getCustomCharacters<{ slug: string }>();
  const next = existing.filter((item) => item.slug !== slug);

  saveCustomCharacters(next);
  return next;
}
