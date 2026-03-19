import type {
  CharacterBuilderMode,
  CharacterOutputType,
  CharacterStyleType,
} from "./types";

export type PromptTemplateBlock = {
  identity: string[];
  aesthetics: string[];
  scene: string[];
  quality: string[];
};

export type PromptTemplateContext = {
  styleType: CharacterStyleType;
  builderMode: CharacterBuilderMode;
  outputType: CharacterOutputType;
};

export const PROMPT_VERSION = "v1";

export const QUALITY_NEGATIVE_PROMPT_BLOCK: string[] = [
  "low quality",
  "worst quality",
  "blurry",
  "out of focus",
  "soft focus blur",
  "bad anatomy",
  "bad hands",
  "extra fingers",
  "missing fingers",
  "extra limbs",
  "malformed limbs",
  "deformed body",
  "warped torso",
  "broken spine pose",
  "twisted shoulders",
  "uneven breasts",
  "melted hands",
  "bad feet",
  "distorted face",
  "face distortion",
  "identity drift",
  "different face",
  "unrecognizable face",
  "crossed eyes",
  "asymmetrical eyes",
  "lazy eye",
  "mutated hands",
  "poorly drawn hands",
  "poorly drawn face",
  "cropped head",
  "cut off forehead",
  "cropped chin",
  "cropped limbs",
  "duplicate body",
  "double face",
  "duplicate person",
  "extra person",
  "background people",
  "watermark",
  "text",
  "logo",
  "signature",
  "jpeg artifacts",
  "oversaturated",
  "underexposed",
  "overexposed",
  "flat lighting",
  "harsh flash",
  "plastic skin",
  "over-smoothed skin",
  "uncanny face",
  "bad teeth",
  "bad mouth",
  "mismatched earrings",
  "messy clothing edges",
  "floating accessories",
  "bad composition",
];

export const SAFETY_NEGATIVE_PROMPT_BLOCK: string[] = [
  "child",
  "minor",
  "underage",
  "teen",
  "young-looking",
  "school uniform",
  "middle school",
  "high school",
  "loli",
  "shota",
  "celebrity",
  "public figure",
  "real person likeness",
  "non-consensual",
  "coercion",
  "assault",
  "rape",
  "violence during intimacy",
  "illegal sexual content",
  "incest",
  "family sexual content",
  "graphic explicit sex act",
  "pornographic penetration focus",
];

export const IDENTITY_NEGATIVE_PROMPT_BLOCK: string[] = [
  "age ambiguity",
  "childlike proportions",
  "baby face",
  "face mismatch",
  "inconsistent eye color",
  "inconsistent hair color",
  "inconsistent hairstyle",
  "unstable facial structure",
  "facial feature drift",
  "different body type",
  "identity inconsistency",
];

export const REALISTIC_QUALITY_BLOCK: string[] = [
  "highly detailed realistic portrait",
  "clean anatomy",
  "natural skin texture",
  "sharp eyes",
  "detailed hair strands",
  "premium lighting",
  "elegant composition",
  "photorealistic adult subject",
];

export const ANIME_QUALITY_BLOCK: string[] = [
  "high-detail anime illustration",
  "clean linework",
  "polished anime shading",
  "expressive eyes",
  "clean anatomy",
  "stylized adult character design",
  "beautiful composition",
  "premium anime render",
];

export const REALISTIC_STYLE_BLOCK: string[] = [
  "photorealistic",
  "adult subject",
  "realistic skin detail",
  "camera-aware composition",
];

export const ANIME_STYLE_BLOCK: string[] = [
  "anime style",
  "adult anime character",
  "stylized beauty",
  "clean illustration finish",
];

export const OUTPUT_TYPE_BLOCKS: Record<CharacterOutputType, string[]> = {
  portrait: ["portrait framing", "focus on face and upper body"],
  selfie: ["selfie composition", "natural handheld framing"],
  full_body: ["full body composition", "head-to-toe framing"],
};

export function getStyleBaseBlock(styleType: CharacterStyleType): string[] {
  return styleType === "anime" ? ANIME_STYLE_BLOCK : REALISTIC_STYLE_BLOCK;
}

export function getQualityBlock(styleType: CharacterStyleType): string[] {
  return styleType === "anime" ? ANIME_QUALITY_BLOCK : REALISTIC_QUALITY_BLOCK;
}

export function getOutputTypeBlock(outputType: CharacterOutputType): string[] {
  return OUTPUT_TYPE_BLOCKS[outputType];
}

export function normalizePromptParts(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();

  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function joinPromptParts(parts: Array<string | null | undefined>): string {
  return normalizePromptParts(parts).join(", ");
}

export function buildNegativePrompt(
  extras: Array<string | null | undefined> = [],
): string {
  return joinPromptParts([
    ...QUALITY_NEGATIVE_PROMPT_BLOCK,
    ...IDENTITY_NEGATIVE_PROMPT_BLOCK,
    ...SAFETY_NEGATIVE_PROMPT_BLOCK,
    ...extras,
  ]);
}

export function createEmptyPromptTemplateBlock(): PromptTemplateBlock {
  return {
    identity: [],
    aesthetics: [],
    scene: [],
    quality: [],
  };
}

export function mergePromptTemplateBlocks(
  ...blocks: Array<Partial<PromptTemplateBlock> | null | undefined>
): PromptTemplateBlock {
  const merged = createEmptyPromptTemplateBlock();

  for (const block of blocks) {
    if (!block) continue;

    merged.identity.push(...(block.identity ?? []));
    merged.aesthetics.push(...(block.aesthetics ?? []));
    merged.scene.push(...(block.scene ?? []));
    merged.quality.push(...(block.quality ?? []));
  }

  return {
    identity: normalizePromptParts(merged.identity),
    aesthetics: normalizePromptParts(merged.aesthetics),
    scene: normalizePromptParts(merged.scene),
    quality: normalizePromptParts(merged.quality),
  };
}

export function buildCanonicalPromptFromBlock(
  block: PromptTemplateBlock,
  context: PromptTemplateContext,
): string {
  return joinPromptParts([
    ...getStyleBaseBlock(context.styleType),
    ...block.identity,
    ...block.aesthetics,
    ...block.scene,
    ...getOutputTypeBlock(context.outputType),
    ...getQualityBlock(context.styleType),
    ...block.quality,
  ]);
}

export function buildPromptSummary(parts: Array<string | null | undefined>): string {
  const cleaned = normalizePromptParts(parts);
  return cleaned.slice(0, 6).join(", ");
}
