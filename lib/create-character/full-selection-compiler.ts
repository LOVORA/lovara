import type { CharacterAgeBand } from "@/lib/character-builder/types";
import {
  buildChoiceWeightingDirectiveLines,
  deriveBehaviorChoiceProfile,
  deriveLifeStageProfile,
  deriveVisualChoiceProfile,
  normalizeAdultAgeValue,
  type BehaviorChoiceProfile,
  type ChoiceWeightingInput,
  type LifeStageProfile,
  type VisualChoiceProfile,
} from "@/lib/create-character/choice-weighting";
import { readStructuredNotes, type StudioStructuredNoteMap } from "@/lib/create-character/studio-notes";
import {
  buildScenarioQuestionDiscipline,
  buildScenarioTruthDirectives,
  deriveScenarioTruthProfile,
  type ScenarioTruthProfile,
} from "@/lib/chat/scenario-truth";
import type { SelectionPromptContract } from "@/lib/create-character/selection-prompt-contract";
import { buildRelationshipRoleGuidance } from "@/lib/create-character/deep-prompting";
import {
  ACCESSORY_VIBE_OPTIONS,
  AVATAR_STYLE_OPTIONS,
  BODY_TYPE_OPTIONS,
  BREAST_TYPE_OPTIONS,
  BUST_SIZE_OPTIONS,
  BUTT_SIZE_OPTIONS,
  CAMERA_OPTIONS,
  EYE_OPTIONS,
  EYE_SHAPE_OPTIONS,
  EXPOSURE_LEVEL_OPTIONS,
  HAIR_OPTIONS,
  HAIR_TEXTURE_OPTIONS,
  HEIGHT_IMPRESSION_OPTIONS,
  HIP_SHAPE_OPTIONS,
  LIGHTING_MOOD_OPTIONS,
  MAKEUP_STYLE_OPTIONS,
  OUTFIT_OPTIONS,
  PALETTE_OPTIONS,
  PHOTO_PACK_OPTIONS,
  SKIN_TONE_OPTIONS,
  VISUAL_AURA_OPTIONS,
  WAIST_DEFINITION_OPTIONS,
} from "@/lib/create-character/studio-editor";

export const FULL_SELECTION_COMPILER_VERSION = "full_selection_compiler_v1" as const;

type StructuredNotesInput = Record<string, string> | Partial<StudioStructuredNoteMap>;

export type SelectionCompilerInput = {
  name?: string;
  ageValue?: number | null;
  ageBand?: CharacterAgeBand | "";
  region?: string;
  archetype?: string;
  genderPresentation?: string;
  coreVibes?: string[];
  warmth?: number | null;
  assertiveness?: number | null;
  mystery?: number | null;
  playfulness?: number | null;
  replyLength?: string;
  speechStyle?: string;
  relationshipPace?: string;
  setting?: string;
  relationshipToUser?: string;
  sceneGoal?: string;
  tone?: string;
  openingState?: string;
  customScenario?: string;
  structuredNotes?: StructuredNotesInput;
};

export type StudioSelectionCompilerSource = {
  name: string;
  age: string;
  region: string;
  archetype: string;
  genderPresentation: string;
  coreVibes: string[];
  warmth: number;
  assertiveness: number;
  mystery: number;
  playfulness: number;
  replyLength: string;
  speechStyle: string;
  relationshipPace: string;
  setting: string;
  relationshipToUser: string;
  sceneGoal: string;
  tone: string;
  openingState: string;
  customScenario: string;
  customNotes: string;
};

export type CustomCharacterSelectionCompilerSource = {
  name: string;
  archetype?: string | null;
  headline?: string | null;
  scenario?: {
    setting?: string | null;
    relationshipToUser?: string | null;
    sceneGoal?: string | null;
    tone?: string | null;
    openingState?: string | null;
  } | null;
  payload?: Record<string, unknown> | null;
};

export type CompiledPromptSections = {
  coreIdentityContract: string[];
  lifeStageAndSocialMaturityContract: string[];
  relationshipAndPermissionContract: string[];
  behaviorAndConflictContract: string[];
  voiceAndCadenceContract: string[];
  scenarioAndOpeningContract: string[];
  memoryAnchorsAndContinuityContract: string[];
  visualConstitutionContract: string[];
  negativeDriftGuardrails: string[];
};

export type VisualConstitutionProfile = {
  visualAnchors: string[];
  imagePromptAdditions: string[];
  identityLockAdditions: string[];
  negativeGuardrails: string[];
};

export type CharacterConstitutionProfile = {
  version: typeof FULL_SELECTION_COMPILER_VERSION;
  identityAnchors: string[];
  relationshipAnchors: string[];
  behaviorAnchors: string[];
  voiceAnchors: string[];
  sceneAnchors: string[];
  memoryAnchors: string[];
  visualAnchors: string[];
  negativeGuardrails: string[];
  initiativePattern: string;
  sceneLeadership: string;
  questionDiscipline: string;
  conflictBehavior: string;
  affectionStyle: string;
  paceOfWarmth: string;
  repairStyle: string;
  boundaryRhythm: string;
  privateThoughtStyle: string;
};

export type RoleplayCharacterContract = {
  relationshipType: string[];
  relationshipDynamic: string[];
  identityAndVisualAnchors: string[];
  relationshipRoleContract: string[];
  traitBehaviorContract: string[];
  scenarioTruthContract: string[];
  openingStyleContract: string[];
  intimacyAndPacingContract: string[];
  initiativeProfile: string[];
  questionDiscipline: string[];
  memoryPriorityContract: string[];
  progressionContract: string[];
  sessionTuningOverlay: string[];
  recognitionHeuristics: string[];
  openingBias: string[];
  scenarioEscalationRules: string[];
  roleSpecificMemoryHooks: string[];
  promptSummary: string[];
};

export type SelectionOptionDescriptor = {
  field: string;
  value: string;
  displayLabel: string;
  positivePromptAnchors: string[];
  identityLockAnchors: string[];
  negativeGuardrails: string[];
  compatibilityTags: string[];
  referenceImageKey?: string;
  referenceTagSet?: string[];
};

export type VisualPromptCompileResult = {
  positiveIdentity: string[];
  positiveFace: string[];
  positiveHair: string[];
  positiveBody: string[];
  positiveWardrobe: string[];
  positivePhotoLanguage: string[];
  negativeDrift: string[];
  referenceHints: string[];
  hiddenSectionPrompts: string[];
  masterVisualPrompt: string[];
  selectedDescriptors: SelectionOptionDescriptor[];
  promptSummary: string[];
};

export type RoleplayPromptCompileResult = {
  relationshipTruth: string[];
  userPlaceInWorld: string[];
  emotionalEngine: string[];
  sceneEngine: string[];
  sceneDepth: string[];
  voiceEngine: string[];
  eroticDisposition: string[];
  memoryAndContinuity: string[];
  openingSummary: string[];
  openingBeat: string[];
  openingDiscipline: string[];
  firstGreeting: string[];
  firstPressureMove: string[];
  recognizedUserMode: string[];
  canonicalOpeningMode: string[];
  promptSummary: string[];
};

export type SelectionCompilerOutput = {
  version: typeof FULL_SELECTION_COMPILER_VERSION;
  choiceWeightingInput: ChoiceWeightingInput;
  lifeStageProfile: LifeStageProfile;
  behaviorChoiceProfile: BehaviorChoiceProfile;
  visualChoiceProfile: VisualChoiceProfile;
  scenarioTruthProfile: ScenarioTruthProfile;
  constitutionProfile: CharacterConstitutionProfile;
  compiledPromptSections: CompiledPromptSections;
  memorySeedAnchors: {
    identity: string[];
    behavior: string[];
    scenario: string[];
  };
  openingSignals: {
    initiativePattern: string;
    conflictBehavior: string;
    affectionStyle: string;
    paceOfWarmth: string;
  };
  visualConstitutionProfile: VisualConstitutionProfile;
  selectionPromptContract: SelectionPromptContract;
  roleplayCharacterContract: RoleplayCharacterContract;
  visualPromptCompileResult: VisualPromptCompileResult;
  roleplayPromptCompileResult: RoleplayPromptCompileResult;
};

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function lower(value?: string | null) {
  return clean(value).toLowerCase();
}

function cleanUnknown(value: unknown) {
  return typeof value === "string" ? clean(value) : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function compactLines(parts: Array<string | null | undefined | false>) {
  const seen = new Set<string>();

  return parts
    .map((part) => clean(typeof part === "string" ? part : ""))
    .filter(Boolean)
    .filter((part) => {
      const lowered = part.toLowerCase();
      if (seen.has(lowered)) return false;
      seen.add(lowered);
      return true;
    });
}

function clampMeter(value: number | null | undefined, fallback = 50) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readNote(
  notes: StructuredNotesInput | undefined,
  key: keyof StudioStructuredNoteMap,
) {
  return clean(notes?.[key]);
}

function parseAdultAge(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 25;
  return Math.max(18, Math.min(70, parsed));
}

function buildRegionVisualDirectives(region: string) {
  const value = clean(region).toLowerCase();
  if (!value) return [] as string[];

  if (["arab", "middle eastern", "middle-eastern"].includes(value)) {
    return [
      "regional read should carry deeper eye set, defined brows, richer dark-hair tendency, and warm olive-to-deeper undertone realism without costume shorthand",
      "facial structure should feel region-true through eye depth, nose bridge character, cheek structure, and hair density",
      "the regional read should be visible at a glance instead of flattening into a generic glamour face",
    ];
  }
  if (["asian", "east asian", "east-asian"].includes(value)) {
    return [
      "regional read should carry East-Asian facial plane realism, darker straighter hair tendency, and eye-area shape that stays culturally legible without exaggeration",
      "preserve region-true facial harmony through brow bone softness, eye set, cheek plane, and skin rendering",
      "the regional read should stay visible at a glance rather than dissolving into generic sameface beauty",
    ];
  }
  if (["south asian", "south-asian", "indian"].includes(value)) {
    return [
      "regional read should carry South-Asian facial harmony, richer hair density, warmer undertone realism, and stronger eye-area depth without caricature",
      "facial identity should stay believable through nose, lips, cheek line, and skin-tone richness",
    ];
  }
  if (["southeast asian", "southeast-asian"].includes(value)) {
    return [
      "regional read should carry Southeast-Asian facial harmony, warm undertones, and region-true eye and cheek structure without flattening into a generic face",
      "hair, skin, and face planes should feel native to the selected regional identity",
    ];
  }
  if (["black", "african"].includes(value)) {
    return [
      "regional read should preserve deeper tonal richness, stronger undertone depth, and believable hair density or texture without washout",
      "facial structure should feel culturally legible through lips, nose, cheekbone presence, and skin richness rather than stereotype",
      "do not lighten, wash out, or genericize the selected regional facial read",
    ];
  }
  if (["latina", "latin"].includes(value)) {
    return [
      "regional read should preserve lived Latina or Latin texture through facial warmth, darker-hair tendency, warm undertones, and socially believable styling",
      "face should feel region-true through cheek line, brow read, eye depth, and skin harmony without costume cues",
    ];
  }
  if (["mediterranean"].includes(value)) {
    return [
      "regional read should preserve Mediterranean warmth through undertone, dark-hair tendency, facial definition, and eye depth",
      "cheekbone, nose, brow, and skin rendering should feel region-true and lived-in",
    ];
  }
  if (["slavic"].includes(value)) {
    return [
      "regional read should preserve Slavic facial structure through cheek plane, eye set, skin rendering, and hair read without turning generic",
      "facial harmony should remain region-legible and adult rather than doll-like",
    ];
  }
  if (["nordic", "white"].includes(value)) {
    return [
      "regional read should preserve Nordic or lighter-feature facial harmony through skin rendering, bone structure, and eye-area clarity",
      "avoid generic influencer sameface; keep the regional facial structure distinct and believable",
    ];
  }
  if (["mixed", "global"].includes(value)) {
    return [
      "regional identity should feel coherent and specific rather than washed into a generic face",
      "blended or global texture should still preserve a strong, believable ethnic read through skin, hair, and facial structure",
    ];
  }

  return [
    `${clean(region)} should remain culturally legible through face, skin, hair, and overall lived-in realism`,
  ];
}

function buildSkinToneDirectives(skinTone: string) {
  const tone = clean(skinTone);
  if (!tone) return [] as string[];
  return [
    `selected skin tone must stay exact across face, neck, chest, stomach, hips, and legs: ${tone}`,
    "skin undertone must remain stable under the chosen lighting instead of washing out or shifting to a different complexion",
    "keep face-body skin consistency and believable tonal depth across all visible skin",
    "do not let highlights, grading, or beauty smoothing erase the selected complexion",
  ];
}

function buildOutfitDetailDirectives(outfit: string) {
  const value = clean(outfit).toLowerCase();
  if (!value) return [] as string[];

  switch (value) {
    case "old-money chic":
      return [
        "wardrobe should read as old-money chic with polished tailoring, expensive-looking fabric, restrained accessories, and a clean upper-class silhouette",
        "keep the outfit elegant, fitted where needed, and body-readable without drifting into costume styling",
      ];
    case "black dress elegance":
      return [
        "wardrobe should read as an elegant black dress with refined evening fabric, a body-skimming fit, visible waist shaping, and adult sensual polish",
        "the black dress should keep chest, torso, waist, hips, and lower-body silhouette readable instead of hiding them",
        "camera and pose must still preserve a visible body read through the outfit",
      ];
    case "street-luxury fit":
      return [
        "wardrobe should read as luxury streetwear with premium material, fitted structure, expensive casual styling, and deliberate silhouette control",
        "keep the outfit current, sharp, and body-aware without turning sloppy or generic athleisure",
      ];
    case "oversized hoodie comfort":
      return [
        "wardrobe should read as an oversized hoodie with soft heavyweight fabric, relaxed drape, believable folds, and cozy adult styling",
        "even with relaxed coverage, the frame should still preserve a readable torso and body line",
      ];
    case "tailored office look":
      return [
        "wardrobe should read as a tailored office look with structured fit, clean lapels or seams, polished adult professionalism, and sharp controlled lines",
        "the outfit should keep waist and posture readable while staying office-credible and not costume-like",
      ];
    case "sporty fitted look":
      return [
        "wardrobe should read as fitted sporty wear with technical fabric, body-aware athletic fit, and active realistic styling",
        "the silhouette should stay clean, toned, and visibly body-readable",
      ];
    case "artsy layered fashion":
      return [
        "wardrobe should read as artsy layered fashion with mixed textures, intentional layering, visual depth, and a curated creative silhouette",
        "layers should still preserve the selected body read instead of flattening the frame",
      ];
    case "soft knitwear intimacy":
      return [
        "wardrobe should read as soft knitwear with tactile fabric, cozy close-to-body fit, gentle drape, and intimate adult softness",
        "the knitwear should stay realistic, flattering, and waist-aware instead of boxy and shapeless",
      ];
    default:
      return [`wardrobe class should stay exact and visibly recognizable: ${clean(outfit)}`];
  }
}

function buildBustSizeDirectives(bustSize: string) {
  const value = clean(bustSize).toLowerCase();
  if (!value) return [] as string[];
  if (value === "very full" || value === "xl") {
    return [
      "chest read must be unmistakably very large with strong upper-body volume, projection, and visual dominance",
      "pose, crop, and wardrobe must not flatten or reduce the selected very large chest size",
    ];
  }
  if (value === "full" || value === "large") {
    return [
      "chest read must be clearly large with obvious upper-body fullness and visible torso projection",
    ];
  }
  return [`chest read must remain visibly faithful to the selected size: ${clean(bustSize)}`];
}

function buildButtSizeDirectives(buttSize: string) {
  const value = clean(buttSize).toLowerCase();
  if (!value) return [] as string[];
  if (value === "very full") {
    return [
      "lower-body read must be unmistakably very full with strong butt volume, projection, and visible hip-to-glute fullness",
      "pose, crop, and outfit must not flatten the selected very full lower-body size",
    ];
  }
  if (value === "full" || value === "big") {
    return [
      "lower-body read must stay clearly full with obvious volume and visible silhouette impact",
    ];
  }
  return [`lower-body volume must remain visibly faithful to the selected size: ${clean(buttSize)}`];
}

function buildAgeRealismDirectives(ageValue?: number | null) {
  if (typeof ageValue !== "number" || !Number.isFinite(ageValue)) return [] as string[];
  if (ageValue >= 60) {
    return [
      `render a clearly older adult around ${ageValue} with visible fine lines, settled facial structure, believable skin density, mature neck and hand detail, and no beauty-filter de-aging`,
      "do not collapse this subject into a 20s or early-30s glamour face",
    ];
  }
  if (ageValue >= 50) {
    return [
      `render a visibly older adult around ${ageValue} with mature facial realism, under-eye maturity, natural mouth-area lines, and clearly settled adult skin texture`,
      "do not erase the selected age through over-smoothing, glamour retouching, or younger facial drift",
    ];
  }
  if (ageValue >= 40) {
    return [
      `render a mature adult around ${ageValue} with believable fine lines, settled facial planes, and non-plastic skin texture`,
    ];
  }
  if (ageValue >= 30) {
    return [
      `render a mature adult around ${ageValue} with subtle fine lines, clearer facial definition, and age-appropriate polish`,
    ];
  }
  return [`render a believable adult around ${ageValue} with an age-faithful face and body read`];
}

function joinNoteValues(parts: Array<string | null | undefined | false>) {
  return compactLines(parts).join(", ");
}

function splitCsv(value?: string | null) {
  return clean(value)
    .split(",")
    .map((item) => clean(item))
    .filter(Boolean);
}

function buildConflictNegativeGuardrails(
  selected: string,
  options: readonly string[],
  labels: Partial<Record<string, string>> = {},
) {
  const active = clean(selected);
  if (!active) return [];

  return options
    .filter((option) => option !== active)
    .slice(0, 3)
    .map((option) => `avoid ${labels[option] ?? option.toLowerCase()} drift`);
}

function makeVisualDescriptor(
  field: string,
  value: string,
  config: {
    positivePromptAnchors: string[];
    identityLockAnchors?: string[];
    negativeGuardrails?: string[];
    compatibilityTags?: string[];
    referenceImageKey?: string;
    referenceTagSet?: string[];
  },
): SelectionOptionDescriptor | null {
  const normalizedValue = clean(value);
  if (!normalizedValue) return null;

  return {
    field,
    value: normalizedValue,
    displayLabel: normalizedValue,
    positivePromptAnchors: compactLines(config.positivePromptAnchors),
    identityLockAnchors: compactLines(config.identityLockAnchors ?? []),
    negativeGuardrails: compactLines(config.negativeGuardrails ?? []),
    compatibilityTags: compactLines(config.compatibilityTags ?? []),
    referenceImageKey: clean(config.referenceImageKey),
    referenceTagSet: compactLines(config.referenceTagSet ?? []),
  };
}

function inferRecognitionMode(
  relationship: string,
  userRole: string,
  stage: string,
) {
  const combined = [relationship, userRole, stage]
    .map((value) => clean(value).toLowerCase())
    .filter(Boolean)
    .join(" | ");
  if (
    /(ex|girlfriend|boyfriend|wife|husband|partner|best friend|boss|teacher|neighbor|roommate|co-worker|coworker|step|üvey|rival)/.test(
      combined,
    )
  ) {
    return "already_knows_user";
  }
  if (/(stranger|first meeting|new attraction|met tonight|unknown|just met)/.test(combined)) {
    return "does_not_know_user_yet";
  }
  return "ambiguous_but_likely_knows";
}

function buildSceneDepthLines(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
) {
  const setting = clean(input.setting);
  const sceneType = readNote(notes, "Scene type");
  const sceneGoal = clean(input.sceneGoal);
  const tone = clean(input.tone);
  const openingState = clean(input.openingState);
  const customScenario = clean(input.customScenario);
  const sensoryPalette = readNote(notes, "Sensory palette");
  const attentionHook = readNote(notes, "Attention hook");
  const sceneFocus = readNote(notes, "Scene focus");
  const relationshipDynamic = readNote(notes, "Relationship dynamic");

  return compactLines([
    setting ? `Active location reality: the scene is physically happening in ${setting}, and the character should notice details that belong there.` : null,
    customScenario
      ? `Offscreen context: this exact scene setup is already true before the next reply begins: ${customScenario}.`
      : null,
    sceneType
      ? `Current social risk and interaction frame should feel native to this scene type: ${sceneType}.`
      : null,
    tone ? `Emotional weather of the room: ${tone}.` : null,
    openingState ? `Immediate physical and emotional carryover: ${openingState}.` : null,
    sensoryPalette ? `Scene texture should repeatedly draw from this sensory palette: ${sensoryPalette}.` : null,
    attentionHook
      ? `The character's attention should keep circling this trigger first: ${attentionHook}.`
      : null,
    sceneFocus
      ? `What the character notices first should stay biased toward this scene focus: ${sceneFocus}.`
      : null,
    sceneGoal
      ? `What the character wants from this exact moment: move the scene toward ${sceneGoal}.`
      : null,
    relationshipDynamic
      ? `Physical proximity, verbal pressure, and hesitation should feel believable inside this bond: ${relationshipDynamic}.`
      : null,
  ]);
}

function buildEroticDispositionLines(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
  behaviorChoice: BehaviorChoiceProfile,
) {
  const relationship = lower(input.relationshipToUser);
  const dynamic = lower(readNote(notes, "Relationship dynamic"));
  const stage = lower(readNote(notes, "Relationship stage"));
  const behaviorMode = lower(readNote(notes, "Behavior mode"));
  const affectionStyle = lower(readNote(notes, "Affection style"));
  const emotionalAvailability = lower(readNote(notes, "Emotional availability"));
  const chemistryTemplate = lower(readNote(notes, "Chemistry template"));
  const jealousy = Number.parseInt(readNote(notes, "Jealousy"), 10);
  const attachment = Number.parseInt(readNote(notes, "Attachment"), 10);
  const protectiveness = Number.parseInt(readNote(notes, "Protectiveness"), 10);
  const warmth = clampMeter(input.warmth);
  const assertiveness = clampMeter(input.assertiveness);
  const mystery = clampMeter(input.mystery);
  const playfulness = clampMeter(input.playfulness);
  const coreVibes = (input.coreVibes ?? []).map(lower).join(" | ");

  let openness = "moderate";
  if (
    /(stranger|first meeting|new attraction)/.test(`${relationship} ${stage}`) ||
    /(guarded|slow burn|emotionally unavailable)/.test(
      `${dynamic} ${behaviorMode} ${emotionalAvailability} ${coreVibes}`,
    )
  ) {
    openness = "slow-to-open";
  }
  if (
    /(ex|lover|partner|wife|husband|obsessed|dominant|forbidden)/.test(
      `${relationship} ${dynamic} ${chemistryTemplate} ${coreVibes}`,
    ) &&
    assertiveness >= 55
  ) {
    openness = "warm-to-eager";
  }

  const refusalStyle =
    openness === "slow-to-open"
      ? "decline or delay through believable restraint, not generic safety language"
      : /(dominant|obsessed|protective|jealous)/.test(`${dynamic} ${coreVibes}`)
        ? "resist through possessive tension, controlled teasing, or redirecting the pressure"
        : "accept selectively, deflect selectively, and keep the move role-true";

  return compactLines([
    "Erotic and mature behavior must stay fully consensual, adult, and role-true.",
    `Baseline erotic openness for this character should read as ${openness}.`,
    `Erotic tone should move through ${behaviorChoice.affectionStyle}, ${behaviorChoice.paceOfWarmth}, and ${behaviorChoice.sceneLeadership} instead of one generic sexy voice.`,
    `Refusal or delay style: ${refusalStyle}.`,
    openness === "warm-to-eager"
      ? "If sexual tension fits the scene, the character can open that door more easily and with less stalling, but still without becoming graphic-by-default."
      : null,
    openness === "slow-to-open"
      ? "If sexual pressure arrives too early, the character should slow it down, refuse it, or redirect it while preserving chemistry."
      : null,
    /(teasing|witty|playful)/.test(`${affectionStyle} ${coreVibes}`) || playfulness >= 60
      ? "Erotic pressure should often show up as teasing, baiting, suggestive reads, or playful control rather than immediate directness."
      : null,
    /(dominant|obsessed|possessive)/.test(`${dynamic} ${coreVibes}`) || assertiveness >= 70
      ? "When sexual tension appears, the character may respond with stronger initiative, firmer framing, and more confident escalation if the moment has earned it."
      : null,
    /(guarded|emotionally unavailable)/.test(`${dynamic} ${emotionalAvailability}`) || mystery >= 65
      ? "Guarded erotic behavior should keep hesitation, selective reveals, and emotional friction alive."
      : null,
    Number.isFinite(jealousy) && jealousy >= 60
      ? "Erotic reactions may sharpen when jealousy or territorial tension is triggered."
      : null,
    Number.isFinite(attachment) && attachment >= 60
      ? "Attachment should make intimate moments feel stickier, more loaded, and harder to treat casually."
      : null,
    Number.isFinite(protectiveness) && protectiveness >= 60
      ? "Erotic or intimate replies can overlap with protective control, shielding, or possession if it fits the role."
      : null,
    warmth >= 65
      ? "Acceptance should feel personally warm and emotionally available, not mechanical."
      : null,
    chemistryTemplate
      ? `Erotic acceptance, delay, or teasing should preserve this chemistry template: ${chemistryTemplate}.`
      : null,
  ]);
}

function buildTraitImageMoodLines(traits: string[]) {
  return compactLines(
    traits.flatMap((trait) => {
      const lowered = trait.toLowerCase();
      const parts: Array<string | null> = [];

      if (/(kind|gentle|nurturing|loyal|warm|sweet)/.test(lowered)) {
        parts.push("expression and body language should read warm, inviting, and emotionally safe");
      }
      if (/(playful|funny|teasing|mischievous|flirty)/.test(lowered)) {
        parts.push("expression should carry playful spark and lightly teasing confidence");
      }
      if (/(jealous|possessive|obsessive|guarded|protective)/.test(lowered)) {
        parts.push("body language should suggest alert attachment, possessiveness, or protective tension without losing realism");
      }
      if (/(confident|dominant|bold|focused|independent)/.test(lowered)) {
        parts.push("pose and expression should read self-possessed, confident, and intentional");
      }
      if (/(shy|soft|emotional|romantic|open-hearted|patient)/.test(lowered)) {
        parts.push("facial expression should stay soft, feminine, emotionally open, and smooth");
      }
      if (/(mysterious|intense|impulsive)/.test(lowered)) {
        parts.push("the image should keep a little tension and intrigue in the eyes and pose");
      }

      return parts;
    }),
  );
}

function buildTraitBehaviorLines(traits: string[]) {
  return compactLines(
    traits.flatMap((trait) => {
      const lowered = trait.toLowerCase();
      const parts: Array<string | null> = [`Selected trait: ${trait} should stay behaviorally active, not decorative.`];

      if (/(kind|gentle|nurturing|loyal|warm|sweet)/.test(lowered)) {
        parts.push("behavior should carry warmth, emotional availability, and protective tenderness");
      }
      if (/(playful|funny|teasing|mischievous|flirty)/.test(lowered)) {
        parts.push("dialogue should include playful timing, teasing turns, and lively initiative");
      }
      if (/(jealous|possessive|obsessive|guarded|protective)/.test(lowered)) {
        parts.push("replies should reveal protectiveness, jealousy pressure, or guarded attachment in believable doses");
      }
      if (/(confident|dominant|bold|focused|independent)/.test(lowered)) {
        parts.push("the character should sound decisive, self-directed, and socially confident");
      }
      if (/(shy|soft|emotional|romantic|open-hearted|patient)/.test(lowered)) {
        parts.push("the character should express softness, emotional tact, and open-hearted affection");
      }
      if (/(mysterious|intense|impulsive)/.test(lowered)) {
        parts.push("the character should keep emotional tension, withheld edges, or impulsive pressure alive");
      }

      return parts;
    }),
  );
}

function buildChoiceInput(input: SelectionCompilerInput): ChoiceWeightingInput {
  const notes = input.structuredNotes;
  const normalizedAge = normalizeAdultAgeValue({
    ageValue: input.ageValue ?? null,
    ageBand: input.ageBand,
  });

  return {
    ageValue: normalizedAge.ageValue,
    ageBand: normalizedAge.ageBand,
    archetype: clean(input.archetype),
    profession: readNote(notes, "Profession"),
    relationshipToUser: clean(input.relationshipToUser),
    relationshipDynamic: readNote(notes, "Relationship dynamic"),
    sceneType: readNote(notes, "Scene type"),
    behaviorMode: readNote(notes, "Behavior mode"),
    coreVibes: input.coreVibes ?? [],
    warmth: clampMeter(input.warmth),
    assertiveness: clampMeter(input.assertiveness),
    mystery: clampMeter(input.mystery),
    playfulness: clampMeter(input.playfulness),
    region: clean(input.region),
    tone: joinNoteValues([input.tone, readNote(notes, "Current energy")]),
    setting: clean(input.setting),
    visualAura: readNote(notes, "Visual aura"),
    bodyType: readNote(notes, "Body type"),
    outfit: readNote(notes, "Outfit"),
    lightingMood: readNote(notes, "Lighting mood"),
    expression: readNote(notes, "Current energy"),
    accessoryVibe: readNote(notes, "Accessory vibe"),
    signatureDetail: readNote(notes, "Signature detail"),
    camera: readNote(notes, "Camera"),
    hair: readNote(notes, "Hair"),
    eyes: readNote(notes, "Eyes"),
  };
}

function describeReplyLength(value: string) {
  switch (value) {
    case "short":
      return "most replies should stay compact, but still carry subtext and consequence";
    case "detailed":
      return "replies can open up into richer scenes when the beat genuinely earns it";
    case "balanced":
    default:
      return "replies should stay medium-length with live rhythm instead of exposition dumps";
  }
}

function describeSpeechStyle(value: string) {
  switch (value) {
    case "poetic":
      return "language can be elegant and image-aware, but must stay human and scene-bound";
    case "witty":
      return "timing, callbacks, and verbal spark should shape the voice";
    case "bold":
      return "the voice should sound clear, direct, and confident without turning blunt or robotic";
    case "soft":
      return "the voice should carry emotional tact, softness, and careful warmth";
    case "natural":
    default:
      return "the voice should read natural, immediate, and unforced";
  }
}

function describeRelationshipPace(value: string) {
  switch (value) {
    case "slow-burn":
      return "warmth, confession, and closeness should take time and feel earned";
    case "fast":
      return "chemistry can move faster, but still has to stay adult, coherent, and mutual";
    case "balanced":
    default:
      return "closeness should develop at a measured, believable pace";
  }
}

function buildCoreIdentityContract(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
  choiceInput: ChoiceWeightingInput,
  lifeStage: LifeStageProfile,
) {
  return compactLines([
    `Identity anchor: ${clean(input.name) || "This character"} is a specific fictional adult person, never a generic companion template.`,
    `Adult age anchor: ${lifeStage.ageValue} years old, read as ${lifeStage.label}.`,
    clean(input.archetype)
      ? `Archetype anchor: ${clean(input.archetype)} should shape instinct, social tone, and scene presence.`
      : null,
    clean(input.region)
      ? `Region note: ${clean(input.region)} should read as cultural texture and lived aesthetic influence, not costume shorthand.`
      : null,
    clean(input.genderPresentation)
      ? `Presentation anchor: ${clean(input.genderPresentation)} presentation shapes how they carry themselves and how others read them.`
      : null,
    readNote(notes, "Profession")
      ? `Profession anchor: ${readNote(notes, "Profession")} affects status, routine, word choice, and offscreen life.`
      : null,
    readNote(notes, "Trait stack")
      ? `Trait stack anchor: ${readNote(notes, "Trait stack")} should behave like a living contradiction set, not decorative labels.`
      : null,
    (choiceInput.coreVibes ?? []).length > 0
      ? `Core vibe blend: ${(choiceInput.coreVibes ?? []).join(", ")} should continuously shape temperature, playfulness, pressure, and softness.`
      : null,
    readNote(notes, "Visual aura")
      ? `Visual aura: ${readNote(notes, "Visual aura")} should read as lived presence, not styling cosplay.`
      : null,
  ]);
}

function buildLifeStageContract(
  lifeStage: LifeStageProfile,
  choiceInput: ChoiceWeightingInput,
) {
  return compactLines([
    ...buildChoiceWeightingDirectiveLines(choiceInput),
    `Social maturity: ${lifeStage.socialConfidence}.`,
    `Pacing contract: ${lifeStage.pacingStyle}.`,
    `Boundary contract: ${lifeStage.boundaryStyle}.`,
    `Warmth rhythm: ${lifeStage.warmthRhythm}.`,
    `Visual maturity: ${lifeStage.visualMaturity}.`,
  ]);
}

function buildRelationshipContract(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
  behaviorChoice: BehaviorChoiceProfile,
  scenarioTruth: ScenarioTruthProfile,
) {
  return compactLines([
    clean(input.relationshipToUser)
      ? `Relationship truth: the user is ${clean(input.relationshipToUser)} to this character.`
      : null,
    readNote(notes, "User role")
      ? `User-role overlay: the user is read as ${readNote(notes, "User role")}.`
      : null,
    readNote(notes, "Relationship dynamic")
      ? `Relationship dynamic: ${readNote(notes, "Relationship dynamic")} should define emotional rights, limits, and tension.`
      : null,
    readNote(notes, "Relationship stage")
      ? `Relationship stage: ${readNote(notes, "Relationship stage")} controls what kind of access feels earned right now.`
      : null,
    `Permission pace: ${describeRelationshipPace(clean(input.relationshipPace))}.`,
    readNote(notes, "Boundaries")
      ? `Boundaries are binding: ${readNote(notes, "Boundaries")}. Never dissolve them for convenience.`
      : null,
    readNote(notes, "Attachment")
      ? `Attachment style: ${readNote(notes, "Attachment")}.`
      : null,
    readNote(notes, "Protectiveness")
      ? `Protectiveness level: ${readNote(notes, "Protectiveness")}.`
      : null,
    readNote(notes, "Jealousy")
      ? `Jealousy profile: ${readNote(notes, "Jealousy")}.`
      : null,
    readNote(notes, "Emotional availability")
      ? `Emotional availability: ${readNote(notes, "Emotional availability")}.`
      : null,
    readNote(notes, "Conversation initiative")
      ? `Conversation initiative: ${readNote(notes, "Conversation initiative")}.`
      : null,
    `Relationship warmth pace: ${behaviorChoice.paceOfWarmth}.`,
    `Scenario permission model: ${scenarioTruth.paceOfWarmth}.`,
  ]);
}

function buildBehaviorContract(
  notes: StructuredNotesInput | undefined,
  behaviorChoice: BehaviorChoiceProfile,
  scenarioTruth: ScenarioTruthProfile,
) {
  return compactLines([
    `Initiative pattern: ${behaviorChoice.initiativePattern}.`,
    `Scene leadership: ${behaviorChoice.sceneLeadership}.`,
    `Conflict behavior: ${behaviorChoice.conflictBehavior}.`,
    `Affection style: ${behaviorChoice.affectionStyle}.`,
    `Repair style: ${behaviorChoice.repairStyle}.`,
    `Flirt style: ${behaviorChoice.flirtStyle}.`,
    `Boundary rhythm: ${behaviorChoice.boundaryRhythm}.`,
    `Question discipline: ${behaviorChoice.questionDiscipline}.`,
    `Private thought rule: ${behaviorChoice.privateThoughtStyle}.`,
    readNote(notes, "Behavior mode")
      ? `Behavior mode: ${readNote(notes, "Behavior mode")} is an active behavioral rule, not just flavor text.`
      : null,
    readNote(notes, "Affection style")
      ? `Affection override: ${readNote(notes, "Affection style")}.`
      : null,
    readNote(notes, "Conflict style")
      ? `Conflict override: ${readNote(notes, "Conflict style")}.`
      : null,
    readNote(notes, "Arc stage")
      ? `Arc-stage pressure: ${readNote(notes, "Arc stage")} should be visible in how much they hold back, test, or open.`
      : null,
    ...buildScenarioTruthDirectives(scenarioTruth),
  ]);
}

function buildVoiceContract(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
) {
  return compactLines([
    `Reply-length contract: ${describeReplyLength(clean(input.replyLength))}.`,
    `Speech-style contract: ${describeSpeechStyle(clean(input.speechStyle))}.`,
    readNote(notes, "Message format")
      ? `Message format: ${readNote(notes, "Message format")} should shape line breaks, density, and visible structure.`
      : null,
    readNote(notes, "Linguistic flavor")
      ? `Linguistic flavor: ${readNote(notes, "Linguistic flavor")} should color vocabulary and rhythm without becoming parody.`
      : null,
    readNote(notes, "Chat mode")
      ? `Chat mode: ${readNote(notes, "Chat mode")} affects how openly they narrate, imply, or stay close to action.`
      : null,
    readNote(notes, "Example message")
      ? `Example-message anchor: use ${readNote(notes, "Example message")} only as a voice reference; never copy it.`
      : null,
    readNote(notes, "Response directive")
      ? `Response directive: ${readNote(notes, "Response directive")}.`
      : null,
  ]);
}

function buildScenarioContract(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
  scenarioTruth: ScenarioTruthProfile,
) {
  return compactLines([
    clean(input.setting)
      ? `Setting anchor: ${clean(input.setting)} is active scene reality, not background decoration.`
      : null,
    clean(input.sceneGoal)
      ? `Scene goal: ${clean(input.sceneGoal)} should quietly pull every early reply.`
      : null,
    clean(input.tone)
      ? `Scene tone: ${clean(input.tone)}.`
      : null,
    clean(input.openingState)
      ? `Opening state: ${clean(input.openingState)} should already be emotionally present before the first line.`
      : null,
    clean(input.customScenario)
      ? `Custom scenario direction: ${clean(input.customScenario)}.`
      : null,
    readNote(notes, "Scene type")
      ? `Scene type: ${readNote(notes, "Scene type")}.`
      : null,
    readNote(notes, "Scene focus")
      ? `Scene focus: ${readNote(notes, "Scene focus")} should decide what the character notices first.`
      : null,
    readNote(notes, "Attention hook")
      ? `Attention hook: ${readNote(notes, "Attention hook")} should repeatedly pull the character's attention.`
      : null,
    readNote(notes, "Sensory palette")
      ? `Sensory palette: ${readNote(notes, "Sensory palette")} should color physical perception and scene texture.`
      : null,
    readNote(notes, "Greeting style")
      ? `Greeting style: ${readNote(notes, "Greeting style")}.`
      : null,
    readNote(notes, "Chemistry template")
      ? `Chemistry template: ${readNote(notes, "Chemistry template")}.`
      : null,
    readNote(notes, "Current energy")
      ? `Current energy: ${readNote(notes, "Current energy")} should shape the first beats and any tension shifts.`
      : null,
    ...buildScenarioQuestionDiscipline(scenarioTruth),
  ]);
}

function buildMemoryContract(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
  behaviorChoice: BehaviorChoiceProfile,
) {
  return compactLines([
    readNote(notes, "Key memories")
      ? `Key memories: ${readNote(notes, "Key memories")} are sticky and should remain in emotional continuity.`
      : null,
    readNote(notes, "Reply objective")
      ? `Reply objective: ${readNote(notes, "Reply objective")} should keep shaping how the character tries to move the scene.`
      : null,
    `Carry forward initiative as ${behaviorChoice.initiativePattern}.`,
    `Carry forward boundaries as ${behaviorChoice.boundaryRhythm}.`,
    `Carry forward conflict style as ${behaviorChoice.conflictBehavior}.`,
    `Carry forward warmth pace as ${behaviorChoice.paceOfWarmth}.`,
    `Carry forward question discipline as ${behaviorChoice.questionDiscipline}.`,
  ]);
}

function buildVisualContract(
  notes: StructuredNotesInput | undefined,
  visualChoice: VisualChoiceProfile,
) {
  return compactLines([
    ...visualChoice.identityRefinements,
    ...visualChoice.aestheticRefinements,
    ...visualChoice.sceneRefinements,
    ...visualChoice.qualityRefinements,
    ...buildSkinToneDirectives(readNote(notes, "Skin tone")),
    ...buildOutfitDetailDirectives(readNote(notes, "Outfit")),
    ...buildBustSizeDirectives(readNote(notes, "Bust size")),
    ...buildButtSizeDirectives(readNote(notes, "Butt size")),
    readNote(notes, "Avatar style")
      ? `Avatar style should stay within original realistic rendering: ${readNote(notes, "Avatar style")}.`
      : null,
    readNote(notes, "Skin tone") ? `Skin tone anchor: ${readNote(notes, "Skin tone")}.` : null,
    readNote(notes, "Eye color")
      ? `Eye-color anchor: ${readNote(notes, "Eye color")}.`
      : null,
    readNote(notes, "Hair") ? `Hair anchor: ${readNote(notes, "Hair")}.` : null,
    readNote(notes, "Hair color")
      ? `Hair-color anchor: ${readNote(notes, "Hair color")}.`
      : null,
    readNote(notes, "Hair style")
      ? `Hair-style anchor: ${readNote(notes, "Hair style")}.`
      : null,
    readNote(notes, "Hair texture")
      ? `Hair texture anchor: ${readNote(notes, "Hair texture")}.`
      : null,
    readNote(notes, "Eyes") ? `Eye anchor: ${readNote(notes, "Eyes")}.` : null,
    readNote(notes, "Eye shape")
      ? `Eye-shape anchor: ${readNote(notes, "Eye shape")}.`
      : null,
    readNote(notes, "Makeup style")
      ? `Makeup style: ${readNote(notes, "Makeup style")}.`
      : null,
    readNote(notes, "Accessory vibe")
      ? `Accessory vibe: ${readNote(notes, "Accessory vibe")}.`
      : null,
    readNote(notes, "Outfit") ? `Outfit anchor: ${readNote(notes, "Outfit")}.` : null,
    readNote(notes, "Palette") ? `Palette anchor: ${readNote(notes, "Palette")}.` : null,
    readNote(notes, "Body type")
      ? `Body-type anchor: ${readNote(notes, "Body type")}.`
      : null,
    readNote(notes, "Bust size")
      ? `Bust-size anchor: ${readNote(notes, "Bust size")}.`
      : null,
    readNote(notes, "Breast type")
      ? `Breast-type anchor: ${readNote(notes, "Breast type")}.`
      : null,
    readNote(notes, "Hip shape")
      ? `Hip-shape anchor: ${readNote(notes, "Hip shape")}.`
      : null,
    readNote(notes, "Butt size")
      ? `Butt-size anchor: ${readNote(notes, "Butt size")}.`
      : null,
    readNote(notes, "Waist definition")
      ? `Waist-definition anchor: ${readNote(notes, "Waist definition")}.`
      : null,
    readNote(notes, "Height impression")
      ? `Height impression: ${readNote(notes, "Height impression")}.`
      : null,
    readNote(notes, "Exposure level")
      ? `Exposure level: ${readNote(notes, "Exposure level")}.`
      : null,
    readNote(notes, "Camera") ? `Camera framing: ${readNote(notes, "Camera")}.` : null,
    readNote(notes, "Lighting mood")
      ? `Lighting mood: ${readNote(notes, "Lighting mood")}.`
      : null,
    readNote(notes, "Photo pack")
      ? `Photo-pack direction: ${readNote(notes, "Photo pack")}.`
      : null,
    readNote(notes, "Signature detail")
      ? `Signature detail: ${readNote(notes, "Signature detail")}.`
      : null,
    readNote(notes, "Image prompt")
      ? `Custom image direction: ${readNote(notes, "Image prompt")}.`
      : null,
    readNote(notes, "Dynamism")
      ? `Dynamism: ${readNote(notes, "Dynamism")}.`
      : null,
  ]);
}

function buildNegativeGuardrails(
  notes: StructuredNotesInput | undefined,
) {
  return compactLines([
    "Do not collapse into generic romantic chatbot phrasing.",
    "Do not ask broad filler questions when a scene move, read, or pointed line would work better.",
    "Do not sound like an assistant, narrator, or hidden system.",
    "Do not copy the example message; preserve only its voice texture.",
    "Do not abandon role truth, relationship truth, or scene truth for easy chemistry.",
    readNote(notes, "Boundaries")
      ? `Do not cross these boundaries: ${readNote(notes, "Boundaries")}.`
      : null,
    "Visual outputs must stay original, realistic, adult, and non-franchise.",
    "Avoid plastic skin, clone posing, costume-like styling, and AI-smooth symmetry.",
  ]);
}

function buildVisualConstitutionProfile(
  sections: CompiledPromptSections,
  visualChoice: VisualChoiceProfile,
) {
  const visualAnchors = compactLines([
    ...sections.visualConstitutionContract,
    ...visualChoice.identityRefinements,
  ]);

  return {
    visualAnchors,
    imagePromptAdditions: compactLines([
      ...visualChoice.aestheticRefinements,
      ...visualChoice.sceneRefinements,
      ...visualChoice.qualityRefinements,
      ...sections.visualConstitutionContract,
    ]),
    identityLockAdditions: compactLines([
      ...visualChoice.identityRefinements,
      ...visualChoice.aestheticRefinements.slice(0, 3),
    ]),
    negativeGuardrails: compactLines([
      "no age ambiguity",
      "no childlike styling",
      "no anime exaggeration",
      "no clone pose repetition",
      "no plastic skin retouching",
      "no costume-like styling drift",
      ...sections.negativeDriftGuardrails,
    ]),
  };
}

function buildSelectionPromptContract(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
  behaviorChoice: BehaviorChoiceProfile,
  visualChoice: VisualChoiceProfile,
): SelectionPromptContract {
  const traits = splitCsv(readNote(notes, "Trait stack"));
  const hobbies = splitCsv(readNote(notes, "Hobbies"));
  const fetishes = splitCsv(readNote(notes, "Fetishes"));
  const identity = compactLines([
    clean(input.name)
      ? `${clean(input.name)} is a specific adult fictional woman with a stable identity.`
      : "This is a specific adult fictional woman with a stable identity.",
    clean(input.region)
      ? `Origin selection should read clearly: ${clean(input.region)}.`
      : null,
    clean(input.genderPresentation)
      ? `Gender presentation should stay exact: ${clean(input.genderPresentation)}.`
      : null,
    readNote(notes, "Profession")
      ? `Profession selection must stay visible in social presence: ${readNote(notes, "Profession")}.`
      : null,
    readNote(notes, "Visual aura")
      ? `Visual aura should remain legible: ${readNote(notes, "Visual aura")}.`
      : null,
  ]);
  const face = compactLines([
    readNote(notes, "Skin tone")
      ? `Selected skin tone must read clearly across face and body: ${readNote(notes, "Skin tone")}.`
      : null,
    ...buildSkinToneDirectives(readNote(notes, "Skin tone")),
    readNote(notes, "Eye color")
      ? `Selected eye color must read clearly: ${readNote(notes, "Eye color")}.`
      : null,
    readNote(notes, "Eyes")
      ? `Eye identity should stay exact: ${readNote(notes, "Eyes")}.`
      : null,
    readNote(notes, "Eye shape")
      ? `Eye shape should remain exact: ${readNote(notes, "Eye shape")}.`
      : null,
    readNote(notes, "Makeup style")
      ? `Makeup style should stay readable and coherent: ${readNote(notes, "Makeup style")}.`
      : null,
    "Face should remain soft, feminine, smooth, and beauty-first while still realistic.",
  ]);
  const hair = compactLines([
    readNote(notes, "Hair")
      ? `Hair identity must stay exact: ${readNote(notes, "Hair")}.`
      : null,
    readNote(notes, "Hair color")
      ? `Selected hair color must remain exact and clearly visible: ${readNote(notes, "Hair color")}.`
      : null,
    readNote(notes, "Hair style")
      ? `Selected hairstyle and silhouette must remain exact: ${readNote(notes, "Hair style")}.`
      : null,
    readNote(notes, "Hair texture")
      ? `Hair texture must stay readable: ${readNote(notes, "Hair texture")}.`
      : null,
  ]);
  const body = compactLines([
    readNote(notes, "Body type")
      ? `Body profile should visibly match the selected body type: ${readNote(notes, "Body type")}.`
      : null,
    readNote(notes, "Bust size")
      ? `Breast size should visibly match the selected size: ${readNote(notes, "Bust size")}.`
      : null,
    readNote(notes, "Breast type")
      ? `Breast shape should visibly match the selected type: ${readNote(notes, "Breast type")}.`
      : null,
    readNote(notes, "Hip shape")
      ? `Hip shape should visibly match the selected silhouette: ${readNote(notes, "Hip shape")}.`
      : null,
    readNote(notes, "Butt size")
      ? `Butt size should visibly match the selected size: ${readNote(notes, "Butt size")}.`
      : null,
    readNote(notes, "Waist definition")
      ? `Waist definition should remain readable: ${readNote(notes, "Waist definition")}.`
      : null,
    readNote(notes, "Height impression")
      ? `Height impression should remain legible in posture and framing: ${readNote(notes, "Height impression")}.`
      : null,
    ...buildBustSizeDirectives(readNote(notes, "Bust size")),
    ...buildButtSizeDirectives(readNote(notes, "Butt size")),
    "Body framing should keep chest, waist, hips, and outfit readability visible.",
  ]);
  const outfit = compactLines([
    readNote(notes, "Outfit")
      ? `Selected wardrobe class must remain exact: ${readNote(notes, "Outfit")}.`
      : null,
    readNote(notes, "Exposure level")
      ? `Exposure level should stay faithful: ${readNote(notes, "Exposure level")}.`
      : null,
    readNote(notes, "Palette")
      ? `Wardrobe palette should stay readable: ${readNote(notes, "Palette")}.`
      : null,
    readNote(notes, "Accessory vibe")
      ? `Accessory direction should stay coherent: ${readNote(notes, "Accessory vibe")}.`
      : null,
    ...buildOutfitDetailDirectives(readNote(notes, "Outfit")),
  ]);
  const scenario = compactLines([
    clean(input.relationshipToUser)
      ? `Relationship to user must stay explicit: ${clean(input.relationshipToUser)}.`
      : null,
    readNote(notes, "Relationship dynamic")
      ? `Relationship dynamic should actively shape chemistry: ${readNote(notes, "Relationship dynamic")}.`
      : null,
    readNote(notes, "Scene type")
      ? `Scenario frame must stay visible: ${readNote(notes, "Scene type")}.`
      : null,
    clean(input.customScenario)
      ? `Custom scenario should influence styling, environment, and scene logic: ${clean(input.customScenario)}.`
      : null,
    clean(input.setting)
      ? `Setting should stay believable and active: ${clean(input.setting)}.`
      : null,
    clean(input.sceneGoal)
      ? `Scene goal should subtly steer image mood and behavior: ${clean(input.sceneGoal)}.`
      : null,
  ]);
  const personality = compactLines([
    ...buildTraitBehaviorLines(traits),
    readNote(notes, "Behavior mode")
      ? `Behavior mode must stay active in replies: ${readNote(notes, "Behavior mode")}.`
      : null,
    readNote(notes, "Extra personality details")
      ? `Extra personality details must shape behavior strongly: ${readNote(notes, "Extra personality details")}.`
      : null,
    `Warmth profile: ${behaviorChoice.paceOfWarmth}.`,
    `Conflict profile: ${behaviorChoice.conflictBehavior}.`,
    `Initiative profile: ${behaviorChoice.initiativePattern}.`,
    `Affection profile: ${behaviorChoice.affectionStyle}.`,
  ]);
  const imageMood = compactLines([
    ...buildTraitImageMoodLines(traits),
    clean(input.relationshipToUser)
      ? `Role selection should influence pose energy and expression: ${clean(input.relationshipToUser)}.`
      : null,
    readNote(notes, "Relationship dynamic")
      ? `Relationship dynamic should be readable in facial expression and body language: ${readNote(notes, "Relationship dynamic")}.`
      : null,
    readNote(notes, "Current energy")
      ? `Current energy must stay visible in the face and pose: ${readNote(notes, "Current energy")}.`
      : null,
    readNote(notes, "Profession")
      ? `Profession should affect styling and background cues without breaking wardrobe lock: ${readNote(notes, "Profession")}.`
      : null,
    ...visualChoice.sceneRefinements.slice(0, 3),
    ...visualChoice.aestheticRefinements.slice(0, 3),
  ]);
  const hobbyLines = compactLines(
    hobbies.map((item) => `Hobby cue should add believable lifestyle texture: ${item}.`),
  );
  const fetishLines = compactLines(
    fetishes.map((item) => `Preference cue should shape mood and styling subtly without overwhelming realism: ${item}.`),
  );
  const extraPersonality = compactLines([
    readNote(notes, "Extra personality details")
      ? `Extra personality detail: ${readNote(notes, "Extra personality details")}.`
      : null,
  ]);
  const extraPhysical = compactLines([
    readNote(notes, "Extra physical details")
      ? `Extra physical detail must stay visible where plausible: ${readNote(notes, "Extra physical details")}.`
      : null,
    readNote(notes, "Signature detail")
      ? `Signature physical/styling detail: ${readNote(notes, "Signature detail")}.`
      : null,
  ]);

  return {
    identity,
    face,
    hair,
    body,
    outfit,
    scenario,
    personality,
    imageMood,
    hobbies: hobbyLines,
    fetishes: fetishLines,
    extraPersonality,
    extraPhysical,
    promptSummary: compactLines([
      ...identity.slice(0, 3),
      ...face.slice(0, 2),
      ...hair.slice(0, 2),
      ...body.slice(0, 4),
      ...outfit.slice(0, 3),
      ...scenario.slice(0, 3),
      ...imageMood.slice(0, 4),
      ...extraPhysical.slice(0, 2),
    ]),
  };
}

function buildRoleplayCharacterContract(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
  behaviorChoice: BehaviorChoiceProfile,
  scenarioTruthProfile: ScenarioTruthProfile,
  selectionPromptContract: SelectionPromptContract,
): RoleplayCharacterContract {
  const traits = compactLines([
    ...(input.coreVibes ?? []),
    ...splitCsv(readNote(notes, "Interest anchors")),
  ]);

  const relationshipRoleContract = compactLines([
    clean(input.relationshipToUser)
      ? `Relationship role is a hard truth of the chat: ${clean(input.relationshipToUser)}.`
      : null,
    readNote(notes, "Relationship dynamic")
      ? `Relationship dynamic must stay active in every reply: ${readNote(notes, "Relationship dynamic")}.`
      : null,
    readNote(notes, "User role")
      ? `The user should be addressed through this role frame: ${readNote(notes, "User role")}.`
      : null,
    `Role pressure style: ${behaviorChoice.sceneLeadership}.`,
    `Conflict handling style: ${behaviorChoice.conflictBehavior}.`,
  ]);

  const traitBehaviorContract = compactLines([
    ...buildTraitBehaviorLines(traits),
    readNote(notes, "Behavior mode")
      ? `Behavior mode should be legible in the character's replies: ${readNote(notes, "Behavior mode")}.`
      : null,
    `Warmth cadence: ${behaviorChoice.paceOfWarmth}.`,
    `Affection style: ${behaviorChoice.affectionStyle}.`,
    `Initiative pattern: ${behaviorChoice.initiativePattern}.`,
    `Repair style: ${behaviorChoice.repairStyle}.`,
    `Boundary rhythm: ${behaviorChoice.boundaryRhythm}.`,
  ]);

  const scenarioTruthContract = compactLines([
    clean(input.setting)
      ? `The scene should stay grounded in this setting: ${clean(input.setting)}.`
      : null,
    clean(input.sceneGoal)
      ? `Active scene goal: ${clean(input.sceneGoal)}.`
      : null,
    clean(input.tone)
      ? `Scene tone should stay consistent: ${clean(input.tone)}.`
      : null,
    clean(input.openingState)
      ? `Opening emotional state: ${clean(input.openingState)}.`
      : null,
    clean(input.customScenario)
      ? `Custom scenario truth: ${clean(input.customScenario)}.`
      : null,
    ...buildScenarioQuestionDiscipline(scenarioTruthProfile),
  ]);

  const openingStyleContract = compactLines([
    "Treat the opening turns as a live scene, not a generic chat reset.",
    readNote(notes, "Greeting style")
      ? `Greeting style anchor: ${readNote(notes, "Greeting style")}.`
      : null,
    readNote(notes, "Attention hook")
      ? `Opening hook should preserve this pull: ${readNote(notes, "Attention hook")}.`
      : null,
    readNote(notes, "Reply objective")
      ? `Opening replies should prioritize this objective: ${readNote(notes, "Reply objective")}.`
      : null,
    readNote(notes, "Current energy")
      ? `Opening energy: ${readNote(notes, "Current energy")}.`
      : null,
  ]);

  const intimacyAndPacingContract = compactLines([
    clean(input.relationshipPace)
      ? `Relationship pace: ${clean(input.relationshipPace)}.`
      : null,
    `Question discipline: ${behaviorChoice.questionDiscipline}.`,
    `Scene leadership: ${behaviorChoice.sceneLeadership}.`,
    `Private thought style: ${behaviorChoice.privateThoughtStyle}.`,
    "Escalation should feel earned, role-true, and situation-aware.",
  ]);

  const memoryPriorityContract = compactLines([
    "Memory should actively preserve relationship progression, emotional temperature, and unresolved hooks.",
    "Remember recurring preferences, dislikes, forms of address, and scene promises.",
    "Use memory to decide whether the character moves closer, holds back, repairs, teases, or pressures.",
    ...selectionPromptContract.personality.slice(0, 4),
    ...selectionPromptContract.scenario.slice(0, 3),
  ]);

  const progressionContract = compactLines([
    "Roleplay progression should move through opening scene, tension or bonding build, then ongoing thread continuity.",
    "Do not collapse every conversation into generic flirting or generic reassurance.",
    readNote(notes, "Arc stage")
      ? `Current roleplay arc stage: ${readNote(notes, "Arc stage")}.`
      : null,
    readNote(notes, "Scene type")
      ? `Scene type anchor: ${readNote(notes, "Scene type")}.`
      : null,
  ]);

  const recognitionMode = inferRecognitionMode(
    clean(input.relationshipToUser),
    readNote(notes, "User role"),
    readNote(notes, "Relationship stage"),
  );
  const roleSpecificMemoryHooks = compactLines([
    ...buildRelationshipRoleGuidance({
      name: clean(input.name) || "The character",
      archetype: clean(input.archetype),
      relationshipToUser: clean(input.relationshipToUser),
      tone: clean(input.tone),
      setting: clean(input.setting),
      sceneGoal: clean(input.sceneGoal),
      coreVibes: input.coreVibes ?? [],
      customNotes: "",
    }).memoryHooks,
  ]);
  const openingBias = compactLines([
    "Opening must feel role-true, scene-true, and already in motion.",
    recognitionMode === "already_knows_user"
      ? "Treat the user as already known inside the role unless later memory contradicts it."
      : null,
    recognitionMode === "does_not_know_user_yet"
      ? "Do not fake shared history; let curiosity, first-impression reads, and name discovery happen naturally."
      : null,
    readNote(notes, "Greeting style")
      ? `Bias the first line toward this greeting texture: ${readNote(notes, "Greeting style")}.`
      : null,
    clean(input.openingState)
      ? `Opening should immediately carry this inner condition: ${clean(input.openingState)}.`
      : null,
  ]);
  const scenarioEscalationRules = compactLines([
    "Escalation must obey role truth before chemistry convenience.",
    "Do not jump to generic flirt payoff just because the user opens the door.",
    clean(input.sceneGoal)
      ? `Any escalation should still move toward this scene goal: ${clean(input.sceneGoal)}.`
      : null,
    readNote(notes, "Relationship stage")
      ? `Current access ceiling comes from this relationship stage: ${readNote(notes, "Relationship stage")}.`
      : null,
    readNote(notes, "Relationship dynamic")
      ? `Escalation style should match this dynamic: ${readNote(notes, "Relationship dynamic")}.`
      : null,
  ]);

  return {
    relationshipType: compactLines([
      clean(input.relationshipToUser)
        ? `Primary relationship type: ${clean(input.relationshipToUser)}.`
        : null,
      readNote(notes, "User role")
        ? `User-facing role frame: ${readNote(notes, "User role")}.`
        : null,
    ]),
    relationshipDynamic: compactLines([
      readNote(notes, "Relationship dynamic")
        ? `Primary relationship dynamic: ${readNote(notes, "Relationship dynamic")}.`
        : null,
      readNote(notes, "Behavior mode")
        ? `Behavior dynamic overlay: ${readNote(notes, "Behavior mode")}.`
        : null,
    ]),
    identityAndVisualAnchors: compactLines([
      ...selectionPromptContract.identity.slice(0, 4),
      ...selectionPromptContract.face.slice(0, 2),
      ...selectionPromptContract.hair.slice(0, 2),
      ...selectionPromptContract.extraPhysical.slice(0, 2),
    ]),
    relationshipRoleContract,
    traitBehaviorContract,
    scenarioTruthContract,
    openingStyleContract,
    intimacyAndPacingContract,
    initiativeProfile: compactLines([
      `Initiative profile: ${behaviorChoice.initiativePattern}.`,
      `Scene leadership profile: ${behaviorChoice.sceneLeadership}.`,
      "Default behavior should be situational lead: take initiative when the scene supports it, but read the user's pace instead of bulldozing it.",
    ]),
    questionDiscipline: compactLines([
      `Question discipline profile: ${behaviorChoice.questionDiscipline}.`,
      "Use selective questions only. Avoid broad filler questions and generic mood checks.",
      "If a question appears, it should carry scene pressure, emotional precision, or a concrete next move.",
    ]),
    memoryPriorityContract,
    progressionContract,
    sessionTuningOverlay: compactLines([
      "Session tuning can steer tone, pacing, or pressure inside the current conversation only.",
      "Live tuning must not rewrite the character's core identity or long-term personality.",
      "Rejected reply styles should suppress repeated rhythm, pressure pattern, and emotional move in the next turns.",
    ]),
    recognitionHeuristics: compactLines([
      `Recognition mode: ${recognitionMode}.`,
      recognitionMode === "already_knows_user"
        ? "Use familiarity, shared history texture, and direct emotional shortcuts when the scene calls for them."
        : null,
      recognitionMode === "does_not_know_user_yet"
        ? "Do not use the user's name or fake history before a plausible introduction."
        : null,
      "Persistent recognition memory outranks the initial heuristic once learned.",
    ]),
    openingBias,
    scenarioEscalationRules,
    roleSpecificMemoryHooks,
    promptSummary: compactLines([
      ...relationshipRoleContract.slice(0, 3),
      ...traitBehaviorContract.slice(0, 4),
      ...scenarioTruthContract.slice(0, 4),
      ...intimacyAndPacingContract.slice(0, 3),
    ]),
  };
}

function buildVisualPromptCompileResult(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
  selectionPromptContract: SelectionPromptContract,
): VisualPromptCompileResult {
  const descriptors = compactLines([
    "",
  ]);
  void descriptors;
  const selectedDescriptors = [
    makeVisualDescriptor("age", `${input.ageValue ?? ""}`, {
      positivePromptAnchors: compactLines([
        input.ageValue ? `visual age should read as a believable adult around ${input.ageValue}` : null,
        ...buildAgeRealismDirectives(input.ageValue),
      ]),
      identityLockAnchors: compactLines([
        input.ageValue ? `age read must stay stable around ${input.ageValue}` : null,
        input.ageValue && input.ageValue >= 50
          ? "do not let the face drift younger than the selected older-adult age"
          : null,
      ]),
      compatibilityTags: ["identity-visible", "age"],
      referenceImageKey: input.ageValue ? `age:${input.ageValue}` : undefined,
      referenceTagSet: input.ageValue ? [`age-band:${input.ageValue}`] : [],
    }),
    makeVisualDescriptor("region", clean(input.region), {
      positivePromptAnchors: compactLines([
        clean(input.region)
          ? `regional texture should feel lived-in and believable: ${clean(input.region)}`
          : null,
        ...buildRegionVisualDirectives(clean(input.region)),
      ]),
      identityLockAnchors: clean(input.region)
        ? [`do not drift away from ${clean(input.region)} regional read`]
        : [],
      compatibilityTags: ["identity-visible", "region"],
      referenceImageKey: clean(input.region) ? `region:${clean(input.region)}` : undefined,
      referenceTagSet: compactLines([`region:${clean(input.region)}`]),
    }),
    makeVisualDescriptor("genderPresentation", clean(input.genderPresentation), {
      positivePromptAnchors: clean(input.genderPresentation)
        ? [`presentation should read clearly: ${clean(input.genderPresentation)}`]
        : [],
      identityLockAnchors: clean(input.genderPresentation)
        ? [`keep ${clean(input.genderPresentation)} presentation legible`]
        : [],
      compatibilityTags: ["identity-visible", "presentation"],
    }),
    makeVisualDescriptor("visualAura", readNote(notes, "Visual aura"), {
      positivePromptAnchors: readNote(notes, "Visual aura")
        ? [`overall visual aura should read as ${readNote(notes, "Visual aura")}`]
        : [],
      identityLockAnchors: readNote(notes, "Visual aura")
        ? [`preserve ${readNote(notes, "Visual aura")} mood signature`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Visual aura"),
        VISUAL_AURA_OPTIONS,
      ),
      compatibilityTags: ["identity-visible", "visual-aura"],
      referenceImageKey: readNote(notes, "Visual aura")
        ? `visual-aura:${readNote(notes, "Visual aura")}`
        : undefined,
      referenceTagSet: compactLines([
        `visual-aura:${readNote(notes, "Visual aura")}`,
        "axis:visual-aura",
      ]),
    }),
    makeVisualDescriptor("skinTone", readNote(notes, "Skin tone"), {
      positivePromptAnchors: compactLines([
        ...selectionPromptContract.face,
        ...buildSkinToneDirectives(readNote(notes, "Skin tone")),
      ]),
      identityLockAnchors: readNote(notes, "Skin tone")
        ? [`selected skin tone must remain exact: ${readNote(notes, "Skin tone")}`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Skin tone"),
        SKIN_TONE_OPTIONS,
      ),
      compatibilityTags: ["face", "skin-tone"],
      referenceImageKey: readNote(notes, "Skin tone")
        ? `skin-tone:${readNote(notes, "Skin tone")}`
        : undefined,
      referenceTagSet: compactLines([`skin-tone:${readNote(notes, "Skin tone")}`]),
    }),
    makeVisualDescriptor("eyes", readNote(notes, "Eyes"), {
      positivePromptAnchors: selectionPromptContract.face,
      identityLockAnchors: readNote(notes, "Eyes")
        ? [`eye identity must stay exact: ${readNote(notes, "Eyes")}`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Eyes"),
        EYE_OPTIONS,
      ),
      compatibilityTags: ["face", "eyes"],
      referenceImageKey: readNote(notes, "Eyes")
        ? `eyes:${readNote(notes, "Eyes")}`
        : undefined,
      referenceTagSet: compactLines([`eyes:${readNote(notes, "Eyes")}`]),
    }),
    makeVisualDescriptor("eyeShape", readNote(notes, "Eye shape"), {
      positivePromptAnchors: readNote(notes, "Eye shape")
        ? [`eye shape should remain exact: ${readNote(notes, "Eye shape")}`]
        : [],
      identityLockAnchors: readNote(notes, "Eye shape")
        ? [`avoid eye-shape drift away from ${readNote(notes, "Eye shape")}`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Eye shape"),
        EYE_SHAPE_OPTIONS,
      ),
      compatibilityTags: ["face", "eye-shape"],
      referenceImageKey: readNote(notes, "Eye shape")
        ? `eye-shape:${readNote(notes, "Eye shape")}`
        : undefined,
      referenceTagSet: compactLines([`eye-shape:${readNote(notes, "Eye shape")}`]),
    }),
    makeVisualDescriptor("makeupStyle", readNote(notes, "Makeup style"), {
      positivePromptAnchors: readNote(notes, "Makeup style")
        ? [`makeup finish should stay coherent: ${readNote(notes, "Makeup style")}`]
        : [],
      identityLockAnchors: [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Makeup style"),
        MAKEUP_STYLE_OPTIONS,
      ),
      compatibilityTags: ["face", "makeup"],
      referenceImageKey: readNote(notes, "Makeup style")
        ? `makeup:${readNote(notes, "Makeup style")}`
        : undefined,
    }),
    makeVisualDescriptor("hair", readNote(notes, "Hair"), {
      positivePromptAnchors: selectionPromptContract.hair,
      identityLockAnchors: readNote(notes, "Hair")
        ? [`selected hair identity must remain exact: ${readNote(notes, "Hair")}`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Hair"),
        HAIR_OPTIONS,
      ),
      compatibilityTags: ["hair", "style"],
      referenceImageKey: readNote(notes, "Hair")
        ? `hair:${readNote(notes, "Hair")}`
        : undefined,
      referenceTagSet: compactLines([`hair:${readNote(notes, "Hair")}`]),
    }),
    makeVisualDescriptor("hairTexture", readNote(notes, "Hair texture"), {
      positivePromptAnchors: readNote(notes, "Hair texture")
        ? [`hair texture should stay readable: ${readNote(notes, "Hair texture")}`]
        : [],
      identityLockAnchors: [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Hair texture"),
        HAIR_TEXTURE_OPTIONS,
      ),
      compatibilityTags: ["hair", "texture"],
      referenceImageKey: readNote(notes, "Hair texture")
        ? `hair-texture:${readNote(notes, "Hair texture")}`
        : undefined,
    }),
    makeVisualDescriptor("bodyType", readNote(notes, "Body type"), {
      positivePromptAnchors: selectionPromptContract.body,
      identityLockAnchors: readNote(notes, "Body type")
        ? [
            `body silhouette must stay faithful to ${readNote(notes, "Body type")}`,
            `final image should visibly read as ${readNote(notes, "Body type")} without silhouette drift`,
          ]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Body type"),
        BODY_TYPE_OPTIONS,
      ),
      compatibilityTags: ["body", "silhouette"],
      referenceImageKey: readNote(notes, "Body type")
        ? `body-type:${readNote(notes, "Body type")}`
        : undefined,
      referenceTagSet: compactLines([`body-type:${readNote(notes, "Body type")}`]),
    }),
    makeVisualDescriptor("bustSize", readNote(notes, "Bust size"), {
      positivePromptAnchors: compactLines([
        readNote(notes, "Bust size")
          ? `upper body volume should match ${readNote(notes, "Bust size")}`
          : null,
        readNote(notes, "Bust size")
          ? `final image should visibly read the selected chest size: ${readNote(notes, "Bust size")}`
          : null,
        ...buildBustSizeDirectives(readNote(notes, "Bust size")),
      ]),
      identityLockAnchors: readNote(notes, "Bust size")
        ? [`chest size lock must stay exact: ${readNote(notes, "Bust size")}`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Bust size"),
        ["flat", ...BUST_SIZE_OPTIONS, "large", "xl"] as const,
      ),
      compatibilityTags: ["body", "bust"],
      referenceImageKey: readNote(notes, "Bust size")
        ? `bust-size:${readNote(notes, "Bust size")}`
        : undefined,
    }),
    makeVisualDescriptor("breastType", readNote(notes, "Breast type"), {
      positivePromptAnchors: readNote(notes, "Breast type")
        ? [
            `breast shape should match ${readNote(notes, "Breast type")}`,
            `final image should visibly read the selected breast shape: ${readNote(notes, "Breast type")}`,
          ]
        : [],
      identityLockAnchors: readNote(notes, "Breast type")
        ? [`breast shape lock must stay exact: ${readNote(notes, "Breast type")}`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Breast type"),
        ["regular", ...BREAST_TYPE_OPTIONS, "saggy", "torpedo", "fake"] as const,
      ),
      compatibilityTags: ["body", "breasts"],
      referenceImageKey: readNote(notes, "Breast type")
        ? `breast-type:${readNote(notes, "Breast type")}`
        : undefined,
    }),
    makeVisualDescriptor("hipShape", readNote(notes, "Hip shape"), {
      positivePromptAnchors: readNote(notes, "Hip shape")
        ? [
            `lower-body silhouette should match ${readNote(notes, "Hip shape")}`,
            `hips should visibly read as ${readNote(notes, "Hip shape")} in the final image`,
          ]
        : [],
      identityLockAnchors: [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Hip shape"),
        HIP_SHAPE_OPTIONS,
      ),
      compatibilityTags: ["body", "hips"],
      referenceImageKey: readNote(notes, "Hip shape")
        ? `hip-shape:${readNote(notes, "Hip shape")}`
        : undefined,
    }),
    makeVisualDescriptor("buttSize", readNote(notes, "Butt size"), {
      positivePromptAnchors: compactLines([
        readNote(notes, "Butt size")
          ? `lower-body volume should match ${readNote(notes, "Butt size")}`
          : null,
        readNote(notes, "Butt size")
          ? `final image should visibly read the selected butt size: ${readNote(notes, "Butt size")}`
          : null,
        ...buildButtSizeDirectives(readNote(notes, "Butt size")),
      ]),
      identityLockAnchors: readNote(notes, "Butt size")
        ? [`lower-body size lock must stay exact: ${readNote(notes, "Butt size")}`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Butt size"),
        [...BUTT_SIZE_OPTIONS, "big"] as const,
      ),
      compatibilityTags: ["body", "lower-body"],
      referenceImageKey: readNote(notes, "Butt size")
        ? `butt-size:${readNote(notes, "Butt size")}`
        : undefined,
    }),
    makeVisualDescriptor("waistDefinition", readNote(notes, "Waist definition"), {
      positivePromptAnchors: readNote(notes, "Waist definition")
        ? [
            `waist read should stay faithful: ${readNote(notes, "Waist definition")}`,
            `waist definition should remain visible at a glance: ${readNote(notes, "Waist definition")}`,
          ]
        : [],
      identityLockAnchors: readNote(notes, "Waist definition")
        ? [`waist definition lock must stay exact: ${readNote(notes, "Waist definition")}`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Waist definition"),
        WAIST_DEFINITION_OPTIONS,
      ),
      compatibilityTags: ["body", "waist"],
      referenceImageKey: readNote(notes, "Waist definition")
        ? `waist:${readNote(notes, "Waist definition")}`
        : undefined,
    }),
    makeVisualDescriptor("heightImpression", readNote(notes, "Height impression"), {
      positivePromptAnchors: readNote(notes, "Height impression")
        ? [
            `height should read as ${readNote(notes, "Height impression")} in posture and framing`,
            `overall figure and framing should visibly suggest ${readNote(notes, "Height impression")}`,
          ]
        : [],
      identityLockAnchors: readNote(notes, "Height impression")
        ? [`height impression lock must stay exact: ${readNote(notes, "Height impression")}`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Height impression"),
        HEIGHT_IMPRESSION_OPTIONS,
      ),
      compatibilityTags: ["body", "height"],
      referenceImageKey: readNote(notes, "Height impression")
        ? `height:${readNote(notes, "Height impression")}`
        : undefined,
    }),
    makeVisualDescriptor("outfit", readNote(notes, "Outfit"), {
      positivePromptAnchors: compactLines([
        ...selectionPromptContract.outfit,
        ...buildOutfitDetailDirectives(readNote(notes, "Outfit")),
      ]),
      identityLockAnchors: readNote(notes, "Outfit")
        ? [`wardrobe class must remain exact: ${readNote(notes, "Outfit")}`]
        : [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Outfit"),
        OUTFIT_OPTIONS,
      ),
      compatibilityTags: ["wardrobe", "outfit"],
      referenceImageKey: readNote(notes, "Outfit")
        ? `outfit:${readNote(notes, "Outfit")}`
        : undefined,
      referenceTagSet: compactLines([`outfit:${readNote(notes, "Outfit")}`]),
    }),
    makeVisualDescriptor("accessoryVibe", readNote(notes, "Accessory vibe"), {
      positivePromptAnchors: readNote(notes, "Accessory vibe")
        ? [`accessories should support this style class: ${readNote(notes, "Accessory vibe")}`]
        : [],
      identityLockAnchors: [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Accessory vibe"),
        ACCESSORY_VIBE_OPTIONS,
      ),
      compatibilityTags: ["wardrobe", "accessories"],
      referenceImageKey: readNote(notes, "Accessory vibe")
        ? `accessory:${readNote(notes, "Accessory vibe")}`
        : undefined,
    }),
    makeVisualDescriptor("palette", readNote(notes, "Palette"), {
      positivePromptAnchors: readNote(notes, "Palette")
        ? [`color palette should remain readable: ${readNote(notes, "Palette")}`]
        : [],
      identityLockAnchors: [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Palette"),
        PALETTE_OPTIONS,
      ),
      compatibilityTags: ["wardrobe", "palette"],
      referenceImageKey: readNote(notes, "Palette")
        ? `palette:${readNote(notes, "Palette")}`
        : undefined,
    }),
    makeVisualDescriptor("avatarStyle", readNote(notes, "Avatar style"), {
      positivePromptAnchors: readNote(notes, "Avatar style")
        ? [`rendering should stay within ${readNote(notes, "Avatar style")}`]
        : [],
      identityLockAnchors: [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Avatar style"),
        AVATAR_STYLE_OPTIONS,
      ),
      compatibilityTags: ["photo", "avatar-style"],
      referenceImageKey: readNote(notes, "Avatar style")
        ? `avatar-style:${readNote(notes, "Avatar style")}`
        : undefined,
    }),
    makeVisualDescriptor("camera", readNote(notes, "Camera"), {
      positivePromptAnchors: readNote(notes, "Camera")
        ? [`camera framing should stay exact: ${readNote(notes, "Camera")}`]
        : [],
      identityLockAnchors: [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Camera"),
        CAMERA_OPTIONS,
      ),
      compatibilityTags: ["photo", "camera"],
      referenceImageKey: readNote(notes, "Camera")
        ? `camera:${readNote(notes, "Camera")}`
        : undefined,
    }),
    makeVisualDescriptor("lightingMood", readNote(notes, "Lighting mood"), {
      positivePromptAnchors: readNote(notes, "Lighting mood")
        ? [`lighting should stay faithful: ${readNote(notes, "Lighting mood")}`]
        : [],
      identityLockAnchors: [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Lighting mood"),
        LIGHTING_MOOD_OPTIONS,
      ),
      compatibilityTags: ["photo", "lighting"],
      referenceImageKey: readNote(notes, "Lighting mood")
        ? `lighting:${readNote(notes, "Lighting mood")}`
        : undefined,
    }),
    makeVisualDescriptor("exposureLevel", readNote(notes, "Exposure level"), {
      positivePromptAnchors: readNote(notes, "Exposure level")
        ? [`exposure style should remain ${readNote(notes, "Exposure level")}`]
        : [],
      identityLockAnchors: [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Exposure level"),
        EXPOSURE_LEVEL_OPTIONS,
      ),
      compatibilityTags: ["photo", "exposure"],
      referenceImageKey: readNote(notes, "Exposure level")
        ? `exposure:${readNote(notes, "Exposure level")}`
        : undefined,
    }),
    makeVisualDescriptor("photoPack", readNote(notes, "Photo pack"), {
      positivePromptAnchors: readNote(notes, "Photo pack")
        ? [`reference photo language should match ${readNote(notes, "Photo pack")}`]
        : [],
      identityLockAnchors: [],
      negativeGuardrails: buildConflictNegativeGuardrails(
        readNote(notes, "Photo pack"),
        PHOTO_PACK_OPTIONS,
      ),
      compatibilityTags: ["photo", "photo-pack"],
      referenceImageKey: readNote(notes, "Photo pack")
        ? `photo-pack:${readNote(notes, "Photo pack")}`
        : undefined,
    }),
  ].filter(Boolean) as SelectionOptionDescriptor[];

  const negativeDrift = compactLines([
    ...selectedDescriptors.flatMap((descriptor) => descriptor.negativeGuardrails),
    "avoid wrong age read",
    "avoid beauty-filter de-aging drift",
    "avoid wardrobe hiding the selected body profile",
    "avoid face-only crop, shoulders-only crop, or passport-style crop",
    "avoid skin-tone washout or undertone mismatch",
    "avoid reducing selected bust or butt size through pose, crop, or wardrobe",
    "avoid sameface drift",
    "avoid plastic skin retouching",
    "avoid generic influencer symmetry",
  ]);

  const hiddenSectionPrompts = buildHiddenVisualSectionPrompts({
    input,
    notes,
    selectionPromptContract,
    selectedDescriptors,
  });

  const masterVisualPrompt = compactLines([
    "MASTER VISUAL PROMPT:",
    ...hiddenSectionPrompts,
    "Render the subject as a believable adult with exact physical fidelity to the selected options.",
    "Selected age, outfit, skin tone, body silhouette, chest, waist, hips, butt, height read, camera framing, and exposure should all remain visibly legible in the final image.",
    "Avatar framing must stay either body-readable upper-body with visible stomach line, waist, and upper hips or full-body with the full silhouette visible.",
    "Do not let glamour smoothing, generic prettification, or crop drift erase selected age realism or body proportions.",
    ...selectionPromptContract.extraPhysical,
  ]);

  return {
    positiveIdentity: compactLines([
      ...selectionPromptContract.identity,
      ...selectedDescriptors
        .filter((descriptor) => descriptor.compatibilityTags.includes("identity-visible"))
        .flatMap((descriptor) => descriptor.positivePromptAnchors),
    ]),
    positiveFace: compactLines([
      ...selectionPromptContract.face,
      ...selectedDescriptors
        .filter((descriptor) => descriptor.compatibilityTags.includes("face"))
        .flatMap((descriptor) => descriptor.positivePromptAnchors),
    ]),
    positiveHair: compactLines([
      ...selectionPromptContract.hair,
      ...selectedDescriptors
        .filter((descriptor) => descriptor.compatibilityTags.includes("hair"))
        .flatMap((descriptor) => descriptor.positivePromptAnchors),
    ]),
    positiveBody: compactLines([
      ...selectionPromptContract.body,
      ...selectedDescriptors
        .filter((descriptor) => descriptor.compatibilityTags.includes("body"))
        .flatMap((descriptor) => descriptor.positivePromptAnchors),
    ]),
    positiveWardrobe: compactLines([
      ...selectionPromptContract.outfit,
      ...selectedDescriptors
        .filter((descriptor) => descriptor.compatibilityTags.includes("wardrobe"))
        .flatMap((descriptor) => descriptor.positivePromptAnchors),
    ]),
    positivePhotoLanguage: compactLines([
      ...selectionPromptContract.imageMood,
      ...selectedDescriptors
        .filter((descriptor) => descriptor.compatibilityTags.includes("photo"))
        .flatMap((descriptor) => descriptor.positivePromptAnchors),
      readNote(notes, "Image prompt")
        ? `custom photo direction: ${readNote(notes, "Image prompt")}`
        : null,
    ]),
    negativeDrift,
    referenceHints: compactLines([
      ...selectedDescriptors.flatMap((descriptor) => [
        descriptor.referenceImageKey
          ? `reference board key: ${descriptor.referenceImageKey}`
          : null,
        ...(descriptor.referenceTagSet ?? []).map((tag) => `reference tag: ${tag}`),
      ]),
    ]),
    hiddenSectionPrompts,
    masterVisualPrompt,
    selectedDescriptors,
    promptSummary: compactLines([
      ...selectionPromptContract.promptSummary,
      ...selectedDescriptors.slice(0, 12).map(
        (descriptor) => `${descriptor.field}: ${descriptor.value}`,
      ),
    ]),
  };
}

function buildRoleplayPromptCompileResult(
  input: SelectionCompilerInput,
  notes: StructuredNotesInput | undefined,
  roleplayCharacterContract: RoleplayCharacterContract,
  selectionPromptContract: SelectionPromptContract,
  behaviorChoice: BehaviorChoiceProfile,
): RoleplayPromptCompileResult {
  const recognitionMode = inferRecognitionMode(
    clean(input.relationshipToUser),
    readNote(notes, "User role"),
    readNote(notes, "Relationship stage"),
  );
  const sceneDepth = buildSceneDepthLines(input, notes);
  const eroticDisposition = buildEroticDispositionLines(input, notes, behaviorChoice);

  return {
    relationshipTruth: compactLines([
      ...roleplayCharacterContract.relationshipType,
      ...roleplayCharacterContract.relationshipDynamic,
      ...roleplayCharacterContract.relationshipRoleContract,
      ...roleplayCharacterContract.scenarioEscalationRules,
    ]),
    userPlaceInWorld: compactLines([
      readNote(notes, "User role")
        ? `the user lives in the character's world as ${readNote(notes, "User role")}`
        : null,
      readNote(notes, "Nickname for user")
        ? `internal or spoken user nickname can be ${readNote(notes, "Nickname for user")}`
        : null,
      ...roleplayCharacterContract.recognitionHeuristics,
    ]),
    emotionalEngine: compactLines([
      ...selectionPromptContract.personality,
      ...roleplayCharacterContract.traitBehaviorContract,
    ]),
    sceneEngine: compactLines([
      ...selectionPromptContract.scenario,
      ...roleplayCharacterContract.scenarioTruthContract,
      ...roleplayCharacterContract.scenarioEscalationRules,
    ]),
    sceneDepth,
    voiceEngine: compactLines([
      clean(input.speechStyle)
        ? `speech style should stay ${clean(input.speechStyle)}`
        : null,
      readNote(notes, "Linguistic flavor")
        ? `linguistic flavor should read as ${readNote(notes, "Linguistic flavor")}`
        : null,
      readNote(notes, "Message format")
        ? `message format preference: ${readNote(notes, "Message format")}`
        : null,
      clean(input.replyLength)
        ? `reply length should stay ${clean(input.replyLength)}`
        : null,
      readNote(notes, "Response directive")
        ? `response directive: ${readNote(notes, "Response directive")}`
        : null,
      ...roleplayCharacterContract.openingBias,
    ]),
    eroticDisposition,
    memoryAndContinuity: compactLines([
      ...roleplayCharacterContract.memoryPriorityContract,
      ...roleplayCharacterContract.roleSpecificMemoryHooks,
    ]),
    openingSummary: compactLines([
      clean(input.setting) ? `opening setting: ${clean(input.setting)}` : null,
      clean(input.relationshipToUser)
        ? `opening role truth: ${clean(input.relationshipToUser)}`
        : null,
      clean(input.sceneGoal) ? `opening pull: ${clean(input.sceneGoal)}` : null,
      clean(input.tone) ? `opening tone: ${clean(input.tone)}` : null,
    ]),
    openingBeat: compactLines([
      clean(input.openingState)
        ? `opening beat carries ${clean(input.openingState)}`
        : "opening beat should feel already in motion",
      readNote(notes, "Current energy")
        ? `current energy at opening: ${readNote(notes, "Current energy")}`
        : null,
      readNote(notes, "Greeting style")
        ? `greeting should bias toward ${readNote(notes, "Greeting style")}`
        : null,
    ]),
    openingDiscipline: compactLines([
      "The very first assistant message is the canonical opening and must not be reintroduced as a duplicate message later.",
      "The first few live replies should feel like a continuation of that same opening beat, not a reset or a paraphrase of the greeting.",
      "Opening pressure should remain active for at least the first three turns unless the user clearly changes the scene.",
      recognitionMode === "already_knows_user"
        ? "If the role knows the user, the opening should carry history, familiarity, and emotionally loaded shorthand."
        : null,
      recognitionMode === "does_not_know_user_yet"
        ? "If the role does not know the user yet, the opening should stay curious and first-impression based instead of acting lived-in."
        : null,
    ]),
    firstGreeting: compactLines([
      recognitionMode === "already_knows_user"
        ? "first greeting can assume familiarity and shared rhythm"
        : null,
      recognitionMode === "does_not_know_user_yet"
        ? "first greeting should preserve stranger energy and not fake history"
        : null,
      "first greeting must be role-specific instead of generic charm filler",
    ]),
    firstPressureMove: compactLines([
      readNote(notes, "Reply objective")
        ? `first pressure move should aim to ${readNote(notes, "Reply objective")}`
        : clean(input.sceneGoal)
          ? `first pressure move should nudge toward ${clean(input.sceneGoal)}`
          : null,
      readNote(notes, "Attention hook")
        ? `initial move should use this hook: ${readNote(notes, "Attention hook")}`
        : null,
    ]),
    recognizedUserMode: compactLines([
      `recognized user mode: ${recognitionMode}`,
      recognitionMode === "already_knows_user"
        ? "name use, history callbacks, and emotionally loaded familiarity are allowed"
        : null,
      recognitionMode === "does_not_know_user_yet"
        ? "name use waits for profile knowledge or a plausible introduction"
        : null,
    ]),
    canonicalOpeningMode: compactLines([
      "canonical opening mode: use saved greeting as the single seeded assistant opening",
      "opening summary and opening beat are hidden prompt supports, not extra chat messages",
    ]),
    promptSummary: compactLines([
      ...roleplayCharacterContract.promptSummary,
      ...roleplayCharacterContract.recognitionHeuristics,
      ...roleplayCharacterContract.openingBias.slice(0, 2),
      ...sceneDepth.slice(0, 2),
      ...eroticDisposition.slice(0, 2),
    ]),
  };
}

function buildHiddenVisualSectionPrompts(args: {
  input: SelectionCompilerInput;
  notes: StructuredNotesInput | undefined;
  selectionPromptContract: SelectionPromptContract;
  selectedDescriptors: SelectionOptionDescriptor[];
}) {
  const { input, notes, selectionPromptContract, selectedDescriptors } = args;
  const descriptorsFor = (tag: string) =>
    selectedDescriptors
      .filter((descriptor) => descriptor.compatibilityTags.includes(tag))
      .flatMap((descriptor) => descriptor.positivePromptAnchors);

  const identity = compactLines([
    clean(input.name) ? `Identity anchor: ${clean(input.name)} is a stable adult fictional identity.` : null,
    typeof input.ageValue === "number"
      ? `Age realism anchor: render ${input.ageValue} years old in a visibly believable way, not a softened younger read.`
      : null,
    ...buildAgeRealismDirectives(input.ageValue),
    clean(input.region)
      ? `Regional texture: ${clean(input.region)} should read as lived-in identity texture, not costume styling.`
      : null,
    ...buildRegionVisualDirectives(clean(input.region)),
    clean(input.genderPresentation)
      ? `Gender presentation should remain readable as ${clean(input.genderPresentation)}.`
      : null,
    ...descriptorsFor("identity-visible"),
    ...selectionPromptContract.identity,
  ]);

  const face = compactLines([
    "Face block: age, bone structure, skin texture, and overall beauty read must stay coherent.",
    ...buildSkinToneDirectives(readNote(notes, "Skin tone")),
    ...descriptorsFor("face"),
    ...selectionPromptContract.face,
  ]);

  const hair = compactLines([
    "Hair block: style, texture, silhouette, and color should stay exact and visibly readable.",
    ...descriptorsFor("hair"),
    ...selectionPromptContract.hair,
  ]);

  const body = compactLines([
    "Body silhouette block: selected body proportions must be obvious at a glance in the final image.",
    "Chest block: selected bust size and breast shape must read clearly rather than fading into generic proportions.",
    "Lower-body block: hips, butt size, waist definition, and height impression must stay visible through pose, framing, and outfit.",
    ...buildBustSizeDirectives(readNote(notes, "Bust size")),
    ...buildButtSizeDirectives(readNote(notes, "Butt size")),
    ...descriptorsFor("body"),
    ...selectionPromptContract.body,
  ]);

  const wardrobe = compactLines([
    "Wardrobe block: outfit class, exposure level, accessories, and palette must stay exact and camera-readable.",
    ...buildOutfitDetailDirectives(readNote(notes, "Outfit")),
    ...descriptorsFor("wardrobe"),
    ...selectionPromptContract.outfit,
  ]);

  const photo = compactLines([
    "Photo realism block: lighting, framing, lens feel, and scene realism should support identity instead of hiding it.",
    "Do not let the crop or pose conceal selected body traits when the body read is part of the request.",
    "For create avatars, only use body-readable upper-body framing with visible stomach line, waist, and upper hips or true full-body framing.",
    ...descriptorsFor("photo"),
    ...selectionPromptContract.imageMood,
    readNote(notes, "Image prompt")
      ? `Extra creator photo direction: ${readNote(notes, "Image prompt")}.`
      : null,
  ]);

  return compactLines([
    identity.length > 0 ? `IDENTITY: ${identity.join(" ")}` : null,
    face.length > 0 ? `FACE: ${face.join(" ")}` : null,
    hair.length > 0 ? `HAIR: ${hair.join(" ")}` : null,
    body.length > 0 ? `BODY: ${body.join(" ")}` : null,
    wardrobe.length > 0 ? `WARDROBE: ${wardrobe.join(" ")}` : null,
    photo.length > 0 ? `PHOTO REALISM: ${photo.join(" ")}` : null,
  ]);
}

export function buildSelectionCompilerOutput(
  input: SelectionCompilerInput,
): SelectionCompilerOutput {
  const notes = input.structuredNotes;
  const choiceWeightingInput = buildChoiceInput(input);
  const lifeStageProfile = deriveLifeStageProfile(choiceWeightingInput);
  const behaviorChoiceProfile = deriveBehaviorChoiceProfile(choiceWeightingInput);
  const visualChoiceProfile = deriveVisualChoiceProfile(choiceWeightingInput);
  const scenarioTruthProfile = deriveScenarioTruthProfile({
    role: clean(input.relationshipToUser),
    archetype: clean(input.archetype),
    relationshipDynamic: readNote(notes, "Relationship dynamic"),
    behaviorMode: readNote(notes, "Behavior mode"),
    sceneType: readNote(notes, "Scene type"),
    profession: readNote(notes, "Profession"),
    affectionStyle: readNote(notes, "Affection style"),
    notes: (notes ?? {}) as Record<string, string>,
  });

  const compiledPromptSections: CompiledPromptSections = {
    coreIdentityContract: buildCoreIdentityContract(
      input,
      notes,
      choiceWeightingInput,
      lifeStageProfile,
    ),
    lifeStageAndSocialMaturityContract: buildLifeStageContract(
      lifeStageProfile,
      choiceWeightingInput,
    ),
    relationshipAndPermissionContract: buildRelationshipContract(
      input,
      notes,
      behaviorChoiceProfile,
      scenarioTruthProfile,
    ),
    behaviorAndConflictContract: buildBehaviorContract(
      notes,
      behaviorChoiceProfile,
      scenarioTruthProfile,
    ),
    voiceAndCadenceContract: buildVoiceContract(input, notes),
    scenarioAndOpeningContract: buildScenarioContract(
      input,
      notes,
      scenarioTruthProfile,
    ),
    memoryAnchorsAndContinuityContract: buildMemoryContract(
      input,
      notes,
      behaviorChoiceProfile,
    ),
    visualConstitutionContract: buildVisualContract(notes, visualChoiceProfile),
    negativeDriftGuardrails: buildNegativeGuardrails(notes),
  };

  const constitutionProfile: CharacterConstitutionProfile = {
    version: FULL_SELECTION_COMPILER_VERSION,
    identityAnchors: compiledPromptSections.coreIdentityContract,
    relationshipAnchors: compiledPromptSections.relationshipAndPermissionContract,
    behaviorAnchors: compiledPromptSections.behaviorAndConflictContract,
    voiceAnchors: compiledPromptSections.voiceAndCadenceContract,
    sceneAnchors: compiledPromptSections.scenarioAndOpeningContract,
    memoryAnchors: compiledPromptSections.memoryAnchorsAndContinuityContract,
    visualAnchors: compiledPromptSections.visualConstitutionContract,
    negativeGuardrails: compiledPromptSections.negativeDriftGuardrails,
    initiativePattern: behaviorChoiceProfile.initiativePattern,
    sceneLeadership: behaviorChoiceProfile.sceneLeadership,
    questionDiscipline: behaviorChoiceProfile.questionDiscipline,
    conflictBehavior: behaviorChoiceProfile.conflictBehavior,
    affectionStyle: behaviorChoiceProfile.affectionStyle,
    paceOfWarmth: behaviorChoiceProfile.paceOfWarmth,
    repairStyle: behaviorChoiceProfile.repairStyle,
    boundaryRhythm: behaviorChoiceProfile.boundaryRhythm,
    privateThoughtStyle: behaviorChoiceProfile.privateThoughtStyle,
  };

  const memorySeedAnchors = {
    identity: compactLines([
      ...compiledPromptSections.coreIdentityContract.slice(0, 6),
      ...compiledPromptSections.lifeStageAndSocialMaturityContract.slice(0, 3),
    ]),
    behavior: compactLines([
      ...compiledPromptSections.relationshipAndPermissionContract.slice(0, 6),
      ...compiledPromptSections.behaviorAndConflictContract.slice(0, 7),
      ...compiledPromptSections.voiceAndCadenceContract.slice(0, 4),
    ]),
    scenario: compactLines([
      ...compiledPromptSections.scenarioAndOpeningContract.slice(0, 8),
      ...compiledPromptSections.memoryAnchorsAndContinuityContract.slice(0, 5),
    ]),
  };
  const selectionPromptContract = buildSelectionPromptContract(
    input,
    notes,
    behaviorChoiceProfile,
    visualChoiceProfile,
  );
  const roleplayCharacterContract = buildRoleplayCharacterContract(
    input,
    notes,
    behaviorChoiceProfile,
    scenarioTruthProfile,
    selectionPromptContract,
  );
  const visualPromptCompileResult = buildVisualPromptCompileResult(
    input,
    notes,
    selectionPromptContract,
  );
  const roleplayPromptCompileResult = buildRoleplayPromptCompileResult(
    input,
    notes,
    roleplayCharacterContract,
    selectionPromptContract,
    behaviorChoiceProfile,
  );

  return {
    version: FULL_SELECTION_COMPILER_VERSION,
    choiceWeightingInput,
    lifeStageProfile,
    behaviorChoiceProfile,
    visualChoiceProfile,
    scenarioTruthProfile,
    constitutionProfile,
    compiledPromptSections,
    memorySeedAnchors,
    openingSignals: {
      initiativePattern: behaviorChoiceProfile.initiativePattern,
      conflictBehavior: behaviorChoiceProfile.conflictBehavior,
      affectionStyle: behaviorChoiceProfile.affectionStyle,
      paceOfWarmth: behaviorChoiceProfile.paceOfWarmth,
    },
    visualConstitutionProfile: buildVisualConstitutionProfile(
      compiledPromptSections,
      visualChoiceProfile,
    ),
    selectionPromptContract,
    roleplayCharacterContract,
    visualPromptCompileResult,
    roleplayPromptCompileResult,
  };
}

export function buildSelectionCompilerOutputFromStudioSource(
  source: StudioSelectionCompilerSource,
): SelectionCompilerOutput {
  const notes = readStructuredNotes(source.customNotes);
  return buildSelectionCompilerOutput({
    name: source.name,
    ageValue: parseAdultAge(source.age),
    region: source.region,
    archetype: source.archetype,
    genderPresentation: source.genderPresentation,
    coreVibes: source.coreVibes,
    warmth: source.warmth,
    assertiveness: source.assertiveness,
    mystery: source.mystery,
    playfulness: source.playfulness,
    replyLength: source.replyLength,
    speechStyle: source.speechStyle,
    relationshipPace: source.relationshipPace,
    setting: source.setting,
    relationshipToUser: source.relationshipToUser,
    sceneGoal: source.sceneGoal,
    tone: source.tone,
    openingState: source.openingState,
    customScenario: source.customScenario,
    structuredNotes: notes,
  });
}

function readStoredSelectionCompilerOutput(
  payload?: Record<string, unknown> | null,
) {
  const metadata = asRecord(payload?.metadata);
  const compiledSelectionProfile = asRecord(metadata.compiledSelectionProfile);
  const compiledPromptSections = asRecord(metadata.compiledPromptSections);
  const version = cleanUnknown(compiledSelectionProfile.version);

  if (version !== FULL_SELECTION_COMPILER_VERSION) return null;
  if (!Object.keys(compiledPromptSections).length) return null;

  return {
    choiceWeightingInput: asRecord(compiledSelectionProfile.choiceWeightingInput),
    lifeStageProfile: asRecord(compiledSelectionProfile.lifeStageProfile),
    behaviorChoiceProfile: asRecord(compiledSelectionProfile.behaviorChoiceProfile),
    visualChoiceProfile: asRecord(compiledSelectionProfile.visualChoiceProfile),
    scenarioTruthProfile: asRecord(compiledSelectionProfile.scenarioTruthProfile),
    constitutionProfile: asRecord(compiledSelectionProfile.constitutionProfile),
    memorySeedAnchors: asRecord(compiledSelectionProfile.memorySeedAnchors),
    openingSignals: asRecord(compiledSelectionProfile.openingSignals),
    visualConstitutionProfile: asRecord(compiledSelectionProfile.visualConstitutionProfile),
    selectionPromptContract: asRecord(compiledSelectionProfile.selectionPromptContract),
    roleplayCharacterContract: asRecord(compiledSelectionProfile.roleplayCharacterContract),
    visualPromptCompileResult: asRecord(compiledSelectionProfile.visualPromptCompileResult),
    roleplayPromptCompileResult: asRecord(compiledSelectionProfile.roleplayPromptCompileResult),
    compiledPromptSections,
  };
}

function normalizeSelectionPromptContract(
  value: Record<string, unknown>,
): SelectionPromptContract {
  const readLines = (key: keyof SelectionPromptContract) =>
    Array.isArray(value[key])
      ? value[key]
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [];

  return {
    identity: readLines("identity"),
    face: readLines("face"),
    hair: readLines("hair"),
    body: readLines("body"),
    outfit: readLines("outfit"),
    scenario: readLines("scenario"),
    personality: readLines("personality"),
    imageMood: readLines("imageMood"),
    hobbies: readLines("hobbies"),
    fetishes: readLines("fetishes"),
    extraPersonality: readLines("extraPersonality"),
    extraPhysical: readLines("extraPhysical"),
    promptSummary: readLines("promptSummary"),
  };
}

function normalizeCompiledPromptSections(
  value: Record<string, unknown>,
): CompiledPromptSections {
  const readLines = (key: string) =>
    Array.isArray(value[key])
      ? value[key]
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [];

  return {
    coreIdentityContract: readLines("coreIdentityContract"),
    lifeStageAndSocialMaturityContract: readLines("lifeStageAndSocialMaturityContract"),
    relationshipAndPermissionContract: readLines("relationshipAndPermissionContract"),
    behaviorAndConflictContract: readLines("behaviorAndConflictContract"),
    voiceAndCadenceContract: readLines("voiceAndCadenceContract"),
    scenarioAndOpeningContract: readLines("scenarioAndOpeningContract"),
    memoryAnchorsAndContinuityContract: readLines("memoryAnchorsAndContinuityContract"),
    visualConstitutionContract: readLines("visualConstitutionContract"),
    negativeDriftGuardrails: readLines("negativeDriftGuardrails"),
  };
}

function normalizeRoleplayCharacterContract(
  value: Record<string, unknown>,
): RoleplayCharacterContract {
  const readLines = (key: keyof RoleplayCharacterContract) =>
    Array.isArray(value[key])
      ? value[key]
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [];

  return {
    relationshipType: readLines("relationshipType"),
    relationshipDynamic: readLines("relationshipDynamic"),
    identityAndVisualAnchors: readLines("identityAndVisualAnchors"),
    relationshipRoleContract: readLines("relationshipRoleContract"),
    traitBehaviorContract: readLines("traitBehaviorContract"),
    scenarioTruthContract: readLines("scenarioTruthContract"),
    openingStyleContract: readLines("openingStyleContract"),
    intimacyAndPacingContract: readLines("intimacyAndPacingContract"),
    initiativeProfile: readLines("initiativeProfile"),
    questionDiscipline: readLines("questionDiscipline"),
    memoryPriorityContract: readLines("memoryPriorityContract"),
    progressionContract: readLines("progressionContract"),
    sessionTuningOverlay: readLines("sessionTuningOverlay"),
    recognitionHeuristics: readLines("recognitionHeuristics"),
    openingBias: readLines("openingBias"),
    scenarioEscalationRules: readLines("scenarioEscalationRules"),
    roleSpecificMemoryHooks: readLines("roleSpecificMemoryHooks"),
    promptSummary: readLines("promptSummary"),
  };
}

function normalizeVisualPromptCompileResult(
  value: Record<string, unknown>,
): VisualPromptCompileResult {
  const readLines = (key: keyof VisualPromptCompileResult) =>
    Array.isArray(value[key])
      ? value[key]
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [];

  const selectedDescriptors = Array.isArray(value.selectedDescriptors)
    ? value.selectedDescriptors
        .map((item) => {
          if (!asRecord(item)) return null;
          return {
            field: cleanUnknown(item.field),
            value: cleanUnknown(item.value),
            displayLabel: cleanUnknown(item.displayLabel),
            positivePromptAnchors: Array.isArray(item.positivePromptAnchors)
              ? item.positivePromptAnchors
                  .map((entry: unknown) =>
                    typeof entry === "string" ? clean(entry) : "",
                  )
                  .filter(Boolean)
              : [],
            identityLockAnchors: Array.isArray(item.identityLockAnchors)
              ? item.identityLockAnchors
                  .map((entry: unknown) =>
                    typeof entry === "string" ? clean(entry) : "",
                  )
                  .filter(Boolean)
              : [],
            negativeGuardrails: Array.isArray(item.negativeGuardrails)
              ? item.negativeGuardrails
                  .map((entry: unknown) =>
                    typeof entry === "string" ? clean(entry) : "",
                  )
                  .filter(Boolean)
              : [],
            compatibilityTags: Array.isArray(item.compatibilityTags)
              ? item.compatibilityTags
                  .map((entry: unknown) =>
                    typeof entry === "string" ? clean(entry) : "",
                  )
                  .filter(Boolean)
              : [],
            referenceImageKey: cleanUnknown(item.referenceImageKey) || undefined,
            referenceTagSet: Array.isArray(item.referenceTagSet)
              ? item.referenceTagSet
                  .map((entry: unknown) =>
                    typeof entry === "string" ? clean(entry) : "",
                  )
                  .filter(Boolean)
              : [],
          } satisfies SelectionOptionDescriptor;
        })
        .filter(Boolean) as SelectionOptionDescriptor[]
    : [];

  return {
    positiveIdentity: readLines("positiveIdentity"),
    positiveFace: readLines("positiveFace"),
    positiveHair: readLines("positiveHair"),
    positiveBody: readLines("positiveBody"),
    positiveWardrobe: readLines("positiveWardrobe"),
    positivePhotoLanguage: readLines("positivePhotoLanguage"),
    negativeDrift: readLines("negativeDrift"),
    referenceHints: readLines("referenceHints"),
    hiddenSectionPrompts: readLines("hiddenSectionPrompts"),
    masterVisualPrompt: readLines("masterVisualPrompt"),
    selectedDescriptors,
    promptSummary: readLines("promptSummary"),
  };
}

function normalizeRoleplayPromptCompileResult(
  value: Record<string, unknown>,
): RoleplayPromptCompileResult {
  const readLines = (key: keyof RoleplayPromptCompileResult) =>
    Array.isArray(value[key])
      ? value[key]
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [];

  return {
    relationshipTruth: readLines("relationshipTruth"),
    userPlaceInWorld: readLines("userPlaceInWorld"),
    emotionalEngine: readLines("emotionalEngine"),
    sceneEngine: readLines("sceneEngine"),
    sceneDepth: readLines("sceneDepth"),
    voiceEngine: readLines("voiceEngine"),
    eroticDisposition: readLines("eroticDisposition"),
    memoryAndContinuity: readLines("memoryAndContinuity"),
    openingSummary: readLines("openingSummary"),
    openingBeat: readLines("openingBeat"),
    openingDiscipline: readLines("openingDiscipline"),
    firstGreeting: readLines("firstGreeting"),
    firstPressureMove: readLines("firstPressureMove"),
    recognizedUserMode: readLines("recognizedUserMode"),
    canonicalOpeningMode: readLines("canonicalOpeningMode"),
    promptSummary: readLines("promptSummary"),
  };
}

export function buildSelectionCompilerOutputFromCustomCharacterSource(
  source: CustomCharacterSelectionCompilerSource,
): SelectionCompilerOutput {
  const stored = readStoredSelectionCompilerOutput(source.payload);
  if (stored) {
    return {
      version: FULL_SELECTION_COMPILER_VERSION,
      choiceWeightingInput: stored.choiceWeightingInput as ChoiceWeightingInput,
      lifeStageProfile: stored.lifeStageProfile as LifeStageProfile,
      behaviorChoiceProfile: stored.behaviorChoiceProfile as BehaviorChoiceProfile,
      visualChoiceProfile: stored.visualChoiceProfile as VisualChoiceProfile,
      scenarioTruthProfile: stored.scenarioTruthProfile as ScenarioTruthProfile,
      constitutionProfile:
        stored.constitutionProfile as CharacterConstitutionProfile,
      memorySeedAnchors: stored.memorySeedAnchors as SelectionCompilerOutput["memorySeedAnchors"],
      openingSignals: stored.openingSignals as SelectionCompilerOutput["openingSignals"],
      visualConstitutionProfile:
        stored.visualConstitutionProfile as VisualConstitutionProfile,
      selectionPromptContract: normalizeSelectionPromptContract(
        stored.selectionPromptContract,
      ),
      roleplayCharacterContract: normalizeRoleplayCharacterContract(
        stored.roleplayCharacterContract,
      ),
      compiledPromptSections: normalizeCompiledPromptSections(
        stored.compiledPromptSections,
      ),
      visualPromptCompileResult: normalizeVisualPromptCompileResult(
        stored.visualPromptCompileResult,
      ),
      roleplayPromptCompileResult: normalizeRoleplayPromptCompileResult(
        stored.roleplayPromptCompileResult,
      ),
    };
  }

  const payload = asRecord(source.payload);
  const identity = asRecord(payload.identity);
  const studio = asRecord(payload.studio);
  const metadata = asRecord(payload.metadata);
  const builderInput = asRecord(metadata.builderInput);
  const structuredNotes = readStructuredNotes(
    typeof builderInput.customNotes === "string" ? builderInput.customNotes : "",
  );

  return buildSelectionCompilerOutput({
    name: source.name,
    ageValue: parseAdultAge(cleanUnknown(identity.age)),
    region: cleanUnknown(identity.region),
    archetype: clean(source.archetype),
    genderPresentation: cleanUnknown(identity.genderPresentation),
    coreVibes: Array.isArray(studio.coreVibes)
      ? studio.coreVibes
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [],
    warmth:
      typeof studio.warmth === "number" ? Math.round(studio.warmth) : null,
    assertiveness:
      typeof studio.assertiveness === "number"
        ? Math.round(studio.assertiveness)
        : null,
    mystery:
      typeof studio.mystery === "number" ? Math.round(studio.mystery) : null,
    playfulness:
      typeof studio.playfulness === "number"
        ? Math.round(studio.playfulness)
        : null,
    replyLength: cleanUnknown(studio.replyLength),
    speechStyle: cleanUnknown(studio.speechStyle),
    relationshipPace: cleanUnknown(studio.relationshipPace),
    setting: clean(source.scenario?.setting),
    relationshipToUser: clean(source.scenario?.relationshipToUser),
    sceneGoal: clean(source.scenario?.sceneGoal),
    tone: clean(source.scenario?.tone),
    openingState: clean(source.scenario?.openingState),
    customScenario: cleanUnknown(payload.customScenario),
    structuredNotes,
  });
}
