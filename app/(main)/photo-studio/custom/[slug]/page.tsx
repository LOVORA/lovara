import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IdentityLockedPhotoStudio } from "@/components/characters/identity-locked-photo-studio";
import {
  createSupabaseStorageSigner,
  resolveCharacterGalleryImages,
  resolveCharacterPrimaryImage,
} from "@/lib/character-image-assets";
import { buildPromptInputFromCustomCharacter } from "@/lib/character-image-prompt-input";
import {
  buildLegacyRebuildHref,
  getLegacyCharacterState,
} from "@/lib/legacy-character-state";
import { listCharacterImagesWithClient } from "@/lib/character-repository/images";
import { resolveAccessibleCustomCharacterBySlug } from "@/lib/server/custom-character-ownership";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CustomPhotoStudioPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/photo-studio/custom/${slug}`)}`);
  }

  const character = await resolveAccessibleCustomCharacterBySlug({
    supabase: supabase as never,
    slug,
    userId: user.id,
  });

  if (!character) {
    notFound();
  }

  const legacyState = getLegacyCharacterState({
    styleType: character.style_type,
    payload: character.payload,
  });

  if (legacyState.isLegacyAnime) {
    const rebuildHref = buildLegacyRebuildHref(character.id);

    return (
      <main className="min-h-screen bg-[#050816] px-4 py-6 text-white md:px-6 md:py-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[0_24px_100px_rgba(0,0,0,0.32)]">
          <div className="border-b border-white/10 p-6 md:p-8">
            <div className="inline-flex rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-rose-100">
              Legacy archive
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Photo Studio is locked for this character
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
              This character comes from the older anime-based image flow. Saved photos stay available, but new image generation now requires a realistic rebuild.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/75">
              Existing photos remain in Collection.
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/75">
              Existing chats stay exactly as they are.
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/75">
              A realistic rebuild creates a new version without overwriting this archive.
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-white/10 p-6 md:p-8">
            <Link
              href={rebuildHref}
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
            >
              Rebuild as realistic
            </Link>
            <Link
              href={`/my-characters/${character.slug}`}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
            >
              Back to character
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const imageRows = await listCharacterImagesWithClient(supabase as never, character.id);
  const signUrl = createSupabaseStorageSigner(supabase as never);
  const primaryImage = await resolveCharacterPrimaryImage({
    rows: imageRows,
    signUrl,
    fallbackUrl: character.primary_image_url,
  });
  const resolvedGalleryImages = await resolveCharacterGalleryImages({
    rows: imageRows.filter((image) => image.image_type === "gallery"),
    signUrl,
  });
  const latestGalleryImageUrl =
    resolvedGalleryImages.find((image) => image.resolvedUrl)?.resolvedUrl ?? null;

  return (
    <IdentityLockedPhotoStudio
      source={{
        kind: "custom",
        sourceLabel: character.user_id === user.id ? "my_character" : "community",
        characterId: character.id,
        characterSlug: character.slug,
        characterName: character.name,
        baseImageUrl: primaryImage?.resolvedUrl ?? null,
        latestGalleryImageUrl,
        promptInput: buildPromptInputFromCustomCharacter(character),
        collectionHref: `/collection/${character.id}`,
        backHref: `/my-characters/${character.slug}`,
        backLabel: "Back to character",
        quickLinks: [
          {
            id: "studio-home",
            label: "Photo Studio Home",
            href: "/photo-studio",
            subtitle: "Pick another started-conversation character.",
          },
          {
            id: "chat",
            label: "Open Chat",
            href: `/chat/custom/${character.slug}`,
            subtitle: "Return to the live conversation thread.",
          },
          {
            id: "archive",
            label: "Character Collection",
            href: `/collection/${character.id}`,
            subtitle: "Review saved safe and adult images.",
          },
          {
            id: "studio-current",
            label: "Active Studio",
            href: `/photo-studio/custom/${character.slug}`,
            active: true,
            subtitle: "Current character studio shell.",
          },
        ],
      }}
    />
  );
}
