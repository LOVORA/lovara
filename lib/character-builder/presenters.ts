import {
  readBuilderV2Payload,
  readBuilderV2PublicCard,
  readBuilderV2PromptDebug,
  readBuilderV2VisualSummary,
} from "@/lib/character-builder/payload-readers";

export type CharacterLike = {
  id: string;
  slug?: string;
  name?: string;
  headline?: string;
  description?: string;
  tags?: string[];
  payload?: unknown;
};

export type CharacterCardPresentation = {
  title: string;
  subtitle: string;
  teaser: string;
  tags: string[];
  visualSummary: string[];
  isBuilderV2: boolean;
};

export type CharacterDebugPresentation = {
  promptSummary: string;
  canonicalPrompt: string;
  negativePrompt: string;
  styleType: string;
  builderMode: string;
  promptVersion: string;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickFirstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = cleanString(value);
    if (text) return text;
  }
  return "";
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

export function presentCharacterCard(
  character: CharacterLike,
): CharacterCardPresentation {
  const builder = readBuilderV2Payload(character.payload);
  const publicCard = readBuilderV2PublicCard(character.payload);
  const visualSummary = readBuilderV2VisualSummary(character.payload);

  const title = pickFirstNonEmpty(
    character.name,
    publicCard.title,
    "Untitled Character",
  );

  const subtitle = pickFirstNonEmpty(
    publicCard.title,
    character.headline,
    builder.promptSummary,
    "Custom character",
  );

  const teaser = pickFirstNonEmpty(
    publicCard.teaser,
    character.description,
    builder.promptSummary,
    "No teaser available yet.",
  );

  const tags = unique([
    ...cleanStringArray(character.tags),
    ...publicCard.tags,
    ...visualSummary.slice(0, 2),
  ]).slice(0, 8);

  return {
    title,
    subtitle,
    teaser,
    tags,
    visualSummary,
    isBuilderV2: builder.enabled,
  };
}

export function presentCharacterDebug(
  character: CharacterLike,
): CharacterDebugPresentation {
  const builder = readBuilderV2Payload(character.payload);
  const debug = readBuilderV2PromptDebug(character.payload);

  return {
    promptSummary: debug.promptSummary,
    canonicalPrompt: debug.canonicalPrompt,
    negativePrompt: debug.negativePrompt,
    styleType: builder.styleType,
    builderMode: builder.builderMode,
    promptVersion: builder.promptVersion,
  };
}

export function presentCharacterVisualBadges(
  character: CharacterLike,
): string[] {
  const builder = readBuilderV2Payload(character.payload);

  return [
    builder.visualProfile.visualAura,
    builder.visualProfile.avatarStyle,
    builder.visualProfile.hair,
    builder.visualProfile.eyes,
    builder.visualProfile.outfit,
    builder.visualProfile.palette,
    builder.visualProfile.camera,
    builder.visualProfile.photoPack,
  ].filter(Boolean);
}

export function presentCharacterPublicTeaser(
  character: CharacterLike,
): string {
  const builder = readBuilderV2Payload(character.payload);
  const publicCard = readBuilderV2PublicCard(character.payload);

  return pickFirstNonEmpty(
    publicCard.teaser,
    character.description,
    builder.promptSummary,
    "",
  );
}

export function presentCharacterHeadline(
  character: CharacterLike,
): string {
  const builder = readBuilderV2Payload(character.payload);
  const publicCard = readBuilderV2PublicCard(character.payload);

  return pickFirstNonEmpty(
    publicCard.title,
    character.headline,
    builder.promptSummary,
    "",
  );
}
