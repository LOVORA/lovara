import Link from "next/link";
import CharacterListGrid from "@/components/characters/character-list-grid";
import { mapCharacterListItemsToCardViews } from "@/lib/character-builder/list-item-mappers";
import { createClient } from "@/lib/supabase/server";

type RawPublicCharacterRow = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  description: string | null;
  tags: string[] | null;
  payload: Record<string, unknown> | null;
  updated_at: string | null;
};

function isPublicCharacter(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;
  return payload.visibility === "public";
}

export default async function CharactersPage() {
  const supabase = await createClient();

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
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as RawPublicCharacterRow[]).filter((row) =>
    isPublicCharacter(row.payload),
  );

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
      visibility: "public",
      updatedAt: row.updated_at,
    })),
  );

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-200">
              Public Characters
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              Explore characters
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
              Public characters created by users appear here. Builder-v2
              characters automatically surface richer teaser, prompt tone, and
              visual summary data when available.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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

        <CharacterListGrid
          items={items}
          emptyTitle="No public characters yet"
          emptyDescription="Once characters are published publicly, they will appear here."
          ctaLabel="Open"
        />
      </div>
    </main>
  );
}
