import { notFound } from "next/navigation";
import { getCharacterBySlug } from "@/lib/characters";

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
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 md:grid-cols-[380px_1fr]">
          <div>
            <img
              src={character.image}
              alt={character.name}
              className="w-full rounded-3xl border border-zinc-800 object-cover"
            />
          </div>

          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.2em] text-zinc-400">
              {character.archetype}
            </p>

            <h1 className="mb-3 text-4xl font-bold md:text-5xl">
              {character.name}
            </h1>

            <p className="mb-4 text-lg text-zinc-300">{character.headline}</p>

            <p className="mb-6 text-zinc-400">{character.description}</p>

            <div className="mb-8 flex flex-wrap gap-2">
              {character.tags.map((tag) => (
                <span
                  key={`${character.slug}-${tag.label}`}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-200"
                >
                  {tag.label}
                </span>
              ))}
            </div>

            <div className="mb-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="mb-3 text-xl font-semibold">Greeting</h2>
              <p className="italic text-pink-300">{character.greeting}</p>
            </div>

            <div className="mb-10">
              <h2 className="mb-4 text-2xl font-semibold">Backstory</h2>
              <p className="leading-8 text-zinc-300">{character.backstory}</p>
            </div>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-semibold">Personality Traits</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {character.traits.map((trait) => (
              <div
                key={`${character.slug}-${trait.label}`}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-white">{trait.label}</span>
                  <span className="text-sm text-zinc-400">{trait.score}/100</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${trait.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-semibold">Scenario Starters</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {character.scenarioStarters.map((starter) => (
              <div
                key={`${character.slug}-${starter.title}`}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <h3 className="mb-3 text-xl font-semibold">{starter.title}</h3>
                <p className="mb-4 leading-7 text-zinc-400">{starter.prompt}</p>
                <div className="rounded-2xl border border-pink-500/20 bg-pink-500/10 p-4">
                  <p className="italic text-pink-300">{starter.openingMessage}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-semibold">Memory</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="mb-2 font-medium">Remembers your name</p>
              <p className="text-zinc-400">
                {character.memory.remembersName ? "Yes" : "No"}
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="mb-2 font-medium">Remembers preferences</p>
              <p className="text-zinc-400">
                {character.memory.remembersPreferences ? "Yes" : "No"}
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="mb-2 font-medium">Remembers past chats</p>
              <p className="text-zinc-400">
                {character.memory.remembersPastChats ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
