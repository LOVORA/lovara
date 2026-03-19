import Link from "next/link";
import CharacterListGrid from "@/components/characters/character-list-grid";
import { mapCharacterListItemsToCardViews } from "@/lib/character-builder/list-item-mappers";
import { createClient } from "@/lib/supabase/server";

type RawCommunityCharacterRow = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  description: string | null;
  tags: string[] | null;
  payload: Record<string, unknown> | null;
  updated_at: string | null;
};

async function loadPrimaryImageMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterIds: string[],
) {
  if (characterIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from("character_images")
    .select("character_id, public_url, created_at")
    .in("character_id", characterIds)
    .eq("is_primary", true)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return new Map<string, string>();
  }

  const imageMap = new Map<string, string>();

  for (const row of data as Array<{ character_id: string; public_url: string | null }>) {
    if (!row.character_id || !row.public_url || imageMap.has(row.character_id)) continue;
    imageMap.set(row.character_id, row.public_url);
  }

  return imageMap;
}

function isPublicCharacter(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;
  return payload.visibility === "public";
}

export default async function CommunityPage() {
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

  const rows = ((data ?? []) as RawCommunityCharacterRow[]).filter((row) =>
    isPublicCharacter(row.payload),
  );
  const imageMap = await loadPrimaryImageMap(
    supabase,
    rows.map((row) => row.id),
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
      primaryImageUrl: imageMap.get(row.id) ?? null,
      imageStatus: imageMap.get(row.id) ? "ready" : "none",
      visibility: "public",
      updatedAt: row.updated_at,
    })),
  );

  const builderV2Count = rows.filter((row) => row.payload?.builderV2 === true).length;
  const readyImageCount = items.filter((item) => item.imageUrl).length;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="relative mb-10 overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(255,255,255,0.05),rgba(16,185,129,0.08))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.26)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-200">
                Community
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Shared by real users, built for discovery
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
                This is the public side of custom creation. Users choose what to
                share, and the strongest character cards rise to the top.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  {items.length} community characters
                </span>
                <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-fuchsia-100">
                  {builderV2Count} studio-built profiles
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">
                  {readyImageCount} with ready avatars
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/75">
                How this page works
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                <p>Characters appear here only when users make them public.</p>
                <p>You can open the public card first, then decide which ones feel worth chatting with.</p>
                <p>Professional site characters stay separate, so discovery stays clean.</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/characters"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Professional Characters
                </Link>
                <Link
                  href="/my-characters"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  My Characters
                </Link>
              </div>
            </div>
          </div>
        </div>

        <CharacterListGrid
          items={items}
          emptyTitle="No community characters yet"
          emptyDescription="When users make their characters public, they will appear here."
          ctaLabel="Open Card"
          hrefBase="/community"
        />
      </div>
    </main>
  );
}
