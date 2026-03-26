import type {
  CharacterBuilderMode,
  CharacterOutputType,
  CharacterStyleType,
} from "./types";
import {
  REFERENCE_REALISM_NEGATIVE_ANCHORS,
  REFERENCE_REALISM_POSITIVE_ANCHORS,
} from "@/lib/create-character/reference-realism";

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
  "static front-facing pose",
  "centered passport pose",
  "repeated body pose",
  "rigid symmetrical stance",
  "same expression every time",
  "same hand placement",
  "blank mannequin posture",
  "stiff studio pose",
  "same lens feel",
  "same crop rhythm",
  "same styling read",
  "same location blocking",
  "same mood every time",
  "editorial clone shot",
  "catalog pose repetition",
  "stock photo energy",
  "editorial fashion look",
  "fashion shoot pose",
  "editorial makeup",
  "beauty campaign styling",
  "overly cinematic lighting",
  "surreal contrast",
  "exaggerated glamour",
  "stylized face symmetry",
  "over-retouched face",
  "wax skin",
  "ai beauty filter look",
  ...REFERENCE_REALISM_NEGATIVE_ANCHORS,
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
  "franchise character",
  "copyrighted character",
  "anime style mimic",
  "manga style mimic",
  "disney style mimic",
  "pixar style mimic",
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
  "eye distance drift",
  "jawline drift",
  "nose shape drift",
  "lip shape drift",
  "silhouette drift",
  "outfit overwhelms face identity",
];

export const REALISTIC_QUALITY_BLOCK: string[] = [
  ...REFERENCE_REALISM_POSITIVE_ANCHORS,
  "natural realistic lifestyle photo",
  "clean anatomy",
  "natural skin texture",
  "sharp eyes",
  "detailed hair strands",
  "bright natural realistic lighting",
  "real-camera photo quality",
  "practical light from believable windows or room fixtures",
  "simple realistic composition",
  "photorealistic adult subject",
  "coherent face structure",
  "balanced facial proportions",
  "consistent body proportions",
  "real person proportions",
  "clear subject separation",
  "grounded facial realism",
  "believable lens perspective",
  "credible skin and body rendering",
  "clean facial identity retention",
  "non-stylized realistic photo finish",
  "natural upper-body or full-body framing",
  "daylight or practical indoor photo realism",
  "high-clarity photo detail",
  "lively natural color separation",
  "healthy skin tone rendering",
  "believable room and fabric detail",
  "soft flattering but realistic facial light",
  "simple lived-in background with believable depth",
  "no heavy editorial grading or glossy glamour polish",
];

export const REALISTIC_STYLE_BLOCK: string[] = [
  "photorealistic",
  "adult subject",
  "realistic skin detail",
  "natural photo realism",
  "authentic lifestyle image",
  "natural indoor lifestyle photography with real-camera warmth",
  "soft flattering realism instead of glossy studio glamour",
  "grounded everyday realism instead of editorial fashion styling",
];

export const OUTPUT_TYPE_BLOCKS: Record<CharacterOutputType, string[]> = {
  upper_body: [
    "upper-body framing only",
    "show stomach line, torso, waist, and upper hips clearly",
    "face and body are both readable",
    "clear chest, waist, and outfit visibility",
    "avoid face-only crop",
    "body-readable upper-body composition with natural pose clarity",
  ],
  portrait: [
    "upper-body framing only",
    "show stomach line, torso, waist, and upper hips clearly",
    "face and body are both readable",
    "clear chest, waist, and outfit visibility",
    "avoid face-only crop",
    "body-readable upper-body composition with natural pose clarity",
  ],
  selfie: [
    "selfie composition",
    "natural handheld framing",
    "close camera perspective",
    "personal candid energy",
    "arm-length phone perspective",
    "candid realism without face warp",
  ],
  full_body: [
    "full body composition",
    "head-to-toe framing",
    "clean leg visibility",
    "balanced standing proportions",
    "full silhouette readability",
    "full-body identity coherence from face to feet",
  ],
};

export function getStyleBaseBlock(styleType: CharacterStyleType): string[] {
  void styleType;
  return REALISTIC_STYLE_BLOCK;
}

export function getQualityBlock(styleType: CharacterStyleType): string[] {
  void styleType;
  return REALISTIC_QUALITY_BLOCK;
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
