"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
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
import {
  getIdentitySummary,
  getVisibilityFromPayload,
} from "@/lib/custom-character-studio";

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

type InsightTab = "scene" | "identity" | "engine";

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

function MiniStat({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 text-sm leading-6 text-white/75">{value}</div>
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
          : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
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
  const payload =
    typeof character.payload === "object" && character.payload
      ? (character.payload as Record<string, unknown>)
      : {};

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

  const identityItems = getIdentitySummary(payload);
  const visibility = getVisibilityFromPayload(payload);

  const engine =
    typeof payload.engine === "object" && payload.engine
      ? (payload.engine as Record<string, unknown>)
      : null;

  const systemPromptPreview =
    engine && typeof engine.systemPrompt === "string"
      ? engine.systemPrompt.slice(0, 500).trim()
      : "";

  return (
    <aside className="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap gap-3">
        <TabButton active={activeTab === "scene"} onClick={() => setActiveTab("scene")}>
          Scene
        </TabButton>
        <TabButton
          active={activeTab === "identity"}
          onClick={() => setActiveTab("identity")}
        >
          Identity
        </TabButton>
        <TabButton active={activeTab === "engine"} onClick={() => setActiveTab("engine")}>
          Engine
        </TabButton>
      </div>

      {activeTab === "scene" ? (
        sceneItems.length > 0 ? (
          <div className="grid gap-3">
            {sceneItems.map((item) => (
              <MiniStat key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
            No explicit scene data was added for this character.
          </div>
        )
      ) : null}

      {activeTab === "identity" ? (
        <div className="space-y-3">
          <MiniStat label="Archetype" value={character.archetype} />
          <MiniStat label="Visibility" value={visibility} />
          <MiniStat
            label="Identity anchors"
            value={identityItems.length > 0 ? identityItems.join(" • ") : "None"}
          />
          <MiniStat label="Headline" value={character.headline} />
        </div>
      ) : null}

      {activeTab === "engine" ? (
        <div className="space-y-3">
          <MiniStat
            label="Generated engine prompt"
            value={
              systemPromptPreview
                ? `${systemPromptPreview}${systemPromptPreview.length >= 500 ? "…" : ""}`
                : "No engine prompt saved on this character."
            }
          />
          <MiniStat
            label="Trait badges"
            value={
              character.trait_badges?.length
                ? character.trait_badges.map((item) => item.label).join(" • ")
                : "No trait badges"
            }
          />
        </div>
      ) : null}
    </aside>
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
  const [activeTab, setActiveTab] = useState<InsightTab>("scene");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const identitySummary = useMemo(() => {
    if (!character) return [];
    const payload =
      typeof character.payload === "object" && character.payload
        ? (character.payload as Record<string, unknown>)
        : {};
    return getIdentitySummary(payload);
  }, [character]);

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

      try {
        const loadedCharacter = await getMyCustomCharacterBySlug(slug);
        if (!loadedCharacter) {
          throw new Error("CHARACTER_NOT_FOUND");
        }

        const loadedConversation = await getOrCreateConversationForCharacter(
          loadedCharacter,
        );

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
  }, [slug]);

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

      setBanner({ type: "error", message });
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
      setBanner({ type: "error", message });
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
          <div className="mx-auto max-w-5xl rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-sm text-white/65">
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
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
            <section className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-8">
                <div className="text-xs uppercase tracking-[0.22em] text-fuchsia-200/80">
                  Custom Character
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  {character.name}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                  {character.headline || character.description}
                </p>

                {identitySummary.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {identitySummary.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/my-characters"
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    My characters
                  </Link>

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={resetting}
                    className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-100 transition hover:border-amber-400/35 hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {resetting ? "Resetting..." : "Reset"}
                  </button>
                </div>
              </div>

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

              <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Private chat
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                      Saved to your account conversation history
                    </div>
                  </div>
                </div>

                <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-[24px] border px-4 py-3",
                        message.role === "assistant"
                          ? "border-fuchsia-400/15 bg-fuchsia-400/10"
                          : "border-white/10 bg-black/25",
                      )}
                    >
                      <div className="text-sm whitespace-pre-wrap leading-7 text-white/85">
                        {message.content}
                      </div>
                      <div className="mt-2 text-xs text-white/35">
                        {formatRelativeTime(message.createdAt)}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-black/25 p-3">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Write your next message..."
                    rows={4}
                    className="w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/25"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || !input.trim()}
                      className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <InsightPanel
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              character={character}
            />
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
