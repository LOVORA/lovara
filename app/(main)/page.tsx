"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const ONBOARDING_STORAGE_KEY = "lovora.home.onboarding.dismissed";
const FAVORITES_STORAGE_KEY = "lovora.favorite.characters";
const RECENT_STORAGE_KEY = "lovora.recent.characters";

const featuredCharacters = [
  {
    name: "Isla Vale",
    label: "Soft luxury",
    summary:
      "Elegant, emotionally attentive, slow-burn energy for intimate private chat.",
    tags: ["slow burn", "warm", "high-end"],
  },
  {
    name: "Kael Mercer",
    label: "Dark tension",
    summary:
      "Controlled, magnetic, sharp dialogue with a colder edge and strong presence.",
    tags: ["dominant", "cold", "intense"],
  },
  {
    name: "Mina Hart",
    label: "Playful comfort",
    summary:
      "Flirty, affectionate, quick chemistry with lighter banter and emotional warmth.",
    tags: ["playful", "sweet", "fast chemistry"],
  },
];

const studioSteps = [
  {
    title: "Choose the dynamic",
    description:
      "Set the relationship, tone, setting, and emotional pace so the character starts with a clear role.",
  },
  {
    title: "Shape the personality",
    description:
      "Control age vibe, archetype, speech style, reply length, and scenario direction without making the flow feel technical.",
  },
  {
    title: "Talk instantly",
    description:
      "Open the custom chat session with a stronger identity, better scene continuity, and more distinct responses.",
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
    title: "Characters feel designed, not randomly generated.",
    body:
      "The builder now pushes clearer identity, tone, relationship dynamics, and setting context into every character so outputs feel more intentional and more premium.",
  },
  {
    eyebrow: "Conversation quality",
    title: "Better scene continuity from the first message onward.",
    body:
      "Custom chat is tuned to preserve tone, opening state, and scenario direction more reliably, reducing generic assistant-style drift.",
  },
  {
    eyebrow: "Product flow",
    title: "Create, save, revisit, and continue without friction.",
    body:
      "The experience is structured as a system: landing, builder, saved characters, and custom chat all feed the same premium loop.",
  },
];

const onboardingSteps = [
  {
    id: "create",
    title: "Create your first character",
    description: "Open the studio and choose a template or build from scratch.",
    href: "/create-character",
    cta: "Open studio",
    icon: Wand2,
  },
  {
    id: "library",
    title: "Save it to your library",
    description: "Your private vault keeps characters ready for reuse and edits.",
    href: "/my-characters",
    cta: "Open library",
    icon: Library,
  },
  {
    id: "chat",
    title: "Start a private chat",
    description: "Move into an immersive roleplay flow with stronger continuity.",
    href: "/characters",
    cta: "Explore characters",
    icon: MessageCircle,
  },
] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

function OnboardingCard() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(ONBOARDING_STORAGE_KEY)
          : null;
      setDismissed(stored === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      // ignore storage failures
    }
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
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);

  useEffect(() => {
    setFavoriteCount(safeReadStringArray(FAVORITES_STORAGE_KEY).length);
    setRecentCount(safeReadStringArray(RECENT_STORAGE_KEY).length);
  }, []);

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

        <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-8 md:px-6 md:pb-28 md:pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
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

            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-white md:text-6xl xl:text-7xl">
              Build characters that feel more intimate, distinct, and worth coming
              back to.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
              Lovora is designed for premium AI character experiences: create a
              character with stronger identity, shape the exact dynamic you want,
              and continue the conversation inside a more immersive private chat.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/create-character"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 px-6 py-3 text-sm font-semibold text-[#110812] shadow-[0_14px_60px_rgba(236,72,153,0.28)] transition hover:scale-[1.01]"
              >
                Start creating
              </Link>
              <Link
                href="/my-characters"
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/82 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                View saved characters
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                <div className="text-2xl font-semibold text-white">Studio</div>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Quick Mode for speed, Detailed Studio for full control.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                <div className="text-2xl font-semibold text-white">Custom</div>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Fine-tune relationship, tone, setting, and scene direction.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                <div className="text-2xl font-semibold text-white">Memory</div>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Return to saved characters and continue the same dynamic.
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
                  <div className="font-medium text-white">Private session preview</div>
                  <div className="mt-1 text-xs text-white/45">
                    Stronger scene context, cleaner personality framing.
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  live flow
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[26px] border border-white/8 bg-white/[0.05] p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-white/45">
                    <span>Character identity</span>
                    <span>high-fidelity setup</span>
                  </div>
                  <div className="text-lg font-semibold text-white">
                    Elegant. Playful. Slightly dangerous.
                  </div>
                  <p className="mt-2 text-sm leading-7 text-white/58">
                    The builder shapes age vibe, archetype, setting, and the exact
                    emotional dynamic before the chat even starts.
                  </p>
                </div>

                <div className="rounded-[26px] border border-pink-300/15 bg-gradient-to-br from-pink-500/10 via-fuchsia-500/8 to-violet-500/10 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs text-pink-100/70">
                    <span className="h-2 w-2 rounded-full bg-pink-300" />
                    Opening scene
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    “You were impossible not to notice the second you walked in.
                    Sit down for a minute. I want to see if you’re as interesting
                    as you look.”
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/42">
                      Dynamic
                    </div>
                    <div className="mt-2 text-base font-medium text-white">
                      Stranger tension with immediate chemistry
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/42">
                      Setting
                    </div>
                    <div className="mt-2 text-base font-medium text-white">
                      Private lounge, late night, luxury energy
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
              Character direction
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Different moods, different intensities, different kinds of pull.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/60 md:text-base">
            The goal is not just more options. It is clearer identity so each
            character feels intentionally built from the start.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {featuredCharacters.map((character) => (
            <div
              key={character.name}
              className="group overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-pink-300/20 hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-pink-200/65">
                    {character.label}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {character.name}
                  </h3>
                </div>
                <div className="rounded-full border border-white/12 px-3 py-1 text-xs text-white/55">
                  preview
                </div>
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
            </div>
          ))}
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
