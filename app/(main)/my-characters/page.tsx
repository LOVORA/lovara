"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  deleteMyCustomCharacter,
  listMyCustomCharacters,
  type DbCustomCharacter,
} from "@/lib/account";
import type { Json } from "@/types/supabase";
import { supabase } from "@/lib/supabase";
import {
  getIdentitySummary,
  getPublicShareHref,
  getVisibilityFromPayload,
} from "@/lib/custom-character-studio";

const AuthGuard = dynamic(() => import("@/components/auth/auth-guard"), {
  ssr: false,
});

type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

type SortMode = "recent" | "name" | "scene";
type VisibilityFilter = "all" | "public" | "private";

type MemoryStateMap = Record<
  string,
  {
    hasConversation: boolean;
    isFresh: boolean;
    hasMemory: boolean;
    conversationId?: string;
    messageCount?: number;
  }
>;

type CustomConversationLookupRow = {
  id: string;
  custom_character_id: string;
};

type ConversationMemoryLookupRow = {
  conversation_id: string;
  message_count: number | null;
};

type CustomMessageLookupRow = {
  conversation_id: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatRelativeDate(value?: string): string {
  if (!value) return "Recently updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";

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

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function getScenarioSummary(character: DbCustomCharacter) {
  const parts = [
    character.scenario?.setting,
    character.scenario?.relationshipToUser,
    character.scenario?.sceneGoal,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Open-ended roleplay dynamic";
}

function safePayload(character: DbCustomCharacter): Record<string, unknown> {
  return typeof character.payload === "object" && character.payload
    ? (character.payload as Record<string, unknown>)
    : {};
}

function matchesSearch(character: DbCustomCharacter, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const fields = [
    character.name,
    character.archetype,
    character.headline,
    character.description,
    character.greeting,
    character.backstory,
    character.scenario?.setting,
    character.scenario?.relationshipToUser,
    character.scenario?.sceneGoal,
    character.scenario?.tone,
    ...(character.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return fields.includes(q);
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_10px_50px_rgba(0,0,0,0.16)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-2 text-sm leading-6 text-white/55">{helper}</div>
    </div>
  );
}

function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warm" | "cyan" | "danger";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.14em] uppercase",
        tone === "neutral" && "border-white/10 bg-white/5 text-white/68",
        tone === "success" &&
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
        tone === "warm" &&
          "border-amber-400/20 bg-amber-400/10 text-amber-100",
        tone === "cyan" &&
          "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
        tone === "danger" &&
          "border-rose-400/20 bg-rose-400/10 text-rose-100",
      )}
    >
      {label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6"
        >
          <div className="animate-pulse">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="h-6 w-24 rounded-full bg-white/10" />
                <div className="mt-4 h-8 w-48 rounded-xl bg-white/10" />
                <div className="mt-3 h-4 w-full rounded bg-white/10" />
                <div className="mt-2 h-4 w-4/5 rounded bg-white/10" />
              </div>
              <div className="h-4 w-24 rounded bg-white/10" />
            </div>

            <div className="mt-5 h-24 rounded-2xl bg-white/10" />
            <div className="mt-4 flex gap-2">
              <div className="h-7 w-20 rounded-full bg-white/10" />
              <div className="h-7 w-20 rounded-full bg-white/10" />
              <div className="h-7 w-20 rounded-full bg-white/10" />
            </div>
            <div className="mt-6 flex gap-3">
              <div className="h-10 w-24 rounded-full bg-white/10" />
              <div className="h-10 w-28 rounded-full bg-white/10" />
              <div className="h-10 w-24 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyVaultState() {
  return (
    <div className="rounded-[34px] border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <div className="text-xs uppercase tracking-[0.22em] text-fuchsia-200/80">
        Studio Ready
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-white">
        Your character vault is empty.
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
        Create your first character, save it to your account, and come back here
        to manage visibility, public sharing, and chat continuity.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/create-character"
          className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
        >
          Create first character
        </Link>
        <Link
          href="/characters"
          className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80"
        >
          Explore public characters
        </Link>
      </div>
    </div>
  );
}

function EmptyResultsState({ query }: { query: string }) {
  return (
    <div className="rounded-[34px] border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
        No Results
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-white">
        Nothing matched your filters.
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
        No saved characters matched{" "}
        <span className="text-white/85">“{query || "your current filters"}”</span>.
        Try another name, tag, or visibility filter.
      </p>
    </div>
  );
}

export default function MyCharactersPage() {
  const [characters, setCharacters] = useState<DbCustomCharacter[]>([]);
  const [memoryMap, setMemoryMap] = useState<MemoryStateMap>({});
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [banner, setBanner] = useState<BannerState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadMemoryState(charactersList: DbCustomCharacter[]) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || charactersList.length === 0) {
        setMemoryMap({});
        return;
      }

      const characterIds = charactersList.map((item) => item.id);

      const { data: conversationsRaw, error: conversationsError } = await supabase
        .from("custom_conversations")
        .select("id, custom_character_id")
        .eq("user_id", user.id)
        .in("custom_character_id", characterIds);

      const conversations =
        (conversationsRaw as CustomConversationLookupRow[] | null) ?? [];

      if (conversationsError) {
        setMemoryMap({});
        return;
      }

      if (conversations.length === 0) {
        setMemoryMap({});
        return;
      }

      const conversationIds = conversations.map((item) => item.id);

      const { data: memoryRowsRaw } = await supabase
        .from("conversation_memory_state")
        .select("conversation_id, message_count")
        .eq("user_id", user.id)
        .in("conversation_id", conversationIds);

      const memoryRows =
        (memoryRowsRaw as ConversationMemoryLookupRow[] | null) ?? [];

      const { data: messageRowsRaw } = await supabase
        .from("custom_messages")
        .select("conversation_id")
        .eq("user_id", user.id)
        .in("conversation_id", conversationIds);

      const messageRows =
        (messageRowsRaw as CustomMessageLookupRow[] | null) ?? [];

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

      const messageCountMap = new Map<string, number>();
      for (const row of messageRows) {
        messageCountMap.set(
          row.conversation_id,
          (messageCountMap.get(row.conversation_id) ?? 0) + 1,
        );
      }

      const nextMap: MemoryStateMap = {};

      for (const conversation of conversations) {
        const stored = memoryByConversation.get(conversation.id);
        const rawMessageCount = messageCountMap.get(conversation.id) ?? 0;

        nextMap[conversation.custom_character_id] = {
          hasConversation: true,
          isFresh: rawMessageCount <= 1,
          hasMemory: stored?.hasMemory ?? rawMessageCount > 1,
          conversationId: conversation.id,
          messageCount: stored?.messageCount ?? rawMessageCount,
        };
      }

      setMemoryMap(nextMap);
    } catch {
      setMemoryMap({});
    }
  }

  async function loadCharacters(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setBanner(null);

    try {
      const data = await listMyCustomCharacters();
      setCharacters(data);
      await loadMemoryState(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load your characters.";

      setBanner({
        type: "error",
        message:
          message === "AUTH_REQUIRED"
            ? "You need to log in to view your characters."
            : message,
      });
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    loadCharacters();
  }, []);

  async function handleDelete(character: DbCustomCharacter) {
    const confirmed = window.confirm(
      `Delete "${character.name}" from this account?`,
    );
    if (!confirmed) return;

    setDeletingId(character.id);
    setBanner(null);

    try {
      await deleteMyCustomCharacter(character.id);
      setCharacters((current) => current.filter((item) => item.id !== character.id));
      setMemoryMap((current) => {
        const next = { ...current };
        delete next[character.id];
        return next;
      });
      setBanner({ type: "success", message: `"${character.name}" was deleted.` });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete character.";
      setBanner({ type: "error", message });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleVisibilityToggle(character: DbCustomCharacter) {
    const currentPayload = safePayload(character);

    const nextVisibility =
      getVisibilityFromPayload(currentPayload) === "public" ? "private" : "public";

    const nextPayload = {
      ...currentPayload,
      visibility: nextVisibility,
      publicShareId:
        typeof currentPayload.publicShareId === "string" &&
        currentPayload.publicShareId.trim()
          ? currentPayload.publicShareId
          : `share_${character.id.replace(/-/g, "").slice(0, 18)}`,
    } as Json;

    setPublishingId(character.id);
    setBanner(null);

    try {
      const { error } = await supabase
        .from("custom_characters")
        .update({ payload: nextPayload })
        .eq("id", character.id);

      if (error) {
        throw new Error(error.message);
      }

      await loadCharacters({ silent: true });
      setBanner({
        type: "success",
        message:
          nextVisibility === "public"
            ? `"${character.name}" is now public.`
            : `"${character.name}" is now private.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update visibility.";
      setBanner({ type: "error", message });
    } finally {
      setPublishingId(null);
    }
  }

  async function handleCopyShareLink(character: DbCustomCharacter) {
    const payload = safePayload(character);
    const href = getPublicShareHref(payload);

    if (!href) {
      setBanner({
        type: "error",
        message: "No public link is available for this character yet.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`);
      setBanner({
        type: "success",
        message: `Public link copied for "${character.name}".`,
      });
    } catch {
      setBanner({
        type: "error",
        message: "Could not copy the public link.",
      });
    }
  }

  const stats = useMemo(() => {
    const total = characters.length;
    const publicCount = characters.filter(
      (item) => getVisibilityFromPayload(safePayload(item)) === "public",
    ).length;
    const privateCount = total - publicCount;
    const activeThisWeek = characters.filter((item) => {
      const updated = new Date(item.updated_at).getTime();
      if (Number.isNaN(updated)) return false;
      return Date.now() - updated <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      total,
      publicCount,
      privateCount,
      activeThisWeek,
    };
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    return characters.filter((character) => {
      const visibility = getVisibilityFromPayload(safePayload(character));

      const visibilityMatch =
        visibilityFilter === "all" ? true : visibility === visibilityFilter;

      return visibilityMatch && matchesSearch(character, searchQuery);
    });
  }, [characters, visibilityFilter, searchQuery]);

  const sortedCharacters = useMemo(() => {
    const next = [...filteredCharacters];

    if (sortMode === "name") {
      return next.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sortMode === "scene") {
      return next.sort((a, b) =>
        (a.scenario?.setting ?? "").localeCompare(b.scenario?.setting ?? ""),
      );
    }

    return next.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  }, [filteredCharacters, sortMode]);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-white/[0.04] to-cyan-400/10 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.22)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-fuchsia-200/80">
                  My Characters
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Your private character vault
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                  These characters are tied to your account. Manage visibility,
                  public sharing, and chat continuity from one clean dashboard.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => loadCharacters({ silent: true })}
                  disabled={refreshing || loading}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <Link
                  href="/create-character"
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
                >
                  Create character
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total"
              value={String(stats.total)}
              helper="All characters tied to this account."
            />
            <StatCard
              label="Public"
              value={String(stats.publicCount)}
              helper="Characters visible on discover."
            />
            <StatCard
              label="Private"
              value={String(stats.privateCount)}
              helper="Visible only inside your account."
            />
            <StatCard
              label="Active this week"
              value={String(stats.activeThisWeek)}
              helper="Updated in the last 7 days."
            />
          </section>

          {banner ? (
            <div
              className={cn(
                "mt-6 rounded-2xl border px-4 py-3 text-sm",
                banner.type === "success"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-400/20 bg-rose-400/10 text-rose-100",
              )}
            >
              {banner.message}
            </div>
          ) : null}

          <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_10px_50px_rgba(0,0,0,0.16)]">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.55fr_0.55fr]">
              <label className="block">
                <div className="mb-2 text-sm text-white/70">Search</div>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search name, headline, tags, scene..."
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/30"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm text-white/70">Visibility</div>
                <select
                  value={visibilityFilter}
                  onChange={(event) =>
                    setVisibilityFilter(event.target.value as VisibilityFilter)
                  }
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                >
                  <option value="all">All visibility</option>
                  <option value="public">Public only</option>
                  <option value="private">Private only</option>
                </select>
              </label>

              <label className="block">
                <div className="mb-2 text-sm text-white/70">Sort</div>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                >
                  <option value="recent">Recently updated</option>
                  <option value="name">Name</option>
                  <option value="scene">Scene</option>
                </select>
              </label>
            </div>
          </section>

          <div className="mt-8">
            {loading ? (
              <LoadingSkeleton />
            ) : characters.length === 0 ? (
              <EmptyVaultState />
            ) : sortedCharacters.length === 0 ? (
              <EmptyResultsState query={searchQuery} />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {sortedCharacters.map((character) => {
                  const payload = safePayload(character);
                  const visibility = getVisibilityFromPayload(payload);
                  const identity = getIdentitySummary(payload);
                  const shareHref = getPublicShareHref(payload);
                  const memoryState = memoryMap[character.id];

                  return (
                    <article
                      key={character.id}
                      className="group rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6 shadow-[0_18px_80px_rgba(0,0,0,0.18)] transition hover:border-white/15 hover:from-white/[0.06] hover:to-white/[0.03]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2">
                            <StatusPill label={character.archetype || "custom"} />
                            <StatusPill
                              label={visibility === "public" ? "Public" : "Private"}
                              tone={visibility === "public" ? "success" : "neutral"}
                            />
                            {!memoryState?.hasConversation ? (
                              <StatusPill label="No active chat" tone="neutral" />
                            ) : memoryState.isFresh ? (
                              <StatusPill label="Fresh chat" tone="warm" />
                            ) : memoryState.hasMemory ? (
                              <StatusPill label="Memory active" tone="cyan" />
                            ) : (
                              <StatusPill label="Active chat" tone="success" />
                            )}
                          </div>

                          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                            {character.name}
                          </h2>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                            {truncate(
                              character.headline || character.description || "",
                              130,
                            )}
                          </p>
                        </div>

                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/45">
                          {formatRelativeDate(character.updated_at)}
                        </div>
                      </div>

                      {identity.length > 0 ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {identity.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                            Scenario
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/70">
                            {getScenarioSummary(character)}
                          </p>
                        </div>

                        <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                            Chat status
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/70">
                            {!memoryState?.hasConversation
                              ? "No conversation started yet."
                              : memoryState.isFresh
                                ? "Conversation exists and is still fresh."
                                : memoryState.hasMemory
                                  ? `Memory is active across ${
                                      memoryState.messageCount ?? 0
                                    } messages.`
                                  : "Conversation is active."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(character.tags ?? []).slice(0, 6).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                          >
                            {tag}
                          </span>
                        ))}
                        {(!character.tags || character.tags.length === 0) && (
                          <span className="text-xs text-white/35">
                            No tags added
                          </span>
                        )}
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          href={`/chat/custom/${character.slug}`}
                          className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
                        >
                          {memoryState?.hasConversation ? "Open chat" : "Start chat"}
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleVisibilityToggle(character)}
                          disabled={publishingId === character.id}
                          className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm text-cyan-100 transition hover:border-cyan-400/35 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {publishingId === character.id
                            ? "Updating..."
                            : visibility === "public"
                              ? "Make private"
                              : "Publish"}
                        </button>

                        {visibility === "public" && shareHref ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyShareLink(character)}
                              className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                            >
                              Copy public link
                            </button>

                            <Link
                              href={shareHref}
                              className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                            >
                              View public
                            </Link>
                          </>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleDelete(character)}
                          disabled={deletingId === character.id}
                          className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm text-rose-100 transition hover:border-rose-400/30 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {deletingId === character.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
