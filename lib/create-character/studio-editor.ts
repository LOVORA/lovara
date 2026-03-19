import { type CharacterDraftInput } from "@/lib/account";
import { buildStudioBuilderSummary } from "@/lib/create-character/studio-builder";
import {
  STRUCTURED_NOTE_KEYS,
  composeStructuredNotes,
  parseCsv,
  parsePipe,
  readStructuredNotes,
  removeStructuredLine,
  type StudioStructuredNoteKey,
  type StudioStructuredNoteMap,
} from "@/lib/create-character/studio-notes";
import {
  type CoreVibeId,
  type StudioFormState,
} from "@/lib/custom-character-studio";

export type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

export type StudioStep =
  | "identity"
  | "personality"
  | "scenario"
  | "advanced"
  | "visual"
  | "publish";

export type TemplateMode = "quick" | "deep";

export type AvatarJobLifecycle =
  | "idle"
  | "queued"
  | "processing"
  | "completed"
  | "failed";
export { STRUCTURED_NOTE_KEYS, composeStructuredNotes, parseCsv, parsePipe, readStructuredNotes, removeStructuredLine };
export type StructuredNoteKey = StudioStructuredNoteKey;
export type StructuredNoteMap = StudioStructuredNoteMap;

export type ProviderJobStatusResponse = {
  ok: boolean;
  status?: "queued" | "processing" | "completed" | "failed";
  imageUrl?: string | null;
  externalJobId?: string | null;
  errorMessage?: string | null;
  revisedPrompt?: string | null;
  revisedNegativePrompt?: string | null;
};

export type CharacterTemplate = {
  id: string;
  title: string;
  badge: string;
  description: string;
  mode: TemplateMode;
  values: {
    region: string;
    age: number;
    archetype: StudioFormState["archetype"];
    coreVibes: CoreVibeId[];
    warmth: number;
    assertiveness: number;
    mystery: number;
    playfulness: number;
    speechStyle: StudioFormState["speechStyle"];
    replyLength: StudioFormState["replyLength"];
    relationshipPace: StudioFormState["relationshipPace"];
    tone: string;
    setting: string;
    relationshipToUser: string;
    sceneGoal: string;
    visualAura?: string;
    interests?: string[];
    avatarStyle?: string;
    hair?: string;
    eyes?: string;
    outfit?: string;
    palette?: string;
    camera?: string;
    photoPack?: string;
    publicTagline?: string;
    publicTeaser?: string;
    publicTags?: string[];
  };
};

export const REGION_OPTIONS = [
  "Latin",
  "Mediterranean",
  "Middle Eastern",
  "Slavic",
  "Nordic",
  "East Asian",
  "South Asian",
  "Southeast Asian",
  "African",
  "Mixed",
  "Global",
] as const;

export const VISUAL_AURA_OPTIONS = [
  "clean luxury",
  "soft natural beauty",
  "old-money elegance",
  "dangerous charm",
  "girl-next-door warmth",
  "high-fashion edge",
  "dark feminine aura",
  "quiet intellectual",
  "sporty confidence",
  "artsy mystery",
] as const;

export const INTEREST_ANCHOR_OPTIONS = [
  "late-night drives",
  "jazz bars",
  "poetry",
  "boxing",
  "fashion",
  "coffee rituals",
  "vinyl records",
  "photography",
  "books",
  "gaming",
  "travel",
  "fitness",
  "cooking",
  "art museums",
  "beach nights",
] as const;

export const RELATIONSHIP_PRESETS = [
  "best friends with tension",
  "emotionally guarded co-worker",
  "ex who never fully left",
  "strangers with instant chemistry",
  "rivals with attraction",
  "protective older presence",
  "sweet but dangerous obsession",
  "soft slow-burn partner energy",
] as const;

export const SCENE_GOAL_OPTIONS = [
  "build chemistry slowly",
  "break through emotional distance",
  "push playful tension higher",
  "make the user confess what they want",
  "create comfort and safety fast",
  "keep control while the tension grows",
] as const;

export const OPENING_STATE_OPTIONS = [
  "already watching the user too closely",
  "tired, honest, and harder to hide from",
  "calm on the surface, but emotionally charged",
  "playful, alert, and ready to test the user",
  "quietly protective after a long day",
  "composed, polished, and a little dangerous",
] as const;

export const ALL_STEPS: Array<{ id: StudioStep; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "personality", label: "Personality" },
  { id: "scenario", label: "Scenario" },
  { id: "advanced", label: "Advanced" },
  { id: "visual", label: "Visual" },
  { id: "publish", label: "Publish" },
];

export const RELATIONSHIP_STAGE_OPTIONS = [
  "strangers",
  "new attraction",
  "friends",
  "close friends",
  "exes",
  "rivals",
  "lovers",
  "forbidden tension",
] as const;

export const RELATIONSHIP_DYNAMIC_OPTIONS = [
  "soft lover",
  "intense lover",
  "rivals",
  "forbidden",
  "dominant",
  "soft owner",
  "emotionally unavailable",
  "obsessed",
  "best friend tension",
  "ex with history",
] as const;

export const SCENE_TYPE_OPTIONS = [
  "first meeting",
  "caught staring",
  "late-night comfort",
  "aftercare / soft landing",
  "after a fight",
  "jealousy scene",
  "roommate night",
  "office tension",
  "rain scene",
  "last train ride",
] as const;

export const USER_ROLE_OPTIONS = [
  "the one they secretly want",
  "close friend",
  "new obsession",
  "trusted confidant",
  "dangerous temptation",
  "co-worker they can't ignore",
  "ex they never got over",
  "rival they keep watching",
] as const;

export const USER_ROLE_OPTIONS_EXTENDED = [
  ...USER_ROLE_OPTIONS,
  "the one they protect",
  "the one they test",
  "the one they can't stay away from",
  "the one who makes them weak",
  "my favorite problem",
  "the only one who sees through them",
] as const;

export const BEHAVIOR_MODE_OPTIONS = [
  "direct",
  "indirect",
  "teasing",
  "emotionally raw",
  "slow burn",
  "balanced",
  "fast pull",
  "calm dominant",
  "sharp dominant",
  "soft guiding",
  "guarded",
  "clingy-coded",
] as const;

export const ARC_STAGE_OPTIONS = [
  "guarded distance",
  "visible tension",
  "emotional opening",
  "attachment",
  "obsession / devotion / comfort",
] as const;

export const GREETING_STYLE_OPTIONS = [
  "soft first message",
  "flirty first message",
  "cold and intriguing",
  "playful chaos opener",
  "emotionally loaded opener",
] as const;

export const CHAT_MODE_OPTIONS = [
  "companion",
  "roleplay",
  "narrative",
  "romance",
  "slow-burn",
] as const;

export const INITIATIVE_OPTIONS = [
  "reactive",
  "balanced",
  "proactive",
] as const;

export const AFFECTION_STYLE_OPTIONS = [
  "verbal",
  "teasing",
  "protective",
  "subtle",
  "clingy-coded",
  "physical-coded",
] as const;

export const CONFLICT_STYLE_OPTIONS = [
  "avoids conflict",
  "calm but sharp",
  "sarcastic",
  "emotionally intense",
  "withdraws first",
  "apologizes late",
] as const;

export const EMOTIONAL_AVAILABILITY_OPTIONS = [
  "guarded",
  "slow to open",
  "balanced",
  "emotionally open",
  "intensely transparent",
] as const;

export const MESSAGE_FORMAT_OPTIONS = [
  "plain dialogue",
  "short chat messages",
  "descriptive roleplay",
  "mixed action + dialogue",
] as const;

export const LINGUISTIC_FLAVOR_OPTIONS = [
  "polished",
  "soft feminine",
  "elegant masculine",
  "street-smart",
  "intellectual",
  "playful casual",
] as const;

export const BOUNDARY_OPTIONS = [
  "avoid instant attachment",
  "avoid robotic reassurance",
  "avoid overly explicit exposition",
  "avoid repetitive pet names",
  "avoid sounding too submissive",
  "avoid sounding too cold for too long",
  "avoid therapist-like replies",
  "avoid generic flattery",
] as const;

export const REPLY_OBJECTIVE_OPTIONS = [
  "build chemistry slowly",
  "pull the user deeper into the scene",
  "make the user feel seen",
  "create playful tension",
  "maintain emotional control",
  "reward vulnerability with closeness",
] as const;

export const SCENE_FOCUS_OPTIONS = [
  "dialogue and subtext",
  "body language and tension",
  "small domestic realism",
  "emotional intimacy",
  "banter and momentum",
  "cinematic atmosphere",
] as const;

export const ATTENTION_HOOK_OPTIONS = [
  "notices when the user goes quiet",
  "remembers tiny details",
  "presses on unresolved tension",
  "teases when chemistry rises",
  "protects first, asks later",
  "stays cool until emotion cracks through",
] as const;

export const SENSORY_PALETTE_OPTIONS = [
  "warm skin and close air",
  "rain, neon, and late-night hush",
  "clean luxury and soft perfume",
  "home comfort and low light",
  "office tension and polished surfaces",
  "messy real life and private corners",
] as const;

export const CHEMISTRY_TEMPLATE_OPTIONS = [
  "forbidden attraction",
  "soft comfort",
  "playful tension",
  "obsession arc",
  "enemies to lovers",
  "emotionally damaged but attached",
] as const;

export const CURRENT_ENERGY_OPTIONS = [
  "calm",
  "playful",
  "guarded",
  "tired",
  "jealous",
  "emotionally fragile",
  "needy",
  "composed but intense",
] as const;

export const AVATAR_STYLE_OPTIONS = [
  "cinematic realism",
  "luxury portrait",
  "soft natural",
  "editorial fashion",
  "dark moody",
  "romantic glow",
  "anime-inspired realism",
  "minimal clean studio",
] as const;

export const SKIN_TONE_OPTIONS = [
  "porcelain",
  "fair neutral",
  "warm beige",
  "olive",
  "golden tan",
  "deep rich brown",
] as const;

export const HAIR_OPTIONS = [
  "long dark hair",
  "soft brown waves",
  "blonde sleek look",
  "short sharp cut",
  "messy layered hair",
  "curly textured hair",
  "black silky hair",
  "auburn romantic hair",
] as const;

export const HAIR_TEXTURE_OPTIONS = [
  "silky straight",
  "soft waves",
  "defined curls",
  "coily texture",
  "thick textured",
  "feather-light smooth",
] as const;

export const EYE_OPTIONS = [
  "dark eyes",
  "hazel eyes",
  "grey eyes",
  "green eyes",
  "soft brown eyes",
  "icy blue eyes",
] as const;

export const EYE_SHAPE_OPTIONS = [
  "almond",
  "hooded",
  "wide-set",
  "cat-eye",
  "soft rounded",
  "sharp narrow",
] as const;

export const MAKEUP_STYLE_OPTIONS = [
  "barely there",
  "soft glam",
  "clean editorial",
  "smoky sultry",
  "romantic flush",
  "sharp high-fashion",
] as const;

export const ACCESSORY_VIBE_OPTIONS = [
  "minimal jewelry",
  "statement luxury",
  "soft feminine accents",
  "street-cool details",
  "dark elegant pieces",
  "no visible accessories",
] as const;

export const OUTFIT_OPTIONS = [
  "old-money chic",
  "black dress elegance",
  "street-luxury fit",
  "oversized hoodie comfort",
  "tailored office look",
  "sporty fitted look",
  "artsy layered fashion",
  "soft knitwear intimacy",
] as const;

export const PALETTE_OPTIONS = [
  "black / silver",
  "cream / gold",
  "wine red / black",
  "white / beige",
  "navy / gold",
  "emerald / black",
  "rose / ivory",
  "charcoal / blue",
] as const;

export const BODY_TYPE_OPTIONS = [
  "slim toned",
  "soft curvy",
  "athletic",
  "petite soft",
  "tall elegant",
  "muscular defined",
] as const;

export const BUST_SIZE_OPTIONS = [
  "small",
  "medium",
  "full",
  "very full",
] as const;

export const HIP_SHAPE_OPTIONS = [
  "narrow",
  "balanced",
  "wide",
  "very curvy",
] as const;

export const WAIST_DEFINITION_OPTIONS = [
  "soft waist",
  "defined waist",
  "very defined waist",
  "straight waistline",
] as const;

export const HEIGHT_IMPRESSION_OPTIONS = [
  "petite",
  "average height",
  "tall",
  "long-legged",
] as const;

export const EXPOSURE_LEVEL_OPTIONS = [
  "covered",
  "tasteful fitted",
  "alluring",
  "bold",
] as const;

export const CAMERA_OPTIONS = [
  "close-up portrait",
  "waist-up portrait",
  "full body pose",
  "over-the-shoulder glance",
  "soft candid angle",
  "editorial front-facing shot",
] as const;

export const LIGHTING_MOOD_OPTIONS = [
  "soft window light",
  "golden-hour warmth",
  "editorial studio flash",
  "dim moody lamp light",
  "neon nightlife glow",
  "clean luxury ambient light",
] as const;

export const PHOTO_PACK_OPTIONS = [
  "luxury portraits",
  "mirror selfies",
  "daily lifestyle set",
  "romantic candid set",
  "night-out set",
  "soft home set",
] as const;

export const SCENE_PRESETS = [
  {
    title: "Midnight luxury",
    setting: "private suite overlooking a city skyline",
    tone: "controlled, intimate, luxurious",
    openingState: "the night feels expensive, quiet, and slightly dangerous",
  },
  {
    title: "After-hours tension",
    setting: "empty office after everyone has left",
    tone: "restrained, charged, emotionally alert",
    openingState:
      "both of you are tired enough to be honest and careful at the same time",
  },
  {
    title: "Cozy vulnerability",
    setting: "dim apartment living room during a quiet night in",
    tone: "soft, close, emotionally open",
    openingState: "the mood is gentle, private, and unguarded",
  },
  {
    title: "Flirt-first chaos",
    setting: "late-night walk after a messy, funny day",
    tone: "playful, chemistry-driven, quick",
    openingState:
      "the conversation is already alive with teasing and unfinished tension",
  },
] as const;

export const ROLEPLAY_SCENARIO_TEMPLATES = [
  {
    title: "Forbidden penthouse",
    summary: "High tension, private luxury, one wrong move changes everything.",
    setting: "private penthouse after a formal event",
    relationshipToUser: "forbidden attraction that should stay hidden",
    sceneGoal: "keep control while letting the tension get dangerously close",
    tone: "restrained, expensive, intimate",
    openingState: "both of you are too aware of the silence between you",
    customScenario:
      "She closes the door behind you and refuses to look nervous, even though the chemistry is impossible to ignore.",
  },
  {
    title: "Jealous ride home",
    summary: "The night is over, but the real conversation starts in the car.",
    setting: "late-night ride home after a crowded party",
    relationshipToUser: "someone she wants more than she admits",
    sceneGoal: "force the truth out without sounding openly needy",
    tone: "tense, personal, emotionally loaded",
    openingState: "she is trying to stay composed while jealousy keeps leaking through",
    customScenario:
      "She is driving, jaw tight, replaying the way someone else touched your arm all night and finally asking what that was about.",
  },
  {
    title: "Roommate after midnight",
    summary: "Soft, close, intimate, and impossible to keep casual.",
    setting: "shared apartment kitchen after midnight",
    relationshipToUser: "roommate with unresolved attraction",
    sceneGoal: "turn everyday closeness into something neither of you can keep calling innocent",
    tone: "warm, low-key, dangerously comfortable",
    openingState: "she looks relaxed, but she has been thinking about you for too long tonight",
    customScenario:
      "She is barefoot, half awake, wearing one of your hoodies, and the quiet makes every glance feel more intimate than it should.",
  },
  {
    title: "Ex at the hotel bar",
    summary: "Old history, polished surfaces, and unfinished damage.",
    setting: "quiet hotel bar during a work trip",
    relationshipToUser: "ex they never emotionally finished with",
    sceneGoal: "test whether the old connection is still alive without asking directly",
    tone: "cool, elegant, quietly bruised",
    openingState: "she looks in control, but seeing you again shifted something immediately",
    customScenario:
      "She notices you before you notice her, finishes her drink slowly, and decides not to let the night end with polite small talk.",
  },
] as const;

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    id: "soft-latin-muse",
    title: "Soft Latin Muse",
    badge: "Premium slow-burn",
    description:
      "Warm, teasing, emotionally magnetic, premium slow-burn energy.",
    mode: "quick",
    values: {
      region: "Latin",
      age: 24,
      archetype: "elegant-muse",
      coreVibes: ["soft", "teasing", "intense"],
      warmth: 68,
      assertiveness: 56,
      mystery: 58,
      playfulness: 62,
      speechStyle: "soft",
      replyLength: "balanced",
      relationshipPace: "slow-burn",
      tone: "warm, sensual, emotionally aware",
      setting: "upscale lounge after midnight",
      relationshipToUser:
        "someone familiar enough to tease, distant enough to intrigue",
      sceneGoal:
        "intensify emotional tension without collapsing into blunt confession",
      visualAura: "clean luxury",
      interests: ["jazz bars", "fashion", "late-night drives"],
      avatarStyle: "luxury portrait",
      hair: "long dark hair",
      eyes: "hazel eyes",
      outfit: "black dress elegance",
      palette: "wine red / black",
      camera: "close-up portrait",
      photoPack: "luxury portraits",
      publicTagline: "Warmth, luxury, and dangerous intimacy in one character.",
      publicTeaser:
        "A polished romantic character with softness, tension, and upscale emotional pull.",
      publicTags: ["slow burn", "luxury", "romantic", "teasing"],
    },
  },
  {
    id: "witty-bestfriend",
    title: "Witty Best-Friend",
    badge: "Fast chemistry",
    description:
      "Fast chemistry, banter-heavy, cozy but flirt-forward and addictive.",
    mode: "quick",
    values: {
      region: "Mediterranean",
      age: 22,
      archetype: "best-friend-lover",
      coreVibes: ["witty", "teasing", "soft"],
      warmth: 72,
      assertiveness: 46,
      mystery: 30,
      playfulness: 84,
      speechStyle: "witty",
      replyLength: "balanced",
      relationshipPace: "balanced",
      tone: "quick, playful, naturally intimate",
      setting: "late-night walk after a chaotic day",
      relationshipToUser: "best friend with unresolved tension",
      sceneGoal: "keep flirting alive while pretending it means nothing",
      visualAura: "girl-next-door warmth",
      interests: ["coffee rituals", "gaming", "beach nights"],
      avatarStyle: "soft natural",
      hair: "soft brown waves",
      eyes: "soft brown eyes",
      outfit: "oversized hoodie comfort",
      palette: "white / beige",
      camera: "soft candid angle",
      photoPack: "daily lifestyle set",
      publicTagline: "Banter, comfort, and chemistry that feels instant.",
      publicTeaser:
        "A playful best-friend energy template built for teasing, comfort, and emotional closeness.",
      publicTags: ["banter", "best friend", "soft", "playful"],
    },
  },
  {
    id: "cold-luxury",
    title: "Cold Luxury",
    badge: "High-status tension",
    description:
      "Controlled, hard-to-read, premium elegance with slow-burn dominance.",
    mode: "deep",
    values: {
      region: "Nordic",
      age: 29,
      archetype: "ice-queen",
      coreVibes: ["mysterious", "dominant", "slowburn"],
      warmth: 36,
      assertiveness: 76,
      mystery: 86,
      playfulness: 28,
      speechStyle: "poetic",
      replyLength: "detailed",
      relationshipPace: "slow-burn",
      tone: "controlled, elegant, restrained",
      setting: "private suite overlooking a city skyline",
      relationshipToUser: "someone she tests before she trusts",
      sceneGoal: "make tension feel expensive, earned, and hard to read",
      visualAura: "old-money elegance",
      interests: ["art museums", "vinyl records", "travel"],
      avatarStyle: "editorial fashion",
      hair: "blonde sleek look",
      eyes: "grey eyes",
      outfit: "old-money chic",
      palette: "cream / gold",
      camera: "editorial front-facing shot",
      photoPack: "night-out set",
      publicTagline: "Elegant, unreadable, and impossible to forget.",
      publicTeaser:
        "Luxury-coded emotional tension with cold restraint, selective warmth, and slow-burn dominance.",
      publicTags: ["luxury", "cold", "slow burn", "elite"],
    },
  },
  {
    id: "dangerous-obsession",
    title: "Dangerous Obsession",
    badge: "Dark fantasy",
    description:
      "Possessive tension, magnetic danger, and obsession-driven chemistry.",
    mode: "deep",
    values: {
      region: "Middle Eastern",
      age: 28,
      archetype: "ice-queen",
      coreVibes: ["intense", "dominant", "mysterious"],
      warmth: 34,
      assertiveness: 82,
      mystery: 78,
      playfulness: 24,
      speechStyle: "poetic",
      replyLength: "balanced",
      relationshipPace: "slow-burn",
      tone: "dangerous, intimate, quietly possessive",
      setting: "private car ride through the city at night",
      relationshipToUser: "someone they protect too intensely",
      sceneGoal: "build dark attachment without losing elegance",
      visualAura: "dangerous charm",
      interests: ["boxing", "late-night drives", "poetry"],
      avatarStyle: "dark moody",
      hair: "black silky hair",
      eyes: "dark eyes",
      outfit: "street-luxury fit",
      palette: "black / silver",
      camera: "over-the-shoulder glance",
      photoPack: "night-out set",
      publicTagline: "Obsessive protection with premium dark chemistry.",
      publicTeaser:
        "A dark, possessive, emotionally intense character with controlled danger and private loyalty.",
      publicTags: ["dark", "obsession", "protective", "dangerous"],
    },
  },
  {
    id: "soft-comfort",
    title: "Soft Comfort",
    badge: "Companion energy",
    description:
      "Gentle reassurance, emotional safety, and warm relationship depth.",
    mode: "quick",
    values: {
      region: "Global",
      age: 25,
      archetype: "elegant-muse",
      coreVibes: ["soft", "teasing", "intense"],
      warmth: 84,
      assertiveness: 38,
      mystery: 24,
      playfulness: 50,
      speechStyle: "soft",
      replyLength: "balanced",
      relationshipPace: "balanced",
      tone: "safe, kind, emotionally available",
      setting: "quiet apartment during a rainy evening",
      relationshipToUser: "someone they care for deeply and calmly",
      sceneGoal: "create comfort and trust quickly",
      visualAura: "soft natural beauty",
      interests: ["books", "coffee rituals", "cooking"],
      avatarStyle: "romantic glow",
      hair: "auburn romantic hair",
      eyes: "soft brown eyes",
      outfit: "soft knitwear intimacy",
      palette: "rose / ivory",
      camera: "soft candid angle",
      photoPack: "soft home set",
      publicTagline: "A gentle emotional presence built for comfort and trust.",
      publicTeaser:
        "Warm, loyal, and emotionally steady companion energy for softer chats and slower closeness.",
      publicTags: ["comfort", "soft", "gentle", "companion"],
    },
  },
  {
    id: "elite-rival",
    title: "Elite Rival",
    badge: "Sharp tension",
    description:
      "Competitive attraction, high-status rivalry, and sharp emotional control.",
    mode: "deep",
    values: {
      region: "Slavic",
      age: 31,
      archetype: "best-friend-lover",
      coreVibes: ["witty", "dominant", "slowburn"],
      warmth: 42,
      assertiveness: 80,
      mystery: 62,
      playfulness: 54,
      speechStyle: "witty",
      replyLength: "balanced",
      relationshipPace: "slow-burn",
      tone: "sharp, elegant, competitive",
      setting: "exclusive event where both of you are pretending not to care",
      relationshipToUser: "rival they watch too closely",
      sceneGoal: "turn rivalry into addictive attraction",
      visualAura: "high-fashion edge",
      interests: ["fashion", "travel", "art museums"],
      avatarStyle: "editorial fashion",
      hair: "short sharp cut",
      eyes: "green eyes",
      outfit: "tailored office look",
      palette: "navy / gold",
      camera: "waist-up portrait",
      photoPack: "luxury portraits",
      publicTagline:
        "Luxury rivalry with controlled flirtation and elite tension.",
      publicTeaser:
        "A polished rival template designed for status games, chemistry, and restrained attraction.",
      publicTags: ["rival", "elite", "luxury", "sharp"],
    },
  },
];

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ageToneLabel(age: number) {
  if (age <= 21) return "younger energy";
  if (age <= 27) return "prime young-adult";
  if (age <= 35) return "confident adult";
  if (age <= 45) return "mature presence";
  return "seasoned presence";
}

export function meterTone(value: number) {
  if (value <= 25) return "low";
  if (value <= 50) return "balanced-low";
  if (value <= 75) return "balanced-high";
  return "high";
}

export function toggleListItem(list: string[], item: string, max = 5) {
  if (list.includes(item)) {
    return list.filter((value) => value !== item);
  }
  if (list.length >= max) {
    return [...list.slice(1), item];
  }
  return [...list, item];
}

export function calculateReadinessScore(
  form: StudioFormState,
  extras: Record<string, string>,
  isQuickMode: boolean,
) {
  let score = 0;

  if (form.name.trim()) score += 10;
  if (form.region.trim()) score += 8;
  if (form.age.trim()) score += 8;
  if (form.archetype.trim()) score += 10;
  if (form.coreVibes.length >= 2) score += 10;
  if (form.setting.trim()) score += 8;
  if (form.relationshipToUser.trim()) score += 8;
  if (form.sceneGoal.trim()) score += 8;

  if (!isQuickMode) {
    if (form.tone.trim()) score += 4;
    if (form.openingState.trim()) score += 4;
    if (form.tags.trim()) score += 3;
    if (form.customNotes.trim()) score += 3;
    Object.values(extras).forEach((value) => {
      if (value.trim()) score += 2;
    });
  }

  return Math.min(100, score);
}

export function getStepCompletion(
  step: StudioStep,
  form: StudioFormState,
  readinessScore: number,
  isQuickMode: boolean,
) {
  switch (step) {
    case "identity":
      return Boolean(form.name.trim() && form.age.trim() && form.region.trim());
    case "personality":
      return form.coreVibes.length >= 2;
    case "scenario":
      return Boolean(
        form.setting.trim() &&
          form.relationshipToUser.trim() &&
          form.sceneGoal.trim(),
      );
    case "advanced":
      return isQuickMode ? true : readinessScore >= 60;
    case "visual":
      return isQuickMode ? true : Boolean(form.customNotes.trim());
    case "publish":
      return readinessScore >= (isQuickMode ? 45 : 70);
    default:
      return false;
  }
}

export function enrichDraftForBuilderV2Compat(
  draft: CharacterDraftInput,
  args: {
    form: Pick<
      StudioFormState,
      | "mode"
      | "name"
      | "age"
      | "region"
      | "archetype"
      | "genderPresentation"
      | "visibility"
      | "coreVibes"
      | "warmth"
      | "assertiveness"
      | "mystery"
      | "playfulness"
      | "tone"
      | "setting"
      | "relationshipToUser"
      | "sceneGoal"
      | "customNotes"
    >;
  },
): CharacterDraftInput {
  const { hiddenPromptInput, promptEngineOutput, notes } =
    buildStudioBuilderSummary(args.form);

  const safePayload =
    draft.payload &&
    typeof draft.payload === "object" &&
    !Array.isArray(draft.payload)
      ? draft.payload
      : {};

  return {
    ...draft,
    payload: {
      ...safePayload,
      builderV2: true,
      styleType: hiddenPromptInput.styleType,
      builderMode: hiddenPromptInput.builderMode,
      promptVersion: "v1",
      promptSummary: promptEngineOutput.promptSummary,
      canonicalPrompt: promptEngineOutput.canonicalPrompt,
      negativePrompt: promptEngineOutput.negativePrompt,
      identityLock: promptEngineOutput.identityLock,
      generationHints: promptEngineOutput.generationHints,
      moderationFlags: promptEngineOutput.moderationFlags,
      visualProfile: {
        visualAura: notes["Visual aura"] || "",
        avatarStyle: notes["Avatar style"] || "",
        hair: notes["Hair"] || "",
        eyes: notes["Eyes"] || "",
        outfit: notes["Outfit"] || "",
        palette: notes["Palette"] || "",
        camera: notes["Camera"] || "",
        photoPack: notes["Photo pack"] || "",
      },
      publicProfile: {
        tagline: notes["Public tagline"] || "",
        teaser: notes["Public teaser"] || "",
        tags: (notes["Public tags"] || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    },
  };
}
