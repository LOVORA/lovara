"use client";

import { useEffect, useState } from "react";
import CharacterListCard from "@/components/characters/character-list-card";
import type { CharacterListCardView } from "@/lib/character-builder/list-item-mappers";

type CharacterListGridProps = {
  items: CharacterListCardView[];
  emptyTitle?: string;
  emptyDescription?: string;
  ctaLabel?: string;
  hrefBase?: string;
  showAccountActions?: boolean;
};

export default function CharacterListGrid({
  items,
  emptyTitle = "No characters yet",
  emptyDescription = "Characters you create will appear here.",
  ctaLabel = "Open",
  hrefBase,
  showAccountActions = false,
}: CharacterListGridProps) {
  const [visibleItems, setVisibleItems] = useState(items);

  useEffect(() => {
    setVisibleItems(items);
  }, [items]);

  if (visibleItems.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
        <h2 className="text-xl font-semibold text-white">{emptyTitle}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {visibleItems.map((item) => (
        <CharacterListCard
          key={item.id}
          item={item}
          ctaLabel={ctaLabel}
          href={hrefBase ? `${hrefBase}/${item.slug}` : undefined}
          showAccountActions={showAccountActions}
          onDeleteSuccess={(characterId) =>
            setVisibleItems((current) =>
              current.filter((currentItem) => currentItem.deleteCharacterId !== characterId),
            )
          }
        />
      ))}
    </div>
  );
}
