"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  createMyCustomCharacter,
  type CharacterDraftInput,
} from "@/lib/account";
import {
  getIdentitySummary,
  getVisibilityFromPayload,
} from "@/lib/custom-character-studio";
import {
  getPublicCustomCharacterByShareId,
  type PublicCustomCharacter,
} from "@/lib/public-characters";

const AuthGuard = dynamic(() => import("@/components/auth/auth-guard"), {
  ssr: false,
});

type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
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

function getScenarioSummary(character: PublicCustomCharacter) {
  const parts = [
    character.scenario?.setting,
    character.scenario?.relationshipToUser,
    character.scenario?.sceneGoal,
    character.scenario?.tone,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Open-ended roleplay dynamic";
}

function getPayloadValue(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

export default function PublicCharacterDetailPage() {
  const params = useParams<{ shareId?: string | string[] }>();
  const shareId =
    typeof params?.shareId === "string"
      ? params.shareId
      : Array.isArray(params?.shareId)
        ? params.shareId[0]
        : "";

  const [character, setCharacter] = useState<PublicCustomCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setBanner(null);

      try {
        const found = await getPublicCustomCharacterByShareId(shareId);

        if (cancelled) return;

        if (!found || getVisibilityFromPayload(found.payload) !== "public") {
          setCharacter(null);
        } else {
          setCharacter(found);
        }
      } catch (error) {
        if (!cancelled) {
          setBanner({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not load this public character.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (shareId) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const identitySummary = useMemo(() => {
    if (!character) return [];
    return getIdentitySummary(character.payload);
  }, [character]);

  const publicTagline = character
    ? getPayloadValue(character.payload, "publicTagline")
    : "";
  const publicTeaser = character
    ? getPayloadValue(character.payload, "publicTeaser")
    : "";
  const publicTags = character
    ? getPayloadValue(character.payload, "publicTags")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  async function handleDuplicate() {
    if (!character || duplicating) return;

    setDuplicating(true);
    setBanner(null);

    try {
      const nextPayload: Record<string, unknown> = {
        ...character.payload,
        visibility: "private",
      };

      delete nextPayload.publicShareId;

      const input: CharacterDraftInput = {
        name: `${character.name} Copy`,
        archetype: character.archetype || "custom",
        headline: character.headline || "",
        description: character.description || "",
        greeting: character.greeting || "",
        previewMessage: character.greeting || "",
        backstory: character.backstory || "",
        tags: character.tags ?? [],
        traitBadges: [],
        scenario: character.scenario ?? {},
        payload: nextPayload,
      };

      const created = await createMyCustomCharacter(input);

      setBanner({
        type: "success",
        message: `"${created.name}" was added to your library.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not duplicate character.";

      setBanner({
        type: "error",
        message:
          message === "AUTH_REQUIRED"
            ? "You need to log in before adding this character to your library."
            : message,
      });
    } finally {
      setDuplicating(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setBanner({
        type: "success",
        message: "Public link copied.",
      });
    } catch {
      setBanner({
        type: "error",
        message: "Could not copy link.",
      });
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-white/10 bg-white/[0.03] p-8 text-white/65">
          Loading public character...
        </div>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
          <div className="text-xs uppercase tracking-[0.22em] text-rose-200/80">
            Unavailable
          </div>
          <h1 className="mt-4 text-3xl font-semibold">This public character is unavailable.</h1>
          <p className="mt-3 text-sm leading-7 text-white/60">
            The character may have been made private, removed, or the link may be invalid.
          </p>
          <div className="mt-6">
            <Link
              href="/characters"
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
            >
              Back to Discover
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-[36px] border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-white/[0.04] to-cyan-400/10 p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
                  Public character
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  {character.archetype || "custom"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  Updated {formatRelativeDate(character.updated_at)}
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                {character.name}
              </h1>

              <p className="mt-3 max-w-3xl text-base leading-8 text-white/65">
                {publicTagline || character.headline || truncate(character.description, 220)}
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
                <button
                  type="button"
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-70"
                >
                  {duplicating ? "Adding..." : "Add to My Characters"}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80"
                >
                  Copy link
                </button>

                <Link
                  href="/characters"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80"
                >
                  Back to Discover
                </Link>
              </div>
            </div>
          </div>
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

        <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                Overview
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-white/78">
                {publicTeaser || character.description || character.greeting}
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                Scenario
              </div>
              <p className="mt-3 text-sm leading-8 text-white/78">
                {getScenarioSummary(character)}
              </p>
            </div>

            {character.backstory ? (
              <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Backstory
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-white/78">
                  {character.backstory}
                </p>
              </div>
            ) : null}
          </section>

          <aside className="space-y-6">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                Character greeting
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-white/78">
                {character.greeting || "No greeting saved."}
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                Tags
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[...publicTags, ...(character.tags ?? [])].slice(0, 12).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                  >
                    {tag}
                  </span>
                ))}
                {publicTags.length === 0 && (!character.tags || character.tags.length === 0) ? (
                  <span className="text-xs text-white/40">No tags added</span>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
