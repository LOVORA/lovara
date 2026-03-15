import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "@/components/landing/footer";
import Navbar from "@/components/landing/navbar";
import { getCharacterBySlug } from "@/lib/characters";

type PageProps = {
  params: { slug: string };
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
      typeof tag.category === "string" && tag.category.trim()
        ? tag.category.trim()
        : "misc";
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
  return typeof tag.category === "string" && tag.category.trim()
    ? tag.category.trim()
    : null;
}

function getTraitLabel(trait: unknown): string {
  return toDisplayText(trait);
}

function getTraitScore(trait: unknown): number | null {
  if (!isRecord(trait)) return null;
  return typeof trait.score === "number" && Number.isFinite(trait.score)
    ? trait.score
    : null;
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
    entries.push(
      `Remembers preferences: ${memory.remembersPreferences ? "Yes" : "No"}`,
    );
  }
  if (typeof memory.remembersPastChats === "boolean") {
    entries.push(
      `Carries past chats forward: ${memory.remembersPastChats ? "Yes" : "No"}`,
    );
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
      value:
        typeof scenario.openingState === "string"
          ? scenario.openingState
          : undefined,
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
      value:
        typeof history.occupation === "string" ? history.occupation : undefined,
    },
    {
      label: "Public mask",
      value:
        typeof history.publicMask === "string" ? history.publicMask : undefined,
    },
    {
      label: "Private self",
      value:
        typeof history.privateSelf === "string" ? history.privateSelf : undefined,
    },
    {
      label: "Defining desire",
      value:
        typeof history.definingDesire === "string"
          ? history.definingDesire
          : undefined,
    },
    {
      label: "Emotional wound",
      value:
        typeof history.emotionalWound === "string"
          ? history.emotionalWound
          : undefined,
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

function normalizeRelatedCharacters(
  value: unknown,
  currentSlug: string,
): RelatedCharacter[] {
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

export default async function CharacterDetailPage({ params }: PageProps) {
  const characterData = getCharacterBySlug(params.slug);
  const character = normalizeCharacter(characterData);

  if (!character) {
    notFound();
  }

  const memoryItems = getMemoryItems(character.memory);
  const scenarioDetails = getScenarioDetails(character.scenario);
  const historyDetails = getHistoryDetails(character.history);
  const relatedCharacters = character.relatedCharacters;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />

      <main>
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.18),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(168,85,247,0.14),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.04),rgba(255,255,255,0))]">
          <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-12 lg:flex-row lg:items-center lg:px-8 lg:py-16">
            <div className="w-full max-w-2xl space-y-7">
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/65">
                <Link href="/characters" className="transition hover:text-white">
                  Characters
                </Link>
                <span className="text-white/30">/</span>
                <span className="text-white">{character.name}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-fuchsia-200">
                  {character.archetype}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/70">
                  AI companion
                </span>
                {character.__source === "builder" || character.createdFromBuilder ? (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-200">
                    Custom build
                  </span>
                ) : null}
              </div>

              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.28em] text-white/45">
                  {character.role}
                </p>
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                  {character.name}
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">
                  {character.headline}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                    Tone
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/80">
                    {character.personality}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                    Best for
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/80">
                    Users who want a stronger identity, more emotional continuity,
                    and richer private chat energy.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                    Chat style
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/80">
                    Private, immersive, one-on-one conversation with high
                    personality retention.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={`/chat/${character.slug}`}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-fuchsia-100"
                >
                  Start chat with {character.name}
                </Link>
                <Link
                  href="/characters"
                  className="rounded-2xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-medium text-white/88 transition hover:bg-white/10"
                >
                  Browse more characters
                </Link>
              </div>
            </div>

            <div className="w-full lg:max-w-xl">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                <div className="relative aspect-[4/5] bg-gradient-to-br from-fuchsia-500/20 via-violet-500/15 to-cyan-400/10">
                  {character.image ? (
                    <Image
                      src={character.image}
                      alt={character.name}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-7xl font-semibold text-white/25">
                      {character.name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-6">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                      Opening energy
                    </p>
                    <p className="mt-3 text-base leading-7 text-white/92">
                      {character.greeting}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] lg:px-8 lg:py-16">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7">
              <div className="mb-5 space-y-2">
                <p className="text-sm uppercase tracking-[0.24em] text-white/45">
                  About
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  Meet {character.name}
                </h2>
              </div>
              <div className="space-y-5 text-[15px] leading-8 text-white/74">
                <p>{character.description}</p>
                <p>{character.backstory}</p>
              </div>
              <div className="mt-7 flex flex-wrap gap-2">
                {character.tags.map((tag: unknown, index: number) => {
                  const category = getTagCategory(tag);
                  const label = getTagLabel(tag);

                  return (
                    <span
                      key={getTagKey(tag, index)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/78"
                    >
                      {category ? `${category}: ${label}` : label}
                    </span>
                  );
                })}
              </div>
            </div>

            {scenarioDetails.length > 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7">
                <div className="mb-5 space-y-2">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/45">
                    Scenario
                  </p>
                  <h2 className="text-2xl font-semibold text-white">
                    Scene setup
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {scenarioDetails.map((item: { label: string; value: string }) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                        {item.label}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-white/82">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {character.scenarioStarters.length > 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7">
                <div className="mb-5 space-y-2">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/45">
                    Fast starts
                  </p>
                  <h2 className="text-2xl font-semibold text-white">
                    Conversation starters
                  </h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {character.scenarioStarters.map(
                    (starter: ScenarioStarter, index: number) => (
                      <div
                        key={`${starter.title}-${index}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-5"
                      >
                        <p className="text-base font-medium text-white">
                          {starter.title}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-white/72">
                          {starter.prompt}
                        </p>
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/84">
                          {starter.openingMessage}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {historyDetails.length > 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7">
                <div className="mb-5 space-y-2">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/45">
                    Identity
                  </p>
                  <h2 className="text-2xl font-semibold text-white">
                    Private profile
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {historyDetails.map((item: { label: string; value: string }) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                        {item.label}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-white/82">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7">
              <div className="mb-5 space-y-2">
                <p className="text-sm uppercase tracking-[0.24em] text-white/45">
                  Traits
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  Personality profile
                </h2>
              </div>
              <div className="space-y-4">
                {character.traits.map((trait: unknown, index: number) => {
                  const label = getTraitLabel(trait);
                  const score = getTraitScore(trait);
                  const width =
                    score !== null ? Math.max(6, Math.min(score, 100)) : 40;

                  return (
                    <div key={`${label}-${index}`} className="space-y-2">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-white/82">{label}</span>
                        <span className="text-white/52">
                          {score !== null ? `${score}/100` : "—"}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/8">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {memoryItems.length > 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7">
                <div className="mb-5 space-y-2">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/45">
                    Memory
                  </p>
                  <h2 className="text-2xl font-semibold text-white">
                    What {character.name} keeps in mind
                  </h2>
                </div>
                <div className="space-y-3">
                  {memoryItems.map((item: string, index: number) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/82"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/8 to-white/4 p-7">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">
                Ready to enter
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Start the conversation now
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Jump straight into the scene, keep the tone consistent, and see how
                this character carries emotional continuity across the conversation.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/chat/${character.slug}`}
                  className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-medium text-neutral-950 transition hover:bg-fuchsia-100"
                >
                  Enter chat with {character.name}
                </Link>
                <Link
                  href="/create-character"
                  className="rounded-2xl border border-white/12 bg-white/5 px-5 py-3 text-center text-sm font-medium text-white/88 transition hover:bg-white/10"
                >
                  Build your own character
                </Link>
              </div>
            </div>
          </div>
        </section>

        {relatedCharacters.length > 0 ? (
          <section className="border-t border-white/10 bg-white/[0.02]">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
              <div className="mb-8 flex items-end justify-between gap-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-white/45">
                    Keep exploring
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">
                    Related characters
                  </h2>
                </div>
                <Link
                  href="/characters"
                  className="text-sm text-white/70 transition hover:text-white"
                >
                  View all characters
                </Link>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {relatedCharacters.map((item: RelatedCharacter) => (
                  <Link
                    key={item.slug}
                    href={`/characters/${item.slug}`}
                    className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/7"
                  >
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-5xl font-semibold text-white/20">
                          {item.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="space-y-4 p-5">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                          {item.archetype}
                        </p>
                        <h3 className="text-xl font-semibold text-white">
                          {item.name}
                        </h3>
                        <p className="text-sm leading-7 text-white/68">
                          {item.headline}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.tags.slice(0, 3).map((tag: unknown, index: number) => (
                          <span
                            key={getTagKey(tag, index)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72"
                          >
                            {getTagLabel(tag)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
