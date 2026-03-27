import AuthGuard from "@/components/auth/auth-guard";
import { IdentityLockedPhotoStudio } from "@/components/characters/identity-locked-photo-studio";
import { getManagedBuiltInCharacterBySlug } from "@/lib/character-admin";
import {
  createSupabaseStorageSigner,
  resolveCharacterGalleryImages,
  resolveCharacterPrimaryImage,
} from "@/lib/character-image-assets";
import { buildPromptInputFromBuiltInCharacter } from "@/lib/character-image-prompt-input";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BuiltInPhotoStudioPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const character = await getManagedBuiltInCharacterBySlug(supabase as never, slug);

  if (!character || !character.adminVisibility.showInPhotoStudio) {
    notFound();
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: imageRowsRaw } = user
    ? await supabase
        .from("character_images")
        .select(
          "character_id, storage_bucket, storage_path, public_url, is_primary, image_type, created_at",
        )
        .eq("user_id", user.id)
        .eq("character_id", slug)
        .order("created_at", { ascending: false })
        .limit(12)
    : { data: [] };

  const imageRows = Array.isArray(imageRowsRaw)
    ? imageRowsRaw.reduce<
        Array<{
          character_id: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          public_url: string | null;
          is_primary?: boolean | null;
          image_type?: string | null;
          created_at?: string | null;
        }>
      >((acc, row) => {
        if (
          (typeof row.public_url !== "string" || !row.public_url.trim()) &&
          (typeof row.storage_path !== "string" || !row.storage_path.trim())
        ) {
          return acc;
        }

        acc.push({
          character_id: slug,
          storage_bucket:
            typeof row.storage_bucket === "string" ? row.storage_bucket : null,
          storage_path:
            typeof row.storage_path === "string" ? row.storage_path : null,
          public_url:
            typeof row.public_url === "string" ? row.public_url : null,
          is_primary: typeof row.is_primary === "boolean" ? row.is_primary : null,
          image_type: typeof row.image_type === "string" ? row.image_type : null,
          created_at: typeof row.created_at === "string" ? row.created_at : null,
        });

        return acc;
      }, [])
    : [];
  const signUrl = createSupabaseStorageSigner(supabase as never);
  const primaryImage = await resolveCharacterPrimaryImage({
    rows: imageRows,
    signUrl,
    fallbackUrl: character.image,
  });
  const resolvedGalleryImages = await resolveCharacterGalleryImages({
    rows: imageRows.filter((row) => row.image_type === "gallery"),
    signUrl,
  });
  const latestGalleryImageUrl =
    resolvedGalleryImages.find((image) => image.resolvedUrl)?.resolvedUrl ?? null;

  return (
    <AuthGuard>
      <IdentityLockedPhotoStudio
        source={{
          kind: "built-in",
          sourceLabel: "professional",
          characterId: character.slug,
          characterSlug: character.slug,
          characterName: character.name,
          baseImageUrl: primaryImage?.resolvedUrl ?? character.image,
          latestGalleryImageUrl,
          promptInput: buildPromptInputFromBuiltInCharacter(character),
          collectionHref: `/collection/${character.slug}`,
          backHref: `/characters/${character.slug}`,
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
              href: `/chat/${character.slug}`,
              subtitle: "Return to the live conversation thread.",
            },
            {
              id: "archive",
              label: "Character Collection",
              href: `/collection/${character.slug}`,
              subtitle: "Review this character archive.",
            },
            {
              id: "studio-current",
              label: "Active Studio",
              href: `/photo-studio/built-in/${character.slug}`,
              active: true,
              subtitle: "Current professional character studio shell.",
            },
          ],
        }}
      />
    </AuthGuard>
  );
}
