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
  messageCount: number;
  lastMessageAt?: string | null;
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

  const lines: string[] = [
    `The current relationship feels ${relationshipStage}.`,
    `The active conversation mode is ${mode}.`,
    `The user's current intent seems to be ${intent}.`,
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
  const shortTerm = buildShortTermMemory(messages);
  const longTerm = buildLongTermMemory(messages);
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
    },
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

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeStoredMemoryState(value: unknown): ConversationMemoryState {
  const record = toRecord(value);

  return {
    summary: clean(typeof record.summary === "string" ? record.summary : ""),
    memoryFacts: toRecord(record.memory_facts ?? record.memoryFacts),
    relationshipState: toRecord(record.relationship_state ?? record.relationshipState),
    toneState: toRecord(record.tone_state ?? record.toneState),
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

  const lines: string[] = [
    "SESSION MEMORY",
    state.summary ? `Summary: ${state.summary}` : "Summary: No stored session summary yet.",
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
    tone.mode ? `Tone mode: ${String(tone.mode)}` : "",
    tone.response_style ? `Response style: ${String(tone.response_style)}` : "",
    tone.user_intent ? `User intent: ${String(tone.user_intent)}` : "",
    tone.reply_strategy ? `Reply strategy: ${String(tone.reply_strategy)}` : "",
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
    ...(prioritizedTensionThreads.length > 0
      ? [`Unresolved tension threads: ${prioritizedTensionThreads.join(" | ")}`]
      : []),
    "",
    "SHORT-TERM MEMORY",
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
    "LONG-TERM MEMORY",
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
