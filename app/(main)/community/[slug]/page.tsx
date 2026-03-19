import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  presentCharacterCard,
  presentCharacterDebug,
  presentCharacterVisualBadges,
} from "@/lib/character-builder/presenters";
import { createClient } from "@/lib/supabase/server";

type RawCharacterDetailRow = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  description: string | null;
  greeting: string | null;
  preview_message: string | null;
  backstory: string | null;
  tags: string[] | null;
  payload: Record<string, unknown> | null;
  updated_at: string | null;
};

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isPublicCharacter(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;
  return payload.visibility === "public";
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CommunityCharacterDetailPage({ params }: PageProps) {
  const { slug } = await params;
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
        greeting,
        preview_message,
        backstory,
        tags,
        payload,
        updated_at
      `,
    )
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as RawCharacterDetailRow | null;

  if (!row || !isPublicCharacter(row.payload)) {
    notFound();
  }

  const { data: imageRows } = await supabase
    .from("character_images")
    .select("public_url, created_at")
    .eq("character_id", row.id)
    .eq("is_primary", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const primaryImageUrl =
    Array.isArray(imageRows) &&
    imageRows[0] &&
    typeof imageRows[0].public_url === "string" &&
    imageRows[0].public_url
      ? imageRows[0].public_url
      : null;

  const payload =
    typeof row.payload === "object" && row.payload ? row.payload : {};
  const metadata =
    typeof payload.metadata === "object" && payload.metadata
      ? (payload.metadata as Record<string, unknown>)
      : {};
  const sceneProfile =
    typeof metadata.sceneProfile === "object" && metadata.sceneProfile
      ? (metadata.sceneProfile as Record<string, unknown>)
      : {};
  const openingPack =
    typeof payload.openingPack === "object" && payload.openingPack
      ? (payload.openingPack as Record<string, unknown>)
      : {};
  const openingSummary =
    typeof openingPack.openingSummary === "string"
      ? clean(openingPack.openingSummary)
      : undefined;
  const openingBeat =
    typeof openingPack.openingBeat === "string"
      ? clean(openingPack.openingBeat)
      : undefined;
  const openingScene = [
    clean((row.payload?.scenarioSummary as string | undefined) ?? ""),
    clean(row.preview_message),
  ].filter(Boolean);
  const scenarioItems = [
    clean(typeof sceneProfile.setting === "string" ? sceneProfile.setting : ""),
    clean(
      typeof sceneProfile.relationship === "string"
        ? sceneProfile.relationship
        : "",
    ),
    clean(typeof sceneProfile.objective === "string" ? sceneProfile.objective : ""),
    clean(typeof sceneProfile.tone === "string" ? sceneProfile.tone : ""),
  ].filter(Boolean);

  const presented = presentCharacterCard({
    id: row.id,
    slug: row.slug,
    name: row.name,
    headline: row.headline ?? "",
    description: row.description ?? "",
    tags: row.tags ?? [],
    payload: row.payload,
  });

  const visualBadges = presentCharacterVisualBadges({
    id: row.id,
    slug: row.slug,
    name: row.name,
    headline: row.headline ?? "",
    description: row.description ?? "",
    tags: row.tags ?? [],
    payload: row.payload,
  });

  const debug = presentCharacterDebug({
    id: row.id,
    slug: row.slug,
    name: row.name,
    headline: row.headline ?? "",
    description: row.description ?? "",
    tags: row.tags ?? [],
    payload: row.payload,
  });

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <section className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(255,255,255,0.05),rgba(16,185,129,0.08))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100">
                <span>Community Character</span>
                {presented.isBuilderV2 ? (
                  <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] tracking-[0.18em] text-fuchsia-100">
                    Studio build
                  </span>
                ) : null}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                {presented.title}
              </h1>
              {presented.subtitle ? (
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62 md:text-base">
                  {presented.subtitle}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/community"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
              >
                Back to Community
              </Link>
              <Link
                href={`/chat/custom/${row.slug}`}
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
              >
                Start Chat
              </Link>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Visibility</div>
              <div className="mt-2 text-sm leading-7 text-white/78">Shared by community</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Best use</div>
              <div className="mt-2 text-sm leading-7 text-white/78">Explore first, then jump into chat if the vibe fits</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Card style</div>
              <div className="mt-2 text-sm leading-7 text-white/78">User-created and publicly visible</div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
              <div className="relative h-[520px] w-full">
                {primaryImageUrl ? (
                  <Image
                    src={primaryImageUrl}
                    alt={presented.title}
                    fill
                    unoptimized
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/20 via-slate-900 to-emerald-500/20">
                    <div className="text-center">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-black/30 text-2xl font-semibold text-white/88">
                        {presented.title.slice(0, 1)}
                      </div>
                      <div className="mt-4 text-sm text-white/62">
                        Avatar on the way
                      </div>
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.82),transparent_48%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
                <div className="absolute left-6 top-6 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                    Community
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
                    Public card
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="rounded-[28px] border border-white/10 bg-black/38 p-5 backdrop-blur-xl">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                      Community spotlight
                    </div>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                      {presented.title}
                    </h2>
                    {presented.teaser ? (
                      <p className="mt-3 text-sm leading-7 text-white/72">
                        {presented.teaser}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  Opening summary
                </div>
                <div className="mt-2 text-sm leading-7 text-white/78">
                  {openingSummary || "No saved opening summary."}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  Scene pulse
                </div>
                <div className="mt-2 text-sm leading-7 text-white/78">
                  {openingBeat || row.greeting || "No opening beat saved."}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  Chat hook
                </div>
                <div className="mt-2 text-sm leading-7 text-white/78">
                  {row.greeting || row.preview_message || "No hook saved."}
                </div>
              </div>
            </div>

            {visualBadges.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Visual profile</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {visualBadges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-100"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {row.description ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Description</h2>
                <p className="mt-4 text-sm leading-8 text-white/72 md:text-base">
                  {row.description}
                </p>
              </div>
            ) : null}

            {row.greeting ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Greeting</h2>
                <p className="mt-4 text-sm leading-8 text-white/72 md:text-base">
                  {row.greeting}
                </p>
              </div>
            ) : null}
          </section>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
              <h2 className="text-xl font-semibold text-white">Quick read</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Community vibe</div>
                  <div className="mt-2 text-sm leading-7 text-white/72">
                    {presented.subtitle || "A public custom character shared by the community."}
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Prompt summary</div>
                  <div className="mt-2 text-sm leading-7 text-white/72">
                    {debug.promptSummary || "No builder-v2 prompt summary available."}
                  </div>
                </div>
              </div>
            </div>

            {openingScene.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Scene at a glance</h2>
                <div className="mt-4 space-y-3">
                  {openingScene.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/72"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {scenarioItems.length > 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">Scenario cues</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {scenarioItems.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-fuchsia-400/15 bg-fuchsia-400/10 px-3 py-1 text-sm text-fuchsia-100"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Actions</h2>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href={`/chat/custom/${row.slug}`}
                  className="rounded-full bg-white px-5 py-3 text-center text-sm font-medium text-black transition hover:opacity-90"
                >
                  Start chatting
                </Link>
                <Link
                  href="/community"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Browse more community characters
                </Link>
                <Link
                  href="/characters"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  View professional collection
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
