import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCharacterBySlug } from "@/lib/characters";
import {
  createSupabaseStorageSigner,
  resolveCharacterGalleryImages,
} from "@/lib/character-image-assets";
import {
  getLegacyCharacterState,
} from "@/lib/legacy-character-state";
import { createClient } from "@/lib/supabase/server";

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
};

type ResolvedCollectionImageRow = CollectionImageRow & {
  resolvedUrl: string | null;
};

type CharacterLookupRow = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  payload: Record<string, unknown> | null;
  style_type: "realistic" | "anime" | null;
};

type CollectionGroup = {
  characterId: string;
  slug: string | null;
  name: string;
  headline: string;
  images: ResolvedCollectionImageRow[];
  cover: ResolvedCollectionImageRow | null;
  source: "custom" | "professional" | "unknown";
  isLegacyAnime: boolean;
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

export default async function CollectionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/collection");
  }

  const { data: imageRowsRaw, error: imageError } = await supabase
    .from("character_images")
    .select(
      "id, character_id, storage_bucket, storage_path, public_url, image_type, variant_kind, is_primary, created_at, prompt_snapshot, prompt_input, provider_used",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (imageError) {
    throw new Error(imageError.message);
  }

  const imageRows = (imageRowsRaw ?? []) as CollectionImageRow[];
  const signUrl = createSupabaseStorageSigner(supabase as never);
  const resolvedImageRows = await resolveCharacterGalleryImages({
    rows: imageRows,
    signUrl,
  });
  const resolvedImageMap = new Map(
    resolvedImageRows.map((row) => [row.id, row]),
  );
  const characterIds = Array.from(new Set(imageRows.map((row) => row.character_id).filter(Boolean)));

  const { data: characterRowsRaw, error: characterError } =
    characterIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("custom_characters")
          .select("id, slug, name, headline, payload, style_type")
          .eq("user_id", user.id)
          .in("id", characterIds);

  if (characterError) {
    throw new Error(characterError.message);
  }

  const characterMap = new Map(
    ((characterRowsRaw ?? []) as CharacterLookupRow[]).map((row) => [row.id, row]),
  );

  const groups = Array.from(
    imageRows.reduce((map, image) => {
      const resolved = resolvedImageMap.get(image.id);
      if (!resolved?.resolvedUrl) {
        return map;
      }

      const current = map.get(image.character_id) ?? [];
      current.push(resolved);
      map.set(image.character_id, current);
      return map;
    }, new Map<string, ResolvedCollectionImageRow[]>()),
  )
    .map(([characterId, images]) => {
      const match = characterMap.get(characterId);
      const professionalCharacter = match ? null : getCharacterBySlug(characterId);
      const cover = images.find((image) => image.is_primary) ?? images[0] ?? null;
      const legacyState = getLegacyCharacterState({
        styleType: match?.style_type ?? null,
        payload: match?.payload ?? null,
      });

      return {
        characterId,
        slug: match?.slug ?? professionalCharacter?.slug ?? null,
        name: match?.name ?? professionalCharacter?.name ?? "Saved character",
        headline:
          match?.headline ??
          professionalCharacter?.headline ??
          "Generated images saved for this character.",
        images,
        cover,
        source: match
          ? "custom"
          : professionalCharacter
            ? "professional"
            : "unknown",
        isLegacyAnime: match ? legacyState.isLegacyAnime : false,
      } satisfies CollectionGroup;
    })
    .sort((a, b) => {
      const aDate = new Date(a.images[0]?.created_at ?? 0).getTime();
      const bDate = new Date(b.images[0]?.created_at ?? 0).getTime();
      return bDate - aDate;
    });

  const avatarCount = imageRows.filter((image) => image.is_primary).length;
  const extraCount = imageRows.length - avatarCount;
  const adultCount = imageRows.filter((image) => resolveContentTier(image) === "adult").length;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="relative mb-10 overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(255,255,255,0.05),rgba(34,197,94,0.08))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.26)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_24%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-200">
                Collection
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Your saved image archive
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
                Every avatar and every extra photo you saved lives here,
                grouped by character and easy to reopen.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  {groups.length} characters
                </span>
                <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-fuchsia-100">
                  {avatarCount} avatars
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">
                  {extraCount} extra photos
                </span>
                <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-fuchsia-100">
                  {adultCount} adult
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/75">
                Archive view
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                <p>Main avatars stay grouped with the rest of each character&apos;s photos.</p>
                <p>Extra image sets appear here automatically after they are saved.</p>
                <p>This archive belongs only to your account.</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/my-characters"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  My Characters
                </Link>
                <Link
                  href="/create-character"
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
                >
                  Create Character
                </Link>
              </div>
            </div>
          </div>
        </section>

        {groups.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
            <h2 className="text-xl font-semibold text-white">No saved images yet</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
              Once you generate and save character images, they will appear here in a
              private collection grouped by character.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {groups.map((group) => (
              <Link
                key={group.characterId}
                href={`/collection/${encodeURIComponent(group.characterId)}`}
                className="group rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]"
              >
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
                    {group.cover?.resolvedUrl ? (
                      <div className="relative h-[380px] w-full">
                        <Image
                          src={group.cover.resolvedUrl}
                          alt={group.name}
                          fill
                          unoptimized
                          className="object-contain bg-black/30 object-center transition duration-300 group-hover:scale-[1.02]"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.8),transparent_48%)]" />
                        <div className="absolute inset-x-0 bottom-0 p-5">
                          <div className="rounded-[22px] border border-white/10 bg-black/35 p-4 backdrop-blur">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                              Cover shot
                            </div>
                            <div className="mt-2 text-base font-semibold text-white">
                              {group.name}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-white/68">
                              {group.images.length} saved frames in this archive.
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-[380px] items-center justify-center bg-black/20">
                        <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-black/30 text-3xl font-semibold text-white/90">
                          {group.name.slice(0, 1)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                      Character archive
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {group.name}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-white/66">
                      {group.headline}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">
                        {group.images.length} saved images
                      </span>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
                        {group.images.filter((image) => resolveContentTier(image) === "safe").length} safe
                      </span>
                      <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-100">
                        {group.images.filter((image) => resolveContentTier(image) === "adult").length} adult
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">
                        {group.source === "professional"
                          ? "Ready-made character"
                          : group.source === "custom"
                            ? "My character"
                            : "Saved character"}
                      </span>
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                        Saved archive
                      </span>
                      {group.isLegacyAnime ? (
                        <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs text-rose-100">
                          Legacy style
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 text-sm text-cyan-100/80 transition group-hover:text-cyan-50">
                      Open this archive
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
