import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCharacterBySlug, type Character } from "@/lib/characters";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function normalizeTags(input: Character | undefined) {
  if (!input) return [];
  return Array.isArray(input.tags)
    ? input.tags.map((tag) => (typeof tag === "string" ? tag : tag.label))
    : [];
}

function normalizeTraits(input: Character | undefined) {
  if (!input) return [];
  return Array.isArray(input.traits)
    ? input.traits.map((trait) =>
        typeof trait === "string" ? trait : `${trait.label} ${trait.score}/100`,
      )
    : [];
}

export default async function ProfessionalCharacterDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const character = getCharacterBySlug(slug);

  if (!character) {
    notFound();
  }

  const tagLabels = normalizeTags(character);
  const traitLabels = normalizeTraits(character);
  const scenarioHooks = Array.isArray(character.scenarioHooks)
    ? character.scenarioHooks.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <section className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,rgba(217,70,239,0.12),rgba(255,255,255,0.05),rgba(250,204,21,0.08))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.3)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.10),transparent_24%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-fuchsia-200">
                Professional character
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                {character.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62 md:text-base">
                {character.headline}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/characters"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
              >
                Back to Professional
              </Link>
              <Link
                href={`/chat/${character.slug}`}
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
              >
                Start Chat
              </Link>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Role</div>
              <div className="mt-2 text-sm leading-7 text-white/78">{character.role}</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Collection</div>
              <div className="mt-2 text-sm leading-7 text-white/78">Lovora managed and locked</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Best use</div>
              <div className="mt-2 text-sm leading-7 text-white/78">Open and chat instantly with a stable setup</div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
              <div className="relative h-[520px] w-full">
                <Image
                  src={character.image}
                  alt={character.name}
                  fill
                  className="object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.82),transparent_48%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.18),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.12),transparent_24%)]" />
                <div className="absolute left-6 top-6 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                    Professional
                  </span>
                  <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100 backdrop-blur">
                    Site managed
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="rounded-[28px] border border-white/10 bg-black/38 p-5 backdrop-blur-xl">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                      Professional character
                    </div>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                      {character.name}
                    </h1>
                    <p className="mt-3 text-sm leading-7 text-white/72">
                      {character.headline}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Description</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 md:text-base">
                {character.description}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Opening greeting</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 md:text-base">
                {character.greeting}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Backstory</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 md:text-base">
                {character.backstory}
              </p>
            </div>

            {scenarioHooks.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Conversation hooks</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {scenarioHooks.map((hook) => (
                    <div
                      key={hook}
                      className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/70"
                    >
                      {hook}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
              <h2 className="text-xl font-semibold text-white">Quick read</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Character role</div>
                  <div className="mt-2 text-sm leading-7 text-white/72">{character.role}</div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Tone</div>
                  <div className="mt-2 text-sm leading-7 text-white/72">{character.personality}</div>
                </div>
              </div>
            </div>

            {tagLabels.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Tags</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tagLabels.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/78"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {traitLabels.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Traits</h2>
                <div className="mt-4 space-y-3">
                  {traitLabels.map((trait) => (
                    <div
                      key={trait}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/72"
                    >
                      {trait}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {character.scenarioStarters && character.scenarioStarters.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Scenario starters</h2>
                <div className="mt-4 space-y-4">
                  {character.scenarioStarters.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="text-sm font-medium text-white">{item.title}</div>
                      <div className="mt-2 text-sm leading-7 text-white/65">
                        {item.prompt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Actions</h2>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href={`/chat/${character.slug}`}
                  className="rounded-full bg-white px-5 py-3 text-center text-sm font-medium text-black transition hover:opacity-90"
                >
                  Start chat
                </Link>
                <Link
                  href="/my-characters"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Open my characters
                </Link>
                <Link
                  href="/community"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Browse community too
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
