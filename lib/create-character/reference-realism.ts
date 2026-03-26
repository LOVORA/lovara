import type { CharacterOutputType } from "@/lib/character-builder/types";

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function includesAny(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}

export const REFERENCE_REALISM_POSITIVE_ANCHORS = [
  "reference-style natural realistic photo",
  "soft flattering but realistic skin texture",
  "natural indoor daylight or practical room light",
  "believable room scale with lived-in depth",
  "real-camera feel with balanced warmth and contrast",
  "simple natural background without glossy studio polish",
] as const;

export const REFERENCE_REALISM_NEGATIVE_ANCHORS = [
  "editorial fashion look",
  "cinematic grading",
  "glossy beauty filter look",
  "wax skin",
  "cgi skin",
  "plastic skin sheen",
  "fake background blur",
  "unreal room scale",
  "staged glamour studio lighting",
] as const;

export function normalizeActiveOutputType(
  value?: CharacterOutputType | string | null,
): Exclude<CharacterOutputType, "portrait"> {
  const normalized = clean(value);
  const lowered = normalized.toLowerCase();

  if (lowered === "selfie") return "selfie";
  if (lowered === "full_body" || includesAny(lowered, ["full body", "full-body"])) {
    return "full_body";
  }

  return "upper_body";
}

export function normalizeReferenceAvatarStyle(value?: string | null) {
  const normalized = clean(value);
  if (!normalized) return "reference-style natural realism";

  const lowered = normalized.toLowerCase();

  if (includesAny(lowered, ["editorial", "cinematic", "luxury portrait", "luxury upper-body frame"])) {
    return "reference-style natural realism";
  }
  if (includesAny(lowered, ["soft natural", "natural"])) {
    return "soft natural realism";
  }
  if (includesAny(lowered, ["romantic glow", "warm"])) {
    return "warm natural realism";
  }
  if (includesAny(lowered, ["dark moody", "moody"])) {
    return "natural low-light realism";
  }
  if (includesAny(lowered, ["studio"])) {
    return "clean indoor realism";
  }
  if (includesAny(lowered, ["glamour", "portrait", "upper-body frame"])) {
    return "soft flattering natural realism";
  }

  return normalized;
}

export function normalizeReferenceCamera(value?: string | null) {
  const normalized = clean(value);
  if (!normalized) {
    return "body-readable upper-body framing with visible stomach line, waist, and upper hips";
  }

  const lowered = normalized.toLowerCase();

  if (includesAny(lowered, ["full body"])) {
    return "full body lifestyle framing";
  }
  if (
    includesAny(lowered, [
      "close-up",
      "waist-up",
      "portrait",
      "front-facing",
      "upper-body",
      "over-the-shoulder",
      "mirror",
      "candid",
      "three-quarter",
    ])
  ) {
    return "body-readable upper-body framing with visible stomach line, waist, and upper hips";
  }

  return "body-readable upper-body framing with visible stomach line, waist, and upper hips";
}

export function normalizeReferenceLightingMood(value?: string | null) {
  const normalized = clean(value);
  if (!normalized) return "soft daylight or clean practical indoor light";

  const lowered = normalized.toLowerCase();

  if (includesAny(lowered, ["window"])) return "soft window daylight";
  if (includesAny(lowered, ["golden"])) return "warm natural daylight";
  if (includesAny(lowered, ["studio flash", "clean luxury"])) {
    return "soft daylight or clean practical indoor light";
  }
  if (includesAny(lowered, ["lamp", "moody"])) return "warm practical indoor light";
  if (includesAny(lowered, ["neon"])) return "natural evening interior light";
  if (includesAny(lowered, ["ambient"])) return "bright practical indoor ambient light";
  if (includesAny(lowered, ["daylight"])) return "clean daylight";

  return normalized;
}

export function normalizeReferencePhotoPack(value?: string | null) {
  const normalized = clean(value);
  if (!normalized) return "natural lifestyle portraits";

  const lowered = normalized.toLowerCase();

  if (includesAny(lowered, ["luxury portraits", "luxury"])) {
    return "natural lifestyle portraits";
  }
  if (includesAny(lowered, ["mirror"])) {
    return "casual mirror lifestyle portraits";
  }
  if (includesAny(lowered, ["daily lifestyle"])) {
    return "everyday lifestyle portraits";
  }
  if (includesAny(lowered, ["romantic candid"])) {
    return "warm candid lifestyle portraits";
  }
  if (includesAny(lowered, ["night-out"])) {
    return "realistic indoor lifestyle portraits";
  }
  if (includesAny(lowered, ["soft home", "home portrait", "home upper-body frame"])) {
    return "soft home lifestyle portraits";
  }
  if (includesAny(lowered, ["daylight portrait", "daylight upper-body frame"])) {
    return "daylight lifestyle portraits";
  }
  if (includesAny(lowered, ["lifestyle motion"])) {
    return "movement-led lifestyle portraits";
  }

  return normalized;
}
