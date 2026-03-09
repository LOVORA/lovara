import { lunaVale } from "./luna-vale";

export const characters = [lunaVale];

export function getAllCharacters() {
  return characters;
}

export function getCharacterBySlug(slug: string) {
  return characters.find((character) => character.slug === slug);
}
