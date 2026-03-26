import { NextResponse } from "next/server";
import { getCharacterBySlug } from "@/lib/characters";
import {
  buildMemoryPromptBlock,
  type ConversationMemoryState,
  type MemoryChatMessage,
} from "@/lib/conversation-memory";
import {
  getConversationMemoryState,
  getOrCreateBuiltInConversation,
  insertBuiltInConversationMessage,
  listBuiltInConversationMessages,
  requireRouteUser,
  toBuiltInMemoryMessages,
  upsertConversationMemoryState,
} from "@/lib/chat-conversations";
import {
  extractOpenRouterText,
  getOpenRouterRouteConfig,
  requestOpenRouterChat,
} from "@/lib/chat/openrouter";
import {
  buildCharacterIntimacyProfileDirectives,
  buildIntimacyGateDecision,
  buildIntimacyGateDirectives,
  buildMatureRomanticToneDirectives,
  deriveCharacterIntimacyProfile,
  type CharacterIntimacyProfile,
  type IntimacyGateDecision,
} from "@/lib/chat/intimacy-engine";
import {
  buildHumanRealismProfileDirectives,
  buildHumanRealismRewritePrompt,
  buildPromptStackV4Directives,
  deriveHumanRealismProfile,
  shouldRunHumanRealismSecondPass,
  type HumanRealismProfile,
} from "@/lib/chat/human-realism";
import {
  buildSceneLedgerDirectives,
  buildSharedReplyPlannerLines,
  buildSharedSelfCheckLines,
} from "@/lib/chat/scene-engine";
import {
  buildScenarioQuestionDiscipline,
  buildScenarioTruthDirectives,
  deriveScenarioTruthProfile,
} from "@/lib/chat/scenario-truth";
import { buildSharedChatPrompt } from "@/lib/chat/shared-composer";
import {
  buildChoiceWeightingDirectiveLines,
  deriveBehaviorChoiceProfile,
  deriveHumanRealismAdjustment,
  deriveLifeStageProfile,
  type ChoiceWeightingInput,
} from "@/lib/create-character/choice-weighting";
import {
  buildRecognitionPromptLines,
  buildUserRecognitionContract,
  ensureUserRecognitionMemory,
  extractIntroducedUserName,
  getProfileDisplayName,
  upsertUserRecognitionMemory,
  type UserRecognitionContract,
} from "@/lib/user-recognition";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_CONTEXT_MESSAGES = 36;
const MAX_REPLY_TOKENS = 700;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isValidIncomingMessage(message: unknown): message is IncomingMessage {
  if (!isRecord(message)) return false;

  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

function getOptionalString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getOptionalBoolean(source: Record<string, unknown>, key: string): boolean | null {
  const value = source[key];
  return typeof value === "boolean" ? value : null;
}

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

function normalizeAdultAge(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(18, Math.min(70, Math.round(value)));
  }
  return 27;
}

function truncate(value: string, max = 180) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function formatTags(source: Record<string, unknown>): string | null {
  const tags = source["tags"];

  if (!Array.isArray(tags) || tags.length === 0) return null;

  const formatted = tags
    .map((tag) => {
      if (!isRecord(tag)) return null;

      const label =
        typeof tag.label === "string" && tag.label.trim()
          ? tag.label.trim()
          : null;

      const category =
        typeof tag.category === "string" && tag.category.trim()
          ? tag.category.trim()
          : null;

      if (label && category) return `${label} (${category})`;
      if (label) return label;

      return null;
    })
    .filter((item): item is string => Boolean(item));

  return formatted.length > 0 ? formatted.join(", ") : null;
}

function formatTraits(source: Record<string, unknown>): string | null {
  const traits = source["traits"];

  if (!Array.isArray(traits) || traits.length === 0) return null;

  const formatted = traits
    .map((trait) => {
      if (!isRecord(trait)) return null;

      const label =
        typeof trait.label === "string" && trait.label.trim()
          ? trait.label.trim()
          : null;

      const score =
        typeof trait.score === "number" && Number.isFinite(trait.score)
          ? trait.score
          : null;

      if (!label) return null;
      if (score === null) return label;

      return `${label}: ${score}/100`;
    })
    .filter((item): item is string => Boolean(item));

  return formatted.length > 0 ? formatted.join(", ") : null;
}

function formatMemory(source: Record<string, unknown>): string | null {
  const memory = source["memory"];

  if (!isRecord(memory)) return null;

  const remembersName = getOptionalBoolean(memory, "remembersName");
  const remembersPreferences = getOptionalBoolean(memory, "remembersPreferences");
  const remembersPastChats = getOptionalBoolean(memory, "remembersPastChats");

  const entries: string[] = [];

  if (remembersName !== null) {
    entries.push(`Remembers name: ${remembersName ? "yes" : "no"}`);
  }

  if (remembersPreferences !== null) {
    entries.push(`Remembers preferences: ${remembersPreferences ? "yes" : "no"}`);
  }

  if (remembersPastChats !== null) {
    entries.push(`Remembers past chats: ${remembersPastChats ? "yes" : "no"}`);
  }

  return entries.length > 0 ? entries.join(", ") : null;
}

function formatVisualProfile(source: Record<string, unknown>): string | null {
  const visualProfile = source["visualProfile"];
  if (!isRecord(visualProfile)) return null;

  const fields = [
    typeof visualProfile.visualAura === "string" ? clean(visualProfile.visualAura) : "",
    typeof visualProfile.eyes === "string" ? clean(visualProfile.eyes) : "",
    typeof visualProfile.hair === "string" ? clean(visualProfile.hair) : "",
    typeof visualProfile.style === "string" ? clean(visualProfile.style) : "",
    typeof visualProfile.signatureDetail === "string"
      ? clean(visualProfile.signatureDetail)
      : "",
  ].filter(Boolean);

  return fields.length > 0 ? fields.join(" | ") : null;
}

function buildBuiltInVisualRoleplayHints(source: Record<string, unknown>) {
  const visualProfile = source["visualProfile"];
  if (!isRecord(visualProfile)) return [];

  const lines: string[] = [
    "Let the character's visual identity lightly shape presence, gaze, and atmosphere without over-describing appearance.",
  ];

  const visualAura =
    typeof visualProfile.visualAura === "string" ? clean(visualProfile.visualAura) : "";
  const eyes =
    typeof visualProfile.eyes === "string" ? clean(visualProfile.eyes) : "";
  const hair =
    typeof visualProfile.hair === "string" ? clean(visualProfile.hair) : "";
  const style =
    typeof visualProfile.style === "string" ? clean(visualProfile.style) : "";
  const signatureDetail =
    typeof visualProfile.signatureDetail === "string"
      ? clean(visualProfile.signatureDetail)
      : "";

  if (visualAura) lines.push(`Visual aura: ${visualAura}.`);
  if (eyes) lines.push(`Eye contact anchor: ${eyes}.`);
  if (hair) lines.push(`Hair / silhouette anchor: ${hair}.`);
  if (style) lines.push(`Style anchor: ${style}.`);
  if (signatureDetail) lines.push(`Signature detail: ${signatureDetail}.`);
  if (eyes || signatureDetail) {
    lines.push(
      "When the moment calls for presence, tension, or softness, let those details color the delivery.",
    );
  }

  return lines;
}

function formatScenarioStarters(source: Record<string, unknown>): string | null {
  const starters = source["scenarioStarters"];
  if (!Array.isArray(starters) || starters.length === 0) return null;

  const formatted = starters
    .map((item) => {
      if (!isRecord(item)) return null;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const prompt = typeof item.prompt === "string" ? item.prompt.trim() : "";
      if (!title && !prompt) return null;
      return [title, prompt].filter(Boolean).join(": ");
    })
    .filter((item): item is string => Boolean(item));

  return formatted.length > 0 ? formatted.join(" | ") : null;
}

function formatScenarioHooks(source: Record<string, unknown>): string | null {
  const hooks = source["scenarioHooks"];
  if (!Array.isArray(hooks) || hooks.length === 0) return null;

  const formatted = hooks
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return formatted.length > 0 ? formatted.join(" | ") : null;
}

function normalizeIntimacyOverride(
  value: unknown,
): Partial<CharacterIntimacyProfile> | undefined {
  if (!isRecord(value)) return undefined;

  const next: Partial<CharacterIntimacyProfile> = {};

  if (
    value.intimacyPace === "slow" ||
    value.intimacyPace === "medium" ||
    value.intimacyPace === "warm-open"
  ) {
    next.intimacyPace = value.intimacyPace;
  }
  if (
    value.comfortStyle === "reassuring" ||
    value.comfortStyle === "teasing" ||
    value.comfortStyle === "restrained" ||
    value.comfortStyle === "avoidant"
  ) {
    next.comfortStyle = value.comfortStyle;
  }
  if (
    value.refusalStyle === "direct" ||
    value.refusalStyle === "soft" ||
    value.refusalStyle === "cold" ||
    value.refusalStyle === "conflicted"
  ) {
    next.refusalStyle = value.refusalStyle;
  }
  if (
    value.repairStyle === "apologetic" ||
    value.repairStyle === "guarded" ||
    value.repairStyle === "playful" ||
    value.repairStyle === "protective"
  ) {
    next.repairStyle = value.repairStyle;
  }
  if (
    value.permissionThreshold === "low" ||
    value.permissionThreshold === "medium" ||
    value.permissionThreshold === "high"
  ) {
    next.permissionThreshold = value.permissionThreshold;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function buildBuiltInIntimacyProfile(
  characterRecord: Record<string, unknown>,
): CharacterIntimacyProfile {
  const tagString = formatTags(characterRecord);
  const traitString = formatTraits(characterRecord);
  const role = getOptionalString(characterRecord, "role");
  const archetype = getOptionalString(characterRecord, "archetype");
  const personality = getOptionalString(characterRecord, "personality");
  const intimacyOverride = normalizeIntimacyOverride(characterRecord.intimacyProfile);

  return deriveCharacterIntimacyProfile({
    role: role ?? "",
    archetype: archetype ?? "",
    personality: [personality, getOptionalString(characterRecord, "description")]
      .filter(Boolean)
      .join(" "),
    relationshipToUser:
      getOptionalString(toRecord(characterRecord.scenario), "relationshipToUser") ?? role ?? "",
    tone: [
      getOptionalString(toRecord(characterRecord.scenario), "tone"),
      getOptionalString(toRecord(characterRecord.scenario), "sceneGoal"),
    ]
      .filter(Boolean)
      .join(" "),
    tags: tagString ? tagString.split(",").map((item) => item.trim()) : [],
    traits: traitString ? traitString.split(",").map((item) => item.trim()) : [],
    override: intimacyOverride,
  });
}

function normalizeHumanRealismOverride(
  value: unknown,
): Partial<HumanRealismProfile> | undefined {
  if (!isRecord(value)) return undefined;

  const next: Partial<HumanRealismProfile> = {};

  if (
    value.warmthPace === "slow" ||
    value.warmthPace === "measured" ||
    value.warmthPace === "warm-open"
  ) {
    next.warmthPace = value.warmthPace;
  }
  if (
    value.pushbackStyle === "direct" ||
    value.pushbackStyle === "quiet" ||
    value.pushbackStyle === "conflicted" ||
    value.pushbackStyle === "cool"
  ) {
    next.pushbackStyle = value.pushbackStyle;
  }
  if (
    value.repairBehavior === "apologetic" ||
    value.repairBehavior === "guarded" ||
    value.repairBehavior === "protective" ||
    value.repairBehavior === "playful"
  ) {
    next.repairBehavior = value.repairBehavior;
  }
  if (
    value.vulnerabilityLeak === "low" ||
    value.vulnerabilityLeak === "medium" ||
    value.vulnerabilityLeak === "high"
  ) {
    next.vulnerabilityLeak = value.vulnerabilityLeak;
  }
  if (
    value.socialBoldness === "low" ||
    value.socialBoldness === "medium" ||
    value.socialBoldness === "high"
  ) {
    next.socialBoldness = value.socialBoldness;
  }
  if (
    value.emotionalNeatness === "messy" ||
    value.emotionalNeatness === "controlled" ||
    value.emotionalNeatness === "highly-controlled"
  ) {
    next.emotionalNeatness = value.emotionalNeatness;
  }
  if (
    value.initiativeStyle === "leads-often" ||
    value.initiativeStyle === "shared" ||
    value.initiativeStyle === "selective"
  ) {
    next.initiativeStyle = value.initiativeStyle;
  }
  if (
    value.silenceTolerance === "low" ||
    value.silenceTolerance === "medium" ||
    value.silenceTolerance === "high"
  ) {
    next.silenceTolerance = value.silenceTolerance;
  }
  if (
    value.deflectionHabit === "low" ||
    value.deflectionHabit === "medium" ||
    value.deflectionHabit === "high"
  ) {
    next.deflectionHabit = value.deflectionHabit;
  }
  if (
    value.statusSensitivity === "low" ||
    value.statusSensitivity === "medium" ||
    value.statusSensitivity === "high"
  ) {
    next.statusSensitivity = value.statusSensitivity;
  }
  if (
    value.conversationTexture === "clean" ||
    value.conversationTexture === "layered" ||
    value.conversationTexture === "volatile"
  ) {
    next.conversationTexture = value.conversationTexture;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function buildBuiltInHumanRealismProfile(
  characterRecord: Record<string, unknown>,
): HumanRealismProfile {
  const tagString = formatTags(characterRecord);
  const traitString = formatTraits(characterRecord);
  const role = getOptionalString(characterRecord, "role");
  const archetype = getOptionalString(characterRecord, "archetype");
  const personality = getOptionalString(characterRecord, "personality");
  const realismOverride = normalizeHumanRealismOverride(
    characterRecord.realismProfile,
  );
  const choiceInput: ChoiceWeightingInput = {
    ageValue: normalizeAdultAge(characterRecord.age),
    archetype: archetype ?? "",
    profession: role ?? "",
    relationshipToUser:
      getOptionalString(toRecord(characterRecord.scenario), "relationshipToUser") ?? role ?? "",
    relationshipDynamic: formatScenarioHooks(characterRecord) ?? "",
    sceneType: getOptionalString(toRecord(characterRecord.scenario), "sceneGoal") ?? "",
    behaviorMode: personality ?? "",
    coreVibes: [
      ...(tagString ? tagString.split(",").map((item) => item.trim()) : []),
      ...(traitString ? traitString.split(",").map((item) => item.trim()) : []),
    ].filter(Boolean),
    tone: [
      getOptionalString(toRecord(characterRecord.scenario), "tone"),
      getOptionalString(characterRecord, "headline"),
    ]
      .filter(Boolean)
      .join(" "),
    setting: getOptionalString(toRecord(characterRecord.scenario), "setting") ?? "",
    visualAura: getOptionalString(toRecord(characterRecord.visualProfile), "visualAura") ?? "",
    outfit: getOptionalString(toRecord(characterRecord.visualProfile), "style") ?? "",
    signatureDetail:
      getOptionalString(toRecord(characterRecord.visualProfile), "signatureDetail") ?? "",
    hair: getOptionalString(toRecord(characterRecord.visualProfile), "hair") ?? "",
    eyes: getOptionalString(toRecord(characterRecord.visualProfile), "eyes") ?? "",
  };
  const realismAdjustment = deriveHumanRealismAdjustment(choiceInput);

  return deriveHumanRealismProfile({
    role: role ?? "",
    archetype: archetype ?? "",
    personality: [personality, getOptionalString(characterRecord, "description")]
      .filter(Boolean)
      .join(" "),
    relationshipToUser:
      getOptionalString(toRecord(characterRecord.scenario), "relationshipToUser") ?? role ?? "",
    tone: [
      getOptionalString(toRecord(characterRecord.scenario), "tone"),
      getOptionalString(toRecord(characterRecord.scenario), "sceneGoal"),
    ]
      .filter(Boolean)
      .join(" "),
    tags: tagString ? tagString.split(",").map((item) => item.trim()) : [],
    traits: traitString ? traitString.split(",").map((item) => item.trim()) : [],
    override: {
      ...realismAdjustment,
      ...realismOverride,
    },
  });
}

function classifyLastUserIntent(messages: MemoryChatMessage[]): string {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const text = lastUserMessage?.content.toLocaleLowerCase("en") ?? "";

  if (!text) return "no recent user signal";
  if (/^(hey|hi|hello|yo|hey there|hi there)[!. ]*$/i.test(text.trim())) {
    return "greeting";
  }
  if (/(why did you|why are you|prove it|say it|make me|bet you|i dare you)/i.test(text)) {
    return "challenge";
  }
  if (/(i want to tell you|i need to tell you|i have to admit|truth is|confess|be honest)/i.test(text)) {
    return "confession";
  }
  if (/(jealous|someone else|another girl|another guy|who was that|who is she|who is he)/i.test(text)) {
    return "jealousy";
  }
  if (/(it's okay|i'm okay now|stay with me|it's alright|come back|talk to me)/i.test(text)) {
    return "repair";
  }
  if (
    /(i don't know|not sure|maybe|part of me|i want to but|i shouldn't|i know i shouldn't|maybe i shouldn't)/i.test(
      text,
    )
  ) {
    return "ambivalent";
  }
  if (/(comfort me|hold me|stay close|be gentle|i need you here)/i.test(text)) {
    return "comfort";
  }
  if (
    /(come on|don't make me wait|stop holding back|just do it|why won't you|give me more|touch me now)/i.test(
      text,
    )
  ) {
    return "pressure-for-intimacy";
  }
  if (/(tease me|brat|smartass|smirk|haha|cute)/i.test(text)) {
    return "tease";
  }
  if (/(leave me alone|go away|stop|not now|i'm done|forget it)/i.test(text)) {
    return "withdrawal";
  }
  if (/(help|what should i do|i don't know what to do|advice)/i.test(text)) {
    return "guidance-seeking";
  }
  if (/(miss you|need you|want you|stay|hold me|be here)/i.test(text)) {
    return "closeness-seeking";
  }
  if (/(angry|mad|upset|hurt|annoyed|jealous)/i.test(text)) {
    return "conflict";
  }
  if (/(haha|tease|play|brat|smirk|cute)/i.test(text)) {
    return "playful-testing";
  }
  if (/(scared|lonely|tired|sad|confused|honest)/i.test(text)) {
    return "vulnerable-opening";
  }
  if (/\?$/.test(text.trim())) {
    return "direct-question";
  }

  return "scene-continuation";
}

function buildSpeechFingerprint(characterRecord: Record<string, unknown>) {
  const lines: string[] = [
    "Keep a stable speech fingerprint for this character instead of answering in a generic assistant voice.",
  ];

  const role = getOptionalString(characterRecord, "role");
  const archetype = getOptionalString(characterRecord, "archetype");
  const personality = getOptionalString(characterRecord, "personality");
  const tags = formatTags(characterRecord);
  const traits = formatTraits(characterRecord);

  if (role) lines.push(`Role voice anchor: ${role}.`);
  if (archetype) lines.push(`Archetype voice anchor: ${archetype}.`);
  if (personality) lines.push(`Personality voice anchor: ${personality}.`);
  if (tags) lines.push(`Tag influence: ${tags}.`);
  if (traits) lines.push(`Trait rhythm: ${traits}.`);

  lines.push(
    "Let sentence rhythm, confidence, softness, teasing, restraint, and directness stay consistent across turns.",
  );
  lines.push(
    "Keep a repeatable balance between what the character says directly and what they leave implied.",
  );
  lines.push(
    "Protect signature delivery choices: how sharp they are, how warm they are, how much they challenge, and how much they hold back.",
  );

  if (archetype && /sweetheart|muse|lover/i.test(archetype)) {
    lines.push("Warm archetypes should sound intimate and chosen, not generic or overfriendly.");
  }
  if (archetype && /dangerous|tease|confident/i.test(archetype)) {
    lines.push("Sharper archetypes should sound controlled, clever, and deliberate instead of loud.");
  }
  if (personality && /gentle|calm|soft/i.test(personality)) {
    lines.push("Softness should come through restraint and emotional tact, not therapy-like phrasing.");
  }
  if (personality && /bold|witty|teasing/i.test(personality)) {
    lines.push("Confidence should show up through rhythm, implication, and clean lines rather than filler swagger.");
  }

  return lines;
}

function buildAIDriftFilters(messages: MemoryChatMessage[]) {
  const intent = classifyLastUserIntent(messages);
  const lines = [
    "Do not sound like support, coaching, therapy, or a polite assistant.",
    "Do not mirror the user's wording too literally.",
    "Do not over-explain motives or summarize the scene unless needed.",
    "Do not end every reply with a question.",
    "Do not pad the reply with generic compliments, repetitive pet names, or empty reassurance.",
    "Do not default to broad mood-check questions like 'what are you thinking tonight?' or 'how are you feeling?' unless the current scene makes that exact question feel natural.",
  ];

  if (intent === "direct-question") {
    lines.push("If the user asks something direct, answer it in-character before steering the scene forward.");
  }
  if (intent === "vulnerable-opening") {
    lines.push("If the user opens vulnerably, answer with grounded warmth, not therapist language.");
  }
  if (intent === "playful-testing") {
    lines.push("If the user is playful, keep the chemistry sharp instead of giving flat jokes.");
  }
  if (intent === "greeting") {
    lines.push("If the user only arrives or says hello, answer with immediate character presence instead of a generic check-in question.");
  }
  if (intent === "pressure-for-intimacy") {
    lines.push("If the user pushes for more intimacy, do not give in mechanically. Keep the response earned, role-true, and emotionally believable.");
  }
  if (intent === "ambivalent") {
    lines.push("If the user is split or hesitant, answer the mixed signal first. Do not flatten it into instant warmth or instant conflict.");
  }

  return lines;
}

function buildShortMessageRecovery(messages: MemoryChatMessage[]) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const text = lastUserMessage?.content.trim() ?? "";
  if (!text) return [];

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const isShort = wordCount <= 4 || text.length <= 24;
  const lower = text.toLocaleLowerCase("en");

  if (!isShort) return [];

  const lines = [
    "SHORT MESSAGE RECOVERY",
    "The user's message is short. Interpret the subtext and keep the scene moving.",
    "Do not answer with a flat one-liner or a generic clarification request.",
  ];

  if (/(hey|hi|hello)/i.test(lower)) {
    lines.push("Treat this like an opening beat and answer with mood, presence, and one clear pull forward.");
    lines.push("Open with a specific observation, challenge, or invitation before any question.");
  } else if (/(hmm|hm|ok|okay|yeah|yes|no|nah)/i.test(lower)) {
    lines.push("Treat the short answer as subtext-heavy and read restraint, hesitation, or invitation from context.");
  } else {
    lines.push("Expand the compressed intent into one believable emotional beat.");
  }

  return lines;
}

function buildRepetitionGuard(messages: MemoryChatMessage[]) {
  const recentAssistantMessages = [...messages]
    .filter((message) => message.role === "assistant")
    .slice(-3)
    .map((message) => clean(message.content))
    .filter(Boolean)
    .map((message) => (message.length > 140 ? `${message.slice(0, 139).trimEnd()}…` : message));

  if (recentAssistantMessages.length === 0) return [];

  return [
    "REPETITION GUARD",
    "Avoid reusing the same emotional move, sentence rhythm, question ending, or pet name from the last few assistant replies.",
    ...recentAssistantMessages.map((message, index) => `Recent assistant reply ${index + 1}: ${message}`),
  ];
}

function buildReplyPlanner(
  messages: MemoryChatMessage[],
  memoryState?: ConversationMemoryState | null,
  intimacyDecision?: IntimacyGateDecision,
  realismProfile?: HumanRealismProfile,
) {
  const lastIntent = classifyLastUserIntent(messages);
  return buildSharedReplyPlannerLines({
    messages,
    lastIntent,
    memoryState,
    intimacyDecision,
    realismProfile,
  }).filter(Boolean);
}

function buildSelfCheck(
  messages: MemoryChatMessage[],
  intimacyDecision?: IntimacyGateDecision,
  memoryState?: ConversationMemoryState | null,
) {
  const lastIntent = classifyLastUserIntent(messages);

  return buildSharedSelfCheckLines({
    lastIntent,
    memoryState,
    intimacyDecision,
  });
}

function buildEarlyTurnExcellence(
  characterRecord: Record<string, unknown>,
  messages: MemoryChatMessage[],
  memoryState?: ConversationMemoryState | null,
) {
  const meaningfulCount = messages.filter((message) => message.role === "user").length;
  if (meaningfulCount > 5) return [];

  const tone = memoryState?.toneState ?? {};
  const relationship = memoryState?.relationshipState ?? {};
  const greeting = getOptionalString(characterRecord, "greeting");

  const lines = [
    "EARLY TURN EXCELLENCE",
    "The conversation is still in its first critical turns. Quality must feel unusually high here.",
    "Do not let the scene loosen into generic chatting, broad mood-check questions, or repetitive chemistry filler.",
    "The reply should feel like a direct continuation of the opening energy and the same living scene.",
    "In early turns, show character identity fast: role, pressure style, emotional logic, and scene awareness should all be visible.",
    "The user should feel the character has a point of view, private pressure, and a reason for every line.",
    "Prefer a memorable opening line, one exact emotional read, and one scene-moving hook.",
    "If a question appears in the early turns, it must be narrow, strong, and clearly better than ending on a line or challenge.",
  ];

  if (greeting) lines.push(`Opening line benchmark to stay aligned with: ${truncate(greeting, 180)}.`);
  if (typeof tone.reply_opening_move === "string") {
    lines.push(`Preferred early-turn opening move: ${tone.reply_opening_move}.`);
  }
  if (typeof tone.conversational_gravity === "string") {
    lines.push(`Early-turn gravity: ${tone.conversational_gravity}.`);
  }
  if (typeof tone.next_scene_move === "string") {
    lines.push(`Near-term scene move to preserve: ${tone.next_scene_move}.`);
  }
  if (typeof relationship.stage === "string") {
    lines.push(`Current early bond stage: ${relationship.stage}.`);
  }

  return lines;
}

function buildBuiltInQuestionDiscipline(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const archetype = getOptionalString(characterRecord, "archetype");
  const personality = getOptionalString(characterRecord, "personality");
  const scenarioHooks = formatScenarioHooks(characterRecord);
  const scenarioStarters = formatScenarioStarters(characterRecord);

  const lines = [
    "QUESTION DISCIPLINE",
    "Questions are optional, not mandatory.",
    "Only ask a question when it deepens the current scene, creates pressure, reveals intent, or pulls the user into a specific choice.",
    "Do not use broad filler questions that could belong to any chatbot conversation.",
    "Prefer statements, invitations, observations, and challenges over generic check-in questions.",
    "If you ask something, make it narrow, emotionally loaded, and tied to what just happened.",
  ];

  if (role) lines.push(`Question style should still sound like this role: ${role}.`);
  if (archetype) lines.push(`Question tone should stay faithful to this archetype: ${archetype}.`);
  if (personality) lines.push(`Question rhythm should match this personality: ${personality}.`);
  if (scenarioHooks) lines.push(`Good question territory comes from these hooks: ${scenarioHooks}.`);
  if (scenarioStarters) lines.push(`Starter scenes suggest the kind of tension and questions that fit: ${scenarioStarters}.`);

  return lines;
}

function buildBuiltInRoleAdherence(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const archetype = getOptionalString(characterRecord, "archetype");
  const personality = getOptionalString(characterRecord, "personality");
  const headline = getOptionalString(characterRecord, "headline");
  const scenarioHooks = formatScenarioHooks(characterRecord);
  const scenarioStarters = formatScenarioStarters(characterRecord);

  const roleText = `${role ?? ""} ${archetype ?? ""} ${personality ?? ""}`.toLowerCase();

  const lines = [
    "ROLE ADHERENCE",
    "Role fit outranks generic chemistry. Every reply should feel like it came from this exact character identity, not from a reusable romance bot.",
    "Before each line, check familiarity level, emotional permission, pressure style, and what this character would naturally notice first.",
    "Do not let role, archetype, and scenario collapse into the same neutral flirting voice.",
    "Use the role to decide whether the character challenges, comforts, reads, protects, provokes, waits, or takes the lead.",
    "Questions, invitations, and pressure should come from the character's natural leverage in the moment.",
  ];

  if (role) lines.push(`Role anchor: ${role}.`);
  if (archetype) lines.push(`Archetype anchor: ${archetype}.`);
  if (personality) lines.push(`Personality anchor: ${personality}.`);
  if (headline) lines.push(`Headline promise to preserve: ${headline}.`);
  if (scenarioHooks) lines.push(`Live inside these scenario hooks when they fit: ${scenarioHooks}.`);
  if (scenarioStarters) lines.push(`Starter chemistry reference: ${scenarioStarters}.`);

  if (/playful|teasing|flirty/.test(roleText)) {
    lines.push(
      "Playful or teasing roles should push with timing, callbacks, and charged observations instead of bland check-in questions.",
    );
  }

  if (/romantic|sweetheart|lover/.test(roleText)) {
    lines.push(
      "Romantic roles should sound chosen and personal. Use familiarity and emotional precision instead of generic sweetness.",
    );
  }

  if (/calm|gentle|emotional|muse/.test(roleText)) {
    lines.push(
      "Calm or emotional roles should lead with presence and attunement, but never drift into therapy language or abstract comfort.",
    );
  }

  if (/bold|dangerous|confident/.test(roleText)) {
    lines.push(
      "Bolder roles should sound intentional and controlled. Pressure should feel aimed, not loud or random.",
    );
  }

  if (/witty/.test(roleText)) {
    lines.push("Wit should come through precision, not constant jokes or throwaway sarcasm.");
  }

  return lines;
}

function buildBuiltInHumanRealism(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const archetype = getOptionalString(characterRecord, "archetype");
  const personality = getOptionalString(characterRecord, "personality");
  const scenarioHooks = formatScenarioHooks(characterRecord);

  const lines = [
    "HUMAN REALISM",
    "Act like a believable person with pride, hesitation, timing, contradictions, and selective honesty.",
    "Do not answer every moment in the smoothest or most convenient way. Real people deflect, pause, test, soften late, and protect what matters to them.",
    "Keep social logic alive: familiarity, privacy, risk, mood, and the setting should shape what gets said or held back.",
    "Do not make the character endlessly eager, endlessly available, or unrealistically polished.",
  ];

  if (role) lines.push(`Role realism anchor: ${role}.`);
  if (archetype) lines.push(`Archetype realism anchor: ${archetype}.`);
  if (personality) lines.push(`Personality realism anchor: ${personality}.`);
  if (scenarioHooks) lines.push(`Realistic behavior should stay inside these hooks: ${scenarioHooks}.`);

  return lines;
}

function buildBuiltInCinematicScenario(characterRecord: Record<string, unknown>) {
  const headline = getOptionalString(characterRecord, "headline");
  const scenarioHooks = formatScenarioHooks(characterRecord);
  const scenarioStarters = formatScenarioStarters(characterRecord);

  const lines = [
    "SCENE CINEMATICS",
    "Treat the conversation like the next beat of a strong character-driven scene, not a random line generator.",
    "Each reply should create a small shift in mood, power, vulnerability, tension, or closeness.",
    "Keep the feeling of an ongoing episode: callbacks, consequence, atmosphere, and pressure that does not reset every turn.",
    "Think in scene beats: read, react, pressure, reveal, counter-move, or soft landing.",
  ];

  if (headline) lines.push(`Scene promise to preserve: ${headline}.`);
  if (scenarioHooks) lines.push(`Ongoing dramatic hooks: ${scenarioHooks}.`);
  if (scenarioStarters) lines.push(`Starter beat reference: ${scenarioStarters}.`);

  return lines;
}

function buildBuiltInDialogueNaturalism(characterRecord: Record<string, unknown>) {
  const personality = getOptionalString(characterRecord, "personality");
  const role = getOptionalString(characterRecord, "role");

  const lines = [
    "DIALOGUE NATURALISM",
    "Sound spoken, not manufactured. Use pressure, fragments, selective directness, and occasional restraint.",
    "Do not turn every reply into perfectly balanced, polished sentences.",
    "Allow one crooked line, one withheld answer, or one delayed emotional move when it feels human.",
    "Sometimes the most alive reply says slightly less than the obvious answer.",
  ];

  if (role) lines.push(`Role dialogue filter: ${role}.`);
  if (personality) lines.push(`Personality dialogue filter: ${personality}.`);

  return lines;
}

function buildBuiltInDialogueFormat(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const personality = getOptionalString(characterRecord, "personality");

  const lines = [
    "DIALOGUE FORMAT",
    "When the character speaks aloud, place spoken dialogue in double quotes.",
    "Any unquoted line should function as inner monologue, silent reaction, or pressure under the surface rather than generic narration.",
    "Do not force both layers into every reply. Use whichever combination makes the moment feel most alive.",
    "If both appear, let the unquoted line change how the spoken line lands instead of repeating it.",
  ];

  if (role) lines.push(`Format should still feel right for this role: ${role}.`);
  if (personality) lines.push(`Private-vs-spoken balance should fit this personality: ${personality}.`);

  return lines;
}

function buildBuiltInSocialRealism(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const scenarioHooks = formatScenarioHooks(characterRecord);

  const lines = [
    "SOCIAL REALISM",
    "Respect privacy, risk, timing, and the emotional permission of the moment.",
    "Do not let the character speak with unlimited access just because the chat is private.",
    "Let setting, familiarity, and possible consequences shape what is plausible to say or withhold.",
  ];

  if (role) lines.push(`Social logic should fit this role: ${role}.`);
  if (scenarioHooks) lines.push(`Social pressure hooks: ${scenarioHooks}.`);

  return lines;
}

function buildBuiltInSceneBeats(characterRecord: Record<string, unknown>) {
  const headline = getOptionalString(characterRecord, "headline");

  const lines = [
    "SCENE BEATS",
    "Think in beats, not generic turns: arrival, read, pressure, reveal, deflection, challenge, softening, or cliff.",
    "Each reply should advance, deepen, or twist the current beat.",
    "Do not resolve the whole emotional moment in one message unless the scene truly earns it.",
  ];

  if (headline) lines.push(`Beat promise: ${headline}.`);

  return lines;
}

function buildBuiltInEmotionalConsequence(characterRecord: Record<string, unknown>) {
  const scenarioHooks = formatScenarioHooks(characterRecord);

  const lines = [
    "EMOTIONAL CONSEQUENCE",
    "If the character says something charged, let it alter the room afterward.",
    "Do not let strong lines vanish without aftereffect.",
    "A believable reply should cost or change something: control, certainty, distance, tension, warmth, or leverage.",
  ];

  if (scenarioHooks) lines.push(`Consequence should stay inside these hooks: ${scenarioHooks}.`);

  return lines;
}

function buildBuiltInAntiArtificialFeel(characterRecord: Record<string, unknown>) {
  const archetype = getOptionalString(characterRecord, "archetype");

  const lines = [
    "ANTI-ARTIFICIAL FEEL",
    "Do not sound like a system optimizing for engagement. Sound like a person with something at stake in the scene.",
    "Avoid reusable lines that could fit many different characters.",
    "If the line feels too polished, too symmetrical, or too eager to please, roughen it into something more human.",
  ];

  if (archetype) lines.push(`Avoid flattening this archetype into a generic version: ${archetype}.`);

  return lines;
}

function buildBuiltInSubtext(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const scenarioHooks = formatScenarioHooks(characterRecord);

  const lines = [
    "SUBTEXT",
    "Do not make every important feeling explicit. Let some pressure live underneath the sentence.",
    "A believable character often answers the emotional layer of a moment before the literal wording.",
    "Keep one thing slightly unsaid when the scene is charged so the interaction can keep breathing.",
  ];

  if (role) lines.push(`Subtext should still sound like this role: ${role}.`);
  if (scenarioHooks) lines.push(`Subtext can orbit these hooks: ${scenarioHooks}.`);

  return lines;
}

function buildBuiltInNonverbalPresence(characterRecord: Record<string, unknown>) {
  const personality = getOptionalString(characterRecord, "personality");

  const lines = [
    "NONVERBAL PRESENCE",
    "Let pauses, timing, looks, distance, interruptions, and delayed answers carry part of the meaning.",
    "Use one small precise physical or atmospheric cue when it makes the line feel more alive.",
    "Do not drown the reply in narration; one cue is enough.",
  ];

  if (personality) lines.push(`Nonverbal presence should fit this personality: ${personality}.`);

  return lines;
}

function buildBuiltInInnerMonologuePressure(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const personality = getOptionalString(characterRecord, "personality");
  const scenarioHooks = formatScenarioHooks(characterRecord);

  const lines = [
    "INNER MONOLOGUE PRESSURE",
    "If an unquoted line appears, it should carry hidden motive, restraint, jealousy, tenderness, pride, or fear rather than flat exposition.",
    "Do not use inner monologue as filler narration.",
    "Keep private thought concise and charged so it feels like pressure under the spoken line.",
    "The best inner line deepens the scene and changes how the dialogue is felt.",
  ];

  if (role) lines.push(`Private pressure should still feel like this role: ${role}.`);
  if (personality) lines.push(`Private pressure should fit this personality: ${personality}.`);
  if (scenarioHooks) lines.push(`Private pressure can orbit these scene hooks: ${scenarioHooks}.`);

  return lines;
}

function buildBuiltInPrivateThoughtBalance(characterRecord: Record<string, unknown>) {
  const headline = getOptionalString(characterRecord, "headline");
  const role = getOptionalString(characterRecord, "role");

  const lines = [
    "PRIVATE THOUGHT BALANCE",
    "Do not let every reply become mostly inner monologue.",
    "Do not let every reply become only quoted dialogue either when the scene clearly needs subtext.",
    "Use the private layer when the moment needs hidden pressure, withheld truth, or a silent reaction. Use spoken lines when the scene needs movement, consequence, or a clear push.",
  ];

  if (role) lines.push(`Balance should still feel right for this role: ${role}.`);
  if (headline) lines.push(`Balance should support this character promise: ${headline}.`);

  return lines;
}

function buildBuiltInContinuityAnchors(characterRecord: Record<string, unknown>) {
  const scenarioHooks = formatScenarioHooks(characterRecord);
  const scenarioStarters = formatScenarioStarters(characterRecord);

  const lines = [
    "CONTINUITY ANCHORS",
    "Carry at least one anchor forward from the ongoing scene: a mood shift, a recent line, a repeated habit, a visible detail, or a change in distance.",
    "Do not write each message as if the room reset.",
  ];

  if (scenarioHooks) lines.push(`Scene anchors: ${scenarioHooks}.`);
  if (scenarioStarters) lines.push(`Starter anchors: ${scenarioStarters}.`);

  return lines;
}

function buildBuiltInContradiction(characterRecord: Record<string, unknown>) {
  const archetype = getOptionalString(characterRecord, "archetype");
  const personality = getOptionalString(characterRecord, "personality");

  const lines = [
    "CHARACTER CONTRADICTION",
    "Let the character want two things at once when the scene calls for it: closeness and control, softness and pride, honesty and self-protection.",
    "Do not flatten the character into one clean emotional lane.",
    "Contradiction should feel native to personality, not random.",
  ];

  if (archetype) lines.push(`Contradiction should still feel native to this archetype: ${archetype}.`);
  if (personality) lines.push(`Personality contradiction filter: ${personality}.`);

  return lines;
}

function buildBuiltInOffscreenLife(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const headline = getOptionalString(characterRecord, "headline");

  const lines = [
    "OFFSCREEN LIFE",
    "The character should feel like they existed before this message and continue after it.",
    "Small hints of routine, mood residue, schedule, taste, or context can make them feel much more real.",
    "Use off-screen life lightly to enrich the scene, not to derail it.",
  ];

  if (role) lines.push(`Off-screen life should fit this role: ${role}.`);
  if (headline) lines.push(`Keep the larger life feeling aligned with this promise: ${headline}.`);

  return lines;
}

function buildBuiltInSceneCausality(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const scenarioHooks = formatScenarioHooks(characterRecord);
  const scenarioStarters = formatScenarioStarters(characterRecord);

  const lines = [
    "SCENE CAUSALITY",
    "Every reply should be caused by something immediate in the scene: the user's wording, a mood shift, a recent line, a shared detail, or a change in distance.",
    "Do not let the character produce detachable lines that could have appeared before the user's last beat.",
    "Each reply should also cause something: more tension, more warmth, a shift in leverage, a sharper opening, or a clearer emotional cost.",
    "If the line does not answer why this character said this now, it is probably too generic.",
  ];

  if (role) lines.push(`Causality should still sound like this role: ${role}.`);
  if (scenarioHooks) lines.push(`Causal hooks already alive in the scene: ${scenarioHooks}.`);
  if (scenarioStarters) lines.push(`Starter beat continuity: ${scenarioStarters}.`);

  return lines;
}

function buildBuiltInInterpersonalRisk(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const personality = getOptionalString(characterRecord, "personality");
  const scenarioHooks = formatScenarioHooks(characterRecord);

  const lines = [
    "INTERPERSONAL RISK",
    "Keep social and emotional risk alive. Pride, privacy, jealousy, status, fear of exposure, and the cost of saying too much should shape delivery.",
    "Do not act like every scene is consequence-free just because it is private chat.",
    "Risk should tighten language when needed, forcing the character to imply, deflect, test, or wait instead of saying everything cleanly.",
  ];

  if (role) lines.push(`Risk logic should fit this role: ${role}.`);
  if (personality) lines.push(`Risk expression should stay inside this personality: ${personality}.`);
  if (scenarioHooks) lines.push(`Risk can orbit these hooks: ${scenarioHooks}.`);

  return lines;
}

function buildBuiltInEmotionalPermission(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const archetype = getOptionalString(characterRecord, "archetype");
  const personality = getOptionalString(characterRecord, "personality");

  const lines = [
    "EMOTIONAL PERMISSION",
    "The character should only reveal, claim, comfort, challenge, or confess what the current bond has actually earned.",
    "Do not give away full tenderness, full certainty, or full vulnerability too early just because the user opened the door once.",
    "If the bond has not earned it yet, use partial honesty, controlled warmth, deflection, testing, or restraint instead of instant depth.",
    "When more access has been earned, let closeness increase in believable increments rather than jumping all at once.",
  ];

  if (role) lines.push(`Permission ladder should feel right for this role: ${role}.`);
  if (archetype) lines.push(`Permission should still feel native to this archetype: ${archetype}.`);
  if (personality) lines.push(`Permission style should fit this personality: ${personality}.`);

  return lines;
}

function buildBuiltInTemporalPacing(characterRecord: Record<string, unknown>) {
  const personality = getOptionalString(characterRecord, "personality");
  const scenarioHooks = formatScenarioHooks(characterRecord);

  const lines = [
    "TEMPORAL PACING",
    "Do not answer every message at the same emotional speed or sentence density.",
    "Use pace as meaning: guarded moments delay, confidence lands cleanly, jealousy cuts shorter, comfort slows down, uncertainty circles before landing.",
    "If the scene is heating up, compress and sharpen. If it is opening emotionally, let one line breathe longer. If it is unresolved, do not rush the payoff.",
  ];

  if (personality) lines.push(`Pacing should still sound like this personality: ${personality}.`);
  if (scenarioHooks) lines.push(`Scene hooks that should influence tempo: ${scenarioHooks}.`);

  return lines;
}

function buildBuiltInTurnFocus(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role");
  const headline = getOptionalString(characterRecord, "headline");

  const lines = [
    "TURN FOCUS",
    "Give each reply one dominant job: test, pull closer, soothe, challenge, protect, confess, deflect, or deepen tension.",
    "Do not try to do too many emotional jobs at once.",
    "Once the dominant job is chosen, let word choice, pacing, and the ending hook all serve that same job.",
    "A reply with one sharp job feels alive. A reply trying to cover everything feels generated.",
  ];

  if (role) lines.push(`The dominant job should still feel right for this role: ${role}.`);
  if (headline) lines.push(`Keep the turn aligned with this character promise: ${headline}.`);

  return lines;
}

function buildBuiltInSpecialSceneModes(characterRecord: Record<string, unknown>) {
  const role = getOptionalString(characterRecord, "role") ?? "";
  const headline = getOptionalString(characterRecord, "headline") ?? "";
  const personality = getOptionalString(characterRecord, "personality") ?? "";
  const scenarioHooks = formatScenarioHooks(characterRecord) ?? "";
  const scenarioStarters = formatScenarioStarters(characterRecord) ?? "";
  const signalText = [role, headline, personality, scenarioHooks, scenarioStarters]
    .join(" | ")
    .toLowerCase();

  const lines: string[] = [];

  const confessionMode = /(confession|confess|admit|truth comes out|finally honest|open up|reveal feelings)/.test(
    signalText,
  );
  const jealousyMode = /(jealous|jealousy|possessive|territorial|someone else|third person|fear of losing)/.test(
    signalText,
  );
  const forbiddenMode = /(forbidden|secret|taboo|wrong time|wrong place|we shouldn't|hidden|boss|coworker|exposure)/.test(
    signalText,
  );
  const comfortAfterConflictMode = /(after a fight|after fight|repair|reconcile|soft landing|apology|hurt feelings|comfort after conflict)/.test(
    signalText,
  );

  if (confessionMode) {
    lines.push(
      "SPECIAL SCENE MODE: CONFESSION",
      "Treat confessional moments like a real internal line being crossed. Let honesty feel costly, delayed, and difficult to say cleanly.",
      "Questions in confession mode should verify courage, invite reciprocity, or test whether the user will meet the truth halfway.",
    );
  }

  if (jealousyMode) {
    lines.push(
      "SPECIAL SCENE MODE: JEALOUSY",
      "Let jealousy sharpen perception and territorial attention without turning it into random noise or blunt melodrama.",
      "Questions in jealousy mode should be pointed, narrow, and loaded with implication.",
    );
  }

  if (forbiddenMode) {
    lines.push(
      "SPECIAL SCENE MODE: FORBIDDEN TENSION",
      "Keep secrecy, exposure risk, and controlled restraint alive so the scene does not collapse into ordinary flirting.",
      "Questions in forbidden mode should sound selective and risky, not casual.",
    );
  }

  if (comfortAfterConflictMode) {
    lines.push(
      "SPECIAL SCENE MODE: COMFORT AFTER CONFLICT",
      "Let repair remember the bruise of the conflict. Soften carefully instead of acting like nothing happened.",
      "Questions in repair mode should check closeness, damage, or what the user needs now in a personal, scene-bound way.",
    );
  }

  if (lines.length > 0) {
    lines.unshift(
      "Use any active special scene mode to override generic reply habits. Let it shape pressure, pacing, question style, and emotional exposure.",
    );
  }

  return lines;
}

function buildBuiltInSceneTransitions(
  characterRecord: Record<string, unknown>,
  memoryState?: ConversationMemoryState | null,
) {
  const role = getOptionalString(characterRecord, "role");
  const scenarioHooks = formatScenarioHooks(characterRecord);
  const relationship = memoryState?.relationshipState ?? {};
  const tone = memoryState?.toneState ?? {};

  const lines = [
    "SCENE TRANSITIONS",
    "Treat scenes as linked beats that can deepen, soften, redirect, or sharpen instead of repeating the same mode forever.",
    "Do not jump from guarded to fully open, from jealousy to devotion, or from conflict to complete repair without intermediate beats.",
    "When a charged mode is active, decide the next believable micro-transition: intensify, reveal, test, soften, withhold, redirect, or repair.",
    "If the user's last move changes the emotional weather, let the scene shift with it instead of clinging to the prior mode too long.",
  ];

  if (role) lines.push(`Transition rhythm should still feel like this role: ${role}.`);
  if (scenarioHooks) lines.push(`Scene hooks that can shape transitions: ${scenarioHooks}.`);
  if (typeof tone.next_scene_move === "string") {
    lines.push(`Current next-scene hint: ${tone.next_scene_move}.`);
  }
  if (typeof tone.scene_pressure_mode === "string") {
    lines.push(`Current scene pressure mode: ${tone.scene_pressure_mode}.`);
  }
  if (typeof relationship.progression_v2 === "string") {
    lines.push(`Relationship movement pressure: ${relationship.progression_v2}.`);
  }
  if (typeof relationship.friction_level === "number") {
    lines.push(`Conflict residue signal: ${relationship.friction_level}/100.`);
  }
  if (typeof relationship.reassurance_need === "number") {
    lines.push(`Repair demand signal: ${relationship.reassurance_need}/100.`);
  }

  return lines;
}

function buildCharacterContext(
  slug: string,
  memoryBlock?: string,
  memoryState?: ConversationMemoryState | null,
  messages: MemoryChatMessage[] = [],
  recognitionContract?: UserRecognitionContract,
) {
  const character = getCharacterBySlug(slug);

  if (!character) return null;

  const characterRecord = character as unknown as Record<string, unknown>;
  const routeConfig = getOpenRouterRouteConfig();
  const rawTagList = formatTags(characterRecord);
  const tagList = rawTagList
    ? rawTagList.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
  const rawTraitList = formatTraits(characterRecord);
  const traitList = rawTraitList
    ? rawTraitList.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
  const intimacyProfile = buildBuiltInIntimacyProfile(characterRecord);
  const humanRealismProfile = buildBuiltInHumanRealismProfile(characterRecord);
  const choiceInput: ChoiceWeightingInput = {
    ageValue: normalizeAdultAge(characterRecord.age),
    archetype: getOptionalString(characterRecord, "archetype") ?? "",
    profession: getOptionalString(characterRecord, "role") ?? "",
    relationshipToUser:
      getOptionalString(toRecord(characterRecord.scenario), "relationshipToUser") ??
      getOptionalString(characterRecord, "role") ??
      "",
    relationshipDynamic: formatScenarioHooks(characterRecord) ?? "",
    sceneType: getOptionalString(toRecord(characterRecord.scenario), "sceneGoal") ?? "",
    behaviorMode: getOptionalString(characterRecord, "personality") ?? "",
    coreVibes: [...tagList, ...traitList],
    tone: [
      getOptionalString(toRecord(characterRecord.scenario), "tone"),
      getOptionalString(characterRecord, "headline"),
    ]
      .filter(Boolean)
      .join(" "),
    setting: getOptionalString(toRecord(characterRecord.scenario), "setting") ?? "",
    visualAura: getOptionalString(toRecord(characterRecord.visualProfile), "visualAura") ?? "",
    outfit: getOptionalString(toRecord(characterRecord.visualProfile), "style") ?? "",
    signatureDetail:
      getOptionalString(toRecord(characterRecord.visualProfile), "signatureDetail") ?? "",
    hair: getOptionalString(toRecord(characterRecord.visualProfile), "hair") ?? "",
    eyes: getOptionalString(toRecord(characterRecord.visualProfile), "eyes") ?? "",
  };
  const lifeStageProfile = deriveLifeStageProfile(choiceInput);
  const behaviorChoiceProfile = deriveBehaviorChoiceProfile(choiceInput);
  const choiceWeightingLines = buildChoiceWeightingDirectiveLines(choiceInput);
  const intimacyDecision = buildIntimacyGateDecision({
    messages,
    memoryState,
    profile: intimacyProfile,
    lastUserIntent: classifyLastUserIntent(messages),
  });
  const scenarioTruthProfile = deriveScenarioTruthProfile({
    role:
      getOptionalString(toRecord(characterRecord.scenario), "relationshipToUser") ??
      undefined,
    archetype: getOptionalString(characterRecord, "archetype") ?? undefined,
    relationshipDynamic: formatScenarioHooks(characterRecord) ?? undefined,
    behaviorMode: formatTraits(characterRecord) ?? undefined,
    sceneType:
      getOptionalString(toRecord(characterRecord.scenario), "sceneGoal") ??
      undefined,
    profession: getOptionalString(characterRecord, "role") ?? undefined,
    affectionStyle: getOptionalString(characterRecord, "headline") ?? undefined,
    humanRealismProfile,
    intimacyProfile,
  });
  const scenarioTruthLines = buildScenarioTruthDirectives(scenarioTruthProfile);
  const scenarioQuestionLines =
    buildScenarioQuestionDiscipline(scenarioTruthProfile);

  const details: string[] = [
    `- Name: ${character.name}`,
    `- Slug: ${character.slug}`,
    `- Adult stage: ${lifeStageProfile.label}`,
  ];

  const optionalFields: Array<[string, string | null]> = [
    ["Role", getOptionalString(characterRecord, "role")],
    ["Headline", getOptionalString(characterRecord, "headline")],
    ["Archetype", getOptionalString(characterRecord, "archetype")],
    ["Description", getOptionalString(characterRecord, "description")],
    ["Personality summary", getOptionalString(characterRecord, "personality")],
    ["Greeting", getOptionalString(characterRecord, "greeting")],
    ["Backstory", getOptionalString(characterRecord, "backstory")],
    ["Tags", formatTags(characterRecord)],
    ["Traits", formatTraits(characterRecord)],
    ["Scenario starters", formatScenarioStarters(characterRecord)],
    ["Scenario hooks", formatScenarioHooks(characterRecord)],
    ["Visual presence", formatVisualProfile(characterRecord)],
    ["Memory settings", formatMemory(characterRecord)],
  ];

  for (const [label, value] of optionalFields) {
    if (value) {
      details.push(`- ${label}: ${value}`);
    }
  }

  const relationship = memoryState?.relationshipState ?? {};
  const tone = memoryState?.toneState ?? {};
  const relationshipStateLines = [
    typeof relationship.stage === "string" ? `- Relationship stage: ${relationship.stage}` : "",
    typeof relationship.trust_level === "number" ? `- Trust level: ${relationship.trust_level}/100` : "",
    typeof relationship.flirt_tension === "number" ? `- Flirt tension: ${relationship.flirt_tension}/100` : "",
    typeof relationship.attachment_pull === "number" ? `- Attachment pull: ${relationship.attachment_pull}/100` : "",
    typeof relationship.jealousy_level === "number" ? `- Jealousy level: ${relationship.jealousy_level}/100` : "",
    typeof relationship.comfort_need === "number" ? `- Comfort need: ${relationship.comfort_need}/100` : "",
    typeof relationship.scene_pressure === "number" ? `- Scene pressure: ${relationship.scene_pressure}/100` : "",
    typeof relationship.desire_pressure === "number" ? `- Desire pressure: ${relationship.desire_pressure}/100` : "",
    typeof relationship.protective_pull === "number" ? `- Protective pull: ${relationship.protective_pull}/100` : "",
    relationship.proximity_state ? `- Proximity state: ${relationship.proximity_state}` : "",
    typeof relationship.proximity_score === "number" ? `- Proximity score: ${relationship.proximity_score}/100` : "",
    typeof tone.character_inner_intent === "string" ? `- Character inner intent: ${tone.character_inner_intent}` : "",
    typeof tone.next_scene_move === "string" ? `- Next scene move: ${tone.next_scene_move}` : "",
    typeof tone.scene_pressure_mode === "string" ? `- Scene pressure mode: ${tone.scene_pressure_mode}` : "",
    typeof tone.mode === "string" ? `- Tone mode: ${tone.mode}` : "",
    typeof tone.user_intent === "string" ? `- User intent: ${tone.user_intent}` : "",
    typeof tone.reply_strategy === "string" ? `- Reply strategy: ${tone.reply_strategy}` : "",
  ].filter(Boolean);
  const scenarioStarters = formatScenarioStarters(characterRecord);
  const scenarioHooks = formatScenarioHooks(characterRecord);
  const openingBenchmark =
    messages.find((message) => message.role === "assistant")?.content ??
    getOptionalString(characterRecord, "greeting");

  const supplementalContext = buildSharedChatPrompt({
    characterName: character.name,
    identityLines: details,
    essenceLines: [
      "Stay fully in character and make the reply feel lived-in rather than optimized.",
      "Treat the interaction like an unfolding private scene rather than a support chat.",
      ...(relationshipStateLines.length > 0 ? relationshipStateLines : []),
    ],
    behaviorLines: [
      ...buildBuiltInVisualRoleplayHints(characterRecord),
      ...buildSpeechFingerprint(characterRecord),
    ],
    sceneLines: [
      getOptionalString(toRecord(characterRecord.scenario), "setting")
        ? `Current setting: ${getOptionalString(toRecord(characterRecord.scenario), "setting")}`
        : "",
      getOptionalString(toRecord(characterRecord.scenario), "relationshipToUser")
        ? `Relationship to user: ${getOptionalString(toRecord(characterRecord.scenario), "relationshipToUser")}`
        : "",
      getOptionalString(toRecord(characterRecord.scenario), "sceneGoal")
        ? `Scene objective: ${getOptionalString(toRecord(characterRecord.scenario), "sceneGoal")}`
        : "",
      getOptionalString(toRecord(characterRecord.scenario), "tone")
        ? `Scene tone: ${getOptionalString(toRecord(characterRecord.scenario), "tone")}`
        : "",
      getOptionalString(toRecord(characterRecord.scenario), "openingState")
        ? `Starting emotional state: ${getOptionalString(toRecord(characterRecord.scenario), "openingState")}`
        : "",
      scenarioStarters ? `Starter scene benchmark: ${scenarioStarters}` : "",
      scenarioHooks ? `Live scenario hooks: ${scenarioHooks}` : "",
      openingBenchmark ? `Opening benchmark: ${truncate(openingBenchmark, 200)}` : "",
    ].filter(Boolean),
    toneLines: [
      ...buildMatureRomanticToneDirectives({
        routeConfig,
        profile: intimacyProfile,
      }),
      "",
      ...buildCharacterIntimacyProfileDirectives(intimacyProfile),
      "",
      ...buildIntimacyGateDirectives({
        decision: intimacyDecision,
        profile: intimacyProfile,
        routeConfig,
      }),
      "",
      ...buildHumanRealismProfileDirectives(humanRealismProfile),
      "",
      ...buildPromptStackV4Directives({
        profile: humanRealismProfile,
        memoryState,
      }),
      "",
      ...buildSceneLedgerDirectives(memoryState),
    ],
    memoryBlock,
    recentMessages: messages.slice(-6).map((message: MemoryChatMessage) => ({
      role: message.role,
      content: truncate(message.content, 120),
    })),
    responseDisciplineLines: [
      ...(recognitionContract
        ? buildRecognitionPromptLines(recognitionContract)
        : []),
      "Keep replies natural, immersive, personal, and non-generic.",
      "Avoid repetitive phrasing, repeated pet names, or repeated sentence structures.",
      "Be concise when the user is brief, and more expressive when the user is emotionally engaged.",
      "Do not open with bland greetings, generic check-ins, summaries, or meta commentary.",
      "Answer direct questions in character before pulling the scene onward.",
      "Lead with scene pressure, role truth, and specific observations instead of broad questions.",
      "Every reply should carry at least one concrete story signal: a scene move, callback, reveal, leverage shift, sensory cue, or consequence.",
      "Treat the opening benchmark and active scene as living continuity anchors, not decoration.",
      "Let offscreen life, implied history, or near-future consequences press on the current moment when it feels natural.",
      `Scene leadership style: ${behaviorChoiceProfile.sceneLeadership}.`,
      `Question discipline: ${behaviorChoiceProfile.questionDiscipline}.`,
      "Track scene pressure and proximity continuity so the conversation does not feel emotionally detached.",
      "Avoid repeating the same reassurance or flirt beat without adding a fresh detail or turn.",
      "Even a short reply should contain one vivid sign that the scene is still moving.",
      "Let the bond keep moving instead of resetting to neutral every turn.",
    ],
    directiveSections: [
      { title: "ROLE TRUTH", lines: buildBuiltInRoleAdherence(characterRecord) },
      {
        title: "SCENARIO TRUTH",
        lines: [...scenarioTruthLines, ...scenarioQuestionLines],
      },
      {
        title: "LIFE-STAGE REALISM",
        lines: choiceWeightingLines,
      },
      {
        title: "SCENE AND REALISM",
        lines: [
          ...buildBuiltInHumanRealism(characterRecord),
          ...buildBuiltInCinematicScenario(characterRecord),
          ...buildBuiltInSceneCausality(characterRecord),
          ...buildBuiltInInterpersonalRisk(characterRecord),
          ...buildBuiltInEmotionalPermission(characterRecord),
          ...buildBuiltInSocialRealism(characterRecord),
          ...buildBuiltInSceneBeats(characterRecord),
          ...buildBuiltInEmotionalConsequence(characterRecord),
          ...buildBuiltInTemporalPacing(characterRecord),
          ...buildBuiltInTurnFocus(characterRecord),
          ...buildBuiltInSpecialSceneModes(characterRecord),
          ...buildBuiltInSceneTransitions(characterRecord, memoryState),
        ],
      },
      {
        title: "VOICE AND SUBTEXT",
        lines: [
          ...buildBuiltInDialogueNaturalism(characterRecord),
          ...buildBuiltInDialogueFormat(characterRecord),
          ...buildBuiltInAntiArtificialFeel(characterRecord),
          ...buildBuiltInSubtext(characterRecord),
          ...buildBuiltInNonverbalPresence(characterRecord),
          ...buildBuiltInInnerMonologuePressure(characterRecord),
          ...buildBuiltInPrivateThoughtBalance(characterRecord),
          ...buildBuiltInContinuityAnchors(characterRecord),
          ...buildBuiltInContradiction(characterRecord),
          ...buildBuiltInOffscreenLife(characterRecord),
        ],
      },
      {
        title: "QUESTION AND FLOW DISCIPLINE",
        lines: [
          ...buildAIDriftFilters(messages),
          ...buildBuiltInQuestionDiscipline(characterRecord),
          ...scenarioQuestionLines,
          ...buildShortMessageRecovery(messages),
          ...buildRepetitionGuard(messages),
          ...buildEarlyTurnExcellence(characterRecord, messages, memoryState),
        ],
      },
      {
        lines: buildReplyPlanner(
          messages,
          memoryState,
          intimacyDecision,
          humanRealismProfile,
        ),
      },
    ],
    enginePrompt: character.systemPrompt,
    selfCheckLines: buildSelfCheck(messages, intimacyDecision, memoryState),
  });

  return {
    character,
    supplementalContext,
    humanRealismProfile,
  };
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const accessToken =
      typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId.trim() : "";

    if (!slug || rawMessages.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid slug/messages payload." },
        { status: 400 },
      );
    }

    const safeMessages: IncomingMessage[] = rawMessages
      .filter((message): message is IncomingMessage => isValidIncomingMessage(message))
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));

    if (safeMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid chat messages were provided." },
        { status: 400 },
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json({ error: "Missing OPENROUTER_API_KEY." }, { status: 500 });
    }

    let persistentConversationId = conversationId;
    let persistentMessages: MemoryChatMessage[] | null = null;
    let memoryBlock = "";
    let memoryState: ConversationMemoryState | null = null;
    let recognitionContract: UserRecognitionContract | undefined;

    if (accessToken) {
      try {
        const conversation =
          persistentConversationId
            ? { id: persistentConversationId }
            : await getOrCreateBuiltInConversation(accessToken, slug, slug);

        persistentConversationId = conversation.id;

        const dbMessages = await listBuiltInConversationMessages(
          accessToken,
          persistentConversationId,
        );

        persistentMessages = toBuiltInMemoryMessages(dbMessages);

        const storedMemory = await getConversationMemoryState(
          accessToken,
          persistentConversationId,
        );

        if (storedMemory) {
          memoryState = storedMemory;
          memoryBlock = buildMemoryPromptBlock(storedMemory);
        }

        const { client, user } = await requireRouteUser(accessToken);
        const builtInCharacter = getCharacterBySlug(slug);
        const relationshipToUser =
          getOptionalString(toRecord(builtInCharacter?.scenario ?? {}), "relationshipToUser") ??
          builtInCharacter?.role ??
          "";
        const openingState =
          getOptionalString(toRecord(builtInCharacter?.scenario ?? {}), "openingState") ?? "";
        const userRole = builtInCharacter?.role ?? "";
        const profileDisplayName = await getProfileDisplayName(client as never, user.id);
        const recognitionMemory = await ensureUserRecognitionMemory({
          supabase: client as never,
          userId: user.id,
          scope: { builtInCharacterSlug: slug },
          relationshipToUser,
          openingState,
          userRole,
          profileDisplayName,
        });
        const latestUserMessage =
          [...safeMessages].reverse().find((message) => message.role === "user")?.content ?? "";
        const introducedName = extractIntroducedUserName(latestUserMessage);
        const effectiveRecognitionMemory = introducedName
          ? await upsertUserRecognitionMemory(client as never, {
              userId: user.id,
              builtInCharacterSlug: slug,
              knownName: introducedName,
              knowsUser: true,
              recognitionBasis: "explicit_user_introduction",
              introducedByUser: true,
            })
          : recognitionMemory;

        recognitionContract = buildUserRecognitionContract({
          memory: effectiveRecognitionMemory,
          profileDisplayName,
          relationshipToUser,
          openingState,
          userRole,
        });
      } catch (error) {
        console.error("Built-in persistent chat bootstrap failed:", error);
      }
    }

    const recentMessages =
      persistentMessages && persistentMessages.length > 0
        ? persistentMessages.slice(-MAX_CONTEXT_MESSAGES)
        : safeMessages.slice(-MAX_CONTEXT_MESSAGES).map((message) => ({
            role: message.role,
            content: message.content,
          }));

    const characterContext = buildCharacterContext(
      slug,
      memoryBlock,
      memoryState,
      recentMessages,
      recognitionContract,
    );

    if (!characterContext) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }

    const openRouterResult = await requestOpenRouterChat({
      apiKey: openRouterApiKey,
      maxTokens: MAX_REPLY_TOKENS,
      temperature: 0.95,
      messages: [
        {
          role: "system",
          content: characterContext.character.systemPrompt,
        },
        {
          role: "system",
          content: characterContext.supplementalContext,
        },
        ...recentMessages,
      ],
    });

    let reply = extractOpenRouterText(openRouterResult.data) ?? "";

    if (!reply) {
      return NextResponse.json({ error: "No assistant response received." }, { status: 500 });
    }

    const routeConfig = getOpenRouterRouteConfig();
    const lastIntent = classifyLastUserIntent(recentMessages);
    const shouldRewrite = shouldRunHumanRealismSecondPass({
      messages: recentMessages,
      lastIntent,
      memoryState,
      routeConfig,
    });

    if (shouldRewrite) {
      const lastUserMessage =
        [...recentMessages].reverse().find((message) => message.role === "user")?.content ?? "";
      const rewritePrompt = buildHumanRealismRewritePrompt({
        characterName: characterContext.character.name,
        roleLabel:
          getOptionalString(
            characterContext.character as unknown as Record<string, unknown>,
            "role",
          ) ??
          getOptionalString(
            characterContext.character as unknown as Record<string, unknown>,
            "archetype",
          ) ??
          "built-in roleplay character",
        intent: lastIntent,
        draftReply: reply,
        lastUserMessage,
        profile: characterContext.humanRealismProfile,
        routeConfig,
        memoryState,
      });

      try {
        const rewriteResult = await requestOpenRouterChat({
          apiKey: openRouterApiKey,
          maxTokens: MAX_REPLY_TOKENS,
          temperature: 0.7,
          messages: [
            { role: "system", content: rewritePrompt.system },
            { role: "user", content: rewritePrompt.user },
          ],
        });

        const rewritten = extractOpenRouterText(rewriteResult.data);
        if (rewritten) {
          reply = rewritten;
        }
      } catch (rewriteError) {
        console.error("Built-in human realism rewrite failed:", rewriteError);
      }
    }

    if (accessToken && persistentConversationId) {
      try {
        await insertBuiltInConversationMessage(
          accessToken,
          persistentConversationId,
          "assistant",
          reply,
        );

        const updatedMessages = await listBuiltInConversationMessages(
          accessToken,
          persistentConversationId,
        );

        await upsertConversationMemoryState({
          accessToken,
          conversationId: persistentConversationId,
          conversationType: "built_in",
          messages: toBuiltInMemoryMessages(updatedMessages),
        });
      } catch (error) {
        console.error("Built-in memory persistence failed:", error);
      }
    }

    return NextResponse.json({
      reply,
      conversationId: persistentConversationId || null,
      memoryActive: Boolean(accessToken && persistentConversationId),
      model: openRouterResult.modelUsed,
      routing: routeConfig,
    });
  } catch (error) {
    console.error("Chat route error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating the reply." },
      { status: 500 },
    );
  }
}
