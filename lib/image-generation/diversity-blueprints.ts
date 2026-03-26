import type {
  CharacterOutputType,
  HiddenPromptEngineInput,
} from "@/lib/character-builder/types";
import type {
  PromptEngineOutputLike,
  VariationLockContract,
} from "@/lib/image-generation/types";
import {
  REFERENCE_REALISM_NEGATIVE_ANCHORS,
  REFERENCE_REALISM_POSITIVE_ANCHORS,
  normalizeActiveOutputType,
} from "@/lib/create-character/reference-realism";

export type DiversityPromptVariant = {
  label: string;
  variantKind: "pose" | "location" | "selfie" | "outfit" | "full_body";
  positiveDelta: string;
  negativeDelta: string;
  seed: number;
};

type DiversityContext = {
  outputType: CharacterOutputType;
  identityKey: string;
  styleType: string;
  profession: string;
  personaFlavor: string;
  outfit: string;
  environment: string;
  backgroundIntent: string;
  outfitIntent: string;
  lighting: string;
  expression: string;
  pose: string;
  variationGoal: string;
  accessoryVibe: string;
  signatureDetail: string;
  nudityMode: "covered" | "implied_nude" | "true_nude";
  faceBias: "neutral" | "soft_feminine";
  bodyReadPriority: "standard" | "high";
  consistencyLocked: boolean;
  beautyBias: boolean;
  happyBias: boolean;
};

const UPPER_BODY_FRAMINGS = [
  "upper-body three-quarter framing with stomach line visible",
  "standing upper-body frame with torso clearly visible",
  "seated upper-body frame with waist and torso visible",
  "leaning upper-body frame with clear body angle",
  "over-shoulder upper-body turn with torso readability",
  "mid-body framing with clear chest and waist visibility",
  "standing mid-shot with off-center framing",
  "upper-body composition with visible torso and outfit read",
];

const SELFIE_FRAMINGS = [
  "mirror selfie crop with torso visible",
  "arm-length candid selfie composition",
  "casual bathroom mirror selfie crop",
  "bedside selfie framing with upper torso",
  "elevator mirror selfie angle",
  "window-lit handheld selfie crop",
  "off-duty lounge selfie framing",
  "late-night phone selfie angle",
];

const FULL_BODY_FRAMINGS = [
  "head-to-toe full-body frame",
  "full silhouette walking frame",
  "full-body doorway composition",
  "standing full-body realistic frame",
  "stairs or corridor full-body shot",
  "leaning full-body stance with negative space",
  "weight-shift full-body pose",
  "full-body city or interior lifestyle frame",
];

const CAMERA_ANGLES = [
  "eye-level camera with natural intimacy",
  "slight high-angle flattering perspective",
  "slight low-angle confidence framing",
  "three-quarter camera angle",
  "off-axis natural composition",
  "soft side angle with depth",
  "cropped asymmetrical camera placement",
  "natural camera offset with breathing room",
];

const GAZE_VARIATIONS = [
  "direct eye contact",
  "side glance with held attention",
  "looking away before turning back",
  "downward glance with lifted eyes",
  "camera-aware stare with restraint",
  "soft distracted gaze",
  "half-challenging eye contact",
  "caught-in-motion glance",
];

const HAND_ACTIONS = [
  "one hand brushing hair or neckline",
  "one hand resting near jaw or lips",
  "one hand holding phone, glass, or fabric edge",
  "hands relaxed with asymmetry",
  "one hand in pocket or at hip",
  "one hand touching accessory or strap",
  "one hand on waist or thigh",
  "gesture frozen mid-adjustment",
];

const BODY_ORIENTATIONS = [
  "turned shoulders instead of straight-on symmetry",
  "subtle hip shift and relaxed torso angle",
  "leaning lightly against a surface",
  "walking or mid-step posture",
  "seated twist through waist and shoulders",
  "weight on one leg with clean silhouette curve",
  "half-turned body with face returning to camera",
  "open posture with offset stance",
];

const STAGING_BEATS = [
  "private candid moment",
  "between-movements realism",
  "lived-in room energy",
  "natural indoor pause",
  "working-day moment with believable context",
  "soft street-side candid beat",
  "warm after-hours atmosphere",
  "window-lit everyday stillness",
];

const COMPOSITION_CHOICES = [
  "off-center composition",
  "depth-rich foreground and background separation",
  "clean negative space around silhouette",
  "layered composition with environment depth",
  "clean candid frame balance",
  "natural subject isolation",
  "asymmetrical crop with visual tension",
  "composed like a realistic lifestyle photo",
];

const MOTION_BEATS = [
  "mid-motion realism",
  "caught adjusting posture",
  "hair or fabric movement hint",
  "micro-pause before moving again",
  "stillness with tension in the body",
  "step, turn, or lean frozen naturally",
  "breath-held still frame",
  "settling into the pose rather than holding a mannequin pose",
];

const ENVIRONMENT_ACCENTS = [
  "window light and interior depth",
  "real apartment or home depth",
  "office or desk-side spatial depth",
  "street or sidewalk depth",
  "gym or training-room realism",
  "cafe or restaurant interior texture",
  "hallway or doorway geometry",
  "soft domestic scene realism",
];

const LIGHTING_ACCENTS = [
  "soft directional daylight with shape",
  "warm practical indoor light",
  "clean window-lit skin and eye definition",
  "balanced room light with believable shadows",
  "late-day natural light through real windows",
  "subtle mixed light from a realistic interior",
  "soft outdoor overcast light",
  "clean practical light with no glossy studio feel",
];

const EXPRESSION_ACCENTS = [
  "micro-smirk instead of a flat smile",
  "composed neutral with charged eyes",
  "soft parted-lips realism",
  "subtle challenge in the face",
  "private softness that is not fully given away",
  "caught-thought expression",
  "half-amused restraint",
  "emotionally readable but not exaggerated expression",
];

const STYLE_ACCENTS = [
  "outfit and silhouette styled as a coherent look",
  "accessories used as a focal accent",
  "fabric texture and lines kept readable",
  "wardrobe layered with believable everyday logic",
  "styling built around shape and movement",
  "clean styling separation from background",
  "signature detail made visible without dominating the frame",
  "clean natural polish without plastic perfection",
];

const LENS_FEELS = [
  "real upper-body lens compression",
  "clean natural lens separation",
  "slight candid lens intimacy",
  "soft depth from a real camera",
  "subtle lifestyle-photo lens falloff",
  "phone-camera realism without distortion",
  "balanced DSLR-style depth",
  "depth-rich full-frame feel",
];

const COLOR_SCRIPTS = [
  "soft warm neutrals with skin-first color harmony",
  "soft cool daylight contrast with clean skin readability",
  "warm indoor palette with believable skin warmth",
  "neutral apartment tones with natural skin balance",
  "street-side muted palette with clear subject separation",
  "gentle gym or studio tones with clean skin color",
  "clean daylight ivory palette",
  "wood, fabric, and practical interior tones",
  "natural modern color palette without editorial grading",
];

const MICRO_STORIES = [
  "caught between two thoughts",
  "arriving a second before the room is ready",
  "half-turning after hearing your voice",
  "settling into her own space with quiet certainty",
  "holding eye contact like she already knows the direction of the moment",
  "looking like the scene started before the camera found her",
  "carrying private after-hours energy",
  "moving like she belongs to the frame",
];

const PORTRAIT_ACTIONS = [
  "chin slightly lifted with a composed pause",
  "fingers resting near collarbone or neckline",
  "turning back toward camera after a half-step",
  "one shoulder leading the frame with relaxed control",
  "leaning into frame as if caught mid-thought",
  "adjusting jewelry, strap, or hair with natural timing",
];

const SELFIE_ACTIONS = [
  "phone held naturally with believable mirror rhythm",
  "caught mid-adjustment in a candid selfie beat",
  "leaning into the mirror with off-duty confidence",
  "softly shifting weight while holding the phone",
  "one hand framing the shot while the body stays relaxed",
  "casual intimate selfie body language instead of a rigid front pose",
];

const FULL_BODY_ACTIONS = [
  "walking, turning, or settling into the stance instead of standing frozen",
  "using one leg as the weight anchor with readable shape",
  "interacting with the space like a realistic lifestyle photo",
  "one hand creating a clean silhouette line at waist, thigh, or hip",
  "body arranged to read as a full look instead of a mannequin pose",
  "caught mid-shift with graceful leg and shoulder alignment",
];

const LOCATION_STORIES = [
  "real apartment interior with layered depth",
  "soft morning window scene with lived-in realism",
  "casual office or desk-side interior",
  "street or sidewalk scene with grounded depth",
  "gym or studio environment with natural space",
  "cafe or restaurant interior with believable background blur",
  "home hallway or doorway moment",
  "quiet room stillness with realistic depth",
];

const OUTFIT_STORIES = [
  "clean fitted styling with believable fabric fall",
  "soft lounge look with natural fabric behavior",
  "body-conscious styling with realistic materials",
  "off-duty wardrobe with grounded casual energy",
  "practical outfit styling with clear silhouette lines",
  "simple layered styling built around one focal piece",
  "casual styling with polished but realistic details",
  "wardrobe logic that reads as a real outfit instead of costume styling",
];

const BEAUTY_FACE_ACCENTS = [
  "beautiful face with balanced adult features",
  "attractive natural face with soft symmetry",
  "clear pretty facial structure with believable realism",
  "charming face with bright eyes and flattering proportions",
  "photogenic natural beauty without plastic perfection",
  "clean elegant facial harmony with realistic texture",
  "beautiful adult woman with readable facial warmth",
  "naturally striking face with soft flattering realism",
];

const HAPPY_FACE_ACCENTS = [
  "warm happy expression",
  "soft smile with bright eyes",
  "gentle cheerful face",
  "friendly happy vibe in the expression",
  "subtle joyful expression with natural warmth",
  "light smile and emotionally open face",
  "pleasant upbeat mood in the eyes and mouth",
  "soft happy energy without exaggerated grin",
];

const SOFT_FEMININE_FACE_ACCENTS = [
  "soft feminine adult face",
  "smooth facial transitions with a gentle jawline",
  "feminine cheek and eye area with realistic beauty bias",
  "pretty realistic adult face without harsh angular structure",
];

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}

function pick<T>(items: T[], seed: number, offset: number) {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty diversity pool.");
  }

  return items[(seed + offset) % items.length]!;
}

function compactParts(parts: Array<string | null | undefined | false>) {
  const seen = new Set<string>();

  return parts
    .map((part) => clean(typeof part === "string" ? part : ""))
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildIdentityKey(
  input: HiddenPromptEngineInput,
  promptEngineOutput: PromptEngineOutputLike,
) {
  const preset = input.presetSelections;
  const custom = input.customPrompt;

  return compactParts([
    promptEngineOutput.promptSummary,
    ...(Array.isArray(promptEngineOutput.identityLock?.immutableTokens)
      ? promptEngineOutput.identityLock?.immutableTokens.map((item) =>
          typeof item === "string" ? item : "",
        )
      : []),
    preset?.region,
    preset?.skinTone,
    preset?.eyeColor,
    preset?.hairColor,
    preset?.hairstyle,
    preset?.bodyType,
    preset?.mainVibe,
    preset?.personaFlavor,
    preset?.outfitType,
    preset?.sceneType,
    custom?.promptText,
    custom?.helperVibe,
  ]).join(" | ");
}

function resolveOutputType(
  promptEngineOutput: PromptEngineOutputLike,
): CharacterOutputType {
  return normalizeActiveOutputType(
    promptEngineOutput.generationHints?.outputType as CharacterOutputType | null,
  );
}

function buildInitialContext(
  input: HiddenPromptEngineInput,
  promptEngineOutput: PromptEngineOutputLike,
  baseSeed?: number | null,
): DiversityContext {
  const preset = input.presetSelections;
  const custom = input.customPrompt;

  return {
    outputType: resolveOutputType(promptEngineOutput),
    identityKey: [
      buildIdentityKey(input, promptEngineOutput),
      typeof baseSeed === "number" ? String(baseSeed) : "",
    ]
      .filter(Boolean)
      .join(" | "),
    styleType: input.styleType,
    profession: clean(preset?.profession),
    personaFlavor: clean(preset?.personaFlavor) || clean(custom?.helperVibe),
    outfit: clean(preset?.outfitType),
    environment: clean(preset?.sceneType),
    backgroundIntent: clean(preset?.backgroundIntent),
    outfitIntent: clean(preset?.outfitIntent),
    lighting: clean(preset?.lightingType),
    expression: clean(preset?.expression),
    pose: clean(preset?.poseEnergy),
    variationGoal: clean(preset?.variationGoal),
    accessoryVibe: clean(custom?.helperVibe),
    signatureDetail: "",
    nudityMode: preset?.nudityMode ?? "covered",
    faceBias: preset?.faceBias ?? "neutral",
    bodyReadPriority: preset?.bodyReadPriority ?? "standard",
    consistencyLocked: false,
    beautyBias: true,
    happyBias: true,
  };
}

function buildVariationContext(args: {
  characterId: string;
  styleType: string;
  basePrompt: string;
  variationPromptDelta: string;
  variationLockContract?: VariationLockContract | null;
  outputType: CharacterOutputType;
  consistencyLocked: boolean;
  baseSeed?: number | null;
}) {
  const loweredDelta = clean(args.variationPromptDelta).toLowerCase();
  const contract = args.variationLockContract;

  return {
    outputType: args.outputType,
    identityKey: [
      args.characterId,
      args.basePrompt,
      args.variationPromptDelta,
      typeof args.baseSeed === "number" ? String(args.baseSeed) : "",
    ]
      .filter(Boolean)
      .join(" | "),
    styleType: args.styleType,
    profession: clean(contract?.profession),
    personaFlavor: "",
    outfit: clean(contract?.outfit),
    environment: "",
    backgroundIntent: clean(contract?.backgroundIntent),
    outfitIntent: clean(contract?.outfitIntent),
    lighting: "",
    expression: "",
    pose: "",
    variationGoal: clean(args.variationPromptDelta),
    accessoryVibe: "",
    signatureDetail: "",
    nudityMode: contract?.nudityMode ?? (loweredDelta.includes("implied nude")
      ? "implied_nude"
      : loweredDelta.includes("true nude") ||
          loweredDelta.includes("fully nude") ||
          loweredDelta.includes("no bra") ||
          loweredDelta.includes("unclothed")
        ? "true_nude"
        : "covered"),
    faceBias: contract?.faceBias ?? (loweredDelta.includes("soft feminine") ||
      loweredDelta.includes("gentle jawline")
      ? "soft_feminine"
      : "neutral"),
    bodyReadPriority: contract?.bodyReadPriority ?? (
      loweredDelta.includes("readable torso") ||
      loweredDelta.includes("readable chest") ||
      loweredDelta.includes("upper-body framing") ||
      loweredDelta.includes("full-body")
        ? "high"
        : "standard"),
    consistencyLocked: args.consistencyLocked,
    beautyBias: false,
    happyBias: false,
  } satisfies DiversityContext;
}

function getFramingPool(outputType: CharacterOutputType) {
  if (outputType === "selfie") return SELFIE_FRAMINGS;
  if (outputType === "full_body") return FULL_BODY_FRAMINGS;
  return UPPER_BODY_FRAMINGS;
}

function getVariantKind(outputType: CharacterOutputType, index: number) {
  if (outputType === "selfie") return "selfie" as const;
  if (outputType === "full_body") return index % 2 === 0 ? ("full_body" as const) : ("location" as const);
  return index % 2 === 0 ? ("pose" as const) : ("outfit" as const);
}

function pickActionPool(outputType: CharacterOutputType) {
  if (outputType === "selfie") return SELFIE_ACTIONS;
  if (outputType === "full_body") return FULL_BODY_ACTIONS;
  return PORTRAIT_ACTIONS;
}

function buildPositiveDelta(context: DiversityContext, index: number) {
  const seed = hashString(`${context.identityKey}|${context.outputType}|${index}`);
  const framing = pick(getFramingPool(context.outputType), seed, 3);
  const angle = pick(CAMERA_ANGLES, seed, 11);
  const gaze = pick(GAZE_VARIATIONS, seed, 19);
  const hands = pick(HAND_ACTIONS, seed, 29);
  const body = pick(BODY_ORIENTATIONS, seed, 37);
  const staging = pick(STAGING_BEATS, seed, 43);
  const composition = pick(COMPOSITION_CHOICES, seed, 53);
  const motion = pick(MOTION_BEATS, seed, 61);
  const environment = pick(ENVIRONMENT_ACCENTS, seed, 71);
  const lighting = pick(LIGHTING_ACCENTS, seed, 79);
  const expression = pick(EXPRESSION_ACCENTS, seed, 89);
  const style = pick(STYLE_ACCENTS, seed, 97);
  const action = pick(pickActionPool(context.outputType), seed, 107);
  const locationStory = pick(LOCATION_STORIES, seed, 113);
  const outfitStory = pick(OUTFIT_STORIES, seed, 127);
  const beautyFace = pick(BEAUTY_FACE_ACCENTS, seed, 173);
  const happyFace = pick(HAPPY_FACE_ACCENTS, seed, 181);
  const softFeminineFace = pick(SOFT_FEMININE_FACE_ACCENTS, seed, 191);
  const lensFeel = pick(LENS_FEELS, seed, 131);
  const colorScript = pick(COLOR_SCRIPTS, seed, 149);
  const microStory = pick(MICRO_STORIES, seed, 167);

  const label = compactParts([
    framing,
    angle,
    gaze,
  ])
    .slice(0, 2)
    .join(" / ");

  const positiveDelta = compactParts([
    `variant composition plan ${index + 1}`,
    ...REFERENCE_REALISM_POSITIVE_ANCHORS,
    "realistic natural lifestyle photo",
    framing,
    angle,
    gaze,
    hands,
    body,
    staging,
    composition,
    motion,
    action,
    lensFeel,
    colorScript,
    microStory,
    context.beautyBias ? beautyFace : "",
    context.happyBias ? happyFace : "",
    context.faceBias === "soft_feminine" ? softFeminineFace : "",
    context.backgroundIntent
      ? `background intent: ${context.backgroundIntent}`
      : context.environment
        ? `environment influence: ${context.environment}`
        : `${environment}, ${locationStory}`,
    context.profession
      ? `profession cue must stay readable: ${context.profession}`
      : "",
    context.outfitIntent
      ? `wardrobe intent: ${context.outfitIntent}`
      : `${style}, ${outfitStory}`,
    context.lighting ? `lighting influence: ${context.lighting}` : lighting,
    context.expression ? `expression influence: ${context.expression}` : expression,
    context.outfit
      ? `wardrobe influence: ${context.outfit}`
      : context.consistencyLocked
        ? "preserve the same selected wardrobe and styling"
        : `${style}, ${outfitStory}`,
    context.nudityMode === "implied_nude"
      ? "implied nude read only, keep strategic natural white lower-body coverage and avoid full reveal"
      : "",
    context.accessoryVibe ? `accessory accent: ${context.accessoryVibe}` : "",
    context.signatureDetail ? `keep signature detail visible: ${context.signatureDetail}` : "",
    context.pose ? `pose influence: ${context.pose}` : "",
    context.personaFlavor ? `persona flavor visible in body language: ${context.personaFlavor}` : "",
    context.variationGoal ? `variation goal emphasis: ${context.variationGoal}` : "",
    context.bodyReadPriority === "high"
      ? "keep torso, waist, hips, and outfit/body read clearly visible in frame"
      : "",
    "natural indoor or practical daylight look with believable room scale",
    "avoid glossy editorial polish and keep the scene grounded",
    context.consistencyLocked
      ? "same character identity, alternate shot of the same woman, allow new pose and composition while preserving face and body identity"
      : "fresh composition, new body language, clear pose variation, avoid repeated framing, keep the image grounded and realistic",
    context.outputType === "full_body"
      ? "full silhouette must read clearly with distinct leg and torso arrangement"
      : "",
    context.outputType === "selfie"
      ? "credible phone-camera realism with personal candid asymmetry"
      : "",
  ]).join(", ");

  const negativeDelta = compactParts([
    ...REFERENCE_REALISM_NEGATIVE_ANCHORS,
    "same front-facing pose",
    "static centered composition",
    "passport photo pose",
    "rigid symmetrical shoulders",
    "identical direct gaze",
    "same hand placement",
    "blank mannequin stance",
    "repeated composition",
    "reused pose energy",
    "same body orientation",
    "same eye line",
    "same shoulder angle",
    "same camera distance",
    "same wardrobe read",
    context.profession ? "wrong profession cue" : "",
    context.backgroundIntent ? "wrong background logic" : "",
    context.consistencyLocked ? "different outfit" : "",
    context.consistencyLocked ? "wardrobe change" : "",
    context.nudityMode === "implied_nude" ? "full nude reveal" : "",
    context.nudityMode === "implied_nude" ? "explicit genital reveal" : "",
    context.nudityMode === "implied_nude" ? "digital censor block" : "",
    context.consistencyLocked ? "wrong bust size" : "",
    context.consistencyLocked ? "changed chest proportions" : "",
    context.consistencyLocked ? "wrong breast shape" : "",
    context.faceBias === "soft_feminine" ? "masculine facial structure" : "",
    context.faceBias === "soft_feminine" ? "hard jawline" : "",
    context.faceBias === "soft_feminine" ? "harsh brow ridge" : "",
    context.bodyReadPriority === "high" ? "hidden torso silhouette" : "",
    "uncanny facial texture",
    "plastic skin sheen",
    "same environment read",
    "same lens feel",
    "same color script",
    "same micro-story beat",
    context.outputType === "selfie" ? "same mirror angle every time" : "",
    context.outputType === "full_body" ? "straight stiff standing pose" : "",
    context.consistencyLocked ? "identity drift while changing pose" : "",
  ]).join(", ");

  return {
    label,
    variantKind: getVariantKind(context.outputType, index),
    positiveDelta,
    negativeDelta,
    seed: (seed % 2147483000) + 101,
  } satisfies DiversityPromptVariant;
}

export function buildInitialDiversityVariants(args: {
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutputLike;
  candidateCount: number;
  baseSeed?: number | null;
}) {
  const context = buildInitialContext(
    args.hiddenPromptInput,
    args.promptEngineOutput,
    args.baseSeed ?? null,
  );
  return Array.from({ length: Math.max(1, args.candidateCount) }, (_, index) =>
    buildPositiveDelta(context, index),
  );
}

export function buildVariationDiversityVariants(args: {
  characterId: string;
  styleType: string;
  basePrompt: string;
  variationPromptDelta: string;
  variationLockContract?: VariationLockContract | null;
  outputType: CharacterOutputType;
  candidateCount: number;
  consistencyLocked: boolean;
  baseSeed?: number | null;
}) {
  const context = buildVariationContext({
    characterId: args.characterId,
    styleType: args.styleType,
    basePrompt: args.basePrompt,
    variationPromptDelta: args.variationPromptDelta,
    variationLockContract: args.variationLockContract ?? null,
    outputType: args.outputType,
    consistencyLocked: args.consistencyLocked,
    baseSeed: args.baseSeed ?? null,
  });

  return Array.from({ length: Math.max(1, args.candidateCount) }, (_, index) =>
    buildPositiveDelta(context, index),
  );
}
