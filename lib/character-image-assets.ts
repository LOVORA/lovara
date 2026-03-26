import { CHARACTER_IMAGES_BUCKET } from "@/lib/image-storage";

type CharacterImageAssetLike = {
  id?: string | null;
  character_id?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
  is_primary?: boolean | null;
  image_type?: string | null;
  variant_kind?: string | null;
  created_at?: string | null;
};

type StorageCapableClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{
        data?: { signedUrl?: string | null } | null;
        error?: unknown;
      }>;
    };
  };
};

export type ResolvedCharacterImageAsset<T extends CharacterImageAssetLike> = T & {
  resolvedUrl: string | null;
};

export type CharacterImageUrlSigner = (
  bucket: string,
  storagePath: string,
) => Promise<string | null>;

function scoreCharacterImage(row: CharacterImageAssetLike) {
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

export function createSupabaseStorageSigner(
  client: StorageCapableClient,
  expiresInSeconds = 60 * 60,
): CharacterImageUrlSigner {
  return async (bucket: string, storagePath: string) => {
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
      return null;
    }

    return data?.signedUrl ?? null;
  };
}

export function pickBestCharacterImageAsset<T extends CharacterImageAssetLike>(
  rows: T[],
): T | null {
  let bestRow: T | null = null;

  for (const row of rows) {
    if (!row.public_url && !row.storage_path) continue;

    if (!bestRow || scoreCharacterImage(row) > scoreCharacterImage(bestRow)) {
      bestRow = row;
    }
  }

  return bestRow;
}

async function resolveAssetUrl<T extends CharacterImageAssetLike>(
  row: T,
  signUrl?: CharacterImageUrlSigner,
): Promise<ResolvedCharacterImageAsset<T>> {
  if (row.public_url) {
    return {
      ...row,
      resolvedUrl: row.public_url,
    };
  }

  if (!row.storage_path || !signUrl) {
    return {
      ...row,
      resolvedUrl: null,
    };
  }

  const signedUrl = await signUrl(
    row.storage_bucket || CHARACTER_IMAGES_BUCKET,
    row.storage_path,
  );

  return {
    ...row,
    resolvedUrl: signedUrl,
  };
}

export async function resolveCharacterPrimaryImage<T extends CharacterImageAssetLike>(args: {
  rows: T[];
  signUrl?: CharacterImageUrlSigner;
  fallbackUrl?: string | null;
}): Promise<ResolvedCharacterImageAsset<T> | null> {
  const bestRow = pickBestCharacterImageAsset(args.rows);

  if (!bestRow) {
    return args.fallbackUrl
      ? ({
          resolvedUrl: args.fallbackUrl,
        } as ResolvedCharacterImageAsset<T>)
      : null;
  }

  const resolved = await resolveAssetUrl(bestRow, args.signUrl);

  if (resolved.resolvedUrl) {
    return resolved;
  }

  if (args.fallbackUrl) {
    return {
      ...resolved,
      resolvedUrl: args.fallbackUrl,
    };
  }

  return resolved;
}

export async function resolveCharacterGalleryImages<T extends CharacterImageAssetLike>(args: {
  rows: T[];
  signUrl?: CharacterImageUrlSigner;
}) {
  const filteredRows = args.rows.filter(
    (row) => Boolean(row.public_url) || Boolean(row.storage_path),
  );

  return Promise.all(
    filteredRows.map((row) => resolveAssetUrl(row, args.signUrl)),
  );
}

export async function resolveCharacterImageMap<T extends CharacterImageAssetLike>(args: {
  rows: T[];
  signUrl?: CharacterImageUrlSigner;
  fallbackByCharacterId?: Map<string, string | null>;
}) {
  const grouped = new Map<string, T[]>();

  for (const row of args.rows) {
    if (!row.character_id) continue;

    const current = grouped.get(row.character_id) ?? [];
    current.push(row);
    grouped.set(row.character_id, current);
  }

  const result = new Map<string, string>();

  for (const [characterId, characterRows] of grouped.entries()) {
    const resolved = await resolveCharacterPrimaryImage({
      rows: characterRows,
      signUrl: args.signUrl,
      fallbackUrl: args.fallbackByCharacterId?.get(characterId) ?? null,
    });

    if (resolved?.resolvedUrl) {
      result.set(characterId, resolved.resolvedUrl);
    }
  }

  if (args.fallbackByCharacterId) {
    for (const [characterId, fallbackUrl] of args.fallbackByCharacterId.entries()) {
      if (!result.has(characterId) && fallbackUrl) {
        result.set(characterId, fallbackUrl);
      }
    }
  }

  return result;
}
