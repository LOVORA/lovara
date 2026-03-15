"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Flame,
  Heart,
  Search,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

import { characters } from "@/lib/characters";
import { CHARACTER_IMAGES_BUCKET } from "@/lib/character-images";
import { supabase } from "@/lib/supabase";
import {
  listPublicCustomCharacters,
  type PublicCustomCharacter,
} from "@/lib/public-characters";
import { getPublicShareHref } from "@/lib/custom-character-studio";

type CharacterLike = {
  slug?: string;
  name?: string;
  title?: string;
  headline?: string;
  description?: string;
  greeting?: string;
  category?: string;
  tags?: Array<
    string | { name?: string; label?: string; value?: string; category?: string }
  >;
};

type FilterKey =
  | "all"
  | "favorites"
  | "romance"
  | "dark"
  | "soft"
  | "elite"
  | "fantasy";

type DiscoverCharacter = {
  id: string;
  slug: string;
  name: string;
  headline: string;
  description: string;
  category: string;
  tags: string[];
  href: string;
  source: "built-in" | "public-custom";
  createdAt?: string;
  updatedAt?: string;
};

type AvatarUrlMap = Record<string, string>;

type CharacterImageLookupRow = {
  id: string;
  character_id: string;
  storage_path: string | null;
  public_url: string | null;
  is_primary: boolean;
  created_at: string;
};

const FAVORITES_STORAGE_KEY = "lovora.favorite.characters";
const RECENT_STORAGE_KEY = "lovora.recent.characters";

const FILTERS: Array<{ key: FilterKey; label: string; helper: string }> = [
  { key: "all", label: "All characters", helper: "Browse the full Lovora collection" },
  { key: "favorites", label: "Favorites", helper: "Only the characters you saved" },
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
  return (
    normalizeText(character.headline) ||
    normalizeText(character.description) ||
    normalizeText(character.greeting) ||
    "A premium Lovora character built for immersive roleplay."
  );
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
        return (
          normalizeText(tag.label) ||
          normalizeText(tag.name) ||
          normalizeText(tag.value) ||
          normalizeText(tag.category)
        );
      }

      return "";
    })
    .filter(Boolean)
    .slice(0, 4);
}

function getFilterSignals(character: DiscoverCharacter): string {
  return [
    character.name,
    character.headline,
    character.description,
    character.category,
    ...character.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function matchesFilter(character: DiscoverCharacter, filter: FilterKey): boolean {
  if (filter === "all" || filter === "favorites") return true;

  const haystack = getFilterSignals(character);

  const terms: Record<Exclude<FilterKey, "all" | "favorites">, string[]> = {
    romance: [
      "romance",
      "romantic",
      "lover",
      "chemistry",
      "flirty",
      "intimate",
      "girlfriend",
      "boyfriend",
      "slow burn",
    ],
    dark: [
      "dark",
      "obsessive",
      "danger",
      "dangerous",
      "mafia",
      "possessive",
      "dominant",
      "villain",
    ],
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

function mapBuiltInCharacters(source: CharacterLike[]): DiscoverCharacter[] {
  return source.map((character, index) => {
    const slug = normalizeText(character.slug);
    const name = getCharacterName(character);

    return {
      id: `built-in-${index}-${slug || name}`,
      slug,
      name,
      headline: getCharacterHeadline(character),
      description: getCharacterDescription(character),
      category: normalizeText(character.category) || "Built-in",
      tags: getTagLabels(character),
      href: slug ? `/characters/${slug}` : "/characters",
      source: "built-in",
    };
  });
}

function mapPublicCustomCharacters(source: PublicCustomCharacter[]): DiscoverCharacter[] {
  return source.flatMap((character) => {
    const href = getPublicShareHref(character.payload);
    if (!href) return [];

    return [
      {
        id: character.id,
        slug: character.slug,
        name: character.name,
        headline: normalizeText(character.headline) || normalizeText(character.description),
        description:
          normalizeText(character.description) ||
          normalizeText(character.preview_message) ||
          "Public custom character",
        category: character.archetype || "Public custom",
        tags: Array.isArray(character.tags) ? character.tags.slice(0, 4) : [],
        href,
        source: "public-custom" as const,
        createdAt: character.created_at,
        updatedAt: character.updated_at,
      },
    ];
  });
}

function getFavoriteKey(character: DiscoverCharacter): string {
  return `${character.source}:${character.slug || character.id}`;
}

function getRecentKey(character: DiscoverCharacter): string {
  return `${character.source}:${character.slug || character.id}`;
}

function safeReadStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function saveStringArray(key: string, value: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage write issues
  }
}

function isNewCharacter(character: DiscoverCharacter): boolean {
  const rawDate = character.updatedAt || character.createdAt;
  if (!rawDate) return false;

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return false;

  const diff = Date.now() - date.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return diff <= sevenDays;
}

function getQualityBadges(
  character: DiscoverCharacter,
  options: { isFavorite: boolean; isRecent: boolean; favoriteCount: number },
): Array<{ label: string; icon: "favorite" | "new" | "community" | "built-in" | "popular" | "recent" }> {
  const badges: Array<{
    label: string;
    icon: "favorite" | "new" | "community" | "built-in" | "popular" | "recent";
  }> = [];

  if (options.isFavorite) {
    badges.push({ label: "Favorite", icon: "favorite" });
  }

  if (options.isRecent) {
    badges.push({ label: "Recent", icon: "recent" });
  }

  if (isNewCharacter(character)) {
    badges.push({ label: "New", icon: "new" });
  }

  if (character.source === "public-custom") {
    badges.push({ label: "Community", icon: "community" });
  } else {
    badges.push({ label: "Built-in", icon: "built-in" });
  }

  const signals = getFilterSignals(character);
  const strongVibe =
    signals.includes("romance") ||
    signals.includes("dark") ||
    signals.includes("fantasy") ||
    signals.includes("billionaire") ||
    signals.includes("mafia");

  if (strongVibe) {
    badges.push({ label: "Popular vibe", icon: "popular" });
  }

  return badges.slice(0, 3);
}

function renderBadgeIcon(icon: "favorite" | "new" | "community" | "built-in" | "popular" | "recent") {
  switch (icon) {
    case "favorite":
      return <Heart className="h-3.5 w-3.5 fill-white text-white" />;
    case "new":
      return <Sparkles className="h-3.5 w-3.5" />;
    case "community":
      return <BadgeCheck className="h-3.5 w-3.5" />;
    case "built-in":
      return <Star className="h-3.5 w-3.5" />;
    case "popular":
      return <TrendingUp className="h-3.5 w-3.5" />;
    case "recent":
      return <Clock3 className="h-3.5 w-3.5" />;
  }
}

function CharacterCover({
  character,
  avatarUrl,
}: {
  character: DiscoverCharacter;
  avatarUrl?: string;
}) {
  return (
    <div className="relative h-56 w-full overflow-hidden border-b border-white/10 bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${character.name} avatar`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.08),transparent_28%)]" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(10,11,18,0.72),transparent_45%)]" />

      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
        <div>
          <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/68 backdrop-blur">
            {character.source === "public-custom" ? "Public custom" : "Built-in"}
          </div>
        </div>

        {!avatarUrl ? (
          <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/60 backdrop-blur">
            No avatar yet
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CharactersPage() {
  const builtInSource = useMemo(() => (characters as CharacterLike[]) ?? [], []);

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [publicCharacters, setPublicCharacters] = useState<PublicCustomCharacter[]>([]);
  const [avatarUrlMap, setAvatarUrlMap] = useState<AvatarUrlMap>({});
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);

  async function loadAvatarState(sourceRows: PublicCustomCharacter[]) {
    try {
      if (sourceRows.length === 0) {
        setAvatarUrlMap({});
        return;
      }

      const characterIds = sourceRows.map((item) => item.id);
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

  useEffect(() => {
    let cancelled = false;

    async function loadPublicCharacters() {
      try {
        const data = await listPublicCustomCharacters();
        const nextRows = Array.isArray(data) ? data : [];

        if (!cancelled) {
          setPublicCharacters(nextRows);
          await loadAvatarState(nextRows);
        }
      } catch {
        if (!cancelled) {
          setPublicCharacters([]);
          setAvatarUrlMap({});
        }
      } finally {
        if (!cancelled) {
          setLoadingPublic(false);
        }
      }
    }

    loadPublicCharacters();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFavoriteKeys(safeReadStringArray(FAVORITES_STORAGE_KEY));
    setRecentKeys(safeReadStringArray(RECENT_STORAGE_KEY));
  }, []);

  useEffect(() => {
    saveStringArray(FAVORITES_STORAGE_KEY, favoriteKeys);
  }, [favoriteKeys]);

  useEffect(() => {
    saveStringArray(RECENT_STORAGE_KEY, recentKeys);
  }, [recentKeys]);

  const source = useMemo<DiscoverCharacter[]>(() => {
    const builtInCharacters = mapBuiltInCharacters(builtInSource);
    const publicCustomCharacters = mapPublicCustomCharacters(publicCharacters);

    return [...publicCustomCharacters, ...builtInCharacters];
  }, [builtInSource, publicCharacters]);

  const favoriteCharacters = useMemo(() => {
    const favoriteSet = new Set(favoriteKeys);
    return source.filter((character) => favoriteSet.has(getFavoriteKey(character)));
  }, [favoriteKeys, source]);

  const recentCharacters = useMemo(() => {
    const sourceMap = new Map(source.map((character) => [getRecentKey(character), character]));
    return recentKeys
      .map((key) => sourceMap.get(key))
      .filter((character): character is DiscoverCharacter => Boolean(character))
      .slice(0, 6);
  }, [recentKeys, source]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const favoriteSet = new Set(favoriteKeys);

    return source.filter((character) => {
      const isFavorite = favoriteSet.has(getFavoriteKey(character));

      if (activeFilter === "favorites" && !isFavorite) return false;

      const inFilter = matchesFilter(character, activeFilter);
      if (!inFilter) return false;

      if (!normalizedQuery) return true;

      return getFilterSignals(character).includes(normalizedQuery);
    });
  }, [activeFilter, favoriteKeys, query, source]);

  const featured = filtered.slice(0, 3);
  const gridCharacters = filtered.slice(3);

  function toggleFavorite(character: DiscoverCharacter) {
    const key = getFavoriteKey(character);

    setFavoriteKeys((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }

      return [key, ...current];
    });
  }

  function isFavorited(character: DiscoverCharacter) {
    return favoriteKeys.includes(getFavoriteKey(character));
  }

  function isRecent(character: DiscoverCharacter) {
    return recentKeys.includes(getRecentKey(character));
  }

  function registerRecent(character: DiscoverCharacter) {
    const key = getRecentKey(character);

    setRecentKeys((current) => {
      const next = [key, ...current.filter((item) => item !== key)];
      return next.slice(0, 12);
    });
  }

  function getAvatarUrl(character: DiscoverCharacter) {
    if (character.source !== "public-custom") return undefined;
    return avatarUrlMap[character.id];
  }

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
                  Explore Lovora’s built-in cast and public custom characters through mood,
                  chemistry, power, softness, fantasy, favorites, recent browsing, and stronger
                  quality signals.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <div className="text-sm text-white/55">Library</div>
                <div className="mt-2 text-2xl font-semibold">{source.length}</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <div className="text-sm text-white/55">Public custom</div>
                <div className="mt-2 text-2xl font-semibold">
                  {loadingPublic ? "..." : publicCharacters.length}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <div className="text-sm text-white/55">Favorites</div>
                <div className="mt-2 text-2xl font-semibold">{favoriteCharacters.length}</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <div className="text-sm text-white/55">Recent</div>
                <div className="mt-2 text-2xl font-semibold">{recentCharacters.length}</div>
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
              <div className="mt-2 text-lg font-medium text-white">
                {buildStatText(source.length, filtered.length)}
              </div>
              <div className="mt-2 text-sm leading-6 text-white/55">
                Built-in characters stay available. Public custom characters appear here only
                when their owner publishes them.
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
                <div className={`mt-1 text-xs ${selected ? "text-black/65" : "text-white/50"}`}>
                  {filter.helper}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {recentCharacters.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 pb-8 md:px-8 lg:px-10">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/6 p-2">
              <Clock3 className="h-4 w-4 text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Recent characters</h2>
              <p className="text-sm text-white/55">
                Fast return path to the characters you viewed most recently.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {recentCharacters.slice(0, 3).map((character) => {
              const favorited = isFavorited(character);
              const badges = getQualityBadges(character, {
                isFavorite: favorited,
                isRecent: true,
                favoriteCount: favoriteCharacters.length,
              });
              const avatarUrl = getAvatarUrl(character);

              return (
                <article
                  key={`recent-${character.id}`}
                  className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  <CharacterCover character={character} avatarUrl={avatarUrl} />

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
                          Recent
                        </div>
                        <h3 className="mt-3 text-xl font-semibold tracking-tight">{character.name}</h3>
                        <p className="mt-2 text-sm text-white/60">{character.headline}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFavorite(character)}
                        aria-label={favorited ? "Remove favorite" : "Add favorite"}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/75 transition hover:border-white/18 hover:bg-white/8"
                      >
                        <Heart
                          className={`h-4 w-4 ${favorited ? "fill-white text-white" : "text-white/70"}`}
                        />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {badges.map((badge) => (
                        <span
                          key={`${character.id}-${badge.label}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] text-white/72"
                        >
                          {renderBadgeIcon(badge.icon)}
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 flex-1 text-sm leading-7 text-white/66">
                      {character.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {character.tags.length > 0 ? (
                        character.tags.map((tag) => (
                          <span
                            key={`${character.id}-${tag}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/68"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/52">
                          Recently viewed
                        </span>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/8 pt-5">
                      <span className="text-sm text-white/45">
                        {character.source === "public-custom"
                          ? "Public community character"
                          : "Built-in Lovora character"}
                      </span>

                      <Link
                        href={character.href}
                        onClick={() => registerRecent(character)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                      >
                        View
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {favoriteCharacters.length > 0 && activeFilter !== "favorites" ? (
        <section className="mx-auto max-w-7xl px-6 pb-8 md:px-8 lg:px-10">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/6 p-2">
              <Heart className="h-4 w-4 fill-white text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Your favorites</h2>
              <p className="text-sm text-white/55">
                Quick access to the characters you want to come back to.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {favoriteCharacters.slice(0, 3).map((character) => {
              const favorited = isFavorited(character);
              const badges = getQualityBadges(character, {
                isFavorite: favorited,
                isRecent: isRecent(character),
                favoriteCount: favoriteCharacters.length,
              });
              const avatarUrl = getAvatarUrl(character);

              return (
                <article
                  key={`favorite-${character.id}`}
                  className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  <CharacterCover character={character} avatarUrl={avatarUrl} />

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
                          Favorite
                        </div>
                        <h3 className="mt-3 text-xl font-semibold tracking-tight">{character.name}</h3>
                        <p className="mt-2 text-sm text-white/60">{character.headline}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFavorite(character)}
                        aria-label={favorited ? "Remove favorite" : "Add favorite"}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/75 transition hover:border-white/18 hover:bg-white/8"
                      >
                        <Heart
                          className={`h-4 w-4 ${favorited ? "fill-white text-white" : "text-white/70"}`}
                        />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {badges.map((badge) => (
                        <span
                          key={`${character.id}-${badge.label}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] text-white/72"
                        >
                          {renderBadgeIcon(badge.icon)}
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 flex-1 text-sm leading-7 text-white/66">
                      {character.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {character.tags.length > 0 ? (
                        character.tags.map((tag) => (
                          <span
                            key={`${character.id}-${tag}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/68"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/52">
                          Saved favorite
                        </span>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/8 pt-5">
                      <span className="text-sm text-white/45">
                        {character.source === "public-custom"
                          ? "Public community character"
                          : "Built-in Lovora character"}
                      </span>

                      <Link
                        href={character.href}
                        onClick={() => registerRecent(character)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                      >
                        View
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 pb-8 md:px-8 lg:px-10">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/6 p-2">
              <Flame className="h-4 w-4 text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Featured picks</h2>
              <p className="text-sm text-white/55">
                Built-in and public custom characters together.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {featured.map((character) => {
              const favorited = isFavorited(character);
              const badges = getQualityBadges(character, {
                isFavorite: favorited,
                isRecent: isRecent(character),
                favoriteCount: favoriteCharacters.length,
              });
              const avatarUrl = getAvatarUrl(character);

              return (
                <article
                  key={character.id}
                  className="group flex flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] transition hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))]"
                >
                  <CharacterCover character={character} avatarUrl={avatarUrl} />

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-white/70">
                          <Star className="h-3.5 w-3.5" />
                          {character.source === "public-custom" ? "Public custom" : "Featured"}
                        </div>

                        <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                          {character.name}
                        </h3>

                        <p className="mt-2 text-sm text-white/62">{character.headline}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-white/58">
                          {character.category || "Lovora"}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleFavorite(character)}
                          aria-label={favorited ? "Remove favorite" : "Add favorite"}
                          className="rounded-2xl border border-white/10 bg-white/6 p-3 text-white/75 transition hover:border-white/18 hover:bg-white/8"
                        >
                          <Heart
                            className={`h-4 w-4 ${favorited ? "fill-white text-white" : "text-white/70"}`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {badges.map((badge) => (
                        <span
                          key={`${character.id}-${badge.label}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] text-white/72"
                        >
                          {renderBadgeIcon(badge.icon)}
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <p className="mt-5 line-clamp-4 text-sm leading-7 text-white/68">
                      {character.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {character.tags.length > 0 ? (
                        character.tags.map((tag) => (
                          <span
                            key={`${character.id}-${tag}`}
                            className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70"
                          >
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
                        href={character.href}
                        onClick={() => registerRecent(character)}
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
            <p className="mt-2 text-sm text-white/55">
              Public custom characters appear here only when published.
            </p>
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
            <h3 className="text-2xl font-semibold tracking-tight">
              No characters match this search yet.
            </h3>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/58">
              Try a broader mood, remove a search term, or create a custom character that fits
              exactly what you want.
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
              const favorited = isFavorited(character);
              const badges = getQualityBadges(character, {
                isFavorite: favorited,
                isRecent: isRecent(character),
                favoriteCount: favoriteCharacters.length,
              });
              const avatarUrl = getAvatarUrl(character);

              return (
                <article
                  key={character.id}
                  className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  <CharacterCover character={character} avatarUrl={avatarUrl} />

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold tracking-tight">{character.name}</h3>
                        <p className="mt-2 text-sm text-white/60">{character.headline}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/48">
                          {character.source === "public-custom" ? "Public custom" : "Built-in"}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleFavorite(character)}
                          aria-label={favorited ? "Remove favorite" : "Add favorite"}
                          className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/75 transition hover:border-white/18 hover:bg-white/8"
                        >
                          <Heart
                            className={`h-4 w-4 ${favorited ? "fill-white text-white" : "text-white/70"}`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {badges.map((badge) => (
                        <span
                          key={`${character.id}-${badge.label}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] text-white/72"
                        >
                          {renderBadgeIcon(badge.icon)}
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 flex-1 text-sm leading-7 text-white/66">
                      {character.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {character.tags.length > 0 ? (
                        character.tags.map((tag) => (
                          <span
                            key={`${character.id}-${tag}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/68"
                          >
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
                      <span className="text-sm text-white/45">
                        {character.source === "public-custom"
                          ? "Public community character"
                          : "Built-in Lovora character"}
                      </span>

                      <Link
                        href={character.href}
                        onClick={() => registerRecent(character)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                      >
                        View
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
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
