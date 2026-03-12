"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  customCharactersStorage,
  type StoredCharacterRecord,
} from "../../lib/custom-characters-storage";

type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

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

function safeScenarioSummary(character: StoredCharacterRecord): string {
  if (character.scenarioSummary?.trim()) return character.scenarioSummary.trim();

  const parts = [
    character.scenario?.setting,
    character.scenario?.relationshipToUser,
    character.scenario?.tone,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Open-ended character";
}

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.14),transparent_30%)]" />
      <div className="relative mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-2xl">
          ✦
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          No custom characters yet
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/65 md:text-base">
          Your studio is ready. Create a fast companion in Quick Mode or build a
          premium scene-aware character in Detailed Studio.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/create-character"
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
          >
            Open Character Studio
          </Link>
          <Link
            href="/characters"
            className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Explore Built-In Characters
          </Link>
        </div>
      </div>
    </div>
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
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-white/55">{sublabel}</div>
    </div>
  );
}

function CharacterCard({
  character,
  onDelete,
  onDuplicate,
  busySlug,
}: {
  character: StoredCharacterRecord;
  onDelete: (slug: string) => void;
  onDuplicate: (slug: string) => void;
  busySlug: string | null;
}) {
  const isBusy = busySlug === character.slug;
  const scenarioSummary = safeScenarioSummary(character);
  const tags = character.tags?.slice(0, 6) ?? [];
  const traitBadges = character.traitBadges?.slice(0, 5) ?? [];
  const updatedLabel = formatRelativeDate(
    character.metadata.updatedAt || character.metadata.createdAt
  );

  return (
    <article className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]">
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_35%)]" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/15 bg-gradient-to-br from-fuchsia-500/30 via-violet-500/20 to-cyan-400/20 text-lg font-semibold text-white">
          {character.avatarFallback || character.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight text-white">
                {character.name || "Unnamed Character"}
              </h2>
              <p className="mt-1 text-sm text-white/60">
                {character.headline || "Custom Lovora character"}
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
              Updated {updatedLabel}
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-white/70">
            {truncate(
              character.description ||
                "A custom Lovora companion designed for scene-aware roleplay.",
              180
            )}
          </p>
        </div>
      </div>

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          Scene Snapshot
        </div>
        <p className="mt-2 text-sm leading-6 text-white/75">{scenarioSummary}</p>
      </div>

      {tags.length > 0 ? (
        <div className="relative mt-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
            Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={`${character.slug}-tag-${tag}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {traitBadges.length > 0 ? (
        <div className="relative mt-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
            Trait Badges
          </div>
          <div className="flex flex-wrap gap-2">
            {traitBadges.map((badge) => (
              <span
                key={`${character.slug}-badge-${badge.label}`}
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
                    "border-white/10 bg-white/5 text-white/70"
                )}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href={`/chat/custom/${character.slug}`}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.01]"
        >
          Open Chat
        </Link>

        <button
          type="button"
          onClick={() => onDuplicate(character.slug)}
          disabled={isBusy}
          className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Working..." : "Duplicate"}
        </button>

        <button
          type="button"
          onClick={() => onDelete(character.slug)}
          disabled={isBusy}
          className="inline-flex items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default function MyCharactersPage() {
  const [characters, setCharacters] = useState<StoredCharacterRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerState>(null);

  const refreshCharacters = () => {
    const next = customCharactersStorage.list();
    setCharacters(next);
  };

  useEffect(() => {
    setMounted(true);
    refreshCharacters();
  }, []);

  useEffect(() => {
    if (!banner) return;

    const timeout = window.setTimeout(() => setBanner(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [banner]);

  const sortedCharacters = useMemo(() => {
    return [...characters].sort((a, b) => {
      const timeA = Date.parse(a.metadata.updatedAt || a.metadata.createdAt || "");
      const timeB = Date.parse(b.metadata.updatedAt || b.metadata.createdAt || "");

      const safeA = Number.isFinite(timeA) ? timeA : 0;
      const safeB = Number.isFinite(timeB) ? timeB : 0;

      if (safeA !== safeB) return safeB - safeA;

      const nameA = a.name || "Unnamed Character";
      const nameB = b.name || "Unnamed Character";
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
  }, [characters]);

  const totalCharacters = sortedCharacters.length;
  const sceneAwareCount = sortedCharacters.filter(
    (character) => !!character.scenario && Object.values(character.scenario).some(Boolean)
  ).length;
  const strongHeadlineCount = sortedCharacters.filter(
    (character) => !!character.headline?.trim()
  ).length;

  const handleDelete = (slug: string) => {
    const confirmed = window.confirm(
      "Delete this character from your library? This cannot be undone."
    );
    if (!confirmed) return;

    setBusySlug(slug);

    try {
      const result = customCharactersStorage.deleteBySlug(slug);
      refreshCharacters();

      setBanner(
        result.deleted
          ? { type: "success", message: "Character deleted." }
          : { type: "error", message: "Character not found." }
      );
    } catch {
      setBanner({ type: "error", message: "Something went wrong while deleting." });
    } finally {
      setBusySlug(null);
    }
  };

  const handleDuplicate = (slug: string) => {
    setBusySlug(slug);

    try {
      const duplicated = customCharactersStorage.duplicate(slug);
      refreshCharacters();

      setBanner(
        duplicated
          ? { type: "success", message: `"${duplicated.name}" created as a copy.` }
          : { type: "error", message: "Character could not be duplicated." }
      );
    } catch {
      setBanner({ type: "error", message: "Something went wrong while duplicating." });
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-6 md:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_30%)]" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/50">
                Lovora Library
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                My Characters
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
                View, manage, and launch every character created in your studio.
                This is no longer just a list — it is your private lineup of
                scene-aware companions.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/create-character"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                Create New Character
              </Link>
              <Link
                href="/characters"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Browse Built-In Characters
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Library Size"
            value={String(totalCharacters)}
            sublabel="Custom companions saved"
          />
          <StatCard
            label="Scene Aware"
            value={String(sceneAwareCount)}
            sublabel="Characters carrying scenario context"
          />
          <StatCard
            label="Polished Profiles"
            value={String(strongHeadlineCount)}
            sublabel="Profiles with premium card copy"
          />
        </section>

        {banner ? (
          <div
            className={cn(
              "mt-6 rounded-2xl border px-4 py-3 text-sm",
              banner.type === "success" &&
                "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
              banner.type === "error" &&
                "border-rose-400/20 bg-rose-400/10 text-rose-100"
            )}
          >
            {banner.message}
          </div>
        ) : null}

        <section className="mt-8">
          {!mounted ? (
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-8 text-sm text-white/60">
              Loading characters...
            </div>
          ) : sortedCharacters.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {sortedCharacters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  busySlug={busySlug}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
