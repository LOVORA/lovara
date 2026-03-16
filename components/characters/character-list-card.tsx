"use client";

import Link from "next/link";
import { type CharacterListCardView } from "@/lib/character-builder/list-item-mappers";

type CharacterListCardProps = {
  item: CharacterListCardView;
  ctaLabel?: string;
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
}: CharacterListCardProps) {
  const targetHref = `/chat/custom/${item.slug}`;
  const updatedLabel = formatUpdatedAt(item.updatedAt);

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02]">
      <div className="relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="flex h-64 w-full items-center justify-center bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
            <div className="text-center">
              <div className="text-lg font-medium text-white/85">
                {item.title}
              </div>
              <div className="mt-2 text-sm text-white/45">
                No preview image yet
              </div>
            </div>
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
            {item.visibility}
          </span>

          {item.isBuilderV2 ? (
            <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100 backdrop-blur">
              Builder V2
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white">
              {item.title}
            </h3>
            {item.subtitle ? (
              <p className="mt-2 text-sm text-white/60">{item.subtitle}</p>
            ) : null}
          </div>

          {item.imageStatus && item.imageStatus !== "none" ? (
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-100">
              {item.imageStatus}
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

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="text-xs text-white/40">
            {updatedLabel ? `Updated ${updatedLabel}` : ""}
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
