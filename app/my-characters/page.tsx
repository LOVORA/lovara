"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  deleteMyCustomCharacter,
  listMyCustomCharacters,
  type DbCustomCharacter,
} from "@/lib/account";

const AuthGuard = dynamic(() => import("@/components/auth/auth-guard"), {
  ssr: false,
});

type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

type SortMode = "recent" | "name" | "scene";

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

  return parts.length > 0
    ? parts.join(" • ")
    : "Open-ended roleplay dynamic";
}

function EmptyState() {
  return (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
      <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-fuchsia-200">
        Studio Ready
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-white">
        Your character vault is empty.
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
        Create your first character, save it to your account, and come back
        here to reopen your private cast from any device.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/create-character"
          className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
        >
          Create first character
        </Link>
        <Link
          href="/characters"
          className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
        >
          Explore built-in characters
        </Link>
      </div>
    </div>
  );
}

export default function MyCharactersPage() {
  const [characters, setCharacters] = useState<DbCustomCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [banner, setBanner] = useState<BannerState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadCharacters() {
    setLoading(true);
    setBanner(null);

    try {
      const data = await listMyCustomCharacters();
      setCharacters(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not load your characters.";

      setBanner({
        type: "error",
        message:
          message === "AUTH_REQUIRED"
            ? "You need to log in to view your characters."
            : message,
      });
    } finally {
      setLoading(false);
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
      setCharacters((current) =>
        current.filter((item) => item.id !== character.id),
      );
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

  const sortedCharacters = useMemo(() => {
    const next = [...characters];

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
  }, [characters, sortMode]);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-white/8 via-fuchsia-500/8 to-cyan-400/8 p-8 shadow-2xl shadow-fuchsia-500/10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-100">
                  My Characters
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                  Your private character vault
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/62 md:text-base">
                  These characters are loaded from Supabase and tied to the
                  currently signed-in account.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="h-12 rounded-full border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                >
                  <option value="recent">Sort: Recently updated</option>
                  <option value="name">Sort: Name</option>
                  <option value="scene">Sort: Scene</option>
                </select>

                <Link
                  href="/create-character"
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
                >
                  Create character
                </Link>
              </div>
            </div>
          </div>

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

          <div className="mt-8">
            {loading ? (
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-sm text-white/60">
                Loading your characters...
              </div>
            ) : sortedCharacters.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {sortedCharacters.map((character) => (
                  <article
                    key={character.id}
                    className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.10),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.10),transparent_25%)] opacity-0 transition group-hover:opacity-100" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-white/35">
                            {character.archetype || "custom"}
                          </div>
                          <h2 className="mt-2 text-2xl font-semibold text-white">
                            {character.name}
                          </h2>
                          <p className="mt-2 text-sm text-white/62">
                            {truncate(
                              character.headline || character.description || "",
                              92,
                            )}
                          </p>
                        </div>

                        <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/55">
                          {formatRelativeDate(character.updated_at)}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Scenario
                        </div>
                        <p className="mt-2 text-sm leading-6 text-white/72">
                          {getScenarioSummary(character)}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(character.tags ?? []).slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
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

                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <Link
                          href={`/chat/custom/${character.slug}`}
                          className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
                        >
                          Chat
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDelete(character)}
                          disabled={deletingId === character.id}
                          className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm text-rose-100 transition hover:border-rose-400/30 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {deletingId === character.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
