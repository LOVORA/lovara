import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createSupabaseStorageSigner,
  resolveCharacterImageMap,
} from "@/lib/character-image-assets";
import {
  getCustomCharacterVisibility,
  listManagedBuiltInCharacters,
} from "@/lib/character-admin";
import { createClient } from "@/lib/supabase/server";

type CustomCharacterRow = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  payload: Record<string, unknown> | null;
  primary_image_url: string | null;
  updated_at: string | null;
  user_id: string | null;
};

type CustomConversationRow = {
  custom_character_id: string;
  updated_at: string | null;
};

type BuiltInConversationRow = {
  character_slug: string;
  updated_at: string;
};

type ImageRow = {
  character_id: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  public_url: string | null;
  is_primary?: boolean | null;
  image_type?: string | null;
  created_at?: string | null;
};

type StudioCard = {
  id: string;
  slug: string;
  name: string;
  headline: string;
  imageUrl: string | null;
  href: string;
  source: "my_character" | "community" | "professional";
  updatedAt: string | null;
  photoCount: number;
};

function formatRelativeDate(value: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getSourceLabel(source: StudioCard["source"]) {
  switch (source) {
    case "my_character":
      return "My Character";
    case "community":
      return "Community";
    default:
      return "Professional";
  }
}

function StudioCharacterCard({ item }: { item: StudioCard }) {
  return (
    <Link
      href={item.href}
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
    >
      <div className="relative h-72 w-full bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            unoptimized
            className="object-contain bg-black/30 object-center"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-black/30 text-3xl font-semibold text-white/90">
              {item.name.slice(0, 1)}
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.82),transparent_48%)]" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/78 backdrop-blur">
              {getSourceLabel(item.source)}
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
              {item.photoCount} saved photos
            </span>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">{item.name}</div>
            <div className="mt-2 text-sm leading-6 text-white/64">
              {item.headline}
            </div>
          </div>
          <div className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-white/38">
            {formatRelativeDate(item.updatedAt)}
          </div>
        </div>
        <div className="mt-4 text-sm text-white/72">
          Choose an outfit, pose, and background while keeping the same identity locked across every new shot.
        </div>
      </div>
    </Link>
  );
}

export default async function PhotoStudioHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/photo-studio");
  }

  const signUrl = createSupabaseStorageSigner(supabase as never);
  const builtInCharacters = await listManagedBuiltInCharacters(supabase as never);
  const builtInCharacterMap = new Map(
    builtInCharacters.map((character) => [character.slug, character] as const),
  );

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
    (customConversationRowsRaw ?? []) as CustomConversationRow[];
  const latestCustomConversationById = new Map<string, string | null>();
  for (const row of customConversationRows) {
    if (!row.custom_character_id || latestCustomConversationById.has(row.custom_character_id)) {
      continue;
    }
    latestCustomConversationById.set(row.custom_character_id, row.updated_at ?? null);
  }

  const customIds = Array.from(latestCustomConversationById.keys());
  const { data: customRowsRaw, error: customError } =
    customIds.length > 0
      ? await supabase
          .from("custom_characters")
          .select("id, slug, name, headline, payload, primary_image_url, updated_at, user_id")
          .in("id", customIds)
      : { data: [], error: null };

  if (customError) {
    throw new Error(customError.message);
  }

  const customRows = (customRowsRaw ?? []) as CustomCharacterRow[];
  const { data: builtInConversationsRaw, error: builtInConversationError } =
    await supabase
      .from("conversations")
      .select("character_slug, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

  if (builtInConversationError) {
    throw new Error(builtInConversationError.message);
  }

  const latestBuiltInBySlug = new Map<string, BuiltInConversationRow>();
  for (const row of (builtInConversationsRaw ?? []) as BuiltInConversationRow[]) {
    if (!row.character_slug || latestBuiltInBySlug.has(row.character_slug)) continue;
    if (!builtInCharacterMap.get(row.character_slug)?.adminVisibility.showInPhotoStudio) {
      continue;
    }
    latestBuiltInBySlug.set(row.character_slug, row);
  }

  const builtInSlugs = Array.from(latestBuiltInBySlug.keys());
  const allCharacterIds = [...customRows.map((row) => row.id), ...builtInSlugs];

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

  const imageRows = (imageRowsRaw ?? []) as ImageRow[];
  const imageMap = await resolveCharacterImageMap({
    rows: imageRows,
    signUrl,
    fallbackByCharacterId: new Map([
      ...customRows.map((row) => [row.id, row.primary_image_url ?? null] as const),
      ...builtInSlugs.map(
        (slug) => [slug, builtInCharacterMap.get(slug)?.image ?? null] as const,
      ),
    ]),
  });

  const photoCounts = imageRows.reduce((map, row) => {
    if (!row.character_id) return map;
    map.set(row.character_id, (map.get(row.character_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const customCards: StudioCard[] = customRows
    .map((row) => {
      const visibility = getCustomCharacterVisibility(row.payload);
      if (!visibility.showInPhotoStudio) return null;

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        headline:
          row.headline?.trim() ||
          (row.user_id === user.id
            ? "Your custom character is ready for fresh studio shots."
            : "A saved community character ready for more photos."),
        imageUrl: imageMap.get(row.id) ?? null,
        href: `/photo-studio/custom/${row.slug}`,
        source: row.user_id === user.id ? "my_character" : "community",
        updatedAt: latestCustomConversationById.get(row.id) ?? row.updated_at ?? null,
        photoCount: photoCounts.get(row.id) ?? 0,
      };
    })
    .filter((item): item is StudioCard => item !== null);

  const builtInCards = builtInSlugs
    .map<StudioCard | null>((slug) => {
      const character = builtInCharacterMap.get(slug);
      const conversation = latestBuiltInBySlug.get(slug);
      if (!character || !conversation) return null;

      return {
        id: slug,
        slug,
        name: character.name,
        headline:
          character.headline || "A professional character unlocked through your existing chats.",
        imageUrl: imageMap.get(slug) ?? character.image,
        href: `/photo-studio/built-in/${slug}`,
        source: "professional" as const,
        updatedAt: conversation.updated_at,
        photoCount: photoCounts.get(slug) ?? 0,
      };
    })
    .filter((item): item is StudioCard => item !== null);

  const allCards = [...customCards, ...builtInCards].sort((left, right) => {
    const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
    return rightTime - leftTime;
  });

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-[110rem] px-6 py-10">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(217,70,239,0.12),rgba(255,255,255,0.05),rgba(34,211,238,0.08))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.26)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-200">
                Photo Studio
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Select a character with an active conversation
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
                Only characters with a started chat appear here. Pick the one you want, then build a new photo by choosing an outfit, pose, and background while the same face and body stay locked.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/75">
                Studio routing
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                <p>Photo Studio now focuses on safe lifestyle and fashion image generation.</p>
                <p>Each shot is built from outfit, pose, and background selections.</p>
                <p>Adult Photos stay visible in the character studio as a disabled coming-soon area.</p>
                <p>Every saved image lands inside the same character archive in Collection.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                Started conversations only
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Studio-ready characters
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/60">
                Professional, community, and your own characters all appear here once a conversation exists on your account.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/chats"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
              >
                Open Chats
              </Link>
              <Link
                href="/collection"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
              >
                Open Collection
              </Link>
            </div>
          </div>

          {allCards.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {allCards.map((item) => (
                <StudioCharacterCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/60">
              Start a chat first. Once a conversation exists, that character appears here automatically for Photo Studio.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
