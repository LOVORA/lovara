import Link from "next/link";
import Image from "next/image";
import Navbar from "../../components/landing/navbar";
import Footer from "../../components/landing/footer";
import { characters } from "../../lib/characters";

export default function CharactersPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-pink-300/70">
            Characters
          </p>
          <h1 className="mb-5 text-4xl font-bold md:text-5xl">
            Explore all Lovora characters
          </h1>
          <p className="text-base leading-8 text-white/70">
            Pick the personality, tone, and energy that fits your mood. Each
            character has a different style, emotional dynamic, and chat
            experience.
          </p>
        </div>

        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <Link
              key={character.slug}
              href={`/characters/${character.slug}`}
              className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 transition duration-300 hover:-translate-y-1.5 hover:border-pink-400/30"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <Image
                  src={character.image}
                  alt={character.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  priority={false}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/5" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,182,193,0.20),transparent_35%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.16),transparent_30%)]" />

                <div className="absolute left-4 top-4 z-10">
                  <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/80 backdrop-blur-md">
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

                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    {character.name}
                  </h2>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/80">
                    {character.description}
                  </p>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/60">
                    <span className="font-medium text-white/75">
                      Personality:
                    </span>{" "}
                    {character.personality}
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

      <Footer />
    </main>
  );
}
