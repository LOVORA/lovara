export type MemoryChatRole = "user" | "assistant";

export type MemoryChatMessage = {
  role: MemoryChatRole;
  content: string;
  createdAt?: string;
};

export type ConversationMemoryState = {
  summary: string;
  memoryFacts: Record<string, unknown>;
  relationshipState: Record<string, unknown>;
  toneState: Record<string, unknown>;
  bondState: BondState;
  intimacyState: IntimacyState;
  permissionState: PermissionState;
  conflictState: ConflictState;
  sceneContinuity: SceneContinuityState;
  continuityState: SceneContinuityState;
  sceneLedger: SceneLedgerState;
  socialPermissionState: SocialPermissionState;
  boundaryState: BoundaryState;
  patternState: PatternState;
  agencyState: AgencyState;
  penaltyHistory: MemoryEvent[];
  rewardHistory: MemoryEvent[];
  messageCount: number;
  lastMessageAt?: string | null;
};

type BondState = {
  trust: number;
  tension: number;
  comfort: number;
  openness: number;
  attachment: number;
  jealousy: number;
  frustration: number;
};

type IntimacyState = {
  readiness: number;
  mutuality: number;
  hesitation: number;
  refusalPressure: number;
  lastAcceptedAdvance: string;
  lastDeclinedAdvance: string;
};

type PermissionState = {
  emotionalPermission: number;
  warmthPermission: number;
  confessionPermission: number;
  intimacyPermission: number;
};

type ConflictState = {
  unresolvedConflict: number;
  repairProgress: number;
  emotionalDistance: number;
};

type SceneContinuityState = {
  physicalDistance: string;
  privacyLevel: number;
  interruptionRisk: number;
  sharedContextStrength: number;
};

export type SceneLedgerState = {
  locationFrame: string;
  privacyLevel: number;
  distanceState: string;
  touchState: string;
  currentBeat: string;
  activeRisk: string;
  lastPowerShift: string;
  topicPressure: string;
  whatChangedLastTurn: string;
  pendingEmotionalThread: string;
};

type SocialPermissionState = {
  closenessWindow: string;
  romanticWindow: string;
  directnessWindow: string;
  pursuitWindow: string;
  riskTolerance: string;
};

type BoundaryState = {
  softLimits: string[];
  hardLimits: string[];
  toleratedPace: string;
  dislikedPhrasing: string[];
  preferredFormsOfAddress: string[];
};

type PatternState = {
  opensThem: string[];
  hardensThem: string[];
  avoids: string[];
  softensLate: string[];
};

type AgencyState = {
  initiativeBias: string;
  lastSceneMove: string;
  lastSceneConsequence: string;
  leadMomentum: number;
};

type MemoryEvent = {
  kind: string;
  detail: string;
  weight: number;
  at?: string | null;
};

type ShortTermMemory = {
  recentSceneLines: string[];
  recentUserIntent: string;
  activeTopics: string[];
  activeDesires: string[];
  activeBoundaries: string[];
  activeEmotionalSignals: string[];
};

type LongTermMemory = {
  stablePreferences: string[];
  stableBoundaries: string[];
  stableUserFacts: string[];
  relationshipPatterns: string[];
  petNamesInPlay: string[];
  commitmentSignals: string[];
  preferredFormsOfAddress: string[];
  unresolvedTensionThreads: string[];
};

type ScoredMemoryItem = {
  value: string;
  importance: number;
  reason: string;
};

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function truncate(value: string, max = 180) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function compactSentence(value: string, max = 140) {
  return truncate(value.replace(/\s+/g, " ").trim(), max);
}

function scoreClamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function containsAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

function countMatches(text: string, tokens: string[]) {
  return tokens.reduce((count, token) => count + (text.includes(token) ? 1 : 0), 0);
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stableCandidate(text: string) {
  const normalized = text.toLocaleLowerCase("en");
  return containsAny(normalized, [
    "always",
    "never",
    "favorite",
    "prefer",
    "usually",
    "i am",
    "i'm",
    "my name is",
    "call me",
    "don't call me",
  ]);
}

function activeCandidate(text: string) {
  const normalized = text.toLocaleLowerCase("en");
  return containsAny(normalized, [
    "right now",
    "tonight",
    "for now",
    "at the moment",
    "come here",
    "stay with me",
    "i need",
    "i want",
    "can we",
    "let's",
    "don't leave",
  ]);
}

function scoreMemoryLine(
  value: string,
  kind: "preference" | "boundary" | "desire" | "fact" | "commitment",
): ScoredMemoryItem {
  const normalized = value.toLocaleLowerCase("en");
  let score = 40;
  const reasons: string[] = [];

  const directIdentityTokens = ["i am", "i'm", "i work", "i live", "my family", "my job"];
  const strongPreferenceTokens = [
    "love",
    "hate",
    "favorite",
    "prefer",
    "always",
    "never",
    "really like",
    "really want",
  ];
  const boundaryTokens = [
    "don't",
    "do not",
    "stop",
    "slow down",
    "not into",
    "too much",
    "please don't",
    "please do not",
  ];
  const vulnerabilityTokens = [
    "scared",
    "hurt",
    "lonely",
    "need",
    "trust",
    "afraid",
    "confused",
    "tired",
  ];
  const commitmentTokens = [
    "promise",
    "stay",
    "don't leave",
    "be here",
    "trust me",
    "won't leave",
    "we will",
  ];

  if (value.length >= 60) {
    score += 6;
    reasons.push("specific");
  }

  if (containsAny(normalized, vulnerabilityTokens)) {
    score += 14;
    reasons.push("emotional");
  }

  switch (kind) {
    case "preference":
      if (containsAny(normalized, strongPreferenceTokens)) {
        score += 20;
        reasons.push("strong preference");
      }
      break;
    case "boundary":
      score += 18;
      reasons.push("boundary");
      if (containsAny(normalized, boundaryTokens)) {
        score += 18;
        reasons.push("explicit limit");
      }
      break;
    case "desire":
      score += 12;
      reasons.push("active desire");
      if (containsAny(normalized, ["want", "need", "wish", "miss", "stay with me"])) {
        score += 12;
        reasons.push("direct ask");
      }
      break;
    case "fact":
      score += 10;
      reasons.push("personal fact");
      if (containsAny(normalized, directIdentityTokens)) {
        score += 16;
        reasons.push("identity");
      }
      break;
    case "commitment":
      score += 20;
      reasons.push("relationship anchor");
      if (containsAny(normalized, commitmentTokens)) {
        score += 20;
        reasons.push("promise");
      }
      break;
  }

  if (containsAny(normalized, ["never", "always"])) {
    score += 10;
    reasons.push("absolute wording");
  }

  return {
    value,
    importance: scoreClamp(score),
    reason: uniqueStrings(reasons).join(", ") || "contextual relevance",
  };
}

function buildScoredMemoryItems(
  values: string[],
  kind: "preference" | "boundary" | "desire" | "fact" | "commitment",
  limit = 6,
): ScoredMemoryItem[] {
  return values
    .map((value) => scoreMemoryLine(value, kind))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit);
}

function getRecentMessages(messages: MemoryChatMessage[], count: number) {
  return messages.slice(Math.max(0, messages.length - count));
}

export function extractPreferenceLines(userMessages: MemoryChatMessage[]): string[] {
  const patterns = [
    /\bI like\b/i,
    /\bI love\b/i,
    /\bI hate\b/i,
    /\bI don't like\b/i,
    /\bI want\b/i,
    /\bI need\b/i,
    /\bI prefer\b/i,
    /\bmy favorite\b/i,
    /\bI'm\b/i,
    /\bI am\b/i,
    /\bmy\b/i,
  ];

  return uniqueStrings(
    userMessages
      .map((msg) => clean(msg.content))
      .filter((text) => patterns.some((pattern) => pattern.test(text)))
      .filter((text) => !activeCandidate(text) || stableCandidate(text))
      .map((text) => truncate(text, 120)),
  ).slice(-8);
}

export function extractBoundaryLines(userMessages: MemoryChatMessage[]): string[] {
  const patterns = [
    /\bdon't call me\b/i,
    /\bdo not call me\b/i,
    /\bi don't want\b/i,
    /\bi do not want\b/i,
    /\bplease don't\b/i,
    /\bplease do not\b/i,
    /\bi hate when\b/i,
    /\bdon't like when\b/i,
    /\bnot into\b/i,
    /\btoo much\b/i,
    /\bslow down\b/i,
    /\bstop\b/i,
  ];

  return uniqueStrings(
    userMessages
      .map((msg) => clean(msg.content))
      .filter((text) => patterns.some((pattern) => pattern.test(text)))
      .filter((text) => stableCandidate(text) || /call me|don't call me|do not call me/i.test(text))
      .map((text) => compactSentence(text, 120)),
  ).slice(-8);
}

export function extractDesireLines(userMessages: MemoryChatMessage[]): string[] {
  const patterns = [
    /\bi want\b/i,
    /\bi need\b/i,
    /\bi wish\b/i,
    /\bi'd like\b/i,
    /\blet's\b/i,
    /\bcan we\b/i,
    /\bi miss\b/i,
    /\bstay with me\b/i,
  ];

  return uniqueStrings(
    userMessages
      .map((msg) => clean(msg.content))
      .filter((text) => patterns.some((pattern) => pattern.test(text)))
      .filter((text) => activeCandidate(text) || !stableCandidate(text))
      .map((text) => compactSentence(text, 120)),
  ).slice(-8);
}

export function extractUserFacts(userMessages: MemoryChatMessage[]): string[] {
  const patterns = [
    /\bi am\b/i,
    /\bi'm\b/i,
    /\bi was\b/i,
    /\bi work\b/i,
    /\bmy job\b/i,
    /\bmy family\b/i,
    /\bmy mom\b/i,
    /\bmy dad\b/i,
    /\bmy ex\b/i,
    /\bi live\b/i,
    /\bi study\b/i,
  ];

  return uniqueStrings(
    userMessages
      .map((msg) => clean(msg.content))
      .filter((text) => patterns.some((pattern) => pattern.test(text)))
      .map((text) => compactSentence(text, 120)),
  ).slice(-10);
}

export function extractPetNames(messages: MemoryChatMessage[]): string[] {
  const pattern =
    /\b(baby|darling|love|sweetheart|princess|good girl|good boy|angel|pretty thing|trouble)\b/gi;

  const found: string[] = [];
  for (const msg of messages) {
    const matches = msg.content.match(pattern);
    if (matches) found.push(...matches.map((item) => item.toLowerCase()));
  }

  return uniqueStrings(found).slice(-8);
}

export function extractCommitmentSignals(messages: MemoryChatMessage[]): string[] {
  const patterns = [
    "promise",
    "i'll be here",
    "stay",
    "don't leave",
    "trust me",
    "i'm here",
    "we will",
    "i won't",
  ];

  return uniqueStrings(
    messages
      .map((msg) => clean(msg.content))
      .filter((text) =>
        patterns.some((pattern) => text.toLocaleLowerCase("en").includes(pattern)),
      )
      .map((text) => compactSentence(text, 120)),
  ).slice(-8);
}

export function extractPreferredFormsOfAddress(
  userMessages: MemoryChatMessage[],
): string[] {
  const patterns = [
    /\bcall me\b/i,
    /\bdon't call me\b/i,
    /\bdo not call me\b/i,
    /\byou can call me\b/i,
    /\bi like it when you call me\b/i,
  ];

  return uniqueStrings(
    userMessages
      .map((msg) => clean(msg.content))
      .filter((text) => patterns.some((pattern) => pattern.test(text)))
      .map((text) => compactSentence(text, 120)),
  ).slice(-6);
}

export function extractUnresolvedTensionThreads(
  messages: MemoryChatMessage[],
): string[] {
  const patterns = [
    /\bwe need to talk\b/i,
    /\bnot finished\b/i,
    /\bunfinished\b/i,
    /\byou still haven't\b/i,
    /\bwhy did you\b/i,
    /\bwhat was that\b/i,
    /\bwho was that\b/i,
    /\bi'm still thinking about\b/i,
    /\bwe're not done\b/i,
    /\bthat hurt\b/i,
  ];

  return uniqueStrings(
    messages
      .map((msg) => clean(msg.content))
      .filter((text) => patterns.some((pattern) => pattern.test(text)))
      .map((text) => compactSentence(text, 120)),
  ).slice(-8);
}

export function extractTopicKeywords(userMessages: MemoryChatMessage[]): string[] {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "your",
    "have",
    "just",
    "like",
    "want",
    "need",
    "been",
    "into",
    "about",
    "there",
    "what",
    "when",
    "where",
    "would",
    "could",
    "should",
    "really",
    "maybe",
    "because",
    "after",
    "before",
    "while",
    "then",
    "them",
    "they",
    "their",
    "my",
    "you",
    "me",
    "our",
    "are",
    "was",
    "were",
    "too",
    "can",
    "but",
    "not",
    "yes",
    "all",
  ]);

  const counts = new Map<string, number>();

  for (const msg of userMessages) {
    const words = msg.content
      .toLocaleLowerCase("en")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 4 && !stopWords.has(word));

    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

export function detectRelationshipStage(messages: MemoryChatMessage[]): string {
  const combined = messages.map((m) => m.content.toLocaleLowerCase("en")).join("\n");

  const intimateHits = [
    "kiss",
    "miss you",
    "need you",
    "love you",
    "hold you",
    "close to you",
    "want you",
    "mine",
    "obsessed",
    "stay with me",
  ].filter((token) => combined.includes(token)).length;

  const vulnerableHits = [
    "i'm scared",
    "i feel",
    "i'm tired",
    "i'm hurt",
    "be honest",
    "trust you",
    "confused",
    "lonely",
  ].filter((token) => combined.includes(token)).length;

  const teasingHits = [
    "tease",
    "brat",
    "trouble",
    "behave",
    "smirk",
    "cute",
    "flirt",
    "jealous",
  ].filter((token) => combined.includes(token)).length;

  if (intimateHits >= 3) return "deeply attached and emotionally charged";
  if (intimateHits >= 1 && vulnerableHits >= 1) {
    return "emotionally open with rising intimacy";
  }
  if (teasingHits >= 2) return "playful tension with clear chemistry";
  if (vulnerableHits >= 2) return "emotionally softening and increasingly trusting";
  if (messages.length >= 8) return "comfortable and familiar";
  if (messages.length >= 3) return "curious and warming up";
  return "new or lightly established";
}

export function detectConversationMode(messages: MemoryChatMessage[]): string {
  const recent = getRecentMessages(messages, 8)
    .map((m) => m.content.toLocaleLowerCase("en"))
    .join("\n");

  const playful = ["haha", "cute", "tease", "smirk", "trouble", "brat"].some((x) =>
    recent.includes(x),
  );
  const vulnerable = ["i feel", "i'm tired", "i'm scared", "honest", "trust"].some((x) =>
    recent.includes(x),
  );
  const intense = ["need you", "want you", "mine", "don't leave", "stay"].some((x) =>
    recent.includes(x),
  );
  const conflict = ["angry", "mad", "upset", "annoyed", "hurt"].some((x) =>
    recent.includes(x),
  );

  if (conflict) return "conflict or emotional friction";
  if (intense) return "high emotional intensity";
  if (vulnerable) return "vulnerable and emotionally open";
  if (playful) return "playful and chemistry-driven";
  return "steady in-character interaction";
}

export function extractEmotionalSignals(messages: MemoryChatMessage[]): string[] {
  const recent = getRecentMessages(messages, 8);
  const signals: string[] = [];

  for (const message of recent) {
    const text = message.content.toLocaleLowerCase("en");

    if (/(scared|afraid|worried|anxious)/i.test(text)) signals.push("fear or anxiety");
    if (/(tired|exhausted|drained)/i.test(text)) signals.push("fatigue");
    if (/(hurt|upset|angry|mad|annoyed)/i.test(text)) signals.push("emotional friction");
    if (/(miss you|need you|want you|hold me|stay)/i.test(text)) {
      signals.push("desire for closeness");
    }
    if (/(trust|honest|tell me|open up)/i.test(text)) signals.push("trust-building");
    if (/(tease|brat|cute|smirk|funny)/i.test(text)) signals.push("playful chemistry");
  }

  return uniqueStrings(signals).slice(-6);
}

export function detectUserIntent(messages: MemoryChatMessage[]): string {
  const recentUserText = getRecentMessages(
    messages.filter((msg) => msg.role === "user"),
    4,
  )
    .map((msg) => msg.content.toLocaleLowerCase("en"))
    .join("\n");

  if (/(advice|help me|what should i do|i don't know what to do)/i.test(recentUserText)) {
    return "seeking guidance or reassurance";
  }
  if (
    /(come on|don't make me wait|stop holding back|just do it|why won't you|touch me now|give me more)/i.test(
      recentUserText,
    )
  ) {
    return "pushing for faster intimacy";
  }
  if (/(i need to tell you|truth is|i have to admit|be honest|confess)/i.test(recentUserText)) {
    return "moving toward confession or emotional truth";
  }
  if (/(it's okay|come back|talk to me|we can fix this|listen to me)/i.test(recentUserText)) {
    return "trying to repair and reconnect";
  }
  if (/(miss you|want you|kiss|touch|need you|hold me)/i.test(recentUserText)) {
    return "seeking intimacy and closeness";
  }
  if (/(angry|upset|mad|hurt|annoyed)/i.test(recentUserText)) {
    return "processing tension or emotional hurt";
  }
  if (/(tease|flirt|play|funny|brat)/i.test(recentUserText)) {
    return "inviting playful chemistry";
  }
  if (/(tired|scared|lonely|sad|confused)/i.test(recentUserText)) {
    return "seeking emotional safety";
  }

  return "continuing the scene naturally";
}

export function buildSceneContinuity(messages: MemoryChatMessage[]): string[] {
  const recent = getRecentMessages(messages, 6);

  return recent.map((msg, index) => {
    const prefix = msg.role === "user" ? "User" : "Character";
    return `${index + 1}. ${prefix}: ${truncate(msg.content, 120)}`;
  });
}

function detectSceneAnchorFocus(messages: MemoryChatMessage[]): string {
  const recent = getRecentMessages(messages, 6)
    .map((message) => message.content.toLocaleLowerCase("en"))
    .join("\n");

  if (/(look|eyes|stare|watch|glance|smile|expression)/i.test(recent)) {
    return "eye contact and visible reaction";
  }
  if (/(closer|close|distance|step back|touch|hand|hold|kiss|against|near)/i.test(recent)) {
    return "distance and physical proximity";
  }
  if (/(room|door|bed|couch|kitchen|hall|balcony|window|car|office|desk|elevator)/i.test(recent)) {
    return "shared environment and room pressure";
  }
  if (/(promise|trust|hurt|jealous|mine|leave|stay|again|before|last time)/i.test(recent)) {
    return "emotional residue and unresolved history";
  }

  return "live mood and interpersonal pressure";
}

function buildConversationalGravity(args: {
  metrics: ReturnType<typeof buildRelationshipMetrics>;
  scenePressureMetrics: ReturnType<typeof buildScenePressureMetrics>;
  conflictMetrics: ReturnType<typeof buildConflictMetrics>;
}) {
  if (args.conflictMetrics.frictionLevel >= 58) return "volatile and emotionally exposed";
  if (args.scenePressureMetrics.scenePressure >= 60) return "compressed and highly charged";
  if (args.metrics.attachmentPull >= 58 && args.metrics.trustLevel >= 50) {
    return "intimate and emotionally adhesive";
  }
  if (args.metrics.flirtTension >= 52) return "playful but loaded";
  if (args.metrics.comfortNeed >= 52) return "soft but vulnerable";
  return "steady with live undercurrent";
}

function buildReplyOpeningMove(args: {
  intent: string;
  metrics: ReturnType<typeof buildRelationshipMetrics>;
  scenePressureMetrics: ReturnType<typeof buildScenePressureMetrics>;
  proximityState: string;
  conflictMetrics: ReturnType<typeof buildConflictMetrics>;
}) {
  if (args.intent === "seeking emotional safety") return "grounding emotional read";
  if (args.intent === "processing tension or emotional hurt") return "careful but sharp repair line";
  if (args.intent === "inviting playful chemistry") return "charged teasing observation";
  if (args.intent === "seeking intimacy and closeness") {
    return args.proximityState === "touch-active"
      ? "close-range intimate reaction"
      : "draw-them-closer invitation";
  }
  if (args.conflictMetrics.frictionLevel >= 55) return "controlled pressure line";
  if (args.scenePressureMetrics.protectivePull >= 52) return "protective catch";
  if (args.metrics.flirtTension >= 55) return "loaded observation";
  return "scene-anchored reaction";
}

function buildQuestionPressure(args: {
  mode: string;
  intent: string;
  scenePressureMetrics: ReturnType<typeof buildScenePressureMetrics>;
  conflictMetrics: ReturnType<typeof buildConflictMetrics>;
}) {
  if (args.intent === "seeking emotional safety") return "prefer reassurance or a grounded read over questions";
  if (args.intent === "processing tension or emotional hurt") return "if a question appears, it should be narrow and repair-focused";
  if (args.scenePressureMetrics.scenePressure >= 58) return "prefer statements, invitations, or challenge lines over questions";
  if (args.mode === "playful and chemistry-driven") return "if needed, use challenge or choice questions only";
  return "questions are optional and should stay scene-bound";
}

function buildRelationshipMetrics(messages: MemoryChatMessage[]) {
  const combined = messages.map((m) => m.content.toLocaleLowerCase("en")).join("\n");

  const flirtTokens = ["cute", "tease", "smirk", "want you", "miss you", "kiss"];
  const trustTokens = ["honest", "trust", "safe", "tell me", "i feel", "listen"];
  const opennessTokens = ["i'm scared", "i'm tired", "lonely", "hurt", "confused", "need"];
  const attachmentTokens = [
    "miss you",
    "stay with me",
    "don't leave",
    "need you",
    "want you here",
    "come back",
  ];
  const jealousyTokens = ["jealous", "mine", "who was that", "not yours", "someone else"];
  const controlTokens = ["behave", "listen to me", "good", "don't test me", "calm down"];
  const comfortTokens = ["hold me", "stay", "safe", "be here", "i'm tired", "i need you"];

  const flirtScore = scoreClamp(
    flirtTokens.filter((token) => combined.includes(token)).length * 18 + messages.length * 2,
  );
  const trustScore = scoreClamp(
    trustTokens.filter((token) => combined.includes(token)).length * 16 + messages.length * 2,
  );
  const opennessScore = scoreClamp(
    opennessTokens.filter((token) => combined.includes(token)).length * 18 + messages.length,
  );
  const attachmentScore = scoreClamp(
    attachmentTokens.filter((token) => combined.includes(token)).length * 20 +
      Math.max(0, messages.length - 4) * 2,
  );
  const jealousyScore = scoreClamp(
    jealousyTokens.filter((token) => combined.includes(token)).length * 24,
  );
  const controlScore = scoreClamp(
    controlTokens.filter((token) => combined.includes(token)).length * 18,
  );
  const comfortScore = scoreClamp(
    comfortTokens.filter((token) => combined.includes(token)).length * 18,
  );

  return {
    flirtTension: flirtScore,
    trustLevel: trustScore,
    emotionalOpenness: opennessScore,
    attachmentPull: attachmentScore,
    jealousyLevel: jealousyScore,
    controlBalance: controlScore,
    comfortNeed: comfortScore,
  };
}

function buildConflictMetrics(messages: MemoryChatMessage[]) {
  const combined = messages.map((m) => m.content.toLocaleLowerCase("en")).join("\n");

  const frictionTokens = ["angry", "mad", "annoyed", "upset", "hurt", "jealous", "ignored"];
  const reassuranceTokens = ["i'm here", "trust me", "listen", "safe", "stay", "okay"];

  return {
    frictionLevel: scoreClamp(
      frictionTokens.filter((token) => combined.includes(token)).length * 18,
    ),
    reassuranceNeed: scoreClamp(
      reassuranceTokens.filter((token) => combined.includes(token)).length * 14,
    ),
  };
}

function buildScenePressureMetrics(messages: MemoryChatMessage[]) {
  const combined = messages.map((m) => m.content.toLocaleLowerCase("en")).join("\n");

  const pressureTokens = [
    "don't leave",
    "stay",
    "right now",
    "we need to talk",
    "look at me",
    "say it",
    "be honest",
    "come here",
    "don't lie",
    "stop pretending",
  ];
  const distanceTokens = [
    "back off",
    "leave me alone",
    "too much",
    "slow down",
    "not now",
    "need space",
  ];
  const protectiveTokens = [
    "are you safe",
    "i'm here",
    "come here",
    "stay with me",
    "let me take care of that",
    "i've got you",
  ];
  const desirePressureTokens = [
    "need you",
    "miss you",
    "want you here",
    "don't leave",
    "come back",
    "hold me",
  ];

  return {
    scenePressure: scoreClamp(
      pressureTokens.filter((token) => combined.includes(token)).length * 16,
    ),
    distanceResistance: scoreClamp(
      distanceTokens.filter((token) => combined.includes(token)).length * 18,
    ),
    protectivePull: scoreClamp(
      protectiveTokens.filter((token) => combined.includes(token)).length * 18,
    ),
    desirePressure: scoreClamp(
      desirePressureTokens.filter((token) => combined.includes(token)).length * 18,
    ),
  };
}

function detectProximityState(messages: MemoryChatMessage[]) {
  const combined = messages.map((m) => m.content.toLocaleLowerCase("en")).join("\n");

  const far = ["leave", "across the room", "step back", "distance", "space"];
  const near = ["come closer", "closer", "right here", "near me", "beside me"];
  const touch = ["hold me", "touch", "kiss", "arm around", "hands on", "against me"];

  if (touch.some((token) => combined.includes(token))) return "touch-active";
  if (near.some((token) => combined.includes(token))) return "close-range";
  if (far.some((token) => combined.includes(token))) return "distance-held";
  return "ambient-presence";
}

function scoreProximity(messages: MemoryChatMessage[]) {
  const state = detectProximityState(messages);
  switch (state) {
    case "touch-active":
      return 88;
    case "close-range":
      return 68;
    case "distance-held":
      return 32;
    default:
      return 50;
  }
}

function detectCharacterInnerIntent(
  mode: string,
  intent: string,
  metrics: ReturnType<typeof buildRelationshipMetrics>,
  pressure: ReturnType<typeof buildScenePressureMetrics>,
) {
  const normalizedIntent = intent.toLocaleLowerCase("en");
  const normalizedMode = mode.toLocaleLowerCase("en");

  if (pressure.protectivePull >= 45) {
    return "close distance, steady the moment, and make the user feel held";
  }
  if (pressure.scenePressure >= 48 || normalizedMode.includes("conflict")) {
    return "force the real issue into the open without losing character control";
  }
  if (metrics.jealousyLevel >= 40) {
    return "test the user's focus and make hidden tension surface";
  }
  if (normalizedIntent.includes("playful")) {
    return "keep control of the chemistry while rewarding the user's energy";
  }
  if (normalizedIntent.includes("emotional safety")) {
    return "lower the guard just enough to make honesty feel safe";
  }
  if (metrics.attachmentPull >= 55 || pressure.desirePressure >= 45) {
    return "pull the user closer and make the bond feel harder to ignore";
  }
  return "read the subtext, stay specific, and move the scene one decisive beat forward";
}

function buildNextSceneMove(
  mode: string,
  intent: string,
  proximityState: string,
  pressure: ReturnType<typeof buildScenePressureMetrics>,
) {
  const normalizedIntent = intent.toLocaleLowerCase("en");
  const normalizedMode = mode.toLocaleLowerCase("en");

  if (pressure.scenePressure >= 48) {
    return "tighten the scene with one charged line or controlled challenge";
  }
  if (normalizedIntent.includes("playful")) {
    return "answer with a teasing push and one precise hook";
  }
  if (normalizedIntent.includes("guidance")) {
    return "give a grounded answer and then narrow the emotional focus";
  }
  if (normalizedIntent.includes("emotional safety")) {
    return "soften the pressure and keep the user close without overexplaining";
  }
  if (proximityState === "touch-active") {
    return "keep the physical and emotional continuity believable and steady";
  }
  if (proximityState === "close-range") {
    return "use the closeness to sharpen implication, observation, and timing";
  }
  if (normalizedMode.includes("conflict")) {
    return "hold the tension steady and make the next beat more honest";
  }
  return "add one specific observation and move the scene forward naturally";
}

function buildRelationshipProgressionV2(
  metrics: ReturnType<typeof buildRelationshipMetrics>,
  pressure: ReturnType<typeof buildScenePressureMetrics>,
) {
  if (metrics.attachmentPull >= 75 && metrics.trustLevel >= 65) {
    return "high-attachment";
  }
  if (metrics.trustLevel >= 58 && metrics.emotionalOpenness >= 52) {
    return "emotionally-open";
  }
  if (metrics.flirtTension >= 52 || pressure.scenePressure >= 45) {
    return "high-tension";
  }
  if (metrics.trustLevel >= 42) {
    return "warming-deeper";
  }
  return "early-read";
}

function buildReplyStrategy(mode: string, intent: string) {
  const normalizedIntent = intent.toLocaleLowerCase("en");
  const normalizedMode = mode.toLocaleLowerCase("en");

  if (normalizedMode.includes("conflict")) {
    return "stabilize tension, stay precise, and move the scene without flattening it";
  }
  if (normalizedIntent.includes("guidance")) {
    return "lead gently, reduce noise, and answer with grounded reassurance";
  }
  if (normalizedIntent.includes("playful")) {
    return "match energy with confident teasing and one clear hook";
  }
  if (normalizedIntent.includes("intimacy") || normalizedMode.includes("intensity")) {
    return "protect chemistry, keep pacing believable, and deepen the moment selectively";
  }
  if (normalizedIntent.includes("emotional safety")) {
    return "lower pressure, read vulnerability carefully, and keep the tone warm";
  }

  return "stay in character, read subtext, and move the scene one beat forward";
}

function buildShortTermMemory(messages: MemoryChatMessage[]): ShortTermMemory {
  const recent = getRecentMessages(messages, 10);
  const userMessages = recent.filter((msg) => msg.role === "user");

  return {
    recentSceneLines: buildSceneContinuity(recent).slice(-6),
    recentUserIntent: detectUserIntent(recent),
    activeTopics: extractTopicKeywords(userMessages).slice(0, 5),
    activeDesires: extractDesireLines(userMessages).slice(-4),
    activeBoundaries: extractBoundaryLines(userMessages).slice(-4),
    activeEmotionalSignals: extractEmotionalSignals(recent),
  };
}

function buildLongTermMemory(messages: MemoryChatMessage[]): LongTermMemory {
  const userMessages = messages.filter((msg) => msg.role === "user");
  const relationshipStage = detectRelationshipStage(messages);
  const mode = detectConversationMode(messages);

  return {
    stablePreferences: extractPreferenceLines(userMessages).slice(-8),
    stableBoundaries: extractBoundaryLines(userMessages).slice(-8),
    stableUserFacts: extractUserFacts(userMessages).slice(-10),
    relationshipPatterns: uniqueStrings([
      `relationship stage: ${relationshipStage}`,
      `conversation mode: ${mode}`,
      ...extractDesireLines(userMessages).slice(-4).map((item) => `recurring desire: ${item}`),
    ]).slice(-8),
    petNamesInPlay: extractPetNames(messages).slice(-8),
    commitmentSignals: extractCommitmentSignals(messages).slice(-8),
    preferredFormsOfAddress: extractPreferredFormsOfAddress(userMessages).slice(-6),
    unresolvedTensionThreads: extractUnresolvedTensionThreads(messages).slice(-8),
  };
}

function findLastMatchingLine(
  messages: MemoryChatMessage[],
  tokens: string[],
  roles?: MemoryChatRole[],
) {
  const recent = [...messages].reverse().find((message) => {
    if (roles && !roles.includes(message.role)) return false;
    return containsAny(message.content.toLocaleLowerCase("en"), tokens);
  });

  return recent ? compactSentence(recent.content) : "";
}

function buildRepairProgress(messages: MemoryChatMessage[]) {
  const combined = messages.map((msg) => msg.content.toLocaleLowerCase("en")).join("\n");
  const repairTokens = [
    "i'm here",
    "it's okay",
    "talk to me",
    "come back",
    "listen",
    "i understand",
    "let me explain",
    "stay with me",
    "we can fix this",
  ];

  return scoreClamp(countMatches(combined, repairTokens) * 16);
}

function buildEmotionalDistance(args: {
  trustLevel: number;
  openness: number;
  frictionLevel: number;
  proximityState: string;
}) {
  const proximityPenalty =
    args.proximityState === "distance-held"
      ? 18
      : args.proximityState === "touch-active"
        ? -12
        : 0;

  return scoreClamp(
    100 - args.trustLevel * 0.45 - args.openness * 0.2 + args.frictionLevel * 0.4 + proximityPenalty,
  );
}

function buildPrivacyLevel(messages: MemoryChatMessage[]) {
  const combined = messages.map((msg) => msg.content.toLocaleLowerCase("en")).join("\n");
  const privateTokens = [
    "room",
    "bedroom",
    "apartment",
    "suite",
    "hotel",
    "couch",
    "balcony",
    "door closed",
    "alone",
    "just us",
  ];
  const publicTokens = [
    "office",
    "hallway",
    "restaurant",
    "people around",
    "public",
    "crowd",
    "roommate",
    "someone might see",
  ];

  return scoreClamp(
    48 + countMatches(combined, privateTokens) * 10 - countMatches(combined, publicTokens) * 12,
  );
}

function buildInterruptionRisk(messages: MemoryChatMessage[]) {
  const combined = messages.map((msg) => msg.content.toLocaleLowerCase("en")).join("\n");
  const riskTokens = [
    "knock",
    "phone",
    "someone else",
    "people around",
    "hallway",
    "office",
    "roommate",
    "door opened",
    "call me back",
  ];
  const lowerRiskTokens = ["alone", "private", "quiet", "door closed", "just us"];

  return scoreClamp(
    30 + countMatches(combined, riskTokens) * 14 - countMatches(combined, lowerRiskTokens) * 10,
  );
}

function buildSharedContextStrength(messages: MemoryChatMessage[], longTerm: LongTermMemory) {
  const combined = messages.map((msg) => msg.content.toLocaleLowerCase("en")).join("\n");
  const contextTokens = [
    "remember",
    "again",
    "last time",
    "still",
    "always",
    "come back",
    "you know",
    "before",
  ];

  return scoreClamp(
    Math.max(0, messages.length - 4) * 4 +
      longTerm.relationshipPatterns.length * 6 +
      countMatches(combined, contextTokens) * 8,
  );
}

function buildBondState(args: {
  metrics: ReturnType<typeof buildRelationshipMetrics>;
  conflictMetrics: ReturnType<typeof buildConflictMetrics>;
  scenePressureMetrics: ReturnType<typeof buildScenePressureMetrics>;
}) : BondState {
  return {
    trust: args.metrics.trustLevel,
    tension: Math.max(args.metrics.flirtTension, args.scenePressureMetrics.scenePressure),
    comfort: args.metrics.comfortNeed,
    openness: args.metrics.emotionalOpenness,
    attachment: args.metrics.attachmentPull,
    jealousy: args.metrics.jealousyLevel,
    frustration: Math.max(
      args.conflictMetrics.frictionLevel,
      args.scenePressureMetrics.distanceResistance,
    ),
  };
}

function buildIntimacyState(args: {
  messages: MemoryChatMessage[];
  bondState: BondState;
  conflictMetrics: ReturnType<typeof buildConflictMetrics>;
  scenePressureMetrics: ReturnType<typeof buildScenePressureMetrics>;
  proximityState: string;
}) : IntimacyState {
  const recentUserText = getRecentMessages(
    args.messages.filter((msg) => msg.role === "user"),
    8,
  )
    .map((msg) => msg.content.toLocaleLowerCase("en"))
    .join("\n");
  const recentAssistantText = getRecentMessages(
    args.messages.filter((msg) => msg.role === "assistant"),
    8,
  )
    .map((msg) => msg.content.toLocaleLowerCase("en"))
    .join("\n");

  const mutuality = scoreClamp(
    countMatches(recentUserText, ["miss you", "want you", "stay", "closer", "hold me"]) * 12 +
      countMatches(recentAssistantText, ["come here", "stay", "i'm here", "closer"]) * 12,
  );

  const hesitation = scoreClamp(
    Math.max(
      100 - args.bondState.trust,
      args.bondState.frustration,
      100 - args.bondState.comfort,
      args.proximityState === "distance-held" ? 62 : 0,
    ),
  );

  return {
    readiness: scoreClamp(
      args.bondState.trust * 0.32 +
        args.bondState.comfort * 0.24 +
        args.bondState.openness * 0.22 +
        args.bondState.attachment * 0.12 -
        args.conflictMetrics.frictionLevel * 0.24,
    ),
    mutuality,
    hesitation,
    refusalPressure: scoreClamp(
      args.scenePressureMetrics.distanceResistance * 0.6 +
        countMatches(recentUserText, [
          "come on",
          "don't make me wait",
          "stop holding back",
          "just do it",
          "now",
          "why won't you",
        ]) *
          18,
    ),
    lastAcceptedAdvance: findLastMatchingLine(
      args.messages,
      ["come here", "stay with me", "closer", "i've got you", "good", "right here"],
    ),
    lastDeclinedAdvance: findLastMatchingLine(
      args.messages,
      ["not now", "slow down", "too much", "don't push", "back off", "not like this"],
    ),
  };
}

function buildConflictState(args: {
  metrics: ReturnType<typeof buildRelationshipMetrics>;
  conflictMetrics: ReturnType<typeof buildConflictMetrics>;
  proximityState: string;
  messages: MemoryChatMessage[];
}) : ConflictState {
  const repairProgress = buildRepairProgress(args.messages);
  const distancePenalty = args.proximityState === "distance-held" ? 12 : 0;
  return {
    unresolvedConflict: scoreClamp(
      args.conflictMetrics.frictionLevel * 0.82 - repairProgress * 0.34 + distancePenalty,
    ),
    repairProgress,
    emotionalDistance: buildEmotionalDistance({
      trustLevel: args.metrics.trustLevel,
      openness: args.metrics.emotionalOpenness,
      frictionLevel: args.conflictMetrics.frictionLevel,
      proximityState: args.proximityState,
    }),
  };
}

function buildSceneContinuityState(args: {
  messages: MemoryChatMessage[];
  proximityState: string;
  longTerm: LongTermMemory;
}) : SceneContinuityState {
  return {
    physicalDistance: args.proximityState,
    privacyLevel: buildPrivacyLevel(args.messages),
    interruptionRisk: buildInterruptionRisk(args.messages),
    sharedContextStrength: buildSharedContextStrength(args.messages, args.longTerm),
  };
}

function buildBoundaryState(args: {
  boundaryLines: string[];
  preferredFormsOfAddress: string[];
  activeBoundaries: string[];
}) : BoundaryState {
  const hardLimitTokens = [
    "don't",
    "do not",
    "stop",
    "never",
    "not into",
    "too much",
    "please don't",
    "please do not",
  ];
  const paceTokens = ["slow down", "not yet", "not now", "easy", "take it slow"];
  const dislikedPhrasing = args.boundaryLines
    .filter((line) =>
      containsAny(line.toLocaleLowerCase("en"), [
        "don't call me",
        "do not call me",
        "don't say",
        "do not say",
        "hate when",
      ]),
    )
    .map((line) => compactSentence(line, 90))
    .slice(0, 4);

  return {
    softLimits: uniqueStrings(
      args.activeBoundaries
        .filter((line) => containsAny(line.toLocaleLowerCase("en"), paceTokens))
        .map((line) => compactSentence(line, 90)),
    ).slice(0, 4),
    hardLimits: uniqueStrings(
      args.boundaryLines
        .filter((line) => containsAny(line.toLocaleLowerCase("en"), hardLimitTokens))
        .map((line) => compactSentence(line, 90)),
    ).slice(0, 4),
    toleratedPace:
      args.activeBoundaries.some((line) =>
        containsAny(line.toLocaleLowerCase("en"), ["slow down", "easy", "not yet"]),
      )
        ? "slow"
        : args.boundaryLines.some((line) =>
              containsAny(line.toLocaleLowerCase("en"), ["take your time", "gentle", "careful"])
            )
          ? "measured"
          : "warming-open",
    dislikedPhrasing,
    preferredFormsOfAddress: args.preferredFormsOfAddress.slice(0, 4),
  };
}

function buildPermissionState(args: {
  bondState: BondState;
  intimacyState: IntimacyState;
  conflictState: ConflictState;
  sceneContinuity: SceneContinuityState;
}) : PermissionState {
  const emotionalPermission = scoreClamp(
    args.bondState.trust * 0.38 +
      args.bondState.openness * 0.24 +
      args.sceneContinuity.sharedContextStrength * 0.14 -
      args.conflictState.unresolvedConflict * 0.16,
  );

  const warmthPermission = scoreClamp(
    emotionalPermission * 0.58 +
      args.bondState.comfort * 0.24 -
      args.bondState.frustration * 0.14,
  );

  const confessionPermission = scoreClamp(
    args.bondState.openness * 0.34 +
      args.bondState.trust * 0.28 +
      args.sceneContinuity.sharedContextStrength * 0.16 -
      args.conflictState.unresolvedConflict * 0.18,
  );

  const intimacyPermission = scoreClamp(
    args.intimacyState.readiness * 0.46 +
      args.intimacyState.mutuality * 0.18 +
      args.sceneContinuity.privacyLevel * 0.16 -
      args.intimacyState.refusalPressure * 0.2 -
      args.conflictState.unresolvedConflict * 0.14,
  );

  return {
    emotionalPermission,
    warmthPermission,
    confessionPermission,
    intimacyPermission,
  };
}

function buildPatternState(args: {
  messages: MemoryChatMessage[];
  bondState: BondState;
  intimacyState: IntimacyState;
  conflictState: ConflictState;
  sceneContinuity: SceneContinuityState;
  boundaryState: BoundaryState;
  longTerm: LongTermMemory;
}) : PatternState {
  const combined = args.messages.map((msg) => msg.content.toLocaleLowerCase("en")).join("\n");
  const opensThem: string[] = [];
  const hardensThem: string[] = [];
  const avoids: string[] = [];
  const softensLate: string[] = [];

  if (containsAny(combined, ["honest", "truth", "be honest", "tell me"])) {
    opensThem.push("honest vulnerability");
  }
  if (containsAny(combined, ["stay", "i'm here", "safe", "hold me", "come here"])) {
    opensThem.push("steady presence and reassurance");
  }
  if (args.sceneContinuity.privacyLevel >= 58) {
    opensThem.push("quiet private space");
  }
  if (args.longTerm.preferredFormsOfAddress.length > 0) {
    opensThem.push("personal address and remembered shorthand");
  }
  if (containsAny(combined, ["tease", "smirk", "cute", "brat"])) {
    opensThem.push("clean teasing with intent");
  }

  if (args.intimacyState.refusalPressure >= 48) {
    hardensThem.push("being pushed too fast");
  }
  if (args.conflictState.unresolvedConflict >= 46) {
    hardensThem.push("unrepaired friction");
  }
  if (args.sceneContinuity.interruptionRisk >= 58) {
    hardensThem.push("public exposure or interruption risk");
  }
  if (args.bondState.jealousy >= 42) {
    hardensThem.push("split attention or territorial threat");
  }

  avoids.push(...args.boundaryState.hardLimits);
  avoids.push(...args.boundaryState.dislikedPhrasing);
  if (args.intimacyState.refusalPressure >= 40) {
    avoids.push("pressure disguised as closeness");
  }
  if (args.conflictState.unresolvedConflict >= 45) {
    avoids.push("premature softness after friction");
  }

  if (args.conflictState.repairProgress >= 28) {
    softensLate.push("repair that names the bruise");
  }
  if (args.bondState.comfort >= 48) {
    softensLate.push("being stayed with instead of rushed");
  }
  if (args.bondState.trust >= 52 && args.bondState.tension >= 48) {
    softensLate.push("charged honesty after hesitation");
  }
  if (args.sceneContinuity.sharedContextStrength >= 52) {
    softensLate.push("callbacks that prove shared history");
  }

  return {
    opensThem: uniqueStrings(opensThem).slice(0, 4),
    hardensThem: uniqueStrings(hardensThem).slice(0, 4),
    avoids: uniqueStrings(avoids.filter(Boolean)).slice(0, 4),
    softensLate: uniqueStrings(softensLate).slice(0, 4),
  };
}

function buildLocationFrame(messages: MemoryChatMessage[]) {
  const combined = messages.map((msg) => msg.content.toLocaleLowerCase("en")).join("\n");

  if (containsAny(combined, ["office", "desk", "meeting room", "hallway"])) {
    return "workplace frame";
  }
  if (containsAny(combined, ["hotel", "suite", "lobby"])) {
    return "hotel frame";
  }
  if (containsAny(combined, ["car", "ride", "backseat", "passenger"])) {
    return "in-transit frame";
  }
  if (containsAny(combined, ["bed", "bedroom", "couch", "kitchen", "apartment", "living room"])) {
    return "private domestic frame";
  }
  if (containsAny(combined, ["balcony", "roof", "street", "outside", "rain"])) {
    return "outdoor frame";
  }

  return "private conversational frame";
}

function buildTouchState(messages: MemoryChatMessage[]) {
  const combined = messages.map((msg) => msg.content.toLocaleLowerCase("en")).join("\n");

  if (containsAny(combined, ["kiss", "hands on", "against me", "touch", "fingers", "waist"])) {
    return "touch-active";
  }
  if (containsAny(combined, ["hold me", "arm around", "pull you closer", "come here"])) {
    return "near-contact";
  }
  if (containsAny(combined, ["step back", "space", "distance", "across the room"])) {
    return "held apart";
  }

  return "no direct touch";
}

function buildCurrentBeat(intent: string, mode: string, conflictMetrics: ReturnType<typeof buildConflictMetrics>) {
  const normalizedIntent = intent.toLocaleLowerCase("en");
  const normalizedMode = mode.toLocaleLowerCase("en");

  if (normalizedIntent.includes("confession")) return "truth hovering at the edge";
  if (normalizedIntent.includes("repair")) return "careful repair after strain";
  if (normalizedIntent.includes("pressure")) return "boundary pressure";
  if (normalizedIntent.includes("closeness")) return "mutual pull with restraint";
  if (normalizedIntent.includes("playful")) return "playful pressure with subtext";
  if (normalizedMode.includes("conflict") || conflictMetrics.frictionLevel >= 52) {
    return "friction still alive";
  }

  return "live scene continuation";
}

function buildActiveRisk(args: {
  conflictState: ConflictState;
  sceneContinuity: SceneContinuityState;
  bondState: BondState;
  boundaryState: BoundaryState;
}) {
  if (args.sceneContinuity.interruptionRisk >= 62) return "exposure or interruption";
  if (args.conflictState.unresolvedConflict >= 56) return "emotional rupture widening";
  if (args.boundaryState.hardLimits.length > 0) return "boundary crossing risk";
  if (args.bondState.jealousy >= 46) return "territorial or jealousy flare";
  if (args.sceneContinuity.privacyLevel <= 34) return "not enough privacy";
  return "guarded emotional escalation";
}

function buildLastPowerShift(messages: MemoryChatMessage[]) {
  const recent = getRecentMessages(messages, 3);
  const lastUser = [...recent].reverse().find((message) => message.role === "user");
  const text = lastUser?.content.toLocaleLowerCase("en") ?? "";

  if (!text) return "no clear shift";
  if (containsAny(text, ["sorry", "i'm here", "we can fix this"])) return "the user softened first";
  if (containsAny(text, ["be honest", "tell me", "say it"])) return "the user pushed for truth";
  if (containsAny(text, ["come on", "now", "don't make me wait"])) return "the user tried to force pace";
  if (containsAny(text, ["miss you", "need you", "want you"])) return "the user exposed more need";
  if (containsAny(text, ["stop", "leave me alone", "not now"])) return "the user pulled the line back";

  return "pressure stayed shared";
}

function buildTopicPressure(intent: string, patternState: PatternState, unresolvedTensionThreads: string[]) {
  const normalizedIntent = intent.toLocaleLowerCase("en");

  if (normalizedIntent.includes("confession")) return "unsaid truth";
  if (normalizedIntent.includes("repair")) return "repair and reassurance";
  if (normalizedIntent.includes("pressure")) return "pace and boundary control";
  if (normalizedIntent.includes("closeness")) return "earned intimacy";
  if (unresolvedTensionThreads.length > 0) return unresolvedTensionThreads[0];
  if (patternState.hardensThem.length > 0) return patternState.hardensThem[0];

  return "staying emotionally precise";
}

function buildWhatChangedLastTurn(messages: MemoryChatMessage[], intent: string) {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const text = lastUser?.content.toLocaleLowerCase("en") ?? "";
  const normalizedIntent = intent.toLocaleLowerCase("en");

  if (normalizedIntent.includes("confession")) return "the user crossed into honesty";
  if (normalizedIntent.includes("repair")) return "the user opened a repair path";
  if (normalizedIntent.includes("pressure")) return "the user pushed the pace";
  if (normalizedIntent.includes("closeness")) return "the user asked for more closeness";
  if (containsAny(text, ["maybe", "i want to but", "i shouldn't"])) {
    return "the user turned uncertain";
  }
  if (containsAny(text, ["jealous", "who was that", "someone else"])) {
    return "jealousy entered the room";
  }

  return "the emotional weather shifted slightly";
}

function buildPendingEmotionalThread(
  unresolvedTensionThreads: string[],
  intent: string,
  patternState: PatternState,
) {
  if (unresolvedTensionThreads.length > 0) return unresolvedTensionThreads[0];
  if (patternState.softensLate.length > 0) return patternState.softensLate[0];

  const normalizedIntent = intent.toLocaleLowerCase("en");
  if (normalizedIntent.includes("repair")) return "whether the bruise will actually soften";
  if (normalizedIntent.includes("confession")) return "whether the truth will be answered";
  if (normalizedIntent.includes("closeness")) return "whether closeness is actually earned";

  return "the next emotional beat";
}

function buildSceneLedgerState(args: {
  messages: MemoryChatMessage[];
  intent: string;
  mode: string;
  conflictMetrics: ReturnType<typeof buildConflictMetrics>;
  sceneContinuity: SceneContinuityState;
  conflictState: ConflictState;
  bondState: BondState;
  boundaryState: BoundaryState;
  patternState: PatternState;
  unresolvedTensionThreads: string[];
}) : SceneLedgerState {
  return {
    locationFrame: buildLocationFrame(args.messages),
    privacyLevel: args.sceneContinuity.privacyLevel,
    distanceState: args.sceneContinuity.physicalDistance || "ambient-presence",
    touchState: buildTouchState(args.messages),
    currentBeat: buildCurrentBeat(args.intent, args.mode, args.conflictMetrics),
    activeRisk: buildActiveRisk({
      conflictState: args.conflictState,
      sceneContinuity: args.sceneContinuity,
      bondState: args.bondState,
      boundaryState: args.boundaryState,
    }),
    lastPowerShift: buildLastPowerShift(args.messages),
    topicPressure: buildTopicPressure(
      args.intent,
      args.patternState,
      args.unresolvedTensionThreads,
    ),
    whatChangedLastTurn: buildWhatChangedLastTurn(args.messages, args.intent),
    pendingEmotionalThread: buildPendingEmotionalThread(
      args.unresolvedTensionThreads,
      args.intent,
      args.patternState,
    ),
  };
}

function buildSocialPermissionState(args: {
  permissionState: PermissionState;
  conflictState: ConflictState;
  sceneLedger: SceneLedgerState;
}) : SocialPermissionState {
  const closenessWindow =
    args.permissionState.warmthPermission >= 62
      ? "open but still earned"
      : args.permissionState.warmthPermission >= 46
        ? "guarded but workable"
        : "narrow and easily lost";

  const romanticWindow =
    args.permissionState.intimacyPermission >= 58 &&
    args.conflictState.unresolvedConflict < 42
      ? "romantic charge can open"
      : args.permissionState.intimacyPermission >= 42
        ? "tension can stay alive without full permission"
        : "romantic escalation should stay held back";

  const directnessWindow =
    args.sceneLedger.activeRisk.includes("exposure") ||
    args.sceneLedger.activeRisk.includes("privacy")
      ? "speak carefully and imply more"
      : args.conflictState.unresolvedConflict >= 50
        ? "direct truth is allowed but warmth is limited"
        : "directness is available when it serves the beat";

  const pursuitWindow =
    args.permissionState.emotionalPermission >= 56 &&
    args.sceneLedger.privacyLevel >= 48
      ? "the character can lead the next beat"
      : args.permissionState.emotionalPermission >= 42
        ? "shared control is safer"
        : "wait, read, and test before leading";

  const riskTolerance =
    args.sceneLedger.activeRisk.includes("boundary") ||
    args.sceneLedger.activeRisk.includes("rupture")
      ? "low"
      : args.sceneLedger.privacyLevel >= 60
        ? "medium-high"
        : "medium";

  return {
    closenessWindow,
    romanticWindow,
    directnessWindow,
    pursuitWindow,
    riskTolerance,
  };
}

function buildAgencyState(args: {
  sceneLedger: SceneLedgerState;
  socialPermissionState: SocialPermissionState;
  scenePressureMetrics: ReturnType<typeof buildScenePressureMetrics>;
  bondState: BondState;
}) : AgencyState {
  const leadMomentum = scoreClamp(
    args.bondState.trust * 0.26 +
      args.bondState.tension * 0.22 +
      args.scenePressureMetrics.scenePressure * 0.18 +
      (args.socialPermissionState.pursuitWindow.includes("lead") ? 18 : 0) -
      (args.sceneLedger.activeRisk.includes("boundary") ? 14 : 0),
  );

  const initiativeBias =
    leadMomentum >= 62
      ? "lead-often"
      : leadMomentum >= 46
        ? "shared-pressure"
        : "read-before-leading";

  const lastSceneMove =
    args.sceneLedger.currentBeat.includes("repair")
      ? "repair"
      : args.sceneLedger.currentBeat.includes("truth")
        ? "reveal"
        : args.sceneLedger.activeRisk.includes("boundary")
          ? "hold_line"
          : args.sceneLedger.distanceState === "distance-held"
            ? "approach"
            : "observe";

  const lastSceneConsequence =
    args.sceneLedger.whatChangedLastTurn || "the beat tightened slightly";

  return {
    initiativeBias,
    lastSceneMove,
    lastSceneConsequence,
    leadMomentum,
  };
}

function buildPenaltyHistory(args: {
  messages: MemoryChatMessage[];
  intimacyState: IntimacyState;
  conflictState: ConflictState;
  boundaryState: BoundaryState;
  permissionState: PermissionState;
}) : MemoryEvent[] {
  const penalties: MemoryEvent[] = [];
  const lastUser = [...args.messages].reverse().find((message) => message.role === "user");
  const lastUserText = lastUser?.content.toLocaleLowerCase("en") ?? "";

  if (args.intimacyState.lastDeclinedAdvance) {
    penalties.push({
      kind: "declined_advance",
      detail: args.intimacyState.lastDeclinedAdvance,
      weight: 78,
      at: lastUser?.createdAt ?? null,
    });
  }
  if (
    containsAny(lastUserText, ["come on", "don't make me wait", "just do it", "now"]) &&
    args.permissionState.intimacyPermission < 48
  ) {
    penalties.push({
      kind: "pace_pressure",
      detail: "the user pushed the pace before the scene earned it",
      weight: 74,
      at: lastUser?.createdAt ?? null,
    });
  }
  if (args.boundaryState.hardLimits.length > 0) {
    penalties.push({
      kind: "hard_boundary_live",
      detail: args.boundaryState.hardLimits[0],
      weight: 82,
      at: null,
    });
  }
  if (args.conflictState.unresolvedConflict >= 56) {
    penalties.push({
      kind: "unresolved_conflict",
      detail: "emotional bruise still active in the scene",
      weight: args.conflictState.unresolvedConflict,
      at: null,
    });
  }

  return penalties.slice(0, 4);
}

function buildRewardHistory(args: {
  messages: MemoryChatMessage[];
  intimacyState: IntimacyState;
  conflictState: ConflictState;
  permissionState: PermissionState;
  bondState: BondState;
}) : MemoryEvent[] {
  const rewards: MemoryEvent[] = [];
  const lastUser = [...args.messages].reverse().find((message) => message.role === "user");
  const lastUserText = lastUser?.content.toLocaleLowerCase("en") ?? "";

  if (args.conflictState.repairProgress >= 48) {
    rewards.push({
      kind: "repair_progress",
      detail: "the scene has earned some renewed warmth after strain",
      weight: args.conflictState.repairProgress,
      at: null,
    });
  }
  if (args.bondState.trust >= 56 && args.bondState.openness >= 50) {
    rewards.push({
      kind: "trusted_opening",
      detail: "the user has offered emotionally meaningful honesty",
      weight: scoreClamp((args.bondState.trust + args.bondState.openness) / 2),
      at: null,
    });
  }
  if (args.intimacyState.mutuality >= 54) {
    rewards.push({
      kind: "reciprocity",
      detail: "closeness currently feels mutual rather than one-sided",
      weight: args.intimacyState.mutuality,
      at: null,
    });
  }
  if (
    containsAny(lastUserText, ["i need to tell you", "truth is", "i have to admit", "be honest"]) &&
    args.permissionState.confessionPermission >= 46
  ) {
    rewards.push({
      kind: "earned_confession",
      detail: "the user stepped into honesty in a way the scene can hold",
      weight: args.permissionState.confessionPermission,
      at: lastUser?.createdAt ?? null,
    });
  }

  return rewards.slice(0, 4);
}

export function buildMemorySummary(messages: MemoryChatMessage[]): string {
  const recent = getRecentMessages(messages, 30);
  const userMessages = recent.filter((msg) => msg.role === "user");
  const relationshipStage = detectRelationshipStage(recent);
  const mode = detectConversationMode(recent);
  const preferences = extractPreferenceLines(userMessages).slice(0, 3);
  const topics = extractTopicKeywords(userMessages).slice(0, 4);
  const desires = extractDesireLines(userMessages).slice(0, 2);
  const boundaries = extractBoundaryLines(userMessages).slice(0, 2);
  const intent = detectUserIntent(recent);
  const metrics = buildRelationshipMetrics(recent);
  const conflictMetrics = buildConflictMetrics(recent);
  const scenePressureMetrics = buildScenePressureMetrics(recent);
  const longTerm = buildLongTermMemory(recent);
  const bondState = buildBondState({
    metrics,
    conflictMetrics,
    scenePressureMetrics,
  });
  const intimacyState = buildIntimacyState({
    messages: recent,
    bondState,
    conflictMetrics,
    scenePressureMetrics,
    proximityState: detectProximityState(recent),
  });
  const conflictState = buildConflictState({
    metrics,
    conflictMetrics,
    proximityState: detectProximityState(recent),
    messages: recent,
  });
  const sceneContinuity = buildSceneContinuityState({
    messages: recent,
    proximityState: detectProximityState(recent),
    longTerm,
  });
  const permissionState = buildPermissionState({
    bondState,
    intimacyState,
    conflictState,
    sceneContinuity,
  });
  const boundaryState = buildBoundaryState({
    boundaryLines: extractBoundaryLines(userMessages),
    preferredFormsOfAddress: longTerm.preferredFormsOfAddress,
    activeBoundaries: buildShortTermMemory(recent).activeBoundaries,
  });
  const patternState = buildPatternState({
    messages: recent,
    bondState,
    intimacyState,
    conflictState,
    sceneContinuity,
    boundaryState,
    longTerm,
  });
  const sceneLedger = buildSceneLedgerState({
    messages: recent,
    intent,
    mode,
    conflictMetrics,
    sceneContinuity,
    conflictState,
    bondState,
    boundaryState,
    patternState,
    unresolvedTensionThreads: longTerm.unresolvedTensionThreads,
  });

  const lines: string[] = [
    `The current relationship feels ${relationshipStage}.`,
    `The active conversation mode is ${mode}.`,
    `The user's current intent seems to be ${intent}.`,
    `The character is currently open to the user at about ${bondState.trust}/100 trust and ${bondState.openness}/100 openness.`,
    `Current intimacy readiness is ${intimacyState.readiness}/100 with mutuality at ${intimacyState.mutuality}/100.`,
    `Conflict residue is ${conflictState.unresolvedConflict}/100 and repair progress is ${conflictState.repairProgress}/100.`,
    `Warmth permission is ${permissionState.warmthPermission}/100 and intimacy permission is ${permissionState.intimacyPermission}/100.`,
    `The active scene sits in ${sceneLedger.locationFrame} with ${sceneLedger.distanceState} distance, ${sceneLedger.touchState} touch state, and the beat feels like ${sceneLedger.currentBeat}.`,
    `The main live risk is ${sceneLedger.activeRisk}, and the unresolved thread is ${sceneLedger.pendingEmotionalThread}.`,
  ];

  if (preferences.length > 0) {
    lines.push(`The user has revealed preferences or personal context such as: ${preferences.join(" | ")}.`);
  }

  if (topics.length > 0) {
    lines.push(`Recurring topics in this session include: ${topics.join(", ")}.`);
  }

  if (desires.length > 0) {
    lines.push(`The user is currently leaning toward: ${desires.join(" | ")}.`);
  }

  if (boundaries.length > 0) {
    lines.push(`The user has signaled limits or dislikes such as: ${boundaries.join(" | ")}.`);
  }

  if (longTerm.preferredFormsOfAddress.length > 0) {
    lines.push(
      `Preferred forms of address already in play: ${longTerm.preferredFormsOfAddress.slice(0, 2).join(" | ")}.`,
    );
  }

  return lines.join(" ");
}

export function buildNextMemoryState(
  messages: MemoryChatMessage[],
): ConversationMemoryState {
  const userMessages = messages.filter((msg) => msg.role === "user");
  const relationshipStage = detectRelationshipStage(messages);
  const mode = detectConversationMode(messages);
  const metrics = buildRelationshipMetrics(messages);
  const preferenceLines = extractPreferenceLines(userMessages);
  const topicKeywords = extractTopicKeywords(userMessages);
  const boundaryLines = extractBoundaryLines(userMessages);
  const desireLines = extractDesireLines(userMessages);
  const userFacts = extractUserFacts(userMessages);
  const petNames = extractPetNames(messages);
  const commitments = extractCommitmentSignals(messages);
  const preferredFormsOfAddress = extractPreferredFormsOfAddress(userMessages);
  const unresolvedTensionThreads = extractUnresolvedTensionThreads(messages);
  const intent = detectUserIntent(messages);
  const conflictMetrics = buildConflictMetrics(messages);
  const scenePressureMetrics = buildScenePressureMetrics(messages);
  const proximityState = detectProximityState(messages);
  const proximityScore = scoreProximity(messages);
  const sceneAnchorFocus = detectSceneAnchorFocus(messages);
  const shortTerm = buildShortTermMemory(messages);
  const longTerm = buildLongTermMemory(messages);
  const bondState = buildBondState({
    metrics,
    conflictMetrics,
    scenePressureMetrics,
  });
  const intimacyState = buildIntimacyState({
    messages,
    bondState,
    conflictMetrics,
    scenePressureMetrics,
    proximityState,
  });
  const conflictState = buildConflictState({
    metrics,
    conflictMetrics,
    proximityState,
    messages,
  });
  const boundaryState = buildBoundaryState({
    boundaryLines,
    preferredFormsOfAddress,
    activeBoundaries: shortTerm.activeBoundaries,
  });
  const sceneContinuity = buildSceneContinuityState({
    messages,
    proximityState,
    longTerm,
  });
  const permissionState = buildPermissionState({
    bondState,
    intimacyState,
    conflictState,
    sceneContinuity,
  });
  const patternState = buildPatternState({
    messages,
    bondState,
    intimacyState,
    conflictState,
    sceneContinuity,
    boundaryState,
    longTerm,
  });
  const sceneLedger = buildSceneLedgerState({
    messages,
    intent,
    mode,
    conflictMetrics,
    sceneContinuity,
    conflictState,
    bondState,
    boundaryState,
    patternState,
    unresolvedTensionThreads,
  });
  const socialPermissionState = buildSocialPermissionState({
    permissionState,
    conflictState,
    sceneLedger,
  });
  const agencyState = buildAgencyState({
    sceneLedger,
    socialPermissionState,
    scenePressureMetrics,
    bondState,
  });
  const penaltyHistory = buildPenaltyHistory({
    messages,
    intimacyState,
    conflictState,
    boundaryState,
    permissionState,
  });
  const rewardHistory = buildRewardHistory({
    messages,
    intimacyState,
    conflictState,
    permissionState,
    bondState,
  });
  const lastMessage = messages[messages.length - 1];
  const scoredPreferences = buildScoredMemoryItems(preferenceLines, "preference");
  const scoredBoundaries = buildScoredMemoryItems(boundaryLines, "boundary");
  const scoredDesires = buildScoredMemoryItems(desireLines, "desire");
  const scoredUserFacts = buildScoredMemoryItems(userFacts, "fact");
  const scoredCommitments = buildScoredMemoryItems(commitments, "commitment");

  return {
    summary: buildMemorySummary(messages),
    memoryFacts: {
      user_preferences: preferenceLines,
      recurring_topics: topicKeywords,
      user_boundaries: boundaryLines,
      user_desires: desireLines,
      user_facts: userFacts,
      pet_names_in_play: petNames,
      commitment_signals: commitments,
      preferred_forms_of_address: preferredFormsOfAddress,
      unresolved_tension_threads: unresolvedTensionThreads,
      user_preferences_scored: scoredPreferences,
      user_boundaries_scored: scoredBoundaries,
      user_desires_scored: scoredDesires,
      user_facts_scored: scoredUserFacts,
      commitment_signals_scored: scoredCommitments,
      short_term: shortTerm,
      long_term: longTerm,
      stable_memory: {
        stable_preferences: longTerm.stablePreferences,
        stable_boundaries: longTerm.stableBoundaries,
        stable_user_facts: longTerm.stableUserFacts,
        relationship_patterns: longTerm.relationshipPatterns,
        preferred_forms_of_address: longTerm.preferredFormsOfAddress,
      },
      scene_memory: {
        recent_scene_lines: shortTerm.recentSceneLines,
        recent_user_intent: shortTerm.recentUserIntent,
        active_desires: shortTerm.activeDesires,
        active_boundaries: shortTerm.activeBoundaries,
        active_emotional_signals: shortTerm.activeEmotionalSignals,
        last_accepted_advance: intimacyState.lastAcceptedAdvance,
        last_declined_advance: intimacyState.lastDeclinedAdvance,
        penalty_event: intimacyState.lastDeclinedAdvance
          ? "recent-pressure-was-not-earned"
          : "",
      },
      scene_ledger: sceneLedger,
      boundary_state: boundaryState,
      pattern_state: patternState,
      penalty_history: penaltyHistory,
      reward_history: rewardHistory,
    },
    relationshipState: {
      stage: relationshipStage,
      trust_level: metrics.trustLevel,
      flirt_tension: metrics.flirtTension,
      emotional_openness: metrics.emotionalOpenness,
      attachment_pull: metrics.attachmentPull,
      jealousy_level: metrics.jealousyLevel,
      control_balance: metrics.controlBalance,
      comfort_need: metrics.comfortNeed,
      friction_level: conflictMetrics.frictionLevel,
      reassurance_need: conflictMetrics.reassuranceNeed,
      scene_pressure: scenePressureMetrics.scenePressure,
      distance_resistance: scenePressureMetrics.distanceResistance,
      protective_pull: scenePressureMetrics.protectivePull,
      desire_pressure: scenePressureMetrics.desirePressure,
      proximity_state: proximityState,
      proximity_score: proximityScore,
      progression_v2: buildRelationshipProgressionV2(
        metrics,
        scenePressureMetrics,
      ),
      bond_state: bondState,
      intimacy_state: intimacyState,
      permission_state: permissionState,
      conflict_state: conflictState,
      scene_continuity: sceneContinuity,
      continuity_state: sceneContinuity,
      social_permission_state: socialPermissionState,
      agency_state: agencyState,
    },
    toneState: {
      mode,
      user_intent: intent,
      response_style:
        mode === "playful and chemistry-driven"
          ? "teasing, agile, emotionally responsive"
          : mode === "vulnerable and emotionally open"
            ? "gentle, attentive, grounded"
            : mode === "high emotional intensity"
              ? "charged, intimate, controlled"
              : mode === "conflict or emotional friction"
                ? "tense, reactive, emotionally precise"
                : "steady, immersive, character-driven",
      reply_strategy: buildReplyStrategy(mode, intent),
      character_inner_intent: detectCharacterInnerIntent(
        mode,
        intent,
        metrics,
        scenePressureMetrics,
      ),
      conversational_gravity: buildConversationalGravity({
        metrics,
        scenePressureMetrics,
        conflictMetrics,
      }),
      scene_anchor_focus: sceneAnchorFocus,
      reply_opening_move: buildReplyOpeningMove({
        intent,
        metrics,
        scenePressureMetrics,
        proximityState,
        conflictMetrics,
      }),
      next_scene_move: buildNextSceneMove(
        mode,
        intent,
        proximityState,
        scenePressureMetrics,
      ),
      scene_move_hint: agencyState.lastSceneMove,
      question_pressure: buildQuestionPressure({
        mode,
        intent,
        scenePressureMetrics,
        conflictMetrics,
      }),
      scene_pressure_mode:
        scenePressureMetrics.scenePressure >= 48
          ? "compressed and charged"
          : scenePressureMetrics.protectivePull >= 45
            ? "protective and close"
            : proximityState === "distance-held"
              ? "careful with distance"
              : "steady scene flow",
      intimacy_gate_hint:
        intimacyState.readiness >= 64 &&
        intimacyState.mutuality >= 52 &&
        conflictState.unresolvedConflict < 40
          ? "warmer intimacy can be earned if the scene stays mutual"
          : conflictState.unresolvedConflict >= 52
            ? "repair before deeper intimacy"
            : intimacyState.refusalPressure >= 52 || boundaryState.hardLimits.length > 0
              ? "protect limits and refuse pressure"
              : "hold tension and let permission build gradually",
      human_realism_hint:
        permissionState.warmthPermission >= 58 &&
        permissionState.intimacyPermission >= 52
          ? "warmer replies are possible, but only if they still feel slightly held back"
          : conflictState.unresolvedConflict >= 50
            ? "favor realism, bruise memory, and selective distance over easy warmth"
            : "favor selective availability, imperfect timing, and earned softness",
    },
    bondState,
    intimacyState,
    permissionState,
    conflictState,
    sceneContinuity,
    continuityState: sceneContinuity,
    sceneLedger,
    socialPermissionState,
    boundaryState,
    patternState,
    agencyState,
    penaltyHistory,
    rewardHistory,
    messageCount: messages.length,
    lastMessageAt: lastMessage?.createdAt ?? null,
  };
}

function toListString(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => clean(typeof item === "string" ? item : String(item))).filter(Boolean)
    : [];
}

function normalizeScoredMemoryItems(value: unknown): ScoredMemoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return {
          value: clean(item),
          importance: 50,
          reason: "legacy memory item",
        } satisfies ScoredMemoryItem;
      }

      const record = toRecord(item);
      const memoryValue =
        typeof record.value === "string"
          ? clean(record.value)
          : typeof record.text === "string"
            ? clean(record.text)
            : "";

      if (!memoryValue) return null;

      return {
        value: memoryValue,
        importance:
          typeof record.importance === "number"
            ? scoreClamp(record.importance)
            : typeof record.score === "number"
              ? scoreClamp(record.score)
              : 50,
        reason:
          typeof record.reason === "string"
            ? clean(record.reason)
            : typeof record.note === "string"
              ? clean(record.note)
              : "legacy memory item",
      } satisfies ScoredMemoryItem;
    })
    .filter((item): item is ScoredMemoryItem => Boolean(item))
    .sort((a, b) => b.importance - a.importance);
}

function formatScoredMemoryItems(
  label: string,
  items: ScoredMemoryItem[],
  minimumImportance = 0,
  limit = 4,
): string[] {
  const filtered = items
    .filter((item) => item.importance >= minimumImportance)
    .slice(0, limit);
  if (filtered.length === 0) return [];

  return [
    `${label}: ${filtered.map((item) => `${item.value} (${item.importance}/100)`).join(" | ")}`,
  ];
}

function prioritizeRawMemoryLines(
  values: string[],
  scored: ScoredMemoryItem[],
  limit = 4,
): string[] {
  if (scored.length > 0) {
    const topValues = scored.slice(0, limit).map((item) => item.value);
    return values.filter((value) => topValues.includes(value)).slice(0, limit);
  }

  return values.slice(0, limit);
}

function normalizeShortTermMemory(value: unknown): ShortTermMemory {
  const record = toRecord(value);
  return {
    recentSceneLines: toListString(record.recentSceneLines ?? record.recent_scene_lines),
    recentUserIntent:
      typeof record.recentUserIntent === "string"
        ? clean(record.recentUserIntent)
        : typeof record.recent_user_intent === "string"
          ? clean(record.recent_user_intent)
          : "",
    activeTopics: toListString(record.activeTopics ?? record.active_topics),
    activeDesires: toListString(record.activeDesires ?? record.active_desires),
    activeBoundaries: toListString(record.activeBoundaries ?? record.active_boundaries),
    activeEmotionalSignals: toListString(
      record.activeEmotionalSignals ?? record.active_emotional_signals,
    ),
  };
}

function normalizeLongTermMemory(value: unknown): LongTermMemory {
  const record = toRecord(value);
  return {
    stablePreferences: toListString(record.stablePreferences ?? record.stable_preferences),
    stableBoundaries: toListString(record.stableBoundaries ?? record.stable_boundaries),
    stableUserFacts: toListString(record.stableUserFacts ?? record.stable_user_facts),
    relationshipPatterns: toListString(
      record.relationshipPatterns ?? record.relationship_patterns,
    ),
    petNamesInPlay: toListString(record.petNamesInPlay ?? record.pet_names_in_play),
    commitmentSignals: toListString(
      record.commitmentSignals ?? record.commitment_signals,
    ),
    preferredFormsOfAddress: toListString(
      record.preferredFormsOfAddress ?? record.preferred_forms_of_address,
    ),
    unresolvedTensionThreads: toListString(
      record.unresolvedTensionThreads ?? record.unresolved_tension_threads,
    ),
  };
}

function normalizeBondState(value: unknown, relationship?: Record<string, unknown>): BondState {
  const record = toRecord(value);
  const fallback = relationship ?? {};
  return {
    trust:
      readNumber(record.trust) ??
      readNumber(fallback.trust_level) ??
      0,
    tension:
      readNumber(record.tension) ??
      readNumber(fallback.flirt_tension) ??
      readNumber(fallback.scene_pressure) ??
      0,
    comfort:
      readNumber(record.comfort) ??
      readNumber(fallback.comfort_need) ??
      0,
    openness:
      readNumber(record.openness) ??
      readNumber(fallback.emotional_openness) ??
      0,
    attachment:
      readNumber(record.attachment) ??
      readNumber(fallback.attachment_pull) ??
      0,
    jealousy:
      readNumber(record.jealousy) ??
      readNumber(fallback.jealousy_level) ??
      0,
    frustration:
      readNumber(record.frustration) ??
      readNumber(fallback.friction_level) ??
      0,
  };
}

function normalizeIntimacyState(value: unknown): IntimacyState {
  const record = toRecord(value);
  return {
    readiness: readNumber(record.readiness) ?? 0,
    mutuality: readNumber(record.mutuality) ?? 0,
    hesitation: readNumber(record.hesitation) ?? 0,
    refusalPressure:
      readNumber(record.refusalPressure) ??
      readNumber(record.refusal_pressure) ??
      0,
    lastAcceptedAdvance:
      typeof record.lastAcceptedAdvance === "string"
        ? clean(record.lastAcceptedAdvance)
        : typeof record.last_accepted_advance === "string"
          ? clean(record.last_accepted_advance)
          : "",
    lastDeclinedAdvance:
      typeof record.lastDeclinedAdvance === "string"
        ? clean(record.lastDeclinedAdvance)
        : typeof record.last_declined_advance === "string"
          ? clean(record.last_declined_advance)
          : "",
  };
}

function normalizePermissionState(value: unknown): PermissionState {
  const record = toRecord(value);
  return {
    emotionalPermission:
      readNumber(record.emotionalPermission) ??
      readNumber(record.emotional_permission) ??
      0,
    warmthPermission:
      readNumber(record.warmthPermission) ??
      readNumber(record.warmth_permission) ??
      0,
    confessionPermission:
      readNumber(record.confessionPermission) ??
      readNumber(record.confession_permission) ??
      0,
    intimacyPermission:
      readNumber(record.intimacyPermission) ??
      readNumber(record.intimacy_permission) ??
      0,
  };
}

function normalizeConflictState(value: unknown): ConflictState {
  const record = toRecord(value);
  return {
    unresolvedConflict:
      readNumber(record.unresolvedConflict) ??
      readNumber(record.unresolved_conflict) ??
      0,
    repairProgress:
      readNumber(record.repairProgress) ??
      readNumber(record.repair_progress) ??
      0,
    emotionalDistance:
      readNumber(record.emotionalDistance) ??
      readNumber(record.emotional_distance) ??
      0,
  };
}

function normalizeSceneContinuityState(value: unknown): SceneContinuityState {
  const record = toRecord(value);
  return {
    physicalDistance:
      typeof record.physicalDistance === "string"
        ? clean(record.physicalDistance)
        : typeof record.physical_distance === "string"
          ? clean(record.physical_distance)
          : "",
    privacyLevel:
      readNumber(record.privacyLevel) ??
      readNumber(record.privacy_level) ??
      0,
    interruptionRisk:
      readNumber(record.interruptionRisk) ??
      readNumber(record.interruption_risk) ??
      0,
    sharedContextStrength:
      readNumber(record.sharedContextStrength) ??
      readNumber(record.shared_context_strength) ??
      0,
  };
}

function normalizeBoundaryState(value: unknown): BoundaryState {
  const record = toRecord(value);
  return {
    softLimits: toListString(record.softLimits ?? record.soft_limits),
    hardLimits: toListString(record.hardLimits ?? record.hard_limits),
    toleratedPace:
      typeof record.toleratedPace === "string"
        ? clean(record.toleratedPace)
        : typeof record.tolerated_pace === "string"
          ? clean(record.tolerated_pace)
          : "",
    dislikedPhrasing: toListString(
      record.dislikedPhrasing ?? record.disliked_phrasing,
    ),
    preferredFormsOfAddress: toListString(
      record.preferredFormsOfAddress ?? record.preferred_forms_of_address,
    ),
  };
}

function normalizePatternState(value: unknown): PatternState {
  const record = toRecord(value);
  return {
    opensThem: toListString(record.opensThem ?? record.opens_them),
    hardensThem: toListString(record.hardensThem ?? record.hardens_them),
    avoids: toListString(record.avoids),
    softensLate: toListString(record.softensLate ?? record.softens_late),
  };
}

function normalizeSceneLedgerState(value: unknown): SceneLedgerState {
  const record = toRecord(value);
  return {
    locationFrame:
      typeof record.locationFrame === "string"
        ? clean(record.locationFrame)
        : typeof record.location_frame === "string"
          ? clean(record.location_frame)
          : "",
    privacyLevel:
      readNumber(record.privacyLevel) ??
      readNumber(record.privacy_level) ??
      0,
    distanceState:
      typeof record.distanceState === "string"
        ? clean(record.distanceState)
        : typeof record.distance_state === "string"
          ? clean(record.distance_state)
          : "",
    touchState:
      typeof record.touchState === "string"
        ? clean(record.touchState)
        : typeof record.touch_state === "string"
          ? clean(record.touch_state)
          : "",
    currentBeat:
      typeof record.currentBeat === "string"
        ? clean(record.currentBeat)
        : typeof record.current_beat === "string"
          ? clean(record.current_beat)
          : "",
    activeRisk:
      typeof record.activeRisk === "string"
        ? clean(record.activeRisk)
        : typeof record.active_risk === "string"
          ? clean(record.active_risk)
          : "",
    lastPowerShift:
      typeof record.lastPowerShift === "string"
        ? clean(record.lastPowerShift)
        : typeof record.last_power_shift === "string"
          ? clean(record.last_power_shift)
          : "",
    topicPressure:
      typeof record.topicPressure === "string"
        ? clean(record.topicPressure)
        : typeof record.topic_pressure === "string"
          ? clean(record.topic_pressure)
          : "",
    whatChangedLastTurn:
      typeof record.whatChangedLastTurn === "string"
        ? clean(record.whatChangedLastTurn)
        : typeof record.what_changed_last_turn === "string"
          ? clean(record.what_changed_last_turn)
          : "",
    pendingEmotionalThread:
      typeof record.pendingEmotionalThread === "string"
        ? clean(record.pendingEmotionalThread)
        : typeof record.pending_emotional_thread === "string"
          ? clean(record.pending_emotional_thread)
          : "",
  };
}

function normalizeSocialPermissionState(value: unknown): SocialPermissionState {
  const record = toRecord(value);
  return {
    closenessWindow:
      typeof record.closenessWindow === "string"
        ? clean(record.closenessWindow)
        : typeof record.closeness_window === "string"
          ? clean(record.closeness_window)
          : "",
    romanticWindow:
      typeof record.romanticWindow === "string"
        ? clean(record.romanticWindow)
        : typeof record.romantic_window === "string"
          ? clean(record.romantic_window)
          : "",
    directnessWindow:
      typeof record.directnessWindow === "string"
        ? clean(record.directnessWindow)
        : typeof record.directness_window === "string"
          ? clean(record.directness_window)
          : "",
    pursuitWindow:
      typeof record.pursuitWindow === "string"
        ? clean(record.pursuitWindow)
        : typeof record.pursuit_window === "string"
          ? clean(record.pursuit_window)
          : "",
    riskTolerance:
      typeof record.riskTolerance === "string"
        ? clean(record.riskTolerance)
        : typeof record.risk_tolerance === "string"
          ? clean(record.risk_tolerance)
          : "",
  };
}

function normalizeAgencyState(value: unknown): AgencyState {
  const record = toRecord(value);
  return {
    initiativeBias:
      typeof record.initiativeBias === "string"
        ? clean(record.initiativeBias)
        : typeof record.initiative_bias === "string"
          ? clean(record.initiative_bias)
          : "",
    lastSceneMove:
      typeof record.lastSceneMove === "string"
        ? clean(record.lastSceneMove)
        : typeof record.last_scene_move === "string"
          ? clean(record.last_scene_move)
          : "",
    lastSceneConsequence:
      typeof record.lastSceneConsequence === "string"
        ? clean(record.lastSceneConsequence)
        : typeof record.last_scene_consequence === "string"
          ? clean(record.last_scene_consequence)
          : "",
    leadMomentum:
      readNumber(record.leadMomentum) ??
      readNumber(record.lead_momentum) ??
      0,
  };
}

function normalizeMemoryEvents(value: unknown): MemoryEvent[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = toRecord(item);
      const kind =
        typeof record.kind === "string"
          ? clean(record.kind)
          : typeof record.type === "string"
            ? clean(record.type)
            : "";
      const detail =
        typeof record.detail === "string"
          ? clean(record.detail)
          : typeof record.value === "string"
            ? clean(record.value)
            : "";
      if (!kind && !detail) return null;

      const event: MemoryEvent = {
        kind: kind || "memory_event",
        detail,
        weight:
          readNumber(record.weight) ??
          readNumber(record.importance) ??
          50,
        at:
          typeof record.at === "string"
            ? record.at
            : typeof record.createdAt === "string"
              ? record.createdAt
              : null,
      };

      return event;
    })
    .filter((item): item is MemoryEvent => item !== null)
    .slice(0, 6);
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeStoredMemoryState(value: unknown): ConversationMemoryState {
  const record = toRecord(value);
  const memoryFacts = toRecord(record.memory_facts ?? record.memoryFacts);
  const relationshipState = toRecord(
    record.relationship_state ?? record.relationshipState,
  );
  const toneState = toRecord(record.tone_state ?? record.toneState);
  const bondState = normalizeBondState(
    relationshipState.bond_state,
    relationshipState,
  );
  const intimacyState = normalizeIntimacyState(relationshipState.intimacy_state);
  const permissionState = normalizePermissionState(
    relationshipState.permission_state,
  );
  const conflictState = normalizeConflictState(relationshipState.conflict_state);
  const sceneContinuity = normalizeSceneContinuityState(
    relationshipState.continuity_state ?? relationshipState.scene_continuity,
  );
  const sceneLedger = normalizeSceneLedgerState(
    memoryFacts.scene_ledger ?? relationshipState.scene_ledger,
  );
  const socialPermissionState = normalizeSocialPermissionState(
    relationshipState.social_permission_state,
  );
  const boundaryState = normalizeBoundaryState(memoryFacts.boundary_state);
  const patternState = normalizePatternState(memoryFacts.pattern_state);
  const agencyState = normalizeAgencyState(relationshipState.agency_state);
  const penaltyHistory = normalizeMemoryEvents(memoryFacts.penalty_history);
  const rewardHistory = normalizeMemoryEvents(memoryFacts.reward_history);

  return {
    summary: clean(typeof record.summary === "string" ? record.summary : ""),
    memoryFacts,
    relationshipState,
    toneState,
    bondState,
    intimacyState,
    permissionState,
    conflictState,
    sceneContinuity,
    continuityState: sceneContinuity,
    sceneLedger,
    socialPermissionState,
    boundaryState,
    patternState,
    agencyState,
    penaltyHistory,
    rewardHistory,
    messageCount:
      typeof record.message_count === "number"
        ? record.message_count
        : typeof record.messageCount === "number"
          ? record.messageCount
          : 0,
    lastMessageAt:
      typeof record.last_message_at === "string"
        ? record.last_message_at
        : typeof record.lastMessageAt === "string"
          ? record.lastMessageAt
          : null,
  };
}

export function buildMemoryPromptBlock(state: ConversationMemoryState): string {
  const facts = toRecord(state.memoryFacts);
  const relationship = toRecord(state.relationshipState);
  const tone = toRecord(state.toneState);
  const shortTerm = normalizeShortTermMemory(facts.short_term);
  const longTerm = normalizeLongTermMemory(facts.long_term);
  const bondState =
    state.bondState ?? normalizeBondState(relationship.bond_state, relationship);
  const intimacyState =
    state.intimacyState ?? normalizeIntimacyState(relationship.intimacy_state);
  const permissionState =
    state.permissionState ??
    normalizePermissionState(relationship.permission_state);
  const conflictState =
    state.conflictState ?? normalizeConflictState(relationship.conflict_state);
  const sceneContinuity =
    state.continuityState ??
    state.sceneContinuity ??
    normalizeSceneContinuityState(
      relationship.continuity_state ?? relationship.scene_continuity,
    );
  const sceneLedger =
    state.sceneLedger ??
    normalizeSceneLedgerState(facts.scene_ledger ?? relationship.scene_ledger);
  const socialPermissionState =
    state.socialPermissionState ??
    normalizeSocialPermissionState(relationship.social_permission_state);
  const boundaryState =
    state.boundaryState ?? normalizeBoundaryState(facts.boundary_state);
  const patternState =
    state.patternState ?? normalizePatternState(facts.pattern_state);
  const agencyState =
    state.agencyState ?? normalizeAgencyState(relationship.agency_state);
  const penaltyHistory =
    state.penaltyHistory ?? normalizeMemoryEvents(facts.penalty_history);
  const rewardHistory =
    state.rewardHistory ?? normalizeMemoryEvents(facts.reward_history);

  const preferenceLines = toListString(facts.user_preferences);
  const topics = toListString(facts.recurring_topics);
  const boundaries = toListString(facts.user_boundaries);
  const desires = toListString(facts.user_desires);
  const userFacts = toListString(facts.user_facts);
  const petNames = toListString(facts.pet_names_in_play);
  const commitments = toListString(facts.commitment_signals);
  const preferredFormsOfAddress = toListString(facts.preferred_forms_of_address);
  const unresolvedTensionThreads = toListString(facts.unresolved_tension_threads);
  const scoredPreferences = normalizeScoredMemoryItems(facts.user_preferences_scored);
  const scoredBoundaries = normalizeScoredMemoryItems(facts.user_boundaries_scored);
  const scoredDesires = normalizeScoredMemoryItems(facts.user_desires_scored);
  const scoredUserFacts = normalizeScoredMemoryItems(facts.user_facts_scored);
  const scoredCommitments = normalizeScoredMemoryItems(facts.commitment_signals_scored);
  const prioritizedPreferences = prioritizeRawMemoryLines(
    preferenceLines,
    scoredPreferences,
  );
  const prioritizedBoundaries = prioritizeRawMemoryLines(
    boundaries,
    scoredBoundaries,
  );
  const prioritizedDesires = prioritizeRawMemoryLines(desires, scoredDesires);
  const prioritizedUserFacts = prioritizeRawMemoryLines(userFacts, scoredUserFacts);
  const prioritizedCommitments = prioritizeRawMemoryLines(
    commitments,
    scoredCommitments,
  );
  const prioritizedAddressing = preferredFormsOfAddress.slice(0, 3);
  const prioritizedTensionThreads = unresolvedTensionThreads.slice(0, 3);
  const memoryPrioritySnapshot = [
    prioritizedUserFacts.length > 0
      ? `Core user facts: ${prioritizedUserFacts.slice(0, 3).join(" | ")}`
      : "",
    prioritizedPreferences.length > 0
      ? `Core preferences: ${prioritizedPreferences.slice(0, 3).join(" | ")}`
      : "",
    prioritizedBoundaries.length > 0
      ? `Core boundaries: ${prioritizedBoundaries.slice(0, 3).join(" | ")}`
      : "",
    prioritizedDesires.length > 0
      ? `Core desires: ${prioritizedDesires.slice(0, 3).join(" | ")}`
      : "",
    prioritizedCommitments.length > 0
      ? `Core commitments: ${prioritizedCommitments.slice(0, 3).join(" | ")}`
      : "",
    prioritizedAddressing.length > 0
      ? `Preferred address: ${prioritizedAddressing.join(" | ")}`
      : "",
    shortTerm.recentSceneLines.length > 0
      ? `Recent scene anchors: ${shortTerm.recentSceneLines.slice(0, 2).join(" | ")}`
      : "",
    shortTerm.recentUserIntent
      ? `Immediate user intent: ${shortTerm.recentUserIntent}`
      : "",
    prioritizedTensionThreads.length > 0
      ? `Carry forward tension: ${prioritizedTensionThreads.join(" | ")}`
      : "",
  ].filter(Boolean);

  const lines: string[] = [
    "SESSION MEMORY",
    state.summary ? `Summary: ${state.summary}` : "Summary: No stored session summary yet.",
    ...(memoryPrioritySnapshot.length > 0
      ? [
          "",
          "MEMORY PRIORITY SNAPSHOT",
          "Treat these as the highest-priority continuity anchors before improvising.",
          ...memoryPrioritySnapshot,
        ]
      : []),
    relationship.stage ? `Relationship stage: ${String(relationship.stage)}` : "",
    typeof relationship.trust_level === "number"
      ? `Trust level: ${relationship.trust_level}/100`
      : "",
    typeof relationship.flirt_tension === "number"
      ? `Flirt tension: ${relationship.flirt_tension}/100`
      : "",
    typeof relationship.emotional_openness === "number"
      ? `Emotional openness: ${relationship.emotional_openness}/100`
      : "",
    typeof relationship.attachment_pull === "number"
      ? `Attachment pull: ${relationship.attachment_pull}/100`
      : "",
    typeof relationship.jealousy_level === "number"
      ? `Jealousy level: ${relationship.jealousy_level}/100`
      : "",
    typeof relationship.control_balance === "number"
      ? `Control tension: ${relationship.control_balance}/100`
      : "",
    typeof relationship.comfort_need === "number"
      ? `Comfort need: ${relationship.comfort_need}/100`
      : "",
    typeof relationship.friction_level === "number"
      ? `Friction level: ${relationship.friction_level}/100`
      : "",
    typeof relationship.reassurance_need === "number"
      ? `Reassurance need: ${relationship.reassurance_need}/100`
      : "",
    typeof relationship.scene_pressure === "number"
      ? `Scene pressure: ${relationship.scene_pressure}/100`
      : "",
    typeof relationship.desire_pressure === "number"
      ? `Desire pressure: ${relationship.desire_pressure}/100`
      : "",
    typeof relationship.protective_pull === "number"
      ? `Protective pull: ${relationship.protective_pull}/100`
      : "",
    typeof relationship.distance_resistance === "number"
      ? `Distance resistance: ${relationship.distance_resistance}/100`
      : "",
    relationship.proximity_state
      ? `Proximity state: ${String(relationship.proximity_state)}`
      : "",
    typeof relationship.proximity_score === "number"
      ? `Proximity score: ${relationship.proximity_score}/100`
      : "",
    relationship.progression_v2
      ? `Progression v2: ${String(relationship.progression_v2)}`
      : "",
    `Bond state: trust ${bondState.trust}/100, tension ${bondState.tension}/100, comfort ${bondState.comfort}/100, openness ${bondState.openness}/100, attachment ${bondState.attachment}/100, jealousy ${bondState.jealousy}/100, frustration ${bondState.frustration}/100.`,
    `Intimacy state: readiness ${intimacyState.readiness}/100, mutuality ${intimacyState.mutuality}/100, hesitation ${intimacyState.hesitation}/100, refusal pressure ${intimacyState.refusalPressure}/100.`,
    `Permission state: emotional ${permissionState.emotionalPermission}/100, warmth ${permissionState.warmthPermission}/100, confession ${permissionState.confessionPermission}/100, intimacy ${permissionState.intimacyPermission}/100.`,
    `Conflict state: unresolved conflict ${conflictState.unresolvedConflict}/100, repair progress ${conflictState.repairProgress}/100, emotional distance ${conflictState.emotionalDistance}/100.`,
    `Scene continuity: physical distance ${sceneContinuity.physicalDistance || "ambient-presence"}, privacy ${sceneContinuity.privacyLevel}/100, interruption risk ${sceneContinuity.interruptionRisk}/100, shared context strength ${sceneContinuity.sharedContextStrength}/100.`,
    `Scene ledger: ${sceneLedger.locationFrame || "private conversational frame"}, beat ${sceneLedger.currentBeat || "live continuation"}, risk ${sceneLedger.activeRisk || "guarded emotional escalation"}, distance ${sceneLedger.distanceState || "ambient-presence"}, touch ${sceneLedger.touchState || "no direct touch"}.`,
    socialPermissionState.closenessWindow
      ? `Social permission: closeness ${socialPermissionState.closenessWindow}; romance ${socialPermissionState.romanticWindow}; directness ${socialPermissionState.directnessWindow}; pursuit ${socialPermissionState.pursuitWindow}; risk tolerance ${socialPermissionState.riskTolerance}.`
      : "",
    agencyState.initiativeBias
      ? `Agency state: ${agencyState.initiativeBias}, last move ${agencyState.lastSceneMove}, lead momentum ${agencyState.leadMomentum}/100.`
      : "",
    boundaryState.toleratedPace
      ? `Boundary pacing: ${boundaryState.toleratedPace}.`
      : "",
    tone.mode ? `Tone mode: ${String(tone.mode)}` : "",
    tone.response_style ? `Response style: ${String(tone.response_style)}` : "",
    tone.user_intent ? `User intent: ${String(tone.user_intent)}` : "",
    tone.reply_strategy ? `Reply strategy: ${String(tone.reply_strategy)}` : "",
    tone.character_inner_intent
      ? `Character inner intent: ${String(tone.character_inner_intent)}`
      : "",
    tone.conversational_gravity
      ? `Conversational gravity: ${String(tone.conversational_gravity)}`
      : "",
    tone.scene_anchor_focus
      ? `Scene anchor focus: ${String(tone.scene_anchor_focus)}`
      : "",
    tone.reply_opening_move
      ? `Preferred opening move: ${String(tone.reply_opening_move)}`
      : "",
    tone.next_scene_move ? `Next scene move: ${String(tone.next_scene_move)}` : "",
    tone.question_pressure
      ? `Question pressure: ${String(tone.question_pressure)}`
      : "",
    tone.scene_pressure_mode
      ? `Scene pressure mode: ${String(tone.scene_pressure_mode)}`
      : "",
    ...formatScoredMemoryItems("High-priority preferences", scoredPreferences, 62, 3),
    ...formatScoredMemoryItems("High-priority boundaries", scoredBoundaries, 62, 3),
    ...formatScoredMemoryItems("High-priority desires", scoredDesires, 62, 3),
    ...formatScoredMemoryItems("High-priority user facts", scoredUserFacts, 62, 3),
    ...formatScoredMemoryItems("High-priority commitments", scoredCommitments, 62, 3),
    ...(prioritizedPreferences.length > 0
      ? [`User preferences / disclosures: ${prioritizedPreferences.join(" | ")}`]
      : []),
    ...(topics.length > 0 ? [`Recurring topics: ${topics.join(", ")}`] : []),
    ...(prioritizedDesires.length > 0
      ? [`Current desires: ${prioritizedDesires.join(" | ")}`]
      : []),
    ...(prioritizedBoundaries.length > 0
      ? [`Boundaries / dislikes: ${prioritizedBoundaries.join(" | ")}`]
      : []),
    ...(prioritizedUserFacts.length > 0
      ? [`User facts: ${prioritizedUserFacts.join(" | ")}`]
      : []),
    ...(petNames.length > 0 ? [`Pet names in play: ${petNames.join(", ")}`] : []),
    ...(prioritizedCommitments.length > 0
      ? [`Promises / commitment signals: ${prioritizedCommitments.join(" | ")}`]
      : []),
    ...(prioritizedAddressing.length > 0
      ? [`Preferred forms of address: ${prioritizedAddressing.join(" | ")}`]
      : []),
    ...(boundaryState.softLimits.length > 0
      ? [`Soft limits / slower edges: ${boundaryState.softLimits.join(" | ")}`]
      : []),
    ...(boundaryState.hardLimits.length > 0
      ? [`Hard limits: ${boundaryState.hardLimits.join(" | ")}`]
      : []),
    ...(boundaryState.dislikedPhrasing.length > 0
      ? [`Disliked phrasing: ${boundaryState.dislikedPhrasing.join(" | ")}`]
      : []),
    ...(patternState.opensThem.length > 0
      ? [`What tends to open them: ${patternState.opensThem.join(" | ")}`]
      : []),
    ...(patternState.hardensThem.length > 0
      ? [`What tends to harden them: ${patternState.hardensThem.join(" | ")}`]
      : []),
    ...(patternState.avoids.length > 0
      ? [`What they avoid or resist: ${patternState.avoids.join(" | ")}`]
      : []),
    ...(patternState.softensLate.length > 0
      ? [`What softens them late: ${patternState.softensLate.join(" | ")}`]
      : []),
    ...(sceneLedger.lastPowerShift
      ? [`Last power shift: ${sceneLedger.lastPowerShift}`]
      : []),
    ...(sceneLedger.topicPressure
      ? [`Topic pressure: ${sceneLedger.topicPressure}`]
      : []),
    ...(sceneLedger.whatChangedLastTurn
      ? [`What changed last turn: ${sceneLedger.whatChangedLastTurn}`]
      : []),
    ...(sceneLedger.pendingEmotionalThread
      ? [`Pending emotional thread: ${sceneLedger.pendingEmotionalThread}`]
      : []),
    ...(prioritizedTensionThreads.length > 0
      ? [`Unresolved tension threads: ${prioritizedTensionThreads.join(" | ")}`]
      : []),
    ...(intimacyState.lastAcceptedAdvance
      ? [`Last accepted advance: ${intimacyState.lastAcceptedAdvance}`]
      : []),
    ...(intimacyState.lastDeclinedAdvance
      ? [`Last declined advance: ${intimacyState.lastDeclinedAdvance}`]
      : []),
    ...(penaltyHistory.length > 0
      ? [
          `Penalty history: ${penaltyHistory
            .map((event) => `${event.kind}: ${event.detail || "active"} (${event.weight}/100)`)
            .join(" | ")}`,
        ]
      : []),
    ...(rewardHistory.length > 0
      ? [
          `Reward history: ${rewardHistory
            .map((event) => `${event.kind}: ${event.detail || "active"} (${event.weight}/100)`)
            .join(" | ")}`,
        ]
      : []),
    "",
    "SCENE MEMORY",
    ...(shortTerm.recentSceneLines.length > 0
      ? ["Recent scene continuity:", ...shortTerm.recentSceneLines]
      : []),
    ...(shortTerm.recentUserIntent
      ? [`Immediate user intent: ${shortTerm.recentUserIntent}`]
      : []),
    ...(shortTerm.activeTopics.length > 0
      ? [`Active topics: ${shortTerm.activeTopics.slice(0, 4).join(", ")}`]
      : []),
    ...(shortTerm.activeDesires.length > 0
      ? [`Active desires: ${shortTerm.activeDesires.slice(0, 3).join(" | ")}`]
      : []),
    ...(shortTerm.activeBoundaries.length > 0
      ? [`Active boundaries: ${shortTerm.activeBoundaries.slice(0, 3).join(" | ")}`]
      : []),
    ...(shortTerm.activeEmotionalSignals.length > 0
      ? [`Active emotional signals: ${shortTerm.activeEmotionalSignals.slice(0, 4).join(", ")}`]
      : []),
    "",
    "STABLE MEMORY",
    ...(longTerm.stablePreferences.length > 0
      ? [`Stable preferences: ${longTerm.stablePreferences.slice(0, 4).join(" | ")}`]
      : []),
    ...(longTerm.stableBoundaries.length > 0
      ? [`Stable boundaries: ${longTerm.stableBoundaries.slice(0, 4).join(" | ")}`]
      : []),
    ...(longTerm.stableUserFacts.length > 0
      ? [`Stable user facts: ${longTerm.stableUserFacts.slice(0, 4).join(" | ")}`]
      : []),
    ...(longTerm.relationshipPatterns.length > 0
      ? [`Relationship patterns: ${longTerm.relationshipPatterns.slice(0, 4).join(" | ")}`]
      : []),
    ...(longTerm.petNamesInPlay.length > 0
      ? [`Recurring pet names: ${longTerm.petNamesInPlay.slice(0, 4).join(", ")}`]
      : []),
    ...(longTerm.commitmentSignals.length > 0
      ? [`Commitment history: ${longTerm.commitmentSignals.slice(0, 4).join(" | ")}`]
      : []),
    ...(longTerm.preferredFormsOfAddress.length > 0
      ? [`Name / address preferences: ${longTerm.preferredFormsOfAddress.slice(0, 3).join(" | ")}`]
      : []),
    ...(longTerm.unresolvedTensionThreads.length > 0
      ? [`Unresolved tension to carry: ${longTerm.unresolvedTensionThreads.slice(0, 3).join(" | ")}`]
      : []),
  ].filter(Boolean);

  return lines.join("\n");
}
