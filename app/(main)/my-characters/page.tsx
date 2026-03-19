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
    redirect("/login?next=/my-characters");
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
      visibility: readVisibilityFromPayload(row.payload),
      updatedAt: row.updated_at,
    })),
  );
  const publicCount = items.filter((item) => item.visibility === "public").length;
  const privateCount = items.length - publicCount;
  const readyImageCount = items.filter((item) => item.imageUrl).length;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="relative mb-10 overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(217,70,239,0.12),rgba(255,255,255,0.05),rgba(59,130,246,0.08))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.26)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-fuchsia-200">
                My Character Library
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Your locked characters, all in one place
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
                Every character you create lives here as a finished, locked profile.
                Open them again anytime and jump straight back into chat.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  {items.length} total characters
                </span>
                <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-fuchsia-100">
                  {privateCount} private
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-100">
                  {publicCount} public
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">
                  {readyImageCount} with avatars
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-200/75">
                What you can do here
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                <p>Open your characters directly back into chat.</p>
                <p>Keep private characters separate from what you share with the community.</p>
                <p>Use this as your personal library of locked characters.</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/characters"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Professional
                </Link>
                <Link
                  href="/community"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Community
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
        </div>

        <CharacterListGrid
          items={items}
          emptyTitle="No characters yet"
          emptyDescription="You have not created any custom characters yet."
          ctaLabel="Open Chat"
        />
      </div>
    </main>
  );
}
