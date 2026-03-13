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

type InsightTab = "scene" | "identity" | "memory";

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

function formatArchetype(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function getCharacterAccentClass(archetype: string) {
  if (/(ice|queen|elegant|muse)/i.test(archetype)) {
    return "from-violet-500/30 via-fuchsia-500/20 to-sky-400/20";
  }

  if (/(sweet|nurturing|best)/i.test(archetype)) {
    return "from-amber-400/30 via-rose-400/20 to-fuchsia-400/20";
  }

  if (/(seducer|chaotic|possessive)/i.test(archetype)) {
    return "from-fuchsia-500/30 via-rose-500/20 to-orange-400/20";
  }

  return "from-cyan-500/30 via-violet-500/20 to-fuchsia-400/20";
}

function getStarterPrompts(character: StoredCharacterRecord): string[] {
  const setting = clean(character.scenario?.setting);
  const sceneGoal = clean(character.scenario?.sceneGoal);
  const relationship = clean(character.scenario?.relationshipToUser);

  return [
    setting ? `Lean into the ${setting} atmosphere.` : "Set the mood for this scene.",
    relationship
      ? `Play with the ${relationship} dynamic.`
      : "Show me how this character sees me.",
    sceneGoal
      ? `Push the scene toward: ${sceneGoal}.`
      : "Start with strong tension and momentum.",
  ];
}

function MiniStat({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/38">{label}</div>
      <div className="mt-1 text-sm leading-5 text-white/82">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-xs font-medium transition",
        active
          ? "border-white/20 bg-white/14 text-white"
          : "border-white/10 bg-white/[0.04] text-white/58 hover:border-white/15 hover:text-white/80"
      )}
    >
      {children}
    </button>
  );
}

function InsightPanel({
  activeTab,
  setActiveTab,
  character,
  traitBadges,
}: {
  activeTab: InsightTab;
  setActiveTab: (tab: InsightTab) => void;
  character: StoredCharacterRecord;
  traitBadges: CustomCharacterTraitBadge[];
}) {
  const sceneItems = [
    { label: "Setting", value: clean(character.scenario?.setting) },
    {
      label: "Relationship",
      value: clean(character.scenario?.relationshipToUser),
    },
    { label: "Scene goal", value: clean(character.scenario?.sceneGoal) },
    { label: "Tone", value: clean(character.scenario?.tone) },
    { label: "Opening", value: clean(character.scenario?.openingState) },
  ].filter((item) => item.value);

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/38">
            Character Panel
          </div>
          <div className="mt-1 text-base font-semibold text-white">Scene intelligence</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <TabButton active={activeTab === "scene"} onClick={() => setActiveTab("scene")}>
            Scene
          </TabButton>
          <TabButton active={activeTab === "identity"} onClick={() => setActiveTab("identity")}>
            Identity
          </TabButton>
          <TabButton active={activeTab === "memory"} onClick={() => setActiveTab("memory")}>
            Memory
          </TabButton>
        </div>
      </div>

      {activeTab === "scene" ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {sceneItems.length ? (
            sceneItems.map((item) => (
              <MiniStat key={item.label} label={item.label} value={item.value} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/58 sm:col-span-2">
              This character is open-ended, so the conversation can develop more freely.
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "identity" ? (
        <div className="mt-5 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
              Description
            </div>
            <p className="mt-2 text-sm leading-6 text-white/78">{character.description}</p>
          </div>

          {traitBadges.length ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Signature traits
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {traitBadges.map((badge) => (
                  <span
                    key={`${character.slug}-trait-${badge.label}`}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs",
                      badge.tone === "bold" &&
                        "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100",
                      badge.tone === "warm" &&
                        "border-amber-300/25 bg-amber-300/10 text-amber-100",
                      badge.tone === "soft" &&
                        "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
                      badge.tone === "mysterious" &&
                        "border-violet-300/25 bg-violet-300/10 text-violet-100",
                      badge.tone === "neutral" &&
                        "border-white/10 bg-white/[0.05] text-white/75"
                    )}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "memory" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
              Identity anchors
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-white/78">
              {(character.memorySeed.identity || []).slice(0, 4).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
              Behavior cues
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-white/78">
              {(character.memorySeed.behavior || []).slice(0, 4).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
              Scene anchors
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-white/78">
              {(character.memorySeed.scenario || []).slice(0, 4).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
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
  const [activeTab, setActiveTab] = useState<InsightTab>("scene");
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
    () => character?.traitBadges?.slice(0, 6) ?? [],
    [character]
  );

  const starterPrompts = useMemo<string[]>(() => {
    return character ? getStarterPrompts(character) : [];
  }, [character]);

  const assistantCount = useMemo(
    () => messages.filter((message) => message.role === "assistant").length,
    [messages]
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

  const injectStarterPrompt = (prompt: string) => {
    setInput(prompt);
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

  const accentClass = getCharacterAccentClass(character.archetype);

  return (
    <main className="min-h-screen bg-[#070B14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/my-characters" className="text-sm text-white/60 transition hover:text-white">
            ← Back to My Characters
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/create-character"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/15 hover:text-white"
            >
              New Character
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

        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-sm">
          <div className="border-b border-white/10 px-6 py-6 md:px-8">
            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border border-white/15 bg-gradient-to-br text-2xl font-semibold text-white",
                    accentClass
                  )}
                >
                  {character.avatarFallback || character.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/38">
                      Private character session
                    </div>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                      {formatArchetype(character.archetype)}
                    </span>
                  </div>

                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-[2rem]">
                    {character.name}
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">
                    {character.headline}
                  </p>

                  <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80">
                    {character.previewMessage}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <MiniStat label="Messages" value={`${messages.length}`} />
                <MiniStat label="Character replies" value={`${assistantCount}`} />
                <MiniStat
                  label="Last activity"
                  value={messages.length ? formatRelativeTime(messages[messages.length - 1].createdAt) : "Just now"}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="border-b border-white/10 xl:border-b-0 xl:border-r xl:border-white/10">
              <div
                ref={listRef}
                className="max-h-[64vh] space-y-4 overflow-y-auto px-6 py-6 md:px-8"
              >
                {messages.map((message, index) => {
                  const isAssistant = message.role === "assistant";
                  const showName = isAssistant && (index === 0 || messages[index - 1]?.role !== "assistant");

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex w-full",
                        isAssistant ? "justify-start" : "justify-end"
                      )}
                    >
                      <div className={cn("max-w-[88%]", isAssistant ? "" : "items-end") }>
                        {showName ? (
                          <div className="mb-2 ml-1 text-[11px] uppercase tracking-[0.18em] text-white/35">
                            {character.name}
                          </div>
                        ) : null}

                        <div
                          className={cn(
                            "rounded-[24px] px-4 py-3 text-sm leading-6 shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
                            isAssistant
                              ? "border border-white/10 bg-white/[0.06] text-white/84"
                              : "border border-fuchsia-400/20 bg-fuchsia-500/12 text-fuchsia-50"
                          )}
                        >
                          {message.content}
                        </div>

                        <div
                          className={cn(
                            "mt-1 px-1 text-[11px] text-white/32",
                            isAssistant ? "text-left" : "text-right"
                          )}
                        >
                          {formatRelativeTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {submitting ? (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-[24px] border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/60">
                      {character.name} is thinking…
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-white/10 px-6 py-5 md:px-8">
                {starterPrompts.length ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => injectStarterPrompt(prompt)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white/70 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                  <div className="rounded-[28px] border border-white/10 bg-[#0B1020] p-3">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={`Message ${character.name}...`}
                      rows={4}
                      className="min-h-[112px] w-full resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/28"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-2 pt-3">
                      <div className="text-xs text-white/40">
                        Stay in character, push the scene naturally, and avoid breaking tone.
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !input.trim()}
                        className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Send message
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>

            <aside className="space-y-5 px-6 py-6 md:px-8">
              <InsightPanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                character={character}
                traitBadges={traitBadges}
              />

              <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/38">
                  Backstory
                </div>
                <p className="mt-3 text-sm leading-6 text-white/74">{character.backstory}</p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
