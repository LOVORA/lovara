const features = [
  {
    badge: "Character Depth",
    title: "Build more than a name and avatar",
    description:
      "Shape personality, relationship dynamic, tone, setting, and scene energy so every character starts with a more believable identity.",
  },
  {
    badge: "Scenario Flow",
    title: "Turn a chat into a scene",
    description:
      "Instead of generic prompts, create situations that influence how the character opens, responds, and keeps the interaction feeling grounded.",
  },
  {
    badge: "Saved Vault",
    title: "Keep your best characters ready",
    description:
      "Save your creations, revisit them later, and keep a cleaner library of custom personalities you actually want to return to.",
  },
];

export default function Features() {
  return (
    <section className="border-y border-white/10 bg-white/[0.02]">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-fuchsia-200/70">
            Why Lovora feels better
          </div>

          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Built for a more premium character experience
          </h2>

          <p className="mt-5 text-base leading-8 text-white/60 sm:text-lg">
            Every part of the flow is designed to make character creation and
            conversation feel more intentional, more cinematic, and less like a
            normal AI form.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/65">
                  {feature.badge}
                </span>

                <span className="text-sm font-semibold text-white/35">
                  0{index + 1}
                </span>
              </div>

              <h3 className="text-xl font-semibold leading-8 text-white">
                {feature.title}
              </h3>

              <p className="mt-4 text-sm leading-7 text-white/60 sm:text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
