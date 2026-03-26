alter table if exists public.character_images
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists public_url text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists image_type text,
  add column if not exists variant_kind text,
  add column if not exists is_reference boolean,
  add column if not exists is_primary boolean,
  add column if not exists sort_order integer,
  add column if not exists model_used text,
  add column if not exists provider_used text,
  add column if not exists prompt_snapshot text,
  add column if not exists negative_prompt_snapshot text,
  add column if not exists user_id uuid,
  add column if not exists character_id uuid,
  add column if not exists job_id uuid,
  add column if not exists kind text,
  add column if not exists source text,
  add column if not exists visibility text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists seed integer,
  add column if not exists steps integer,
  add column if not exists cfg_scale numeric,
  add column if not exists sampler text,
  add column if not exists model text,
  add column if not exists workflow_name text,
  add column if not exists prompt_version integer,
  add column if not exists prompt_input jsonb,
  add column if not exists resolved_prompt text,
  add column if not exists negative_prompt text,
  add column if not exists is_adult_only boolean,
  add column if not exists subject_declared_18_plus boolean,
  add column if not exists consent_confirmed boolean,
  add column if not exists depicts_real_person boolean,
  add column if not exists depicts_public_figure boolean,
  add column if not exists moderation_status text,
  add column if not exists moderation_notes text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table if exists public.character_images
  alter column is_reference set default false,
  alter column is_primary set default false,
  alter column sort_order set default 0,
  alter column prompt_version set default 1,
  alter column prompt_input set default '{}'::jsonb,
  alter column is_adult_only set default true,
  alter column subject_declared_18_plus set default true,
  alter column consent_confirmed set default true,
  alter column depicts_real_person set default false,
  alter column depicts_public_figure set default false,
  alter column moderation_status set default 'pending',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.character_images
set
  is_reference = coalesce(is_reference, false),
  is_primary = coalesce(is_primary, false),
  sort_order = coalesce(sort_order, 0),
  prompt_version = coalesce(prompt_version, 1),
  prompt_input = coalesce(prompt_input, '{}'::jsonb),
  is_adult_only = coalesce(is_adult_only, true),
  subject_declared_18_plus = coalesce(subject_declared_18_plus, true),
  consent_confirmed = coalesce(consent_confirmed, true),
  depicts_real_person = coalesce(depicts_real_person, false),
  depicts_public_figure = coalesce(depicts_public_figure, false),
  moderation_status = coalesce(moderation_status, 'pending'),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  is_reference is null
  or is_primary is null
  or sort_order is null
  or prompt_version is null
  or prompt_input is null
  or is_adult_only is null
  or subject_declared_18_plus is null
  or consent_confirmed is null
  or depicts_real_person is null
  or depicts_public_figure is null
  or moderation_status is null
  or created_at is null
  or updated_at is null;

alter table if exists public.custom_characters
  add column if not exists avatar_image_id uuid,
  add column if not exists primary_reference_image_id uuid,
  add column if not exists primary_image_url text,
  add column if not exists image_status text,
  add column if not exists image_visibility text,
  add column if not exists image_prompt_version integer,
  add column if not exists image_last_generated_at timestamptz,
  add column if not exists image_generation_enabled boolean,
  add column if not exists style_type text,
  add column if not exists consistency_status text,
  add column if not exists base_generation_id uuid,
  add column if not exists prompt_version text;

alter table if exists public.custom_characters
  alter column image_status set default 'none',
  alter column image_visibility set default 'private',
  alter column image_prompt_version set default 1,
  alter column image_generation_enabled set default true,
  alter column style_type set default 'realistic',
  alter column consistency_status set default 'draft';

update public.custom_characters
set
  image_status = coalesce(image_status, 'none'),
  image_visibility = coalesce(image_visibility, 'private'),
  image_prompt_version = coalesce(image_prompt_version, 1),
  image_generation_enabled = coalesce(image_generation_enabled, true),
  style_type = coalesce(style_type, 'realistic'),
  consistency_status = coalesce(consistency_status, 'draft')
where
  image_status is null
  or image_visibility is null
  or image_prompt_version is null
  or image_generation_enabled is null
  or style_type is null
  or consistency_status is null;
