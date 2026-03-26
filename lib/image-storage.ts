export const CHARACTER_IMAGES_BUCKET =
  process.env.NEXT_PUBLIC_CHARACTER_IMAGES_BUCKET || "character-images";

export type CharacterImagePreviewRow = {
  character_id: string | null;
  public_url: string | null;
  is_primary?: boolean | null;
  image_type?: string | null;
  created_at?: string | null;
};

function scoreCharacterImage(row: CharacterImagePreviewRow) {
  const primaryScore = row.is_primary ? 1000 : 0;
  const typeScore =
    row.image_type === "avatar"
      ? 400
      : row.image_type === "reference"
        ? 300
        : row.image_type === "gallery"
          ? 200
          : row.image_type === "variation"
            ? 150
            : 0;
  const timestamp = row.created_at ? new Date(row.created_at).getTime() : 0;

  return primaryScore + typeScore + timestamp;
}

export function pickBestCharacterImageUrl(
  rows: CharacterImagePreviewRow[],
): string | null {
  let bestRow: CharacterImagePreviewRow | null = null;

  for (const row of rows) {
    if (!row.public_url) continue;

    if (!bestRow || scoreCharacterImage(row) > scoreCharacterImage(bestRow)) {
      bestRow = row;
    }
  }

  return bestRow?.public_url ?? null;
}

export function buildCharacterImageMap(
  rows: CharacterImagePreviewRow[],
): Map<string, string> {
  const grouped = new Map<string, CharacterImagePreviewRow[]>();

  for (const row of rows) {
    if (!row.character_id) continue;

    const current = grouped.get(row.character_id) ?? [];
    current.push(row);
    grouped.set(row.character_id, current);
  }

  const result = new Map<string, string>();

  for (const [characterId, characterRows] of grouped.entries()) {
    const imageUrl = pickBestCharacterImageUrl(characterRows);
    if (imageUrl) {
      result.set(characterId, imageUrl);
    }
  }

  return result;
}
