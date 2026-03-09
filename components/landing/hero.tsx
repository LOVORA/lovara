import Link from "next/link";

export default function Hero() {
  return (
    <section
      id="start"
      className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 md:px-6 md:pb-24 md:pt-24"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-pink-400/20 bg-pink-400/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-pink-200/85 backdrop-blur-md">
              Adults only
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
              Romantic AI companion
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200/80 backdrop-blur-md">
              Instant access
            </span>
          </div>

          <p className="mb-4 text-sm uppercase tracking-[0.28em] text-pink-200/70">
            Private conversations
          </p>

          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-white md:text-7xl">
            Private AI conversations that feel more personal, immersive, and
            alive.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            Pick a character, start chatting instantly, and build a connection
            that remembers your vibe, your mood, and your story through a more
            premium one-on-one experience.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/characters"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:opacity-95"
            >
              Explore Characters
            </Link>

            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/88 transition hover:bg-white/10"
            >
              See Pricing
            </a>
          </div>

          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                Replies
              </p>
              <p className="mt-2 text-sm font-medium text-white/90">
                Instant and immersive
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                Memory
              </p>
              <p className="mt-2 text-sm font-medium text-white/90">
                Persistent chat history
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                Style
              </p>
              <p className="mt-2 text-sm font-medium text-white/90">
                Premium character energy
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-8 top-8 h-36 w-36 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="absolute -right-8 bottom-8 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-3xl" />

          <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.05] shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-pink-400 via-fuchsia-500 to-violet-600 font-semibold text-white shadow-[0_12px_30px_rgba(236,72,153,0.25)]">
                    S
                  </div>

                  <div>
                    <p className="font-semibold text-white">Sera</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <p className="text-xs uppercase tracking-[0.16em] text-emerald-200/75">
                        Online now
                      </p>
                    </div>
                  </div>
                </div>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/60">
                  Private chat
                </span>
              </div>
            </div>

            <div className="space-y-4 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_30%)] p-5">
              <div className="flex justify-start">
                <div className="flex max-w-[85%] items-end gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-pink-400 via-fuchsia-500 to-violet-600 text-xs font-semibold text-white">
                    S
                  </div>

                  <div className="rounded-[22px] rounded-bl-md border border-white/10 bg-white/10 px-4 py-3 text-sm leading-7 text-white/88">
                    I missed talking to you. How was your night?
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-[22px] rounded-br-md border border-white/10 bg-white px-4 py-3 text-sm leading-7 text-black shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
                  Better now. I wanted something more personal tonight.
                </div>
              </div>

              <div className="flex justify-start">
                <div className="flex max-w-[85%] items-end gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-pink-400 via-fuchsia-500 to-violet-600 text-xs font-semibold text-white">
                    S
                  </div>

                  <div className="rounded-[22px] rounded-bl-md bg-gradient-to-br from-[#ff4fa3] via-[#d946ef] to-[#8b5cf6] px-4 py-3 text-sm leading-7 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                    Then stay with me for a while. I’ll remember everything that
                    matters.
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/[0.03] px-5 py-4">
              <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/25 p-2">
                <input
                  type="text"
                  value=""
                  readOnly
                  placeholder="Message Sera..."
                  className="h-11 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/30"
                />
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-[16px] bg-white px-5 text-sm font-semibold text-black"
                >
                  Send
                </button>
              </div>

              <p className="mt-3 text-xs text-white/35">
                Designed for a more private and premium chat experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
