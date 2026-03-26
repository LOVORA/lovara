import type {
  CharacterImagePromptInput,
  GeneratedImageCandidate,
} from "@/lib/image-generation/types";
import type { PosePromptContract } from "@/lib/create-character/pose-prompt-contract";

export type PhotoPoseCategory = "normal" | "adult";
export type PhotoStudioMode = "normal" | "adult";
export type AdultExposureMode = "bikini" | "naked";

export type PhotoPosePreset = {
  id: string;
  category: PhotoPoseCategory;
  poseDistance?: "near" | "far";
  seedPolicy?: "required" | "light" | "off";
  seedStrength?: number | null;
  title: string;
  shortLabel: string;
  vibe: string;
  bodyLanguage: string;
  compositionIntent: string;
  cropDiscipline: string;
  bodyLinePriority: string;
  gazeDirection: string;
  handLanguage: string;
  lightingCharacter: string;
  roomRead: string;
  variationBias: string[];
  camera: string;
  lightingMood: string;
  photoPack: string;
  expression: string;
  thumbnailSrc: string;
  thumbnailAlt: string;
  thumbnailFocus?: string;
  thumbnailStyle: string;
};

export type PhotoOutfitPreset = {
  id: string;
  title: string;
  category: PhotoPoseCategory;
  description: string;
  outfit: string;
  exposureLevel: string;
  compositionIntent: string;
  cropDiscipline: string;
  bodyLinePriority: string;
  gazeDirection: string;
  handLanguage: string;
  lightingCharacter: string;
  roomRead: string;
  variationBias: string[];
  palette?: string;
  accessoryVibe?: string;
  makeupStyle?: string;
  thumbnailSrc: string;
  thumbnailAlt: string;
  thumbnailFocus?: string;
  thumbnailStyle: string;
};

export type PhotoEnvironmentPreset = {
  id: string;
  title: string;
  description: string;
  environment: string;
  lightingMood?: string;
  compositionIntent: string;
  cropDiscipline: string;
  bodyLinePriority: string;
  gazeDirection: string;
  handLanguage: string;
  lightingCharacter: string;
  roomRead: string;
  variationBias: string[];
  thumbnailSrc: string;
  thumbnailAlt: string;
  thumbnailFocus?: string;
  thumbnailStyle: string;
};

export type ImageStudioFormState = {
  studioMode: PhotoStudioMode;
  poseCategory: PhotoPoseCategory;
  backgroundPreset: string;
  posePreset: string;
  outfitPreset: string | null;
  adultExposure: AdultExposureMode;
};

export type ImageStudioOverrides = Partial<ImageStudioFormState>;

export type PhotoStudioSelectionCompilerOutput = {
  form: ImageStudioFormState;
  posePreset: PhotoPosePreset;
  outfitPreset: PhotoOutfitPreset | null;
  environmentPreset: PhotoEnvironmentPreset;
  promptInput: CharacterImagePromptInput;
  selectionSummary: string[];
  poseSummary: string;
  outfitSummary: string;
  backgroundSummary: string;
  shotSummary: string;
  shotReason: string;
  customPosePrompt: string;
  poseContract: PosePromptContract;
  selectionVersion: string;
  previewLabels: Array<{
    id: "hero" | "closer_crop" | "room_forward" | "alt_body_line";
    title: string;
    description: string;
  }>;
  shotRecipe: {
    compositionIntent: string;
    cropDiscipline: string;
    bodyLinePriority: string;
    gazeDirection: string;
    handLanguage: string;
    lightingCharacter: string;
    roomRead: string;
    variationBias: string[];
  };
};

export type PhotoStudioCharacterSource = {
  kind: "built-in" | "custom";
  sourceLabel?: "professional" | "community" | "my_character";
  characterId: string;
  characterSlug: string;
  characterName: string;
  baseImageUrl: string | null;
  latestGalleryImageUrl: string | null;
  promptInput: CharacterImagePromptInput;
  collectionHref: string;
  backHref: string;
  backLabel: string;
  quickLinks?: Array<{
    id: string;
    label: string;
    href: string;
    active?: boolean;
    subtitle?: string;
  }>;
};

export type PhotoStudioPreviewCandidate = GeneratedImageCandidate;
