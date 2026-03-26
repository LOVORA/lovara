import { CHARACTER_IMAGES_BUCKET } from "@/lib/image-storage";
import { createClient } from "@/lib/supabase/server";

export type PersistRemoteCharacterImageToBucketInput = {
  characterId: string;
  sourceUrl: string;
  fileId?: string | null;
  bucket?: string | null;
};

export type PersistedCharacterImageAsset = {
  storageBucket: string;
  storagePath: string;
  publicUrl: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
};

function getBucketName(bucket?: string | null) {
  return bucket?.trim() || CHARACTER_IMAGES_BUCKET;
}

function sanitizeExtension(extension: string | null | undefined) {
  const normalized = extension?.trim().toLowerCase().replace(/^\./, "") || "";

  if (normalized === "jpeg") return "jpg";
  if (["png", "jpg", "webp"].includes(normalized)) return normalized;
  return "png";
}

function extensionFromMimeType(mimeType: string | null) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

function mimeTypeFromExtension(extension: string) {
  switch (extension) {
    case "jpg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "png":
    default:
      return "image/png";
  }
}

function extensionFromUrl(sourceUrl: string) {
  try {
    const { pathname } = new URL(sourceUrl);
    const filename = pathname.split("/").pop() || "";
    const dotIndex = filename.lastIndexOf(".");

    if (dotIndex === -1) return null;
    return filename.slice(dotIndex + 1);
  } catch {
    return null;
  }
}

export function buildCharacterImageStoragePath(args: {
  characterId: string;
  fileId: string;
  extension: string;
}) {
  return `characters/${args.characterId}/${args.fileId}.${sanitizeExtension(args.extension)}`;
}

export async function persistRemoteCharacterImageToBucket(
  input: PersistRemoteCharacterImageToBucketInput,
): Promise<PersistedCharacterImageAsset> {
  const supabase = await createClient();
  const response = await fetch(input.sourceUrl);

  if (!response.ok) {
    throw new Error(
      `Could not download the generated image for storage (${response.status}).`,
    );
  }

  const contentTypeHeader = response.headers.get("content-type");
  const contentType = contentTypeHeader
    ? contentTypeHeader.split(";")[0]?.trim().toLowerCase() || null
    : null;
  const extension = sanitizeExtension(
    extensionFromMimeType(contentType) ?? extensionFromUrl(input.sourceUrl),
  );
  const mimeType = contentType ?? mimeTypeFromExtension(extension);
  const fileId = input.fileId?.trim() || crypto.randomUUID();
  const storageBucket = getBucketName(input.bucket);
  const storagePath = buildCharacterImageStoragePath({
    characterId: input.characterId,
    fileId,
    extension,
  });
  const fileBuffer = new Uint8Array(await response.arrayBuffer());

  const uploadResult = await supabase.storage
    .from(storageBucket)
    .upload(storagePath, fileBuffer, {
      upsert: true,
      contentType: mimeType,
    });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const publicUrlResult = supabase.storage
    .from(storageBucket)
    .getPublicUrl(storagePath);

  return {
    storageBucket,
    storagePath,
    publicUrl: publicUrlResult.data.publicUrl ?? null,
    mimeType,
    fileSizeBytes:
      typeof fileBuffer.byteLength === "number" ? fileBuffer.byteLength : null,
  };
}
