"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Wand2,
  Library,
  MessageCircle,
  X,
  BarChart3,
  Globe2,
  Heart,
  Clock3,
} from "lucide-react";
import AuthStatus from "@/components/auth/auth-status";
import { characters } from "@/lib/characters";

const ONBOARDING_STORAGE_KEY = "lovora.home.onboarding.dismissed";
const FAVORITES_STORAGE_KEY = "lovora.favorite.characters";
const RECENT_STORAGE_KEY = "lovora.recent.characters";

const featuredCharacters = characters.slice(0, 3).map((character) => ({
  id: character.slug,
  slug: character.slug,
  name: character.name,
  label: character.headline,
  summary: character.description,
  tags: Array.isArray(character.tags)
    ? character.tags
        .map((tag) => (typeof tag === "string" ? tag : tag.label))
        .slice(0, 3)
    : [],
  imageUrl: character.image,
}));

const studioSteps = [
  {
    title: "Choose the dynamic",
    description:
      "Pick the relationship, tone, and setting so the character starts with a clear role.",
  },
  {
    title: "Shape the personality",
    description:
      "Set the personality, speaking style, and mood without dealing with confusing options.",
  },
  {
    title: "Talk instantly",
    description:
      "Open chat right away and keep the same tone, setting, and feeling.",
  },
];

const trustSignals = [
  "Premium private chat feel",
  "Custom character studio",
  "Scenario-aware conversation",
  "Saved character library",
];

const featureColumns = [
  {
    eyebrow: "Character quality",
    title: "Characters feel clear from the first message.",
    body:
      "The builder gives each character a stronger identity, clearer tone, and a better starting dynamic.",
  },
  {
    eyebrow: "Conversation quality",
    title: "Chats stay more consistent.",
    body:
      "The chat keeps tone, scene, and personality more stable so replies feel less generic.",
  },
  {
    eyebrow: "Product flow",
    title: "Create, save, and come back easily.",
    body:
      "Everything is connected: create a character, save it, and continue the same conversation later.",
  },
];

const onboardingSteps = [
  {
    id: "create",
    title: "Create your first character",
    description: "Open the studio and start with a template or a blank character.",
    href: "/create-character",
    cta: "Open studio",
    icon: Wand2,
  },
  {
    id: "library",
    title: "Save it to your library",
    description: "Keep it in your library so it is easy to reopen and reuse later.",
    href: "/my-characters",
    cta: "Open library",
    icon: Library,
  },
  {
    id: "chat",
    title: "Open a ready-made character",
    description: "Browse Lovora's professional characters and jump into chat right away.",
    href: "/characters",
    cta: "Open professional",
    icon: MessageCircle,
  },
] as const;

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

function subscribeToHydration() {
  return () => {};
}

function useHydrated() {
  return useSyncExternalStore(subscribeToHydration, () => true, () => false);
}

function OnboardingCard() {
  const hydrated = useHydrated();
  const [dismissedOverride, setDismissedOverride] = useState(false);
  const dismissed = useMemo(() => {
    if (!hydrated) {
      return false;
    }

    try {
      return (
        dismissedOverride ||
        window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true"
      );
    } catch {
      return dismissedOverride;
    }
  }, [dismissedOverride, hydrated]);

  function handleDismiss() {
    setDismissedOverride(true);
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      // ignore storage failures
    }
  }

  if (!hydrated) {
    return (
      <section className="mx-auto mb-8 max-w-7xl px-4 pt-4 md:px-6">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(236,72,153,0.10),rgba(255,255,255,0.05),rgba(59,130,246,0.08))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="relative">
            <div className="h-[260px] rounded-[24px] bg-white/[0.04]" />
          </div>
        </div>
      </section>
    );
  }

  if (dismissed) return null;

  return (
    <section className="mx-auto mb-8 max-w-7xl px-4 pt-4 md:px-6">
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(236,72,153,0.10),rgba(255,255,255,0.05),rgba(59,130,246,0.08))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_24%)]" />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-pink-100/85">
                <Sparkles className="h-3.5 w-3.5" />
                Getting started
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                New here? Start with these 3 steps.
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-7 text-white/62">
                Lovora works best as a loop: create a character, save it into your
                library, then continue the relationship in private chat.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:border-white/20 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
              Dismiss
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {onboardingSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className="rounded-[26px] border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                      0{index + 1}
                    </div>
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-white/60">
                    {step.description}
                  </p>

                  <Link
                    href={step.href}
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/82 transition hover:border-white/20 hover:bg-white/10"
                  >
                    {step.cta}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Premium onboarding flow active
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductStats() {
  const hydrated = useHydrated();
  const favoriteCount = useMemo(
    () => (hydrated ? safeReadStringArray(FAVORITES_STORAGE_KEY).length : 0),
    [hydrated],
  );
  const recentCount = useMemo(
    () => (hydrated ? safeReadStringArray(RECENT_STORAGE_KEY).length : 0),
    [hydrated],
  );

  const stats = useMemo(
    () => [
      {
        label: "Built-in preview",
        value: "3",
        helper: "Landing page featured characters",
        icon: Sparkles,
      },
      {
        label: "Favorites saved",
        value: String(favoriteCount),
        helper: "Stored in your browser vault",
        icon: Heart,
      },
      {
        label: "Recently viewed",
        value: String(recentCount),
        helper: "Characters you explored lately",
        icon: Clock3,
      },
      {
        label: "Core product loop",
        value: "Create → Save → Chat",
        helper: "Premium character workflow",
        icon: BarChart3,
      },
    ],
    [favoriteCount, recentCount],
  );

  return (
    <section className="mx-auto mt-6 max-w-7xl px-4 md:px-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/80">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </div>

              <div className="mt-4 text-2xl font-semibold text-white">{stat.value}</div>
              <p className="mt-2 text-sm leading-7 text-white/58">{stat.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
          <Globe2 className="mr-1 inline h-3.5 w-3.5" />
          Public discovery enabled
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">
          Character studio live
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">
          Saved library active
        </span>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#06070b] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.16),transparent_28%),radial-gradient(circle_at_25%_35%,rgba(168,85,247,0.14),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_20%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-semibold tracking-[0.24em] text-pink-200 shadow-[0_0_30px_rgba(236,72,153,0.18)]">
              L
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.28em] text-white/95">
                LOVORA
              </div>
              <div className="text-xs text-white/45">
                Premium AI character platform
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <a href="#studio" className="transition hover:text-white">
              Studio
            </a>
            <a href="#characters" className="transition hover:text-white">
              Characters
            </a>
            <a href="#experience" className="transition hover:text-white">
              Experience
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/characters"
              className="hidden rounded-full border border-white/12 px-4 py-2 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/5 md:inline-flex"
            >
              Professional
            </Link>
            <Link
              href="/community"
              className="hidden rounded-full border border-white/12 px-4 py-2 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/5 md:inline-flex"
            >
              Community
            </Link>
            <Link
              href="/my-characters"
              className="hidden rounded-full border border-white/12 px-4 py-2 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/5 md:inline-flex"
            >
              My characters
            </Link>

            <Link
              href="/create-character"
              className="hidden rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0a0b10] transition hover:scale-[1.02] sm:inline-flex"
            >
              Open studio
            </Link>

            <div className="shrink-0">
              <AuthStatus />
            </div>
          </div>
        </header>

        <OnboardingCard />

      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-8 md:px-6 md:pb-28 md:pt-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <div className="mb-6 flex flex-wrap gap-2">
              {trustSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/68 backdrop-blur"
                >
                  {signal}
                </span>
              ))}
            </div>

            <h1 className="max-w-4xl text-4xl font-semibold leading-[0.98] tracking-tight text-white md:text-6xl xl:text-7xl">
              Create characters people actually want to talk to.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
              Build the personality, tone, relationship, and style in one place.
              Then move straight into chat without losing the feeling you created.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/create-character"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 px-6 py-3 text-sm font-semibold text-[#110812] shadow-[0_14px_60px_rgba(236,72,153,0.28)] transition hover:scale-[1.01]"
              >
                Create a character
              </Link>
              <Link
                href="/my-characters"
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/82 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open my library
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 backdrop-blur">
                <div className="text-2xl font-semibold text-white">Fast setup</div>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Quick mode when you want speed, deep mode when you want control.
                </p>
              </div>
              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 backdrop-blur">
                <div className="text-2xl font-semibold text-white">Clear personality</div>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Set the relationship, tone, scene, and speaking style clearly.
                </p>
              </div>
              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 backdrop-blur">
                <div className="text-2xl font-semibold text-white">Easy return</div>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Save the character and pick the chat back up later.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-12 top-10 hidden h-28 w-28 rounded-full bg-pink-500/20 blur-3xl lg:block" />
            <div className="absolute -right-6 bottom-8 hidden h-32 w-32 rounded-full bg-violet-500/20 blur-3xl lg:block" />

            <div className="relative overflow-hidden rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
                <div>
                  <div className="font-medium text-white">Chat preview</div>
                  <div className="mt-1 text-xs text-white/45">
                    Clear tone, better scene setup, easier roleplay flow.
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  live flow
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[26px] border border-white/8 bg-white/[0.05] p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-white/45">
                    <span>Character setup</span>
                    <span>ready to chat</span>
                  </div>
                  <div className="text-lg font-semibold text-white">
                    Calm, playful, and a little dangerous.
                  </div>
                  <p className="mt-2 text-sm leading-7 text-white/58">
                    The studio shapes the mood, personality, and relationship before the first message.
                  </p>
                </div>

                <div className="rounded-[26px] border border-pink-300/15 bg-gradient-to-br from-pink-500/10 via-fuchsia-500/8 to-violet-500/10 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs text-pink-100/70">
                    <span className="h-2 w-2 rounded-full bg-pink-300" />
                    Opening scene
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    “You stood out the second you walked in. Sit with me for a
                    minute. I want to see if you are as interesting as you look.”
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/42">
                      Dynamic
                    </div>
                    <div className="mt-2 text-base font-medium text-white">
                      Stranger tension with instant chemistry
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/42">
                      Setting
                    </div>
                    <div className="mt-2 text-base font-medium text-white">
                      Private lounge, late night, soft luxury mood
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ProductStats />
      </div>

      <section id="characters" className="mx-auto max-w-7xl px-4 py-18 md:px-6 md:py-24">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.28em] text-pink-200/70">
              Professional characters
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Three ready-made characters to open the mood right away.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/60 md:text-base">
            This section is now the site-managed collection. Community characters
            and your own saved characters each live in their own space.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {featuredCharacters.map((character) => (
            <div
              key={character.id}
              className="group overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-pink-300/20 hover:shadow-[0_30px_90px_rgba(0,0,0,0.3)]"
            >
              <div className="relative mb-5 overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
                {character.imageUrl ? (
                  <Image
                    src={character.imageUrl}
                    alt={character.name}
                    width={1200}
                    height={900}
                    unoptimized
                    className="h-64 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center p-5">
                    <div className="text-center">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-black/30 text-2xl font-semibold text-white/88">
                        {character.name.slice(0, 1)}
                      </div>
                      <div className="mt-4 text-sm text-white/60">
                        Avatar preview will appear here
                      </div>
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(6,7,11,0.58),transparent_45%)]" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="rounded-[22px] border border-white/10 bg-black/28 p-4 backdrop-blur">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                      Featured now
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {character.name}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm leading-6 text-white/68">
                      {character.label}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-pink-200/65">
                    {character.label}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {character.name}
                  </h3>
                </div>
                <Link
                  href={character.slug ? `/characters/${character.slug}` : "/characters"}
                  className="rounded-full border border-white/12 px-3 py-1 text-xs text-white/70 transition hover:border-white/20 hover:bg-white/5"
                >
                  Open
                </Link>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/60">
                {character.summary}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {character.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs text-white/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-5 border-t border-white/8 pt-4 text-xs uppercase tracking-[0.18em] text-white/42">
                Open the card, then start chat from the professional collection.
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/characters"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
          >
            Open professional characters
          </Link>
          <Link
            href="/community"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
          >
            Explore community
          </Link>
        </div>
      </section>

      <section id="studio" className="border-y border-white/8 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-18 md:px-6 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-pink-200/70">
              Studio flow
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              A cleaner path from idea to believable conversation.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/62">
              The builder was reworked to feel less chaotic and more premium,
              with a cleaner quick mode, stronger section hierarchy, and better
              control over the details that actually matter.
            </p>
          </div>

          <div className="space-y-4">
            {studioSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-300/20 bg-pink-400/10 text-sm font-semibold text-pink-100">
                    0{index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-white/58">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="experience" className="mx-auto max-w-7xl px-4 py-18 md:px-6 md:py-24">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm uppercase tracking-[0.28em] text-pink-200/70">
            Why it feels better
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            The premium feeling comes from structure, not just styling.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {featureColumns.map((item) => (
            <div
              key={item.title}
              className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 backdrop-blur"
            >
              <p className="text-sm uppercase tracking-[0.24em] text-pink-200/65">
                {item.eyebrow}
              </p>
              <h3 className="mt-4 text-2xl font-semibold leading-tight text-white">
                {item.title}
              </h3>
              <p className="mt-4 text-sm leading-8 text-white/60">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-6 md:pb-28">
        <div className="overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-12">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.28em] text-pink-200/70">
              Ready to build
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
              Start with a stronger character studio and a much cleaner product
              impression.
            </h2>
            <p className="mt-5 text-base leading-8 text-white/62">
              Open the builder, shape the exact dynamic you want, and move into a
              saved custom chat flow that already feels more polished.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/create-character"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b0c11] transition hover:scale-[1.01]"
            >
              Create a character
            </Link>
            <Link
              href="/my-characters"
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open your library
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
