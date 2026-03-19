"use client";

import Image from "next/image";
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

type InsightTab = "scene" | "identity" | "engine";
type SessionState = "fresh" | "active";
type RetentionState = "fresh-start" | "warming-up" | "settled-in" | "ongoing";
type SidebarConversationItem = {
  id: string;
  slug: string;
  name: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  imageUrl: string | null;
};
type PublicSampleItem = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  imageUrl: string | null;
};

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

function truncate(value: string | undefined, max = 88) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "AI";
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

function getCharacterSummary(character: DbCustomCharacter) {
  return (
    clean(character.preview_message) ||
    clean(character.headline) ||
    clean(character.description) ||
    "A private roleplay character ready for a more personal conversation."
  );
}

async function fetchPrimaryAvatarUrl(characterId: string): Promise<string | null> {
  const { data: imageRow, error: imageError } = await supabase
    .from("character_images")
    .select("public_url")
    .eq("character_id", characterId)
    .eq("is_primary", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const safeImageRow =
    typeof imageRow === "object" && imageRow !== null
      ? (imageRow as { public_url?: string | null })
      : null;

  if (imageError || !safeImageRow?.public_url) {
    return null;
  }

  return safeImageRow.public_url;
}

async function fetchPrimaryImageMap(characterIds: string[]): Promise<Map<string, string>> {
  if (characterIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("character_images")
    .select("character_id, public_url, created_at")
    .in("character_id", characterIds)
    .eq("is_primary", true)
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    return new Map();
  }

  const result = new Map<string, string>();

  for (const row of data as Array<{ character_id?: string; public_url?: string | null }>) {
    if (!row.character_id || !row.public_url || result.has(row.character_id)) continue;
    result.set(row.character_id, row.public_url);
  }

  return result;
}

async function fetchSidebarConversations(): Promise<SidebarConversationItem[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const { data: conversations, error: conversationsError } = await supabase
    .from("custom_conversations")
    .select("id, custom_character_id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(14);

  if (conversationsError || !conversations?.length) {
    return [];
  }

  const characterIds = conversations
    .map((item) => item.custom_character_id)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const conversationIds = conversations
    .map((item) => item.id)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const [{ data: characters }, { data: messages }, imageMap] = await Promise.all([
    supabase
      .from("custom_characters")
      .select("id, slug, name")
      .eq("user_id", user.id)
      .in("id", characterIds),
    supabase
      .from("custom_messages")
      .select("conversation_id, content, created_at")
      .eq("user_id", user.id)
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
    fetchPrimaryImageMap(characterIds),
  ]);

  const characterMap = new Map(
    (characters ?? []).map((item) => [
      item.id,
      {
        slug: typeof item.slug === "string" ? item.slug : "",
        name: typeof item.name === "string" ? item.name : "Character",
        imageUrl: imageMap.get(item.id) ?? null,
      },
    ]),
  );

  const lastMessageMap = new Map<string, { content: string; createdAt: string }>();
  for (const item of messages ?? []) {
    if (lastMessageMap.has(item.conversation_id)) continue;
    lastMessageMap.set(item.conversation_id, {
      content: typeof item.content === "string" ? item.content : "",
      createdAt: typeof item.created_at === "string" ? item.created_at : "",
    });
  }

  return conversations.map((item) => {
    const match = characterMap.get(item.custom_character_id);
    const lastMessage = lastMessageMap.get(item.id);

    return {
      id: item.id,
      slug: match?.slug || "",
      name: match?.name || (typeof item.title === "string" ? item.title : "Character"),
      title: typeof item.title === "string" ? item.title : match?.name || "Character",
      lastMessage: truncate(lastMessage?.content || "No messages yet.", 72),
      updatedAt: lastMessage?.createdAt || (typeof item.updated_at === "string" ? item.updated_at : ""),
      imageUrl: match?.imageUrl ?? null,
    };
  });
}

async function fetchPublicSamples(): Promise<PublicSampleItem[]> {
  const { data, error } = await supabase
    .from("custom_characters")
    .select("id, slug, name, headline, description, payload")
    .eq("payload->>visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(4);

  if (error || !data) {
    return [];
  }

  const imageMap = await fetchPrimaryImageMap(
    data
      .map((item) => item.id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );

  return data.map((item) => ({
    id: item.id,
    slug: typeof item.slug === "string" ? item.slug : "",
    name: typeof item.name === "string" ? item.name : "Character",
    summary: truncate(
      (typeof item.headline === "string" && item.headline) ||
        (typeof item.description === "string" && item.description) ||
        "Open the public card to see the full vibe.",
      82,
    ),
    imageUrl: imageMap.get(item.id) ?? null,
  }));
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
  const openingData = getOpeningData(character);

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
        sceneItems.length > 0 || openingData.openingSummary || openingData.openingBeat ? (
          <div className="grid gap-3">
            {openingData.openingSummary ? (
              <MiniStat label="Opening summary" value={openingData.openingSummary} />
            ) : null}
            {openingData.openingBeat ? (
              <MiniStat label="Opening beat" value={openingData.openingBeat} />
            ) : null}
            {sceneItems.map((item) => (
              <MiniStat key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
            No scene details were added yet.
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
                : "No saved prompt yet."
            }
          />
          <MiniStat
            label="Trait badges"
            value={
              character.trait_badges?.length
                ? character.trait_badges.map((item) => item.label).join(" • ")
                : "No saved traits"
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
  const [justReset, setJustReset] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [sidebarChats, setSidebarChats] = useState<SidebarConversationItem[]>([]);
  const [publicSamples, setPublicSamples] = useState<PublicSampleItem[]>([]);
  const [sceneSetup, setSceneSetup] = useState("");
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
  const characterSummary = useMemo(
    () => (character ? getCharacterSummary(character) : ""),
    [character],
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

  useEffect(() => {
    let cancelled = false;

    async function loadSidebar() {
      try {
        const [nextChats, nextPublicSamples] = await Promise.all([
          fetchSidebarConversations(),
          fetchPublicSamples(),
        ]);

        if (cancelled) return;

        setSidebarChats(nextChats);
        setPublicSamples(nextPublicSamples);
      } catch {
        if (cancelled) return;
        setSidebarChats([]);
        setPublicSamples([]);
      }
    }

    void loadSidebar();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      if (!character?.id) {
        setCurrentAvatarUrl(null);
        return;
      }

      try {
        const nextUrl = await fetchPrimaryAvatarUrl(character.id);
        if (!cancelled) setCurrentAvatarUrl(nextUrl);
      } catch {
        if (!cancelled) setCurrentAvatarUrl(null);
      }
    }

    void loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [character?.id]);

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
      await insertConversationMessage(conversation.id, "user", trimmed);

      const latestBeforeReply = await listConversationMessages(conversation.id);
      const apiMessages = latestBeforeReply.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token ?? "";

      const response = await fetch("/api/chat/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          accessToken,
          liveScenario: sceneSetup,
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

      await refreshMessages(conversation.id);
      const nextChats = await fetchSidebarConversations();
      setSidebarChats(nextChats);
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
      setJustReset(true);
      const nextChats = await fetchSidebarConversations();
      setSidebarChats(nextChats);
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
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 md:py-8">
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
            <aside className="space-y-5">
              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-200/80">
                  Workspace
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/"
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    Home
                  </Link>
                  <Link
                    href="/my-profile"
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/my-characters"
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    Library
                  </Link>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
                <div className="mb-4 flex items-center justify-between gap-3 px-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Chats
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                      Last message and avatar stay visible here.
                    </div>
                  </div>
                  <Link
                    href="/my-characters"
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:border-white/20 hover:bg-white/10"
                  >
                    Library
                  </Link>
                </div>

                <div className="space-y-2">
                  {sidebarChats.length > 0 ? (
                    sidebarChats.map((item) => {
                      const active = item.slug === character.slug;

                      return (
                        <Link
                          key={item.id}
                          href={item.slug ? `/chat/custom/${item.slug}` : "/my-characters"}
                          className={cn(
                            "flex items-center gap-3 rounded-[24px] border p-3 transition",
                            active
                              ? "border-fuchsia-400/30 bg-fuchsia-400/10"
                              : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]",
                          )}
                        >
                          <div className="relative h-14 w-14 overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                unoptimized
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/80">
                                {getInitials(item.name)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="truncate text-sm font-medium text-white">
                                {item.name}
                              </div>
                              <div className="shrink-0 text-[11px] text-white/35">
                                {formatRelativeTime(item.updatedAt)}
                              </div>
                            </div>
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/55">
                              {item.lastMessage}
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
                      Your chats will appear here as soon as you open them.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
                <div className="mb-4 px-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">
                    Community picks
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    Public characters shared by other users.
                  </div>
                </div>

                <div className="space-y-3">
                  {publicSamples.map((item) => (
                    <Link
                      key={item.id}
                      href={item.slug ? `/community/${item.slug}` : "/community"}
                      className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-3 transition hover:border-white/15 hover:bg-white/[0.05]"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            unoptimized
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/80">
                            {getInitials(item.name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{item.name}</div>
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/55">
                          {item.summary}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>

            <section className="space-y-5">
              <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-200/80">
                      Chat room
                    </div>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                      {character.name}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">
                      {character.headline || character.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label="Private chat saved" />
                    <StatusBadge
                      label={getRetentionLabel(retentionState)}
                      tone={
                        retentionState === "fresh-start" ||
                        retentionState === "warming-up"
                          ? "warm"
                          : "success"
                      }
                    />
                    {justReset ? <StatusBadge label="Reset completed" tone="success" /> : null}
                  </div>
                </div>

                {identitySummary.length > 0 ? (
                  <div className="relative mt-4 flex flex-wrap gap-2">
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

                <div className="relative mt-5 flex flex-wrap gap-3">
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
                    {resetting ? "Resetting..." : "Reset chat"}
                  </button>
                </div>
                <div className="relative mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">
                  {sessionState === "fresh"
                    ? `${character.name} is ready with the opening scene. ${getRetentionHint(retentionState)}`
                    : `You are back inside the same thread with ${character.name}. ${getRetentionHint(retentionState)}`}
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

              <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Conversation
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                      Messages stay linked to this character and continue as one thread.
                    </div>
                  </div>
                </div>

                <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-[26px] border px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.12)]",
                        message.role === "assistant"
                          ? "mr-8 border-fuchsia-400/15 bg-[linear-gradient(180deg,rgba(244,114,182,0.14),rgba(244,114,182,0.08))]"
                          : "ml-8 border-white/10 bg-black/25",
                      )}
                    >
                      <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/35">
                        {message.role === "assistant" ? character.name : "You"}
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-7 text-white/85">
                        {message.content}
                      </div>
                      <div className="mt-2 text-xs text-white/35">
                        {formatRelativeTime(message.createdAt)}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div className="mt-5 rounded-[28px] border border-white/10 bg-black/25 p-3">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      sessionState === "fresh"
                        ? "Start with something simple. The character already knows the scene."
                        : "Pick up where this thread left off..."
                    }
                    rows={4}
                    className="w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/25"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-white/40">
                      {sessionState === "fresh"
                        ? "A direct first line usually works best."
                        : getRetentionHint(retentionState)}
                    </div>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || !input.trim()}
                      className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black shadow-[0_14px_40px_rgba(255,255,255,0.1)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {sending ? "Sending..." : "Send message"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
                <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
                  {currentAvatarUrl ? (
                    <Image
                      src={currentAvatarUrl}
                      alt={`${character.name} avatar`}
                      fill
                      unoptimized
                      sizes="(min-width: 1280px) 360px, 100vw"
                      className="object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full w-full items-end p-6">
                      <div className="rounded-[28px] border border-white/10 bg-black/35 px-5 py-4 backdrop-blur">
                        <div className="text-sm font-medium text-white">{character.name}</div>
                        <div className="mt-1 text-xs text-white/55">
                          Avatar will appear here after generation.
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.72),transparent_45%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="rounded-[24px] border border-white/10 bg-black/30 p-4 backdrop-blur">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/70">
                        Character snapshot
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">{character.name}</div>
                      <div className="mt-2 text-sm leading-6 text-white/72">{characterSummary}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                    Relationship
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/78">
                    {clean(character.scenario?.relationshipToUser) || "Open-ended dynamic"}
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                    Scene
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/78">
                    {clean(character.scenario?.setting) || "Private scene ready"}
                  </div>
                </div>
              </div>

              {(openingData.openingSummary || openingData.openingBeat) ? (
                <div className="grid gap-3">
                  {openingData.openingSummary ? (
                    <div className="rounded-[28px] border border-fuchsia-400/15 bg-fuchsia-400/8 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/70">
                        Opening summary
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/80">
                        {openingData.openingSummary}
                      </div>
                    </div>
                  ) : null}
                  {openingData.openingBeat ? (
                    <div className="rounded-[28px] border border-cyan-400/15 bg-cyan-400/8 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">
                        Scene pulse
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/80">
                        {openingData.openingBeat}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                  Scene setup
                </div>
                <div className="mt-2 text-sm leading-6 text-white/65">
                  Add a short scene note here. The character will stay closer to this role, mood, and moment while replying.
                </div>
                <textarea
                  value={sceneSetup}
                  onChange={(event) => setSceneSetup(event.target.value)}
                  rows={5}
                  placeholder="Example: We are alone after a tense argument. She wants control of the moment but is still emotionally affected."
                  className="mt-3 w-full resize-none rounded-[22px] border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25"
                />
              </div>

              <InsightPanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                character={character}
              />
            </aside>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
