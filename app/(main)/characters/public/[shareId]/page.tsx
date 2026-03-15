"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Library,
  Lock,
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { createMyCustomCharacter, type CharacterDraftInput } from "@/lib/account";
import {
  getIdentitySummary,
  getVisibilityFromPayload,
} from "@/lib/custom-character-studio";
import {
  getPublicCustomCharacterByShareId,
  type PublicCustomCharacter,
} from "@/lib/public-characters";

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
  const [duplicateSuccess, setDuplicateSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setBanner(null);
      setDuplicateSuccess(false);

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

  const publicTagline = character ? getPayloadValue(character.payload, "publicTagline") : "";
  const publicTeaser = character ? getPayloadValue(character.payload, "publicTeaser") : "";
  const publicTags = character
    ? getPayloadValue(character.payload, "publicTags")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const mergedTags = [...publicTags, ...(character?.tags ?? [])].slice(0, 12);

  async function handleDuplicate() {
    if (!character || duplicating) return;

    setDuplicating(true);
    setBanner(null);
    setDuplicateSuccess(false);

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

      setDuplicateSuccess(true);
      setBanner({
        type: "success",
        message: `"${created.name}" was added to your library as a private character.`,
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
      <main className="min-h-screen bg-neutral-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-sm text-white/70">
            Loading public character...
          </div>
        </div>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.04] p-8 md:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/72">
            <Lock className="h-4 w-4" />
            Unavailable
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">
            This public character is unavailable.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">
            The character may have been made private, removed, or the link may be invalid.
          </p>

          <div className="mt-8">
            <Link
              href="/characters"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Back to Discover
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-8 lg:px-10 lg:py-16">
          <div className="mb-6 text-sm text-white/50">
            <Link href="/characters" className="transition hover:text-white">
              Discover
            </Link>
            <span className="mx-2 text-white/25">/</span>
            <span>Public character</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-white/75">
                  Public character
                </span>
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-white/75">
                  {character.archetype || "custom"}
                </span>
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-white/75">
                  Updated {formatRelativeDate(character.updated_at)}
                </span>
              </div>

              <div>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
                  {character.name}
                </h1>

                <p className="mt-4 max-w-3xl text-base leading-7 text-white/68 md:text-lg">
                  {publicTagline || character.headline || truncate(character.description, 220)}
                </p>
              </div>

              {identitySummary.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {identitySummary.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/72"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                  <div className="text-sm text-white/50">Visibility after save</div>
                  <div className="mt-2 text-sm leading-6 text-white/82">
                    Added to your library as private by default.
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                  <div className="text-sm text-white/50">Use case</div>
                  <div className="mt-2 text-sm leading-6 text-white/82">
                    Save first, then customize tone, memory, and scenario later.
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                  <div className="text-sm text-white/50">Fast path</div>
                  <div className="mt-2 text-sm leading-6 text-white/82">
                    Add to library, then open it from My Characters.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {duplicating ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Library className="h-4 w-4" />
                      Add to My Characters
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/18 hover:bg-white/8"
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </button>

                <Link
                  href="/characters"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/18 hover:bg-white/8"
                >
                  Back to Discover
                </Link>
              </div>

              {banner ? (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    banner.type === "success"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                      : "border-red-400/25 bg-red-400/10 text-red-100",
                  )}
                >
                  {banner.message}
                </div>
              ) : null}

              {duplicateSuccess ? (
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <CheckCircle2 className="h-4 w-4" />
                    Added successfully
                  </div>

                  <p className="mt-3 text-sm leading-7 text-white/68">
                    This public character is now in your private library. You can edit it, rename
                    it, change visibility, and make it fully your own.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/my-characters"
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                    >
                      Go to My Characters
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <Link
                      href="/create-character"
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/18 hover:bg-white/8"
                    >
                      Create your own too
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <div className="text-sm uppercase tracking-[0.18em] text-white/45">
                Community preview
              </div>

              <div className="mt-4 rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Overview
                </div>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {publicTeaser || character.description || character.greeting}
                </p>
              </div>

              <div className="mt-4 rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Scenario
                </div>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {getScenarioSummary(character)}
                </p>
              </div>

              <div className="mt-4 rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Character greeting
                </div>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {character.greeting || "No greeting saved."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 md:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          {character.backstory ? (
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <div className="text-sm uppercase tracking-[0.18em] text-white/45">Backstory</div>
              <p className="mt-4 text-sm leading-8 text-white/72">{character.backstory}</p>
            </div>
          ) : (
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <div className="text-sm uppercase tracking-[0.18em] text-white/45">About</div>
              <p className="mt-4 text-sm leading-8 text-white/72">
                This public character is ready to be saved into your library and personalized from
                there.
              </p>
            </div>
          )}

          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <div className="text-sm uppercase tracking-[0.18em] text-white/45">Tags</div>

            <div className="mt-4 flex flex-wrap gap-2">
              {mergedTags.length > 0 ? (
                mergedTags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/72"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/55">
                  No tags added
                </span>
              )}
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <MessageCircle className="h-4 w-4" />
                Best workflow
              </div>
              <p className="mt-3 text-sm leading-7 text-white/68">
                Save this character to your private library first, then edit details, refine the
                scenario, and use it as your own long-term character.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
