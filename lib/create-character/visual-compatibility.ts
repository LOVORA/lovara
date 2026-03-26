import {
  REFERENCE_REALISM_NEGATIVE_ANCHORS,
  REFERENCE_REALISM_POSITIVE_ANCHORS,
} from "@/lib/create-character/reference-realism";

type VisualCompatibilityArgs = {
  profession?: string | null;
  outfit?: string | null;
  setting?: string | null;
  sceneType?: string | null;
  relationshipToUser?: string | null;
  relationshipDynamic?: string | null;
  behaviorMode?: string | null;
  customScenario?: string | null;
  genderPresentation?: string | null;
  bodyType?: string | null;
  bustSize?: string | null;
  breastType?: string | null;
  buttSize?: string | null;
};

type ProfessionRule = {
  match: string[];
  background: string;
  wardrobe: string;
  cue: string;
};

type OutfitRule = {
  match: string[];
  background: string;
  cue: string;
};

const PROFESSION_RULES: ProfessionRule[] = [
  {
    match: ["teacher", "professor", "tutor", "lecturer"],
    background: "private study corner, home office desk, or quiet tutoring room",
    wardrobe: "teacher-appropriate smart casual styling",
    cue: "books, desk details, or campus context kept subtle",
  },
  {
    match: ["boss", "executive", "manager", "ceo", "assistant", "lawyer", "attorney"],
    background: "modern office, home office, or desk-side interior",
    wardrobe: "office-ready professional styling",
    cue: "workplace context should read clearly without overpowering the subject",
  },
  {
    match: ["doctor", "nurse", "medical", "therapist", "surgeon", "dentist"],
    background: "clean clinic, consultation room, or medical workspace",
    wardrobe: "clean practical styling compatible with a medical role",
    cue: "subtle medical workspace cues only",
  },
  {
    match: ["trainer", "fitness", "coach", "athlete", "yoga", "pilates", "dancer"],
    background: "bright gym, workout room, or wellness studio",
    wardrobe: "activewear or movement-ready fitted styling",
    cue: "fitness environment should feel real and functional",
  },
  {
    match: ["chef", "cook", "baker", "barista", "waitress", "server", "hostess"],
    background: "kitchen, cafe, bakery, or restaurant interior",
    wardrobe: "service-role or kitchen-friendly styling",
    cue: "food-service setting should feel lived-in and believable",
  },
  {
    match: ["student", "college", "university"],
    background: "study nook, dorm corner, campus walkway, or casual apartment interior",
    wardrobe: "young-adult casual styling that fits campus life",
    cue: "study or campus cues should stay subtle and realistic",
  },
  {
    match: ["artist", "painter", "writer", "designer", "photographer", "musician"],
    background: "creative studio, desk setup, or art-filled workspace",
    wardrobe: "creative off-duty styling with believable personality",
    cue: "creative tools or workspace hints can appear subtly",
  },
  {
    match: ["streamer", "gamer", "creator", "influencer", "model"],
    background: "modern apartment, content room, vanity area, or city street",
    wardrobe: "camera-aware lifestyle styling",
    cue: "content-ready environment without glossy fashion-shoot excess",
  },
  {
    match: ["maid", "housekeeper", "babysitter", "nanny"],
    background: "clean domestic interior, family home, or tidy apartment living space",
    wardrobe: "domestic-role styling compatible with the selected outfit",
    cue: "home setting should stay grounded and believable",
  },
];

const OUTFIT_RULES: OutfitRule[] = [
  {
    match: ["office", "boss", "teacher", "suit", "uniform"],
    background: "believable professional or institutional interior",
    cue: "wardrobe should look context-aware and profession-compatible",
  },
  {
    match: ["gymwear", "sports bra", "activewear", "yoga", "leggings"],
    background: "gym, training room, or wellness studio",
    cue: "wardrobe and location should read as movement-ready",
  },
  {
    match: ["swimwear", "bikini"],
    background: "poolside, terrace, beachside, or bright resort-adjacent setting",
    cue: "wardrobe should fit a believable warm-weather scene",
  },
  {
    match: ["hoodie", "jeans", "shirt", "crop top", "casual"],
    background: "street, apartment, cafe, or lived-in casual setting",
    cue: "wardrobe should read as natural everyday styling",
  },
  {
    match: ["dress", "mini dress", "club dress", "bodysuit", "lingerie", "robe", "lace", "corset"],
    background: "bedroom corner, apartment interior, lounge, or warm private indoor setting",
    cue: "wardrobe should remain the visual focal point without looking costume-like",
  },
];

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function compact(parts: Array<string | null | undefined | false>) {
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

function findProfessionRule(value: string) {
  const lowered = value.toLowerCase();
  return PROFESSION_RULES.find((rule) =>
    rule.match.some((token) => lowered.includes(token)),
  );
}

function findOutfitRule(value: string) {
  const lowered = value.toLowerCase();
  return OUTFIT_RULES.find((rule) =>
    rule.match.some((token) => lowered.includes(token)),
  );
}

export type VisualPromptCompatibility = {
  backgroundIntent: string;
  outfitIntent: string;
  roleCue: string;
  nudityMode: "covered" | "implied_nude" | "true_nude";
  faceBias: "neutral" | "soft_feminine";
  bodyReadPriority: "standard" | "high";
  promptAnchors: string[];
  sceneAnchors: string[];
  realismAnchors: string[];
  nudityAnchors: string[];
  faceAnchors: string[];
  negativeAnchors: string[];
};

function inferNudityMode(outfit: string) {
  if (!outfit) return "covered" as const;
  const lowered = outfit.toLowerCase();
  if (lowered.includes("implied nude")) return "implied_nude" as const;
  if (lowered.includes("nude")) return "true_nude" as const;
  return "covered" as const;
}

function inferFaceBias(genderPresentation: string) {
  const lowered = genderPresentation.toLowerCase();
  if (
    lowered.includes("feminine") ||
    lowered.includes("female") ||
    lowered.includes("woman") ||
    lowered.includes("girl")
  ) {
    return "soft_feminine" as const;
  }

  return "neutral" as const;
}

export function deriveVisualPromptCompatibility(
  args: VisualCompatibilityArgs,
): VisualPromptCompatibility {
  const profession = clean(args.profession);
  const outfit = clean(args.outfit);
  const setting = clean(args.setting);
  const sceneType = clean(args.sceneType);
  const relationshipToUser = clean(args.relationshipToUser);
  const relationshipDynamic = clean(args.relationshipDynamic);
  const behaviorMode = clean(args.behaviorMode);
  const customScenario = clean(args.customScenario);
  const genderPresentation = clean(args.genderPresentation);
  const bodyType = clean(args.bodyType);
  const bustSize = clean(args.bustSize);
  const breastType = clean(args.breastType);
  const buttSize = clean(args.buttSize);

  const professionRule = profession ? findProfessionRule(profession) : undefined;
  const outfitRule = outfit ? findOutfitRule(outfit) : undefined;
  const chosenSetting = sceneType || setting;
  const nudityMode = inferNudityMode(outfit);
  const faceBias = inferFaceBias(genderPresentation);
  const bodyReadPriority =
    nudityMode !== "covered" || bodyType || bustSize || breastType || buttSize
      ? ("high" as const)
      : ("standard" as const);
  const privateProfessionSetting =
    profession && professionRule
      ? `believable private interior with subtle ${profession.toLowerCase()} role cues`
      : profession
        ? `believable private interior with subtle cues of ${profession}`
        : "believable private interior";
  const resolvedBackgroundBase = chosenSetting
    ? chosenSetting
    : nudityMode === "covered"
      ? professionRule?.background || outfitRule?.background || "believable lifestyle setting"
      : profession
        ? privateProfessionSetting
        : outfitRule?.background || "believable private interior";
  const nudityAnchors =
    nudityMode === "true_nude"
      ? compact([
          "unclothed adult fictional woman",
          "full nude read must be visually clear",
          "no bra, no lingerie, no robe, no shirt, no dress, no underwear",
        ])
      : nudityMode === "implied_nude"
        ? compact([
            "strategically covered implied nudity",
            "coverage may come from pose, crop, hair, arm, object, or sheet",
            "fully nude read is forbidden",
          ])
        : compact([
            outfit ? `exact wardrobe class must remain ${outfit}` : null,
            "wardrobe read must remain stable across variations",
          ]);
  const faceAnchors =
    faceBias === "soft_feminine"
      ? compact([
          "soft feminine adult face",
          "smooth facial transitions",
          "gentle jawline with feminine cheek and eye area",
          "pretty beauty-first but realistic adult face",
        ])
      : [];
  const negativeAnchors = compact([
    ...REFERENCE_REALISM_NEGATIVE_ANCHORS,
    nudityMode === "true_nude"
      ? "bra, lingerie, robe, shirt straps, dress remnants, underwear edges"
      : null,
    nudityMode === "implied_nude"
      ? "fully nude, complete unclothed full reveal"
      : null,
    faceBias === "soft_feminine" ? "masculine facial structure" : null,
    faceBias === "soft_feminine" ? "hard jawline" : null,
    faceBias === "soft_feminine" ? "coarse facial planes" : null,
    faceBias === "soft_feminine" ? "overly angular face" : null,
    faceBias === "soft_feminine" ? "harsh brow ridge" : null,
    faceBias === "soft_feminine" ? "rugged face" : null,
    bodyReadPriority === "high" ? "cropped torso" : null,
    bodyReadPriority === "high" ? "obscured waist line" : null,
  ]);

  const backgroundIntent = compact([
    resolvedBackgroundBase
      ? `background should read as ${resolvedBackgroundBase}`
      : null,
    professionRule?.background
      ? nudityMode === "covered"
        ? `profession-compatible environment: ${professionRule.background}`
        : `use private setting logic while keeping subtle profession readability for ${profession}`
      : null,
    profession
      ? `the setting must visually support the selected profession: ${profession}`
      : null,
  ]).join(", ");

  const outfitIntent = compact([
    nudityMode === "true_nude"
      ? "selected outfit mode must remain true nude with no clothing or underwear added"
      : nudityMode === "implied_nude"
        ? "selected outfit mode must remain implied nude with strategic coverage only and no full nude escalation"
        : outfit
          ? `selected outfit must remain exactly ${outfit}`
          : null,
    profession && outfit
      ? nudityMode === "covered"
        ? `style the selected outfit in a way that still feels believable for ${profession}`
        : `keep the selected outfit logic while solving profession cues through background and scene context for ${profession}`
      : null,
    !outfit && professionRule?.wardrobe
      ? `wardrobe should read as ${professionRule.wardrobe}`
      : null,
    outfitRule?.cue,
  ]).join(", ");

  const roleCue = compact([
    profession ? `profession cue: ${profession}` : null,
    professionRule?.cue,
    relationshipToUser
      ? `relationship context: ${relationshipToUser}`
      : null,
    relationshipDynamic
      ? `relationship dynamic: ${relationshipDynamic}`
      : null,
    behaviorMode ? `behavior mode: ${behaviorMode}` : null,
    customScenario ? `custom scenario context: ${customScenario}` : null,
  ]).join(", ");

  const promptAnchors = compact([
    profession ? `selected profession: ${profession}` : null,
    outfit ? `selected outfit: ${outfit}` : null,
    backgroundIntent,
    outfitIntent,
    roleCue,
    chosenSetting ? `scene intent: ${chosenSetting}` : null,
    bodyReadPriority === "high"
      ? "body details must stay clearly readable through upper-body or full-body framing"
      : null,
    ...nudityAnchors,
    ...faceAnchors,
  ]);

  const sceneAnchors = compact([
    backgroundIntent,
    outfitIntent,
    roleCue,
    "background should feel lived-in, believable, and role-compatible",
    "wardrobe and background must support the same story instead of conflicting",
    bodyReadPriority === "high"
      ? "torso, waist, hips, and outfit read should stay visible in frame"
      : null,
    ...nudityAnchors,
  ]);

  const realismAnchors = compact([
    ...REFERENCE_REALISM_POSITIVE_ANCHORS,
    "realistic lifestyle photo instead of glossy editorial styling",
    "believable environment logic with practical lighting and real-world scale",
    "natural wardrobe fit, natural materials, and grounded room context",
    "natural indoor daylight or practical room light with soft flattering contrast",
    "natural skin rendering and believable facial structure with no waxy finish",
    "simple lived-in background depth with believable apartment, office, gym, or street scale",
    profession || chosenSetting || outfit
      ? "selected profession, outfit, and setting should all read clearly in the image"
      : null,
    ...faceAnchors,
  ]);

  return {
    backgroundIntent,
    outfitIntent,
    roleCue,
    nudityMode,
    faceBias,
    bodyReadPriority,
    promptAnchors,
    sceneAnchors,
    realismAnchors,
    nudityAnchors,
    faceAnchors,
    negativeAnchors,
  };
}
