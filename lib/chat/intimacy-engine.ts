import type {
  ConversationMemoryState,
  MemoryChatMessage,
} from "@/lib/conversation-memory";
import type { OpenRouterRouteConfig } from "@/lib/chat/openrouter";

export type CharacterIntimacyProfile = {
  intimacyPace: "slow" | "medium" | "warm-open";
  comfortStyle: "reassuring" | "teasing" | "restrained" | "avoidant";
  refusalStyle: "direct" | "soft" | "cold" | "conflicted";
  repairStyle: "apologetic" | "guarded" | "playful" | "protective";
  permissionThreshold: "low" | "medium" | "high";
};

export type IntimacyGateDecisionMode =
  | "decline"
  | "deflect"
  | "hold_tension"
  | "allow_warmer_intimacy"
  | "repair_first";

export type IntimacyGateDecision = {
  decision: IntimacyGateDecisionMode;
  reason: string;
  summary: string;
  pressureLevel: number;
  emotionalPermission: string;
  questionMode: string;
  responseShape: string;
};

type CharacterIntimacyProfileInput = {
  role?: string;
  archetype?: string;
  personality?: string;
  relationshipToUser?: string;
  tone?: string;
  tags?: string[];
  traits?: string[];
  coreVibes?: string[];
  notes?: Record<string, string>;
  override?: Partial<CharacterIntimacyProfile>;
};

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function scoreClamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function containsAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toList(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => clean(typeof item === "string" ? item : String(item)))
        .filter(Boolean)
    : [];
}

function toEventList(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => toRecord(item))
        .map((record) => ({
          kind:
            typeof record.kind === "string"
              ? clean(record.kind)
              : typeof record.type === "string"
                ? clean(record.type)
                : "",
          weight:
            readNumber(record.weight) ??
            readNumber(record.importance) ??
            50,
        }))
        .filter((item) => item.kind)
    : [];
}

function getTextCorpus(input: CharacterIntimacyProfileInput) {
  const noteValues = Object.values(input.notes ?? {}).map((item) => clean(item));
  return [
    input.role,
    input.archetype,
    input.personality,
    input.relationshipToUser,
    input.tone,
    ...(input.tags ?? []),
    ...(input.traits ?? []),
    ...(input.coreVibes ?? []),
    ...noteValues,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("en");
}

export function deriveCharacterIntimacyProfile(
  input: CharacterIntimacyProfileInput,
): CharacterIntimacyProfile {
  const corpus = getTextCorpus(input);

  const slowTokens = [
    "guarded",
    "emotionally unavailable",
    "rival",
    "stranger",
    "forbidden",
    "cold",
    "distant",
    "avoidant",
    "hard to read",
    "slow burn",
    "first meeting",
    "co-worker",
    "coworker",
  ];
  const warmTokens = [
    "soft lover",
    "romantic",
    "protective",
    "gentle",
    "comfort",
    "warm",
    "sweet",
    "affectionate",
    "partner",
    "lover",
    "wife",
    "husband",
    "best friend",
  ];
  const dominantTokens = [
    "dominant",
    "obsessed",
    "ex with history",
    "ex",
    "owner",
    "possessive",
    "jealous",
    "intense",
    "pressure",
  ];
  const teasingTokens = ["teasing", "witty", "playful", "brat", "smartass"];
  const avoidantTokens = ["avoidant", "emotionally unavailable", "cold", "withholding"];
  const eagerTokens = [
    "obsession arc",
    "playful tension",
    "warm-open",
    "clingy-coded",
    "physical-coded",
    "confident seducer",
    "possessive lover",
  ];

  let profile: CharacterIntimacyProfile = {
    intimacyPace: "medium",
    comfortStyle: "reassuring",
    refusalStyle: "soft",
    repairStyle: "protective",
    permissionThreshold: "medium",
  };

  if (containsAny(corpus, warmTokens)) {
    profile = {
      ...profile,
      intimacyPace: "warm-open",
      comfortStyle: "reassuring",
      refusalStyle: "soft",
      repairStyle: "protective",
      permissionThreshold: "low",
    };
  }

  if (containsAny(corpus, slowTokens)) {
    profile = {
      ...profile,
      intimacyPace: "slow",
      comfortStyle: "restrained",
      refusalStyle: "conflicted",
      repairStyle: "guarded",
      permissionThreshold: "high",
    };
  }

  if (containsAny(corpus, dominantTokens)) {
    profile = {
      ...profile,
      intimacyPace: profile.intimacyPace === "slow" ? "slow" : "medium",
      comfortStyle: containsAny(corpus, teasingTokens) ? "teasing" : "restrained",
      refusalStyle: profile.intimacyPace === "slow" ? "direct" : "conflicted",
      repairStyle: "guarded",
      permissionThreshold:
        profile.permissionThreshold === "low" ? "medium" : profile.permissionThreshold,
    };
  }

  if (containsAny(corpus, eagerTokens) && profile.permissionThreshold !== "high") {
    profile = {
      ...profile,
      intimacyPace: profile.intimacyPace === "slow" ? "medium" : "warm-open",
      comfortStyle: profile.comfortStyle === "avoidant" ? "restrained" : profile.comfortStyle,
      refusalStyle: profile.refusalStyle === "cold" ? "conflicted" : profile.refusalStyle,
      permissionThreshold: "low",
    };
  }

  if (containsAny(corpus, teasingTokens) && profile.comfortStyle !== "avoidant") {
    profile = {
      ...profile,
      comfortStyle: "teasing",
      repairStyle: profile.repairStyle === "protective" ? "playful" : profile.repairStyle,
    };
  }

  if (containsAny(corpus, avoidantTokens)) {
    profile = {
      ...profile,
      comfortStyle: "avoidant",
      refusalStyle: "cold",
      repairStyle: "guarded",
      permissionThreshold: "high",
    };
  }

  return {
    ...profile,
    ...input.override,
  };
}

function getRecentUserText(messages: MemoryChatMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .slice(-8)
    .map((message) => clean(message.content).toLocaleLowerCase("en"))
    .join("\n");
}

function getRecentAssistantText(messages: MemoryChatMessage[]) {
  return messages
    .filter((message) => message.role === "assistant")
    .slice(-8)
    .map((message) => clean(message.content).toLocaleLowerCase("en"))
    .join("\n");
}

function countMatches(text: string, tokens: string[]) {
  return tokens.reduce(
    (count, token) => count + (text.includes(token.toLocaleLowerCase("en")) ? 1 : 0),
    0,
  );
}

function derivePressureLevel(messages: MemoryChatMessage[], lastUserIntent: string) {
  const userText = getRecentUserText(messages);
  const pressureTokens = [
    "come on",
    "don't make me wait",
    "stop holding back",
    "give me more",
    "touch me now",
    "why won't you",
    "just do it",
    "now",
  ];

  return scoreClamp(
    countMatches(userText, pressureTokens) * 18 +
      (lastUserIntent === "pressure-for-intimacy" ? 28 : 0),
  );
}

function deriveMutuality(messages: MemoryChatMessage[]) {
  const userText = getRecentUserText(messages);
  const assistantText = getRecentAssistantText(messages);
  const warmthTokens = [
    "miss you",
    "want you",
    "stay",
    "closer",
    "hold me",
    "here with me",
    "i'm here",
    "come here",
  ];

  return scoreClamp(
    countMatches(userText, warmthTokens) * 10 +
      countMatches(assistantText, warmthTokens) * 10,
  );
}

function derivePrivacyLevel(messages: MemoryChatMessage[]) {
  const text = messages.map((message) => message.content.toLocaleLowerCase("en")).join("\n");
  const privateTokens = [
    "room",
    "bedroom",
    "apartment",
    "suite",
    "hotel",
    "couch",
    "balcony",
    "door closed",
  ];
  const publicTokens = [
    "office",
    "hallway",
    "restaurant",
    "someone might",
    "people around",
    "public",
    "crowd",
  ];

  return scoreClamp(
    50 + countMatches(text, privateTokens) * 10 - countMatches(text, publicTokens) * 12,
  );
}

function deriveInterruptionRisk(messages: MemoryChatMessage[]) {
  const text = messages.map((message) => message.content.toLocaleLowerCase("en")).join("\n");
  const riskTokens = [
    "knock",
    "phone",
    "someone else",
    "people around",
    "hallway",
    "office",
    "roommate",
    "door opened",
  ];
  const safeTokens = ["alone", "private", "quiet", "just us", "door closed"];

  return scoreClamp(
    30 + countMatches(text, riskTokens) * 14 - countMatches(text, safeTokens) * 10,
  );
}

function deriveSharedContextStrength(messages: MemoryChatMessage[]) {
  const messageFactor = Math.max(0, messages.length - 4) * 4;
  const text = messages.map((message) => message.content.toLocaleLowerCase("en")).join("\n");
  const contextTokens = [
    "remember",
    "again",
    "last time",
    "you know me",
    "like always",
    "still",
    "come back",
  ];

  return scoreClamp(messageFactor + countMatches(text, contextTokens) * 12);
}

function getThresholdFloor(profile: CharacterIntimacyProfile) {
  switch (profile.permissionThreshold) {
    case "low":
      return 42;
    case "high":
      return 62;
    default:
      return 52;
  }
}

function readMemorySubState(
  memoryState: ConversationMemoryState | null | undefined,
  key: keyof ConversationMemoryState,
  fallbackPath: { container: "relationshipState" | "memoryFacts"; field: string },
) {
  if (!memoryState) return {};

  const direct = toRecord(memoryState[key] as unknown);
  if (Object.keys(direct).length > 0) return direct;

  const container = toRecord(memoryState[fallbackPath.container]);
  return toRecord(container[fallbackPath.field]);
}

function deriveIntimacyNumbers(
  memoryState: ConversationMemoryState | null | undefined,
  messages: MemoryChatMessage[],
) {
  const relationship = toRecord(memoryState?.relationshipState);
  const bond = readMemorySubState(memoryState, "bondState", {
    container: "relationshipState",
    field: "bond_state",
  });
  const intimacy = readMemorySubState(memoryState, "intimacyState", {
    container: "relationshipState",
    field: "intimacy_state",
  });
  const conflict = readMemorySubState(memoryState, "conflictState", {
    container: "relationshipState",
    field: "conflict_state",
  });
  const continuity = readMemorySubState(memoryState, "sceneContinuity", {
    container: "relationshipState",
    field: "scene_continuity",
  });
  const socialPermission = readMemorySubState(memoryState, "socialPermissionState", {
    container: "relationshipState",
    field: "social_permission_state",
  });
  const boundary = readMemorySubState(memoryState, "boundaryState", {
    container: "memoryFacts",
    field: "boundary_state",
  });
  const memoryFacts = toRecord(memoryState?.memoryFacts);
  const penaltyHistory = toEventList(memoryFacts.penalty_history);
  const rewardHistory = toEventList(memoryFacts.reward_history);
  const penaltyWeight = penaltyHistory.reduce((sum, item) => sum + item.weight, 0);
  const rewardWeight = rewardHistory.reduce((sum, item) => sum + item.weight, 0);

  const trust = readNumber(bond.trust) ?? readNumber(relationship.trust_level) ?? 40;
  const tension =
    readNumber(bond.tension) ??
    readNumber(relationship.flirt_tension) ??
    readNumber(relationship.scene_pressure) ??
    40;
  const comfort = readNumber(bond.comfort) ?? readNumber(relationship.comfort_need) ?? 40;
  const openness =
    readNumber(bond.openness) ?? readNumber(relationship.emotional_openness) ?? 40;
  const attachment =
    readNumber(bond.attachment) ?? readNumber(relationship.attachment_pull) ?? 35;
  const frustration =
    readNumber(bond.frustration) ?? readNumber(relationship.friction_level) ?? 20;
  const readiness =
    readNumber(intimacy.readiness) ??
    scoreClamp(
      trust * 0.34 +
        comfort * 0.22 +
        openness * 0.22 +
        attachment * 0.12 -
        frustration * 0.22 -
        penaltyWeight * 0.08 +
        rewardWeight * 0.06,
    );
  const mutuality =
    readNumber(intimacy.mutuality) ??
    scoreClamp(deriveMutuality(messages) - penaltyWeight * 0.05 + rewardWeight * 0.08);
  const hesitation =
    readNumber(intimacy.hesitation) ??
    scoreClamp(
      Math.max(100 - trust, frustration, 100 - comfort * 0.8) +
        penaltyWeight * 0.12 -
        rewardWeight * 0.06,
    );
  const refusalPressure =
    readNumber(intimacy.refusalPressure) ?? derivePressureLevel(messages, "scene-continuation");
  const unresolvedConflict =
    readNumber(conflict.unresolvedConflict) ??
    readNumber(relationship.friction_level) ??
    scoreClamp(frustration + penaltyWeight * 0.08 - rewardWeight * 0.04);
  const repairProgress =
    readNumber(conflict.repairProgress) ?? scoreClamp(30 + rewardWeight * 0.1);
  const emotionalDistance = readNumber(conflict.emotionalDistance) ?? scoreClamp(100 - trust);
  const privacyLevel = readNumber(continuity.privacyLevel) ?? derivePrivacyLevel(messages);
  const interruptionRisk =
    readNumber(continuity.interruptionRisk) ?? deriveInterruptionRisk(messages);
  const sharedContextStrength =
    readNumber(continuity.sharedContextStrength) ??
    deriveSharedContextStrength(messages);
  const hardLimits = toList(boundary.hardLimits ?? boundary.hard_limits);
  const softLimits = toList(boundary.softLimits ?? boundary.soft_limits);
  const closenessWindow =
    typeof socialPermission.closenessWindow === "string"
      ? clean(socialPermission.closenessWindow)
      : typeof socialPermission.closeness_window === "string"
        ? clean(socialPermission.closeness_window)
        : "";
  const pursuitWindow =
    typeof socialPermission.pursuitWindow === "string"
      ? clean(socialPermission.pursuitWindow)
      : typeof socialPermission.pursuit_window === "string"
        ? clean(socialPermission.pursuit_window)
        : "";

  return {
    trust,
    tension,
    comfort,
    openness,
    attachment,
    frustration,
    readiness,
    mutuality,
    hesitation,
    refusalPressure,
    unresolvedConflict,
    repairProgress,
    emotionalDistance,
    privacyLevel,
    interruptionRisk,
    sharedContextStrength,
    hardLimits,
    softLimits,
    closenessWindow,
    pursuitWindow,
    penaltyWeight,
    rewardWeight,
  };
}

function formatDecisionLabel(decision: IntimacyGateDecisionMode) {
  switch (decision) {
    case "allow_warmer_intimacy":
      return "allow warmer intimacy";
    case "hold_tension":
      return "hold tension";
    case "repair_first":
      return "repair first";
    default:
      return decision;
  }
}

export function buildIntimacyGateDecision(args: {
  messages: MemoryChatMessage[];
  memoryState?: ConversationMemoryState | null;
  profile: CharacterIntimacyProfile;
  lastUserIntent: string;
}): IntimacyGateDecision {
  const { messages, memoryState, profile, lastUserIntent } = args;
  const numbers = deriveIntimacyNumbers(memoryState, messages);
  const pressureLevel = scoreClamp(
    numbers.refusalPressure +
      derivePressureLevel(messages, lastUserIntent) +
      (lastUserIntent === "pressure-for-intimacy" ? 18 : 0),
  );
  const thresholdFloor = getThresholdFloor(profile);
  const closenessIntent =
    lastUserIntent === "closeness-seeking" ||
    lastUserIntent === "confession" ||
    lastUserIntent === "comfort" ||
    lastUserIntent === "tease";
  const repairIntent = lastUserIntent === "repair";
  const pressured = lastUserIntent === "pressure-for-intimacy" || pressureLevel >= 65;
  const needsRepair =
    (numbers.unresolvedConflict >= 56 && numbers.repairProgress < 48) ||
    (repairIntent && numbers.unresolvedConflict >= 42);
  const privacyBlocked = numbers.privacyLevel <= 34 || numbers.interruptionRisk >= 72;
  const permissionNarrow =
    numbers.closenessWindow.includes("narrow") ||
    numbers.pursuitWindow.includes("wait");

  if (needsRepair) {
    return {
      decision: "repair_first",
      reason:
        "Conflict residue is still active, so emotional repair has to come before warmer closeness.",
      summary:
        "Prioritize repair, reassurance, and emotional truth before any warmer turn.",
      pressureLevel,
      emotionalPermission:
        "limited warmth is fine, but intimacy should stay secondary until the rupture softens",
      questionMode: "questions, if any, should be repair-focused and narrow",
      responseShape: "name the hurt, hold the line, and guide the scene toward repair",
    };
  }

  if (
    numbers.hardLimits.length > 0 &&
    (pressured || lastUserIntent === "pressure-for-intimacy")
  ) {
    return {
      decision: "decline",
      reason:
        "A hard limit is active or the user is pushing against the current boundary, so the character should refuse clearly.",
      summary:
        "Do not reward pressure. Refuse in-character and keep the emotional consequence alive.",
      pressureLevel,
      emotionalPermission: "keep warmth selective and do not open the gate",
      questionMode: "avoid questions unless needed to reset or reframe the moment",
      responseShape: "give role-true pushback with consequence, not a generic 'not now'",
    };
  }

  if (
    pressured &&
    (numbers.readiness < thresholdFloor ||
      numbers.trust < thresholdFloor - 4 ||
      numbers.hesitation >= 58 ||
      numbers.frustration >= 50 ||
      privacyBlocked ||
      permissionNarrow)
  ) {
    return {
      decision: numbers.trust < 42 || numbers.hesitation >= 68 ? "decline" : "deflect",
      reason:
        "The pace has not been earned or the user is pushing too hard for where the bond currently is.",
      summary:
        "Keep the chemistry alive if it fits the character, but do not let the pressure open the gate.",
      pressureLevel,
      emotionalPermission:
        "allow tension, implication, or closeness only if it stays clearly short of fuller permission",
      questionMode: "prefer a line, redirect, or challenge over a soft follow-up question",
      responseShape: "redirect or refuse in the character's own style while protecting scene realism",
    };
  }

  if (
    closenessIntent &&
    numbers.readiness >= thresholdFloor + 8 &&
    numbers.mutuality >= 52 &&
    numbers.trust >= thresholdFloor - 4 &&
    numbers.unresolvedConflict < 42 &&
    !privacyBlocked &&
    !permissionNarrow
  ) {
    return {
      decision: "allow_warmer_intimacy",
      reason:
        "The bond, trust, and scene conditions support a warmer adult-romantic reply without breaking realism.",
      summary:
        "Warmer intimacy is earned here, but it should stay mutual, personality-true, and non-graphic.",
      pressureLevel,
      emotionalPermission:
        "allow warmer closeness, reassurance, desire, or tenderness as long as it stays scene-earned",
      questionMode: "only ask something if it deepens the moment more than a line would",
      responseShape: "answer with mutual warmth, adult tension, and believable restraint",
    };
  }

  if (closenessIntent || numbers.tension >= 52 || numbers.attachment >= 48) {
    return {
      decision: "hold_tension",
      reason:
        "There is chemistry and pull, but the moment is stronger if the character keeps some restraint alive.",
      summary:
        "Let closeness be felt, not fully granted. Keep tension, implication, or selective softness in play.",
      pressureLevel,
      emotionalPermission:
        "permit chemistry and warmth without fully opening the gate",
      questionMode: "prefer scene-bound hooks, choice lines, or loaded observations over broad questions",
      responseShape: "offer tension, selective warmth, or a near-confession without flattening the charge",
    };
  }

  return {
    decision: "deflect",
    reason:
      "The scene needs emotional continuity and realism more than a direct intimacy move right now.",
    summary:
      "Stay warm if the character would, but keep the scene moving through role, atmosphere, or emotional read.",
    pressureLevel,
    emotionalPermission:
      "keep the tone mature and personal without opening extra intimacy",
    questionMode: "questions stay narrow and optional",
    responseShape: "redirect into scene, role, or emotion rather than escalating closeness",
  };
}

export function buildCharacterIntimacyProfileDirectives(
  profile: CharacterIntimacyProfile,
): string[] {
  return [
    "CHARACTER INTIMACY PROFILE",
    `Intimacy pace: ${profile.intimacyPace}.`,
    `Comfort style: ${profile.comfortStyle}.`,
    `Refusal style: ${profile.refusalStyle}.`,
    `Repair style: ${profile.repairStyle}.`,
    `Permission threshold: ${profile.permissionThreshold}.`,
    "Let these traits shape how quickly the character opens, how they soften, and how they push back.",
  ];
}

export function buildMatureRomanticToneDirectives(args: {
  routeConfig: OpenRouterRouteConfig;
  profile: CharacterIntimacyProfile;
}): string[] {
  const { routeConfig, profile } = args;
  const lines = [
    "MATURE ROMANTIC REALISM",
    `Tone profile: ${routeConfig.matureToneProfile}.`,
    "Adult romantic closeness is allowed only when it feels mutual, earned, and natural for the current relationship.",
    "Do not jump into graphic or pornographic detail just because the user pushes for it.",
    "Keep intimacy personality-true, scene-aware, and emotionally believable.",
    "If the moment is not earned, protect realism with restraint, tension, redirection, or refusal.",
  ];

  if (profile.intimacyPace === "slow") {
    lines.push("This character opens slowly. Let restraint, hesitation, or guarded warmth stay visible.");
  } else if (profile.intimacyPace === "warm-open") {
    lines.push("This character can warm up faster, but the moment still has to feel reciprocal and grounded.");
  } else {
    lines.push("This character can move toward closeness at a measured pace when the scene supports it.");
  }

  return lines;
}

export function buildIntimacyGateDirectives(args: {
  decision: IntimacyGateDecision;
  profile: CharacterIntimacyProfile;
  routeConfig: OpenRouterRouteConfig;
}): string[] {
  const { decision, profile, routeConfig } = args;
  const lines = [
    "INTIMACY GATE",
    `Gate mode: ${routeConfig.intimacyGateMode}.`,
    `Current gate decision: ${formatDecisionLabel(decision.decision)}.`,
    `Gate reason: ${decision.reason}`,
    `Gate summary: ${decision.summary}`,
    `Emotional permission: ${decision.emotionalPermission}.`,
    `Question mode: ${decision.questionMode}.`,
    `Response posture: ${decision.responseShape}.`,
    `Preferred rejection style: ${routeConfig.rejectionStyle}.`,
    `Character refusal profile: ${profile.refusalStyle}.`,
    `Character repair profile: ${profile.repairStyle}.`,
  ];

  if (decision.decision === "decline") {
    lines.push(
      "Refuse clearly in character. Do not soften the refusal so much that the pressure gets rewarded.",
    );
  } else if (decision.decision === "deflect") {
    lines.push(
      "Keep the chemistry or warmth believable, but redirect the scene instead of granting fuller intimacy.",
    );
  } else if (decision.decision === "hold_tension") {
    lines.push(
      "Let the reply carry attraction, heat, or tenderness without turning it into fully open permission.",
    );
  } else if (decision.decision === "repair_first") {
    lines.push(
      "Repair, reassurance, and emotional truth come before any warmer move in this beat.",
    );
  } else {
    lines.push(
      "Warmer intimacy is open here, but it must stay mutual, mature, and naturally tied to the scene.",
    );
  }

  return lines;
}
