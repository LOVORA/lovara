"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ensureGreetingMessage,
  getMyCustomCharacterBySlug,
  getOrCreateConversationForCharacter,
  insertConversationMessage,
  listConversationMessages,
  resetConversation,
  type DbCustomCharacter,
  type DbCustomConversation,
  type DbCustomMessage,
} from "@/lib/account";

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

type InsightTab = "scene" | "identity" | "memory";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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

function getStarterPrompts(character: DbCustomCharacter): string[] {
  const setting = clean(character.scenario?.setting);
  const sceneGoal = clean(character.scenario?.sceneGoal);
  const relationship = clean(character.scenario?.relationshipToUser);

  return [
    setting ? `Lean into the ${setting} atmosphere.` : "Set the scene naturally.",
    relationship
      ? `Play with the ${relationship} dynamic.`
      : "Show how this character sees me.",
    sceneGoal
      ? `Move the scene toward ${sceneGoal}.`
      : "Create tension and momentum.",
  ];
}

function MiniStat({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 text-sm text-white/75">{value}</div>
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
        "rounded-full px-4 py-2 text-sm transition",
        active
          ? "bg-white text-black"
          : "border border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/10",
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
}: {
  activeTab: InsightTab;
  setActiveTab: (tab: InsightTab) => void;
  character: DbCustomCharacter;
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
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <TabButton
          active={activeTab === "scene"}
          onClick={() => setActiveTab("scene")}
        >
          Scene
        </TabButton>
        <TabButton
          active={activeTab === "identity"}
          onClick={() => setActiveTab("identity")}
        >
          Identity
        </TabButton>
        <TabButton
          active={activeTab === "memory"}
          onClick={() => setActiveTab("memory")}
        >
          Memory
        </TabButton>
      </div>

      <div className="mt-5 space-y-4">
        {activeTab === "scene" ? (
          sceneItems.length > 0 ? (
            <div className="grid gap-3">
              {sceneItems.map((item) => (
                <MiniStat key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/50">
              No explicit scene data was added for this character.
            </p>
          )
        ) : null}

        {activeTab === "identity" ? (
          <div className="space-y-4">
            <MiniStat label="Headline" value={clean(character.headline)} />
            <MiniStat label="Description" value={clean(character.description)} />
            <MiniStat label="Backstory" value={clean(character.backstory)} />
          </div>
        ) : null}

        {activeTab === "memory" ? (
          <div className="space-y-4">
            <MiniStat
              label="Greeting"
              value={clean(character.greeting) || "No greeting stored."}
            />
            <MiniStat
              label="Preview"
              value={
                clean(character.preview_message) || "No preview message stored."
              }
            />
            <MiniStat
              label="Tags"
              value={
                character.tags?.length ? character.tags.join(" • ") : "No tags"
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CustomCharacterChatPage({
  params,
}: {
  params: { slug: string };
}) {
  const [character, setCharacter] = useState<DbCustomCharacter | null>(null);
  const [conversation, setConversation] = useState<DbCustomConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [activeTab, setActiveTab] = useState<InsightTab>("scene");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const starterPrompts = useMemo(
    () => (character ? getStarterPrompts(character) : []),
    [character],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setBanner(null);

      try {
        const loadedCharacter = await getMyCustomCharacterBySlug(params.slug);

        if (!loadedCharacter) {
          throw new Error("CHARACTER_NOT_FOUND");
        }

        const loadedConversation =
          await getOrCreateConversationForCharacter(loadedCharacter);

        const seededMessages = await ensureGreetingMessage(
          loadedConversation.id,
          loadedCharacter.greeting,
        );

        if (cancelled) return;

        setCharacter(loadedCharacter);
        setConversation(loadedConversation);
        setMessages(seededMessages.map(mapDbMessage));
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
  }, [params.slug]);

  async function refreshMessages(conversationId: string) {
    const latest = await listConversationMessages(conversationId);
    setMessages(latest.map(mapDbMessage));
  }

  async function handleSend() {
    if (!character || !conversation) return;
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setBanner(null);

    const optimisticUserMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticUserMessage]);
    setInput("");

    try {
      await insertConversationMessage(conversation.id, "user", trimmed);

      const latestBeforeReply = await listConversationMessages(conversation.id);
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
            engine:
              typeof character.payload === "object" && character.payload
                ? (character.payload as Record<string, unknown>).engine ?? null
                : null,
          },
          messages: apiMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.reply) {
        throw new Error(data?.error || "Could not generate reply.");
      }

      await insertConversationMessage(conversation.id, "assistant", data.reply);
      await refreshMessages(conversation.id);
    } catch (error) {
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticUserMessage.id),
      );

      const message =
        error instanceof Error ? error.message : "Could not send message.";

      setBanner({
        type: "error",
        message,
      });
    } finally {
      setSending(false);
    }
  }

  async function handleReset() {
    if (!character || !conversation || resetting) return;

    setResetting(true);
    setBanner(null);

    try {
      const nextMessages = await resetConversation(
        conversation.id,
        character.greeting,
      );

      setMessages(nextMessages.map(mapDbMessage));
      setBanner({
        type: "success",
        message: "Conversation reset successfully.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not reset conversation.";

      setBanner({
        type: "error",
        message,
      });
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
          <div className="mx-auto max-w-6xl rounded-[28px] border border-white/10 bg-white/5 p-8 text-sm text-white/60">
            Loading custom chat...
          </div>
        </main>
      </AuthGuard>
    );
  }

  if (!character || !conversation) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-8">
            <h1 className="text-2xl font-semibold">Chat unavailable</h1>
            <p className="mt-3 text-sm text-rose-100/85">
              {banner?.message || "This character could not be loaded."}
            </p>
            <div className="mt-6">
              <Link
                href="/my-characters"
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
              >
                Back to my characters
              </Link>
            </div>
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <aside className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-white/5 to-cyan-400/10 p-6 shadow-2xl shadow-fuchsia-500/10">
                <div className="text-xs uppercase tracking-[0.2em] text-fuchsia-200/85">
                  Custom Character
                </div>
                <h1 className="mt-3 text-3xl font-semibold">{character.name}</h1>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  {character.headline || character.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(character.tags ?? []).slice(0, 6).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <MiniStat label="Archetype" value={clean(character.archetype)} />
                  <MiniStat
                    label="Updated"
                    value={formatRelativeTime(character.updated_at)}
                  />
                </div>
              </div>

              <InsightPanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                character={character}
              />

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <div className="text-sm font-medium text-white">
                  Scene starters
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left text-sm text-white/72 transition hover:border-white/20 hover:bg-black/35"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="flex min-h-[78vh] flex-col rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-sm font-medium text-white">
                    Private chat
                  </div>
                  <div className="text-xs text-white/45">
                    Saved to your account conversation history
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/my-characters"
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    My characters
                  </Link>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={resetting}
                    className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-100 transition hover:border-amber-400/30 hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {resetting ? "Resetting..." : "Reset"}
                  </button>
                </div>
              </div>

              {banner ? (
                <div
                  className={cn(
                    "mx-5 mt-4 rounded-2xl border px-4 py-3 text-sm",
                    banner.type === "success"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-100",
                  )}
                >
                  {banner.message}
                </div>
              ) : null}

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-7",
                      message.role === "assistant"
                        ? "border border-white/10 bg-black/30 text-white/85"
                        : "ml-auto bg-white text-black",
                    )}
                  >
                    <div>{message.content}</div>
                    <div
                      className={cn(
                        "mt-2 text-[11px]",
                        message.role === "assistant"
                          ? "text-white/35"
                          : "text-black/45",
                      )}
                    >
                      {formatRelativeTime(message.createdAt)}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-white/10 p-5">
                <div className="flex gap-3">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Message ${character.name}...`}
                    rows={3}
                    className="min-h-[64px] flex-1 rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/30 focus:bg-black/40"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    className="self-end rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
