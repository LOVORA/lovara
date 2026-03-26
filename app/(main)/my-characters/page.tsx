import Link from "next/link";
import { redirect } from "next/navigation";
import CharacterListGrid from "@/components/characters/character-list-grid";
import { mapCharacterListItemsToCardViews } from "@/lib/character-builder/list-item-mappers";
import {
  createSupabaseStorageSigner,
  resolveCharacterImageMap,
} from "@/lib/character-image-assets";
import { getCharacterBySlug } from "@/lib/characters";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawCustomCharacterRow = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  description: string | null;
  payload: Record<string, unknown> | null;
  style_type: "realistic" | "anime" | null;
  primary_image_url: string | null;
  updated_at: string | null;
  user_id?: string | null;
};

type RawCustomConversationRow = {
  custom_character_id: string;
  updated_at: string | null;
};

type RawBuiltInConversationRow = {
  character_slug: string;
  updated_at: string | null;
};

type CharacterImageRow = {
  character_id: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  public_url: string | null;
  is_primary?: boolean | null;
  image_type?: string | null;
  created_at?: string | null;
};

function readIdentityField(payload: Record<string, unknown> | null, key: string) {
  if (!payload || typeof payload !== "object") return "";

  const identity =
    typeof payload.identity === "object" && payload.identity
      ? (payload.identity as Record<string, unknown>)
      : null;

  const value = identity?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function summarizeStory(
  headline?: string | null,
  description?: string | null,
  fallback?: string,
) {
  const primary = description?.trim() || headline?.trim() || fallback || "";
  if (!primary) return "";
  return primary.replace(/\s+/g, " ").trim();
}

export default async function MyCharactersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/my-characters");
  }

  const { data: ownedRowsRaw, error: ownedError } = await supabase
    .from("custom_characters")
    .select(
      "id, slug, name, headline, description, payload, style_type, primary_image_url, updated_at, user_id",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (ownedError) {
    throw new Error(ownedError.message);
  }

  const ownedRows = (ownedRowsRaw ?? []) as RawCustomCharacterRow[];
  const ownedIds = new Set(ownedRows.map((row) => row.id));

  const { data: customConversationRowsRaw, error: customConversationError } =
    await supabase
      .from("custom_conversations")
      .select("custom_character_id, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

  if (customConversationError) {
    throw new Error(customConversationError.message);
  }

  const customConversationRows =
    (customConversationRowsRaw ?? []) as RawCustomConversationRow[];
  const externalCustomIds = Array.from(
    new Set(
      customConversationRows
        .map((row) => row.custom_character_id)
        .filter((id) => id && !ownedIds.has(id)),
    ),
  );

  const { data: externalCustomRowsRaw, error: externalCustomError } =
    externalCustomIds.length > 0
      ? await supabase
          .from("custom_characters")
          .select(
            "id, slug, name, headline, description, payload, style_type, primary_image_url, updated_at, user_id",
          )
          .in("id", externalCustomIds)
      : { data: [], error: null };

  if (externalCustomError) {
    throw new Error(externalCustomError.message);
  }

  const externalCustomRows = (externalCustomRowsRaw ?? []) as RawCustomCharacterRow[];
  const externalConversationMap = new Map(
    customConversationRows.map((row) => [row.custom_character_id, row.updated_at ?? null]),
  );

  const { data: builtInConversationRowsRaw, error: builtInConversationError } =
    await supabase
      .from("conversations")
      .select("character_slug, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

  if (builtInConversationError) {
    throw new Error(builtInConversationError.message);
  }

  const builtInLatestBySlug = new Map<string, RawBuiltInConversationRow>();
  for (const row of (builtInConversationRowsRaw ?? []) as RawBuiltInConversationRow[]) {
    if (!row.character_slug || builtInLatestBySlug.has(row.character_slug)) continue;
    if (!getCharacterBySlug(row.character_slug)) continue;
    builtInLatestBySlug.set(row.character_slug, row);
  }

  const builtInSlugs = Array.from(builtInLatestBySlug.keys());
  const allCharacterIds = [
    ...ownedRows.map((row) => row.id),
    ...externalCustomRows.map((row) => row.id),
    ...builtInSlugs,
  ];

  const { data: imageRowsRaw } =
    allCharacterIds.length > 0
      ? await supabase
          .from("character_images")
          .select(
            "character_id, storage_bucket, storage_path, public_url, is_primary, image_type, created_at",
          )
          .eq("user_id", user.id)
          .in("character_id", allCharacterIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const imageMap = await resolveCharacterImageMap({
    rows: (imageRowsRaw ?? []) as CharacterImageRow[],
    signUrl: createSupabaseStorageSigner(supabase as never),
    fallbackByCharacterId: new Map([
      ...ownedRows.map((row) => [row.id, row.primary_image_url ?? null] as const),
      ...externalCustomRows.map((row) => [row.id, row.primary_image_url ?? null] as const),
      ...builtInSlugs.map((slug) => [slug, getCharacterBySlug(slug)?.image ?? null] as const),
    ]),
  });

  const ownedItems = ownedRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    headline: row.headline,
    description: row.description,
    payload: row.payload,
    primaryImageUrl: imageMap.get(row.id) ?? null,
    styleType: row.style_type,
    ageLabel: readIdentityField(row.payload, "age"),
    originLabel: readIdentityField(row.payload, "region"),
    storySummary: summarizeStory(
      row.headline,
      row.description,
      "Your saved custom character, ready to reopen.",
    ),
    source: "custom" as const,
    chatHref: `/chat/custom/${row.slug}`,
    updatedAt: row.updated_at ?? null,
    exposeLegacyState: true,
  }));

  const externalCustomItems = externalCustomRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    headline: row.headline,
    description: row.description,
    payload: row.payload,
    primaryImageUrl: imageMap.get(row.id) ?? null,
    styleType: row.style_type,
    ageLabel: readIdentityField(row.payload, "age"),
    originLabel: readIdentityField(row.payload, "region"),
    storySummary: summarizeStory(
      row.headline,
      row.description,
      "A saved community character kept on your account.",
    ),
    source: "community" as const,
    chatHref: `/chat/custom/${row.slug}`,
    updatedAt: externalConversationMap.get(row.id) ?? row.updated_at ?? null,
    exposeLegacyState: false,
  }));

  const builtInItems = builtInSlugs.map((slug) => {
    const character = getCharacterBySlug(slug);
    const conversation = builtInLatestBySlug.get(slug);

    return {
      id: slug,
      slug,
      name: character?.name ?? slug,
      headline: character?.headline ?? null,
      description: character?.description ?? null,
      payload: null,
      primaryImageUrl: imageMap.get(slug) ?? character?.image ?? null,
      ageLabel: character?.age ? String(character.age) : "",
      originLabel: character?.history?.origin ?? "",
      storySummary: summarizeStory(
        character?.headline,
        character?.description,
        "A professional character saved through your chats.",
      ),
      source: "professional" as const,
      chatHref: `/chat/${slug}`,
      updatedAt: conversation?.updated_at ?? null,
    };
  });

  const items = mapCharacterListItemsToCardViews(
    [...ownedItems, ...externalCustomItems, ...builtInItems].sort((left, right) => {
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
      return rightTime - leftTime;
    }),
  );

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-[98rem] px-6 py-10 xl:px-7">
        <div className="mb-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(217,70,239,0.10),rgba(255,255,255,0.04),rgba(59,130,246,0.08))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.22)]">
            <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-fuchsia-100">
              My Characters
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              Every saved character, ready to reopen fast
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64 md:text-base">
              See the avatar, who they are, where they are from, and jump back into chat without digging through extra details.
            </p>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-black/20 p-8">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
              Quick actions
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/70">
              <p>Use `Chat` to reopen the character immediately.</p>
              <p>Use `Delete` to remove it from your account or fully delete your own custom one.</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/create-character"
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
              >
                Create character
              </Link>
              <Link
                href="/photo-studio"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
              >
                Open Photo Studio
              </Link>
            </div>
          </section>
        </div>

        <CharacterListGrid
          items={items}
          emptyTitle="No characters yet"
          emptyDescription="Create a character or start a chat and it will appear here."
          showAccountActions
        />
      </div>
    </main>
  );
}
