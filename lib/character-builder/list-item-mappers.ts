import {
  presentCharacterCard,
  type CharacterLike,
} from "@/lib/character-builder/presenters";
import {
  getLegacyCharacterState,
} from "@/lib/legacy-character-state";

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
  styleType?: string | null;
  exposeLegacyState?: boolean;
  ageLabel?: string | null;
  originLabel?: string | null;
  storySummary?: string | null;
  source?: "custom" | "community" | "professional";
  chatHref?: string | null;
};

export type CharacterListCardView = {
  id: string;
  slug: string;
  name: string;
  ageLabel: string;
  originLabel: string;
  storySummary: string;
  imageUrl: string | null;
  source: "custom" | "community" | "professional";
  chatHref: string;
  isLegacyAnime: boolean;
  deleteCharacterId: string;
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function readPayloadIdentityField(payload: unknown, key: string): string {
  if (!payload || typeof payload !== "object") return "";
  const identity =
    "identity" in payload &&
    payload.identity &&
    typeof payload.identity === "object"
      ? (payload.identity as Record<string, unknown>)
      : null;

  const value = identity?.[key];
  return typeof value === "string" ? value.trim() : "";
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
  const legacyState = getLegacyCharacterState({
    styleType: item.styleType,
    payload: item.payload,
  });

  const isLegacyAnime = item.exposeLegacyState ? legacyState.isLegacyAnime : false;
  const ageLabel = item.ageLabel ?? readPayloadIdentityField(item.payload, "age");
  const originLabel =
    item.originLabel ??
    (readPayloadIdentityField(item.payload, "region") ||
      readPayloadIdentityField(item.payload, "origin"));
  const storySummary =
    item.storySummary ??
    (presented.teaser ||
      safeString(item.description) ||
      safeString(item.headline));

  return {
    id: item.id,
    slug: item.slug,
    name: presented.title || item.name,
    ageLabel,
    originLabel,
    storySummary,
    imageUrl: item.primaryImageUrl ?? null,
    source: item.source ?? "custom",
    chatHref:
      item.chatHref ??
      ((item.source ?? "custom") === "professional"
        ? `/chat/${item.slug}`
        : `/chat/custom/${item.slug}`),
    isLegacyAnime,
    deleteCharacterId: item.id,
  };
}

export function mapCharacterListItemsToCardViews(
  items: BaseCharacterListItem[],
): CharacterListCardView[] {
  return items.map(mapCharacterListItemToCardView);
}
