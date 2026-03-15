import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MessageCircle, Sparkles, Star } from "lucide-react";

import Footer from "@/components/landing/footer";
import Navbar from "@/components/landing/navbar";
import { getCharacterBySlug } from "@/lib/characters";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type GenericRecord = Record<string, unknown>;

type ScenarioStarter = {
  title: string;
  prompt: string;
  openingMessage: string;
};

type RelatedCharacter = {
  slug: string;
  name: string;
  archetype: string;
  headline: string;
  image?: string;
  tags: unknown[];
};

type CharacterDetail = {
  slug: string;
  name: string;
  archetype: string;
  role: string;
  headline: string;
  personality: string;
  description: string;
  backstory: string;
  greeting: string;
  image?: string;
  tags: unknown[];
  traits: unknown[];
  memory?: unknown;
  scenario?: unknown;
  history?: unknown;
  scenarioStarters: ScenarioStarter[];
  relatedCharacters: RelatedCharacter[];
  __source?: string;
  createdFromBuilder?: boolean;
};

function isRecord(value: unknown): value is GenericRecord {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toDisplayText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";

  if (isRecord(value)) {
    const preferredKeys = ["label", "name", "title", "value", "text", "slug", "id", "key"];

    for (const key of preferredKeys) {
      const candidate = value[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function getTagKey(tag: unknown, index: number): string {
  if (typeof tag === "string" && tag.trim()) {
    return `tag-${tag}-${index}`;
  }

  if (isRecord(tag)) {
    const category =
      typeof tag.category === "string" && tag.category.trim() ? tag.category.trim() : "misc";
    const label = toDisplayText(tag);
    return `tag-${category}-${label}-${index}`;
  }

  return `tag-${index}`;
}

function getTagLabel(tag: unknown): string {
  return toDisplayText(tag);
}

function getTagCategory(tag: unknown): string | null {
  if (!isRecord(tag)) return null;

  return typeof tag.category === "string" && tag.category.trim() ? tag.category.trim() : null;
}

function getTraitLabel(trait: unknown): string {
  return toDisplayText(trait);
}

function getTraitScore(trait: unknown): number | null {
  if (!isRecord(trait)) return null;

  return typeof trait.score === "number" && Number.isFinite(trait.score) ? trait.score : null;
}

function getMemoryItems(memory: unknown): string[] {
  if (Array.isArray(memory)) {
    return memory.map((item: unknown) => toDisplayText(item)).filter(Boolean);
  }

  if (!isRecord(memory)) return [];

  const entries: string[] = [];

  if (typeof memory.remembersName === "boolean") {
    entries.push(`Remembers your name: ${memory.remembersName ? "Yes" : "No"}`);
  }

  if (typeof memory.remembersPreferences === "boolean") {
    entries.push(`Remembers preferences: ${memory.remembersPreferences ? "Yes" : "No"}`);
  }

  if (typeof memory.remembersPastChats === "boolean") {
    entries.push(`Carries past chats forward: ${memory.remembersPastChats ? "Yes" : "No"}`);
  }

  return entries;
}

function getScenarioDetails(scenario: unknown): Array<{ label: string; value: string }> {
  if (!isRecord(scenario)) return [];

  const pairs: Array<{ label: string; value: string | undefined }> = [
    {
      label: "Setting",
      value: typeof scenario.setting === "string" ? scenario.setting : undefined,
    },
    {
      label: "Relationship",
      value:
        typeof scenario.relationshipToUser === "string"
          ? scenario.relationshipToUser
          : undefined,
    },
    {
      label: "Scene goal",
      value: typeof scenario.sceneGoal === "string" ? scenario.sceneGoal : undefined,
    },
    {
      label: "Tone",
      value: typeof scenario.tone === "string" ? scenario.tone : undefined,
    },
    {
      label: "Opening state",
      value: typeof scenario.openingState === "string" ? scenario.openingState : undefined,
    },
  ];

  return pairs
    .filter((item) => item.value && item.value.trim())
    .map((item) => ({
      label: item.label,
      value: item.value!.trim(),
    }));
}

function getHistoryDetails(history: unknown): Array<{ label: string; value: string }> {
  if (!isRecord(history)) return [];

  const pairs: Array<{ label: string; value: string | undefined }> = [
    {
      label: "Origin",
      value: typeof history.origin === "string" ? history.origin : undefined,
    },
    {
      label: "Occupation",
      value: typeof history.occupation === "string" ? history.occupation : undefined,
    },
    {
      label: "Public mask",
      value: typeof history.publicMask === "string" ? history.publicMask : undefined,
    },
    {
      label: "Private self",
      value: typeof history.privateSelf === "string" ? history.privateSelf : undefined,
    },
    {
      label: "Defining desire",
      value: typeof history.definingDesire === "string" ? history.definingDesire : undefined,
    },
    {
      label: "Emotional wound",
      value: typeof history.emotionalWound === "string" ? history.emotionalWound : undefined,
    },
    {
      label: "Secret",
      value: typeof history.secret === "string" ? history.secret : undefined,
    },
  ];

  return pairs
    .filter((item) => item.value && item.value.trim())
    .map((item) => ({
      label: item.label,
      value: item.value!.trim(),
    }));
}

function normalizeScenarioStarters(value: unknown): ScenarioStarter[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: unknown): ScenarioStarter | null => {
      if (!isRecord(item)) return null;

      const title = asString(item.title).trim();
      const prompt = asString(item.prompt).trim();
      const openingMessage = asString(item.openingMessage).trim();

      if (!title || !prompt || !openingMessage) return null;

      return {
        title,
        prompt,
        openingMessage,
      };
    })
    .filter((item): item is ScenarioStarter => item !== null);
}

function normalizeRelatedCharacters(value: unknown, currentSlug: string): RelatedCharacter[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: unknown): RelatedCharacter | null => {
      if (!isRecord(item)) return null;

      const slug = asString(item.slug).trim();
      const name = asString(item.name).trim();
      const archetype = asString(item.archetype).trim();
      const headline = asString(item.headline).trim();
      const image = asString(item.image).trim() || undefined;
      const tags = Array.isArray(item.tags) ? item.tags : [];

      if (!slug || !name || !archetype || !headline) return null;
      if (slug === currentSlug) return null;

      return {
        slug,
        name,
        archetype,
        headline,
        image,
        tags,
      };
    })
    .filter((item): item is RelatedCharacter => item !== null)
    .slice(0, 3);
}

function normalizeCharacter(raw: unknown): CharacterDetail | null {
  if (!isRecord(raw)) return null;

  const slug = asString(raw.slug).trim();
  const name = asString(raw.name).trim();

  if (!slug || !name) return null;

  return {
    slug,
    name,
    archetype: asString(raw.archetype, "character"),
    role: asString(raw.role, "AI Companion"),
    headline: asString(raw.headline),
    personality: asString(raw.personality),
    description: asString(raw.description),
    backstory: asString(raw.backstory),
    greeting: asString(raw.greeting),
    image: asString(raw.image).trim() || undefined,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    traits: Array.isArray(raw.traits) ? raw.traits : [],
    memory: raw.memory,
    scenario: raw.scenario,
    history: raw.history,
    scenarioStarters: normalizeScenarioStarters(raw.scenarioStarters),
    relatedCharacters: normalizeRelatedCharacters(raw.relatedCharacters, slug),
    __source: asString(raw.__source).trim() || undefined,
    createdFromBuilder: Boolean(raw.createdFromBuilder),
  };
}

function getPrimaryChatHref(slug: string): string {
  return `/chat/${slug}`;
}

function getQuickStarterText(starters: ScenarioStarter[], greeting: string): string {
  if (starters.length > 0) {
    return starters[0].openingMessage;
  }

  return greeting.trim() || "Start the conversation and let the tone unfold naturally.";
}

export default async function CharacterDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const characterData = getCharacterBySlug(slug);
  const character = normalizeCharacter(characterData);

  if (!character) {
    notFound();
  }

  const memoryItems = getMemoryItems(character.memory);
  const scenarioDetails = getScenarioDetails(character.scenario);
  const historyDetails = getHistoryDetails(character.history);
  const relatedCharacters = character.relatedCharacters;
  const chatHref = getPrimaryChatHref(character.slug);
  const quickStarterText = getQuickStarterText(character.scenarioStarters, character.greeting);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <Navbar />

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 lg:px-10 lg:py-16">
          <div className="mb-6 text-sm text-white/50">
            <Link href="/characters" className="transition hover:text-white">
              Characters
            </Link>
            <span className="mx-2 text-white/25">/</span>
            <span>{character.name}</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-white/75">
                  {character.archetype}
                </span>
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-white/75">
                  AI companion
                </span>
                {character.__source === "builder" || character.createdFromBuilder ? (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    Custom build
                  </span>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="text-sm uppercase tracking-[0.18em] text-white/45">
                  {character.role}
                </div>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
                  {character.name}
                </h1>

                <p className="max-w-3xl text-base leading-7 text-white/68 md:text-lg">
                  {character.headline}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                  <div className="text-sm text-white/50">Tone</div>
                  <div className="mt-2 text-sm leading-6 text-white/85">
                    {character.personality || "Strong identity and emotionally readable presence."}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                  <div className="text-sm text-white/50">Best for</div>
                  <div className="mt-2 text-sm leading-6 text-white/85">
                    Users who want stronger identity, continuity, and richer private chat energy.
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                  <div className="text-sm text-white/50">Chat style</div>
                  <div className="mt-2 text-sm leading-6 text-white/85">
                    Private, immersive, one-on-one conversation with consistent character tone.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={chatHref}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Start chat with {character.name}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/characters"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/18 hover:bg-white/8"
                >
                  Browse more characters
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04]">
              <div className="relative aspect-[4/4.8] bg-white/[0.03]">
                {character.image ? (
                  <Image
                    src={character.image}
                    alt={character.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_45%)] text-7xl font-semibold text-white/80">
                    {character.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Opening energy
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/72">{character.greeting}</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                    <Sparkles className="h-4 w-4" />
                    Instant chat preview
                  </div>
                  <p className="text-sm leading-7 text-white/68">{quickStarterText}</p>
                  <Link
                    href={chatHref}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                  >
                    Enter chat now
                    <MessageCircle className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <div className="mb-4 text-sm uppercase tracking-[0.18em] text-white/45">About</div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Meet {character.name}
            </h2>

            <div className="mt-5 space-y-5 text-sm leading-8 text-white/70 md:text-[15px]">
              {character.description ? <p>{character.description}</p> : null}
              {character.backstory ? <p>{character.backstory}</p> : null}
            </div>

            {character.tags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {character.tags.map((tag: unknown, index: number) => {
                  const category = getTagCategory(tag);
                  const label = getTagLabel(tag);

                  return (
                    <span
                      key={getTagKey(tag, index)}
                      className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70"
                    >
                      {category ? `${category}: ${label}` : label}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <div className="mb-4 text-sm uppercase tracking-[0.18em] text-white/45">
              Start instantly
            </div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Enter the scene without setup
            </h2>

            <p className="mt-4 text-sm leading-7 text-white/68">
              Jump straight into the conversation, keep the tone consistent, and let the character
              carry emotional continuity from the first message onward.
            </p>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Suggested first move
              </div>
              <p className="mt-3 text-sm leading-7 text-white/78">{quickStarterText}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={chatHref}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Chat with {character.name}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/create-character"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/18 hover:bg-white/8"
                >
                  Build your own character
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {scenarioDetails.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 pb-6 md:px-8 lg:px-10">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <div className="mb-4 text-sm uppercase tracking-[0.18em] text-white/45">Scenario</div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Scene setup</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {scenarioDetails.map((item: { label: string; value: string }) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="rounded-3xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                    {item.label}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-white/78">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {character.scenarioStarters.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 pb-6 md:px-8 lg:px-10">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <div className="mb-4 text-sm uppercase tracking-[0.18em] text-white/45">
              Fast starts
            </div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Conversation starters
            </h2>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {character.scenarioStarters.map((starter: ScenarioStarter, index: number) => (
                <div
                  key={`${starter.title}-${index}`}
                  className="rounded-[28px] border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Star className="h-4 w-4" />
                    {starter.title}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/68">{starter.prompt}</p>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/78">
                    {starter.openingMessage}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {(historyDetails.length > 0 || character.traits.length > 0 || memoryItems.length > 0) ? (
        <section className="mx-auto max-w-7xl px-6 pb-6 md:px-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-3">
            {historyDetails.length > 0 ? (
              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="mb-4 text-sm uppercase tracking-[0.18em] text-white/45">
                  Identity
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Private profile</h2>

                <div className="mt-6 space-y-4">
                  {historyDetails.map((item: { label: string; value: string }) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className="rounded-3xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                        {item.label}
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/78">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {character.traits.length > 0 ? (
              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="mb-4 text-sm uppercase tracking-[0.18em] text-white/45">Traits</div>
                <h2 className="text-2xl font-semibold tracking-tight">Personality profile</h2>

                <div className="mt-6 space-y-4">
                  {character.traits.map((trait: unknown, index: number) => {
                    const label = getTraitLabel(trait);
                    const score = getTraitScore(trait);
                    const width = score !== null ? Math.max(6, Math.min(score, 100)) : 40;

                    return (
                      <div key={`${label}-${index}`} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-white/80">{label}</span>
                          <span className="text-white/50">
                            {score !== null ? `${score}/100` : "—"}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-white"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {memoryItems.length > 0 ? (
              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="mb-4 text-sm uppercase tracking-[0.18em] text-white/45">Memory</div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  What {character.name} keeps in mind
                </h2>

                <div className="mt-6 space-y-3">
                  {memoryItems.map((item: string, index: number) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/78"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {relatedCharacters.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 pb-20 md:px-8 lg:px-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-white/45">
                Keep exploring
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                Related characters
              </h2>
            </div>

            <Link
              href="/characters"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/18 hover:bg-white/8"
            >
              View all characters
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {relatedCharacters.map((item: RelatedCharacter) => (
              <Link
                key={item.slug}
                href={`/characters/${item.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                <div className="relative aspect-[4/3] bg-white/[0.03]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1280px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl font-semibold text-white/75">
                      {item.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                    {item.archetype}
                  </div>

                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{item.name}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-white/66">{item.headline}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.slice(0, 3).map((tag: unknown, index: number) => (
                      <span
                        key={`${item.slug}-${index}-${getTagLabel(tag)}`}
                        className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/68"
                      >
                        {getTagLabel(tag)}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Footer />
    </main>
  );
}
