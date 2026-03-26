import { readBuilderV2Payload } from "@/lib/character-builder/payload-readers";

export type LegacyCharacterDetectionSource = "style_type" | "payload" | "none";

export type LegacyCharacterState = {
  isLegacyAnime: boolean;
  rebuildEligible: boolean;
  detectionSource: LegacyCharacterDetectionSource;
};

type LegacyCharacterStateInput = {
  styleType?: string | null;
  payload?: unknown;
};

export function getLegacyCharacterState(
  input: LegacyCharacterStateInput,
): LegacyCharacterState {
  if (input.styleType === "anime") {
    return {
      isLegacyAnime: true,
      rebuildEligible: true,
      detectionSource: "style_type",
    };
  }

  const builderPayload = readBuilderV2Payload(input.payload);
  if (builderPayload.styleType === "anime") {
    return {
      isLegacyAnime: true,
      rebuildEligible: true,
      detectionSource: "payload",
    };
  }

  return {
    isLegacyAnime: false,
    rebuildEligible: false,
    detectionSource: "none",
  };
}

export function buildLegacyRebuildHref(characterId: string) {
  return `/create-character?rebuild=${encodeURIComponent(characterId)}&source=legacy`;
}
