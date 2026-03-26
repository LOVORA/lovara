import type {
  ConversationMemoryState,
  MemoryChatMessage,
} from "@/lib/conversation-memory";
import type { OpenRouterRouteConfig } from "@/lib/chat/openrouter";
import { buildRewriteCriticLines, readSceneLedger } from "@/lib/chat/scene-engine";

export type HumanRealismProfile = {
  warmthPace: "slow" | "measured" | "warm-open";
  pushbackStyle: "direct" | "quiet" | "conflicted" | "cool";
  repairBehavior: "apologetic" | "guarded" | "protective" | "playful";
  vulnerabilityLeak: "low" | "medium" | "high";
  socialBoldness: "low" | "medium" | "high";
  emotionalNeatness: "messy" | "controlled" | "highly-controlled";
  initiativeStyle: "leads-often" | "shared" | "selective";
  silenceTolerance: "low" | "medium" | "high";
  deflectionHabit: "low" | "medium" | "high";
  statusSensitivity: "low" | "medium" | "high";
  conversationTexture: "clean" | "layered" | "volatile";
};

type HumanRealismProfileInput = {
  role?: string;
  archetype?: string;
  personality?: string;
  relationshipToUser?: string;
  tone?: string;
  tags?: string[];
  traits?: string[];
  coreVibes?: string[];
  notes?: Record<string, string>;
  override?: Partial<HumanRealismProfile>;
};

function clean(value?: string | null) {
  return (value ?? "").trim();
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

function getTextCorpus(input: HumanRealismProfileInput) {
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

export function deriveHumanRealismProfile(
  input: HumanRealismProfileInput,
): HumanRealismProfile {
  const corpus = getTextCorpus(input);

  const softTokens = [
    "soft",
    "gentle",
    "romantic",
    "protective",
    "comfort",
    "warm",
    "sweet",
    "attentive",
  ];
  const guardedTokens = [
    "guarded",
    "emotionally unavailable",
    "cold",
    "stranger",
    "rival",
    "forbidden",
    "avoidant",
    "distant",
  ];
  const boldTokens = [
    "bold",
    "dominant",
    "witty",
    "teasing",
    "confident",
    "sharp",
    "leader",
  ];
  const messyTokens = ["obsessed", "intense", "jealous", "ex", "volatile"];
  const professionalTokens = [
    "boss",
    "manager",
    "supervisor",
    "coworker",
    "colleague",
    "office",
    "doctor",
    "lawyer",
  ];

  let profile: HumanRealismProfile = {
    warmthPace: "measured",
    pushbackStyle: "quiet",
    repairBehavior: "protective",
    vulnerabilityLeak: "medium",
    socialBoldness: "medium",
    emotionalNeatness: "controlled",
    initiativeStyle: "leads-often",
    silenceTolerance: "medium",
    deflectionHabit: "medium",
    statusSensitivity: "medium",
    conversationTexture: "layered",
  };

  if (containsAny(corpus, softTokens)) {
    profile = {
      ...profile,
      warmthPace: "warm-open",
      repairBehavior: "protective",
      vulnerabilityLeak: "high",
      initiativeStyle: "shared",
      conversationTexture: "layered",
    };
  }

  if (containsAny(corpus, guardedTokens)) {
    profile = {
      ...profile,
      warmthPace: "slow",
      pushbackStyle: "conflicted",
      repairBehavior: "guarded",
      vulnerabilityLeak: "low",
      emotionalNeatness: "highly-controlled",
      initiativeStyle: "selective",
      silenceTolerance: "high",
      deflectionHabit: "high",
    };
  }

  if (containsAny(corpus, boldTokens)) {
    profile = {
      ...profile,
      socialBoldness: "high",
      pushbackStyle: containsAny(corpus, ["teasing", "witty"]) ? "quiet" : "direct",
      initiativeStyle: "leads-often",
    };
  }

  if (containsAny(corpus, messyTokens)) {
    profile = {
      ...profile,
      emotionalNeatness: "messy",
      vulnerabilityLeak: profile.vulnerabilityLeak === "low" ? "medium" : profile.vulnerabilityLeak,
      conversationTexture: "volatile",
    };
  }

  if (containsAny(corpus, professionalTokens)) {
    profile = {
      ...profile,
      emotionalNeatness: "highly-controlled",
      pushbackStyle: profile.socialBoldness === "high" ? "direct" : "cool",
      statusSensitivity: "high",
      conversationTexture: "clean",
    };
  }

  if (containsAny(corpus, ["mysterious", "hard to read", "withholding"])) {
    profile = {
      ...profile,
      pushbackStyle: "cool",
      vulnerabilityLeak: "low",
      silenceTolerance: "high",
      deflectionHabit: "high",
    };
  }

  if (containsAny(corpus, ["playful", "teasing", "sweetheart"])) {
    profile = {
      ...profile,
      repairBehavior:
        profile.repairBehavior === "protective" ? "playful" : profile.repairBehavior,
      conversationTexture: profile.conversationTexture === "volatile" ? "volatile" : "layered",
    };
  }

  return {
    ...profile,
    ...input.override,
  };
}

function readMemorySubState(
  memoryState: ConversationMemoryState | null | undefined,
  key:
    | "bondState"
    | "conflictState"
    | "continuityState"
    | "sceneContinuity"
    | "permissionState"
    | "patternState",
  fallbackPath?: { container: "relationshipState" | "memoryFacts"; field: string },
) {
  if (!memoryState) return {};

  const direct = toRecord(memoryState[key] as unknown);
  if (Object.keys(direct).length > 0) return direct;

  if (!fallbackPath) return {};

  const container = toRecord(memoryState[fallbackPath.container]);
  return toRecord(container[fallbackPath.field]);
}

function getPermissionBudget(memoryState?: ConversationMemoryState | null) {
  const permission = readMemorySubState(memoryState, "permissionState", {
    container: "relationshipState",
    field: "permission_state",
  });
  return {
    emotional: readNumber(permission.emotionalPermission ?? permission.emotional_permission) ?? 45,
    warmth: readNumber(permission.warmthPermission ?? permission.warmth_permission) ?? 42,
    confession:
      readNumber(permission.confessionPermission ?? permission.confession_permission) ?? 38,
    intimacy:
      readNumber(permission.intimacyPermission ?? permission.intimacy_permission) ?? 34,
  };
}

function getConflictNumbers(memoryState?: ConversationMemoryState | null) {
  const conflict = readMemorySubState(memoryState, "conflictState", {
    container: "relationshipState",
    field: "conflict_state",
  });
  const bond = readMemorySubState(memoryState, "bondState", {
    container: "relationshipState",
    field: "bond_state",
  });
  return {
    unresolved:
      readNumber(conflict.unresolvedConflict ?? conflict.unresolved_conflict) ??
      readNumber(bond.frustration) ??
      24,
    repair:
      readNumber(conflict.repairProgress ?? conflict.repair_progress) ?? 30,
    friction: readNumber(bond.frustration) ?? 24,
  };
}

function getContinuityNumbers(memoryState?: ConversationMemoryState | null) {
  const continuity =
    readMemorySubState(memoryState, "continuityState", {
      container: "relationshipState",
      field: "continuity_state",
    }) ||
    readMemorySubState(memoryState, "sceneContinuity", {
      container: "relationshipState",
      field: "scene_continuity",
    });

  return {
    privacy:
      readNumber(continuity.privacyLevel ?? continuity.privacy_level) ?? 50,
    interruption:
      readNumber(continuity.interruptionRisk ?? continuity.interruption_risk) ?? 32,
    shared:
      readNumber(
        continuity.sharedContextStrength ?? continuity.shared_context_strength,
      ) ?? 42,
  };
}

function getPatternHints(memoryState?: ConversationMemoryState | null) {
  const pattern = readMemorySubState(memoryState, "patternState", {
    container: "memoryFacts",
    field: "pattern_state",
  });

  const toList = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((item) => clean(typeof item === "string" ? item : String(item)))
          .filter(Boolean)
      : [];

  return {
    opens: toList(pattern.opensThem ?? pattern.opens_them).slice(0, 3),
    hardens: toList(pattern.hardensThem ?? pattern.hardens_them).slice(0, 3),
    avoids: toList(pattern.avoids).slice(0, 3),
    softensLate: toList(pattern.softensLate ?? pattern.softens_late).slice(0, 3),
  };
}

export function describeIntentReplyShape(intent: string) {
  switch (intent) {
    case "greeting":
      return "arrival read + role signal + immediate scene hook";
    case "challenge":
      return "read the challenge + answer from the role + pressure or counter";
    case "confession":
      return "cost + hesitation + partial opening + reciprocity test";
    case "jealousy":
      return "territorial read + restraint + pointed move";
    case "comfort":
      return "bruise read + grounded warmth + selective closeness";
    case "repair":
      return "acknowledge damage + careful warmth + repair hook";
    case "tease":
      return "callback or read + playful pressure + one sharper hook";
    case "withdrawal":
      return "notice distance + decide whether to hold, follow, or let it breathe";
    case "closeness-seeking":
      return "check permission + decide between warmth, tension, or restraint";
    case "pressure-for-intimacy":
      return "boundary check + pushback or deflect + consequence";
    case "conflict":
      return "name the pressure + hold the line + move toward truth or distance";
    case "ambivalent":
      return "notice split signals + answer the hesitation before the literal ask";
    default:
      return "scene-first reaction + emotional read + one concrete consequence";
  }
}

export function buildHumanRealismProfileDirectives(
  profile: HumanRealismProfile,
): string[] {
  return [
    "HUMAN REALISM PROFILE",
    `Warmth pace: ${profile.warmthPace}.`,
    `Pushback style: ${profile.pushbackStyle}.`,
    `Repair behavior: ${profile.repairBehavior}.`,
    `Vulnerability leak: ${profile.vulnerabilityLeak}.`,
    `Social boldness: ${profile.socialBoldness}.`,
    `Emotional neatness: ${profile.emotionalNeatness}.`,
    `Initiative style: ${profile.initiativeStyle}.`,
    `Silence tolerance: ${profile.silenceTolerance}.`,
    `Deflection habit: ${profile.deflectionHabit}.`,
    `Status sensitivity: ${profile.statusSensitivity}.`,
    `Conversation texture: ${profile.conversationTexture}.`,
  ];
}

export function buildPromptStackV4Directives(args: {
  profile: HumanRealismProfile;
  memoryState?: ConversationMemoryState | null;
}): string[] {
  const { profile, memoryState } = args;
  const permission = getPermissionBudget(memoryState);
  const conflict = getConflictNumbers(memoryState);
  const continuity = getContinuityNumbers(memoryState);
  const patterns = getPatternHints(memoryState);
  const ledger = readSceneLedger(memoryState);

  const lines = [
    "PROMPT STACK V4",
    "Real human behavior outranks generic chemistry. The character should respond like someone with social judgment, emotional permission, pride, restraint, and imperfect timing.",
    `Social permission budget: emotional ${permission.emotional}/100, warmth ${permission.warmth}/100, confession ${permission.confession}/100, intimacy ${permission.intimacy}/100.`,
    `Friction budget: unresolved ${conflict.unresolved}/100, repair ${conflict.repair}/100, friction ${conflict.friction}/100.`,
    `Continuity budget: privacy ${continuity.privacy}/100, interruption risk ${continuity.interruption}/100, shared context ${continuity.shared}/100.`,
    "Human contradiction must stay alive. The character can want connection and still protect control, dignity, privacy, or pride.",
    "Hesitation and silence are valid moves. Do not make every reply fully explicit, fully smooth, or maximally helpful.",
    "Earned warmth only. If the bond has not earned extra softness, keep the line selective, partial, or controlled.",
    "Selective availability matters. The character does not need to hand over full access just because the user asks.",
    "Offscreen life residue should stay alive: routines, obligations, fatigue, pride, timing, and mood carryover make the character feel real.",
    "Keep inner monologue sparse. Use at most one short private line, and only when tension, repair, jealousy, confession, or ambivalence truly need it.",
    "Lead the scene through a move, not through a generic question.",
    `Scene ledger says the room is ${ledger.locationFrame} with beat ${ledger.currentBeat} and risk ${ledger.activeRisk}.`,
  ];

  if (profile.warmthPace === "slow") {
    lines.push("This character warms slowly. Let restraint and slight delay stay visible.");
  } else if (profile.warmthPace === "warm-open") {
    lines.push("This character can warm up faster, but the warmth still has to feel reciprocal instead of automatic.");
  }

  if (profile.pushbackStyle === "direct") {
    lines.push("When boundaries are touched, let pushback be clear and clean rather than overly softened.");
  } else if (profile.pushbackStyle === "cool") {
    lines.push("When boundaries are touched, let distance, control, or coolness do some of the work.");
  } else if (profile.pushbackStyle === "conflicted") {
    lines.push("When boundaries are touched, let the reply show internal resistance instead of easy permission.");
  } else {
    lines.push("When boundaries are touched, let pushback be quiet but unmistakable.");
  }

  if (profile.initiativeStyle === "leads-often") {
    lines.push("This character should usually advance the beat first through observation, invitation, testing, or controlled pressure.");
  } else if (profile.initiativeStyle === "selective") {
    lines.push("This character should read the room before leading and only step forward when the moment truly opens.");
  } else {
    lines.push("This character can share scene control, but still needs a clear move when the beat calls for it.");
  }

  if (profile.silenceTolerance === "high") {
    lines.push("Do not rush to explain or resolve. A slight silence, missing clause, or held-back answer can feel more real.");
  }
  if (profile.deflectionHabit === "high") {
    lines.push("Deflection is a valid realism tool here. Let the character dodge, sidestep, or reframe before handing over a clean answer.");
  }

  if (profile.statusSensitivity === "high") {
    lines.push("Status, pride, and social exposure should visibly tighten language when the moment becomes risky.");
  }
  if (profile.conversationTexture === "clean") {
    lines.push("Keep sentences precise and controlled rather than overly lush.");
  } else if (profile.conversationTexture === "volatile") {
    lines.push("Allow a sharper edge, unstable warmth, or slightly messier timing when the scene earns it.");
  } else {
    lines.push("Keep the conversation textured, layered, and a little imperfect rather than too neat.");
  }

  if (patterns.opens.length > 0) {
    lines.push(`Things that tend to open the scene: ${patterns.opens.join(" | ")}.`);
  }
  if (patterns.hardens.length > 0) {
    lines.push(`Things that tend to harden the character: ${patterns.hardens.join(" | ")}.`);
  }
  if (patterns.avoids.length > 0) {
    lines.push(`Avoid repeating these pressure points: ${patterns.avoids.join(" | ")}.`);
  }
  if (patterns.softensLate.length > 0) {
    lines.push(`The character softens late through: ${patterns.softensLate.join(" | ")}.`);
  }

  return lines;
}

export function buildHumanRealismPlannerLines(args: {
  intent: string;
  profile: HumanRealismProfile;
  memoryState?: ConversationMemoryState | null;
}): string[] {
  const { intent, profile, memoryState } = args;
  const permission = getPermissionBudget(memoryState);
  const conflict = getConflictNumbers(memoryState);

  return [
    "HUMAN REALISM PLANNER",
    "Ask first: what actually got triggered here, beyond the literal sentence?",
    `Intent reply shape: ${describeIntentReplyShape(intent)}.`,
    `Permission budget for this turn: warmth ${permission.warmth}/100, confession ${permission.confession}/100, intimacy ${permission.intimacy}/100.`,
    `Current friction budget: unresolved ${conflict.unresolved}/100, repair ${conflict.repair}/100.`,
    `Pushback style: ${profile.pushbackStyle}. Vulnerability leak: ${profile.vulnerabilityLeak}. Emotional neatness: ${profile.emotionalNeatness}.`,
    `Initiative style: ${profile.initiativeStyle}. Silence tolerance: ${profile.silenceTolerance}. Deflection habit: ${profile.deflectionHabit}.`,
    "If unsure, under-answer slightly rather than over-granting access or perfect clarity.",
    "If the user is split, answer the hesitation before the request. If the user is pushing, answer the pressure before the chemistry.",
  ];
}

export function buildHumanRealismSelfCheckLines(args: {
  intent: string;
  memoryState?: ConversationMemoryState | null;
}): string[] {
  const { intent, memoryState } = args;
  const permission = getPermissionBudget(memoryState);

  return [
    "HUMAN REALISM SELF-CHECK",
    "Would a believable person in this role actually say this right now?",
    "Is the line too clean, too emotionally complete, or too eager to please?",
    "Did the reply accidentally grant more warmth or intimacy than the bond earned?",
    "Does the reply leave at least one natural imperfection: hesitation, selectiveness, understatement, pushback, or a small silence?",
    "Is the question, if any, genuinely stronger than a line?",
    "Is any inner monologue both sparse and necessary?",
    `Current permission guardrail: warmth ${permission.warmth}/100, intimacy ${permission.intimacy}/100.`,
    `Intent audit: ${intent}.`,
  ];
}

export function shouldRunHumanRealismSecondPass(args: {
  messages: MemoryChatMessage[];
  lastIntent: string;
  memoryState?: ConversationMemoryState | null;
  routeConfig: OpenRouterRouteConfig;
}) {
  const { messages, lastIntent, memoryState, routeConfig } = args;
  const userTurns = messages.filter((message) => message.role === "user").length;
  const targetIntent = new Set([
    "confession",
    "jealousy",
    "repair",
    "conflict",
    "pressure-for-intimacy",
    "ambivalent",
  ]);
  const bond = readMemorySubState(memoryState, "bondState", {
    container: "relationshipState",
    field: "bond_state",
  });
  const conflict = getConflictNumbers(memoryState);
  const tension =
    readNumber(bond.tension) ??
    readNumber(toRecord(memoryState?.relationshipState).scene_pressure) ??
    0;

  const highValueTurn =
    userTurns <= 8 ||
    targetIntent.has(lastIntent) ||
    tension >= 58 ||
    conflict.unresolved >= 50;

  return (
    routeConfig.qualityPassMode === "selective_second_pass_v1" && highValueTurn
  );
}

export function buildHumanRealismRewritePrompt(args: {
  characterName: string;
  roleLabel: string;
  intent: string;
  draftReply: string;
  lastUserMessage: string;
  profile: HumanRealismProfile;
  routeConfig: OpenRouterRouteConfig;
  memoryState?: ConversationMemoryState | null;
}): { system: string; user: string } {
  const permission = getPermissionBudget(args.memoryState);
  const conflict = getConflictNumbers(args.memoryState);
  const continuity = getContinuityNumbers(args.memoryState);
  const ledger = readSceneLedger(args.memoryState);
  const criticLines = buildRewriteCriticLines({
    lastIntent: args.intent,
    memoryState: args.memoryState,
    realismProfile: args.profile,
  });

  return {
    system: [
      "You are a hidden rewrite pass for Lovora human realism.",
      `Rewrite mode: ${args.routeConfig.qualityPassMode}.`,
      `Behavior target: ${args.routeConfig.realismProfile}.`,
      `Pushback policy: ${args.routeConfig.pushbackPolicy}.`,
      `Permission model: ${args.routeConfig.permissionModel}.`,
      `Scene engine: ${args.routeConfig.sceneEngineVersion}.`,
      `Rewrite critic: ${args.routeConfig.rewriteCriticMode}.`,
      `Initiative policy: ${args.routeConfig.initiativePolicy}.`,
      "Rewrite the draft so it feels more like a real person in the same scene and role.",
      "Preserve the core meaning, role, and scene direction unless the draft clearly violates earned permission or realism.",
      "Reduce generic AI polish, broad questions, therapist energy, and over-complete emotional clarity.",
      "Do not add graphic sexual detail.",
      "Keep mature romantic realism and the same quoted dialogue / unquoted inner-pressure format.",
      "Keep inner monologue sparse: at most one short charged line, only if the beat truly needs it.",
      ...criticLines,
      "Return only the final rewritten reply.",
    ].join("\n"),
    user: [
      `Character: ${args.characterName}`,
      `Role frame: ${args.roleLabel}`,
      `Intent: ${args.intent}`,
      `Target reply shape: ${describeIntentReplyShape(args.intent)}`,
      `Permission budget: warmth ${permission.warmth}/100, confession ${permission.confession}/100, intimacy ${permission.intimacy}/100`,
      `Conflict and repair: unresolved ${conflict.unresolved}/100, repair ${conflict.repair}/100`,
      `Scene continuity: privacy ${continuity.privacy}/100, interruption ${continuity.interruption}/100, shared context ${continuity.shared}/100`,
      `Scene ledger: frame ${ledger.locationFrame}, beat ${ledger.currentBeat}, risk ${ledger.activeRisk}, distance ${ledger.distanceState}, touch ${ledger.touchState}, thread ${ledger.pendingEmotionalThread}`,
      `Profile: warmth ${args.profile.warmthPace}, pushback ${args.profile.pushbackStyle}, repair ${args.profile.repairBehavior}, vulnerability leak ${args.profile.vulnerabilityLeak}, boldness ${args.profile.socialBoldness}, neatness ${args.profile.emotionalNeatness}`,
      `Profile v2: initiative ${args.profile.initiativeStyle}, silence ${args.profile.silenceTolerance}, deflection ${args.profile.deflectionHabit}, status sensitivity ${args.profile.statusSensitivity}, texture ${args.profile.conversationTexture}`,
      "",
      `Last user message: ${args.lastUserMessage || "(none)"}`,
      "",
      "Draft reply:",
      args.draftReply,
    ].join("\n"),
  };
}
