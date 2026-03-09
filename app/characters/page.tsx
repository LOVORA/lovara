import Link from "next/link";
import Image from "next/image";
import Navbar from "../../components/landing/navbar";
import Footer from "../../components/landing/footer";
import { characters } from "../../lib/characters";

export default function CharactersPage() {
  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,105,180,0.10),transparent_26%),linear-gradient(to_bottom,#07070b,#0a0a10)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-pink-200/85">
              Characters
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Explore all Lovora characters
            </h1>

            <p className="mt-5 text-base leading-8 text-white/60 md:text-lg">
              Pick the personality, tone, and energy that fits your mood. Each
              character has a different style, emotional dynamic, and chat
              experience.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((character) => (
              <article
                key={character.slug}
                className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] shadow-[0_24px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl"
              >
                <div className="relative h-[300px] bg-black/30">
                  {character.image ? (
                    <Image
                      src={character.image}
                      alt={character.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl font-semibold text-white/80">
                      {character.name.charAt(0)}
                    </div>
                  )}

                  <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/80 backdrop-blur-md">
                    AI Companion
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-sm text-pink-200/80">{character.role}</p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {character.name}
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-white/60">
                    {character.description}
                  </p>

                  <p className="mt-4 text-sm leading-7 text-white/45">
                    <span className="font-medium text-white/70">Personality:</span>{" "}
                    {character.personality}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/characters/${character.slug}`}
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      View Character
                    </Link>

                    <Link
                      href={`/chat/${character.slug}`}
                      className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02] hover:opacity-95"
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

      <Footer />
    </main>
  );
}
