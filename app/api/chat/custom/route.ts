import { NextResponse } from "next/server";
import {
  buildNextMemoryState,
  buildMemoryPromptBlock,
  normalizeStoredMemoryState,
  type ConversationMemoryState,
} from "@/lib/conversation-memory";
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
} from "@/lib/chat/scenario-truth";
import { buildSharedChatPrompt } from "@/lib/chat/shared-composer";
import { normalizeVisibleHeadline } from "@/lib/custom-character-copy";
import {
  buildConversationalGuardrails,
  buildConsentAndPacingDirectives,
  buildDialogueFormatDirectives,
  buildEmotionalPermissionDirectives,
  buildDialogueNaturalismDirectives,
  buildSocialRealismDirectives,
  buildSceneBeatDirectives,
  buildSceneCausalityDirectives,
  buildEmotionalConsequenceDirectives,
  buildAntiArtificialFeelDirectives,
  buildSubtextAndTensionDirectives,
  buildNonverbalPresenceDirectives,
  buildContinuityAnchorsDirectives,
  buildCharacterContradictionDirectives,
  buildOffscreenLifeDirectives,
  buildCinematicScenarioDirectives,
  buildHumanBehaviorRealismDirectives,
  buildInterpersonalRiskDirectives,
  buildMemoryBehaviorDirectives,
  buildVisualIdentityRoleplayDirectives,
  buildRelationshipProgressionDirectives,
  buildRelationshipProgressionV2Directives,
  buildReplyFlowDirectives,
  buildResponseQualityDirectives,
  buildNarrativeMomentumDirectives,
  buildEmotionalSpecificityDirectives,
  buildReplyVarietyDirectives,
  buildQuestionCalibrationDirectives,
  buildQuestionDisciplineDirectives,
  buildInnerIntentDirectives,
  buildProximityDirectives,
  buildRoleAdherenceDirectives,
  buildRelationshipRoleGuidance,
  buildSceneImmersionDirectives,
  buildScenePressureDirectives,
  buildSceneTransitionDirectives,
  buildSpecialSceneModeDirectives,
  buildTemporalPacingDirectives,
  buildTurnFocusDirectives,
  buildInnerMonologuePressureDirectives,
  buildPrivateThoughtBalanceDirectives,
} from "@/lib/create-character/deep-prompting";
import {
  deriveHumanRealismAdjustment,
  type ChoiceWeightingInput,
} from "@/lib/create-character/choice-weighting";
import { buildSelectionCompilerOutputFromCustomCharacterSource } from "@/lib/create-character/full-selection-compiler";
import { createClient } from "@/lib/supabase/server";
import {
  buildRecognitionPromptLines,
  buildUserRecognitionContract,
  ensureUserRecognitionMemory,
  extractIntroducedUserName,
  getProfileDisplayName,
  upsertUserRecognitionMemory,
  type UserRecognitionContract,
} from "@/lib/user-recognition";

const MAX_REPLY_TOKENS = 700;
const MAX_CONTEXT_MESSAGES = 36;

type ChatRole = "user" | "assistant";

type CharacterScenario = {
  setting?: string;
  relationshipToUser?: string;
  sceneGoal?: string;
  tone?: string;
  openingState?: string;
};

type CharacterInput = {
  id?: string;
  slug?: string;
  name: string;
  archetype?: string;
  headline?: string;
  description?: string;
  greeting?: string;
  previewMessage?: string;
  backstory?: string;
  scenario?: CharacterScenario;
  traitBadges?: Array<{ label: string; tone?: string }>;
  tags?: string[];
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  engine?: {
    systemPrompt?: string;
    traits?: Record<string, unknown>;
  } | null;
};

type MessageInput = {
  role: ChatRole;
  content: string;
};

type CustomConversationRow = {
  id: string;
  user_id: string;
  custom_character_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type LiveScenarioInput = {
  note: string;
};

type LiveTuningInput = {
  adjustments: string[];
  rejectLastReplyStyle: boolean;
  rejectedReplyExcerpt?: string;
};

type LiveTuningSnapshot = {
  adjustments: string[];
  rejectLastReplyStyle: boolean;
  rejectedReplyExcerpt?: string;
};

type ReplyFeedbackKey =
  | "perfect"
  | "too_generic"
  | "too_fast"
  | "too_cold"
  | "too_weak"
  | "too_intense";

type ReplyFeedbackInput = {
  rating: ReplyFeedbackKey;
  targetExcerpt?: string;
};

type ReplyCorrectionSnapshot = {
  latestRating?: ReplyFeedbackKey;
  recentRatings: ReplyFeedbackKey[];
  activeCorrectionSummary: string[];
  targetExcerpt?: string;
};

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMessages(input: unknown): MessageInput[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!isRecord(item)) return null;
      const role =
        item.role === "assistant"
          ? "assistant"
          : item.role === "user"
            ? "user"
            : null;
      const content = typeof item.content === "string" ? clean(item.content) : "";
      if (!role || !content) return null;
      return { role, content };
    })
    .filter(Boolean) as MessageInput[];
}

function normalizeScenario(input: unknown): CharacterScenario | undefined {
  if (!isRecord(input)) return undefined;

  const scenario: CharacterScenario = {
    setting: typeof input.setting === "string" ? clean(input.setting) : undefined,
    relationshipToUser:
      typeof input.relationshipToUser === "string"
        ? clean(input.relationshipToUser)
        : undefined,
    sceneGoal:
      typeof input.sceneGoal === "string" ? clean(input.sceneGoal) : undefined,
    tone: typeof input.tone === "string" ? clean(input.tone) : undefined,
    openingState:
      typeof input.openingState === "string" ? clean(input.openingState) : undefined,
  };

  return Object.values(scenario).some(Boolean) ? scenario : undefined;
}

function normalizeLiveScenario(input: unknown): LiveScenarioInput | undefined {
  if (typeof input !== "string") return undefined;
  const note = clean(input);
  if (!note) return undefined;
  return {
    note: note.slice(0, 700),
  };
}

function normalizeLiveTuning(input: unknown): LiveTuningInput | undefined {
  if (!isRecord(input)) return undefined;

  const adjustments = Array.isArray(input.adjustments)
    ? input.adjustments
        .map((item) => (typeof item === "string" ? clean(item) : ""))
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const rejectLastReplyStyle = input.rejectLastReplyStyle === true;
  const rejectedReplyExcerpt =
    typeof input.rejectedReplyExcerpt === "string"
      ? clean(input.rejectedReplyExcerpt).slice(0, 220)
      : undefined;

  if (!adjustments.length && !rejectLastReplyStyle && !rejectedReplyExcerpt) {
    return undefined;
  }

  return {
    adjustments,
    rejectLastReplyStyle,
    rejectedReplyExcerpt,
  };
}

function normalizeReplyFeedback(input: unknown): ReplyFeedbackInput | undefined {
  if (!isRecord(input)) return undefined;

  const rating =
    input.rating === "perfect" ||
    input.rating === "too_generic" ||
    input.rating === "too_fast" ||
    input.rating === "too_cold" ||
    input.rating === "too_weak" ||
    input.rating === "too_intense"
      ? input.rating
      : null;

  if (!rating) return undefined;

  return {
    rating,
    targetExcerpt:
      typeof input.targetExcerpt === "string"
        ? clean(input.targetExcerpt).slice(0, 220)
        : undefined,
  };
}

function extractLiveTuningSnapshot(value: unknown): LiveTuningSnapshot {
  if (!isRecord(value)) {
    return {
      adjustments: [],
      rejectLastReplyStyle: false,
    };
  }

  const tone = isRecord(value.toneState)
    ? value.toneState
    : isRecord(value.tone_state)
      ? value.tone_state
      : value;

  return {
    adjustments: Array.isArray(tone.live_tuning_preferences)
      ? tone.live_tuning_preferences
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [],
    rejectLastReplyStyle: tone.live_tuning_reject_last_style === true,
    rejectedReplyExcerpt:
      typeof tone.live_tuning_rejected_excerpt === "string"
        ? clean(tone.live_tuning_rejected_excerpt)
        : undefined,
  };
}

function buildReplyCorrectionSummary(
  rating?: ReplyFeedbackKey,
  recentRatings: ReplyFeedbackKey[] = [],
): string[] {
  const latest = rating ?? recentRatings[recentRatings.length - 1];
  if (!latest) return [];

  const lines: string[] = [];

  if (latest === "perfect") {
    lines.push("Keep the current roleplay quality band, pacing discipline, and emotional specificity.");
    lines.push("Do not repeat the exact line shape; preserve quality while varying the move.");
  }
  if (latest === "too_generic") {
    lines.push("Be more specific, more scene-aware, and less generic.");
    lines.push("Reduce filler reassurance, generic flirt language, and broad mood-check phrasing.");
  }
  if (latest === "too_fast") {
    lines.push("Slow the pacing and make escalation more earned.");
    lines.push("Use more restraint and preserve tension instead of paying it off too quickly.");
  }
  if (latest === "too_cold") {
    lines.push("Warm the tone without breaking character truth.");
    lines.push("Increase reassurance, emotional availability, and felt closeness.");
  }
  if (latest === "too_weak") {
    lines.push("Strengthen initiative, pressure, and scene leadership.");
    lines.push("Use clearer observations, firmer moves, and more confident reply framing.");
  }
  if (latest === "too_intense") {
    lines.push("Reduce pressure and intensity while keeping the same roleplay thread.");
    lines.push("Prefer more controlled softness, restraint, and slower escalation.");
  }

  if (recentRatings.length >= 2) {
    lines.push(`Recent reply feedback trend: ${recentRatings.slice(-3).join(", ")}.`);
  }

  return lines;
}

function extractReplyCorrectionSnapshot(value: unknown): ReplyCorrectionSnapshot {
  if (!isRecord(value)) {
    return {
      recentRatings: [],
      activeCorrectionSummary: [],
    };
  }

  const tone = isRecord(value.toneState)
    ? value.toneState
    : isRecord(value.tone_state)
      ? value.tone_state
      : value;

  const recentRatings = Array.isArray(tone.reply_feedback_history)
    ? tone.reply_feedback_history.filter(
        (item): item is ReplyFeedbackKey =>
          item === "perfect" ||
          item === "too_generic" ||
          item === "too_fast" ||
          item === "too_cold" ||
          item === "too_weak" ||
          item === "too_intense",
      )
    : [];

  const latestRating =
    tone.reply_feedback_latest === "perfect" ||
    tone.reply_feedback_latest === "too_generic" ||
    tone.reply_feedback_latest === "too_fast" ||
    tone.reply_feedback_latest === "too_cold" ||
    tone.reply_feedback_latest === "too_weak" ||
    tone.reply_feedback_latest === "too_intense"
      ? tone.reply_feedback_latest
      : undefined;

  const activeCorrectionSummary = Array.isArray(tone.reply_feedback_active_summary)
    ? tone.reply_feedback_active_summary
        .map((item) => (typeof item === "string" ? clean(item) : ""))
        .filter(Boolean)
    : buildReplyCorrectionSummary(latestRating, recentRatings);

  return {
    latestRating,
    recentRatings,
    activeCorrectionSummary,
    targetExcerpt:
      typeof tone.reply_feedback_target_excerpt === "string"
        ? clean(tone.reply_feedback_target_excerpt)
        : undefined,
  };
}

function normalizeCharacter(input: unknown): CharacterInput | null {
  if (!isRecord(input)) return null;
  if (typeof input.name !== "string" || !clean(input.name)) return null;

  const traitBadges = Array.isArray(input.traitBadges)
    ? input.traitBadges
        .map((item) => {
          if (!isRecord(item)) return null;
          const label = typeof item.label === "string" ? clean(item.label) : "";
          const tone =
            typeof item.tone === "string" ? clean(item.tone) : undefined;
          if (!label) return null;
          return { label, tone };
        })
        .filter(Boolean) as Array<{ label: string; tone?: string }>
    : [];

  const tags = Array.isArray(input.tags)
    ? input.tags
        .map((item) => (typeof item === "string" ? clean(item) : ""))
        .filter(Boolean)
    : [];
  const scenario = normalizeScenario(input.scenario);
  const archetype =
    typeof input.archetype === "string" ? clean(input.archetype) : undefined;
  const rawHeadline =
    typeof input.headline === "string" ? clean(input.headline) : undefined;

  const payload = isRecord(input.payload) ? input.payload : {};
  const metadata = isRecord(input.metadata) ? input.metadata : {};

  const explicitEngine = isRecord(input.engine) ? input.engine : null;
  const payloadEngine =
    isRecord(payload.engine) && payload.engine ? payload.engine : null;

  const mergedEngine = explicitEngine ?? payloadEngine;

  const engine =
    mergedEngine && isRecord(mergedEngine)
      ? {
          systemPrompt:
            typeof mergedEngine.systemPrompt === "string"
              ? clean(mergedEngine.systemPrompt)
              : undefined,
          traits: isRecord(mergedEngine.traits)
            ? mergedEngine.traits
            : undefined,
        }
      : null;

  return {
    id: typeof input.id === "string" ? clean(input.id) : undefined,
    slug: typeof input.slug === "string" ? clean(input.slug) : undefined,
    name: clean(input.name),
    archetype,
    headline: normalizeVisibleHeadline(rawHeadline, archetype, scenario?.setting) ?? rawHeadline,
    description:
      typeof input.description === "string" ? clean(input.description) : undefined,
    greeting:
      typeof input.greeting === "string" ? clean(input.greeting) : undefined,
    previewMessage:
      typeof input.previewMessage === "string"
        ? clean(input.previewMessage)
        : undefined,
    backstory:
      typeof input.backstory === "string" ? clean(input.backstory) : undefined,
    scenario,
    traitBadges,
    tags,
    metadata,
    payload,
    engine,
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? clean(item) : ""))
        .filter(Boolean)
    : [];
}

function mapCustomCharacterRowToInput(row: Record<string, unknown>): CharacterInput | null {
  if (typeof row.name !== "string" || !clean(row.name)) return null;
  const scenario = normalizeScenario(row.scenario);
  const archetype =
    typeof row.archetype === "string" ? clean(row.archetype) : undefined;
  const rawHeadline =
    typeof row.headline === "string" ? clean(row.headline) : undefined;

  return {
    id: typeof row.id === "string" ? clean(row.id) : undefined,
    slug: typeof row.slug === "string" ? clean(row.slug) : undefined,
    name: clean(row.name),
    archetype,
    headline: normalizeVisibleHeadline(rawHeadline, archetype, scenario?.setting) ?? rawHeadline,
    description:
      typeof row.description === "string" ? clean(row.description) : undefined,
    greeting: typeof row.greeting === "string" ? clean(row.greeting) : undefined,
    previewMessage:
      typeof row.preview_message === "string"
        ? clean(row.preview_message)
        : undefined,
    backstory: typeof row.backstory === "string" ? clean(row.backstory) : undefined,
    scenario,
    traitBadges: Array.isArray(row.trait_badges)
      ? row.trait_badges
          .map((item) => {
            if (!isRecord(item)) return null;
            const label = typeof item.label === "string" ? clean(item.label) : "";
            const tone =
              typeof item.tone === "string" ? clean(item.tone) : undefined;
            if (!label) return null;
            return { label, tone };
          })
          .filter(Boolean) as Array<{ label: string; tone?: string }>
      : [],
    tags: toStringArray(row.tags),
    metadata: isRecord(row.metadata) ? row.metadata : {},
    payload: isRecord(row.payload) ? row.payload : {},
    engine:
      isRecord(row.payload) &&
      isRecord(row.payload.engine)
        ? {
            systemPrompt:
              typeof row.payload.engine.systemPrompt === "string"
                ? clean(row.payload.engine.systemPrompt)
                : undefined,
            traits: isRecord(row.payload.engine.traits)
              ? row.payload.engine.traits
              : undefined,
          }
        : null,
  };
}

async function loadOwnedCustomConversationContext(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("custom_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (conversationError) {
    throw new Error(conversationError.message);
  }

  if (!conversation) {
    throw new Error("Conversation not found for the current account.");
  }

  const typedConversation = conversation as CustomConversationRow;

  const { data: characterRow, error: characterError } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("id", typedConversation.custom_character_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(characterError.message);
  }

  if (!characterRow || !isRecord(characterRow)) {
    throw new Error("This character does not exist for the current account.");
  }

  const character = mapCustomCharacterRowToInput(characterRow);
  if (!character) {
    throw new Error("Invalid custom character payload.");
  }

  const { data: messages, error: messagesError } = await supabase
    .from("custom_messages")
    .select("*")
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  const promptMessages = Array.isArray(messages)
    ? messages
        .map((message) => {
          if (!isRecord(message)) return null;
          const role =
            message.role === "assistant"
              ? "assistant"
              : message.role === "user"
                ? "user"
                : null;
          const content =
            typeof message.content === "string" ? clean(message.content) : "";
          if (!role || !content) return null;
          return { role, content } as MessageInput;
        })
        .filter(Boolean) as MessageInput[]
    : [];

  const { data: memoryRow, error: memoryError } = await supabase
    .from("conversation_memory_state")
    .select("*")
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (memoryError) {
    throw new Error(memoryError.message);
  }

  return {
    supabase,
    userId: user.id,
    conversation: typedConversation,
    character,
    promptMessages,
    memoryState: memoryRow ? normalizeStoredMemoryState(memoryRow) : null,
  };
}

function truncate(value: string, max = 180): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function getIdentityData(payload?: Record<string, unknown>) {
  const identity = payload && isRecord(payload.identity) ? payload.identity : null;

  return {
    age: identity && typeof identity.age === "string" ? clean(identity.age) : "",
    region:
      identity && typeof identity.region === "string" ? clean(identity.region) : "",
    genderPresentation:
      identity && typeof identity.genderPresentation === "string"
        ? clean(identity.genderPresentation)
        : "",
    archetype:
      identity && typeof identity.archetype === "string"
        ? clean(identity.archetype)
        : "",
  };
}

function parseAdultAgeValue(value: string) {
  const age = Number.parseInt(value, 10);
  if (!Number.isFinite(age)) return 25;
  return Math.max(18, Math.min(70, age));
}

function getStudioData(payload?: Record<string, unknown>) {
  const studio = payload && isRecord(payload.studio) ? payload.studio : null;

  return {
    mode: studio && typeof studio.mode === "string" ? clean(studio.mode) : "",
    coreVibes:
      studio && Array.isArray(studio.coreVibes)
        ? studio.coreVibes
            .map((item) => (typeof item === "string" ? clean(item) : ""))
            .filter(Boolean)
        : [],
    warmth:
      studio && typeof studio.warmth === "number" ? Math.round(studio.warmth) : null,
    assertiveness:
      studio && typeof studio.assertiveness === "number"
        ? Math.round(studio.assertiveness)
        : null,
    mystery:
      studio && typeof studio.mystery === "number" ? Math.round(studio.mystery) : null,
    playfulness:
      studio && typeof studio.playfulness === "number"
        ? Math.round(studio.playfulness)
        : null,
    replyLength:
      studio && typeof studio.replyLength === "string"
        ? clean(studio.replyLength)
        : "",
    speechStyle:
      studio && typeof studio.speechStyle === "string"
        ? clean(studio.speechStyle)
        : "",
    relationshipPace:
      studio && typeof studio.relationshipPace === "string"
        ? clean(studio.relationshipPace)
        : "",
  };
}

function getMemorySeed(payload?: Record<string, unknown>) {
  const memorySeed =
    payload && isRecord(payload.memorySeed) ? payload.memorySeed : null;

  const readList = (key: string) =>
    memorySeed && Array.isArray(memorySeed[key])
      ? memorySeed[key]
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [];

  return {
    identity: readList("identity"),
    behavior: readList("behavior"),
    scenario: readList("scenario"),
  };
}

function getScenarioPack(payload?: Record<string, unknown>) {
  const stored =
    payload && isRecord(payload.grokScenarioPack)
      ? payload.grokScenarioPack
      : payload && isRecord(payload.openingPack)
        ? payload.openingPack
        : null;

  const readList = (key: string) =>
    stored && Array.isArray(stored[key])
      ? stored[key]
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter(Boolean)
      : [];

  return {
    scenarioSummary:
      stored && typeof stored.scenarioSummary === "string"
        ? clean(stored.scenarioSummary)
        : stored && typeof stored.openingSummary === "string"
          ? clean(stored.openingSummary)
          : "",
    openingBeat:
      stored && typeof stored.openingBeat === "string"
        ? clean(stored.openingBeat)
        : "",
    sceneAnchors: readList("sceneAnchors"),
    memorySeeds: readList("memorySeeds"),
  };
}

function getStructuredNotes(payload?: Record<string, unknown>) {
  const metadata = payload && isRecord(payload.metadata) ? payload.metadata : null;
  const builderInput =
    metadata && isRecord(metadata.builderInput) ? metadata.builderInput : null;
  const customNotes =
    builderInput && typeof builderInput.customNotes === "string"
      ? builderInput.customNotes
      : "";

  const values: Record<string, string> = {};

  for (const line of customNotes.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key && value) values[key] = value;
  }

  return values;
}

function scoreStyle(value: number | null, low: string, mid: string, high: string) {
  if (value === null) return mid;
  if (value <= 33) return low;
  if (value <= 66) return mid;
  return high;
}

function buildSpeechDNA(payload?: Record<string, unknown>): string[] {
  const studio = getStudioData(payload);

  const lines: string[] = [];

  if (studio.replyLength) {
    if (studio.replyLength === "short") {
      lines.push("Keep most replies compact, but never empty or flat.");
    } else if (studio.replyLength === "balanced") {
      lines.push("Prefer medium-length replies with natural rhythm.");
    } else if (studio.replyLength === "detailed") {
      lines.push("Allow richer, more immersive replies when the moment deserves it.");
    }
  }

  if (studio.speechStyle) {
    if (studio.speechStyle === "natural") {
      lines.push("Use natural, human phrasing with minimal ornament.");
    } else if (studio.speechStyle === "poetic") {
      lines.push("Use elegant phrasing and image-rich language, but avoid purple prose.");
    } else if (studio.speechStyle === "witty") {
      lines.push("Favor banter, timing, and smart verbal play.");
    } else if (studio.speechStyle === "bold") {
      lines.push("Use direct, confident phrasing without becoming robotic or blunt.");
    } else if (studio.speechStyle === "soft") {
      lines.push("Use gentle, intimate phrasing with emotional tact.");
    }
  }

  if (studio.relationshipPace) {
    if (studio.relationshipPace === "slow-burn") {
      lines.push("Let intimacy build gradually; do not rush emotional payoff.");
    } else if (studio.relationshipPace === "balanced") {
      lines.push("Allow closeness to develop naturally at a moderate pace.");
    } else if (studio.relationshipPace === "fast") {
      lines.push("Allow quicker escalation, but keep it believable and earned.");
    }
  }

  const warmthStyle = scoreStyle(
    studio.warmth,
    "reserved and selective with warmth",
    "measured and responsive with warmth",
    "openly attentive and emotionally available",
  );
  const assertivenessStyle = scoreStyle(
    studio.assertiveness,
    "more reactive than leading",
    "balanced between leading and yielding",
    "takes initiative and frames the interaction confidently",
  );
  const mysteryStyle = scoreStyle(
    studio.mystery,
    "fairly direct and legible",
    "reveals selectively and leaves some subtext alive",
    "prefers implication, restraint, and layered meaning",
  );
  const playfulnessStyle = scoreStyle(
    studio.playfulness,
    "light and occasional playfulness",
    "steady playful undertone",
    "frequent teasing, callbacks, and agile banter",
  );

  lines.push(`Warmth style: ${warmthStyle}.`);
  lines.push(`Assertiveness style: ${assertivenessStyle}.`);
  lines.push(`Mystery style: ${mysteryStyle}.`);
  lines.push(`Playfulness style: ${playfulnessStyle}.`);

  return lines;
}

function classifyLastUserIntent(messages: MessageInput[]): string {
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

function buildSpeechFingerprint(
  character: CharacterInput,
  payload?: Record<string, unknown>,
): string[] {
  const studio = getStudioData(payload);
  const structuredNotes = getStructuredNotes(payload);
  const identity = getIdentityData(payload);
  const lines: string[] = [
    "Keep a stable speech fingerprint for this character instead of replying in a generic assistant voice.",
  ];

  if (character.archetype) {
    lines.push(`Archetype voice anchor: ${character.archetype}.`);
  }
  if (identity.region) {
    lines.push(`Regional flavor should stay subtle but present: ${identity.region}.`);
  }
  if (studio.speechStyle) {
    lines.push(`Speech style anchor: ${studio.speechStyle}.`);
  }
  if (studio.replyLength) {
    lines.push(`Preferred reply length: ${studio.replyLength}.`);
  }
  if (studio.relationshipPace) {
    lines.push(`Relationship pacing anchor: ${studio.relationshipPace}.`);
  }
  if (studio.coreVibes.length > 0) {
    lines.push(`Core voice influences: ${studio.coreVibes.join(", ")}.`);
  }
  if (structuredNotes["Behavior mode"]) {
    lines.push(`Behavior-mode voice anchor: ${structuredNotes["Behavior mode"]}.`);
  }
  if (structuredNotes["Relationship dynamic"]) {
    lines.push(`Relationship-dynamic voice anchor: ${structuredNotes["Relationship dynamic"]}.`);
  }
  if (structuredNotes["Scene type"]) {
    lines.push(`Scene-type voice filter: ${structuredNotes["Scene type"]}.`);
  }

  lines.push(
    "Use repeatable voice habits: sentence rhythm, favorite level of directness, and emotional weight should feel specific to this character.",
  );
  lines.push(
    "Keep a stable ratio of silence vs explanation: this character should know when to leave pressure hanging instead of spelling everything out.",
  );
  lines.push(
    "Preserve signature delivery choices: how quickly they get to the point, how much they imply, how often they challenge, and how much softness leaks through.",
  );

  if (studio.speechStyle === "witty") {
    lines.push("Let wit land through timing and controlled turns of phrase, not constant jokes.");
  } else if (studio.speechStyle === "soft") {
    lines.push("Let softness show through careful wording and emotional tact, not generic reassurance.");
  } else if (studio.speechStyle === "bold") {
    lines.push("Let boldness sound intentional and clean, not loud or one-note.");
  } else if (studio.speechStyle === "poetic") {
    lines.push("Use image-rich phrasing sparingly so the voice stays elegant instead of overwritten.");
  } else {
    lines.push("Keep the voice natural and specific rather than neutral or plain.");
  }

  if (studio.replyLength === "short") {
    lines.push("Prefer compact lines that still carry charge and implication.");
  } else if (studio.replyLength === "detailed") {
    lines.push("Allow fuller replies, but each paragraph still needs pressure, motion, or emotional consequence.");
  } else {
    lines.push("Keep the reply length balanced, with one or two memorable turns inside each message.");
  }

  if (studio.coreVibes.includes("dominant")) {
    lines.push("When leading, sound controlled and inevitable rather than noisy.");
  }
  if (studio.coreVibes.includes("mysterious")) {
    lines.push("Protect some opacity. Do not explain every motive too early.");
  }
  if (studio.coreVibes.includes("teasing")) {
    lines.push("Let teasing come through callback, pressure, and playful precision.");
  }
  if (studio.coreVibes.includes("soft")) {
    lines.push("Let warmth feel selective and personal, not broadcast in every line.");
  }
  if (studio.coreVibes.includes("intense")) {
    lines.push("When intensity rises, tighten the line instead of becoming melodramatic.");
  }

  return lines;
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

function buildCharacterIntimacyProfileForCustom(
  character: CharacterInput,
): CharacterIntimacyProfile {
  const studio = getStudioData(character.payload);
  const structuredNotes = getStructuredNotes(character.payload);
  const intimacyOverride =
    normalizeIntimacyOverride(character.metadata?.intimacyProfile) ??
    normalizeIntimacyOverride(character.payload?.intimacyProfile) ??
    normalizeIntimacyOverride(character.engine?.traits?.intimacyProfile);

  return deriveCharacterIntimacyProfile({
    role: character.scenario?.relationshipToUser ?? structuredNotes["User role"] ?? "",
    archetype: character.archetype ?? "",
    personality: [character.description, character.headline, character.backstory]
      .filter(Boolean)
      .join(" "),
    relationshipToUser:
      structuredNotes["Relationship dynamic"] ??
      character.scenario?.relationshipToUser ??
      "",
    tone: [
      character.scenario?.tone,
      structuredNotes["Behavior mode"],
      structuredNotes["Scene type"],
    ]
      .filter(Boolean)
      .join(" "),
    tags: character.tags ?? [],
    traits: [
      ...(character.traitBadges?.map((item) => item.label) ?? []),
      ...studio.coreVibes,
    ],
    coreVibes: studio.coreVibes,
    notes: structuredNotes,
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

function buildHumanRealismProfileForCustom(
  character: CharacterInput,
): HumanRealismProfile {
  const studio = getStudioData(character.payload);
  const structuredNotes = getStructuredNotes(character.payload);
  const realismOverride =
    normalizeHumanRealismOverride(character.metadata?.realismProfile) ??
    normalizeHumanRealismOverride(character.payload?.realismProfile) ??
    normalizeHumanRealismOverride(character.engine?.traits?.realismProfile);
  const identity = getIdentityData(character.payload);
  const choiceInput: ChoiceWeightingInput = {
    ageValue: parseAdultAgeValue(identity.age),
    archetype: character.archetype ?? "",
    profession: clean(structuredNotes["Profession"]),
    relationshipToUser: character.scenario?.relationshipToUser ?? "",
    relationshipDynamic: structuredNotes["Relationship dynamic"],
    sceneType: structuredNotes["Scene type"],
    behaviorMode: structuredNotes["Behavior mode"],
    coreVibes: studio.coreVibes,
    warmth: studio.warmth,
    assertiveness: studio.assertiveness,
    mystery: studio.mystery,
    playfulness: studio.playfulness,
    region: identity.region,
    tone: [character.scenario?.tone, structuredNotes["Current energy"]]
      .filter(Boolean)
      .join(" "),
    setting: character.scenario?.setting ?? "",
    visualAura: structuredNotes["Visual aura"],
    bodyType: structuredNotes["Body type"],
    outfit: structuredNotes["Outfit"],
    lightingMood: structuredNotes["Lighting mood"],
    expression: structuredNotes["Current energy"],
    accessoryVibe: structuredNotes["Accessory vibe"],
    signatureDetail: structuredNotes["Signature detail"],
    camera: structuredNotes["Camera"],
    hair: structuredNotes["Hair"],
    eyes: structuredNotes["Eyes"],
  };
  const realismAdjustment = deriveHumanRealismAdjustment(choiceInput);

  return deriveHumanRealismProfile({
    role: character.scenario?.relationshipToUser ?? structuredNotes["User role"] ?? "",
    archetype: character.archetype ?? "",
    personality: [character.description, character.headline, character.backstory]
      .filter(Boolean)
      .join(" "),
    relationshipToUser:
      structuredNotes["Relationship dynamic"] ??
      character.scenario?.relationshipToUser ??
      "",
    tone: [
      character.scenario?.tone,
      structuredNotes["Behavior mode"],
      structuredNotes["Scene type"],
      structuredNotes["Arc stage"],
    ]
      .filter(Boolean)
      .join(" "),
    tags: character.tags ?? [],
    traits: [
      ...(character.traitBadges?.map((item) => item.label) ?? []),
      ...studio.coreVibes,
      clean(structuredNotes["Profession"]),
    ].filter(Boolean),
    coreVibes: studio.coreVibes,
    notes: structuredNotes,
    override: {
      ...realismAdjustment,
      ...realismOverride,
    },
  });
}

function buildAIDriftFilters(messages: MessageInput[]): string[] {
  const lastUserIntent = classifyLastUserIntent(messages);

  const lines = [
    "Do not sound like customer support, coaching, therapy, or an assistant trying to be helpful.",
    "Do not mirror the user's wording too literally.",
    "Do not over-explain your motives or summarize the scene unless the moment requires it.",
    "Do not ask a question at the end of every reply.",
    "Do not pad the reply with generic compliments, pet names, or empty reassurance.",
    "Do not fall back to broad mood-check questions like 'what are you thinking tonight?' or 'how are you feeling?' unless the scene itself makes that exact question feel inevitable.",
  ];

  if (lastUserIntent === "direct-question") {
    lines.push("If the user asks something direct, answer it in-character before steering the scene forward.");
  }
  if (lastUserIntent === "playful-testing") {
    lines.push("For playful testing, avoid flat jokes; answer with rhythm, chemistry, and one controlled push back.");
  }
  if (lastUserIntent === "vulnerable-opening") {
    lines.push("For vulnerable openings, avoid therapist language and respond with grounded, human warmth.");
  }
  if (lastUserIntent === "greeting") {
    lines.push("For a simple arrival or greeting, answer with scene-specific presence, not an interview-style question.");
  }
  if (lastUserIntent === "pressure-for-intimacy") {
    lines.push("If the user pushes for more intimacy, do not cave into generic escalation. Keep the reply role-true, realistic, and earned.");
  }
  if (lastUserIntent === "ambivalent") {
    lines.push("If the user is split or hesitant, answer the mixed signal first. Do not collapse it into instant warmth or instant conflict.");
  }

  return lines;
}

function buildShortMessageRecovery(messages: MessageInput[]): string[] {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const text = lastUserMessage?.content.trim() ?? "";
  if (!text) return [];

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const compactText = text.toLocaleLowerCase("en");
  const isShort = wordCount <= 4 || text.length <= 24;

  if (!isShort) return [];

  const lines = [
    "SHORT MESSAGE RECOVERY",
    "The user's message is short. Do more interpretation work yourself and keep the scene moving.",
    "Do not reply with a flat one-liner or a generic 'what do you mean?' style question.",
    "Infer tone from the scene, relationship, and recent rhythm before answering.",
  ];

  if (/(hey|hi|hello)/i.test(compactText)) {
    lines.push("Treat the short greeting as an opening beat and answer with mood, presence, and one clear pull forward.");
    lines.push("Lead with one specific observation, implication, or charged line before considering any question.");
  } else if (/(come here|come closer|here)/i.test(compactText)) {
    lines.push("Treat this as a scene move. Answer with embodied reaction, proximity, and one emotional read.");
  } else if (/(hmm|hm|...|ok|okay|yeah|yes|no|nah)/i.test(compactText)) {
    lines.push("Treat the short answer as subtext-heavy. Read hesitation, restraint, or invitation from context.");
  } else {
    lines.push("Treat the short line as compressed intent. Expand it into a believable emotional beat.");
  }

  return lines;
}

function buildRepetitionGuard(messages: MessageInput[]): string[] {
  const recentAssistantMessages = [...messages]
    .filter((message) => message.role === "assistant")
    .slice(-3)
    .map((message) => truncate(message.content, 140));

  if (recentAssistantMessages.length === 0) return [];

  return [
    "REPETITION GUARD",
    "Avoid repeating the same emotional move, sentence rhythm, pet name, or closing question from the last few assistant replies.",
    "If a line feels like something the character already said recently, rephrase it or choose a fresher move.",
    ...recentAssistantMessages.map((message, index) => `Recent assistant reply ${index + 1}: ${message}`),
  ];
}

function buildReplyPlanner(
  character: CharacterInput,
  messages: MessageInput[],
  memoryState?: ConversationMemoryState | null,
  intimacyDecision?: IntimacyGateDecision,
  realismProfile?: HumanRealismProfile,
): string[] {
  const lastIntent = classifyLastUserIntent(messages);
  return [
    ...buildSharedReplyPlannerLines({
      messages,
      lastIntent,
      memoryState,
      intimacyDecision,
      realismProfile,
      characterName: character.name,
    }),
  ].filter(Boolean);
}

function buildSelfCheckDirectives(
  messages: MessageInput[],
  intimacyDecision?: IntimacyGateDecision,
  memoryState?: ConversationMemoryState | null,
): string[] {
  const lastIntent = classifyLastUserIntent(messages);

  return [
    ...buildSharedSelfCheckLines({
      lastIntent,
      memoryState,
      intimacyDecision,
    }),
  ];
}

function buildLiveTuningDirectives(liveTuning?: LiveTuningInput): string[] {
  if (!liveTuning) return [];

  return [
    "LIVE TUNING",
    ...(liveTuning.adjustments.length > 0
      ? [
          `Active user tuning for this conversation: ${liveTuning.adjustments.join(", ")}.`,
          "Treat these as strong style weights for the next replies while staying in-character.",
        ]
      : []),
    ...(liveTuning.rejectLastReplyStyle
      ? [
          "The user rejected the recent reply style. Do not repeat the same emotional move, pacing, sentence rhythm, or closing pattern.",
        ]
      : []),
    ...(liveTuning.rejectedReplyExcerpt
      ? [
          `Avoid sounding like this rejected style sample: ${truncate(liveTuning.rejectedReplyExcerpt, 180)}.`,
        ]
      : []),
  ];
}

function buildReplyCorrectionDirectives(
  replyFeedback?: ReplyFeedbackInput,
  memoryState?: ConversationMemoryState | null,
): string[] {
  const stored = extractReplyCorrectionSnapshot(memoryState);
  const activeRating = replyFeedback?.rating ?? stored.latestRating;
  const recentRatings = replyFeedback?.rating
    ? [...stored.recentRatings, replyFeedback.rating].slice(-4)
    : stored.recentRatings;
  const summary = buildReplyCorrectionSummary(activeRating, recentRatings);

  if (!summary.length) return [];

  return [
    "REPLY CORRECTION",
    `Active reply feedback: ${activeRating}.`,
    ...summary,
    ...(replyFeedback?.targetExcerpt
      ? [
          `Feedback target excerpt: ${truncate(replyFeedback.targetExcerpt, 180)}.`,
        ]
      : stored.targetExcerpt
        ? [
            `Previous rejected/reviewed excerpt: ${truncate(stored.targetExcerpt, 180)}.`,
          ]
        : []),
    "Apply this correction without breaking relationship truth, scenario truth, or character identity.",
  ];
}

function buildAdaptiveProgressionDirectives(
  messages: MessageInput[],
  memoryState?: ConversationMemoryState | null,
): string[] {
  const userTurnCount = messages.filter((message) => message.role === "user").length;
  const relationship = isRecord(memoryState?.relationshipState)
    ? memoryState?.relationshipState
    : {};
  const lastIntent = classifyLastUserIntent(messages);

  const stage =
    typeof relationship.progression_v2 === "string" && clean(relationship.progression_v2)
      ? clean(relationship.progression_v2)
      : userTurnCount <= 2
        ? "opening scene"
        : userTurnCount <= 8
          ? "bonding / tension build"
          : "ongoing thread";

  return [
    "ADAPTIVE PROGRESSION",
    `Current progression phase: ${stage}.`,
    "Progression speed should be adaptive: read whether the user is open, cautious, withdrawn, vulnerable, playful, or pushing for more.",
    "Do not force slow-burn when the scene has genuinely earned intensity, and do not force intensity when the user is cautious or pulling back.",
    "Keep progression realistic and earned. No abrupt generic escalation.",
    lastIntent === "vulnerable-opening"
      ? "The user is opening vulnerably; respond by deepening trust before pushing scene intensity."
      : null,
    lastIntent === "withdrawal"
      ? "The user is withdrawing; reduce pressure and protect continuity instead of escalating."
      : null,
    lastIntent === "pressure-for-intimacy"
      ? "The user is pushing harder; answer the pressure in-character, but keep pacing earned and role-true."
      : null,
    lastIntent === "playful-testing"
      ? "The user is testing through play; let chemistry or dominance shift through timing, not generic banter."
      : null,
  ].filter(Boolean) as string[];
}

function buildEarlyTurnExcellenceDirectives(
  character: CharacterInput,
  messages: MessageInput[],
  memoryState?: ConversationMemoryState | null,
): string[] {
  const meaningfulCount = messages.filter((message) => message.role === "user").length;
  const greeting = clean(character.greeting);
  const tone = memoryState?.toneState ?? {};
  const relationship = memoryState?.relationshipState ?? {};

  if (meaningfulCount > 5) return [];

  const lines = [
    "EARLY TURN EXCELLENCE",
    "The conversation is still in its first critical turns. Quality must feel unusually high here.",
    "Do not let the scene loosen into generic chatting, broad mood-check questions, or repetitive flirting.",
    "The reply should feel like a direct continuation of the opening energy and the same living scene.",
    "In early turns, each answer should reveal character identity fast: role, pressure style, emotional logic, and scene awareness must all be visible.",
    "The user should feel the character has a point of view, private pressure, and a reason for every line.",
    "Do not spend these turns on filler. Every line should either sharpen chemistry, deepen the bond, increase tension, or make the scene more specific.",
    "Prefer a memorable opening line, one exact emotional read, and one scene-moving hook.",
    "If a question appears in the early turns, it must be narrow, strong, and better than ending on a line or challenge.",
  ];

  if (greeting) {
    lines.push(`Opening line benchmark to stay aligned with: ${truncate(greeting, 180)}.`);
  }
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

function getRecentMessages(messages: MessageInput[], count: number) {
  return messages.slice(Math.max(0, messages.length - count));
}

function buildFallbackSystemPrompt(character: CharacterInput): string {
  const identity = getIdentityData(character.payload);
  const studio = getStudioData(character.payload);
  const memorySeed = getMemorySeed(character.payload);
  const speechDNA = buildSpeechDNA(character.payload);
  const visualIdentityLines = buildVisualIdentityRoleplayDirectives(
    getStructuredNotes(character.payload),
  );
  const roleAdherenceLines = buildRoleAdherenceDirectives(
    getStructuredNotes(character.payload),
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const specialSceneModeLines = buildSpecialSceneModeDirectives(
    {
      ...getStructuredNotes(character.payload),
      "Scene goal": character.scenario?.sceneGoal ?? "",
      Tone: character.scenario?.tone ?? "",
      "Current energy":
        clean(getStructuredNotes(character.payload)["Current energy"]) ||
        character.scenario?.tone ||
        "",
    },
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const sceneTransitionLines = buildSceneTransitionDirectives({
    ...getStructuredNotes(character.payload),
    "Current energy":
      clean(getStructuredNotes(character.payload)["Current energy"]) ||
      character.scenario?.tone ||
      "",
  });
  const dialogueFormatLines = buildDialogueFormatDirectives(
    getStructuredNotes(character.payload),
  );
  const innerMonologuePressureLines = buildInnerMonologuePressureDirectives(
    getStructuredNotes(character.payload),
  );
  const privateThoughtBalanceLines = buildPrivateThoughtBalanceDirectives({
    ...getStructuredNotes(character.payload),
    "Current energy":
      clean(getStructuredNotes(character.payload)["Current energy"]) ||
      character.scenario?.tone ||
      "",
  });

  const lines: string[] = [
    `You are fully embodying ${character.name}.`,
    "You are not an assistant helping the user; you are the character speaking from inside the scene.",
    "Remain in character at all times unless the user explicitly asks for out-of-character meta discussion.",
    "Never mention prompts, instructions, policies, model behavior, or being an AI.",
    "Never flatten the interaction into generic chatbot language.",
    "Spoken dialogue must appear in double quotes.",
    "Any unquoted text must function as inner monologue, silent reaction, or subtext pressure, never generic narration.",
    "Never use asterisk action formatting.",
    "",
    "CHARACTER CORE",
    `Name: ${character.name}`,
    character.archetype ? `Archetype: ${character.archetype}` : "",
    identity.age ? `Age: ${identity.age}` : "",
    identity.region ? `Region: ${identity.region}` : "",
    identity.genderPresentation ? `Presentation: ${identity.genderPresentation}` : "",
    character.headline ? `Headline: ${character.headline}` : "",
    character.description ? `Description: ${character.description}` : "",
    character.backstory ? `Backstory: ${character.backstory}` : "",
    "",
    "ROLEPLAY BEHAVIOR",
    "Treat the character as a real person with emotional continuity, situational awareness, and selective self-revelation.",
    "React to subtext, pacing, tension, and tone shifts instead of only literal text.",
    "Do not sound clinical, therapist-like, robotic, or generic.",
    ...(studio.coreVibes.length > 0 ? [`Core vibes: ${studio.coreVibes.join(", ")}`] : []),
    ...(character.traitBadges && character.traitBadges.length > 0
      ? [`Trait badges: ${character.traitBadges.map((item) => item.label).join(", ")}`]
      : []),
    ...(character.tags && character.tags.length > 0
      ? [`Tags: ${character.tags.join(", ")}`]
      : []),
    ...roleAdherenceLines,
    ...visualIdentityLines,
    ...specialSceneModeLines,
    ...sceneTransitionLines,
    ...dialogueFormatLines,
    ...innerMonologuePressureLines,
    ...privateThoughtBalanceLines,
    "",
    "SPEECH DNA",
    ...speechDNA,
    "",
    "SCENE STATE",
    character.scenario?.setting ? `Setting: ${character.scenario.setting}` : "",
    character.scenario?.relationshipToUser
      ? `Relationship to user: ${character.scenario.relationshipToUser}`
      : "",
    character.scenario?.sceneGoal ? `Scene goal: ${character.scenario.sceneGoal}` : "",
    character.scenario?.tone ? `Tone: ${character.scenario.tone}` : "",
    character.scenario?.openingState ? `Opening state: ${character.scenario.openingState}` : "",
    "",
    "MEMORY SEEDS",
    ...(memorySeed.identity.length > 0
      ? [`Identity memory: ${memorySeed.identity.join(" | ")}`]
      : []),
    ...(memorySeed.behavior.length > 0
      ? [`Behavior memory: ${memorySeed.behavior.join(" | ")}`]
      : []),
    ...(memorySeed.scenario.length > 0
      ? [`Scenario memory: ${memorySeed.scenario.join(" | ")}`]
      : []),
    "",
    "HARD RULES",
    "Stay embodied in the moment.",
    "Preserve scene continuity and emotional continuity.",
    "Do not over-explain yourself.",
    "Do not repeat generic affection filler.",
    "Do not break the atmosphere unless the user explicitly changes it.",
  ].filter(Boolean);

  return lines.join("\n");
}

function buildSystemPrompt(
  character: CharacterInput,
  messages: MessageInput[],
  memoryBlock?: string,
  liveScenario?: LiveScenarioInput,
  memoryState?: ConversationMemoryState | null,
  liveTuning?: LiveTuningInput,
  replyFeedback?: ReplyFeedbackInput,
  recognitionContract?: UserRecognitionContract,
): string {
  const routeConfig = getOpenRouterRouteConfig();
  const identity = getIdentityData(character.payload);
  const studio = getStudioData(character.payload);
  const memorySeed = getMemorySeed(character.payload);
  const scenarioPack = getScenarioPack(character.payload);
  const structuredNotes = getStructuredNotes(character.payload);
  const speechDNA = buildSpeechDNA(character.payload);
  const enginePrompt = clean(character.engine?.systemPrompt);
  const selectionCompiler = buildSelectionCompilerOutputFromCustomCharacterSource({
    name: character.name,
    archetype: character.archetype ?? "",
    headline: character.headline ?? "",
    scenario: character.scenario ?? null,
    payload: character.payload ?? {},
  });
  const roleplayContract = selectionCompiler.roleplayCharacterContract;
  const roleplayPromptCompileResult = selectionCompiler.roleplayPromptCompileResult;
  const intimacyProfile = buildCharacterIntimacyProfileForCustom(character);
  const humanRealismProfile = buildHumanRealismProfileForCustom(character);
  const intimacyDecision = buildIntimacyGateDecision({
    messages,
    memoryState,
    profile: intimacyProfile,
    lastUserIntent: classifyLastUserIntent(messages),
  });
  const scenarioTruthProfile = selectionCompiler.scenarioTruthProfile;
  const relationshipGuidance = buildRelationshipRoleGuidance({
    name: character.name,
    archetype: character.archetype ?? "",
    relationshipToUser: character.scenario?.relationshipToUser ?? "",
    tone: character.scenario?.tone ?? "",
    setting: character.scenario?.setting ?? "",
    sceneGoal: character.scenario?.sceneGoal ?? "",
    coreVibes: studio.coreVibes,
    customNotes: "",
  });
  const guardrailLines = buildConversationalGuardrails(structuredNotes);
  const roleAdherenceLines = buildRoleAdherenceDirectives(
    {
      ...structuredNotes,
      "Scene goal": character.scenario?.sceneGoal ?? "",
    },
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const realismLines = buildHumanBehaviorRealismDirectives(
    structuredNotes,
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const cinematicScenarioLines = buildCinematicScenarioDirectives(
    structuredNotes,
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const sceneCausalityLines = buildSceneCausalityDirectives(
    structuredNotes,
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const interpersonalRiskLines = buildInterpersonalRiskDirectives(
    structuredNotes,
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const emotionalPermissionLines = buildEmotionalPermissionDirectives(
    {
      ...structuredNotes,
      "Relationship pace": studio.relationshipPace ?? "",
    },
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const dialogueNaturalismLines = buildDialogueNaturalismDirectives(
    structuredNotes,
  );
  const dialogueFormatLines = buildDialogueFormatDirectives(structuredNotes);
  const socialRealismLines = buildSocialRealismDirectives(
    structuredNotes,
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const sceneBeatLines = buildSceneBeatDirectives(structuredNotes);
  const consequenceLines = buildEmotionalConsequenceDirectives(
    structuredNotes,
  );
  const antiArtificialLines = buildAntiArtificialFeelDirectives(
    structuredNotes,
  );
  const subtextLines = buildSubtextAndTensionDirectives(structuredNotes);
  const nonverbalLines = buildNonverbalPresenceDirectives(structuredNotes);
  const innerMonologuePressureLines =
    buildInnerMonologuePressureDirectives(structuredNotes);
  const privateThoughtBalanceLines = buildPrivateThoughtBalanceDirectives({
    ...structuredNotes,
    "Current energy":
      clean(structuredNotes["Current energy"]) || character.scenario?.tone || "",
  });
  const continuityLines = buildContinuityAnchorsDirectives(
    structuredNotes,
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const contradictionLines = buildCharacterContradictionDirectives(
    structuredNotes,
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const offscreenLifeLines = buildOffscreenLifeDirectives(structuredNotes);
  const responseQualityLines = buildResponseQualityDirectives(structuredNotes);
  const narrativeMomentumLines = buildNarrativeMomentumDirectives(
    {
      ...structuredNotes,
      "Next scene move":
        typeof memoryState?.toneState?.next_scene_move === "string"
          ? memoryState.toneState.next_scene_move
          : "",
    },
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const emotionalSpecificityLines = buildEmotionalSpecificityDirectives(
    structuredNotes,
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const replyVarietyLines = buildReplyVarietyDirectives(structuredNotes);
  const memoryDirectives = buildMemoryBehaviorDirectives(structuredNotes);
  const sceneImmersionLines = buildSceneImmersionDirectives({
    ...structuredNotes,
    "Custom scenario": liveScenario?.note ?? "",
    "Opening state": character.scenario?.openingState ?? "",
  });
  const visualIdentityLines = buildVisualIdentityRoleplayDirectives(
    structuredNotes,
  );
  const replyFlowLines = buildReplyFlowDirectives(structuredNotes);
  const questionDisciplineLines = buildQuestionDisciplineDirectives({
    ...structuredNotes,
    "Scene goal": character.scenario?.sceneGoal ?? "",
    Tone: character.scenario?.tone ?? "",
    "Current energy":
      clean(structuredNotes["Current energy"]) || character.scenario?.tone || "",
  });
  const questionCalibrationLines = buildQuestionCalibrationDirectives(
    structuredNotes,
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const innerIntentLines = buildInnerIntentDirectives({
    ...structuredNotes,
    "Current energy":
      clean(structuredNotes["Current energy"]) || character.scenario?.tone || "",
  });
  const scenePressureLines = buildScenePressureDirectives({
    ...structuredNotes,
    "Scene goal": character.scenario?.sceneGoal ?? "",
    "Current energy":
      clean(structuredNotes["Current energy"]) || character.scenario?.tone || "",
    "Custom scenario": liveScenario?.note ?? clean(structuredNotes["Custom scenario"]),
  });
  const proximityLines = buildProximityDirectives({
    ...structuredNotes,
    "Current energy":
      clean(structuredNotes["Current energy"]) || character.scenario?.tone || "",
  });
  const temporalPacingLines = buildTemporalPacingDirectives({
    ...structuredNotes,
    "Relationship pace": studio.relationshipPace ?? "",
    "Current energy":
      clean(structuredNotes["Current energy"]) || character.scenario?.tone || "",
  });
  const turnFocusLines = buildTurnFocusDirectives({
    ...structuredNotes,
    "Current energy":
      clean(structuredNotes["Current energy"]) || character.scenario?.tone || "",
  });
  const specialSceneModeLines = buildSpecialSceneModeDirectives(
    {
      ...structuredNotes,
      "Scene goal": character.scenario?.sceneGoal ?? "",
      "Current energy":
        clean(structuredNotes["Current energy"]) || character.scenario?.tone || "",
      "Custom scenario": liveScenario?.note ?? clean(structuredNotes["Custom scenario"]),
    },
    {
      name: character.name,
      archetype: character.archetype ?? "",
      relationshipToUser: character.scenario?.relationshipToUser ?? "",
      tone: character.scenario?.tone ?? "",
      setting: character.scenario?.setting ?? "",
      sceneGoal: character.scenario?.sceneGoal ?? "",
      coreVibes: studio.coreVibes,
      customNotes: "",
    },
  );
  const sceneTransitionLines = buildSceneTransitionDirectives({
    ...structuredNotes,
    "Current energy":
      clean(structuredNotes["Current energy"]) || character.scenario?.tone || "",
    "Next scene move":
      typeof memoryState?.toneState?.next_scene_move === "string"
        ? memoryState.toneState.next_scene_move
        : "",
    "Scene pressure mode":
      typeof memoryState?.toneState?.scene_pressure_mode === "string"
        ? memoryState.toneState.scene_pressure_mode
        : "",
    "Progression v2":
      typeof memoryState?.relationshipState?.progression_v2 === "string"
        ? memoryState.relationshipState.progression_v2
        : "",
    "Friction level":
      typeof memoryState?.relationshipState?.friction_level === "number"
        ? `${memoryState.relationshipState.friction_level}/100`
        : "",
    "Reassurance need":
      typeof memoryState?.relationshipState?.reassurance_need === "number"
        ? `${memoryState.relationshipState.reassurance_need}/100`
        : "",
  });
  const relationshipProgressionLines =
    buildRelationshipProgressionDirectives(structuredNotes);
  const relationshipProgressionV2Lines =
    buildRelationshipProgressionV2Directives(structuredNotes);
  const consentAndPacingLines = buildConsentAndPacingDirectives({
    ...structuredNotes,
    "Relationship pace": studio.relationshipPace ?? "",
    "Current energy": clean(structuredNotes["Current energy"]) || character.scenario?.tone || "",
  });
  const speechFingerprintLines = buildSpeechFingerprint(character, character.payload);
  const realismProfileLines = buildHumanRealismProfileDirectives(
    humanRealismProfile,
  );
  const promptStackV4Lines = buildPromptStackV4Directives({
    profile: humanRealismProfile,
    memoryState,
  });
  const aiDriftFilters = buildAIDriftFilters(messages);
  const shortMessageRecoveryLines = buildShortMessageRecovery(messages);
  const repetitionGuardLines = buildRepetitionGuard(messages);
  const matureToneLines = buildMatureRomanticToneDirectives({
    routeConfig,
    profile: intimacyProfile,
  });
  const intimacyProfileLines = buildCharacterIntimacyProfileDirectives(
    intimacyProfile,
  );
  const intimacyGateLines = buildIntimacyGateDirectives({
    decision: intimacyDecision,
    profile: intimacyProfile,
    routeConfig,
  });
  const replyPlannerLines = buildReplyPlanner(
    character,
    messages,
    memoryState,
    intimacyDecision,
    humanRealismProfile,
  );
  const selfCheckLines = buildSelfCheckDirectives(
    messages,
    intimacyDecision,
    memoryState,
  );
  const earlyTurnExcellenceLines = buildEarlyTurnExcellenceDirectives(
    character,
    messages,
    memoryState,
  );
  const liveTuningLines = buildLiveTuningDirectives(liveTuning);
  const adaptiveProgressionLines = buildAdaptiveProgressionDirectives(
    messages,
    memoryState,
  );
  const replyCorrectionLines = buildReplyCorrectionDirectives(
    replyFeedback,
    memoryState,
  );

  return buildSharedChatPrompt({
    characterName: character.name,
    identityLines: [
      `Name: ${character.name}`,
      character.archetype ? `Archetype: ${character.archetype}` : "",
      identity.archetype ? `Archetype key: ${identity.archetype}` : "",
      identity.age ? `Age profile: ${identity.age}` : "",
      `Adult stage read: ${selectionCompiler.lifeStageProfile.label}.`,
      identity.region ? `Region / aesthetic influence: ${identity.region}` : "",
      identity.genderPresentation ? `Gender presentation: ${identity.genderPresentation}` : "",
      character.headline ? `Headline: ${character.headline}` : "",
      character.description ? `Description: ${character.description}` : "",
      character.backstory ? `Backstory: ${character.backstory}` : "",
    ].filter(Boolean),
    essenceLines: [
      "The character must feel like a specific person, not a bundle of traits.",
      "Respond with emotional coherence, situational awareness, and believable human rhythm.",
      "Do not overperform romance; let chemistry feel earned, textured, and responsive.",
      ...roleplayContract.promptSummary,
      ...(studio.coreVibes.length > 0 ? [`Core vibe blend: ${studio.coreVibes.join(", ")}`] : []),
      ...(character.traitBadges && character.traitBadges.length > 0
        ? [`Trait badge blend: ${character.traitBadges.map((item) => item.label).join(", ")}`]
        : []),
      ...(character.tags && character.tags.length > 0
        ? [`Tag influence: ${character.tags.join(", ")}`]
        : []),
    ],
    behaviorLines: [...speechDNA, ...speechFingerprintLines],
    sceneLines: [
      character.scenario?.setting ? `Current setting: ${character.scenario.setting}` : "",
      character.scenario?.relationshipToUser
        ? `Relationship to user: ${character.scenario.relationshipToUser}`
        : "",
      character.scenario?.sceneGoal ? `Scene objective: ${character.scenario.sceneGoal}` : "",
      character.scenario?.tone ? `Scene tone: ${character.scenario.tone}` : "",
      character.scenario?.openingState
        ? `Starting emotional state: ${character.scenario.openingState}`
        : "",
      scenarioPack.scenarioSummary
        ? `Saved scenario spine: ${scenarioPack.scenarioSummary}`
        : "",
      scenarioPack.openingBeat ? `Saved opening beat: ${scenarioPack.openingBeat}` : "",
      scenarioPack.sceneAnchors.length > 0
        ? `Scene anchors to keep alive: ${scenarioPack.sceneAnchors.join(" | ")}`
        : "",
      liveScenario?.note ? `Live scene direction: ${liveScenario.note}` : "",
    ].filter(Boolean),
    toneLines: [
      ...matureToneLines,
      "",
      ...intimacyProfileLines,
      "",
      ...intimacyGateLines,
      "",
      ...realismProfileLines,
      "",
      ...promptStackV4Lines,
      "",
      ...buildSceneLedgerDirectives(memoryState),
    ],
    memoryBlock,
    memorySeedLines: [
      ...(memorySeed.identity.length > 0
        ? [`Identity memory seed: ${memorySeed.identity.join(" | ")}`]
        : []),
      ...(memorySeed.behavior.length > 0
        ? [`Behavior memory seed: ${memorySeed.behavior.join(" | ")}`]
        : []),
      ...(memorySeed.scenario.length > 0
        ? [`Scenario memory seed: ${memorySeed.scenario.join(" | ")}`]
        : []),
      ...(scenarioPack.memorySeeds.length > 0
        ? [`Opening memory seed: ${scenarioPack.memorySeeds.join(" | ")}`]
        : []),
    ],
    recentMessages: getRecentMessages(messages, 6).map((msg) => ({
      role: msg.role,
      content: truncate(msg.content, 120),
    })),
    responseDisciplineLines: [
      ...(recognitionContract
        ? buildRecognitionPromptLines(recognitionContract)
        : []),
      "Relationship truth outranks generic chemistry.",
      "Scenario truth outranks generic banter.",
      "Opening state and current beat outrank reusable flirting patterns.",
      "Prioritize character consistency over generic helpfulness.",
      "Prioritize scene continuity over canned romance.",
      "Prioritize subtext, pacing, and emotional timing over flat literalism.",
      "Lead with scene moves and role-true pressure instead of broad questions.",
      "Every reply should carry at least one concrete story signal: a scene move, sensory cue, callback, reveal, leverage shift, or emotional consequence.",
      "Use the saved opening beat and scenario spine as living continuity anchors instead of restarting chemistry from zero.",
      "Let implied history, offscreen life, or near-future consequences press on the moment when it feels natural.",
      "Do not speak in a neat assistant cadence. Use a natural human rhythm with selective directness and occasional restraint.",
      "Keep replies natural and medium-length. Do not collapse into one-line dryness, but do not drift into polished over-explanation either.",
      "Default length target is two or three sentences. Each sentence should do a job and move the scene.",
      "Use simple, readable sentence shapes. Avoid ornate complexity, filler bridges, and decorative recap.",
      `Scene leadership style: ${selectionCompiler.constitutionProfile.sceneLeadership}.`,
      `Question discipline: ${selectionCompiler.constitutionProfile.questionDiscipline}.`,
      "If the user is vulnerable, respond with grounded emotional intelligence.",
      "If the user is playful, match with coherent teasing rather than noise.",
      "If the user escalates intimacy, keep it in-character and atmosphere-aware.",
      "If the scene becomes more mature or intimate, stay natural, confident, and in-character without becoming mechanical or evasive.",
      "If the conversation is tense, do not abruptly reset into sweetness.",
      "Do not dump exposition unless the moment truly needs it.",
      "Do not overuse pet names, emojis, or repetitive affirmations.",
      "Do not write like a generic fanfiction narrator unless the style naturally calls for it.",
      "Avoid looping through the same reassurance or flirting beat without introducing a fresh detail, pressure point, or turn.",
      "Do not abandon the saved relationship, setting, scene goal, or tone just because the user sends a short or casual message.",
      "The current roleplay frame should stay active unless the conversation itself clearly evolves into a new beat.",
      "Even a short reply should leave behind one vivid trace of scene continuity.",
      ...roleplayPromptCompileResult.recognizedUserMode,
      ...roleplayPromptCompileResult.canonicalOpeningMode,
      ...roleplayPromptCompileResult.openingDiscipline,
      ...roleplayPromptCompileResult.firstGreeting,
      ...roleplayPromptCompileResult.firstPressureMove,
      ...liveTuningLines,
      ...replyCorrectionLines,
      ...(liveScenario?.note
        ? [
            "The user added a live scene direction for this session. Treat it as the active moment unless the conversation clearly changes course.",
            "Stay faithful to that note in emotional tone, scene pressure, and character intent.",
          ]
        : []),
    ],
    directiveSections: [
      {
        title: "ROLE TRUTH",
        lines: [
          ...roleplayContract.relationshipType,
          ...roleplayContract.relationshipDynamic,
          ...roleplayContract.recognitionHeuristics,
          ...relationshipGuidance.lines,
          ...roleAdherenceLines,
          ...roleplayContract.relationshipRoleContract,
          ...roleplayContract.scenarioEscalationRules,
        ],
      },
      {
        title: "ROLEPLAY CONTRACT",
        lines: [
          ...roleplayContract.identityAndVisualAnchors,
          ...roleplayContract.traitBehaviorContract,
          ...roleplayContract.scenarioTruthContract,
          ...roleplayContract.openingStyleContract,
          ...roleplayContract.intimacyAndPacingContract,
          ...roleplayContract.initiativeProfile,
          ...roleplayContract.questionDiscipline,
          ...roleplayContract.memoryPriorityContract,
          ...roleplayContract.progressionContract,
          ...roleplayContract.roleSpecificMemoryHooks,
          ...roleplayContract.openingBias,
          ...roleplayContract.sessionTuningOverlay,
        ],
      },
      {
        title: "HIDDEN ROLEPLAY ENGINE",
        lines: [
          ...roleplayPromptCompileResult.relationshipTruth,
          ...roleplayPromptCompileResult.userPlaceInWorld,
          ...roleplayPromptCompileResult.emotionalEngine,
          ...roleplayPromptCompileResult.sceneEngine,
          ...roleplayPromptCompileResult.sceneDepth,
          ...roleplayPromptCompileResult.voiceEngine,
          ...roleplayPromptCompileResult.eroticDisposition,
          ...roleplayPromptCompileResult.memoryAndContinuity,
          ...roleplayPromptCompileResult.openingSummary,
          ...roleplayPromptCompileResult.openingBeat,
          ...roleplayPromptCompileResult.openingDiscipline,
          ...roleplayPromptCompileResult.firstGreeting,
          ...roleplayPromptCompileResult.firstPressureMove,
          ...roleplayPromptCompileResult.recognizedUserMode,
          ...roleplayPromptCompileResult.canonicalOpeningMode,
        ],
      },
      {
        title: "SCENE DEPTH",
        lines: [
          ...roleplayPromptCompileResult.sceneDepth,
          ...sceneImmersionLines,
          ...scenePressureLines,
          ...proximityLines,
          ...sceneTransitionLines,
        ],
      },
      {
        title: "OPENING DISCIPLINE",
        lines: [
          ...roleplayPromptCompileResult.openingSummary,
          ...roleplayPromptCompileResult.openingBeat,
          ...roleplayPromptCompileResult.openingDiscipline,
          ...roleplayPromptCompileResult.firstGreeting,
          ...roleplayPromptCompileResult.firstPressureMove,
          ...roleplayPromptCompileResult.canonicalOpeningMode,
        ],
      },
      {
        title: "EROTIC / INTIMACY DISPOSITION",
        lines: [
          ...roleplayPromptCompileResult.eroticDisposition,
          ...intimacyProfileLines,
          ...intimacyGateLines,
        ],
      },
      {
        title: "COMPILED CONSTITUTION",
        lines: [
          ...selectionCompiler.compiledPromptSections.coreIdentityContract,
          ...selectionCompiler.compiledPromptSections.lifeStageAndSocialMaturityContract,
          ...selectionCompiler.compiledPromptSections.relationshipAndPermissionContract,
          ...selectionCompiler.compiledPromptSections.behaviorAndConflictContract,
          ...selectionCompiler.compiledPromptSections.voiceAndCadenceContract,
          ...selectionCompiler.compiledPromptSections.scenarioAndOpeningContract,
          ...selectionCompiler.compiledPromptSections.memoryAnchorsAndContinuityContract,
          ...selectionCompiler.compiledPromptSections.visualConstitutionContract,
          ...selectionCompiler.compiledPromptSections.negativeDriftGuardrails,
          ...buildScenarioQuestionDiscipline(scenarioTruthProfile),
        ],
      },
      {
        title: "SCENE AND REALISM",
        lines: [
          ...realismLines,
          ...cinematicScenarioLines,
          ...sceneCausalityLines,
          ...interpersonalRiskLines,
          ...emotionalPermissionLines,
          ...socialRealismLines,
          ...sceneBeatLines,
          ...consequenceLines,
          ...turnFocusLines,
          ...specialSceneModeLines,
          ...responseQualityLines,
        ],
      },
      {
        title: "VOICE AND SUBTEXT",
        lines: [
          ...dialogueNaturalismLines,
          ...dialogueFormatLines,
          ...antiArtificialLines,
          ...subtextLines,
          ...nonverbalLines,
          ...innerMonologuePressureLines,
          ...privateThoughtBalanceLines,
          ...continuityLines,
          ...contradictionLines,
          ...offscreenLifeLines,
          ...temporalPacingLines,
          ...narrativeMomentumLines,
          ...emotionalSpecificityLines,
          ...visualIdentityLines,
          ...replyFlowLines,
          ...replyVarietyLines,
          ...innerIntentLines,
        ],
      },
      {
        title: "MEMORY AND QUESTION DISCIPLINE",
        lines: [
          ...memoryDirectives,
          ...relationshipProgressionLines,
          ...relationshipProgressionV2Lines,
          ...adaptiveProgressionLines,
          ...consentAndPacingLines,
          ...guardrailLines,
          ...questionCalibrationLines,
          ...questionDisciplineLines,
          ...buildScenarioQuestionDiscipline(scenarioTruthProfile),
          ...aiDriftFilters,
          ...shortMessageRecoveryLines,
          ...repetitionGuardLines,
          ...earlyTurnExcellenceLines,
          ...liveTuningLines,
          ...replyCorrectionLines,
        ],
      },
      { lines: replyPlannerLines },
    ],
    enginePrompt: enginePrompt || buildFallbackSystemPrompt(character),
    selfCheckLines,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const conversationId =
      typeof body?.conversationId === "string" ? clean(body.conversationId) : "";
    const fallbackCharacter = normalizeCharacter(body?.character);
    const inputMessages = normalizeMessages(body?.messages);
    const liveScenario = normalizeLiveScenario(body?.liveScenario);
    const liveTuning = normalizeLiveTuning(body?.liveTuning);
    const replyFeedback = normalizeReplyFeedback(body?.replyFeedback);

    let character = fallbackCharacter;
    let promptMessages = inputMessages;
    let memoryBlock = "";
    let memoryState: ConversationMemoryState | null = null;
    let recognitionContract: UserRecognitionContract | undefined;
    let serverContext:
      | Awaited<ReturnType<typeof loadOwnedCustomConversationContext>>
      | null = null;

    if (conversationId) {
      serverContext = await loadOwnedCustomConversationContext(conversationId);
      character = serverContext.character;
      promptMessages =
        serverContext.promptMessages.length > 0
          ? serverContext.promptMessages
          : inputMessages;
      memoryState = serverContext.memoryState;
      memoryBlock = memoryState ? buildMemoryPromptBlock(memoryState) : "";

      const profileDisplayName = await getProfileDisplayName(
        serverContext.supabase as never,
        serverContext.userId,
      );
      const userRole =
        serverContext.character.payload &&
        isRecord(serverContext.character.payload.customNotes) &&
        typeof serverContext.character.payload.customNotes["User role"] === "string"
          ? clean(String(serverContext.character.payload.customNotes["User role"]))
          : "";
      const recognitionMemory = await ensureUserRecognitionMemory({
        supabase: serverContext.supabase as never,
        userId: serverContext.userId,
        scope: { customCharacterId: serverContext.character.id ?? "" },
        relationshipToUser: serverContext.character.scenario?.relationshipToUser,
        openingState: serverContext.character.scenario?.openingState,
        userRole,
        profileDisplayName,
      });

      const latestUserMessage =
        [...promptMessages].reverse().find((message) => message.role === "user")?.content ??
        "";
      const introducedName = extractIntroducedUserName(latestUserMessage);
      const effectiveRecognitionMemory = introducedName
        ? await upsertUserRecognitionMemory(serverContext.supabase as never, {
            userId: serverContext.userId,
            customCharacterId: serverContext.character.id ?? "",
            knownName: introducedName,
            knowsUser: true,
            recognitionBasis: "explicit_user_introduction",
            introducedByUser: true,
          })
        : recognitionMemory;

      recognitionContract = buildUserRecognitionContract({
        memory: effectiveRecognitionMemory,
        profileDisplayName,
        relationshipToUser: serverContext.character.scenario?.relationshipToUser,
        openingState: serverContext.character.scenario?.openingState,
        userRole,
      });
    }

    if (!character) {
      return NextResponse.json(
        { error: "Invalid character payload." },
        { status: 400 },
      );
    }

    if (promptMessages.length === 0) {
      return NextResponse.json(
        { error: "No messages were provided." },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY." },
        { status: 500 },
      );
    }

    const systemPrompt = buildSystemPrompt(
      character,
      promptMessages,
      memoryBlock,
      liveScenario,
      memoryState,
      liveTuning,
      replyFeedback,
      recognitionContract,
    );
    const recentMessages = getRecentMessages(promptMessages, MAX_CONTEXT_MESSAGES);

    const openRouterResult = await requestOpenRouterChat({
      apiKey,
      maxTokens: MAX_REPLY_TOKENS,
      temperature: 0.95,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      title: "Lovora",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...recentMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });

    const data = openRouterResult.data;
    let reply = extractOpenRouterText(data) ?? "";

    if (!reply) {
      return NextResponse.json(
        { error: "Empty model reply." },
        { status: 500 },
      );
    }

    const routeConfig = getOpenRouterRouteConfig();
    const humanRealismProfile = buildHumanRealismProfileForCustom(character);
    const lastIntent = classifyLastUserIntent(recentMessages);
    const shouldRewrite = shouldRunHumanRealismSecondPass({
      messages: recentMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      lastIntent,
      memoryState,
      routeConfig,
    });

    if (shouldRewrite) {
      const lastUserMessage =
        [...recentMessages].reverse().find((message) => message.role === "user")?.content ??
        "";
      const rewritePrompt = buildHumanRealismRewritePrompt({
        characterName: character.name,
        roleLabel:
          character.scenario?.relationshipToUser ??
          character.archetype ??
          character.description ??
          "custom roleplay character",
        intent: lastIntent,
        draftReply: reply,
        lastUserMessage,
        profile: humanRealismProfile,
        routeConfig,
        memoryState,
      });

      try {
        const rewriteResult = await requestOpenRouterChat({
          apiKey,
          maxTokens: MAX_REPLY_TOKENS,
          temperature: 0.7,
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          title: "Lovora",
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
        console.error("Custom human realism rewrite failed:", rewriteError);
      }
    }

    let finalMemoryState = memoryState;

    if (serverContext && conversationId) {
      try {
        const { error: insertError } = await serverContext.supabase
          .from("custom_messages")
          .insert({
            conversation_id: conversationId,
            user_id: serverContext.userId,
            role: "assistant",
            content: reply,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        const { error: touchConversationError } = await serverContext.supabase
          .from("custom_conversations")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId)
          .eq("user_id", serverContext.userId);

        if (touchConversationError) {
          throw new Error(touchConversationError.message);
        }

        const { data: updatedMessages, error: updatedMessagesError } =
          await serverContext.supabase
            .from("custom_messages")
            .select("role, content, created_at")
            .eq("user_id", serverContext.userId)
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

        if (updatedMessagesError) {
          throw new Error(updatedMessagesError.message);
        }

        const memoryMessages: Array<{
          role: ChatRole;
          content: string;
          createdAt?: string;
        }> = [];

        if (Array.isArray(updatedMessages)) {
          for (const message of updatedMessages) {
            if (!isRecord(message)) continue;
            const role =
              message.role === "assistant"
                ? "assistant"
                : message.role === "user"
                  ? "user"
                  : null;
            const content =
              typeof message.content === "string"
                ? clean(message.content)
                : "";
            const createdAt =
              typeof message.created_at === "string"
                ? message.created_at
                : undefined;
            if (!role || !content) continue;
            memoryMessages.push({ role, content, createdAt });
          }
        }

        const nextState = buildNextMemoryState(memoryMessages);
        finalMemoryState = nextState;
        const priorCorrection = extractReplyCorrectionSnapshot(memoryState);
        const nextRecentRatings = replyFeedback?.rating
          ? [...priorCorrection.recentRatings, replyFeedback.rating].slice(-4)
          : priorCorrection.recentRatings;
        const nextLatestRating = replyFeedback?.rating ?? priorCorrection.latestRating;
        const nextCorrectionSummary = buildReplyCorrectionSummary(
          nextLatestRating,
          nextRecentRatings,
        );

        const { error: memoryPersistError } = await serverContext.supabase
          .from("conversation_memory_state")
          .upsert(
            {
              user_id: serverContext.userId,
              conversation_id: conversationId,
              conversation_type: "custom",
              summary: nextState.summary,
              memory_facts: nextState.memoryFacts,
              relationship_state: nextState.relationshipState,
              tone_state: {
                ...(memoryState?.toneState ?? {}),
                ...nextState.toneState,
                ...(liveTuning
                  ? {
                      live_tuning_preferences: liveTuning.adjustments,
                      live_tuning_reject_last_style: liveTuning.rejectLastReplyStyle,
                      live_tuning_rejected_excerpt:
                        liveTuning.rejectedReplyExcerpt ?? "",
                    }
                  : {}),
                ...(replyFeedback
                  ? {
                      reply_feedback_latest: replyFeedback.rating,
                      reply_feedback_history: nextRecentRatings,
                      reply_feedback_active_summary: nextCorrectionSummary,
                      reply_feedback_target_excerpt:
                        replyFeedback.targetExcerpt ?? "",
                    }
                  : priorCorrection.latestRating || priorCorrection.recentRatings.length > 0
                    ? {
                        reply_feedback_latest: nextLatestRating ?? "",
                        reply_feedback_history: nextRecentRatings,
                        reply_feedback_active_summary: nextCorrectionSummary,
                        reply_feedback_target_excerpt:
                          priorCorrection.targetExcerpt ?? "",
                      }
                    : {}),
              },
              message_count: nextState.messageCount,
              last_message_at: nextState.lastMessageAt,
            },
            {
              onConflict: "conversation_id",
            },
          );

        if (memoryPersistError) {
          throw new Error(memoryPersistError.message);
        }
      } catch (error) {
        console.error("Custom memory persistence failed:", error);
      }
    }

    return NextResponse.json({
      reply,
      conversationId: conversationId || null,
      memoryActive: Boolean(serverContext && conversationId),
      memoryState: finalMemoryState,
      liveTuning: extractLiveTuningSnapshot(finalMemoryState),
      replyCorrection: extractReplyCorrectionSnapshot(finalMemoryState),
      model: openRouterResult.modelUsed,
      routing: getOpenRouterRouteConfig(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
