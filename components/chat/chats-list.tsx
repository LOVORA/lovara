"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { characters } from "@/lib/characters";
import { getCustomCharacters } from "@/lib/custom-characters-storage";

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
  slug: string;
  name?: string;
  role?: string;
  image?: string;
  greeting?: string;
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

  return builtInCharacter?.greeting?.trim() || "The conversation has been reset.";
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
            Explore characters
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

  useEffect(() => {
    try {
      const saved = getCustomCharacters();
      setCustomCharacters(Array.isArray(saved) ? (saved as SavedCustomCharacter[]) : []);
    } catch (error) {
      console.error(error);
      setCustomCharacters([]);
    }
  }, []);

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
      setMessage("Chats loaded, but previews could not be loaded.");
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

  useEffect(() => {
    loadChats();
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
          (parsed.isCustom ? "Custom character chat" : "Private character chat"),
        characterImage: resolvedCharacter?.image,
        updatedAt: chat.updated_at,
        createdAt: chat.created_at,
        preview:
          previews[chat.id] ||
          "No messages yet. Open this chat to continue the conversation.",
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

      setMessage("Chat deleted successfully.");
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

      const { error: deleteMessagesError } = await supabase
        .from("messages")
        .delete()
        .in("conversation_id", conversationIds)
        .eq("user_id", userId);

      if (deleteMessagesError) {
        setMessage(`Could not reset chat messages: ${deleteMessagesError.message}`);
        return;
      }

      const { error: deleteMemoryError } = await supabase
        .from("conversation_memory_state")
        .delete()
        .in("conversation_id", conversationIds)
        .eq("user_id", userId);

      if (deleteMemoryError) {
        setMessage(`Messages cleared, but memory reset failed: ${deleteMemoryError.message}`);
        return;
      }

      const greeting = chat.isCustom
        ? customCharacters.find((item) => item.slug === chat.realSlug)?.greeting?.trim() ||
          "The conversation has been reset."
        : getBuiltInGreeting(chat.realSlug);

      const firstConversationId = conversationIds[0];

      const { error: insertGreetingError } = await supabase.from("messages").insert({
        conversation_id: firstConversationId,
        user_id: userId,
        role: "assistant",
        content: greeting,
      });

      if (insertGreetingError) {
        setMessage(`Chat reset, but greeting could not be restored: ${insertGreetingError.message}`);
        return;
      }

      const nowIso = new Date().toISOString();

      const { error: updateConversationError } = await supabase
        .from("conversations")
        .update({
          title: `Chat with ${chat.characterName}`,
          updated_at: nowIso,
        })
        .eq("id", firstConversationId)
        .eq("user_id", userId);

      if (updateConversationError) {
        setMessage("Chat reset, but conversation metadata could not be updated.");
      } else {
        setMessage("Reset completed. This chat is fresh again.");
      }

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
              placeholder="Search by character, role, or preview..."
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
              <option value="built-in">Built-in only</option>
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
              {refreshing ? "Refreshing..." : "Refresh"}
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
                            className="object-cover"
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
                              <StatusPill label="Memory active" tone="success" />
                            ) : (
                              <StatusPill label="Active chat" tone="success" />
                            )
                          ) : (
                            <StatusPill label="No active memory" />
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
                                ? "Conversation exists, but no memory state is stored yet."
                                : memoryState.isFresh
                                  ? "This chat is fresh and near its starting state."
                                  : memoryState.hasMemory
                                    ? `Memory is active across ${memoryState.messageCount} messages.`
                                    : "Conversation is active."}
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
