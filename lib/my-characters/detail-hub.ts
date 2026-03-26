import { readBuilderV2VisualSummary } from "@/lib/character-builder/payload-readers";
import {
  getIdentitySummary,
  getPublicShareHref,
  getScenarioSummaryFromPayload,
  getVisibilityFromPayload,
} from "@/lib/custom-character-studio";
import { pickBestCharacterImageUrl } from "@/lib/image-storage";
import { getLegacyCharacterState } from "@/lib/legacy-character-state";
import type { DbCustomCharacter } from "@/lib/character-repository/custom-characters";
import type { DbCharacterImage } from "@/lib/character-repository/images";

export type MyCharacterDetailView = {
  visibility: "private" | "public";
  publicShareHref: string | null;
  identitySummary: string[];
  scenarioSummary: string | null;
  traitLabels: string[];
  visualSummary: string[];
  openingSummary: string | null;
  openingBeat: string | null;
  openingLine: string | null;
  relationshipLabel: string | null;
  settingLabel: string | null;
  sceneGoalLabel: string | null;
  toneLabel: string | null;
  description: string | null;
  teaser: string | null;
  primaryImageUrl: string | null;
  galleryImages: DbCharacterImage[];
  savedPhotoCount: number;
  isLegacyAnime: boolean;
  rebuildHref: string | null;
};

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readOpeningData(payload: unknown) {
  const root = asRecord(payload);
  const openingPack = asRecord(root?.openingPack);

  return {
    openingSummary: clean(openingPack?.openingSummary),
    openingBeat: clean(openingPack?.openingBeat),
  };
}

function readScenarioFields(value: unknown) {
  const scenario = asRecord(value);

  return {
    relationshipLabel: clean(scenario?.relationshipToUser),
    settingLabel: clean(scenario?.setting),
    sceneGoalLabel: clean(scenario?.sceneGoal),
    toneLabel: clean(scenario?.tone),
  };
}

function readTraitLabels(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.reduce<string[]>((acc, item) => {
    if (typeof item === "string" && item.trim()) {
      acc.push(item.trim());
      return acc;
    }

    if (
      typeof item === "object" &&
      item !== null &&
      "label" in item &&
      typeof item.label === "string" &&
      item.label.trim()
    ) {
      acc.push(item.label.trim());
    }

    return acc;
  }, []);
}

export function buildMyCharacterDetailView(args: {
  character: DbCustomCharacter;
  images: DbCharacterImage[];
}) {
  const payload =
    typeof args.character.payload === "object" && args.character.payload
      ? (args.character.payload as Record<string, unknown>)
      : null;
  const legacyState = getLegacyCharacterState({
    styleType: args.character.style_type,
    payload: args.character.payload,
  });
  const openingData = readOpeningData(args.character.payload);
  const scenarioFields = readScenarioFields(args.character.scenario);
  const primaryImageUrl =
    pickBestCharacterImageUrl(
      args.images.map((image) => ({
        character_id: image.character_id,
        public_url: image.public_url,
        is_primary: image.is_primary,
        image_type: image.image_type,
        created_at: image.created_at,
      })),
    ) ??
    clean(args.character.primary_image_url) ??
    null;
  const galleryImages = args.images.filter(
    (image) => image.public_url || image.storage_path,
  );

  return {
    visibility: getVisibilityFromPayload(payload),
    publicShareHref: getPublicShareHref(payload) ?? null,
    identitySummary: getIdentitySummary(payload),
    scenarioSummary: getScenarioSummaryFromPayload(payload) ?? null,
    traitLabels: readTraitLabels(args.character.trait_badges),
    visualSummary: readBuilderV2VisualSummary(args.character.payload),
    openingSummary: openingData.openingSummary,
    openingBeat: openingData.openingBeat,
    openingLine:
      clean(args.character.greeting) ??
      clean(args.character.preview_message) ??
      null,
    relationshipLabel: scenarioFields.relationshipLabel,
    settingLabel: scenarioFields.settingLabel,
    sceneGoalLabel: scenarioFields.sceneGoalLabel,
    toneLabel: scenarioFields.toneLabel,
    description: clean(args.character.description),
    teaser:
      clean(args.character.preview_message) ??
      clean(args.character.headline) ??
      clean(args.character.description),
    primaryImageUrl,
    galleryImages,
    savedPhotoCount: galleryImages.length,
    isLegacyAnime: legacyState.isLegacyAnime,
    rebuildHref: legacyState.rebuildEligible
      ? `/create-character?rebuild=${encodeURIComponent(args.character.id)}&source=legacy`
      : null,
  } satisfies MyCharacterDetailView;
}
