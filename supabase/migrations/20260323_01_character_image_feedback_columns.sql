alter table if exists public.character_images
  add column if not exists feedback_type text,
  add column if not exists is_liked_reference boolean not null default false,
  add column if not exists reference_rank integer,
  add column if not exists quality_score integer,
  add column if not exists quality_flags jsonb not null default '[]'::jsonb,
  add column if not exists judge_version text;

create index if not exists idx_character_images_liked_reference
  on public.character_images (character_id, is_liked_reference, reference_rank desc, created_at desc);
