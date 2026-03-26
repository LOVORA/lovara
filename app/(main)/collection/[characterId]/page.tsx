import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteImageButton } from "@/components/collection/delete-image-button";
import { getCharacterBySlug } from "@/lib/characters";
import {
  createSupabaseStorageSigner,
  resolveCharacterGalleryImages,
} from "@/lib/character-image-assets";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    characterId: string;
  }>;
  searchParams?: Promise<{
    tier?: string;
  }>;
};

type CollectionImageRow = {
  id: string;
  character_id: string;
  storage_bucket: string | null;
  storage_path: string | null;
  public_url: string | null;
  image_type: string | null;
  variant_kind: string | null;
  is_primary: boolean;
  created_at: string;
  prompt_snapshot: string | null;
  prompt_input: Record<string, unknown> | null;
  provider_used: string | null;
  model_used: string | null;
};

type CharacterLookupRow = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
};

function resolveContentTier(image: CollectionImageRow) {
  const promptInput =
    image.prompt_input && typeof image.prompt_input === "object"
      ? image.prompt_input
      : {};

  return promptInput.contentTier === "adult" || promptInput.studioMode === "adult"
    ? "adult"
    : "safe";
}

function formatSetLabel(image: CollectionImageRow) {
  const promptInput =
    image.prompt_input && typeof image.prompt_input === "object"
      ? image.prompt_input
      : {};
  const studioMode = promptInput.studioMode === "adult" ? "Adult studio" : "Normal studio";
  const generationProfile =
    typeof promptInput.generationProfile === "string"
      ? promptInput.generationProfile
      : "";

  if (generationProfile === "identity_locked_avatar") return "Locked avatar";
  return studioMode;
}

function formatImageLabel(image: CollectionImageRow) {
  if (image.is_primary) return "Avatar";
  if (image.variant_kind) return image.variant_kind.replace(/_/g, " ");
  if (image.image_type) return image.image_type;
  return "Saved image";
}

export default async function CollectionCharacterDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { characterId } = await params;
  const { tier: rawTier } = (await searchParams) ?? {};
  const activeTier = rawTier === "adult" || rawTier === "safe" ? rawTier : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/collection/${characterId}`)}`);
  }

  const { data: imageRowsRaw, error: imageError } = await supabase
    .from("character_images")
    .select(
      "id, character_id, storage_bucket, storage_path, public_url, image_type, variant_kind, is_primary, created_at, prompt_snapshot, prompt_input, provider_used, model_used",
    )
    .eq("user_id", user.id)
    .eq("character_id", characterId)
    .order("created_at", { ascending: false });

  if (imageError) {
    throw new Error(imageError.message);
  }

  const imageRows = (imageRowsRaw ?? []) as CollectionImageRow[];
  if (imageRows.length === 0) {
    notFound();
  }

  const { data: characterRowRaw } = await supabase
    .from("custom_characters")
    .select("id, slug, name, headline")
    .eq("user_id", user.id)
    .eq("id", characterId)
    .maybeSingle();

  const characterRow = (characterRowRaw as CharacterLookupRow | null) ?? null;
  const builtInCharacter = characterRow ? null : getCharacterBySlug(characterId);
  const characterName = characterRow?.name ?? builtInCharacter?.name ?? "Saved character";
  const characterHeadline =
    characterRow?.headline ??
    builtInCharacter?.headline ??
    "Saved images for this character.";
  const chatHref = characterRow?.slug
    ? `/chat/custom/${characterRow.slug}`
    : builtInCharacter?.slug
      ? `/chat/${builtInCharacter.slug}`
      : null;

  const signUrl = createSupabaseStorageSigner(supabase as never);
  const resolvedImageRows = await resolveCharacterGalleryImages({
    rows: imageRows,
    signUrl,
  });

  const filteredImages = resolvedImageRows.filter((image) => {
    if (activeTier === "all") return true;
    return resolveContentTier(image) === activeTier;
  });

  const safeCount = imageRows.filter((image) => resolveContentTier(image) === "safe").length;
  const adultCount = imageRows.filter((image) => resolveContentTier(image) === "adult").length;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-[110rem] px-6 py-10">
        <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(255,255,255,0.05),rgba(217,70,239,0.08))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.26)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-200">
                Character archive
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                {characterName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
                {characterHeadline}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  {imageRows.length} total
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">
                  {safeCount} safe
                </span>
                <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-fuchsia-100">
                  {adultCount} adult
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/collection"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
              >
                Back to Collection
              </Link>
              {chatHref ? (
                <Link
                  href={chatHref}
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
                >
                  Open Chat
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { id: "all", label: "All" },
              { id: "safe", label: "Safe" },
              { id: "adult", label: "Adult" },
            ].map((item) => (
              <Link
                key={item.id}
                href={
                  item.id === "all"
                    ? `/collection/${encodeURIComponent(characterId)}`
                    : `/collection/${encodeURIComponent(characterId)}?tier=${item.id}`
                }
                className={
                  activeTier === item.id
                    ? "rounded-full border border-cyan-300/35 bg-cyan-400/15 px-4 py-2 text-sm text-cyan-100"
                    : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                }
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        {filteredImages.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
            <h2 className="text-xl font-semibold text-white">No images in this filter yet</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
              Switch filters or generate a new photo set for this character.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
              >
                <div className="relative h-[420px] w-full">
                  {image.resolvedUrl ? (
                    <Image
                      src={image.resolvedUrl}
                      alt={`${characterName} ${formatImageLabel(image)}`}
                      fill
                      unoptimized
                      className="object-contain bg-black/30 object-center"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-black/20 text-sm text-white/50">
                      Saved image unavailable
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.82),transparent_50%)]" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
                    <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/78 backdrop-blur">
                      {formatImageLabel(image)}
                    </span>
                    <span
                      className={
                        resolveContentTier(image) === "adult"
                          ? "rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100 backdrop-blur"
                          : "rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-100 backdrop-blur"
                      }
                    >
                      {formatSetLabel(image)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-white/10 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                      Archive action
                    </div>
                    {!image.is_primary ? (
                      <DeleteImageButton imageId={image.id} characterId={characterId} />
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/55">
                        Locked avatar
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                    Saved render
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/75">
                    {image.prompt_snapshot?.trim() || "Saved character image"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
