import Link from "next/link";
import { redirect } from "next/navigation";
import CharacterListGrid from "@/components/characters/character-list-grid";
import { mapCharacterListItemsToCardViews } from "@/lib/character-builder/list-item-mappers";
import { createClient } from "@/lib/supabase/server";

type RawMyCharacterRow = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  description: string | null;
  tags: string[] | null;
  payload: Record<string, unknown> | null;
  updated_at: string | null;
};

function readVisibilityFromPayload(
  payload: Record<string, unknown> | null,
): string {
  if (!payload) return "private";

  const directVisibility = payload.visibility;
  if (typeof directVisibility === "string" && directVisibility.trim()) {
    return directVisibility;
  }

  return "private";
}

export default async function MyCharactersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("custom_characters")
    .select(
      `
        id,
        slug,
        name,
        headline,
        description,
        tags,
        payload,
        updated_at
      `,
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as RawMyCharacterRow[];

  const items = mapCharacterListItemsToCardViews(
    rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      headline: row.headline,
      description: row.description,
      tags: row.tags,
      payload: row.payload,
      primaryImageUrl: null,
      imageStatus: "none",
      visibility: readVisibilityFromPayload(row.payload),
      updatedAt: row.updated_at,
    })),
  );

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-fuchsia-200">
              My Character Vault
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              Your saved characters
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
              Private and public characters you created appear here. Builder-v2
              cards automatically show richer teaser and visual summary data when
              available.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/characters"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
            >
              Explore Public
            </Link>
            <Link
              href="/create-character"
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
            >
              Create Character
            </Link>
          </div>
        </div>

        <CharacterListGrid
          items={items}
          emptyTitle="No characters yet"
          emptyDescription="You have not created any custom characters yet. Start with a quick template or build a deep studio character."
          ctaLabel="Open Chat"
        />
      </div>
    </main>
  );
}
