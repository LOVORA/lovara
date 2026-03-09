const features = [
  {
    title: "More Personal",
    description:
      "Characters feel more emotionally responsive by remembering the tone, rhythm, and important details of your conversations.",
    badge: "Memory",
  },
  {
    title: "Always Available",
    description:
      "Start instantly whenever you want attention, connection, comfort, or a more intimate one-on-one conversation.",
    badge: "Instant Access",
  },
  {
    title: "Different Personalities",
    description:
      "Choose between playful, emotional, bold, soft, teasing, or more intense character dynamics depending on your mood.",
    badge: "Character Variety",
  },
];

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="mb-3 text-sm uppercase tracking-[0.25em] text-pink-300/70">
          Features
        </p>
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Built for immersive private chat
        </h2>
        <p className="mt-4 text-base leading-8 text-white/65">
          Everything is designed to make each conversation feel more fluid, more
          premium, and more emotionally engaging.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-7 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-pink-400/20 hover:bg-white/[0.06]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,182,193,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.10),transparent_28%)] opacity-80 transition duration-300 group-hover:opacity-100" />

            <div className="relative">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-gradient-to-br from-pink-400 via-fuchsia-500 to-violet-600 text-lg font-semibold text-white shadow-[0_12px_30px_rgba(236,72,153,0.22)]">
                  {index + 1}
                </div>

                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-pink-200/75">
                  {feature.badge}
                </span>
              </div>

              <h3 className="mb-3 text-2xl font-semibold tracking-tight text-white">
                {feature.title}
              </h3>

              <p className="text-sm leading-7 text-white/68">
                {feature.description}
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm text-white/55">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-300/70" />
                <span>Premium companion experience</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
