import type { CharacterOutputType } from "@/lib/character-builder/types";

export type AvatarPoseFamily =
  | "standing_relaxed"
  | "standing_confident"
  | "hands_on_hips"
  | "over_shoulder_turn"
  | "walking_glance"
  | "leaning_wall"
  | "seated_chair"
  | "seated_crossed_legs"
  | "couch_lounge"
  | "bed_edge_sit"
  | "kneeling_upright"
  | "floor_sit";

export type AvatarFramingBias = "upper_body" | "full_body";
export type AvatarBodyVisibility = "upper_body" | "full_body";
export type AvatarPoseUsage = "create" | "fresh" | "studio";

export type AvatarPosePreset = {
  id: string;
  family: AvatarPoseFamily;
  variant: "soft" | "confident" | "body_forward";
  label: string;
  posePrompt: string;
  framingBias: AvatarFramingBias;
  bodyVisibility: AvatarBodyVisibility;
  outfitReadPriority: "low" | "medium" | "high";
  avoidPortraitCrop: boolean;
  allowedForCreate: boolean;
  allowedForFresh: boolean;
  allowedForStudio: boolean;
  camera: string;
  photoPack: string;
  outputType: CharacterOutputType;
  bodyLinePrompt: string;
};

type PoseFamilyTemplate = {
  family: AvatarPoseFamily;
  label: string;
  shortPrompt: string;
  assetId: string;
};

const FAMILY_TEMPLATES: PoseFamilyTemplate[] = [
  {
    family: "standing_relaxed",
    label: "Standing Relaxed",
    shortPrompt: "relaxed standing pose with natural weight shift",
    assetId: "standing",
  },
  {
    family: "standing_confident",
    label: "Standing Confident",
    shortPrompt: "confident standing pose with open posture",
    assetId: "standing",
  },
  {
    family: "hands_on_hips",
    label: "Hands on Hips",
    shortPrompt: "hands-on-hips pose with clean waist and hip line",
    assetId: "standing",
  },
  {
    family: "over_shoulder_turn",
    label: "Over-Shoulder Turn",
    shortPrompt: "over-shoulder turn with visible body angle",
    assetId: "mirror",
  },
  {
    family: "walking_glance",
    label: "Walking Glance",
    shortPrompt: "walking glance pose captured mid-step",
    assetId: "walking",
  },
  {
    family: "leaning_wall",
    label: "Leaning Wall",
    shortPrompt: "leaning wall pose with relaxed asymmetry",
    assetId: "wall",
  },
  {
    family: "seated_chair",
    label: "Seated Chair",
    shortPrompt: "seated chair pose with readable torso and legs",
    assetId: "chair",
  },
  {
    family: "seated_crossed_legs",
    label: "Seated Crossed Legs",
    shortPrompt: "crossed-legs seated pose with elegant body line",
    assetId: "chair",
  },
  {
    family: "couch_lounge",
    label: "Couch Lounge",
    shortPrompt: "couch lounge pose with soft relaxed body line",
    assetId: "couch",
  },
  {
    family: "bed_edge_sit",
    label: "Bed Edge Sit",
    shortPrompt: "bed-edge sitting pose with visible torso and thighs",
    assetId: "bed",
  },
  {
    family: "kneeling_upright",
    label: "Kneeling Upright",
    shortPrompt: "upright kneeling pose with clear torso posture",
    assetId: "kneeling",
  },
  {
    family: "floor_sit",
    label: "Floor Sit",
    shortPrompt: "floor-sit pose with readable leg arrangement",
    assetId: "floor",
  },
];

const VARIANT_CONFIG: Array<{
  variant: AvatarPosePreset["variant"];
  framingBias: AvatarFramingBias;
  bodyVisibility: AvatarBodyVisibility;
  outfitReadPriority: AvatarPosePreset["outfitReadPriority"];
  avoidPortraitCrop: boolean;
  camera: string;
  photoPack: string;
  outputType: CharacterOutputType;
  bodyLinePrompt: string;
  promptSuffix: string;
}> = [
  {
    variant: "soft",
    framingBias: "upper_body",
    bodyVisibility: "upper_body",
    outfitReadPriority: "medium",
    avoidPortraitCrop: true,
    camera: "body-readable upper-body framing with visible waist and hip line",
    photoPack: "upper-body lifestyle frame with visible torso and waist",
    outputType: "upper_body",
    bodyLinePrompt: "show torso, waist, stomach line, chest, and upper hips with clear body readability",
    promptSuffix: "soft body language, natural relaxed energy",
  },
  {
    variant: "confident",
    framingBias: "upper_body",
    bodyVisibility: "upper_body",
    outfitReadPriority: "medium",
    avoidPortraitCrop: true,
    camera: "body-readable upper-body confident framing with visible waist and hips",
    photoPack: "upper-body realistic frame with visible torso and waist",
    outputType: "upper_body",
    bodyLinePrompt: "show torso, waist, chest, stomach line, and hip angle with confident posture",
    promptSuffix: "confident pose energy, visible body angle",
  },
  {
    variant: "body_forward",
    framingBias: "full_body",
    bodyVisibility: "full_body",
    outfitReadPriority: "high",
    avoidPortraitCrop: true,
    camera: "full body lifestyle framing",
    photoPack: "full body lifestyle portraits",
    outputType: "full_body",
    bodyLinePrompt: "show full silhouette, legs, hips, chest, and outfit read clearly",
    promptSuffix: "body-forward composition, clear silhouette and leg line",
  },
];

export const AVATAR_POSE_PRESETS: AvatarPosePreset[] = FAMILY_TEMPLATES.flatMap(
  (family) =>
    VARIANT_CONFIG.map((variantConfig, index) => ({
      id: `${family.family}-${index + 1}`,
      family: family.family,
      variant: variantConfig.variant,
      label: `${family.label} ${index + 1}`,
      posePrompt: `${family.shortPrompt}, ${variantConfig.promptSuffix}`,
      framingBias: variantConfig.framingBias,
      bodyVisibility: variantConfig.bodyVisibility,
      outfitReadPriority: variantConfig.outfitReadPriority,
      avoidPortraitCrop: variantConfig.avoidPortraitCrop,
      allowedForCreate: true,
      allowedForFresh: true,
      allowedForStudio: true,
      camera: variantConfig.camera,
      photoPack: variantConfig.photoPack,
      outputType: variantConfig.outputType,
      bodyLinePrompt: variantConfig.bodyLinePrompt,
    })),
);

export function getAvatarPosePresetsForUsage(usage: AvatarPoseUsage) {
  const presets = AVATAR_POSE_PRESETS.filter((preset) =>
    usage === "create"
      ? preset.allowedForCreate
      : usage === "fresh"
        ? preset.allowedForFresh
        : preset.allowedForStudio,
  );

  if (usage !== "create" && usage !== "fresh") {
    return presets;
  }

  const defaultPresets = presets.filter((preset) => preset.framingBias === "upper_body");
  const pool = defaultPresets.length > 0 ? defaultPresets : presets;

  return pool.flatMap((preset) => (usage === "create" ? [preset] : [preset, preset]));
}

export function findAvatarPosePreset(id: string | null | undefined) {
  if (!id) return null;
  return AVATAR_POSE_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function getRandomAvatarPosePreset(args?: {
  usage?: AvatarPoseUsage;
  excludeFamily?: AvatarPoseFamily | null;
  excludeFramingBias?: AvatarFramingBias | null;
  seed?: number | null;
}) {
  const usage = args?.usage ?? "create";
  const presets = getAvatarPosePresetsForUsage(usage);
  const filtered =
    presets.filter((preset) => {
      if (args?.excludeFamily && preset.family === args.excludeFamily) return false;
      if (args?.excludeFramingBias && preset.framingBias === args.excludeFramingBias) {
        return false;
      }
      return true;
    }) || [];

  const pool = filtered.length > 0 ? filtered : presets;
  const rawSeed =
    typeof args?.seed === "number" && Number.isFinite(args.seed)
      ? Math.abs(args.seed)
      : Math.floor(Math.random() * 2_000_000_000);
  const index = rawSeed % pool.length;

  return pool[index] ?? presets[0]!;
}

function studioThumb(family: AvatarPoseFamily) {
  switch (family) {
    case "standing_relaxed":
    case "standing_confident":
    case "hands_on_hips":
      return "everyday/standing.svg";
    case "over_shoulder_turn":
      return "everyday/mirror.svg";
    case "walking_glance":
      return "everyday/window.svg";
    case "leaning_wall":
      return "everyday/balcony.svg";
    case "seated_chair":
    case "seated_crossed_legs":
      return "everyday/chair.svg";
    case "couch_lounge":
      return "everyday/chair.svg";
    case "bed_edge_sit":
      return "everyday/bed.svg";
    case "kneeling_upright":
      return "everyday/kneeling.svg";
    case "floor_sit":
      return "everyday/bed.svg";
    default:
      return "everyday/standing.svg";
  }
}

export function getAvatarPoseStudioThumbnailSrc(family: AvatarPoseFamily) {
  return `/photo-studio/poses/${studioThumb(family)}`;
}
