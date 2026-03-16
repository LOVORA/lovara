export type CharacterStyleType = "realistic" | "anime";
export type CharacterBuilderMode = "preset" | "custom_prompt";

export type CharacterBuilderStep =
  | "style"
  | "mode"
  | "identity"
  | "face"
  | "hair"
  | "body"
  | "vibe"
  | "outfit"
  | "scene"
  | "prompt"
  | "locks"
  | "review";

export type CharacterAgeBand = "18-20" | "21-24" | "25-29" | "30-39" | "40+";
export type CharacterOutputType = "portrait" | "selfie" | "full_body";
export type CharacterConsistencyMode = "none" | "seed_only" | "reference_guided";
export type CharacterConsistencyStrength = "strict" | "soft";

export type CharacterGenerationStatus =
  | "idle"
  | "generating"
  | "success"
  | "error";

export type CharacterPublishingVisibility = "private" | "public";

export type CharacterPresetCore = {
  ageBand: CharacterAgeBand | "";
  region: string;
  skinTone: string;
  genderPresentation: string;
};

export type CharacterPresetFace = {
  eyeColor: string;
  eyeShape: string;
  faceShape: string;
  lipStyle: string;
  noseType: string;
  makeupLevel: string;
};

export type CharacterPresetHair = {
  hairColor: string;
  hairLength: string;
  hairTexture: string;
  hairstyle: string;
};

export type CharacterPresetBody = {
  bodyType: string;
  bustSize: string;
  hipsType: string;
  heightImpression: string;
  waistDefinition: string;
};

export type CharacterPresetVibe = {
  mainVibe: string;
  energy: string;
  personaFlavor: string;
};

export type CharacterPresetOutfit = {
  outfitType: string;
  outfitColor: string;
  exposureLevel: string;
};

export type CharacterPresetScene = {
  sceneType: string;
  cameraFraming: string;
  lightingType: string;
  poseEnergy: string;
  expression: string;
  realismStrength: string;
  detailLevel: string;
  variationGoal: string;
};

export type CharacterPresetSelections = {
  core: CharacterPresetCore;
  face: CharacterPresetFace;
  hair: CharacterPresetHair;
  body: CharacterPresetBody;
  vibe: CharacterPresetVibe;
  outfit: CharacterPresetOutfit;
  scene: CharacterPresetScene;
};

export type CharacterCustomPromptLocks = {
  ageBand: CharacterAgeBand | "";
  region: string;
  eyeColor: string;
  hairColor: string;
};

export type CharacterCustomPromptState = {
  promptText: string;
  helperStyle: CharacterStyleType | "";
  helperOutputType: CharacterOutputType | "";
  helperVibe: string;
  locks: CharacterCustomPromptLocks;
};

export type CharacterGenerationCandidate = {
  tempId: string;
  imageUrl: string;
  seed: number | null;
  promptUsed: string | null;
  negativePromptUsed: string | null;
  width?: number | null;
  height?: number | null;
  model?: string | null;
  provider?: string | null;
};

export type CharacterGenerationState = {
  status: CharacterGenerationStatus;
  provider: "runware";
  selectedModel: string | null;
  candidates: CharacterGenerationCandidate[];
  selectedCandidateId: string | null;
  primaryReferenceImageUrl: string | null;
  errorMessage: string | null;
};

export type CharacterPublishingState = {
  name: string;
  visibility: CharacterPublishingVisibility;
  publicTagline: string;
  publicTeaser: string;
  publicTags: string[];
};

export type CharacterFlowState = {
  styleType: CharacterStyleType | null;
  builderMode: CharacterBuilderMode;
  currentStep: CharacterBuilderStep;
};

export type CharacterBuilderState = {
  flow: CharacterFlowState;
  preset: CharacterPresetSelections;
  customPrompt: CharacterCustomPromptState;
  generation: CharacterGenerationState;
  publishing: CharacterPublishingState;
};

export type HiddenPromptEnginePresetSelections = {
  ageBand?: CharacterAgeBand | "";
  region?: string;
  skinTone?: string;
  genderPresentation?: string;

  eyeColor?: string;
  eyeShape?: string;
  faceShape?: string;
  lipStyle?: string;
  noseType?: string;
  makeupLevel?: string;

  hairColor?: string;
  hairLength?: string;
  hairTexture?: string;
  hairstyle?: string;

  bodyType?: string;
  bustSize?: string;
  hipsType?: string;
  heightImpression?: string;
  waistDefinition?: string;

  mainVibe?: string;
  energy?: string;
  personaFlavor?: string;

  outfitType?: string;
  outfitColor?: string;
  exposureLevel?: string;

  sceneType?: string;
  cameraFraming?: string;
  lightingType?: string;
  poseEnergy?: string;
  expression?: string;
  realismStrength?: string;
  detailLevel?: string;
  variationGoal?: string;
};

export type HiddenPromptEngineCustomPrompt = {
  promptText: string;
  helperOutputType?: CharacterOutputType | "";
  helperVibe?: string;
  locks?: Partial<CharacterCustomPromptLocks>;
};

export type HiddenPromptEngineInput = {
  styleType: CharacterStyleType;
  builderMode: CharacterBuilderMode;
  presetSelections?: HiddenPromptEnginePresetSelections;
  customPrompt?: HiddenPromptEngineCustomPrompt;
};

export type PromptEngineModerationFlags = {
  needsBlock: boolean;
  reasons: string[];
};

export type PromptEngineGenerationHints = {
  outputType: CharacterOutputType;
  consistencyMode: CharacterConsistencyMode;
  safetyMode: "strict";
};

export type PromptEngineIdentityLock = {
  immutableTokens: string[];
  mutableTokens: string[];
};

export type PromptEngineOutput = {
  promptSummary: string;
  canonicalPrompt: string;
  negativePrompt: string;
  moderationFlags: PromptEngineModerationFlags;
  generationHints: PromptEngineGenerationHints;
  identityLock: PromptEngineIdentityLock;
};

export type CharacterBuilderValidationIssue = {
  field: string;
  message: string;
};

export type CharacterBuilderDerivedState = {
  readinessScore: number;
  validationIssues: CharacterBuilderValidationIssue[];
  canGenerate: boolean;
  canPublish: boolean;
  identitySummary: string[];
  visualSummary: string[];
};

export type CharacterVisualProfileInsert = {
  style_type: CharacterStyleType | null;
  age_band: CharacterAgeBand | null;
  region: string | null;
  skin_tone: string | null;
  gender_presentation: string | null;

  eye_color: string | null;
  eye_shape: string | null;
  face_shape: string | null;
  lip_style: string | null;
  nose_type: string | null;
  makeup_level: string | null;

  hair_color: string | null;
  hair_length: string | null;
  hair_texture: string | null;
  hairstyle: string | null;

  body_type: string | null;
  bust_size: string | null;
  hips_type: string | null;
  height_impression: string | null;
  waist_definition: string | null;

  main_vibe: string | null;
  energy: string | null;
  persona_flavor: string | null;

  outfit_type: string | null;
  outfit_color: string | null;
  exposure_level: string | null;

  scene_type: string | null;
  camera_framing: string | null;
  lighting_type: string | null;
  pose_energy: string | null;
  expression: string | null;
  realism_strength: string | null;
  detail_level: string | null;
  variation_goal: string | null;
};

export type CharacterPromptProfileInsert = {
  raw_user_prompt: string | null;
  canonical_prompt: string;
  negative_prompt: string;
  prompt_summary: string | null;
  prompt_version: string | null;
  model_preference: string | null;
  provider_preference: string | null;
  is_locked: boolean;
};

export type CharacterImageJobInsert = {
  provider: string;
  model: string | null;
  styleType: CharacterStyleType | null;
  requestMode: CharacterBuilderMode;
  promptInputJson: Record<string, unknown>;
  canonicalPrompt: string;
  negativePrompt: string;
  seed: number | null;
  referenceImageIds: string[];
  variationType: string | null;
};

export type CharacterImageInsert = {
  imageType: "avatar" | "reference" | "variation" | "gallery";
  variantKind: "base" | "outfit" | "selfie" | "pose" | "location" | "full_body" | null;
  imageUrl: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  seed: number | null;
  modelUsed: string | null;
  providerUsed: string | null;
  promptSnapshot: string | null;
  negativePromptSnapshot: string | null;
  isPrimary: boolean;
  isReference: boolean;
};

export type CharacterBuilderAction =
  | { type: "SET_STYLE_TYPE"; payload: CharacterStyleType }
  | { type: "SET_BUILDER_MODE"; payload: CharacterBuilderMode }
  | { type: "GO_TO_STEP"; payload: CharacterBuilderStep }
  | {
      type: "UPDATE_PRESET_SECTION";
      section: keyof CharacterPresetSelections;
      payload: Record<string, string>;
    }
  | {
      type: "UPDATE_CUSTOM_PROMPT";
      payload: Partial<CharacterCustomPromptState>;
    }
  | {
      type: "UPDATE_CUSTOM_PROMPT_LOCKS";
      payload: Partial<CharacterCustomPromptLocks>;
    }
  | {
      type: "SET_GENERATION_STATUS";
      payload: CharacterGenerationStatus;
    }
  | {
      type: "SET_GENERATION_RESULTS";
      payload: CharacterGenerationCandidate[];
    }
  | {
      type: "SELECT_GENERATED_CANDIDATE";
      payload: string;
    }
  | {
      type: "SET_PRIMARY_REFERENCE";
      payload: string | null;
    }
  | {
      type: "SET_GENERATION_ERROR";
      payload: string | null;
    }
  | {
      type: "UPDATE_PUBLISHING";
      payload: Partial<CharacterPublishingState>;
    }
  | {
      type: "RESET_BUILDER";
    };

export const EMPTY_PRESET_SELECTIONS: CharacterPresetSelections = {
  core: {
    ageBand: "",
    region: "",
    skinTone: "",
    genderPresentation: "",
  },
  face: {
    eyeColor: "",
    eyeShape: "",
    faceShape: "",
    lipStyle: "",
    noseType: "",
    makeupLevel: "",
  },
  hair: {
    hairColor: "",
    hairLength: "",
    hairTexture: "",
    hairstyle: "",
  },
  body: {
    bodyType: "",
    bustSize: "",
    hipsType: "",
    heightImpression: "",
    waistDefinition: "",
  },
  vibe: {
    mainVibe: "",
    energy: "",
    personaFlavor: "",
  },
  outfit: {
    outfitType: "",
    outfitColor: "",
    exposureLevel: "",
  },
  scene: {
    sceneType: "",
    cameraFraming: "",
    lightingType: "",
    poseEnergy: "",
    expression: "",
    realismStrength: "",
    detailLevel: "",
    variationGoal: "",
  },
};

export const EMPTY_CUSTOM_PROMPT_STATE: CharacterCustomPromptState = {
  promptText: "",
  helperStyle: "",
  helperOutputType: "",
  helperVibe: "",
  locks: {
    ageBand: "",
    region: "",
    eyeColor: "",
    hairColor: "",
  },
};

export const EMPTY_GENERATION_STATE: CharacterGenerationState = {
  status: "idle",
  provider: "runware",
  selectedModel: null,
  candidates: [],
  selectedCandidateId: null,
  primaryReferenceImageUrl: null,
  errorMessage: null,
};

export const EMPTY_PUBLISHING_STATE: CharacterPublishingState = {
  name: "",
  visibility: "private",
  publicTagline: "",
  publicTeaser: "",
  publicTags: [],
};

export const INITIAL_CHARACTER_BUILDER_STATE: CharacterBuilderState = {
  flow: {
    styleType: null,
    builderMode: "preset",
    currentStep: "style",
  },
  preset: EMPTY_PRESET_SELECTIONS,
  customPrompt: EMPTY_CUSTOM_PROMPT_STATE,
  generation: EMPTY_GENERATION_STATE,
  publishing: EMPTY_PUBLISHING_STATE,
};
