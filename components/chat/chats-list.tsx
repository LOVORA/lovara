"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  createSupabaseStorageSigner,
  resolveCharacterImageMap,
} from "@/lib/character-image-assets";
import { normalizeVisibleHeadline } from "@/lib/custom-character-copy";
import { supabase } from "@/lib/supabase";
import { characters } from "@/lib/characters";

type ConversationItem = {
  id: string;
  user_id: string;
  character_slug: string;
  title: string;
  updated_at: string;
  created_at: string;
};

type MessagePreviewRow = {
  id: string;
  conversation_id: string;
  role: "assistant" | "user" | "system";
  content: string;
  created_at: string;
};

type BuiltInCharacter = {
  slug: string;
  name: string;
  role: string;
  image?: string;
  greeting?: string;
};

type SavedCustomCharacter = {
  id: string;
  slug: string;
  name: string;
  role: string;
  image?: string;
  greeting: string;
};

type ChatCard = {
  id: string;
  characterSlug: string;
  realSlug: string;
  isCustom: boolean;
  characterName: string;
  characterRole: string;
  characterImage?: string;
  updatedAt: string;
  createdAt: string;
  preview: string;
  href: string;
};

type SortMode = "recent" | "name";
type TypeFilter = "all" | "built-in" | "custom";

type ConversationMemoryLookupRow = {
  conversation_id: string;
  message_count: number | null;
};

type MessageCountLookupRow = {
  conversation_id: string;
};

type MemoryStateMap = Record<
  string,
  {
    isFresh: boolean;
    hasMemory: boolean;
    messageCount: number;
  }
>;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function parseCharacterSlug(characterSlug: string) {
  const isCustom = characterSlug.startsWith("custom:");
  const realSlug = isCustom ? characterSlug.slice("custom:".length) : characterSlug;

  return {
    isCustom,
    realSlug,
    href: isCustom ? `/chat/custom/${realSlug}` : `/chat/${realSlug}`,
  };
}

function getBuiltInGreeting(slug: string) {
  const builtInCharacter = characters.find((item) => item.slug === slug) as
    | BuiltInCharacter
    | undefined;

  return builtInCharacter?.greeting?.trim() || "The chat has been reset.";
}

function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warm" | "cyan";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]",
        tone === "neutral" && "border-white/10 bg-white/5 text-white/55",
        tone === "success" &&
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
        tone === "warm" &&
          "border-amber-400/20 bg-amber-400/10 text-amber-100",
        tone === "cyan" && "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
      )}
    >
      {label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="animate-pulse">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/10" />
              <div className="min-w-0 flex-1">
                <div className="h-6 w-40 rounded bg-white/10" />
                <div className="mt-3 h-4 w-28 rounded bg-white/10" />
                <div className="mt-4 h-4 w-full rounded bg-white/10" />
                <div className="mt-2 h-4 w-4/5 rounded bg-white/10" />
                <div className="mt-4 h-3 w-32 rounded bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasChats }: { hasChats: boolean }) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
        {hasChats ? "No Matches" : "No Chats Yet"}
      </div>
      <h3 className="mt-4 text-2xl font-semibold text-white">
        {hasChats ? "Nothing matched your filters." : "Your saved conversations will appear here."}
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
        {hasChats
          ? "Try another search term or switch the type filter."
          : "Start a conversation with a built-in or custom character, then come back here to continue it later."}
      </p>
      {!hasChats ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/characters"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
          >
            Ready characters
          </Link>
          <Link
            href="/create-character"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80"
          >
            Create character
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default function ChatsList() {
  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<ConversationItem[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [memoryMap, setMemoryMap] = useState<MemoryStateMap>({});
  const [customCharacters, setCustomCharacters] = useState<SavedCustomCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [resettingSlug, setResettingSlug] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  async function loadCustomCharacterLibrary(currentUserId: string) {
    const { data: customRows, error: customError } = await supabase
      .from("custom_characters")
      .select("id, slug, name, greeting, headline")
      .eq("user_id", currentUserId);

    if (customError || !Array.isArray(customRows)) {
      setCustomCharacters([]);
      return;
    }

    const imageRows =
      customRows.length === 0
        ? []
        : (((await supabase
            .from("character_images")
            .select(
              "character_id, storage_bucket, storage_path, public_url, is_primary, image_type, created_at",
            )
            .in(
              "character_id",
              customRows.map((row) => row.id),
            )
            .order("created_at", { ascending: false })).data ?? []) as Array<{
            character_id: string | null;
            storage_bucket?: string | null;
            storage_path?: string | null;
            public_url: string | null;
            is_primary?: boolean | null;
            image_type?: string | null;
            created_at?: string | null;
          }>);

    const imageMap =
      customRows.length === 0
        ? new Map<string, string>()
        : await resolveCharacterImageMap({
            rows: imageRows,
            signUrl: createSupabaseStorageSigner(supabase as never),
          });

    setCustomCharacters(
      customRows.map((row) => ({
        id: row.id,
        slug: typeof row.slug === "string" ? row.slug : "",
        name: typeof row.name === "string" ? row.name : "Custom character",
        role:
          normalizeVisibleHeadline(
            typeof row.headline === "string" ? row.headline : "",
          ) || "Custom character chat",
        image: imageMap.get(row.id) ?? undefined,
        greeting:
          typeof row.greeting === "string" && row.greeting.trim()
            ? row.greeting
            : "The conversation has been reset.",
      })),
    );
  }

  async function loadMemoryState(currentUserId: string, conversationIds: string[]) {
    if (conversationIds.length === 0) {
      setMemoryMap({});
      return;
    }

    try {
      const { data: memoryRowsRaw } = await supabase
        .from("conversation_memory_state")
        .select("conversation_id, message_count")
        .eq("user_id", currentUserId)
        .in("conversation_id", conversationIds);

      const memoryRows =
        (memoryRowsRaw as ConversationMemoryLookupRow[] | null) ?? [];

      const { data: messageRowsRaw } = await supabase
        .from("messages")
        .select("conversation_id")
        .eq("user_id", currentUserId)
        .in("conversation_id", conversationIds);

      const messageRows =
        (messageRowsRaw as MessageCountLookupRow[] | null) ?? [];

      const memoryByConversation = new Map<
        string,
        { messageCount: number; hasMemory: boolean }
      >();

      for (const row of memoryRows) {
        const count =
          typeof row.message_count === "number" ? row.message_count : 0;

        memoryByConversation.set(row.conversation_id, {
          messageCount: count,
          hasMemory: count > 1,
        });
      }

      const rawCountMap = new Map<string, number>();
      for (const row of messageRows) {
        rawCountMap.set(
          row.conversation_id,
          (rawCountMap.get(row.conversation_id) ?? 0) + 1,
        );
      }

      const nextMap: MemoryStateMap = {};

      for (const conversationId of conversationIds) {
        const stored = memoryByConversation.get(conversationId);
        const rawMessageCount = rawCountMap.get(conversationId) ?? 0;

        nextMap[conversationId] = {
          isFresh: rawMessageCount <= 1,
          hasMemory: stored?.hasMemory ?? rawMessageCount > 1,
          messageCount: stored?.messageCount ?? rawMessageCount,
        };
      }

      setMemoryMap(nextMap);
    } catch {
      setMemoryMap({});
    }
  }

  async function loadChats(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUserId(null);
      setChats([]);
      setPreviews({});
      setMemoryMap({});
      setMessage("You need to sign in to view your chats.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setUserId(user.id);
    await loadCustomCharacterLibrary(user.id);

    const { data: conversationRows, error: conversationError } = await supabase
      .from("conversations")
      .select("id, user_id, character_slug, title, updated_at, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (conversationError) {
      setChats([]);
      setPreviews({});
      setMemoryMap({});
      setMessage("Could not load your chats.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const loadedChats = (conversationRows as ConversationItem[] | null) ?? [];
    setChats(loadedChats);

    if (loadedChats.length === 0) {
      setPreviews({});
      setMemoryMap({});
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const conversationIds = loadedChats.map((chat) => chat.id);

    const { data: messageRows, error: messageError } = await supabase
      .from("messages")
      .select("id, conversation_id, role, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (messageError) {
      setPreviews({});
      await loadMemoryState(user.id, conversationIds);
      setMessage("Chats loaded, but message snippets could not be loaded.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const latestPreviewByConversation: Record<string, string> = {};

    for (const row of ((messageRows as MessagePreviewRow[] | null) ?? [])) {
      if (latestPreviewByConversation[row.conversation_id]) continue;
      if (row.role !== "assistant" && row.role !== "user") continue;
      latestPreviewByConversation[row.conversation_id] = row.content;
    }

    setPreviews(latestPreviewByConversation);
    await loadMemoryState(user.id, conversationIds);
    setLoading(false);
    setRefreshing(false);
  }

  const loadChatsOnMount = useEffectEvent(() => {
    void loadChats();
  });

  useEffect(() => {
    loadChatsOnMount();
  }, []);

  const chatCards = useMemo<ChatCard[]>(() => {
    return chats.map((chat) => {
      const parsed = parseCharacterSlug(chat.character_slug);

      const builtInCharacter = characters.find(
        (item) => item.slug === parsed.realSlug,
      ) as BuiltInCharacter | undefined;

      const customCharacter = customCharacters.find(
        (item) => item.slug === parsed.realSlug,
      );

      const resolvedCharacter = parsed.isCustom ? customCharacter : builtInCharacter;

      return {
        id: chat.id,
        characterSlug: chat.character_slug,
        realSlug: parsed.realSlug,
        isCustom: parsed.isCustom,
        characterName:
          resolvedCharacter?.name ??
          (parsed.isCustom ? parsed.realSlug : chat.character_slug),
        characterRole:
          resolvedCharacter?.role ??
          (parsed.isCustom ? "Custom character chat" : "Character chat"),
        characterImage: resolvedCharacter?.image,
        updatedAt: chat.updated_at,
        createdAt: chat.created_at,
        preview:
          previews[chat.id] ||
          "No messages yet. Open this chat to keep the conversation going.",
        href: parsed.href,
      };
    });
  }, [chats, previews, customCharacters]);

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    const next = chatCards.filter((chat) => {
      const typeMatch =
        typeFilter === "all"
          ? true
          : typeFilter === "custom"
            ? chat.isCustom
            : !chat.isCustom;

      const searchMatch = !query
        ? true
        : [
            chat.characterName,
            chat.characterSlug,
            chat.realSlug,
            chat.characterRole,
            chat.preview,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

      return typeMatch && searchMatch;
    });

    if (sortMode === "name") {
      return next.sort((a, b) => a.characterName.localeCompare(b.characterName));
    }

    return next.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [chatCards, search, typeFilter, sortMode]);

  const stats = useMemo(() => {
    const total = chatCards.length;
    const customCount = chatCards.filter((item) => item.isCustom).length;
    const builtInCount = total - customCount;
    const activeThisWeek = chatCards.filter((item) => {
      const updated = new Date(item.updatedAt).getTime();
      if (Number.isNaN(updated)) return false;
      return Date.now() - updated <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      total,
      customCount,
      builtInCount,
      activeThisWeek,
    };
  }, [chatCards]);

  async function handleDelete(characterSlug: string) {
    if (!userId || deletingSlug || resettingSlug) return;

    const confirmed = window.confirm(
      "This will delete your saved conversation for this character.\nContinue?",
    );

    if (!confirmed) return;

    setDeletingSlug(characterSlug);
    setMessage("");

    try {
      const affectedChatIds = chats
        .filter((chat) => chat.character_slug === characterSlug)
        .map((chat) => chat.id);

      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("user_id", userId)
        .eq("character_slug", characterSlug);

      if (error) {
        setMessage("Could not delete this chat.");
        return;
      }

      setChats((prev) => prev.filter((chat) => chat.character_slug !== characterSlug));

      setPreviews((prev) => {
        const next = { ...prev };
        for (const id of affectedChatIds) {
          delete next[id];
        }
        return next;
      });

      setMemoryMap((prev) => {
        const next = { ...prev };
        for (const id of affectedChatIds) {
          delete next[id];
        }
        return next;
      });

      setMessage("Chat removed.");
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while deleting this chat.");
    } finally {
      setDeletingSlug(null);
    }
  }

  async function handleReset(chat: ChatCard) {
    if (!userId || deletingSlug || resettingSlug) return;

    const confirmed = window.confirm(
      "This will clear the current conversation history and reset memory for this chat.\nContinue?",
    );

    if (!confirmed) return;

    setResettingSlug(chat.characterSlug);
    setMessage("");

    try {
      const matchingConversations = chats.filter(
        (item) => item.character_slug === chat.characterSlug,
      );

      const conversationIds = matchingConversations.map((item) => item.id);

      if (conversationIds.length === 0) {
        setMessage("Could not find the conversation to reset.");
        return;
      }

      const firstConversationId = conversationIds[0];
      const response = await fetch(
        chat.isCustom ? "/api/custom-chat/reset" : "/api/chat/reset",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(
            chat.isCustom
              ? { conversationId: firstConversationId }
              : { conversationId: firstConversationId, slug: chat.realSlug },
          ),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            messages?: Array<{ role?: string; content?: string }>;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        setMessage(payload?.error || "Could not reset this chat.");
        return;
      }

      const greeting =
        Array.isArray(payload.messages) &&
        typeof payload.messages[0]?.content === "string" &&
        payload.messages[0].content.trim()
          ? payload.messages[0].content.trim()
          : chat.isCustom
            ? customCharacters.find((item) => item.slug === chat.realSlug)?.greeting?.trim() ||
              "The chat has been reset."
            : getBuiltInGreeting(chat.realSlug);

      const nowIso = new Date().toISOString();
      setMessage("Reset completed. This chat is fresh again.");

      setPreviews((prev) => ({
        ...prev,
        [firstConversationId]: greeting,
      }));

      setMemoryMap((prev) => ({
        ...prev,
        [firstConversationId]: {
          isFresh: true,
          hasMemory: false,
          messageCount: 1,
        },
      }));

      setChats((prev) =>
        prev.map((item) =>
          item.id === firstConversationId
            ? {
                ...item,
                title: `Chat with ${chat.characterName}`,
                updated_at: nowIso,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while resetting this chat.");
    } finally {
      setResettingSlug(null);
    }
  }

  return (
    <div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Total
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {stats.total}
          </div>
          <div className="mt-2 text-sm text-white/55">Saved conversations</div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Custom
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {stats.customCount}
          </div>
          <div className="mt-2 text-sm text-white/55">Custom character chats</div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Built-in
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {stats.builtInCount}
          </div>
          <div className="mt-2 text-sm text-white/55">Built-in character chats</div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
            Active this week
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {stats.activeThisWeek}
          </div>
          <div className="mt-2 text-sm text-white/55">Recently updated sessions</div>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.55fr_0.55fr_auto]">
          <label className="block">
            <div className="mb-2 text-sm text-white/70">Search</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by character, role, or message..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/35"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm text-white/70">Type</div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
            >
              <option value="all">All chats</option>
              <option value="built-in">Ready-made only</option>
              <option value="custom">Custom only</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-2 text-sm text-white/70">Sort</div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
            >
              <option value="recent">Recently updated</option>
              <option value="name">Name</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => loadChats({ silent: true })}
              disabled={loading || refreshing || Boolean(resettingSlug)}
              className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refreshing ? "Refreshing..." : "Refresh list"}
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <div className="mt-6 rounded-[20px] border border-pink-400/15 bg-pink-500/10 px-4 py-3 text-sm text-pink-100">
          {message}
        </div>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <LoadingSkeleton />
        ) : filteredCards.length === 0 ? (
          <EmptyState hasChats={chatCards.length > 0} />
        ) : (
          <div className="grid gap-4">
            {filteredCards.map((chat) => {
              const memoryState = memoryMap[chat.id];

              return (
                <div
                  key={chat.id}
                  className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)] transition hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      {chat.characterImage ? (
                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10">
                          <Image
                            src={chat.characterImage}
                            alt={chat.characterName}
                            fill
                            className="object-contain bg-black/30 object-center"
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/25 to-fuchsia-500/20 text-lg font-semibold text-pink-200">
                          {chat.characterName.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-semibold text-white">
                            {chat.characterName}
                          </h3>

                          <StatusPill
                            label={chat.isCustom ? "Custom" : "Built-in"}
                            tone={chat.isCustom ? "cyan" : "neutral"}
                          />

                          {memoryState ? (
                            memoryState.isFresh ? (
                              <StatusPill label="Fresh chat" tone="warm" />
                            ) : memoryState.hasMemory ? (
                              <StatusPill label="Ongoing chat" tone="success" />
                            ) : (
                              <StatusPill label="Open chat" tone="success" />
                            )
                          ) : (
                            <StatusPill label="No saved history" />
                          )}
                        </div>

                        <p className="mt-1 text-sm text-white/60">{chat.characterRole}</p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/72">
                          {truncate(chat.preview, 220)}
                        </p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                              Status
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/68">
                              {!memoryState
                                ? "This chat exists, but it has not built much history yet."
                                : memoryState.isFresh
                                  ? "This chat is still close to its starting point."
                                  : memoryState.hasMemory
                                    ? `This thread is carrying ${memoryState.messageCount} saved messages.`
                                    : "This chat is active."}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                              Activity
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/68">
                              Updated {formatRelativeTime(chat.updatedAt)} • Private conversation
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                      <Link
                        href={chat.href}
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95"
                      >
                        Open chat
                      </Link>

                      <button
                        onClick={() => handleReset(chat)}
                        disabled={resettingSlug === chat.characterSlug || Boolean(deletingSlug)}
                        className="inline-flex items-center justify-center rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        {resettingSlug === chat.characterSlug ? "Resetting..." : "Reset"}
                      </button>

                      <button
                        onClick={() => handleDelete(chat.characterSlug)}
                        disabled={deletingSlug === chat.characterSlug || Boolean(resettingSlug)}
                        className="inline-flex items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {deletingSlug === chat.characterSlug ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
