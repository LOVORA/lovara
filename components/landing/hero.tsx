import Link from "next/link";

const trustBadges = [
  "Adults only",
  "Private chats",
  "Scenario-driven",
  "Save your characters",
];

const highlights = [
  {
    label: "Replies",
    value: "Instant and immersive",
  },
  {
    label: "Memory",
    value: "Scene-aware conversations",
  },
  {
    label: "Studio",
    value: "Premium character creation",
  },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_25%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
        <div className="flex max-w-2xl flex-col justify-center">
          <div className="mb-5 flex flex-wrap gap-2">
            {trustBadges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70"
              >
                {badge}
              </span>
            ))}
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Create AI characters that feel
            <span className="bg-gradient-to-r from-fuchsia-300 via-pink-200 to-white bg-clip-text text-transparent">
              {" "}
              more intentional,
            </span>{" "}
            more personal, and more alive.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
            Build original characters, shape their tone, relationship dynamic,
            and scenario, then jump into a premium one-on-one chat experience
            that feels more immersive than a generic AI conversation.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/create-character"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-white/90"
            >
              Start Creating
            </Link>

            <Link
              href="/characters"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Professional Characters
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  {item.label}
                </div>
                <div className="mt-2 text-sm font-medium leading-6 text-white/85">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <div className="absolute -right-8 bottom-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <div className="rounded-[1.6rem] border border-white/10 bg-[#10101a]/95 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Sera</div>
                  <div className="mt-1 text-xs text-white/45">
                    Private chat • online now
                  </div>
                </div>

                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  Active
                </div>
              </div>

              <div className="space-y-3">
                <div className="max-w-[82%] rounded-3xl rounded-bl-md border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-white/85">
                  I missed talking to you. How was your night?
                </div>

                <div className="ml-auto max-w-[82%] rounded-3xl rounded-br-md bg-white px-4 py-3 text-sm leading-6 text-black">
                  Better now. I wanted something that felt more personal tonight.
                </div>

                <div className="max-w-[82%] rounded-3xl rounded-bl-md border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-sm leading-6 text-white/90">
                  Then stay with me for a while. I’ll keep the mood exactly where
                  you want it.
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-6 text-white/50">
                Designed for scenario-driven, premium character chat.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
