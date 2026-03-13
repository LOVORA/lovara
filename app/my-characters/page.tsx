"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  customCharactersStorage,
  type StoredCharacterRecord,
} from "../../lib/custom-characters-storage";
import type { CustomCharacterTraitBadge } from "../../lib/custom-character-adapter";

type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

type SortMode = "recent" | "name" | "scene";
type FilterMode = "all" | "scene-aware" | "detailed";

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

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function getScenarioSummary(character: StoredCharacterRecord): string {
  if (character.scenarioSummary?.trim()) return character.scenarioSummary.trim();

  const parts = [
    character.scenario?.setting,
    character.scenario?.relationshipToUser,
    character.scenario?.sceneGoal,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Open-ended character dynamic";
}

function getToneLine(character: StoredCharacterRecord): string {
  const parts = [
    character.scenario?.tone,
    character.scenario?.openingState,
    character.metadata?.speechStyle,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Adaptive conversation style";
}

function EmptyState() {
  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/50">
            Studio Ready
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Your character vault is empty.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
            Build your first custom companion, save the scene, and come back here to
            relaunch chats, compare concepts, and keep your best characters organized in one
            premium workspace.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/create-character"
              className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Create First Character
            </Link>
            <Link
              href="/characters"
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white/75 transition hover:border-white/15 hover:text-white"
            >
              Explore Built-In Characters
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {[
            {
              title: "Quick companions",
              body: "Spin up a strong concept fast when you already know the vibe.",
            },
            {
              title: "Scene-aware builds",
              body: "Keep relationship, setting, and opening tension anchored from the start.",
            },
            {
              title: "Private library",
              body: "Return to saved characters without rebuilding them every session.",
            },
            {
              title: "Ready for chat",
              body: "Move directly from creation into a focused custom conversation flow.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-white/10 bg-white/5 p-5"
            >
              <div className="text-sm font-medium text-white">{item.title}</div>
              <div className="mt-2 text-sm leading-6 text-white/60">{item.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1.5 text-sm leading-6 text-white/56">{sublabel}</div>
    </div>
  );
}

function ToneBadge({ tone }: { tone: CustomCharacterTraitBadge["tone"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-2.5 w-2.5 rounded-full",
        tone === "bold" && "bg-fuchsia-300",
        tone === "warm" && "bg-amber-300",
        tone === "soft" && "bg-cyan-300",
        tone === "mysterious" && "bg-violet-300",
        tone === "neutral" && "bg-white/45"
      )}
    />
  );
}

function CharacterCard({
  character,
  onDelete,
  deleting,
}: {
  character: StoredCharacterRecord;
  onDelete: (character: StoredCharacterRecord) => void;
  deleting: boolean;
}) {
  const scenarioSummary = getScenarioSummary(character);
  const toneLine = getToneLine(character);
  const tags = character.tags?.slice(0, 5) ?? [];
  const traitBadges = character.traitBadges?.slice(0, 4) ?? [];
  const updatedLabel = formatRelativeDate(
    character.metadata.updatedAt || character.metadata.createdAt
  );

  return (
    <article className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.055]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.10),transparent_26%)] opacity-70" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-white/15 bg-gradient-to-br from-fuchsia-500/25 via-violet-500/20 to-cyan-400/20 text-lg font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.22)]">
            {character.avatarFallback || character.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight text-white">
                {character.name}
              </h3>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                {character.archetype.replace(/-/g, " ")}
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-white/64">{character.headline}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
              Character Snapshot
            </div>
            <p className="mt-3 text-sm leading-7 text-white/74">
              {truncate(character.description, 220)}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
              Scene Setup
            </div>
            <p className="mt-3 text-sm leading-7 text-white/74">{scenarioSummary}</p>
            <div className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-white/58">
              {toneLine}
            </div>
          </div>
        </div>

        {traitBadges.length > 0 ? (
          <div className="mt-5">
            <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/40">
              Trait Energy
            </div>
            <div className="flex flex-wrap gap-2">
              {traitBadges.map((badge) => (
                <span
                  key={`${character.slug}-badge-${badge.label}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
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
                  <ToneBadge tone={badge.tone} />
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-5">
            <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/40">
              Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={`${character.slug}-tag-${tag}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/68"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-1 flex-col justify-end border-t border-white/10 pt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
            <span>Last updated {updatedLabel}</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/42">
              {character.scenario ? "Scene-aware" : "Custom build"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/chat/custom/${character.slug}`}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Open Chat
            </Link>
            <Link
              href={`/create-character?from=${encodeURIComponent(character.slug)}`}
              className="rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-white/78 transition hover:border-white/15 hover:text-white"
            >
              Rebuild Variant
            </Link>
            <button
              type="button"
              onClick={() => onDelete(character)}
              disabled={deleting}
              className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MyCharactersPage() {
  const [characters, setCharacters] = useState<StoredCharacterRecord[]>([]);
  const [banner, setBanner] = useState<BannerState>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  useEffect(() => {
    try {
      setCharacters(customCharactersStorage.list());
    } catch {
      setCharacters([]);
      setBanner({ type: "error", message: "Could not load your saved characters." });
    }
  }, []);

  const stats = useMemo(() => {
    const count = characters.length;
    const sceneAware = characters.filter((item) => item.scenarioSummary?.trim()).length;
    const detailed = characters.filter((item) => item.traitBadges?.length > 0).length;

    return {
      count,
      sceneAware,
      detailed,
    };
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let next = [...characters];

    if (filterMode === "scene-aware") {
      next = next.filter(
        (item) =>
          Boolean(item.scenarioSummary?.trim()) ||
          Boolean(item.scenario?.setting) ||
          Boolean(item.scenario?.relationshipToUser)
      );
    }

    if (filterMode === "detailed") {
      next = next.filter((item) => (item.traitBadges?.length ?? 0) > 0);
    }

    if (normalizedQuery) {
      next = next.filter((item) => {
        const haystack = [
          item.name,
          item.headline,
          item.description,
          item.archetype,
          item.scenarioSummary,
          item.scenario?.setting,
          item.scenario?.relationshipToUser,
          item.scenario?.sceneGoal,
          item.scenario?.tone,
          ...(item.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      });
    }

    next.sort((a, b) => {
      if (sortMode === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sortMode === "scene") {
        return getScenarioSummary(a).localeCompare(getScenarioSummary(b));
      }

      const aTime = new Date(a.metadata.updatedAt || a.metadata.createdAt || 0).getTime();
      const bTime = new Date(b.metadata.updatedAt || b.metadata.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return next;
  }, [characters, filterMode, query, sortMode]);

  const handleDelete = (character: StoredCharacterRecord) => {
    const confirmed = window.confirm(`Delete "${character.name}"?`);
    if (!confirmed) return;

    setDeletingSlug(character.slug);

    try {
      const result = customCharactersStorage.deleteBySlug(character.slug);

      if (!result.deleted) {
        setBanner({ type: "error", message: "Character could not be deleted." });
        return;
      }

      setCharacters((prev) => prev.filter((item) => item.slug !== character.slug));
      setBanner({ type: "success", message: `"${character.name}" deleted.` });
    } catch {
      setBanner({ type: "error", message: "Character could not be deleted." });
    } finally {
      setDeletingSlug(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#070B14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:py-12">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] px-6 py-7 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-8 sm:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.10),transparent_28%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/50">
                My Characters
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Your private character vault
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/64">
                Review saved builds, reopen the best dynamics instantly, and keep your
                strongest scene-aware characters organized in one clean control surface.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/create-character"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Create New Character
              </Link>
              <Link
                href="/characters"
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white/78 transition hover:border-white/15 hover:text-white"
              >
                Explore Library
              </Link>
            </div>
          </div>
        </section>

        {banner ? (
          <div
            className={cn(
              "mt-6 rounded-2xl border px-4 py-3 text-sm",
              banner.type === "success" &&
                "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
              banner.type === "error" &&
                "border-red-400/20 bg-red-500/10 text-red-100"
            )}
          >
            {banner.message}
          </div>
        ) : null}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Saved"
            value={String(stats.count)}
            sublabel="Characters currently in your vault"
          />
          <StatCard
            label="Scene-Aware"
            value={String(stats.sceneAware)}
            sublabel="Builds carrying setting and dynamic context"
          />
          <StatCard
            label="Detailed"
            value={String(stats.detailed)}
            sublabel="Characters with richer trait and identity output"
          />
        </section>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.035] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-white/82">
                Search saved characters
              </label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, vibe, scenario, tags..."
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:w-[440px]">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/82">Filter</label>
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5">
                  {([
                    ["all", "All"],
                    ["scene-aware", "Scene"],
                    ["detailed", "Detailed"],
                  ] as Array<[FilterMode, string]>).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilterMode(value)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm transition",
                        filterMode === value
                          ? "bg-white/12 text-white"
                          : "text-white/55 hover:text-white"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/82">Sort</label>
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5">
                  {([
                    ["recent", "Recent"],
                    ["name", "Name"],
                    ["scene", "Scene"],
                  ] as Array<[SortMode, string]>).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSortMode(value)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm transition",
                        sortMode === value
                          ? "bg-white/12 text-white"
                          : "text-white/55 hover:text-white"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-between gap-3 text-sm text-white/50">
          <div>
            Showing <span className="text-white/85">{filteredCharacters.length}</span> of {" "}
            <span className="text-white/85">{characters.length}</span> saved characters
          </div>
          {(query || filterMode !== "all" || sortMode !== "recent") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilterMode("all");
                setSortMode("recent");
              }}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/72 transition hover:border-white/15 hover:text-white"
            >
              Reset view
            </button>
          )}
        </div>

        <section className="mt-6">
          {characters.length === 0 ? (
            <EmptyState />
          ) : filteredCharacters.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                No characters match this view
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/62">
                Try a broader search, switch the filter, or reset sorting to bring your saved
                characters back into view.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredCharacters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  deleting={deletingSlug === character.slug}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

