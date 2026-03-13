import Link from "next/link";
import { characters } from "../../lib/characters";

export default function CharactersPreview() {
  const featured = characters.slice(0, 6);

  return (
    <section>
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-fuchsia-200/70">
              Browse characters
            </div>

            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Explore different moods, roles, and dynamics
            </h2>

            <p className="mt-4 text-base leading-8 text-white/60">
              Start with a ready-made character or use them as inspiration before
              building your own custom experience.
            </p>
          </div>

          <Link
            href="/characters"
            className="inline-flex h-fit items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            View All Characters
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((character) => (
            <article
              key={character.slug}
              className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="border-b border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-pink-500/5 to-transparent p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-white/65">
                    {character.role}
                  </span>
                  <span className="text-xs text-white/40">AI Character</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-semibold text-white">
                    {character.name.charAt(0)}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {character.name}
                    </h3>
                    <p className="mt-1 text-sm text-white/50">{character.role}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="line-clamp-4 text-sm leading-7 text-white/60 sm:text-base">
                  {character.description}
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <Link
                    href={`/characters/${character.slug}`}
                    className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                  >
                    View Character
                  </Link>

                  <Link
                    href={`/chat/${character.slug}`}
                    className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    Enter Chat
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
