"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Flame, Search, Sparkles, Star } from "lucide-react";

import { characters } from "@/lib/characters";

type CharacterLike = {
  slug?: string;
  name?: string;
  title?: string;
  headline?: string;
  description?: string;
  greeting?: string;
  category?: string;
  tags?: Array<string | { name?: string; label?: string; value?: string; category?: string }>;
};

type FilterKey = "all" | "romance" | "dark" | "soft" | "elite" | "fantasy";

const FILTERS: Array<{ key: FilterKey; label: string; helper: string }> = [
  { key: "all", label: "All characters", helper: "Browse the full Lovora collection" },
  { key: "romance", label: "Romance", helper: "Chemistry, tension, intimacy" },
  { key: "dark", label: "Dark", helper: "Danger, obsession, control" },
  { key: "soft", label: "Soft", helper: "Warmth, care, comfort" },
  { key: "elite", label: "Elite", helper: "Luxury, power, status" },
  { key: "fantasy", label: "Fantasy", helper: "Impossible worlds and vibes" },
];

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getCharacterName(character: CharacterLike): string {
  return normalizeText(character.name) || normalizeText(character.title) || "Untitled character";
}

function getCharacterHeadline(character: CharacterLike): string {
  return normalizeText(character.headline) || normalizeText(character.description) || normalizeText(character.greeting) || "A premium Lovora character built for immersive roleplay.";
}

function getCharacterDescription(character: CharacterLike): string {
  return (
    normalizeText(character.description) ||
    normalizeText(character.greeting) ||
    "Crafted to feel distinct, emotionally readable, and instantly usable in chat."
  );
}

function getTagLabels(character: CharacterLike): string[] {
  if (!Array.isArray(character.tags)) return [];

  return character.tags
    .map((tag) => {
      if (typeof tag === "string") return tag.trim();
      if (tag && typeof tag === "object") {
        return normalizeText(tag.label) || normalizeText(tag.name) || normalizeText(tag.value) || normalizeText(tag.category);
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 4);
}

function getFilterSignals(character: CharacterLike): string {
  return [
    getCharacterName(character),
    getCharacterHeadline(character),
    getCharacterDescription(character),
    normalizeText(character.category),
    ...getTagLabels(character),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesFilter(character: CharacterLike, filter: FilterKey): boolean {
  if (filter === "all") return true;

  const haystack = getFilterSignals(character);

  const terms: Record<Exclude<FilterKey, "all">, string[]> = {
    romance: ["romance", "romantic", "lover", "chemistry", "flirty", "intimate", "girlfriend", "boyfriend"],
    dark: ["dark", "obsessive", "danger", "dangerous", "mafia", "possessive", "dominant", "villain"],
    soft: ["soft", "warm", "comfort", "kind", "gentle", "caring", "sweet"],
    elite: ["elite", "luxury", "wealth", "billionaire", "ceo", "royal", "high status"],
    fantasy: ["fantasy", "myth", "dragon", "kingdom", "supernatural", "immortal", "vampire"],
  };

  return terms[filter].some((term) => haystack.includes(term));
}

function buildStatText(total: number, shown: number): string {
  if (total === 0) return "No characters found yet";
  if (shown === total) return `${total} characters ready to explore`;
  return `${shown} of ${total} characters shown`;
}

export default function CharactersPage() {
  const source = (characters as CharacterLike[]) ?? [];
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return source.filter((character) => {
      const inFilter = matchesFilter(character, activeFilter);
      if (!inFilter) return false;
      if (!normalizedQuery) return true;

      return getFilterSignals(character).includes(normalizedQuery);
    });
  }, [activeFilter, query, source]);

  const featured = filtered.slice(0, 3);
  const gridCharacters = filtered.slice(3);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16 md:px-8 lg:px-10 lg:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white/80 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Discover premium roleplay characters
              </div>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
                  Find a character that already feels alive before the first message.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                  Explore Lovora’s built-in cast through mood, chemistry, power, softness, and fantasy.
                  The goal is simple: less browsing fatigue, more instant connection.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <div className="text-sm text-white/55">Library</div>
                <div className="mt-2 text-2xl font-semibold">{source.length}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <div className="text-sm text-white/55">Curated mood</div>
                <div className="mt-2 text-2xl font-semibold">6</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur col-span-2 sm:col-span-1">
                <div className="text-sm text-white/55">Fast path</div>
                <div className="mt-2 text-2xl font-semibold">Create + chat</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/6 p-4 backdrop-blur md:p-5">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <Search className="h-4 w-4 text-white/45" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, mood, energy, fantasy, romance..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
              <div className="text-sm text-white/55">Visible collection</div>
              <div className="mt-2 text-lg font-medium text-white">{buildStatText(source.length, filtered.length)}</div>
              <div className="mt-2 text-sm leading-6 text-white/55">
                Use mood filters below or search directly to jump into the right kind of character faster.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 md:px-8 lg:px-10">
        <div className="flex flex-wrap gap-3">
          {FILTERS.map((filter) => {
            const selected = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-white/20 bg-white text-black shadow-[0_10px_40px_rgba(255,255,255,0.1)]"
                    : "border-white/10 bg-white/5 text-white hover:border-white/18 hover:bg-white/8"
                }`}
              >
                <div className="text-sm font-medium">{filter.label}</div>
                <div className={`mt-1 text-xs ${selected ? "text-black/65" : "text-white/50"}`}>{filter.helper}</div>
              </button>
            );
          })}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 pb-8 md:px-8 lg:px-10">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/6 p-2">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Featured picks</h2>
              <p className="text-sm text-white/55">A tighter first row for the strongest first impression.</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {featured.map((character) => {
              const name = getCharacterName(character);
              const headline = getCharacterHeadline(character);
              const description = getCharacterDescription(character);
              const tags = getTagLabels(character);
              const slug = normalizeText(character.slug);

              return (
                <article
                  key={slug || name}
                  className="group rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 transition hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-white/70">
                        <Star className="h-3.5 w-3.5" />
                        Featured
                      </div>
                      <h3 className="mt-4 text-2xl font-semibold tracking-tight">{name}</h3>
                      <p className="mt-2 text-sm text-white/62">{headline}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-white/58">
                      {normalizeText(character.category) || "Lovora"}
                    </div>
                  </div>

                  <p className="mt-5 line-clamp-4 text-sm leading-7 text-white/68">{description}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {tags.length > 0 ? (
                      tags.map((tag) => (
                        <span key={`${name}-${tag}`} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/55">
                        Premium roleplay
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <Link
                      href={slug ? `/characters/${slug}` : "/characters"}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                    >
                      Open character
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/create-character"
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/78 transition hover:border-white/18 hover:bg-white/8"
                    >
                      Create your own
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-6 pb-20 md:px-8 lg:px-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Browse all characters</h2>
            <p className="mt-2 text-sm text-white/55">Built for quick scanning without making every card feel the same.</p>
          </div>
          <Link
            href="/create-character"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/78 transition hover:border-white/18 hover:bg-white/8"
          >
            Build custom character
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-16 text-center">
            <h3 className="text-2xl font-semibold tracking-tight">No characters match this search yet.</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/58">
              Try a broader mood, remove a search term, or create a custom character that fits exactly what you want.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveFilter("all");
                }}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Reset filters
              </button>
              <Link
                href="/create-character"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/18 hover:bg-white/8"
              >
                Create custom character
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {gridCharacters.map((character) => {
              const name = getCharacterName(character);
              const headline = getCharacterHeadline(character);
              const description = getCharacterDescription(character);
              const tags = getTagLabels(character);
              const slug = normalizeText(character.slug);

              return (
                <article
                  key={slug || name}
                  className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">{name}</h3>
                      <p className="mt-2 text-sm text-white/60">{headline}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/48">
                      {normalizeText(character.category) || "Character"}
                    </div>
                  </div>

                  <p className="mt-4 flex-1 text-sm leading-7 text-white/66">{description}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {tags.length > 0 ? (
                      tags.map((tag) => (
                        <span key={`${name}-${tag}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/68">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/52">
                        Distinct tone
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/8 pt-5">
                    <span className="text-sm text-white/45">Open details to start chatting</span>
                    <Link
                      href={slug ? `/characters/${slug}` : "/characters"}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                    >
                      View
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

