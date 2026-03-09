import Link from "next/link";
import Image from "next/image";
import { characters } from "../../lib/characters";

export default function CharactersPreview() {
  return (
    <section
      id="characters"
      className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20"
    >
      <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-pink-300/70">
            Characters
          </p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Choose the vibe you want tonight
          </h2>
          <p className="mt-4 text-base leading-8 text-white/65">
            Explore different personalities, tones, and emotional dynamics to
            find the character that matches your mood.
          </p>
        </div>

        <Link
          href="/characters"
          className="inline-flex w-fit items-center justify-center rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-medium text-white/88 transition hover:bg-white/10"
        >
          View All Characters
        </Link>
      </div>

      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <Link
            key={character.slug}
            href={`/characters/${character.slug}`}
            className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-1.5 hover:border-pink-400/25 hover:bg-white/[0.06]"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden">
              <Image
                src={character.image}
                alt={character.name}
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/5" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,182,193,0.18),transparent_35%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.14),transparent_30%)]" />

              <div className="absolute left-4 top-4 z-10">
                <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/82 backdrop-blur-md">
                  AI Companion
                </span>
              </div>

              <div className="absolute right-4 top-4 z-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white/90 backdrop-blur-md">
                  {character.name.charAt(0)}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-pink-200/75">
                  {character.role}
                </p>

                <h3 className="text-2xl font-semibold tracking-tight text-white">
                  {character.name}
                </h3>

                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/80">
                  {character.description}
                </p>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-medium text-white/90">
                    View Character
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80 transition duration-300 group-hover:bg-white/15">
                    Enter
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
