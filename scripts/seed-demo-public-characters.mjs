import { createClient } from "@supabase/supabase-js";

import { demoPublicCharacters } from "../data/demo-public-characters.mjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerUserId = process.env.DEMO_PUBLIC_CHARACTER_OWNER_ID;
const mode = String(process.env.DEMO_PUBLIC_CHARACTER_MODE || "upsert").trim().toLowerCase();

if (!supabaseUrl || !serviceRoleKey || !ownerUserId) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEMO_PUBLIC_CHARACTER_OWNER_ID.",
  );
  process.exit(1);
}

if (!["upsert", "skip"].includes(mode)) {
  console.error('DEMO_PUBLIC_CHARACTER_MODE must be either "upsert" or "skip".');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function serializeJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildInsertPayload(character) {
  const now = new Date().toISOString();

  return {
    user_id: ownerUserId,
    slug: clean(character.slug),
    name: clean(character.name),
    archetype: clean(character.archetype) || "custom",
    headline: clean(character.headline),
    description: clean(character.description),
    greeting: clean(character.greeting),
    preview_message: clean(character.preview_message),
    backstory: clean(character.backstory),
    tags: Array.isArray(character.tags) ? character.tags : [],
    trait_badges: serializeJson(character.trait_badges ?? []),
    scenario: serializeJson(character.scenario ?? {}),
    metadata: serializeJson({
      ...(character.metadata ?? {}),
      source: "lovora-demo-seed",
      createdBy: "lovora-seed",
      updatedAt: now,
    }),
    payload: serializeJson(character.payload ?? {}),
    primary_image_url: null,
    image_status: "none",
    image_visibility: "private",
    image_prompt_version: 1,
    image_last_generated_at: null,
    image_generation_enabled: false,
    style_type: "realistic",
    consistency_status: "draft",
    builder_mode: "preset",
    prompt_version: "demo-public-v1",
  };
}

async function findExistingCharacter(slug) {
  const { data, error } = await supabase
    .from("custom_characters")
    .select("id, slug")
    .eq("user_id", ownerUserId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function upsertCharacter(character) {
  const slug = clean(character.slug);
  if (!slug) {
    return { status: "skipped", reason: "missing slug" };
  }

  const existing = await findExistingCharacter(slug);
  const payload = buildInsertPayload(character);

  if (!existing) {
    const { error } = await supabase.from("custom_characters").insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    return { status: "created" };
  }

  if (mode === "skip") {
    return { status: "skipped", reason: "already exists" };
  }

  const { error } = await supabase
    .from("custom_characters")
    .update({
      ...payload,
      user_id: ownerUserId,
    })
    .eq("id", existing.id)
    .eq("user_id", ownerUserId);

  if (error) {
    throw new Error(error.message);
  }

  return { status: "updated" };
}

async function main() {
  console.log(
    `Seeding ${demoPublicCharacters.length} public demo characters for owner ${ownerUserId} in ${mode} mode...`,
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const character of demoPublicCharacters) {
    try {
      const result = await upsertCharacter(character);

      if (result.status === "created") created += 1;
      if (result.status === "updated") updated += 1;
      if (result.status === "skipped") skipped += 1;

      console.log(
        `[${clean(character.slug)}] ${result.status}${result.reason ? ` (${result.reason})` : ""}`,
      );
    } catch (error) {
      console.error(
        `[${clean(character.slug)}] failed`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log(`Done. created=${created} updated=${updated} skipped=${skipped}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
