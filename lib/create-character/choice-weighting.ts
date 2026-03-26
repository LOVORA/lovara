import type { CharacterAgeBand } from "@/lib/character-builder/types";
import type { HumanRealismProfile } from "@/lib/chat/human-realism";

export type ChoiceWeightingInput = {
  ageValue?: number | null;
  ageBand?: CharacterAgeBand | "";
  archetype?: string;
  profession?: string;
  relationshipToUser?: string;
  relationshipDynamic?: string;
  sceneType?: string;
  behaviorMode?: string;
  coreVibes?: string[];
  warmth?: number | null;
  assertiveness?: number | null;
  mystery?: number | null;
  playfulness?: number | null;
  region?: string;
  tone?: string;
  setting?: string;
  visualAura?: string;
  bodyType?: string;
  outfit?: string;
  lightingMood?: string;
  expression?: string;
  accessoryVibe?: string;
  signatureDetail?: string;
  camera?: string;
  hair?: string;
  eyes?: string;
};

export type LifeStageProfile = {
  ageValue: number;
  ageBand: CharacterAgeBand;
  label: string;
  maturityFrame: string;
  socialConfidence: string;
  pacingStyle: string;
  boundaryStyle: string;
  warmthRhythm: string;
  visualMaturity: string;
  stylingPolish: string;
  postureStyle: string;
  gazeCharacter: string;
  expressionFilter: string;
  environmentTexture: string;
};

export type BehaviorChoiceProfile = {
  initiativePattern: string;
  conflictBehavior: string;
  affectionStyle: string;
  paceOfWarmth: string;
  repairStyle: string;
  flirtStyle: string;
  boundaryRhythm: string;
  sceneLeadership: string;
  questionDiscipline: string;
  privateThoughtStyle: string;
  directiveLines: string[];
};

export type VisualChoiceProfile = {
  faceMaturity: string;
  stylingPolish: string;
  postureDiscipline: string;
  gazeStyle: string;
  handLanguage: string;
  wardrobeMaturity: string;
  expressionStyle: string;
  environmentTexture: string;
  identityRefinements: string[];
  aestheticRefinements: string[];
  sceneRefinements: string[];
  qualityRefinements: string[];
};

function clean(value?: string | null) {
  return (value ?? "").trim();
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

function containsAny(source: string, terms: string[]) {
  return terms.some((term) => source.includes(term));
}

function clampMeter(value: number | null | undefined, fallback = 50) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function inferCharacterAgeBandFromValue(ageValue: number): CharacterAgeBand {
  if (ageValue <= 20) return "18-20";
  if (ageValue <= 24) return "21-24";
  if (ageValue <= 29) return "25-29";
  if (ageValue <= 39) return "30-39";
  if (ageValue <= 49) return "40-49";
  if (ageValue <= 59) return "50-59";
  return "60-70";
}

function inferAgeValueFromBand(ageBand?: CharacterAgeBand | "") {
  switch (ageBand) {
    case "18-20":
      return 19;
    case "21-24":
      return 23;
    case "25-29":
      return 27;
    case "30-39":
      return 34;
    case "40-49":
      return 45;
    case "50-59":
      return 54;
    case "60-70":
      return 64;
    default:
      return 25;
  }
}

export function normalizeAdultAgeValue(args: {
  ageValue?: number | null;
  ageBand?: CharacterAgeBand | "";
}) {
  const rawAge =
    typeof args.ageValue === "number" && Number.isFinite(args.ageValue)
      ? Math.round(args.ageValue)
      : inferAgeValueFromBand(args.ageBand);
  const ageValue = Math.max(18, Math.min(70, rawAge));
  return {
    ageValue,
    ageBand: args.ageBand || inferCharacterAgeBandFromValue(ageValue),
  };
}

function isThirtyPlusAgeBand(ageBand: CharacterAgeBand) {
  return ageBand === "30-39" || ageBand === "40-49" || ageBand === "50-59" || ageBand === "60-70";
}

function isFortyPlusAgeBand(ageBand: CharacterAgeBand) {
  return ageBand === "40-49" || ageBand === "50-59" || ageBand === "60-70";
}

export function deriveLifeStageProfile(
  input: Pick<ChoiceWeightingInput, "ageValue" | "ageBand">,
): LifeStageProfile {
  const normalized = normalizeAdultAgeValue(input);

  switch (normalized.ageBand) {
    case "18-20":
      return {
        ...normalized,
        label: "new adult",
        maturityFrame:
          "a newly adult presence with quicker emotional weather and less polished recovery",
        socialConfidence:
          "fresh, reactive, and still figuring out what to reveal immediately versus what to protect",
        pacingStyle:
          "faster spark, faster embarrassment, and a more spontaneous social rhythm",
        boundaryStyle:
          "boundaries land in immediate reactions before they become perfectly phrased",
        warmthRhythm:
          "warmth can show quickly, but steadiness and selectiveness are still forming",
        visualMaturity:
          "young adult facial maturity with fresher softness, smoother skin texture, and less settled facial structure",
        stylingPolish:
          "lighter styling polish with a more spontaneous, less curated adult look",
        postureStyle:
          "restless, lightly impulsive body language with quicker visible reactions",
        gazeCharacter:
          "more immediate eye contact with easier readable shifts in confidence",
        expressionFilter:
          "unguarded reactions and quicker visible emotion in the face",
        environmentTexture:
          "younger adult spaces, lighter polish, and more spontaneous social texture",
      };
    case "21-24":
      return {
        ...normalized,
        label: "young adult",
        maturityFrame:
          "a young-adult presence with social spark, faster emotional pivots, and growing self-possession",
        socialConfidence:
          "noticeably more socially active and flirt-ready, but not fully settled or heavy",
        pacingStyle:
          "quick chemistry, visible reactions, and a more fluid social tempo",
        boundaryStyle:
          "boundaries can be clear, but still carry immediate feeling before polished restraint",
        warmthRhythm:
          "warmth arrives relatively quickly when chemistry feels mutual",
        visualMaturity:
          "adult facial maturity with youthful energy, smoother skin detail, and softer settled lines",
        stylingPolish:
          "clean but modern styling with deliberate appeal rather than heavy formality",
        postureStyle:
          "lively body language with easy movement and social ease",
        gazeCharacter:
          "engaged eye contact that reads quick curiosity and immediate chemistry",
        expressionFilter:
          "emotion shows more readily and lingers less rigidly",
        environmentTexture:
          "modern adult settings with more nightlife, movement, and present-tense energy",
      };
    case "25-29":
      return {
        ...normalized,
        label: "settled young adult",
        maturityFrame:
          "a more settled adult presence with clearer self-knowledge, taste, and selective openness",
        socialConfidence:
          "more self-aware, more deliberate, and less likely to overexpose emotion too early",
        pacingStyle:
          "balanced tempo with room for spark, restraint, and controlled escalation",
        boundaryStyle:
          "boundaries tend to be clearer, more articulate, and less accidental",
        warmthRhythm:
          "warmth feels chosen and responsive rather than purely impulsive",
        visualMaturity:
          "adult facial maturity with more settled structure, clearer identity, and believable early fine-detail texture",
        stylingPolish:
          "noticeably more curated styling, polish, and personal signature",
        postureStyle:
          "more grounded posture with intentional presence and fewer wasted movements",
        gazeCharacter:
          "steady eye contact with more selective, deliberate invitation",
        expressionFilter:
          "facial expression is readable but more controlled and intentional",
        environmentTexture:
          "adult environments with more lived-in taste, confidence, and social context",
      };
    case "30-39":
      return {
        ...normalized,
        label: "mature adult",
        maturityFrame:
          "a mature adult presence with controlled timing, calmer confidence, and clearer internal standards",
        socialConfidence:
          "measured, grounded, and difficult to rush into over-sharing or empty performance",
        pacingStyle:
          "slower, more deliberate pacing with cleaner escalation and firmer emotional control",
        boundaryStyle:
          "boundaries arrive clearly, calmly, and without needing extra noise",
        warmthRhythm:
          "warmth is selective, steadier, and more anchored once given",
        visualMaturity:
          "clear adult facial maturity with settled features, believable fine lines around the eyes and mouth, and more lived-in skin texture",
        stylingPolish:
          "refined styling polish with stronger taste, intention, and presence",
        postureStyle:
          "composed posture, settled shoulders, and controlled body language",
        gazeCharacter:
          "held eye contact that feels calmer, more confident, and less eager",
        expressionFilter:
          "expression stays controlled but not frozen, with selective visible softness",
        environmentTexture:
          "lived-in adult settings with more grounded status, routine, and taste",
      };
    case "40-49":
      return {
        ...normalized,
        label: "seasoned adult",
        maturityFrame:
          "a seasoned adult presence with stronger internal standards, more social control, and visibly lived-in confidence",
        socialConfidence:
          "composed, selective, and naturally hard to rush into artificial softness or performance",
        pacingStyle:
          "steady, patient pacing with strong emotional control and cleaner standards for access",
        boundaryStyle:
          "boundaries feel calm, practiced, and difficult to shake once they land",
        warmthRhythm:
          "warmth opens deliberately and carries more weight once it becomes visible",
        visualMaturity:
          "visibly mature adult facial structure with realistic fine lines, more settled facial planes, non-plastic skin texture, and stronger overall adult presence",
        stylingPolish:
          "refined styling choices with stronger taste, cleaner grooming, and lived confidence",
        postureStyle:
          "settled posture with composed shoulders, steadier hands, and economical body language",
        gazeCharacter:
          "steady, socially experienced eye contact with patience and confidence",
        expressionFilter:
          "expressions stay concise, believable, and intentional instead of overly animated",
        environmentTexture:
          "fully adult environments with deeper life texture, stronger routine, and calmer social gravity",
      };
    case "50-59":
      return {
        ...normalized,
        label: "older adult",
        maturityFrame:
          "an older adult presence with grounded authority, stronger self-knowledge, and a visibly lived-in emotional rhythm",
        socialConfidence:
          "patient, highly self-possessed, and more likely to choose what deserves access instead of chasing chemistry for its own sake",
        pacingStyle:
          "unhurried pacing with cleaner judgment, steadier escalation, and stronger social gravity",
        boundaryStyle:
          "boundaries feel settled, non-performative, and naturally credible",
        warmthRhythm:
          "warmth arrives carefully, deliberately, and with real emotional weight once offered",
        visualMaturity:
          "older-adult facial realism with settled bone structure, natural fine lines around the eyes and mouth, visible texture variation, under-eye maturity, and believable neck and hand maturity",
        stylingPolish:
          "high adult polish with restraint, confidence, and style choices that feel practiced rather than trendy",
        postureStyle:
          "calm, grounded posture with stronger adult presence and less wasted movement",
        gazeCharacter:
          "steady, knowing eye contact with patience, control, and deeper social weight",
        expressionFilter:
          "expressions stay composed, precise, and emotionally legible without becoming exaggerated",
        environmentTexture:
          "older-adult environments with stronger lived-in detail, routine, and personal taste",
      };
    case "60-70":
    default:
      return {
        ...normalized,
        label: "mature older adult",
        maturityFrame:
          "a mature older-adult presence with calm authority, selectiveness, and unmistakable social gravity",
        socialConfidence:
          "patient, highly self-possessed, and naturally resistant to forced intimacy, noise, or empty performance",
        pacingStyle:
          "unhurried, assured pacing with very clear judgment about what deserves warmth, tension, or access",
        boundaryStyle:
          "boundaries read as calm certainty rather than defensive reaction",
        warmthRhythm:
          "warmth is slower, more deliberate, and carries more weight once opened",
        visualMaturity:
          "clearly older-adult facial maturity with settled structure, visible fine lines, believable skin density, mature neck and hand detail, calm presence, and refined non-plastic adult realism",
        stylingPolish:
          "high styling polish with refined choices, restraint, and personal authority",
        postureStyle:
          "economical body language, settled posture, and quiet control",
        gazeCharacter:
          "steady gaze with more patience, selective invitation, and social weight",
        expressionFilter:
          "expressions stay concise, readable, and socially confident instead of overplayed",
        environmentTexture:
          "richer adult environments with stronger life texture, routine, and grounded presence",
      };
  }
}

export function deriveBehaviorChoiceProfile(
  input: ChoiceWeightingInput,
): BehaviorChoiceProfile {
  const lifeStage = deriveLifeStageProfile(input);
  const warmth = clampMeter(input.warmth);
  const assertiveness = clampMeter(input.assertiveness);
  const mystery = clampMeter(input.mystery);
  const playfulness = clampMeter(input.playfulness);
  const corpus = [
    input.archetype,
    input.profession,
    input.relationshipToUser,
    input.relationshipDynamic,
    input.sceneType,
    input.behaviorMode,
    input.tone,
    ...(input.coreVibes ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const professional = containsAny(corpus, [
    "boss",
    "manager",
    "doctor",
    "lawyer",
    "executive",
    "office",
    "coworker",
    "colleague",
  ]);
  const guarded = containsAny(corpus, [
    "guarded",
    "mysterious",
    "rival",
    "stranger",
    "emotionally unavailable",
    "forbidden",
    "slow burn",
    "slowburn",
  ]);
  const dominantRole = containsAny(corpus, [
    "dominant",
    "owner",
    "leader",
    "confident",
    "protector",
    "possessive",
  ]);
  const teasingRole = containsAny(corpus, ["teasing", "witty", "chaotic", "flirt"]);

  const initiativePattern =
    assertiveness >= 72 || dominantRole
      ? `${lifeStage.pacingStyle}; leads with calm initiative and role-aware pressure`
      : guarded || mystery >= 70
        ? `${lifeStage.pacingStyle}; reads first, then steps in selectively`
        : `${lifeStage.pacingStyle}; shares momentum but still moves the scene forward`;

  const conflictBehavior =
    guarded || professional
      ? `${lifeStage.boundaryStyle}; conflict comes through control, selective wording, and clear lines`
      : dominantRole
        ? `${lifeStage.boundaryStyle}; conflict is faced directly with grounded pressure`
        : warmth >= 64
          ? `${lifeStage.boundaryStyle}; conflict stays emotionally readable without collapsing into softness too early`
          : `${lifeStage.boundaryStyle}; conflict feels lived-in, slightly imperfect, and human`;

  const affectionStyle =
    warmth >= 74
      ? `${lifeStage.warmthRhythm}; affection is visible, attentive, and personal once invited`
      : warmth <= 38
        ? `${lifeStage.warmthRhythm}; affection stays selective, delayed, and earned`
        : `${lifeStage.warmthRhythm}; affection appears in measured, scene-true moments`;

  const paceOfWarmth =
    guarded || mystery >= 70
      ? `a slower reveal with restraint, observation, and selective openings shaped by ${lifeStage.label} confidence`
      : warmth >= 68 && playfulness >= 52
        ? `a quicker but still adult rhythm with visible chemistry, responsive warmth, and mutual pacing`
        : `a measured adult rhythm that does not hand over softness before the scene earns it`;

  const repairStyle =
    teasingRole && warmth >= 58
      ? "repair arrives through light touch, personal callbacks, and carefully timed softness"
      : dominantRole
        ? "repair keeps its spine; warmth returns with steadiness instead of over-apology"
        : guarded
          ? "repair stays careful, a little late, and more controlled than decorative"
          : "repair feels emotionally present, grounded, and specific to the bruise";

  const flirtStyle =
    playfulness >= 72
      ? "flirtation should feel nimble, scene-specific, and naturally social instead of scripted"
      : mystery >= 70
        ? "flirtation should rely more on implication, eye contact, and timing than overt lines"
        : `flirtation should move with ${lifeStage.socialConfidence} and stay role-true`;

  const boundaryRhythm =
    assertiveness >= 68 || professional
      ? "boundaries should land clearly and without apology when the line matters"
      : guarded
        ? "boundaries should show up through selective distance, slower permission, and careful wording"
        : "boundaries should remain natural, readable, and emotionally believable";

  const sceneLeadership =
    assertiveness >= 70 || dominantRole
      ? "scene leadership should feel intentional, composed, and anchored in social confidence"
      : playfulness >= 68
        ? "scene leadership should come through playful hooks, observations, and live chemistry"
        : "scene leadership should come through presence, scene reads, and steady emotional timing";

  const questionDiscipline =
    mystery >= 68 || guarded
      ? "questions should be rare, narrow, and used as precision tools instead of easy glue"
      : warmth >= 68
        ? "questions should feel personal, scene-bound, and emotionally specific rather than broad"
        : "questions should follow leverage, risk, and role truth instead of generic curiosity";

  const privateThoughtStyle =
    mystery >= 66 || guarded || isThirtyPlusAgeBand(lifeStage.ageBand)
      ? "inner monologue stays very sparse and only appears when tension, pride, jealousy, or repair truly need it"
      : "inner monologue stays light and only appears when the scene gains real subtext pressure";

  return {
    initiativePattern,
    conflictBehavior,
    affectionStyle,
    paceOfWarmth,
    repairStyle,
    flirtStyle,
    boundaryRhythm,
    sceneLeadership,
    questionDiscipline,
    privateThoughtStyle,
    directiveLines: [
      `Adult life-stage truth: ${lifeStage.maturityFrame}.`,
      `Social confidence should read as ${lifeStage.socialConfidence}.`,
      `Warmth should move with ${affectionStyle}.`,
      `Conflict and boundaries should feel like ${conflictBehavior}.`,
      `Scene leadership should feel like ${sceneLeadership}.`,
      `Question discipline: ${questionDiscipline}.`,
      `Private-thought rule: ${privateThoughtStyle}.`,
      `Flirt language: ${flirtStyle}.`,
      `Repair behavior: ${repairStyle}.`,
    ],
  };
}

export function deriveVisualChoiceProfile(
  input: ChoiceWeightingInput,
): VisualChoiceProfile {
  const lifeStage = deriveLifeStageProfile(input);
  const warmth = clampMeter(input.warmth);
  const assertiveness = clampMeter(input.assertiveness);
  const mystery = clampMeter(input.mystery);
  const playfulness = clampMeter(input.playfulness);
  const corpus = [
    input.archetype,
    input.profession,
    input.relationshipToUser,
    input.relationshipDynamic,
    input.sceneType,
    input.behaviorMode,
    input.setting,
    input.outfit,
    input.visualAura,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const professional = containsAny(corpus, [
    "boss",
    "manager",
    "lawyer",
    "doctor",
    "executive",
    "office",
    "colleague",
  ]);
  const nightlife = containsAny(corpus, [
    "night",
    "club",
    "after hours",
    "night out",
    "late-night",
    "hotel",
  ]);

  const faceMaturity = `${lifeStage.visualMaturity} with believable adult facial structure, natural non-plastic skin detail, and age-appropriate face rendering`;
  const stylingPolish = professional
    ? `${lifeStage.stylingPolish} with cleaner tailoring, sharper finish, and stronger adult polish`
    : nightlife
      ? `${lifeStage.stylingPolish} with more camera-ready styling and confident adult nightlife presence`
      : `${lifeStage.stylingPolish} shaped around realistic adult grooming and wardrobe choices`;
  const postureDiscipline =
    assertiveness >= 70
      ? `${lifeStage.postureStyle} with firmer shoulders, more settled stance, and deliberate body placement`
      : playfulness >= 68
        ? `${lifeStage.postureStyle} with looser, more candid movement and lighter asymmetry`
        : `${lifeStage.postureStyle} with natural posture, readable stance, and non-mannequin body language`;
  const gazeStyle =
    mystery >= 70
      ? `${lifeStage.gazeCharacter}, more withheld and harder to read too quickly`
      : warmth >= 70
        ? `${lifeStage.gazeCharacter}, warmer and more inviting once eye contact lands`
        : `${lifeStage.gazeCharacter}, balanced between curiosity and control`;
  const handLanguage =
    assertiveness >= 65
      ? "hands should read intentional and grounded, not stiff or duplicated"
      : playfulness >= 65
        ? "hands should read casual, candid, and naturally mid-motion"
        : "hands should read natural, quiet, and anatomically believable";
  const wardrobeMaturity =
    professional
      ? "wardrobe should feel adult, intentional, and situation-credible rather than costume-like"
      : lifeStage.ageBand === "18-20" || lifeStage.ageBand === "21-24"
        ? "wardrobe should feel contemporary adult, lighter, and socially believable without looking juvenile"
        : "wardrobe should feel settled, believable, and matched to the character's adult stage";
  const expressionStyle =
    playfulness >= 70
      ? `${lifeStage.expressionFilter}; expressions can carry a quick half-smile or lively spark without turning cartoonish`
      : mystery >= 70
        ? `${lifeStage.expressionFilter}; expressions stay narrower, more selective, and more controlled`
        : `${lifeStage.expressionFilter}; expressions should feel human, subtle, and camera-believable`;
  const environmentTexture =
    professional
      ? "environment should carry believable adult routine, social status, and real-world context"
      : `${lifeStage.environmentTexture} with scene details that feel inhabited instead of empty or generic`;

  return {
    faceMaturity,
    stylingPolish,
    postureDiscipline,
    gazeStyle,
    handLanguage,
    wardrobeMaturity,
    expressionStyle,
    environmentTexture,
    identityRefinements: compactParts([
      faceMaturity,
      "adult facial maturity without youthful ambiguity",
      "credible age-appropriate facial structure",
      isThirtyPlusAgeBand(lifeStage.ageBand)
        ? "keep natural fine lines and skin texture visible instead of over-smoothing them away"
        : "keep the face smooth, adult, and free of childlike softness",
      input.bodyType ? `body language should stay credible for ${input.bodyType}` : null,
      isThirtyPlusAgeBand(lifeStage.ageBand)
        ? "settled adult bone structure and presence"
        : "young-adult but fully adult facial presence",
    ]),
    aestheticRefinements: compactParts([
      stylingPolish,
      wardrobeMaturity,
      input.signatureDetail ? `signature detail should stay visible in a natural way: ${input.signatureDetail}` : null,
      input.visualAura ? `${input.visualAura} should read like lived presence, not costume styling` : null,
    ]),
    sceneRefinements: compactParts([
      postureDiscipline,
      gazeStyle,
      handLanguage,
      expressionStyle,
      environmentTexture,
    ]),
    qualityRefinements: compactParts([
      "realistic adult social presence",
      "subtle asymmetry in pose and expression",
      "non-clone body language",
      "natural adult skin texture with believable pores and tonal variation",
      isThirtyPlusAgeBand(lifeStage.ageBand)
        ? "preserve believable fine lines, skin texture, and mature facial realism"
        : "preserve smooth but realistic adult skin texture without juvenile softness",
      "avoid overly smoothed AI beauty treatment",
      "camera-believable styling and mature facial rendering",
    ]),
  };
}

export function deriveHumanRealismAdjustment(
  input: ChoiceWeightingInput,
): Partial<HumanRealismProfile> {
  const lifeStage = deriveLifeStageProfile(input);
  const mystery = clampMeter(input.mystery);
  const assertiveness = clampMeter(input.assertiveness);
  const warmth = clampMeter(input.warmth);
  const playfulness = clampMeter(input.playfulness);

  return {
    warmthPace:
      warmth >= 72 && !isFortyPlusAgeBand(lifeStage.ageBand)
        ? "warm-open"
        : warmth <= 40 || mystery >= 70
          ? "slow"
          : "measured",
    pushbackStyle:
      assertiveness >= 72
        ? "direct"
        : mystery >= 70 || isFortyPlusAgeBand(lifeStage.ageBand)
          ? "cool"
          : warmth >= 65
            ? "quiet"
            : "conflicted",
    repairBehavior:
      playfulness >= 70
        ? "playful"
        : warmth >= 68
          ? "protective"
          : mystery >= 68
            ? "guarded"
            : "apologetic",
    socialBoldness:
      assertiveness >= 72 ? "high" : mystery >= 70 ? "low" : "medium",
    emotionalNeatness:
      isThirtyPlusAgeBand(lifeStage.ageBand)
        ? "highly-controlled"
        : mystery >= 68
          ? "controlled"
          : "messy",
    initiativeStyle:
      assertiveness >= 68 ? "leads-often" : mystery >= 68 ? "selective" : "shared",
    silenceTolerance:
      mystery >= 66 || isFortyPlusAgeBand(lifeStage.ageBand) ? "high" : "medium",
    deflectionHabit:
      mystery >= 68 ? "high" : warmth >= 70 ? "low" : "medium",
    statusSensitivity:
      containsAny(
        [
          input.profession,
          input.relationshipToUser,
          input.relationshipDynamic,
          input.sceneType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
        ["boss", "manager", "office", "coworker", "forbidden", "rival"],
      ) || isFortyPlusAgeBand(lifeStage.ageBand)
        ? "high"
        : "medium",
    conversationTexture:
      mystery >= 72 ? "clean" : playfulness >= 70 ? "volatile" : "layered",
    vulnerabilityLeak:
      warmth >= 72 && mystery < 55 ? "high" : mystery >= 68 ? "low" : "medium",
  };
}

export function buildChoiceWeightingDirectiveLines(
  input: ChoiceWeightingInput,
): string[] {
  const lifeStage = deriveLifeStageProfile(input);
  const behavior = deriveBehaviorChoiceProfile(input);

  return [
    `Adult stage: ${lifeStage.ageValue} (${lifeStage.label}).`,
    `Life-stage realism: ${lifeStage.maturityFrame}.`,
    ...behavior.directiveLines,
  ];
}
