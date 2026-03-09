const features = [
  {
    title: "Fast Chat",
    description: "Quick and engaging replies for natural conversations.",
  },
  {
    title: "Memory",
    description: "Your companion remembers details to feel more personal.",
  },
  {
    title: "Characters",
    description: "Choose from different personalities and styles.",
  },
];

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-white/10 p-6"
          >
            <h2 className="mb-3 text-xl font-semibold">{feature.title}</h2>
            <p className="text-white/70">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

