import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.NEXT_PUBLIC_CHARACTER_IMAGES_BUCKET || "character-images";

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for character image backfill.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function sanitizeExtension(extension) {
  const normalized = String(extension || "")
    .trim()
    .toLowerCase()
    .replace(/^\./, "");

  if (normalized === "jpeg") return "jpg";
  if (["png", "jpg", "webp"].includes(normalized)) return normalized;
  return "png";
}

function extensionFromMimeType(mimeType) {
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

function extensionFromUrl(sourceUrl) {
  try {
    const { pathname } = new URL(sourceUrl);
    const filename = pathname.split("/").pop() || "";
    const dotIndex = filename.lastIndexOf(".");
    return dotIndex === -1 ? null : filename.slice(dotIndex + 1);
  } catch {
    return null;
  }
}

function mimeTypeFromExtension(extension) {
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

async function persistRow(row) {
  if (!row.character_id || !row.public_url) {
    return { status: "skipped", reason: "missing character_id or public_url" };
  }

  const response = await fetch(row.public_url);
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const contentTypeHeader = response.headers.get("content-type");
  const contentType = contentTypeHeader
    ? contentTypeHeader.split(";")[0]?.trim().toLowerCase() || null
    : null;
  const extension = sanitizeExtension(
    extensionFromMimeType(contentType) ?? extensionFromUrl(row.public_url),
  );
  const mimeType = contentType ?? mimeTypeFromExtension(extension);
  const fileBuffer = new Uint8Array(await response.arrayBuffer());
  const storagePath = `characters/${row.character_id}/${row.id}.${extension}`;

  const uploadResult = await supabase.storage.from(bucket).upload(storagePath, fileBuffer, {
    upsert: true,
    contentType: mimeType,
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const publicUrlResult = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const finalPublicUrl = publicUrlResult.data.publicUrl ?? row.public_url;

  const { error: updateError } = await supabase
    .from("character_images")
    .update({
      storage_bucket: bucket,
      storage_path: storagePath,
      public_url: finalPublicUrl,
      mime_type: row.mime_type || mimeType,
      file_size_bytes:
        typeof row.file_size_bytes === "number"
          ? row.file_size_bytes
          : fileBuffer.byteLength,
    })
    .eq("id", row.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { status: "updated", storagePath };
}

async function main() {
  const limit = Number(process.env.BACKFILL_LIMIT || 250);
  const { data, error } = await supabase
    .from("character_images")
    .select("id, character_id, public_url, storage_path, mime_type, file_size_bytes")
    .is("storage_path", null)
    .not("public_url", "is", null)
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(data) ? data : [];
  console.log(`Found ${rows.length} character_images rows to backfill.`);

  for (const row of rows) {
    try {
      const result = await persistRow(row);
      console.log(`[${row.id}] ${result.status}`, result.storagePath || result.reason || "");
    } catch (error) {
      console.error(
        `[${row.id}] failed`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
