import {
  presentCharacterCard,
  presentCharacterHeadline,
  presentCharacterPublicTeaser,
  presentCharacterVisualBadges,
  type CharacterLike,
} from "@/lib/character-builder/presenters";

export type BaseCharacterListItem = {
  id: string;
  slug: string;
  name: string;
  headline?: string | null;
  description?: string | null;
  tags?: string[] | null;
  payload?: unknown;
  primaryImageUrl?: string | null;
  imageStatus?: string | null;
  visibility?: string | null;
  updatedAt?: string | null;
};

export type CharacterListCardView = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  teaser: string;
  tags: string[];
  visualBadges: string[];
  imageUrl: string | null;
  isBuilderV2: boolean;
  imageStatus: string;
  visibility: string;
  updatedAt: string | null;
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function mapCharacterListItemToCardView(
  item: BaseCharacterListItem,
): CharacterListCardView {
  const characterLike: CharacterLike = {
    id: item.id,
    slug: item.slug,
    name: item.name,
    headline: item.headline ?? "",
    description: item.description ?? "",
    tags: safeStringArray(item.tags ?? []),
    payload: item.payload,
  };

  const presented = presentCharacterCard(characterLike);
  const visualBadges = presentCharacterVisualBadges(characterLike);

  return {
    id: item.id,
    slug: item.slug,
    title: presented.title || item.name,
    subtitle:
      presented.subtitle ||
      presentCharacterHeadline(characterLike) ||
      safeString(item.headline),
    teaser:
      presented.teaser ||
      presentCharacterPublicTeaser(characterLike) ||
      safeString(item.description),
    tags: presented.tags,
    visualBadges,
    imageUrl: item.primaryImageUrl ?? null,
    isBuilderV2: presented.isBuilderV2,
    imageStatus: item.imageStatus ?? "none",
    visibility: item.visibility ?? "private",
    updatedAt: item.updatedAt ?? null,
  };
}

export function mapCharacterListItemsToCardViews(
  items: BaseCharacterListItem[],
): CharacterListCardView[] {
  return items.map(mapCharacterListItemToCardView);
}
