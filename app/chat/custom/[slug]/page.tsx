"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  customCharactersStorage,
  type StoredCharacterRecord,
} from "../../../../lib/custom-characters-storage";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

type ApiMessage = {
  role: ChatRole;
  content: string;
};

type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "msg") {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getConversationStorageKey(slug: string) {
  return `lovora.custom-chat.${slug}.v1`;
}

function normalizeStoredMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Partial<ChatMessage>;
      const role = raw.role === "assistant" ? "assistant" : raw.role === "user" ? "user" : null;
      const content = typeof raw.content === "string" ? raw.content.trim() : "";
      const createdAt =
        typeof raw.createdAt === "string" && raw.createdAt.trim()
          ? raw.createdAt
          : new Date().toISOString();

      if (!role || !content) return null;

      return {
        id:
          typeof raw.id === "string" && raw.id.trim()
            ? raw.id
            : makeId(role === "assistant" ? "assistant" : "user"),
        role,
        content,
        createdAt,
      } satisfies ChatMessage;
    })
    .filter((item): item is ChatMessage => Boolean(item));
}

function safeParseMessages(raw: string | null): ChatMessage[] {
  if (!raw) return [];
  try {
    return normalizeStoredMessages(JSON.parse(raw));
  } catch {
    return [];
  }
}

function persistMessages(slug: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getConversationStorageKey(slug), JSON.stringify(messages));
  } catch {
    // ignore storage failures
  }
}

function readPersistedMessages(slug: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  return safeParseMessages(window.localStorage.getItem(getConversationStorageKey(slug)));
}

function clearPersistedMessages(slug: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getConversationStorageKey(slug));
  } catch {
    // ignore storage failures
  }
}

function formatRelativeDate(value?: string): string {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / minute));
    return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  }

  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.max(1, Math.floor(diffMs / day));
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getScenarioSummary(character: StoredCharacterRecord): string {
  if (character.scenarioSummary?.trim()) return character.scenarioSummary.trim();

  const parts = [
    character.scenario?.setting,
    character.scenario?.relationshipToUser,
    character.scenario?.sceneGoal,
    character.scenario?.tone,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Open-ended interaction";
}

function getScenarioChips(character: StoredCharacterRecord): string[] {
  const values = [
    character.scenario?.setting,
    character.scenario?.relationshipToUser,
    character.scenario?.tone,
  ].filter((value): value is string => Boolean(clean(value)));

  return values.slice(0, 3);
}

function getOpeningAssistantMessage(character: StoredCharacterRecord): ChatMessage {
  const content =
    clean(character.previewMessage) ||
    clean(character.greeting) ||
    clean(character.description) ||
    `${character.name} is here.`;

  return {
    id: makeId("assistant"),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}

function buildApiPayload(character: StoredCharacterRecord, messages: ChatMessage[]) {
  return {
    character: {
      id: character.id,
      slug: character.slug,
      name: character.name,
      archetype: character.archetype,
      headline: character.headline,
      description: character.description,
      greeting: character.greeting,
      previewMessage: character.previewMessage,
      backstory: character.backstory,
      scenario: character.scenario,
      scenarioSummary: character.scenarioSummary,
      traitBadges: character.traitBadges,
      memorySeed: character.memorySeed,
      engine: character.engine,
      metadata: character.metadata,
      tags: character.tags,
    },
    messages: messages.map(
      (message) =>
        ({
          role: message.role,
          content: message.content,
        }) satisfies ApiMessage
    ),
  };
}

function extractAssistantText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;

  if (typeof record.reply === "string" && record.reply.trim()) {
    return record.reply.trim();
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  if (typeof record.content === "string" && record.content.trim()) {
    return record.content.trim();
  }

  if (
    record.data &&
    typeof record.data === "object" &&
    typeof (record.data as Record<string, unknown>).reply === "string"
  ) {
    const nestedReply = (record.data as Record<string, unknown>).reply;
    return typeof nestedReply === "string" && nestedReply.trim() ? nestedReply.trim() : null;
  }

  return null;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex w-full",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[88%] rounded-[24px] border px-4 py-3 text-sm leading-7 shadow-[0_10px_30px_rgba(0,0,0,0.18)] md:max-w-[75%]",
          isAssistant
            ? "border-white/10 bg-white/8 text-white"
            : "border-fuchsia-400/20 bg-fuchsia-500/15 text-fuchsia-50"
        )}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        <div className="mt-2 text-[11px] text-white/40">
          {formatRelativeDate(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

function ScenarioPanel({ character }: { character: StoredCharacterRecord }) {
  const scenario = character.scenario;

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
        Scene Context
      </div>

      <p className="mt-3 text-sm leading-6 text-white/72">
        {getScenarioSummary(character)}
      </p>

      <div className="mt-4 space-y-3 text-sm text-white/70">
        {scenario?.setting ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              Setting
            </div>
            <div className="mt-1">{scenario.setting}</div>
          </div>
        ) : null}

        {scenario?.relationshipToUser ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              Relationship
            </div>
            <div className="mt-1">{scenario.relationshipToUser}</div>
          </div>
        ) : null}

        {scenario?.sceneGoal ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              Scene Goal
            </div>
            <div className="mt-1">{scenario.sceneGoal}</div>
          </div>
        ) : null}

        {scenario?.tone ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              Tone
            </div>
            <div className="mt-1">{scenario.tone}</div>
          </div>
        ) : null}

        {scenario?.openingState ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              Opening State
            </div>
            <div className="mt-1">{scenario.openingState}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CharacterHero({
  character,
  onReset,
  resetting,
}: {
  character: StoredCharacterRecord;
  onReset: () => void;
  resetting: boolean;
}) {
  const chips = getScenarioChips(character);

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_30%)]" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/48">
            Custom Roleplay
          </div>

          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-white/15 bg-gradient-to-br from-fuchsia-500/30 via-violet-500/20 to-cyan-400/20 text-lg font-semibold text-white">
              {character.avatarFallback || character.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {character.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/68 md:text-base">
                {character.headline || "Custom Lovora companion"}
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68 md:text-base">
            {character.greeting || character.description || "Open the conversation and let the scene unfold."}
          </p>

          {chips.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={`${character.slug}-${chip}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/74"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          <button
            type="button"
            onClick={onReset}
            disabled={resetting}
            className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/82 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetting ? "Resetting..." : "New Conversation"}
          </button>

          <Link
            href="/my-characters"
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
          >
            Back to Library
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function CustomCharacterChatPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [mounted, setMounted] = useState(false);
  const [character, setCharacter] = useState<StoredCharacterRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !slug) return;

    const nextCharacter = customCharactersStorage.getBySlug(slug);
    setCharacter(nextCharacter);

    if (!nextCharacter) return;

    const persisted = readPersistedMessages(nextCharacter.slug);
    const nextMessages =
      persisted.length > 0 ? persisted : [getOpeningAssistantMessage(nextCharacter)];

    setMessages(nextMessages);
  }, [mounted, slug]);

  useEffect(() => {
    if (!character) return;
    persistMessages(character.slug, messages);
  }, [character, messages]);

  useEffect(() => {
    if (!banner) return;

    const timeout = window.setTimeout(() => setBanner(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [banner]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, submitting]);

  const traitBadges = useMemo(() => character?.traitBadges?.slice(0, 5) ?? [], [character]);

  const handleReset = () => {
    if (!character) return;

    const confirmed = window.confirm(
      "Start a new conversation? Your current custom chat history on this page will be cleared."
    );
    if (!confirmed) return;

    setResetting(true);

    try {
      clearPersistedMessages(character.slug);
      const fresh = [getOpeningAssistantMessage(character)];
      setMessages(fresh);
      setBanner({ type: "success", message: "New conversation started." });
    } catch {
      setBanner({ type: "error", message: "Could not reset the conversation." });
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!character || submitting) return;

    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: makeId("user"),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/chat/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildApiPayload(character, nextMessages)),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof (payload as Record<string, unknown>).error === "string" &&
            (payload as Record<string, unknown>).error) ||
          "The custom chat request failed.";
        throw new Error(message);
      }

      const assistantText = extractAssistantText(payload);
      if (!assistantText) {
        throw new Error("The API returned no assistant reply.");
      }

      const assistantMessage: ChatMessage = {
        id: makeId("assistant"),
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong sending the message.";

      setBanner({ type: "error", message });

      setMessages((current) => [
        ...current,
        {
          id: makeId("assistant"),
          role: "assistant",
          content:
            "Something interrupted the moment. Try sending that again, and I’ll continue from here.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  if (mounted && slug && character === null) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {!mounted || !character ? (
          <div className="rounded-[30px] border border-white/10 bg-white/5 p-8 text-sm text-white/65">
            Loading custom character...
          </div>
        ) : (
          <>
            <CharacterHero
              character={character}
              onReset={handleReset}
              resetting={resetting}
            />

            {banner ? (
              <div
                className={cn(
                  "mt-5 rounded-2xl border px-4 py-3 text-sm",
                  banner.type === "success" &&
                    "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
                  banner.type === "error" &&
                    "border-rose-400/20 bg-rose-400/10 text-rose-100"
                )}
              >
                {banner.message}
              </div>
            ) : null}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_360px]">
              <section className="min-h-[680px] rounded-[34px] border border-white/10 bg-white/[0.04] p-4 md:p-5">
                <div
                  ref={listRef}
                  className="flex h-[520px] flex-col gap-4 overflow-y-auto rounded-[28px] border border-white/10 bg-black/20 p-4 md:h-[560px]"
                >
                  <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/6 p-4 text-sm leading-7 text-white/78">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/60">
                      Opening Presence
                    </div>
                    <p className="mt-2">
                      {character.previewMessage || character.greeting || character.description}
                    </p>
                  </div>

                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}

                  {submitting ? (
                    <div className="flex justify-start">
                      <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/60">
                        {character.name} is typing...
                      </div>
                    </div>
                  ) : null}
                </div>

                <form onSubmit={handleSubmit} className="mt-4">
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-3">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={`Write to ${character.name}...`}
                      rows={4}
                      disabled={submitting}
                      className="w-full resize-none bg-transparent px-2 py-2 text-sm leading-7 text-white outline-none placeholder:text-white/35"
                    />

                    <div className="mt-3 flex flex-col gap-3 border-t border-white/8 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-white/42">
                        Stay in-scene. The character carries identity, tone, and scenario context into the reply.
                      </p>

                      <button
                        type="submit"
                        disabled={submitting || !input.trim()}
                        className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {submitting ? "Sending..." : "Send Message"}
                      </button>
                    </div>
                  </div>
                </form>
              </section>

              <aside className="space-y-5">
                <ScenarioPanel character={character} />

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    Character Notes
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/72">
                    {character.description}
                  </p>

                  {traitBadges.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {traitBadges.map((badge) => (
                        <span
                          key={`${character.slug}-trait-${badge.label}`}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs",
                            badge.tone === "bold" &&
                              "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100",
                            badge.tone === "warm" &&
                              "border-amber-300/25 bg-amber-300/10 text-amber-100",
                            badge.tone === "soft" &&
                              "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
                            badge.tone === "mysterious" &&
                              "border-violet-300/25 bg-violet-300/10 text-violet-100",
                            badge.tone === "neutral" &&
                              "border-white/10 bg-white/5 text-white/70"
                          )}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    Library Meta
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-white/68">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                        Archetype
                      </div>
                      <div className="mt-1">{character.archetype}</div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                        Speech Style
                      </div>
                      <div className="mt-1">{character.metadata.speechStyle}</div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                        Relationship Pace
                      </div>
                      <div className="mt-1">{character.metadata.relationshipPace}</div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                        Last Updated
                      </div>
                      <div className="mt-1">
                        {formatRelativeDate(
                          character.metadata.updatedAt || character.metadata.createdAt
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
