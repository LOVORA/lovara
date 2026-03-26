import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GenerateCharacterPhotoPanel } from "@/components/characters/generate-character-photo-panel";
import {
  createSupabaseStorageSigner,
  resolveCharacterGalleryImages,
  resolveCharacterPrimaryImage,
} from "@/lib/character-image-assets";
import { buildPromptInputFromCustomCharacter } from "@/lib/character-image-prompt-input";
import { buildMyCharacterDetailView } from "@/lib/my-characters/detail-hub";
import type { DbCustomCharacter } from "@/lib/character-repository/custom-characters";
import type { DbCharacterImage } from "@/lib/character-repository/images";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function DetailStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-white/58">{helper}</div>
    </div>
  );
}

function InfoPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/78">
      {label}
    </span>
  );
}

export default async function MyCharacterDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/my-characters/${slug}`)}`);
  }

  const { data: characterRaw, error: characterError } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("slug", slug)
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(characterError.message);
  }

  if (!characterRaw) {
    notFound();
  }

  const { data: imageRowsRaw, error: imageError } = await supabase
    .from("character_images")
    .select("*")
    .eq("character_id", characterRaw.id)
    .order("created_at", { ascending: false });

  if (imageError) {
    throw new Error(imageError.message);
  }

  const character = characterRaw as DbCustomCharacter;
  const images = (Array.isArray(imageRowsRaw) ? imageRowsRaw : []) as DbCharacterImage[];
  const detail = buildMyCharacterDetailView({
    character,
    images,
  });
  const signUrl = createSupabaseStorageSigner(supabase as never);
  const resolvedPrimaryImage = await resolveCharacterPrimaryImage({
    rows: images,
    signUrl,
    fallbackUrl: character.primary_image_url,
  });
  const resolvedGalleryImages = await resolveCharacterGalleryImages({
    rows: images,
    signUrl,
  });
  const galleryImages = resolvedGalleryImages.filter(
    (image) =>
      image.resolvedUrl &&
      image.id !== resolvedPrimaryImage?.id &&
      image.resolvedUrl !== resolvedPrimaryImage?.resolvedUrl,
  );
  const updatedLabel = formatDate(character.updated_at);
  const scenarioItems = [
    { label: "Relationship", value: detail.relationshipLabel },
    { label: "Setting", value: detail.settingLabel },
    { label: "Scene goal", value: detail.sceneGoalLabel },
    { label: "Tone", value: detail.toneLabel },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,rgba(217,70,239,0.12),rgba(255,255,255,0.05),rgba(34,211,238,0.08))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.3)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-fuchsia-200">
                My character hub
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                {character.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64 md:text-base">
                {detail.teaser ||
                  "A saved character with its own scenario, memory anchors, and private photo archive."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {detail.publicShareHref ? (
                <Link
                  href={detail.publicShareHref}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Open public page
                </Link>
              ) : null}
              <Link
                href={`/chat/custom/${character.slug}`}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
              >
                Continue chat
              </Link>
              <Link
                href={`/photo-studio/custom/${character.slug}`}
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
              >
                Open Photo Studio
              </Link>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 md:grid-cols-4">
            <DetailStat
              label="Visibility"
              value={detail.visibility === "public" ? "Shared" : "Private"}
              helper="Change share status later without moving the character."
            />
            <DetailStat
              label="Saved photos"
              value={`${detail.savedPhotoCount}`}
              helper="Every saved shot for this character stays tied to this hub."
            />
            <DetailStat
              label="Image status"
              value={character.image_status === "ready" ? "Avatar ready" : "Needs image"}
              helper="The avatar and new gallery shots stay under the same identity lock."
            />
            <DetailStat
              label="Updated"
              value={updatedLabel || "Recently"}
              helper="Latest edits, saves, and image updates stay attached here."
            />
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.92fr]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
              <div className="relative h-[560px] w-full">
                {resolvedPrimaryImage?.resolvedUrl || detail.primaryImageUrl ? (
                  <Image
                    src={resolvedPrimaryImage?.resolvedUrl ?? detail.primaryImageUrl ?? ""}
                    alt={character.name}
                    fill
                    unoptimized
                    className="object-contain bg-black/30 object-center"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-fuchsia-500/15 via-slate-900 to-cyan-500/15">
                    <div className="text-center">
                      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] border border-white/10 bg-white/5 text-3xl font-semibold text-white/88">
                        {character.name.slice(0, 1)}
                      </div>
                      <div className="mt-4 text-sm text-white/55">No avatar saved yet</div>
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.82),transparent_48%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.18),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />
                <div className="absolute left-6 top-6 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                    Owner space
                  </span>
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
                    Saved avatar
                  </span>
                  {detail.isLegacyAnime ? (
                    <span className="rounded-full border border-rose-400/25 bg-rose-400/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-rose-100 backdrop-blur">
                      Legacy style
                    </span>
                  ) : null}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="rounded-[28px] border border-white/10 bg-black/38 p-5 backdrop-blur-xl">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                      Character snapshot
                    </div>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                      {character.name}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-white/72">
                      {clean(character.headline) ||
                        "A saved custom character with its own continuity, visuals, and chat history."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {galleryImages.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.18)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Saved photos</h2>
                    <p className="mt-3 text-sm leading-7 text-white/60">
                      Every extra shot saved for this character stays grouped here.
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
                  {galleryImages.map((image, index) => (
                    <div
                      key={image.id}
                      className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
                    >
                      <div className="relative h-64 w-full">
                          <Image
                          src={image.resolvedUrl!}
                          alt={`${character.name} photo ${index + 1}`}
                          fill
                          unoptimized
                          className="object-contain bg-black/30 object-center"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.84),transparent_48%)]" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
                          <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/78 backdrop-blur">
                            {image.image_type === "gallery" ? "Gallery shot" : "Saved photo"}
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/56 backdrop-blur">
                            {image.variant_kind?.replace(/_/g, " ") || `Shot ${index + 1}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Saved photos</h2>
                <p className="mt-3 text-sm leading-7 text-white/60">
                  No extra shots have been saved for this character yet. Open Photo Studio when you want to expand the gallery.
                </p>
              </div>
            )}

            <GenerateCharacterPhotoPanel
              characterId={character.id}
              characterName={character.name}
              baseImageUrl={resolvedPrimaryImage?.resolvedUrl ?? detail.primaryImageUrl}
              promptInput={buildPromptInputFromCustomCharacter(character)}
              collectionHref="/collection"
              studioHref={
                detail.isLegacyAnime ? null : `/photo-studio/custom/${character.slug}`
              }
              generationLocked={detail.isLegacyAnime}
              lockedTitle="Photo Studio is locked for this archive"
              lockedDescription="This character came from the legacy anime flow. Saved photos stay here, but new shots now require a realistic rebuild."
              lockedCtaHref={detail.rebuildHref}
              lockedCtaLabel="Rebuild as realistic"
            />
          </section>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
              <h2 className="text-xl font-semibold text-white">Quick read</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                    Identity
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detail.identitySummary.length > 0 ? (
                      detail.identitySummary.map((item) => (
                        <InfoPill key={item} label={item} />
                      ))
                    ) : (
                      <div className="text-sm text-white/62">No identity summary saved yet.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                    Scenario
                  </div>
                  <div className="mt-3 space-y-3">
                    {scenarioItems.length > 0 ? (
                      scenarioItems.map((item) => (
                        <div key={item.label}>
                          <div className="text-xs uppercase tracking-[0.16em] text-white/36">
                            {item.label}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-white/76">
                            {item.value}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm leading-6 text-white/62">
                        No detailed scenario fields saved yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {(detail.openingSummary || detail.openingBeat || detail.openingLine) ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Opening energy</h2>
                <div className="mt-4 space-y-4">
                  {detail.openingSummary ? (
                    <div className="rounded-[22px] border border-fuchsia-400/15 bg-fuchsia-400/8 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/70">
                        Opening summary
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/80">
                        {detail.openingSummary}
                      </div>
                    </div>
                  ) : null}
                  {detail.openingBeat ? (
                    <div className="rounded-[22px] border border-cyan-400/15 bg-cyan-400/8 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">
                        Scene pulse
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/80">
                        {detail.openingBeat}
                      </div>
                    </div>
                  ) : null}
                  {detail.openingLine ? (
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                        Opening line
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/80">
                        {detail.openingLine}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {detail.description ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Character notes</h2>
                <p className="mt-4 text-sm leading-8 text-white/72">
                  {detail.description}
                </p>
              </div>
            ) : null}

            {detail.traitLabels.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Traits</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {detail.traitLabels.map((trait) => (
                    <InfoPill key={trait} label={trait} />
                  ))}
                </div>
              </div>
            ) : null}

            {detail.visualSummary.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Visual anchors</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {detail.visualSummary.map((item) => (
                    <InfoPill key={item} label={item} />
                  ))}
                </div>
              </div>
            ) : null}

            {detail.scenarioSummary ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Scenario summary</h2>
                <p className="mt-4 text-sm leading-8 text-white/72">
                  {detail.scenarioSummary}
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
