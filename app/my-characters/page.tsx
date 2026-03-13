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
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
        ✦
      </div>
      <h2 className="text-2xl font-semibold text-white">No custom characters yet</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/65">
        Your studio is ready. Create a fast companion in Quick Mode or build a premium
        scene-aware character in Detailed Studio.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/create-character"
          className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Open Character Studio
        </Link>
        <Link
          href="/characters"
          className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/15 hover:text-white"
        >
          Explore Built-In Characters
        </Link>
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
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-white/55">{sublabel}</div>
    </div>
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
  const scenarioSummary = safeScenarioSummary(character);
  const tags = character.tags?.slice(0, 6) ?? [];
  const traitBadges: CustomCharacterTraitBadge[] =
    character.traitBadges?.slice(0, 5) ?? [];
  const updatedLabel = formatRelativeDate(
    character.metadata.updatedAt || character.metadata.createdAt
  );

  return (
    <article className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_35%)] opacity-0 transition group-hover:opacity-100" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/15 bg-gradient-to-br from-fuchsia-500/30 via-violet-500/20 to-cyan-400/20 text-lg font-semibold text-white">
          {character.avatarFallback || character.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{character.name}</h3>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
              {character.archetype.replace(/-/g, " ")}
            </span>
          </div>

          <p className="mt-1 text-sm text-white/65">{character.headline}</p>
          <p className="mt-3 text-sm leading-6 text-white/72">
            {truncate(character.description, 180)}
          </p>

          <div className="mt-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
              Scene Snapshot
            </div>
            <p className="text-sm text-white/70">{scenarioSummary}</p>
          </div>

          {tags.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
                Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string) => (
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
            <div className="mt-4">
              <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
                Trait Badges
              </div>
              <div className="flex flex-wrap gap-2">
                {traitBadges.map((badge: CustomCharacterTraitBadge) => (
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
                        "border-white/10 bg-white/5 text-white/75"
                    )}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="text-xs text-white/45">{updatedLabel}</div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/chat/custom/${character.slug}`}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
          >
            Chat
          </Link>

          <button
            type="button"
            onClick={() => onDelete(character)}
            disabled={deleting}
            className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MyCharactersPage() {
  const [characters, setCharacters] = useState<StoredCharacterRecord[]>([]);
  const [banner, setBanner] = useState<BannerState>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

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
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/50">
              My Characters
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white">
              Your private companion studio
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Review your saved characters, jump back into roleplay instantly, and keep
              your best scene-aware creations organized in one place.
            </p>
          </div>

          <Link
            href="/create-character"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
          >
            Create New Character
          </Link>
        </div>

        {banner ? (
          <div
            className={cn(
              "mb-6 rounded-2xl border px-4 py-3 text-sm",
              banner.type === "success" &&
                "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
              banner.type === "error" &&
                "border-red-400/20 bg-red-500/10 text-red-100"
            )}
          >
            {banner.message}
          </div>
        ) : null}

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Saved"
            value={String(stats.count)}
            sublabel="Characters in your studio"
          />
          <StatCard
            label="Scene-Aware"
            value={String(stats.sceneAware)}
            sublabel="Characters with embedded scenario context"
          />
          <StatCard
            label="Detailed"
            value={String(stats.detailed)}
            sublabel="Characters with rich trait output"
          />
        </section>

        {characters.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="grid gap-5 lg:grid-cols-2">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                deleting={deletingSlug === character.slug}
                onDelete={handleDelete}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
