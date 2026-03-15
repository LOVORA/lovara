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

function scoreClamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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
      .map((text) => truncate(text, 120)),
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

  const flirtScore = scoreClamp(
    flirtTokens.filter((token) => combined.includes(token)).length * 18 + messages.length * 2,
  );
  const trustScore = scoreClamp(
    trustTokens.filter((token) => combined.includes(token)).length * 16 + messages.length * 2,
  );
  const opennessScore = scoreClamp(
    opennessTokens.filter((token) => combined.includes(token)).length * 18 + messages.length,
  );

  return {
    flirtTension: flirtScore,
    trustLevel: trustScore,
    emotionalOpenness: opennessScore,
  };
}

export function buildMemorySummary(messages: MemoryChatMessage[]): string {
  const recent = getRecentMessages(messages, 30);
  const userMessages = recent.filter((msg) => msg.role === "user");
  const relationshipStage = detectRelationshipStage(recent);
  const mode = detectConversationMode(recent);
  const preferences = extractPreferenceLines(userMessages).slice(0, 3);
  const topics = extractTopicKeywords(userMessages).slice(0, 4);

  const lines: string[] = [
    `The current relationship feels ${relationshipStage}.`,
    `The active conversation mode is ${mode}.`,
  ];

  if (preferences.length > 0) {
    lines.push(`The user has revealed preferences or personal context such as: ${preferences.join(" | ")}.`);
  }

  if (topics.length > 0) {
    lines.push(`Recurring topics in this session include: ${topics.join(", ")}.`);
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
  const lastMessage = messages[messages.length - 1];

  return {
    summary: buildMemorySummary(messages),
    memoryFacts: {
      user_preferences: preferenceLines,
      recurring_topics: topicKeywords,
    },
    relationshipState: {
      stage: relationshipStage,
      trust_level: metrics.trustLevel,
      flirt_tension: metrics.flirtTension,
      emotional_openness: metrics.emotionalOpenness,
    },
    toneState: {
      mode,
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

  const preferenceLines = toListString(facts.user_preferences);
  const topics = toListString(facts.recurring_topics);

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
    tone.mode ? `Tone mode: ${String(tone.mode)}` : "",
    tone.response_style ? `Response style: ${String(tone.response_style)}` : "",
    ...(preferenceLines.length > 0
      ? [`User preferences / disclosures: ${preferenceLines.join(" | ")}`]
      : []),
    ...(topics.length > 0 ? [`Recurring topics: ${topics.join(", ")}`] : []),
  ].filter(Boolean);

  return lines.join("\n");
}
