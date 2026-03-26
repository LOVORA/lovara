import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerateCharacterPhotoPanel } from "@/components/characters/generate-character-photo-panel";
import { buildPromptInputFromBuiltInCharacter } from "@/lib/character-image-prompt-input";
import { pickBestCharacterImageUrl } from "@/lib/image-storage";
import { getCharacterBySlug, type Character } from "@/lib/characters";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: imageRowsRaw } = user
    ? await supabase
        .from("character_images")
        .select("public_url, is_primary, image_type, created_at, prompt_input, provider_used")
        .eq("user_id", user.id)
        .eq("character_id", slug)
        .not("public_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(12)
    : { data: [] };

  const imageRows = Array.isArray(imageRowsRaw)
    ? imageRowsRaw.reduce<
        Array<{
          character_id: string;
          public_url: string;
          is_primary: boolean | null;
          image_type: string | null;
          created_at: string | null;
          prompt_input?: Record<string, unknown> | null;
          provider_used?: string | null;
        }>
      >((acc, row) => {
        if (typeof row.public_url !== "string" || !row.public_url.trim()) return acc;

        acc.push({
          character_id: slug,
          public_url: row.public_url,
          is_primary: typeof row.is_primary === "boolean" ? row.is_primary : null,
          image_type: typeof row.image_type === "string" ? row.image_type : null,
          created_at: typeof row.created_at === "string" ? row.created_at : null,
          prompt_input:
            row.prompt_input && typeof row.prompt_input === "object"
              ? (row.prompt_input as Record<string, unknown>)
              : null,
          provider_used:
            typeof row.provider_used === "string" ? row.provider_used : null,
        });

        return acc;
      }, [])
    : [];
  const primaryImageUrl = pickBestCharacterImageUrl(imageRows) ?? character.image;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <section className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,rgba(217,70,239,0.12),rgba(255,255,255,0.05),rgba(250,204,21,0.08))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.3)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.10),transparent_24%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-fuchsia-200">
                Ready-made character
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
                Back to Characters
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
              <div className="mt-2 text-sm leading-7 text-white/78">Managed by Lovora and ready to use</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Best use</div>
              <div className="mt-2 text-sm leading-7 text-white/78">Open and chat right away with a stable setup</div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
              <div className="relative h-[520px] w-full">
                <Image
                  src={primaryImageUrl}
                  alt={character.name}
                  fill
                  unoptimized={primaryImageUrl !== character.image}
                  className="object-contain bg-black/30 object-center"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.82),transparent_48%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.18),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.12),transparent_24%)]" />
                <div className="absolute left-6 top-6 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                    Ready-made
                  </span>
                  <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100 backdrop-blur">
                    Site managed
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="rounded-[28px] border border-white/10 bg-black/38 p-5 backdrop-blur-xl">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                      Ready-made character
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

            {imageRows.length > 1 ? (
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.18)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Saved images</h2>
                    <p className="mt-3 text-sm leading-7 text-white/60">
                      Every saved photo for this character on your account.
                    </p>
                  </div>
                  <Link
                    href="/collection"
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                  >
                    Open Collection
                  </Link>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {imageRows.map((image, index) => (
                    <div
                      key={`${image.public_url}-${index}`}
                      className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
                    >
                      <div className="relative h-60 w-full">
                        <Image
                          src={image.public_url}
                          alt={`${character.name} saved image ${index + 1}`}
                          fill
                          unoptimized
                          className="object-contain bg-black/30 object-center"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.84),transparent_48%)]" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
                          <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/78 backdrop-blur">
                            {image.is_primary
                              ? "Avatar"
                              : image.provider_used === "runware_ideogram"
                                ? "Max realism"
                                : "Saved photo"}
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/56 backdrop-blur">
                            Shot {index + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <GenerateCharacterPhotoPanel
              characterId={character.slug}
              characterName={character.name}
              baseImageUrl={primaryImageUrl}
              promptInput={buildPromptInputFromBuiltInCharacter(character)}
              studioHref={`/photo-studio/built-in/${character.slug}`}
            />

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
