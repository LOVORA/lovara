import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

import type { Database, Json } from "@/types/supabase";
import { generateScenarioOpeningPack } from "@/lib/chat/scenario-generation";

export const runtime = "nodejs";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

type CharacterScenario = {
  setting?: string;
  relationshipToUser?: string;
  sceneGoal?: string;
  tone?: string;
  openingState?: string;
};

type CharacterDraftInput = {
  name: string;
  archetype: string;
  headline: string;
  description: string;
  greeting: string;
  previewMessage: string;
  backstory: string;
  tags: string[];
  traitBadges: Array<{ label: string; tone?: string }>;
  scenario: CharacterScenario;
  payload?: Record<string, unknown>;
};

type CustomCharacterRow = Database["public"]["Tables"]["custom_characters"]["Row"] & {
  style_type?: "realistic" | "anime" | null;
  primary_image_url?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

function cleanOptional(value?: string | null): string | undefined {
  const trimmed = clean(value);
  return trimmed ? trimmed : undefined;
}

function slugify(value?: string | null): string {
  return (value ?? "")
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => clean(tag))
        .filter(Boolean)
        .slice(0, 16),
    ),
  );
}

function normalizeScenario(scenario?: CharacterScenario): CharacterScenario {
  return {
    setting: cleanOptional(scenario?.setting),
    relationshipToUser: cleanOptional(scenario?.relationshipToUser),
    sceneGoal: cleanOptional(scenario?.sceneGoal),
    tone: cleanOptional(scenario?.tone),
    openingState: cleanOptional(scenario?.openingState),
  };
}

function toJson(value: unknown): Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJson(item));
  }

  if (isRecord(value)) {
    const result: { [key: string]: Json } = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = toJson(nestedValue);
    }
    return result;
  }

  return String(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toScenario(value: Json | null | undefined): CharacterScenario {
  if (!isRecord(value)) {
    return {};
  }

  return {
    setting: typeof value.setting === "string" ? value.setting : undefined,
    relationshipToUser:
      typeof value.relationshipToUser === "string"
        ? value.relationshipToUser
        : undefined,
    sceneGoal: typeof value.sceneGoal === "string" ? value.sceneGoal : undefined,
    tone: typeof value.tone === "string" ? value.tone : undefined,
    openingState:
      typeof value.openingState === "string" ? value.openingState : undefined,
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? clean(item) : ""))
    .filter(Boolean);
}

function toTraitBadges(
  value: Json | null | undefined,
): Array<{ label: string; tone?: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const tone = typeof item.tone === "string" ? item.tone.trim() : undefined;
      if (!label) return null;
      return tone ? { label, tone } : { label };
    })
    .filter((item): item is { label: string; tone?: string } => item !== null);
}

function mapCharacterRow(row: CustomCharacterRow) {
  return {
    id: row.id,
    user_id: row.user_id,
    slug: row.slug,
    name: row.name,
    archetype: row.archetype,
    headline: row.headline,
    description: row.description,
    greeting: row.greeting,
    preview_message: row.preview_message,
    backstory: row.backstory,
    tags: Array.isArray(row.tags) ? row.tags : [],
    trait_badges: toTraitBadges(row.trait_badges),
    scenario: toScenario(row.scenario),
    metadata: toRecord(row.metadata),
    payload: toRecord(row.payload),
    style_type:
      row.style_type === "realistic" || row.style_type === "anime"
        ? row.style_type
        : null,
    primary_image_url:
      typeof row.primary_image_url === "string" ? row.primary_image_url : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function makeUniqueSlug(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
  baseValue: string,
) {
  const baseSlug = slugify(baseValue) || "custom-character";

  const { data, error } = await supabase
    .from("custom_characters")
    .select("slug")
    .eq("user_id", userId)
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    throw new Error(error.message);
  }

  const existing = new Set((data ?? []).map((row) => row.slug));

  if (!existing.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (existing.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}

function parseDraft(value: unknown): CharacterDraftInput | null {
  if (!isRecord(value)) return null;

  return {
    name: typeof value.name === "string" ? value.name : "",
    archetype: typeof value.archetype === "string" ? value.archetype : "",
    headline: typeof value.headline === "string" ? value.headline : "",
    description: typeof value.description === "string" ? value.description : "",
    greeting: typeof value.greeting === "string" ? value.greeting : "",
    previewMessage:
      typeof value.previewMessage === "string" ? value.previewMessage : "",
    backstory: typeof value.backstory === "string" ? value.backstory : "",
    tags: Array.isArray(value.tags)
      ? value.tags.filter((item): item is string => typeof item === "string")
      : [],
    traitBadges: Array.isArray(value.traitBadges)
      ? value.traitBadges.filter(
          (item): item is { label: string; tone?: string } =>
            isRecord(item) && typeof item.label === "string",
        )
      : [],
    scenario: isRecord(value.scenario) ? (value.scenario as CharacterScenario) : {},
    payload: isRecord(value.payload) ? (value.payload as Record<string, unknown>) : {},
  };
}

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const draft = parseDraft(raw?.draft);
    const imageUrl = typeof raw?.imageUrl === "string" ? raw.imageUrl.trim() : "";

    if (!draft || !clean(draft.name) || !imageUrl) {
      return NextResponse.json(
        { ok: false, error: "Draft and preview image URL are required." },
        { status: 400 },
      );
    }

    const pendingCookies: PendingCookie[] = [];

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            pendingCookies.push({ name, value, options });
          },
          remove(name: string, options: CookieOptions) {
            pendingCookies.push({ name, value: "", options });
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const slug = await makeUniqueSlug(supabase, user.id, draft.name);
    const styleType =
      isRecord(draft.payload) && draft.payload.styleType === "anime"
        ? "anime"
        : "realistic";
    const now = new Date().toISOString();
    const payloadRecord = isRecord(draft.payload) ? draft.payload : {};
    const payloadScenario = toRecord(payloadRecord.openingPack);
    const identity = toRecord(payloadRecord.identity);
    const builderInput = toRecord(payloadRecord.builderInput);
    const metadata = toRecord(payloadRecord.metadata);
    const sceneProfile = toRecord(metadata.sceneProfile);

    let generatedOpening = {
      scenarioSummary:
        typeof payloadRecord.scenarioSummary === "string"
          ? clean(payloadRecord.scenarioSummary)
          : "",
      openingBeat:
        typeof payloadScenario.openingBeat === "string"
          ? clean(payloadScenario.openingBeat)
          : "",
      greeting: clean(draft.greeting),
      previewMessage: clean(draft.previewMessage),
      sceneAnchors: [] as string[],
      memorySeeds: [] as string[],
    };

    const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();

    if (openRouterApiKey) {
      try {
        generatedOpening = await generateScenarioOpeningPack({
          apiKey: openRouterApiKey,
          characterName: clean(draft.name),
          archetype: clean(draft.archetype),
          description: clean(draft.description),
          backstory: clean(draft.backstory),
          setting:
            draft.scenario.setting ??
            (typeof sceneProfile.setting === "string" ? sceneProfile.setting : undefined),
          relationshipToUser: draft.scenario.relationshipToUser,
          sceneGoal: draft.scenario.sceneGoal,
          tone: draft.scenario.tone,
          openingState: draft.scenario.openingState,
          customScenario:
            typeof payloadRecord.customScenario === "string"
              ? payloadRecord.customScenario
              : undefined,
          userRole:
            typeof builderInput.userRole === "string"
              ? builderInput.userRole
              : undefined,
          tags: draft.tags,
          identityHints: [
            typeof identity.age === "string" ? identity.age : "",
            typeof identity.region === "string" ? identity.region : "",
            typeof identity.genderPresentation === "string"
              ? identity.genderPresentation
              : "",
          ],
          recognitionHints: [
            draft.scenario.relationshipToUser ?? "",
            typeof builderInput.relationshipDynamic === "string"
              ? builderInput.relationshipDynamic
              : "",
            typeof builderInput.replyObjective === "string"
              ? builderInput.replyObjective
              : "",
          ],
          visualHints: toStringArray(toRecord(metadata.visualProfile).highlights),
          existingGreeting: draft.greeting,
          existingPreviewMessage: draft.previewMessage,
        });
      } catch {
        // Keep the local composer output as the safe fallback.
      }
    }

    const openingPackPayload = {
      ...payloadScenario,
      openingSummary: generatedOpening.scenarioSummary,
      openingBeat: generatedOpening.openingBeat,
      greeting: generatedOpening.greeting,
      previewMessage: generatedOpening.previewMessage,
      sceneAnchors: generatedOpening.sceneAnchors,
      memorySeeds: generatedOpening.memorySeeds,
    };

    const mergedPayload = {
      ...payloadRecord,
      scenarioSummary: generatedOpening.scenarioSummary,
      openingPack: openingPackPayload,
      grokScenarioPack: {
        ...openingPackPayload,
        generatedAt: now,
        source: "openrouter-grok",
      },
    };

    const insertPayload: Database["public"]["Tables"]["custom_characters"]["Insert"] = {
      user_id: user.id,
      slug,
      name: clean(draft.name),
      archetype: clean(draft.archetype) || "custom",
      headline: clean(draft.headline),
      description: clean(draft.description),
      greeting: generatedOpening.greeting,
      preview_message: generatedOpening.previewMessage,
      backstory: clean(draft.backstory),
      tags: normalizeTags(draft.tags),
      trait_badges: toJson(draft.traitBadges.slice(0, 8)),
      scenario: toJson(normalizeScenario(draft.scenario)),
      metadata: toJson({
        source: "supabase",
        version: 1,
        createdBy: "lovora-web",
        updatedAt: now,
      }),
      payload: toJson(mergedPayload),
      style_type: styleType,
      primary_image_url: imageUrl,
      image_status: "ready",
      image_visibility: "private",
      image_prompt_version: 1,
      image_last_generated_at: now,
      image_generation_enabled: true,
      consistency_status: "ready",
      builder_mode: "preset",
    };

    const { data: createdRow, error: insertError } = await supabase
      .from("custom_characters")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !createdRow) {
      return NextResponse.json(
        { ok: false, error: insertError?.message || "Could not create character." },
        { status: 500 },
      );
    }

    const createdCharacter = createdRow as CustomCharacterRow;

    const { data: verifiedRow, error: verifyError } = await supabase
      .from("custom_characters")
      .select("*")
      .eq("id", createdCharacter.id)
      .eq("user_id", user.id)
      .single();

    if (verifyError || !verifiedRow) {
      await supabase
        .from("custom_characters")
        .delete()
        .eq("id", createdCharacter.id)
        .eq("user_id", user.id);
      return NextResponse.json(
        {
          ok: false,
          error: "Could not verify the new character after creation.",
        },
        { status: 500 },
      );
    }

    const verifiedCharacter = verifiedRow as CustomCharacterRow;

    revalidatePath("/my-characters");
    revalidatePath(`/chat/custom/${verifiedCharacter.slug}`);

    const response = NextResponse.json({
      ok: true,
      character: mapCharacterRow(verifiedCharacter),
    });

    for (const cookie of pendingCookies) {
      response.cookies.set({
        name: cookie.name,
        value: cookie.value,
        ...cookie.options,
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not finalize character creation.",
      },
      { status: 500 },
    );
  }
}
