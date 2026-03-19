"use client";

import Image from "next/image";
import Link from "next/link";
import { type CharacterListCardView } from "@/lib/character-builder/list-item-mappers";

type CharacterListCardProps = {
  item: CharacterListCardView;
  ctaLabel?: string;
  href?: string;
};

function formatUpdatedAt(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear());

  return `${day}.${month}.${year}`;
}

export default function CharacterListCard({
  item,
  ctaLabel = "Open",
  href,
}: CharacterListCardProps) {
  const targetHref = href ?? `/chat/custom/${item.slug}`;
  const updatedLabel = formatUpdatedAt(item.updatedAt);
  const isPublic = item.visibility === "public";
  const surfaceLabel = isPublic ? "Shared character" : "Private character";
  const ownershipLabel = isPublic ? "Shared character" : "Locked character";

  return (
    <article className="group overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_20px_70px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1.5 hover:border-white/18 hover:shadow-[0_30px_100px_rgba(0,0,0,0.34)]">
      <div className="relative">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            width={1200}
            height={768}
            unoptimized
            className="h-72 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-72 w-full items-center justify-center bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-black/30 text-2xl font-semibold text-white/88">
                {item.title.slice(0, 1)}
              </div>
              <div className="mt-2 text-sm text-white/45">
                Avatar on the way
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.76),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.18),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.14),transparent_24%)] opacity-70" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
            {item.visibility}
          </span>

          {item.isBuilderV2 ? (
            <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100 backdrop-blur">
              Studio build
            </span>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="rounded-[26px] border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              {surfaceLabel}
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-white">
              {item.title}
            </div>
            {item.subtitle ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/68">
                {item.subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
              {ownershipLabel}
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
              {item.title}
            </h3>
          </div>

          {item.imageStatus && item.imageStatus !== "none" ? (
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-100">
              image ready
            </span>
          ) : null}
        </div>

        {item.teaser ? (
          <p className="mt-4 line-clamp-3 text-sm leading-7 text-white/70">
            {item.teaser}
          </p>
        ) : null}

        {item.visualBadges.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.visualBadges.slice(0, 6).map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        {item.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
          <div className="text-xs text-white/40">
            {updatedLabel ? `Created ${updatedLabel}` : isPublic ? "Shared by the community" : "Saved to your library"}
          </div>

          <Link
            href={targetHref}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
