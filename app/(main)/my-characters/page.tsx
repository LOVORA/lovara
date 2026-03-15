"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Copy,
  Edit3,
  PlusSquare,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  createMyCustomCharacter,
  deleteMyCustomCharacter,
  listMyCustomCharacters,
  type CharacterDraftInput,
  type DbCustomCharacter,
} from "@/lib/account";
import { CHARACTER_IMAGES_BUCKET } from "@/lib/character-images";
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

type AvatarUrlMap = Record<string, string>;

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

type CharacterImageLookupRow = {
  id: string;
  character_id: string;
  storage_path: string | null;
  public_url: string | null;
  is_primary: boolean;
  created_at: string;
};

type EditDraftState = {
  id: string;
  name: string;
  headline: string;
  description: string;
  greeting: string;
  backstory: string;
  tags: string;
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

function toTagString(tags?: string[] | null) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

function toTagArray(tags: string) {
  return tags
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
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
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
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
        "inline-flex rounded-full border px-3 py-1 text-xs",
        tone === "success" &&
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
        tone === "warm" &&
          "border-amber-400/20 bg-amber-400/10 text-amber-100",
        tone === "cyan" &&
          "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
        tone === "danger" &&
          "border-rose-400/20 bg-rose-400/10 text-rose-100",
        tone === "neutral" && "border-white/10 bg-white/5 text-white/70",
      )}
    >
      {label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[420px] animate-pulse rounded-[30px] border border-white/10 bg-white/[0.04]"
        />
      ))}
    </div>
  );
}

function EmptyVaultState() {
  return (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center md:p-12">
      <StatusPill label="Studio Ready" tone="cyan" />
      <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white">
        Your character vault is empty.
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/62">
        Create your first character, save it to your account, and come back here
        to manage visibility, public sharing, duplication, editing, and chat
        continuity.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/create-character"
          className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
        >
          Create first character
        </Link>
        <Link
          href="/characters"
          className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
        >
          Explore public characters
        </Link>
      </div>
    </div>
  );
}

function EmptyResultsState({ query }: { query: string }) {
  return (
    <div className="rounded-[32px] border border-dashed border-white/12 bg-white/[0.03] p-8 text-center md:p-12">
      <StatusPill label="No Results" tone="neutral" />
      <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white">
        Nothing matched your filters.
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/62">
        No saved characters matched “{query || "your current filters"}”. Try
        another name, tag, or visibility filter.
      </p>
    </div>
  );
}

export default function MyCharactersPage() {
  const [characters, setCharacters] = useState<DbCustomCharacter[]>([]);
  const [memoryMap, setMemoryMap] = useState<MemoryStateMap>({});
  const [avatarUrlMap, setAvatarUrlMap] = useState<AvatarUrlMap>({});
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [banner, setBanner] = useState<BannerState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<EditDraftState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadAvatarState(charactersList: DbCustomCharacter[]) {
    try {
      if (charactersList.length === 0) {
        setAvatarUrlMap({});
        return;
      }

      const characterIds = charactersList.map((item) => item.id);
      const db = supabase as any;

      const { data: rowsRaw, error } = await db
        .from("character_images")
        .select("id, character_id, storage_path, public_url, is_primary, created_at")
        .in("character_id", characterIds)
        .eq("is_primary", true);

      if (error) {
        setAvatarUrlMap({});
        return;
      }

      const rows = (rowsRaw as CharacterImageLookupRow[] | null) ?? [];
      const nextMap: AvatarUrlMap = {};

      await Promise.all(
        rows.map(async (row) => {
          if (row.public_url) {
            nextMap[row.character_id] = row.public_url;
            return;
          }

          if (!row.storage_path) return;

          const { data: signedData, error: signedError } = await supabase.storage
            .from(CHARACTER_IMAGES_BUCKET)
            .createSignedUrl(row.storage_path, 60 * 60);

          if (!signedError && signedData?.signedUrl) {
            nextMap[row.character_id] = signedData.signedUrl;
          }
        }),
      );

      setAvatarUrlMap(nextMap);
    } catch {
      setAvatarUrlMap({});
    }
  }

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

      const messageRows = (messageRowsRaw as CustomMessageLookupRow[] | null) ?? [];

      const memoryByConversation = new Map<
        string,
        { messageCount: number; hasMemory: boolean }
      >();

      for (const row of memoryRows) {
        const count = typeof row.message_count === "number" ? row.message_count : 0;
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
      await Promise.all([loadMemoryState(data), loadAvatarState(data)]);
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
    const confirmed = window.confirm(`Delete "${character.name}" from this account?`);
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
      setAvatarUrlMap((current) => {
        const next = { ...current };
        delete next[character.id];
        return next;
      });

      setBanner({
        type: "success",
        message: `"${character.name}" was deleted.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete character.";

      setBanner({
        type: "error",
        message,
      });
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

      setBanner({
        type: "error",
        message,
      });
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

  function openEdit(character: DbCustomCharacter) {
    setEditing({
      id: character.id,
      name: character.name || "",
      headline: character.headline || "",
      description: character.description || "",
      greeting: character.greeting || "",
      backstory: character.backstory || "",
      tags: toTagString(character.tags),
    });
    setBanner(null);
  }

  async function handleSaveEdit() {
    if (!editing || savingEdit) return;

    if (!editing.name.trim()) {
      setBanner({
        type: "error",
        message: "Character name cannot be empty.",
      });
      return;
    }

    setSavingEdit(true);
    setBanner(null);

    try {
      const { error } = await supabase
        .from("custom_characters")
        .update({
          name: editing.name.trim(),
          headline: editing.headline.trim(),
          description: editing.description.trim(),
          greeting: editing.greeting.trim(),
          backstory: editing.backstory.trim(),
          tags: toTagArray(editing.tags),
        })
        .eq("id", editing.id);

      if (error) {
        throw new Error(error.message);
      }

      setEditing(null);
      await loadCharacters({ silent: true });

      setBanner({
        type: "success",
        message: "Character updated successfully.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save character changes.";

      setBanner({
        type: "error",
        message,
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDuplicate(character: DbCustomCharacter) {
    if (duplicatingId) return;

    setDuplicatingId(character.id);
    setBanner(null);

    try {
      const payload = safePayload(character);
      const nextPayload: Record<string, unknown> = {
        ...payload,
        visibility: "private",
      };

      delete nextPayload.publicShareId;

      const input: CharacterDraftInput = {
        name: `${character.name} Copy`,
        archetype: character.archetype || "custom",
        headline: character.headline || "",
        description: character.description || "",
        greeting: character.greeting || "",
        previewMessage: character.preview_message || character.greeting || "",
        backstory: character.backstory || "",
        tags: character.tags ?? [],
        traitBadges: [],
        scenario: character.scenario ?? {},
        payload: nextPayload,
      };

      const created = await createMyCustomCharacter(input);

      await loadCharacters({ silent: true });

      setBanner({
        type: "success",
        message: `"${created.name}" was duplicated into your library as a private character.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not duplicate character.";

      setBanner({
        type: "error",
        message:
          message === "AUTH_REQUIRED"
            ? "You need to log in before duplicating a character."
            : message,
      });
    } finally {
      setDuplicatingId(null);
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
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.22em] text-white/40">
                My Characters
              </div>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Your private character vault
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/62 md:text-base">
                These characters are tied to your account. Manage visibility,
                public sharing, duplication, editing, and chat continuity from
                one clean dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadCharacters({ silent: true })}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <Link
                href="/create-character"
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Create character
              </Link>
            </div>
          </div>

          {banner ? (
            <div
              className={cn(
                "mb-6 rounded-2xl border px-4 py-3 text-sm",
                banner.type === "success"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-400/20 bg-rose-400/10 text-rose-100",
              )}
            >
              {banner.message}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total characters"
              value={String(stats.total)}
              helper="Everything saved to your account."
            />
            <StatCard
              label="Public"
              value={String(stats.publicCount)}
              helper="Visible through a public share page."
            />
            <StatCard
              label="Private"
              value={String(stats.privateCount)}
              helper="Only visible inside your account."
            />
            <StatCard
              label="Active this week"
              value={String(stats.activeThisWeek)}
              helper="Recently updated or refined characters."
            />
          </div>

          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.4fr_0.4fr]">
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
          </div>

          <div className="mt-8">
            {loading ? (
              <LoadingSkeleton />
            ) : characters.length === 0 ? (
              <EmptyVaultState />
            ) : sortedCharacters.length === 0 ? (
              <EmptyResultsState query={searchQuery} />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {sortedCharacters.map((character) => {
                  const payload = safePayload(character);
                  const visibility = getVisibilityFromPayload(payload);
                  const identity = getIdentitySummary(payload);
                  const shareHref = getPublicShareHref(payload);
                  const memoryState = memoryMap[character.id];
                  const avatarUrl = avatarUrlMap[character.id];

                  return (
                    <article
                      key={character.id}
                      className="flex h-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] transition hover:border-white/18 hover:bg-white/[0.06]"
                    >
                      <div className="relative h-56 w-full border-b border-white/10 bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={`${character.name} avatar`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-end p-6">
                            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70 backdrop-blur">
                              No avatar yet
                            </div>
                          </div>
                        )}

                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.65),transparent_45%)]" />

                        <div className="absolute left-6 top-5 flex flex-wrap gap-2">
                          <StatusPill
                            label={visibility === "public" ? "Public" : "Private"}
                            tone={visibility === "public" ? "cyan" : "neutral"}
                          />
                          {!memoryState?.hasConversation ? (
                            <StatusPill label="No chat yet" tone="neutral" />
                          ) : memoryState.isFresh ? (
                            <StatusPill label="Fresh chat" tone="warm" />
                          ) : memoryState.hasMemory ? (
                            <StatusPill label="Memory active" tone="success" />
                          ) : (
                            <StatusPill label="Conversation active" tone="warm" />
                          )}
                        </div>

                        <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between gap-3">
                          <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-white">
                              {character.name}
                            </h2>
                            <div className="mt-2 text-xs text-white/60">
                              {formatRelativeDate(character.updated_at)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-6">
                        <p className="text-sm leading-7 text-white/62">
                          {truncate(character.headline || character.description || "", 130)}
                        </p>

                        {identity.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {identity.map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                            Scenario
                          </div>
                          <div className="mt-2 text-sm leading-7 text-white/74">
                            {getScenarioSummary(character)}
                          </div>
                        </div>

                        <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                            Chat status
                          </div>
                          <div className="mt-2 text-sm leading-7 text-white/74">
                            {!memoryState?.hasConversation
                              ? "No conversation started yet."
                              : memoryState.isFresh
                                ? "Conversation exists and is still fresh."
                                : memoryState.hasMemory
                                  ? `Memory is active across ${memoryState.messageCount ?? 0} messages.`
                                  : "Conversation is active."}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(character.tags ?? []).slice(0, 6).map((tag) => (
                            <span
                              key={`${character.id}-${tag}`}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/68"
                            >
                              {tag}
                            </span>
                          ))}
                          {(!character.tags || character.tags.length === 0) && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/52">
                              No tags added
                            </span>
                          )}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                          <Link
                            href={`/chat/custom/${character.slug}`}
                            className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                          >
                            {memoryState?.hasConversation ? "Open chat" : "Start chat"}
                          </Link>

                          <button
                            type="button"
                            onClick={() => openEdit(character)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                          >
                            <Edit3 className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(character)}
                            disabled={duplicatingId === character.id}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <PlusSquare className="h-4 w-4" />
                            {duplicatingId === character.id ? "Duplicating..." : "Duplicate"}
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
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
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                              >
                                <Copy className="h-4 w-4" />
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
                            className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm text-rose-100 transition hover:border-rose-400/30 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingId === character.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/10 bg-[#0a1020] p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-[0.2em] text-white/40">
                    Edit character
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    Update saved character
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-sm text-white/75">Name</div>
                  <input
                    value={editing.name}
                    onChange={(event) =>
                      setEditing((current) =>
                        current ? { ...current, name: event.target.value } : current,
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm text-white/75">Headline</div>
                  <input
                    value={editing.headline}
                    onChange={(event) =>
                      setEditing((current) =>
                        current ? { ...current, headline: event.target.value } : current,
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="block">
                  <div className="mb-2 text-sm text-white/75">Description</div>
                  <textarea
                    rows={4}
                    value={editing.description}
                    onChange={(event) =>
                      setEditing((current) =>
                        current ? { ...current, description: event.target.value } : current,
                      )
                    }
                    className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm text-white/75">Greeting</div>
                  <textarea
                    rows={3}
                    value={editing.greeting}
                    onChange={(event) =>
                      setEditing((current) =>
                        current ? { ...current, greeting: event.target.value } : current,
                      )
                    }
                    className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm text-white/75">Backstory</div>
                  <textarea
                    rows={4}
                    value={editing.backstory}
                    onChange={(event) =>
                      setEditing((current) =>
                        current ? { ...current, backstory: event.target.value } : current,
                      )
                    }
                    className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm text-white/75">Tags</div>
                  <input
                    value={editing.tags}
                    onChange={(event) =>
                      setEditing((current) =>
                        current ? { ...current, tags: event.target.value } : current,
                      )
                    }
                    placeholder="slow burn, elegant, dark, witty"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
