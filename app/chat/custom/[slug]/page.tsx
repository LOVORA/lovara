"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import CharacterInfoPanel from "@/components/chat/character-info-panel";
import ChatShellNav from "@/components/chat/chat-shell-nav";
import ChatSidebarRail from "@/components/chat/chat-sidebar-rail";
import MessageRichText from "@/components/chat/message-rich-text";
import {
  type DbCustomCharacter,
  type DbCustomConversation,
  type DbCustomMessage,
} from "@/lib/account";
import {
  createSupabaseStorageSigner,
  resolveCharacterPrimaryImage,
} from "@/lib/character-image-assets";
import {
  formatVisibleArchetypeLabel,
  getIdentitySummary,
} from "@/lib/custom-character-studio";
import { getCustomCharacterVisibility } from "@/lib/character-admin";
import { normalizeVisibleHeadline } from "@/lib/custom-character-copy";
import {
  buildLegacyRebuildHref,
  getLegacyCharacterState,
} from "@/lib/legacy-character-state";
import { supabase } from "@/lib/supabase";

const AuthGuard = dynamic(() => import("@/components/auth/auth-guard"), {
  ssr: false,
});

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

type BannerState =
  | { type: "error"; message: string }
  | { type: "success"; message: string }
  | null;

type MessageUsageState = {
  currentPlan: string;
  messagesThisMonth: number;
  messageLimit: number;
  remainingMessages: number;
  messageUsageLabel: string;
  upgradeReasons: string[];
};

type SessionState = "fresh" | "active";
type RetentionState = "fresh-start" | "warming-up" | "settled-in" | "ongoing";

const LIVE_TUNING_OPTIONS = [
  "more jealous",
  "softer",
  "colder",
  "slower burn",
  "more protective",
  "more teasing",
  "more dominant",
  "more emotionally open",
] as const;

const REPLY_FEEDBACK_OPTIONS = [
  { key: "perfect", label: "Perfect" },
  { key: "too_generic", label: "Too generic" },
  { key: "too_fast", label: "Too fast" },
  { key: "too_cold", label: "Too cold" },
  { key: "too_weak", label: "Too weak" },
  { key: "too_intense", label: "Too intense" },
] as const;

type LiveTuningState = {
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

type ReplyCorrectionState = {
  latestRating?: ReplyFeedbackKey;
  recentRatings: ReplyFeedbackKey[];
  activeCorrectionSummary: string[];
  targetExcerpt?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const lowered = trimmed.toLowerCase();
  return lowered === "undefined" || lowered === "null" ? undefined : trimmed;
}

class MessageLimitError extends Error {
  payload: MessageUsageState;

  constructor(payload: MessageUsageState) {
    super(
      `You have reached your monthly message limit for the ${payload.currentPlan} plan.`,
    );
    this.name = "MessageLimitError";
    this.payload = payload;
  }
}

function mapDbMessage(message: DbCustomMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
  };
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function getSessionState(messages: ChatMessage[]): SessionState {
  const nonGreetingMessages = messages.filter((message, index) => {
    if (index === 0 && message.role === "assistant") return false;
    return true;
  });

  return nonGreetingMessages.length === 0 ? "fresh" : "active";
}

function getMeaningfulMessageCount(messages: ChatMessage[]) {
  return messages.filter(
    (message, index) => !(index === 0 && message.role === "assistant"),
  ).length;
}

function getRetentionState(messages: ChatMessage[]): RetentionState {
  const meaningfulCount = getMeaningfulMessageCount(messages);

  if (meaningfulCount === 0) return "fresh-start";
  if (meaningfulCount <= 4) return "warming-up";
  if (meaningfulCount <= 14) return "settled-in";
  return "ongoing";
}

function getRetentionLabel(state: RetentionState) {
  switch (state) {
    case "fresh-start":
      return "Fresh start";
    case "warming-up":
      return "Chemistry building";
    case "settled-in":
      return "Connection active";
    case "ongoing":
      return "Ongoing thread";
  }
}

function getRetentionTone(state: RetentionState): "neutral" | "success" | "warm" {
  if (state === "fresh-start") return "warm";
  if (state === "warming-up") return "warm";
  return "success";
}

function getRetentionHint(state: RetentionState) {
  switch (state) {
    case "fresh-start":
      return "The opening scene is already there. One direct line is enough to start strong.";
    case "warming-up":
      return "The bond is starting to form. Keep the thread moving instead of restarting it.";
    case "settled-in":
      return "There is already a mood here. Picking up from it usually works best.";
    case "ongoing":
      return "This conversation has history. Referencing what already happened makes it feel alive.";
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getStoredLiveTuning(value: unknown): LiveTuningState {
  const record = toRecord(value);
  const tone = toRecord(record.toneState ?? record.tone_state);

  const adjustments = Array.isArray(tone.live_tuning_preferences)
    ? tone.live_tuning_preferences
        .map((item) => (typeof item === "string" ? clean(item) : ""))
        .filter((item): item is string => Boolean(item))
    : [];

  return {
    adjustments,
    rejectLastReplyStyle: tone.live_tuning_reject_last_style === true,
    rejectedReplyExcerpt:
      typeof tone.live_tuning_rejected_excerpt === "string"
        ? clean(tone.live_tuning_rejected_excerpt)
        : undefined,
  };
}

function getStoredReplyCorrection(value: unknown): ReplyCorrectionState {
  const record = toRecord(value);
  const tone = toRecord(record.toneState ?? record.tone_state);

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

  return {
    latestRating,
    recentRatings,
    activeCorrectionSummary: Array.isArray(tone.reply_feedback_active_summary)
      ? tone.reply_feedback_active_summary
          .map((item) => (typeof item === "string" ? clean(item) : ""))
          .filter((item): item is string => Boolean(item))
      : [],
    targetExcerpt:
      typeof tone.reply_feedback_target_excerpt === "string"
        ? clean(tone.reply_feedback_target_excerpt)
        : undefined,
  };
}

function getOpeningData(character: DbCustomCharacter) {
  const payload = toRecord(character.payload);
  const openingPack = toRecord(payload.openingPack);

  return {
    openingSummary:
      typeof openingPack.openingSummary === "string"
        ? clean(openingPack.openingSummary)
        : undefined,
    openingBeat:
      typeof openingPack.openingBeat === "string"
        ? clean(openingPack.openingBeat)
        : undefined,
  };
}

function readIdentityField(payload: Record<string, unknown> | null, key: string) {
  if (!payload || typeof payload !== "object") return "";

  const identity =
    typeof payload.identity === "object" && payload.identity
      ? (payload.identity as Record<string, unknown>)
      : null;

  const value = identity?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function getCharacterSummary(character: DbCustomCharacter) {
  return (
    clean(character.preview_message) ||
    clean(character.headline) ||
    clean(character.description) ||
    "A private roleplay character ready for a more personal conversation."
  );
}

async function fetchPrimaryAvatarUrl(
  characterId: string,
  fallbackUrl?: string | null,
): Promise<string | null> {
  const { data: imageRows, error: imageError } = await supabase
    .from("character_images")
    .select(
      "id, character_id, storage_bucket, storage_path, public_url, is_primary, image_type, created_at",
    )
    .eq("character_id", characterId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (imageError || !Array.isArray(imageRows)) {
    return fallbackUrl ?? null;
  }

  const resolved = await resolveCharacterPrimaryImage({
    rows: imageRows as Array<{
      id?: string | null;
      character_id: string | null;
      storage_bucket?: string | null;
      storage_path?: string | null;
      public_url: string | null;
      is_primary?: boolean | null;
      image_type?: string | null;
      created_at?: string | null;
    }>,
    signUrl: createSupabaseStorageSigner(supabase as never),
    fallbackUrl,
  });

  return resolved?.resolvedUrl ?? fallbackUrl ?? null;
}

async function fetchConversationMessages(
  conversationId: string,
): Promise<DbCustomMessage[]> {
  const response = await fetch(
    `/api/custom-chat/messages?conversationId=${encodeURIComponent(conversationId)}`,
    {
      credentials: "include",
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string; messages?: DbCustomMessage[] }
    | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Could not load messages.");
  }

  return Array.isArray(payload.messages) ? payload.messages : [];
}

async function createConversationMessage(args: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const response = await fetch("/api/custom-chat/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(args),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        error?: string;
        message?: DbCustomMessage;
        currentPlan?: string;
        messagesThisMonth?: number;
        messageLimit?: number;
        remainingMessages?: number;
        messageUsageLabel?: string;
        upgradeReasons?: string[];
      }
    | null;

  if (
    response.status === 403 &&
    payload?.error === "MONTHLY_MESSAGE_LIMIT_REACHED" &&
    typeof payload.currentPlan === "string" &&
    typeof payload.messagesThisMonth === "number" &&
    typeof payload.messageLimit === "number" &&
    typeof payload.remainingMessages === "number" &&
    typeof payload.messageUsageLabel === "string"
  ) {
    throw new MessageLimitError({
      currentPlan: payload.currentPlan,
      messagesThisMonth: payload.messagesThisMonth,
      messageLimit: payload.messageLimit,
      remainingMessages: payload.remainingMessages,
      messageUsageLabel: payload.messageUsageLabel,
      upgradeReasons: Array.isArray(payload.upgradeReasons)
        ? payload.upgradeReasons.filter(
            (reason): reason is string => typeof reason === "string" && reason.trim().length > 0,
          )
        : [],
    });
  }

  if (!response.ok || !payload?.ok || !payload.message) {
    throw new Error(payload?.error || "Could not save message.");
  }

  return payload.message;
}

async function resetConversationWithServer(args: {
  conversationId: string;
}) {
  const response = await fetch("/api/custom-chat/reset", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(args),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string; messages?: DbCustomMessage[] }
    | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Could not reset conversation.");
  }

  return Array.isArray(payload.messages) ? payload.messages : [];
}

function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warm";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-xs",
        tone === "success" && "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
        tone === "warm" && "border-amber-400/20 bg-amber-400/10 text-amber-100",
        tone === "neutral" && "border-white/10 bg-white/5 text-white/70",
      )}
    >
      {label}
    </span>
  );
}

export default function CustomCharacterChatPage() {
  const params = useParams<{ slug?: string | string[] }>();
  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
        ? params.slug[0]
        : "";

  const [character, setCharacter] = useState<DbCustomCharacter | null>(null);
  const [conversation, setConversation] = useState<DbCustomConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [messageUsage, setMessageUsage] = useState<MessageUsageState | null>(null);
  const [justReset, setJustReset] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [sceneSetup, setSceneSetup] = useState("");
  const [liveTuning, setLiveTuning] = useState<LiveTuningState>({
    adjustments: [],
    rejectLastReplyStyle: false,
  });
  const [replyCorrection, setReplyCorrection] = useState<ReplyCorrectionState>({
    recentRatings: [],
    activeCorrectionSummary: [],
  });
  const [showControls, setShowControls] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const identitySummary = useMemo(() => {
    if (!character) return [];
    const payload =
      typeof character.payload === "object" && character.payload
        ? (character.payload as Record<string, unknown>)
        : {};
    return getIdentitySummary(payload);
  }, [character]);

  const sessionState = useMemo(() => getSessionState(messages), [messages]);
  const retentionState = useMemo(() => getRetentionState(messages), [messages]);
  const openingData = useMemo(
    () => (character ? getOpeningData(character) : { openingSummary: undefined, openingBeat: undefined }),
    [character],
  );
  const visibleHeadline = useMemo(
    () =>
      normalizeVisibleHeadline(
        character?.headline,
        clean(character?.archetype),
        clean(character?.scenario?.setting),
      ) || "",
    [character],
  );
  const characterSummary = useMemo(
    () => (character ? getCharacterSummary(character) : ""),
    [character],
  );
  const payloadRecord = useMemo(
    () =>
      character && typeof character.payload === "object" && character.payload
        ? (character.payload as Record<string, unknown>)
        : null,
    [character],
  );
  const ageLabel = useMemo(() => readIdentityField(payloadRecord, "age"), [payloadRecord]);
  const storySummary = useMemo(
    () =>
      character
        ? clean(character.description) ||
          visibleHeadline ||
          clean(character.backstory) ||
          characterSummary
        : "",
    [character, characterSummary, visibleHeadline],
  );
  const scenarioSummary = useMemo(() => {
    if (!character) return "";

    return [
      clean(character.scenario?.relationshipToUser),
      clean(character.scenario?.setting),
      clean(character.scenario?.tone),
      clean(character.scenario?.sceneGoal),
      openingData.openingSummary,
    ]
      .filter(Boolean)
      .join(" • ");
  }, [character, openingData.openingSummary]);
  const roleLabel = useMemo(
    () =>
      formatVisibleArchetypeLabel(clean(character?.archetype)) ||
      visibleHeadline ||
      "",
    [character, visibleHeadline],
  );
  const panelIdentityChips = useMemo(() => identitySummary.slice(0, 4), [identitySummary]);
  const lastAssistantReply = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant") ?? null,
    [messages],
  );
  const legacyCharacterState = useMemo(
    () =>
      character
        ? getLegacyCharacterState({
            styleType: character.style_type,
            payload: character.payload,
          })
        : null,
    [character],
  );
  const legacyRebuildHref = useMemo(
    () =>
      character && legacyCharacterState?.rebuildEligible
        ? buildLegacyRebuildHref(character.id)
        : null,
    [character, legacyCharacterState],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!slug) {
        setLoading(false);
        setBanner({
          type: "error",
          message: "Invalid or missing character slug.",
        });
        return;
      }

      setLoading(true);
      setBanner(null);
      setJustReset(false);

      try {
        const response = await fetch(
          `/api/custom-chat/bootstrap?slug=${encodeURIComponent(slug)}`,
          {
            credentials: "include",
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              error?: string;
              character?: DbCustomCharacter;
              conversation?: DbCustomConversation;
              messages?: DbCustomMessage[];
              memoryState?: unknown;
              liveTuning?: LiveTuningState;
              replyCorrection?: ReplyCorrectionState;
              avatarUrl?: string | null;
            }
          | null;

        if (!response.ok || !payload?.ok || !payload.character || !payload.conversation) {
          throw new Error(payload?.error || "Could not load chat.");
        }

        if (cancelled) return;

        setCharacter(payload.character);
        setConversation(payload.conversation);
        setMessages((payload.messages ?? []).map(mapDbMessage));
        setCurrentAvatarUrl(payload.avatarUrl ?? payload.character.primary_image_url ?? null);
        setLiveTuning(payload.liveTuning ?? getStoredLiveTuning(payload.memoryState));
        setReplyCorrection(
          payload.replyCorrection ?? getStoredReplyCorrection(payload.memoryState),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not load chat.";

        setBanner({
          type: "error",
          message:
            message === "CHARACTER_NOT_FOUND"
              ? "This character does not exist for the current account."
                : message === "AUTH_REQUIRED"
                ? "You need to log in to open this chat."
                : message,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      if (!character?.id) {
        setCurrentAvatarUrl(null);
        return;
      }

      try {
        const nextUrl = await fetchPrimaryAvatarUrl(
          character.id,
          character.primary_image_url ?? null,
        );
        if (!cancelled) setCurrentAvatarUrl(nextUrl);
      } catch {
        if (!cancelled) setCurrentAvatarUrl(character.primary_image_url ?? null);
      }
    }

    void loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [character?.id, character?.primary_image_url]);

  async function refreshMessages(conversationId: string) {
    const latest = await fetchConversationMessages(conversationId);
    setMessages(latest.map(mapDbMessage));
  }

  async function handleSend() {
    if (!character || !conversation) return;

    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setBanner(null);
    setJustReset(false);

    const optimisticUserMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticUserMessage]);
    setInput("");

    try {
      await createConversationMessage({
        conversationId: conversation.id,
        role: "user",
        content: trimmed,
      });

      const latestBeforeReply = await fetchConversationMessages(conversation.id);
      const apiMessages = latestBeforeReply.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const response = await fetch("/api/chat/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          liveScenario: sceneSetup,
          liveTuning,
          replyFeedback: replyCorrection.latestRating
            ? {
                rating: replyCorrection.latestRating,
                targetExcerpt: replyCorrection.targetExcerpt,
              }
            : undefined,
          character: {
            id: character.id,
            slug: character.slug,
            name: character.name,
            archetype: character.archetype,
            headline: character.headline,
            description: character.description,
            greeting: character.greeting,
            previewMessage: character.preview_message,
            backstory: character.backstory,
            scenario: character.scenario,
            traitBadges: character.trait_badges,
            tags: character.tags,
            metadata:
              typeof character.metadata === "object" && character.metadata
                ? character.metadata
                : {},
            payload:
              typeof character.payload === "object" && character.payload
                ? character.payload
                : {},
            engine:
              typeof character.payload === "object" && character.payload
                ? ((character.payload as Record<string, unknown>).engine ?? null)
                : null,
          },
          messages: apiMessages,
        }),
      });

      const data = await response.json();

      if (
        data &&
        typeof data === "object" &&
        "usage" in data &&
        data.usage &&
        typeof data.usage === "object"
      ) {
        const usage = data.usage as Partial<MessageUsageState>;
        if (
          typeof usage.currentPlan === "string" &&
          typeof usage.messagesThisMonth === "number" &&
          typeof usage.messageLimit === "number" &&
          typeof usage.remainingMessages === "number" &&
          typeof usage.messageUsageLabel === "string"
        ) {
          setMessageUsage({
            currentPlan: usage.currentPlan,
            messagesThisMonth: usage.messagesThisMonth,
            messageLimit: usage.messageLimit,
            remainingMessages: usage.remainingMessages,
            messageUsageLabel: usage.messageUsageLabel,
            upgradeReasons: Array.isArray(usage.upgradeReasons)
              ? usage.upgradeReasons.filter(
                  (reason): reason is string =>
                    typeof reason === "string" && reason.trim().length > 0,
                )
              : [],
          });
        }
      }

      if (
        response.status === 403 &&
        data &&
        typeof data === "object" &&
        data.error === "MONTHLY_MESSAGE_LIMIT_REACHED" &&
        typeof data.currentPlan === "string" &&
        typeof data.messagesThisMonth === "number" &&
        typeof data.messageLimit === "number" &&
        typeof data.remainingMessages === "number" &&
        typeof data.messageUsageLabel === "string"
      ) {
        throw new MessageLimitError({
          currentPlan: data.currentPlan,
          messagesThisMonth: data.messagesThisMonth,
          messageLimit: data.messageLimit,
          remainingMessages: data.remainingMessages,
          messageUsageLabel: data.messageUsageLabel,
          upgradeReasons: Array.isArray(data.upgradeReasons)
            ? data.upgradeReasons.filter(
                (reason: unknown): reason is string =>
                  typeof reason === "string" && reason.trim().length > 0,
              )
            : [],
        });
      }

      if (!response.ok || !data?.reply) {
        throw new Error(data?.error || "Could not generate reply.");
      }

      setLiveTuning(
        data.liveTuning ?? {
          ...liveTuning,
          ...getStoredLiveTuning(data.memoryState),
        },
      );
      setReplyCorrection(
        data.replyCorrection ?? getStoredReplyCorrection(data.memoryState),
      );

      await refreshMessages(conversation.id);
    } catch (error) {
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticUserMessage.id),
      );

      if (error instanceof MessageLimitError) {
        setMessageUsage(error.payload);
        setBanner({
          type: "error",
          message: `${error.message} ${error.payload.messageUsageLabel}`,
        });
        return;
      }

      const message =
        error instanceof Error ? error.message : "Could not send message.";

      setBanner({ type: "error", message });
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    void handleSend();
  }

  async function handleReset() {
    if (!character || !conversation || resetting) return;

    setResetting(true);
    setBanner(null);

    try {
      const nextMessages = await resetConversationWithServer({
        conversationId: conversation.id,
      });

      setMessages(nextMessages.map(mapDbMessage));
      setLiveTuning({
        adjustments: [],
        rejectLastReplyStyle: false,
      });
      setReplyCorrection({
        recentRatings: [],
        activeCorrectionSummary: [],
      });
      setJustReset(true);
      setBanner({
        type: "success",
        message: "Reset completed. This chat is fresh again.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not reset conversation.";
      setBanner({ type: "error", message });
    } finally {
      setResetting(false);
    }
  }

  function toggleLiveTuningAdjustment(adjustment: string) {
    setLiveTuning((current) => {
      const exists = current.adjustments.includes(adjustment);
      return {
        ...current,
        adjustments: exists
          ? current.adjustments.filter((item) => item !== adjustment)
          : [...current.adjustments, adjustment],
      };
    });
  }

  function markLastReplyStyleRejected() {
    if (!lastAssistantReply) return;

    setLiveTuning((current) => ({
      ...current,
      rejectLastReplyStyle: true,
      rejectedReplyExcerpt: lastAssistantReply.content.slice(0, 220),
    }));
    setBanner({
      type: "success",
      message:
        "Reply style feedback saved. The next answer will avoid this tone and rhythm.",
    });
  }

  function applyReplyFeedback(rating: ReplyFeedbackKey) {
    if (!lastAssistantReply) return;

    const nextRecentRatings = [...replyCorrection.recentRatings, rating].slice(-4);
    setReplyCorrection({
      latestRating: rating,
      recentRatings: nextRecentRatings,
      activeCorrectionSummary: [],
      targetExcerpt: lastAssistantReply.content.slice(0, 220),
    });
    setBanner({
      type: "success",
      message: `Reply feedback saved: ${rating.replaceAll("_", " ")}.`,
    });
  }

  function clearLiveTuning() {
    setLiveTuning({
      adjustments: [],
      rejectLastReplyStyle: false,
      rejectedReplyExcerpt: undefined,
    });
    setBanner({
      type: "success",
      message: "Live tuning cleared for this conversation.",
    });
  }

  if (loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-8 text-sm text-white/65">
            Opening chat...
          </div>
        </main>
      </AuthGuard>
    );
  }

  if (!character || !conversation) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
            <h1 className="text-2xl font-semibold text-white">Chat unavailable</h1>
            <p className="mt-3 text-sm text-white/60">
              {banner?.message || "This character could not be loaded."}
            </p>
            <Link
              href="/my-characters"
              className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
            >
              Back to my characters
            </Link>
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
          <div className="mb-4">
            <ChatShellNav activeHref="/my-characters" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
            <ChatSidebarRail activeHref={`/chat/custom/${slug}`} />

            <section className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-200/80">
                      Private chat
                    </div>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      {character.name}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-white/58">
                      {visibleHeadline || character.description || characterSummary}
                    </p>
                    <p className="mt-3 text-xs text-white/42">
                      {sessionState === "fresh"
                        ? `${character.name} is ready with the opening scene. ${getRetentionHint(retentionState)}`
                        : `You are back inside the same thread with ${character.name}. ${getRetentionHint(retentionState)}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={getRetentionLabel(retentionState)}
                      tone={getRetentionTone(retentionState)}
                    />
                    {legacyCharacterState?.isLegacyAnime ? (
                      <StatusBadge label="Legacy style" tone="warm" />
                    ) : null}
                    {justReset ? <StatusBadge label="Reset completed" tone="success" /> : null}
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={resetting}
                      className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-medium text-amber-100 transition hover:border-amber-400/35 hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {resetting ? "Resetting..." : "Reset"}
                    </button>
                  </div>
                </div>
              </div>

              {legacyCharacterState?.isLegacyAnime ? (
                <div className="rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-7 text-rose-50/92">
                  This character came from an older anime-based flow. The saved chat and archive stay available, but new photo generation is frozen until you rebuild it as a realistic original.
                  {legacyRebuildHref ? (
                    <div className="mt-4">
                      <Link
                        href={legacyRebuildHref}
                        className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
                      >
                        Rebuild as realistic
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {banner ? (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    banner.type === "success"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-100",
                  )}
                >
                  {banner.message}
                </div>
              ) : null}

              <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Conversation
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                      Stay inside the same thread without losing the scene.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowControls((current) => !current)}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/75 transition hover:border-white/20 hover:bg-white/10"
                  >
                    {showControls ? "Hide controls" : "Adjust tone"}
                  </button>
                </div>

                <div className="max-h-[64vh] space-y-4 overflow-y-auto pr-1">
                  {messages.map((message, index) => {
                    const isLatestAssistant =
                      message.role === "assistant" &&
                      index ===
                        messages.map((item) => item.role).lastIndexOf("assistant");

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "rounded-[28px] border px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.12)] md:px-5 md:py-5",
                          message.role === "assistant"
                            ? "mr-6 border-fuchsia-400/15 bg-[linear-gradient(180deg,rgba(244,114,182,0.14),rgba(244,114,182,0.08))] md:mr-10"
                            : "ml-6 border-white/10 bg-black/25 md:ml-10",
                        )}
                      >
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/35">
                          {message.role === "assistant" ? character.name : "You"}
                        </div>
                        <div className="text-sm leading-7">
                          <MessageRichText content={message.content} tone="light" />
                        </div>
                      <div className="mt-3 text-xs text-white/35">
                        {formatRelativeTime(message.createdAt)}
                      </div>
                        {isLatestAssistant ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {REPLY_FEEDBACK_OPTIONS.map((option) => {
                              const active = replyCorrection.latestRating === option.key;
                              return (
                                <button
                                  key={option.key}
                                  type="button"
                                  onClick={() => applyReplyFeedback(option.key)}
                                  className={cn(
                                    "rounded-full border px-3 py-1.5 text-[11px] transition",
                                    active
                                      ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-100"
                                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10",
                                  )}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {sending ? (
                    <div className="flex justify-start">
                      <div className="flex max-w-[88%] items-end gap-3 md:max-w-[75%]">
                        <div className="relative mb-1 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/10">
                          {currentAvatarUrl ? (
                            <Image
                              src={currentAvatarUrl}
                              alt={character.name}
                              fill
                              unoptimized
                              sizes="36px"
                              className="object-contain object-center"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/85">
                              {character.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="rounded-[24px] rounded-bl-md border border-white/10 bg-white/[0.05] px-4 py-3 text-white shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                          <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-white/75">
                            {character.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-white/82">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-white/90" />
                            <span className="h-2 w-2 animate-pulse rounded-full bg-white/75 [animation-delay:120ms]" />
                            <span className="h-2 w-2 animate-pulse rounded-full bg-white/60 [animation-delay:240ms]" />
                            <span className="text-sm lowercase tracking-[0.02em] text-white/78">
                              typing...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div ref={bottomRef} />
                </div>

                <div className="mt-5 rounded-[30px] border border-white/10 bg-black/25 p-3 md:p-4">
                  {showControls ? (
                    <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                        Adjust tone
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {LIVE_TUNING_OPTIONS.map((option) => {
                          const active = liveTuning.adjustments.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleLiveTuningAdjustment(option)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs transition",
                                active
                                  ? "border-fuchsia-400/30 bg-fuchsia-400/12 text-fuchsia-100"
                                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10",
                              )}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                          Scene note
                        </div>
                        <textarea
                          value={sceneSetup}
                          onChange={(event) => setSceneSetup(event.target.value)}
                          rows={3}
                          placeholder="A short note to steer the mood or moment."
                          disabled={(messageUsage?.remainingMessages ?? 1) <= 0}
                          className="mt-2 w-full resize-none rounded-[18px] border border-white/10 bg-black/25 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25"
                        />
                      </div>
                    </div>
                  ) : null}
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder={
                      sessionState === "fresh"
                        ? "Start with something simple. The character already knows the scene."
                        : "Pick up where this thread left off..."
                    }
                    rows={4}
                    disabled={sending || (messageUsage?.remainingMessages ?? 1) <= 0}
                    className="w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/25"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-white/40">
                      {messageUsage?.messageUsageLabel ??
                        (sessionState === "fresh"
                          ? "A direct first line usually works best."
                          : getRetentionHint(retentionState))}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={markLastReplyStyleRejected}
                        disabled={!lastAssistantReply || sending}
                        className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-xs font-medium text-rose-100 transition hover:border-rose-400/35 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Not this reply style
                      </button>
                      <button
                        type="button"
                        onClick={clearLiveTuning}
                        disabled={
                          sending ||
                          (!liveTuning.adjustments.length &&
                            !liveTuning.rejectLastReplyStyle)
                        }
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Clear tuning
                      </button>
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={
                          sending ||
                          !input.trim() ||
                          (messageUsage?.remainingMessages ?? 1) <= 0
                        }
                        className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black shadow-[0_14px_40px_rgba(255,255,255,0.1)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {sending ? "Sending..." : "Send message"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <CharacterInfoPanel
                avatarUrl={currentAvatarUrl}
                name={character.name}
                ageLabel={ageLabel}
                roleLabel={roleLabel}
                identityChips={panelIdentityChips}
                storySummary={storySummary}
                scenarioSummary={scenarioSummary}
                photoStudioHref={
                  getCustomCharacterVisibility(character.payload).showInPhotoStudio
                    ? `/photo-studio/custom/${character.slug}`
                    : "/photo-studio"
                }
                photoStudioLabel={
                  getCustomCharacterVisibility(character.payload).showInPhotoStudio
                    ? "Open Photo Studio"
                    : "Photo Studio hidden"
                }
              />
            </aside>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
