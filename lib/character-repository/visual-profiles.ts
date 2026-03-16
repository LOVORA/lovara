import { supabase } from "@/lib/supabase";
import type { CharacterVisualProfileInsert } from "../character-builder/types";

export type DbCharacterVisualProfile = {
  id: string;
  character_id: string;
  style_type: "realistic" | "anime" | null;
  age_band: "18-20" | "21-24" | "25-29" | "30-39" | "40+" | null;
  region: string | null;
  skin_tone: string | null;
  gender_presentation: string | null;

  eye_color: string | null;
  eye_shape: string | null;
  face_shape: string | null;
  lip_style: string | null;
  nose_type: string | null;
  makeup_level: string | null;

  hair_color: string | null;
  hair_length: string | null;
  hair_texture: string | null;
  hairstyle: string | null;

  body_type: string | null;
  bust_size: string | null;
  hips_type: string | null;
  height_impression: string | null;
  waist_definition: string | null;

  main_vibe: string | null;
  energy: string | null;
  persona_flavor: string | null;

  outfit_type: string | null;
  outfit_color: string | null;
  exposure_level: string | null;

  scene_type: string | null;
  camera_framing: string | null;
  lighting_type: string | null;
  pose_energy: string | null;
  expression: string | null;
  realism_strength: string | null;
  detail_level: string | null;
  variation_goal: string | null;

  created_at: string;
  updated_at: string;
};

export type UpsertCharacterVisualProfileInput = {
  characterId: string;
  profile: CharacterVisualProfileInsert;
};

function mapVisualProfileRow(
  row: Record<string, unknown>,
): DbCharacterVisualProfile {
  return {
    id: String(row.id ?? ""),
    character_id: String(row.character_id ?? ""),
    style_type:
      row.style_type === "realistic" || row.style_type === "anime"
        ? row.style_type
        : null,
    age_band:
      row.age_band === "18-20" ||
      row.age_band === "21-24" ||
      row.age_band === "25-29" ||
      row.age_band === "30-39" ||
      row.age_band === "40+"
        ? row.age_band
        : null,
    region: typeof row.region === "string" ? row.region : null,
    skin_tone: typeof row.skin_tone === "string" ? row.skin_tone : null,
    gender_presentation:
      typeof row.gender_presentation === "string"
        ? row.gender_presentation
        : null,

    eye_color: typeof row.eye_color === "string" ? row.eye_color : null,
    eye_shape: typeof row.eye_shape === "string" ? row.eye_shape : null,
    face_shape: typeof row.face_shape === "string" ? row.face_shape : null,
    lip_style: typeof row.lip_style === "string" ? row.lip_style : null,
    nose_type: typeof row.nose_type === "string" ? row.nose_type : null,
    makeup_level:
      typeof row.makeup_level === "string" ? row.makeup_level : null,

    hair_color: typeof row.hair_color === "string" ? row.hair_color : null,
    hair_length: typeof row.hair_length === "string" ? row.hair_length : null,
    hair_texture:
      typeof row.hair_texture === "string" ? row.hair_texture : null,
    hairstyle: typeof row.hairstyle === "string" ? row.hairstyle : null,

    body_type: typeof row.body_type === "string" ? row.body_type : null,
    bust_size: typeof row.bust_size === "string" ? row.bust_size : null,
    hips_type: typeof row.hips_type === "string" ? row.hips_type : null,
    height_impression:
      typeof row.height_impression === "string" ? row.height_impression : null,
    waist_definition:
      typeof row.waist_definition === "string" ? row.waist_definition : null,

    main_vibe: typeof row.main_vibe === "string" ? row.main_vibe : null,
    energy: typeof row.energy === "string" ? row.energy : null,
    persona_flavor:
      typeof row.persona_flavor === "string" ? row.persona_flavor : null,

    outfit_type: typeof row.outfit_type === "string" ? row.outfit_type : null,
    outfit_color:
      typeof row.outfit_color === "string" ? row.outfit_color : null,
    exposure_level:
      typeof row.exposure_level === "string" ? row.exposure_level : null,

    scene_type: typeof row.scene_type === "string" ? row.scene_type : null,
    camera_framing:
      typeof row.camera_framing === "string" ? row.camera_framing : null,
    lighting_type:
      typeof row.lighting_type === "string" ? row.lighting_type : null,
    pose_energy: typeof row.pose_energy === "string" ? row.pose_energy : null,
    expression: typeof row.expression === "string" ? row.expression : null,
    realism_strength:
      typeof row.realism_strength === "string" ? row.realism_strength : null,
    detail_level:
      typeof row.detail_level === "string" ? row.detail_level : null,
    variation_goal:
      typeof row.variation_goal === "string" ? row.variation_goal : null,

    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function buildUpsertPayload(input: UpsertCharacterVisualProfileInput) {
  return {
    character_id: input.characterId,
    style_type: input.profile.style_type,
    age_band: input.profile.age_band,
    region: input.profile.region,
    skin_tone: input.profile.skin_tone,
    gender_presentation: input.profile.gender_presentation,

    eye_color: input.profile.eye_color,
    eye_shape: input.profile.eye_shape,
    face_shape: input.profile.face_shape,
    lip_style: input.profile.lip_style,
    nose_type: input.profile.nose_type,
    makeup_level: input.profile.makeup_level,

    hair_color: input.profile.hair_color,
    hair_length: input.profile.hair_length,
    hair_texture: input.profile.hair_texture,
    hairstyle: input.profile.hairstyle,

    body_type: input.profile.body_type,
    bust_size: input.profile.bust_size,
    hips_type: input.profile.hips_type,
    height_impression: input.profile.height_impression,
    waist_definition: input.profile.waist_definition,

    main_vibe: input.profile.main_vibe,
    energy: input.profile.energy,
    persona_flavor: input.profile.persona_flavor,

    outfit_type: input.profile.outfit_type,
    outfit_color: input.profile.outfit_color,
    exposure_level: input.profile.exposure_level,

    scene_type: input.profile.scene_type,
    camera_framing: input.profile.camera_framing,
    lighting_type: input.profile.lighting_type,
    pose_energy: input.profile.pose_energy,
    expression: input.profile.expression,
    realism_strength: input.profile.realism_strength,
    detail_level: input.profile.detail_level,
    variation_goal: input.profile.variation_goal,
  };
}

export async function upsertCharacterVisualProfile(
  input: UpsertCharacterVisualProfileInput,
): Promise<DbCharacterVisualProfile> {
  const payload = buildUpsertPayload(input);

  const { data, error } = await supabase
    .from("character_visual_profiles")
    .upsert(payload as never, {
      onConflict: "character_id",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to upsert character visual profile.");
  }

  return mapVisualProfileRow(data as unknown as Record<string, unknown>);
}

export async function getCharacterVisualProfile(
  characterId: string,
): Promise<DbCharacterVisualProfile | null> {
  const { data, error } = await supabase
    .from("character_visual_profiles")
    .select("*")
    .eq("character_id", characterId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapVisualProfileRow(data as unknown as Record<string, unknown>);
}

export async function deleteCharacterVisualProfile(
  characterId: string,
): Promise<void> {
  const { error } = await supabase
    .from("character_visual_profiles")
    .delete()
    .eq("character_id", characterId);

  if (error) {
    throw error;
  }
}
