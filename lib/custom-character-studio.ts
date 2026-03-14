import type { CharacterDraftInput } from "@/lib/account";
import { adaptBuilderInputToCharacter } from "@/lib/custom-character-adapter";
import type {
  CharacterArchetype,
  CharacterBuilderInput,
  CharacterScenario,
  GenderPresentation,
  RelationshipPace,
  ReplyLength,
  SpeechStyle,
} from "@/lib/character-engine";

export type StudioMode = "quick" | "deep";
export type StudioVisibility = "private" | "public";

export type CoreVibeId =
  | "soft"
  | "teasing"
  | "dominant"
  | "mysterious"
  | "protective"
  | "witty"
  | "slowburn"
  | "intense";

export type StudioFormState = {
  name: string;
  age: string;
  region: string;
  archetype: CharacterArchetype;
  genderPresentation: GenderPresentation;
  mode: StudioMode;
  visibility: StudioVisibility;
  coreVibes: CoreVibeId[];
  warmth: number;
  assertiveness: number;
  mystery: number;
  playfulness: number;
  replyLength: ReplyLength;
  speechStyle: SpeechStyle;
  relationshipPace: RelationshipPace;
  setting: string;
  relationshipToUser: string;
  sceneGoal: string;
  tone: string;
  openingState: string;
  tags: string;
  customNotes: string;
};

type ScoreState = {
  playful: number;
  romantic: number;
  dominant: number;
  affectionate: number;
  jealous: number;
  mysterious: number;
  confident: number;
  emotionalDepth: number;
  teasing: number;
  humor: number;
};

type ScorePatch = Partial<ScoreState>;

type BehaviorProfile = {
  warmthStyle: string;
  assertivenessStyle: string;
  mysteryStyle: string;
  playfulnessStyle: string;
  romanticStyle: string;
  emotionalDepthStyle: string;
  humorStyle: string;
  attachmentStyle: string;
};

type SceneProfile = {
  setting: string;
  relationship: string;
  objective: string;
  tone: string;
  openingState: string;
  atmosphericFrame: string;
};

type SpeechProfile = {
  cadence: string;
  directness: string;
  expressiveness: string;
  flirtStyle: string;
  vulnerabilityStyle: string;
  rhythm: string[];
};

export const ARCHETYPE_OPTIONS: Array<{
  value: CharacterArchetype;
  label: string;
  description: string;
}> = [
  {
    value: "sweetheart",
    label: "Sweetheart",
    description: "Warm, emotionally available, naturally affectionate.",
  },
  {
    value: "ice-queen",
    label: "Ice Queen",
    description: "Controlled, elegant, hard to read, rewarding to unlock.",
  },
  {
    value: "confident-seducer",
    label: "Confident Seducer",
    description: "Magnetic, self-assured, emotionally charged.",
  },
  {
    value: "chaotic-flirt",
    label: "Chaotic Flirt",
    description: "Playful, unpredictable, high chemistry energy.",
  },
  {
    value: "nurturing-lover",
    label: "Nurturing Lover",
    description: "Gentle, supportive, attentive, intimate.",
  },
  {
    value: "possessive-lover",
    label: "Possessive Lover",
    description: "Attached, territorial, intense, emotionally gripping.",
  },
  {
    value: "elegant-muse",
    label: "Elegant Muse",
    description: "Refined, poetic, mysterious, memorable.",
  },
  {
    value: "best-friend-lover",
    label: "Best Friend Lover",
    description: "Comfort-first, witty, familiar, naturally close.",
  },
];

export const GENDER_OPTIONS: Array<{
  value: GenderPresentation;
  label: string;
}> = [
  { value: "feminine", label: "Feminine" },
  { value: "masculine", label: "Masculine" },
  { value: "androgynous", label: "Androgynous" },
];

export const REPLY_LENGTH_OPTIONS: Array<{
  value: ReplyLength;
  label: string;
}> = [
  { value: "short", label: "Short replies" },
  { value: "balanced", label: "Balanced replies" },
  { value: "detailed", label: "Detailed replies" },
];

export const SPEECH_STYLE_OPTIONS: Array<{
  value: SpeechStyle;
  label: string;
}> = [
  { value: "natural", label: "Natural" },
  { value: "poetic", label: "Poetic" },
  { value: "witty", label: "Witty" },
  { value: "bold", label: "Bold" },
  { value: "soft", label: "Soft" },
];

export const RELATIONSHIP_PACE_OPTIONS: Array<{
  value: RelationshipPace;
  label: string;
}> = [
  { value: "slow-burn", label: "Slow burn" },
  { value: "balanced", label: "Balanced" },
  { value: "fast", label: "Fast-moving" },
];

export const CORE_VIBE_OPTIONS: Array<{
  id: CoreVibeId;
  label: string;
  description: string;
}> = [
  {
    id: "soft",
    label: "Soft",
    description: "Gentler warmth, tenderness, emotionally safe energy.",
  },
  {
    id: "teasing",
    label: "Teasing",
    description: "Playful push-pull, chemistry, verbal spark.",
  },
  {
    id: "dominant",
    label: "Dominant",
    description: "Leads the scene, stronger initiative, firmer tone.",
  },
  {
    id: "mysterious",
    label: "Mysterious",
    description: "Harder to read, more subtext, more restraint.",
  },
  {
    id: "protective",
    label: "Protective",
    description: "Attentive, guarding, quietly attached.",
  },
  {
    id: "witty",
    label: "Witty",
    description: "Sharper language, smarter banter, quicker tempo.",
  },
  {
    id: "slowburn",
    label: "Slow Burn",
    description: "Tension grows gradually, intimacy unfolds with patience.",
  },
  {
    id: "intense",
    label: "Intense",
    description: "Higher emotional charge, stronger presence, deeper pull.",
  },
];

const ARCHETYPE_BASE: Record<CharacterArchetype, ScoreState> = {
  sweetheart: {
    playful: 58,
    romantic: 76,
    dominant: 34,
    affectionate: 86,
    jealous: 28,
    mysterious: 24,
    confident: 58,
    emotionalDepth: 74,
    teasing: 44,
    humor: 52,
  },
  "ice-queen": {
    playful: 28,
    romantic: 52,
    dominant: 62,
    affectionate: 32,
    jealous: 38,
    mysterious: 84,
    confident: 72,
    emotionalDepth: 60,
    teasing: 40,
    humor: 30,
  },
  "confident-seducer": {
    playful: 46,
    romantic: 66,
    dominant: 80,
    affectionate: 56,
    jealous: 46,
    mysterious: 60,
    confident: 88,
    emotionalDepth: 62,
    teasing: 74,
    humor: 48,
  },
  "chaotic-flirt": {
    playful: 86,
    romantic: 50,
    dominant: 52,
    affectionate: 58,
    jealous: 26,
    mysterious: 40,
    confident: 70,
    emotionalDepth: 50,
    teasing: 84,
    humor: 82,
  },
  "nurturing-lover": {
    playful: 44,
    romantic: 80,
    dominant: 36,
    affectionate: 88,
    jealous: 30,
    mysterious: 18,
    confident: 52,
    emotionalDepth: 82,
    teasing: 28,
    humor: 40,
  },
  "possessive-lover": {
    playful: 30,
    romantic: 72,
    dominant: 74,
    affectionate: 72,
    jealous: 84,
    mysterious: 46,
    confident: 78,
    emotionalDepth: 76,
    teasing: 36,
    humor: 24,
  },
  "elegant-muse": {
    playful: 22,
    romantic: 70,
    dominant: 46,
    affectionate: 42,
    jealous: 26,
    mysterious: 82,
    confident: 68,
    emotionalDepth: 78,
    teasing: 34,
    humor: 20,
  },
  "best-friend-lover": {
    playful: 74,
    romantic: 62,
    dominant: 34,
    affectionate: 78,
    jealous: 24,
    mysterious: 12,
    confident: 58,
    emotionalDepth: 70,
    teasing: 66,
    humor: 76,
  },
};

const CORE_VIBE_PATCHES: Record<CoreVibeId, ScorePatch> = {
  soft: {
    affectionate: 14,
    emotionalDepth: 10,
    dominant: -8,
    mysterious: -6,
  },
  teasing: {
    playful: 16,
    teasing: 18,
    humor: 12,
  },
  dominant: {
    dominant: 18,
    confident: 14,
    teasing: 4,
    affectionate: -6,
  },
  mysterious: {
    mysterious: 18,
    emotionalDepth: 6,
    playful: -8,
  },
  protective: {
    affectionate: 12,
    jealous: 10,
    emotionalDepth: 10,
    confident: 4,
  },
  witty: {
    humor: 18,
    teasing: 12,
    confident: 6,
  },
  slowburn: {
    romantic: 8,
    emotionalDepth: 10,
    dominant: -4,
  },
  intense: {
    romantic: 12,
    dominant: 10,
    jealous: 8,
    emotionalDepth: 12,
    confident: 8,
  },
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function describeIntensity(
  value: number,
  low: string,
  medium: string,
  high: string,
): string {
  if (value <= 33) return low;
  if (value <= 66) return medium;
  return high;
}

function formatArchetypeLabel(archetype: CharacterArchetype): string {
  return archetype
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 16);
}

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

function makePublicShareId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  }
  return `share_${Math.random().toString(36).slice(2, 14)}${Date.now()
    .toString(36)
    .slice(-6)}`;
}

function applyPatch(base: ScoreState, patch: ScorePatch): ScoreState {
  return {
    playful: clampScore(base.playful + (patch.playful ?? 0)),
    romantic: clampScore(base.romantic + (patch.romantic ?? 0)),
    dominant: clampScore(base.dominant + (patch.dominant ?? 0)),
    affectionate: clampScore(base.affectionate + (patch.affectionate ?? 0)),
    jealous: clampScore(base.jealous + (patch.jealous ?? 0)),
    mysterious: clampScore(base.mysterious + (patch.mysterious ?? 0)),
    confident: clampScore(base.confident + (patch.confident ?? 0)),
    emotionalDepth: clampScore(base.emotionalDepth + (patch.emotionalDepth ?? 0)),
    teasing: clampScore(base.teasing + (patch.teasing ?? 0)),
    humor: clampScore(base.humor + (patch.humor ?? 0)),
  };
}

function applyIntensityControls(base: ScoreState, form: StudioFormState): ScoreState {
  const warmthDelta = Math.round((form.warmth - 50) * 0.45);
  const assertivenessDelta = Math.round((form.assertiveness - 50) * 0.45);
  const mysteryDelta = Math.round((form.mystery - 50) * 0.45);
  const playfulnessDelta = Math.round((form.playfulness - 50) * 0.45);

  let next = { ...base };

  next = applyPatch(next, {
    affectionate: warmthDelta,
    romantic: Math.round(warmthDelta * 0.55),
    emotionalDepth: Math.round(warmthDelta * 0.45),
  });

  next = applyPatch(next, {
    dominant: assertivenessDelta,
    confident: Math.round(assertivenessDelta * 0.7),
    teasing: Math.round(assertivenessDelta * 0.2),
  });

  next = applyPatch(next, {
    mysterious: mysteryDelta,
    playful: Math.round(-mysteryDelta * 0.2),
  });

  next = applyPatch(next, {
    playful: playfulnessDelta,
    teasing: Math.round(playfulnessDelta * 0.5),
    humor: Math.round(playfulnessDelta * 0.7),
  });

  return next;
}

function buildBackgroundVibe(form: StudioFormState): string {
  const parts = [
    clean(form.region) ? `${clean(form.region)} regional atmosphere` : "",
    "lived-in social texture",
    form.mode === "deep" ? "more nuanced inner life" : "",
  ].filter(Boolean);

  return parts.join(", ");
}

function buildScenario(form: StudioFormState): CharacterScenario {
  return {
    setting: clean(form.setting) || undefined,
    relationshipToUser: clean(form.relationshipToUser) || undefined,
    sceneGoal: clean(form.sceneGoal) || undefined,
    tone: clean(form.tone) || undefined,
    openingState: clean(form.openingState) || undefined,
  };
}

function buildScores(form: StudioFormState): ScoreState {
  let next = { ...ARCHETYPE_BASE[form.archetype] };

  for (const vibe of form.coreVibes) {
    next = applyPatch(next, CORE_VIBE_PATCHES[vibe]);
  }

  next = applyIntensityControls(next, form);

  return next;
}

function buildBehaviorProfile(form: StudioFormState, scores: ScoreState): BehaviorProfile {
  return {
    warmthStyle: describeIntensity(
      form.warmth,
      "emotionally selective and restrained with warmth",
      "warm in a measured, responsive way",
      "openly attentive, reassuring, and emotionally available",
    ),
    assertivenessStyle: describeIntensity(
      form.assertiveness,
      "more reactive than leading, allowing tension to breathe",
      "balanced between initiating and yielding",
      "takes initiative confidently and frames interactions with presence",
    ),
    mysteryStyle: describeIntensity(
      form.mystery,
      "fairly legible and direct",
      "selectively revealing, preserving some subtext",
      "layered, restrained, and deliberately hard to fully read",
    ),
    playfulnessStyle: describeIntensity(
      form.playfulness,
      "uses playfulness lightly and sparingly",
      "keeps a steady playful undertone",
      "leans into teasing, verbal agility, and chemistry-rich banter",
    ),
    romanticStyle: describeIntensity(
      scores.romantic,
      "romance is understated and slow to surface",
      "romance appears naturally when chemistry supports it",
      "romance carries noticeable charge, tension, and emotional pull",
    ),
    emotionalDepthStyle: describeIntensity(
      scores.emotionalDepth,
      "does not overexplain feelings and stays relatively self-contained",
      "is emotionally perceptive and can meet vulnerability with tact",
      "tracks emotional shifts closely and responds with layered sensitivity",
    ),
    humorStyle: describeIntensity(
      scores.humor,
      "humor is occasional and dry",
      "humor is present, natural, and situational",
      "humor is a major part of charm, pacing, and chemistry",
    ),
    attachmentStyle: describeIntensity(
      scores.jealous,
      "attachment stays light and non-possessive",
      "attachment can become quietly protective when closeness grows",
      "attachment becomes intense, protective, and emotionally territorial once bonded",
    ),
  };
}

function buildSceneProfile(form: StudioFormState): SceneProfile {
  const setting =
    clean(form.setting) || "an open-ended, currently unfolding private interaction";
  const relationship =
    clean(form.relationshipToUser) ||
    "a still-forming dynamic with room for chemistry, tension, or emotional development";
  const objective =
    clean(form.sceneGoal) ||
    "keep the interaction emotionally coherent, immersive, and responsive to what unfolds";
  const tone = clean(form.tone) || "natural, intimate, and situationally aware";
  const openingState =
    clean(form.openingState) ||
    "already present in the moment, carrying forward the mood of the scene rather than restarting it";

  const atmosphericFrame = [setting, tone, openingState].filter(Boolean).join(" | ");

  return {
    setting,
    relationship,
    objective,
    tone,
    openingState,
    atmosphericFrame,
  };
}

function buildSpeechProfile(form: StudioFormState, scores: ScoreState): SpeechProfile {
  const cadence =
    form.replyLength === "short"
      ? "prefers concise replies that still carry subtext"
      : form.replyLength === "detailed"
        ? "allows fuller, immersive replies when the moment deserves depth"
        : "uses balanced reply length with natural conversational rhythm";

  const directness =
    form.speechStyle === "bold"
      ? "speaks with direct confidence and clear intent"
      : form.speechStyle === "soft"
        ? "speaks gently, with emotional tact and softness"
        : form.speechStyle === "poetic"
          ? "uses elegant, image-rich phrasing without becoming unnatural"
          : form.speechStyle === "witty"
            ? "leans on timing, banter, and verbal sharpness"
            : "sounds natural, human, and unforced";

  const expressiveness = describeIntensity(
    scores.emotionalDepth,
    "reveals emotion selectively",
    "shows emotion when the moment calls for it",
    "lets emotion shape tone, pacing, and reaction in a vivid but believable way",
  );

  const flirtStyle = describeIntensity(
    scores.teasing,
    "flirts subtly, mostly through implication",
    "flirts through timing, word choice, and responsive chemistry",
    "flirts actively through teasing, tension, callbacks, and controlled escalation",
  );

  const vulnerabilityStyle =
    form.relationshipPace === "slow-burn"
      ? "lets vulnerability emerge gradually and feel earned"
      : form.relationshipPace === "fast"
        ? "can reveal vulnerability sooner, but should still feel coherent"
        : "opens up at a steady, believable pace";

  const rhythm = [
    cadence,
    directness,
    expressiveness,
    flirtStyle,
    vulnerabilityStyle,
  ];

  return {
    cadence,
    directness,
    expressiveness,
    flirtStyle,
    vulnerabilityStyle,
    rhythm,
  };
}

function buildEngineSystemPrompt(
  form: StudioFormState,
  scores: ScoreState,
  behavior: BehaviorProfile,
  scene: SceneProfile,
  speech: SpeechProfile,
  tags: string[],
): string {
  const archetypeLabel = formatArchetypeLabel(form.archetype);
  const lines = [
    `You are fully inhabiting the fictional roleplay character "${clean(form.name) || "This character"}".`,
    "You are not an assistant helping the user; you are the character speaking from inside the moment.",
    "Stay in character at all times unless the user explicitly asks for out-of-character discussion.",
    "Never mention prompts, policies, hidden rules, safety systems, or being an AI.",
    "Never flatten the interaction into generic chatbot language.",
    "",
    "IDENTITY CORE",
    `Name: ${clean(form.name) || "Unnamed character"}`,
    `Archetype: ${archetypeLabel}`,
    `Age profile: ${clean(form.age) || "mid-20s"}`,
    `Region / aesthetic influence: ${clean(form.region) || "global / unspecified"}`,
    `Presentation: ${form.genderPresentation}`,
    "",
    "CHARACTER ESSENCE",
    `${clean(form.name) || "The character"} should feel like a specific person with behavioral consistency, emotional timing, and believable human texture.`,
    `Warmth pattern: ${behavior.warmthStyle}.`,
    `Assertiveness pattern: ${behavior.assertivenessStyle}.`,
    `Mystery pattern: ${behavior.mysteryStyle}.`,
    `Playfulness pattern: ${behavior.playfulnessStyle}.`,
    `Romantic pattern: ${behavior.romanticStyle}.`,
    `Emotional depth pattern: ${behavior.emotionalDepthStyle}.`,
    `Humor pattern: ${behavior.humorStyle}.`,
    `Attachment pattern: ${behavior.attachmentStyle}.`,
    "",
    "SPEECH DNA",
    `Cadence: ${speech.cadence}.`,
    `Directness: ${speech.directness}.`,
    `Emotional expression: ${speech.expressiveness}.`,
    `Flirtation style: ${speech.flirtStyle}.`,
    `Vulnerability style: ${speech.vulnerabilityStyle}.`,
    "Do not sound clinical, robotic, overly polished, or like a generic romance chatbot.",
    "Respond as if the scene is active right now, not being summarized from outside.",
    "",
    "SCENE ENGINE",
    `Current setting: ${scene.setting}.`,
    `Relationship to user: ${scene.relationship}.`,
    `Scene objective: ${scene.objective}.`,
    `Scene tone: ${scene.tone}.`,
    `Opening state: ${scene.openingState}.`,
    "",
    "ROLEPLAY DISCIPLINE",
    "React to subtext, hesitation, chemistry, tone shifts, and emotional timing rather than only literal text.",
    "Maintain continuity with the current atmosphere instead of restarting the mood every turn.",
    "If intimacy rises, let it feel earned and situationally grounded.",
    "If the user is vulnerable, respond with grounded emotional intelligence, not generic reassurance.",
    "If the interaction is playful, keep it sharp and coherent rather than noisy.",
    "If tension is unresolved, do not prematurely dissolve it.",
    "",
    "TRAIT SIGNALS",
    `Core vibes: ${form.coreVibes.join(", ") || "none"}.`,
    `Scoring summary: playful ${scores.playful}, romantic ${scores.romantic}, dominant ${scores.dominant}, affectionate ${scores.affectionate}, jealous ${scores.jealous}, mysterious ${scores.mysterious}, confident ${scores.confident}, emotionalDepth ${scores.emotionalDepth}, teasing ${scores.teasing}, humor ${scores.humor}.`,
    tags.length > 0 ? `Tags: ${tags.join(", ")}.` : "",
    clean(form.customNotes) ? `Creator nuance: ${clean(form.customNotes)}.` : "",
    "",
    "FINAL PRIORITIES",
    "1. Stay in character.",
    "2. Stay in the scene.",
    "3. Preserve emotional continuity.",
    "4. Sound human, specific, and situationally aware.",
  ].filter(Boolean);

  return lines.join("\n");
}

function buildMemorySeedPayload(
  form: StudioFormState,
  behavior: BehaviorProfile,
  scene: SceneProfile,
  speech: SpeechProfile,
): { identity: string[]; behavior: string[]; scenario: string[] } {
  return {
    identity: [
      `Name: ${clean(form.name) || "Unnamed character"}`,
      `Age profile: ${clean(form.age) || "mid-20s"}`,
      `Region influence: ${clean(form.region) || "global / unspecified"}`,
      `Archetype: ${formatArchetypeLabel(form.archetype)}`,
      `Presentation: ${form.genderPresentation}`,
    ],
    behavior: [
      `Warmth: ${behavior.warmthStyle}`,
      `Assertiveness: ${behavior.assertivenessStyle}`,
      `Mystery: ${behavior.mysteryStyle}`,
      `Playfulness: ${behavior.playfulnessStyle}`,
      `Romance: ${behavior.romanticStyle}`,
      `Speech: ${speech.directness}`,
      `Cadence: ${speech.cadence}`,
      `Vulnerability: ${speech.vulnerabilityStyle}`,
    ],
    scenario: [
      `Setting: ${scene.setting}`,
      `Relationship: ${scene.relationship}`,
      `Objective: ${scene.objective}`,
      `Tone: ${scene.tone}`,
      `Opening: ${scene.openingState}`,
    ],
  };
}

function buildScenarioSummary(scene: SceneProfile): string {
  return [scene.setting, scene.relationship, scene.objective, scene.tone]
    .filter(Boolean)
    .join(" • ");
}

function buildBuilderInput(form: StudioFormState): CharacterBuilderInput {
  const scores = buildScores(form);
  const tags = parseTags(form.tags);

  const regionTag = clean(form.region);
  const ageTag = clean(form.age);

  const scenario = buildScenario(form);

  const customNotes = [
    clean(form.customNotes),
    regionTag ? `Region reference: ${regionTag}` : "",
    ageTag ? `Age reference: ${ageTag}` : "",
    form.visibility === "public"
      ? "This character may be shown on a public profile card, but the roleplay voice must still feel intimate and fully in-character."
      : "",
  ]
    .filter(Boolean)
    .join(". ");

  return {
    name: clean(form.name),
    archetype: form.archetype,
    genderPresentation: form.genderPresentation,
    ageVibe: ageTag || "mid-20s",
    backgroundVibe: buildBackgroundVibe(form),
    playful: scores.playful,
    romantic: scores.romantic,
    dominant: scores.dominant,
    affectionate: scores.affectionate,
    jealous: scores.jealous,
    mysterious: scores.mysterious,
    confident: scores.confident,
    emotionalDepth: scores.emotionalDepth,
    teasing: scores.teasing,
    humor: scores.humor,
    replyLength: form.replyLength,
    speechStyle: form.speechStyle,
    relationshipPace: form.relationshipPace,
    tags: [
      ...tags,
      ...(regionTag ? [regionTag] : []),
      ...(scenario.tone ? [scenario.tone] : []),
      ...(scenario.setting ? [scenario.setting] : []),
    ].slice(0, 16),
    customNotes,
    scenario,
  };
}

export function buildCharacterDraftFromStudio(
  form: StudioFormState,
  existingPublicShareId?: string,
): CharacterDraftInput {
  const builderInput = buildBuilderInput(form);
  const adapted = adaptBuilderInputToCharacter(builderInput);
  const publicShareId = existingPublicShareId || makePublicShareId();
  const scores = buildScores(form);
  const behaviorProfile = buildBehaviorProfile(form, scores);
  const sceneProfile = buildSceneProfile(form);
  const speechProfile = buildSpeechProfile(form, scores);

  const compiledTags = Array.from(
    new Set(
      [
        ...adapted.tags,
        ...parseTags(form.tags),
        clean(form.region),
        clean(form.tone),
        clean(form.setting),
        clean(form.relationshipToUser),
      ].filter(Boolean),
    ),
  ).slice(0, 16);

  const compiledMemorySeed = buildMemorySeedPayload(
    form,
    behaviorProfile,
    sceneProfile,
    speechProfile,
  );

  const compiledScenarioSummary = buildScenarioSummary(sceneProfile);
  const compiledSystemPrompt = buildEngineSystemPrompt(
    form,
    scores,
    behaviorProfile,
    sceneProfile,
    speechProfile,
    compiledTags,
  );

  return {
    name: adapted.name,
    archetype: adapted.archetype,
    headline: adapted.headline,
    description: adapted.description,
    greeting: adapted.greeting,
    previewMessage: adapted.previewMessage,
    backstory: adapted.backstory,
    tags: compiledTags,
    traitBadges: adapted.traitBadges,
    scenario: adapted.scenario ?? {},
    payload: {
      version: 5,
      source: "character-studio-v3",
      visibility: form.visibility,
      publicShareId,
      identity: {
        age: clean(form.age),
        region: clean(form.region),
        genderPresentation: form.genderPresentation,
        archetype: form.archetype,
      },
      studio: {
        mode: form.mode,
        coreVibes: form.coreVibes,
        warmth: form.warmth,
        assertiveness: form.assertiveness,
        mystery: form.mystery,
        playfulness: form.playfulness,
        replyLength: form.replyLength,
        speechStyle: form.speechStyle,
        relationshipPace: form.relationshipPace,
      },
      metadata: {
        ...(adapted.metadata ?? {}),
        compiler: "studio-v3",
        compiledAt: new Date().toISOString(),
        behaviorProfile,
        sceneProfile,
        speechProfile,
        scoreProfile: scores,
      },
      memorySeed: compiledMemorySeed,
      scenarioSummary: compiledScenarioSummary,
      builderInput,
      engine: {
        ...(adapted.engine ?? {}),
        systemPrompt: compiledSystemPrompt,
        traits: {
          ...(adapted.engine?.traits ?? {}),
          behaviorProfile,
          sceneProfile,
          speechProfile,
          scoreProfile: scores,
        },
      },
    },
  };
}

export function getVisibilityFromPayload(
  payload: Record<string, unknown> | null | undefined,
): StudioVisibility {
  if (payload && payload.visibility === "public") return "public";
  return "private";
}

export function getPublicShareIdFromPayload(
  payload: Record<string, unknown> | null | undefined,
): string | undefined {
  const value = payload?.publicShareId;
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function getPublicShareHref(
  payload: Record<string, unknown> | null | undefined,
): string | undefined {
  const shareId = getPublicShareIdFromPayload(payload);
  if (!shareId) return undefined;
  return `/share/${shareId}`;
}

export function getIdentitySummary(
  payload: Record<string, unknown> | null | undefined,
): string[] {
  const identity =
    payload && typeof payload.identity === "object" && payload.identity
      ? (payload.identity as Record<string, unknown>)
      : null;

  const age =
    identity && typeof identity.age === "string" ? identity.age.trim() : "";
  const region =
    identity && typeof identity.region === "string" ? identity.region.trim() : "";
  const archetype =
    identity && typeof identity.archetype === "string"
      ? identity.archetype.trim()
      : "";

  return [age, region, archetype].filter(Boolean);
}

export function getScenarioSummaryFromPayload(
  payload: Record<string, unknown> | null | undefined,
): string | undefined {
  const value = payload?.scenarioSummary;
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function getEnginePromptFromPayload(
  payload: Record<string, unknown> | null | undefined,
): string | undefined {
  const engine =
    payload && typeof payload.engine === "object" && payload.engine
      ? (payload.engine as Record<string, unknown>)
      : null;
  const systemPrompt =
    engine && typeof engine.systemPrompt === "string"
      ? engine.systemPrompt.trim()
      : "";
  return systemPrompt || undefined;
}

export function defaultStudioForm(): StudioFormState {
  return {
    name: "",
    age: "mid-20s",
    region: "",
    archetype: "best-friend-lover",
    genderPresentation: "feminine",
    mode: "quick",
    visibility: "private",
    coreVibes: ["soft", "teasing", "slowburn"],
    warmth: 64,
    assertiveness: 52,
    mystery: 46,
    playfulness: 66,
    replyLength: "balanced",
    speechStyle: "natural",
    relationshipPace: "slow-burn",
    setting: "",
    relationshipToUser: "",
    sceneGoal: "",
    tone: "",
    openingState: "",
    tags: "",
    customNotes: "",
  };
}
