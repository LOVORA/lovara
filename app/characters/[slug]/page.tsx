import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "../../../components/landing/navbar";
import Footer from "../../../components/landing/footer";
import { getCharacterBySlug } from "../../../lib/characters";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
    return memory.map((item) => toDisplayText(item)).filter(Boolean);
  }

  if (!isRecord(memory)) return [];

  const entries: string[] = [];

  if (typeof memory.remembersName === "boolean") {
    entries.push(`Your name: ${memory.remembersName ? "Yes" : "No"}`);
  }

  if (typeof memory.remembersPreferences === "boolean") {
    entries.push(`Preferences: ${memory.remembersPreferences ? "Yes" : "No"}`);
  }

  if (typeof memory.remembersPastChats === "boolean") {
    entries.push(`Past chats: ${memory.remembersPastChats ? "Yes" : "No"}`);
  }

  return entries;
}

export default async function CharacterDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const character = getCharacterBySlug(slug);

  if (!character) {
    notFound();
  }

  const memoryItems = getMemoryItems(character.memory);

  return (
    <div className="min-h-screen bg-[#07070b] text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
          <div className="grid gap-0 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="border-b border-white/10 bg-gradient-to-b from-pink-500/10 to-fuchsia-500/5 p-6 lg:border-b-0 lg:border-r">
              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
                {character.image ? (
                  <div className="relative aspect-[4/5] w-full">
                    <Image
                      src={character.image}
                      alt={character.name}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br from-pink-500/25 to-fuchsia-500/15 text-6xl font-semibold text-pink-200">
                    {character.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="inline-flex rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-pink-200">
                  {character.archetype} · AI Companion
                </div>

                <p className="mt-4 text-sm text-white/55">{character.role}</p>

                <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                  {character.name}
                </h1>

                <p className="mt-3 text-base leading-7 text-white/70">
                  {character.headline}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/chat/${character.slug}`}
                    className="rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95"
                  >
                    Start Chat with {character.name}
                  </Link>

                  <Link
                    href="/characters"
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
                  >
                    Back to Characters
                  </Link>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                    Tone
                  </div>
                  <div className="mt-2 text-sm text-white/80">
                    {character.personality}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                    Conversation style
                  </div>
                  <div className="mt-2 text-sm text-white/80">
                    Private, immersive, one-on-one emotional interaction.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                    Best for
                  </div>
                  <div className="mt-2 text-sm text-white/80">
                    Users who want stronger personality, continuity, and a more
                    intimate premium chat experience.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 lg:p-8">
              <section>
                <h2 className="text-2xl font-semibold">About {character.name}</h2>

                <div className="mt-5 space-y-5 text-sm leading-7 text-white/75">
                  <p>{character.description}</p>
                  <p>{character.backstory}</p>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {character.tags.map((tag, index) => {
                    const category = getTagCategory(tag);
                    const label = getTagLabel(tag);

                    return (
                      <span
                        key={getTagKey(tag, index)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75"
                      >
                        {category ? `${category}: ${label}` : label}
                      </span>
                    );
                  })}
                </div>
              </section>

              <section className="mt-10 grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-3 text-xs uppercase tracking-[0.18em] text-pink-200/75">
                    Opening energy
                  </div>
                  <h3 className="text-xl font-semibold">First impression</h3>
                  <p className="mt-4 rounded-2xl border border-pink-400/15 bg-pink-500/5 p-4 text-sm leading-7 text-white/85">
                    {character.greeting}
                  </p>

                  <Link
                    href={`/chat/${character.slug}`}
                    className="mt-5 inline-flex rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/85 transition hover:bg-white/15"
                  >
                    Start now
                  </Link>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-3 text-xs uppercase tracking-[0.18em] text-pink-200/75">
                    Personality profile
                  </div>
                  <h3 className="text-xl font-semibold">Trait balance</h3>

                  <div className="mt-5 space-y-4">
                    {character.traits.map((trait, index) => {
                      const label = getTraitLabel(trait);
                      const score = getTraitScore(trait);

                      return (
                        <div key={`trait-${label}-${index}`}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-white/80">{label}</span>
                            <span className="text-pink-200">
                              {score !== null ? `${score}/100` : "—"}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500"
                              style={{ width: `${score ?? 0}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 text-xs uppercase tracking-[0.18em] text-pink-200/75">
                  Memory model
                </div>
                <h3 className="text-xl font-semibold">
                  What {character.name} remembers
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {memoryItems.map((item, index) => (
                    <div
                      key={`memory-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="text-sm text-white/80">{item}</div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href={`/chat/${character.slug}`}
                  className="rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95"
                >
                  Enter Chat with {character.name}
                </Link>

                <Link
                  href="/characters"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
                >
                  View All Characters
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
