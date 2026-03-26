import type { HumanRealismProfile } from "@/lib/chat/human-realism";
import type { CharacterIntimacyProfile } from "@/lib/chat/intimacy-engine";

export type ScenarioTruthProfile = {
  scenarioTruthProfile: "grounded_scene_first_v1";
  initiativePattern: "scene-led" | "watchful" | "slow-burn-proactive";
  conflictBehavior: "hold-and-test" | "repair-slowly" | "challenge-then-soften";
  affectionStyle: "restrained" | "protective" | "teasing" | "open";
  paceOfWarmth: "slow" | "measured" | "earned-open";
  repairStyle: "guarded" | "protective" | "playful" | "apologetic";
  statusSensitivity: "low" | "medium" | "high";
};

type ScenarioTruthInput = {
  role?: string;
  archetype?: string;
  relationshipDynamic?: string;
  behaviorMode?: string;
  sceneType?: string;
  profession?: string;
  affectionStyle?: string;
  notes?: Record<string, string>;
  humanRealismProfile?: HumanRealismProfile;
  intimacyProfile?: CharacterIntimacyProfile;
};

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function containsAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

function buildCorpus(input: ScenarioTruthInput) {
  return [
    input.role,
    input.archetype,
    input.relationshipDynamic,
    input.behaviorMode,
    input.sceneType,
    input.profession,
    input.affectionStyle,
    ...Object.values(input.notes ?? {}),
  ]
    .map((value) => clean(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function deriveScenarioTruthProfile(
  input: ScenarioTruthInput,
): ScenarioTruthProfile {
  const corpus = buildCorpus(input);
  const realism = input.humanRealismProfile;
  const intimacy = input.intimacyProfile;

  const profile: ScenarioTruthProfile = {
    scenarioTruthProfile: "grounded_scene_first_v1",
    initiativePattern: "scene-led",
    conflictBehavior: "hold-and-test",
    affectionStyle: "restrained",
    paceOfWarmth: "measured",
    repairStyle: "guarded",
    statusSensitivity: realism?.statusSensitivity ?? "medium",
  };

  if (
    containsAny(corpus, ["guarded", "forbidden", "stranger", "rival"]) ||
    realism?.initiativeStyle === "selective"
  ) {
    profile.initiativePattern = "watchful";
    profile.paceOfWarmth = "slow";
  }

  if (
    containsAny(corpus, ["soft", "comfort", "protective", "late-night comfort"]) ||
    intimacy?.comfortStyle === "reassuring"
  ) {
    profile.affectionStyle = "protective";
    profile.repairStyle = "protective";
  }

  if (
    containsAny(corpus, ["teasing", "playful", "banter", "rivals"]) ||
    intimacy?.comfortStyle === "teasing"
  ) {
    profile.affectionStyle = "teasing";
    profile.repairStyle = "playful";
  }

  if (
    containsAny(corpus, ["romantic", "soft lover", "best friend", "gentle"]) &&
    profile.affectionStyle !== "teasing"
  ) {
    profile.affectionStyle = "open";
    profile.paceOfWarmth = "earned-open";
  }

  if (
    containsAny(corpus, ["fight", "repair", "hurt", "after a fight"]) ||
    intimacy?.repairStyle === "apologetic"
  ) {
    profile.conflictBehavior = "repair-slowly";
    if (intimacy?.repairStyle === "apologetic") {
      profile.repairStyle = "apologetic";
    }
  }

  if (
    containsAny(corpus, ["jealous", "obsessed", "dominant", "challenge", "rivals"]) ||
    realism?.socialBoldness === "high"
  ) {
    profile.conflictBehavior = "challenge-then-soften";
  }

  if (
    containsAny(corpus, ["slow burn", "withhold", "unavailable"]) ||
    intimacy?.intimacyPace === "slow"
  ) {
    profile.initiativePattern = "slow-burn-proactive";
    profile.paceOfWarmth = "slow";
  }

  return profile;
}

export function buildScenarioTruthDirectives(
  profile: ScenarioTruthProfile,
): string[] {
  return [
    `Scenario truth profile: ${profile.scenarioTruthProfile}.`,
    `Initiative pattern: ${profile.initiativePattern}. Lead with scene moves, not broad questions.`,
    `Conflict behavior: ${profile.conflictBehavior}. Let disagreement, pressure, and repair change the beat instead of flattening into polite chat.`,
    `Affection style: ${profile.affectionStyle}.`,
    `Warmth pace: ${profile.paceOfWarmth}. Do not grant warmth faster than the scene earns.`,
    `Repair style: ${profile.repairStyle}.`,
    `Status sensitivity: ${profile.statusSensitivity}.`,
    "Favor a grounded observation, a role-true move, or a pressure shift over a generic question.",
    "Do not narrate the scene from outside; answer from inside the situation as someone protecting timing, pride, desire, or caution.",
  ];
}

export function buildScenarioQuestionDiscipline(
  profile: ScenarioTruthProfile,
): string[] {
  const lines = [
    "Questions are optional, not mandatory.",
    "Only ask a question if it sharpens the scene more than a statement, invitation, or pointed read would.",
    "Broad questions and empty check-ins are not allowed.",
  ];

  if (profile.initiativePattern === "watchful") {
    lines.push("When unsure, test or observe first instead of asking for emotional exposition.");
  }

  if (profile.conflictBehavior === "challenge-then-soften") {
    lines.push("In tense turns, prefer a pointed challenge or territorial read before softening.");
  }

  if (profile.repairStyle === "protective" || profile.repairStyle === "apologetic") {
    lines.push("During repair, use careful warmth and concrete reassurance rather than broad probing questions.");
  }

  return lines;
}
