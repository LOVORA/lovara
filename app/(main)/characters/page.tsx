import Image from "next/image";
import Link from "next/link";
import { characters } from "@/lib/characters";

export default function CharactersPage() {
  const featured = characters[0];
  const rest = characters.slice(1);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="relative mb-10 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,rgba(217,70,239,0.12),rgba(255,255,255,0.05),rgba(250,204,21,0.08))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.3)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.10),transparent_24%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-fuchsia-200">
                Professional Characters
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                The site-managed collection
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
                These are Lovora&apos;s editorial characters. They are polished,
                locked, and meant to feel consistent from first view to first message.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  {characters.length} professional characters
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-100">
                  site-controlled and locked
                </span>
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-amber-100">
                  premium collection
                </span>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/25 p-5 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-100/75">
                Collection note
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">
                Ready-made, controlled, consistent
              </div>
              <p className="mt-3 text-sm leading-7 text-white/65">
                Community characters live separately, and user-made drafts stay in
                My Characters. This page is only for the built-in Lovora lineup.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/community"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Community
                </Link>
                <Link
                  href="/my-characters"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  My Characters
                </Link>
              </div>
            </div>
          </div>
        </div>
        {featured ? (
          <section className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="group overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] shadow-[0_28px_100px_rgba(0,0,0,0.28)]">
              <div className="relative">
                <Image
                  src={featured.image}
                  alt={featured.name}
                  width={1600}
                  height={1200}
                  className="h-[560px] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.82),transparent_50%)]" />
                <div className="absolute left-6 top-6 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                    Signature pick
                  </span>
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100 backdrop-blur">
                    Lovora curated
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="rounded-[30px] border border-white/10 bg-black/35 p-6 backdrop-blur-xl">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                      Featured professional character
                    </div>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                      {featured.name}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                      {featured.headline}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {(Array.isArray(featured.tags)
                        ? featured.tags.map((tag) => (typeof tag === "string" ? tag : tag.label))
                        : []
                      )
                        .slice(0, 6)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/78"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <aside className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-200/80">
                Why this area feels different
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                This page is the curated Lovora lineup.
              </div>
              <p className="mt-4 text-sm leading-7 text-white/65">
                Built-in characters should feel clear, polished, and easy to trust.
                This layout gives them more room and a cleaner hierarchy.
              </p>

              <div className="mt-6 space-y-3">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Use case</div>
                  <div className="mt-2 text-sm leading-7 text-white/72">
                    Best for users who want to start fast without building their own character first.
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Positioning</div>
                  <div className="mt-2 text-sm leading-7 text-white/72">
                    Lovora-managed characters stay separate from public community cards and private user drafts.
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={`/characters/${featured.slug}`}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Open featured card
                </Link>
                <Link
                  href={`/chat/${featured.slug}`}
                  className="rounded-full bg-white px-5 py-3 text-center text-sm font-medium text-black transition hover:opacity-90"
                >
                  Start featured chat
                </Link>
              </div>
            </aside>
          </section>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rest.map((character) => {
            const tagLabels = Array.isArray(character.tags)
              ? character.tags.map((tag) =>
                  typeof tag === "string" ? tag : tag.label,
                )
              : [];

            return (
              <article
                key={character.slug}
                className="group overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-white/18 hover:shadow-[0_30px_90px_rgba(0,0,0,0.3)]"
              >
                <div className="relative">
                  <Image
                    src={character.image}
                    alt={character.name}
                    width={1200}
                    height={900}
                    className="h-72 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.7),transparent_42%)]" />
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                      Professional
                    </span>
                    <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100 backdrop-blur">
                      Locked
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="rounded-[24px] border border-white/10 bg-black/30 p-4 backdrop-blur">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Professional card
                      </div>
                      <div className="mt-2 text-xl font-semibold tracking-tight text-white">
                        {character.name}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/68">
                        {character.headline}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                        {character.role}
                      </div>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                        {character.name}
                      </h3>
                    </div>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-100">
                      ready
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-white/70">
                    {character.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {tagLabels.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                    <div className="text-xs text-white/40">
                      Built and managed by Lovora
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/characters/${character.slug}`}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                      >
                        View
                      </Link>
                      <Link
                        href={`/chat/${character.slug}`}
                        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
                      >
                        Chat
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
