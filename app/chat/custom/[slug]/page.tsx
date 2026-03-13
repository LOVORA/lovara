"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  customCharactersStorage,
  type StoredCharacterRecord,
} from "../../../../lib/custom-characters-storage";
import type { CustomCharacterTraitBadge } from "../../../../lib/custom-character-adapter";

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
      if (typeof item !== "object" || item === null) return null;

      const raw = item as Partial<ChatMessage>;

      if (
        (raw.role !== "user" && raw.role !== "assistant") ||
        typeof raw.content !== "string"
      ) {
        return null;
      }

      return {
        id: typeof raw.id === "string" ? raw.id : makeId("msg"),
        role: raw.role,
        content: raw.content,
        createdAt:
          typeof raw.createdAt === "string"
            ? raw.createdAt
            : new Date().toISOString(),
      };
    })
    .filter((item): item is ChatMessage => item !== null);
}

function readPersistedMessages(slug: string): ChatMessage[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(getConversationStorageKey(slug));
    if (!raw) return [];
    return normalizeStoredMessages(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writePersistedMessages(slug: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getConversationStorageKey(slug),
      JSON.stringify(messages)
    );
  } catch {
    // ignore
  }
}

function clearPersistedMessages(slug: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(getConversationStorageKey(slug));
  } catch {
    // ignore
  }
}

function getOpeningAssistantMessage(character: StoredCharacterRecord): ChatMessage {
  return {
    id: makeId("opening"),
    role: "assistant",
    content: character.greeting,
    createdAt: new Date().toISOString(),
  };
}

function ScenarioPanel({ character }: { character: StoredCharacterRecord }) {
  const rows = [
    { label: "Setting", value: clean(character.scenario?.setting) },
    {
      label: "Relationship",
      value: clean(character.scenario?.relationshipToUser),
    },
    { label: "Tone", value: clean(character.scenario?.tone) },
    { label: "Scene Goal", value: clean(character.scenario?.sceneGoal) },
    { label: "Opening State", value: clean(character.scenario?.openingState) },
  ].filter((item) => item.value);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
        Scene Context
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
              {row.label}
            </div>
            <div className="mt-1 text-sm leading-6 text-white/72">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CustomCharacterChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [character, setCharacter] = useState<StoredCharacterRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [banner, setBanner] = useState<BannerState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [missing, setMissing] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { slug } = await params;
      const saved = customCharactersStorage.getBySlug(slug);

      if (cancelled) return;

      if (!saved) {
        setMissing(true);
        return;
      }

      setCharacter(saved);

      const persisted = readPersistedMessages(saved.slug);
      if (persisted.length > 0) {
        setMessages(persisted);
      } else {
        setMessages([getOpeningAssistantMessage(saved)]);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!character) return;
    writePersistedMessages(character.slug, messages);
  }, [character, messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, submitting]);

  const traitBadges = useMemo<CustomCharacterTraitBadge[]>(
    () => character?.traitBadges?.slice(0, 5) ?? [],
    [character]
  );

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
    setBanner(null);

    try {
      const response = await fetch("/api/chat/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character,
          messages: nextMessages.map<ApiMessage>((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "Could not generate a reply.");
      }

      const assistantMessage: ChatMessage = {
        id: makeId("assistant"),
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setBanner({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not generate a reply.",
      });
      setMessages(nextMessages);
    } finally {
      setSubmitting(false);
    }
  };

  if (missing) {
    return (
      <main className="min-h-screen bg-[#070B14] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
          <h1 className="text-2xl font-semibold">Character not found</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            This custom character could not be loaded. It may have been removed from
            local storage.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/my-characters"
              className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Back to My Characters
            </Link>
            <Link
              href="/create-character"
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/15 hover:text-white"
            >
              Create New Character
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="min-h-screen bg-[#070B14] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
          Loading character…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/my-characters"
            className="text-sm text-white/60 transition hover:text-white"
          >
            ← Back to My Characters
          </Link>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetting ? "Resetting..." : "New Conversation"}
          </button>
        </div>

        {banner ? (
          <div
            className={cn(
              "mb-5 rounded-2xl border px-4 py-3 text-sm",
              banner.type === "success" &&
                "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
              banner.type === "error" &&
                "border-red-400/20 bg-red-500/10 text-red-100"
            )}
          >
            {banner.message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_360px]">
          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/15 bg-gradient-to-br from-fuchsia-500/30 via-violet-500/20 to-cyan-400/20 text-lg font-semibold text-white">
                  {character.avatarFallback || character.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold text-white">{character.name}</h1>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                      {character.archetype.replace(/-/g, " ")}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-white/65">{character.headline}</p>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
                    {character.previewMessage}
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={listRef}
              className="max-h-[62vh] space-y-4 overflow-y-auto px-6 py-6"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-6",
                    message.role === "assistant"
                      ? "border border-white/10 bg-white/7 text-white/82"
                      : "ml-auto border border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-50"
                  )}
                >
                  {message.content}
                </div>
              ))}

              {submitting ? (
                <div className="max-w-[85%] rounded-[24px] border border-white/10 bg-white/7 px-4 py-3 text-sm text-white/60">
                  {character.name} is thinking…
                </div>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={`Message ${character.name}...`}
                  rows={3}
                  className="min-h-[96px] flex-1 rounded-[24px] border border-white/10 bg-[#0B1020] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/20"
                />
                <button
                  type="submit"
                  disabled={submitting || !input.trim()}
                  className="self-end rounded-[24px] border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
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
                  {traitBadges.map((badge: CustomCharacterTraitBadge) => (
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
                          "border-white/10 bg-white/5 text-white/75"
                      )}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
