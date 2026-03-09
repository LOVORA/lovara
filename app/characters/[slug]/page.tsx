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

export default async function CharacterDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const character = getCharacterBySlug(slug);

  if (!character) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,105,180,0.14),transparent_24%),radial-gradient(circle_at_right,rgba(168,85,247,0.12),transparent_24%),linear-gradient(to_bottom,#07070b,#0a0a10)]" />
        <div className="absolute left-1/2 top-0 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="relative h-[420px] overflow-hidden border-b border-white/10 bg-black/30 md:h-[540px]">
                {character.image ? (
                  <Image
                    src={character.image}
                    alt={character.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-7xl font-semibold text-white/80">
                    {character.name.charAt(0)}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#07070b] via-[#07070b]/35 to-transparent" />

                <div className="absolute left-5 top-5 flex flex-wrap gap-3">
                  <span className="rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-pink-200/85 backdrop-blur-md">
                    {character.archetype}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/75 backdrop-blur-md">
                    AI Companion
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                  <p className="text-sm uppercase tracking-[0.2em] text-pink-200/75">
                    {character.role}
                  </p>

                  <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                    {character.name}
                  </h1>

                  <p className="mt-4 max-w-2xl text-base leading-8 text-white/75 md:text-lg">
                    {character.headline}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/chat/${character.slug}`}
                      className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] hover:opacity-95"
                    >
                      Start Chat with {character.name}
                    </Link>

                    <Link
                      href="/characters"
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      Back to Characters
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 border-b border-white/10 p-5 md:grid-cols-3 md:p-6">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                    Tone
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/85">
                    {character.personality}
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                    Conversation style
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/85">
                    Private, immersive, one-on-one emotional interaction.
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                    Best for
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/85">
                    Users who want stronger personality, continuity, and a more
                    intimate premium chat experience.
                  </p>
                </div>
              </div>

              <div className="p-5 md:p-6">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  About {character.name}
                </h2>

                <p className="mt-4 text-sm leading-8 text-white/65 md:text-base">
                  {character.description}
                </p>

                <p className="mt-5 text-sm leading-8 text-white/65 md:text-base">
                  {character.backstory}
                </p>

                <div className="mt-7 flex flex-wrap gap-2">
                  {character.tags.map((tag) => (
                    <span
                      key={`${tag.category}-${tag.label}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70"
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-pink-200/75">
                      Opening energy
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      First impression
                    </h2>
                  </div>

                  <Link
                    href={`/chat/${character.slug}`}
                    className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02] hover:opacity-95 md:inline-flex"
                  >
                    Start now
                  </Link>
                </div>

                <div className="mt-5 rounded-[24px] border border-pink-300/15 bg-gradient-to-br from-pink-500/10 via-fuchsia-500/10 to-violet-500/10 p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-pink-100/65">
                    Greeting
                  </p>
                  <p className="mt-3 text-base leading-8 text-white/90">
                    {character.greeting}
                  </p>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-7">
                <p className="text-[11px] uppercase tracking-[0.22em] text-pink-200/75">
                  Personality profile
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  Trait balance
                </h2>

                <div className="mt-5 space-y-4">
                  {character.traits.map((trait) => (
                    <div
                      key={trait.label}
                      className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-white/90">{trait.label}</span>
                        <span className="text-pink-200/80">{trait.score}/100</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400"
                          style={{ width: `${trait.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-7">
                <p className="text-[11px] uppercase tracking-[0.22em] text-pink-200/75">
                  Conversation hooks
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  Scenario starters
                </h2>

                <div className="mt-5 space-y-4">
                  {character.scenarioStarters.map((starter) => (
                    <div
                      key={starter.title}
                      className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                    >
                      <h3 className="text-lg font-medium text-white">
                        {starter.title}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-white/60">
                        {starter.prompt}
                      </p>

                      <div className="mt-4 rounded-[18px] border border-pink-300/15 bg-pink-400/10 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-pink-100/60">
                          Example opening
                        </p>
                        <p className="mt-2 text-sm leading-7 text-pink-100/90">
                          {starter.openingMessage}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-7">
                <p className="text-[11px] uppercase tracking-[0.22em] text-pink-200/75">
                  Memory model
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  What {character.name} remembers
                </h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-white/50">Your name</p>
                    <p className="mt-2 text-base font-medium text-white">
                      {character.memory.remembersName ? "Yes" : "No"}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-white/50">Preferences</p>
                    <p className="mt-2 text-base font-medium text-white">
                      {character.memory.remembersPreferences ? "Yes" : "No"}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-white/50">Past chats</p>
                    <p className="mt-2 text-base font-medium text-white">
                      {character.memory.remembersPastChats ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/chat/${character.slug}`}
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] hover:opacity-95"
                  >
                    Enter Chat with {character.name}
                  </Link>

                  <Link
                    href="/characters"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    View All Characters
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
