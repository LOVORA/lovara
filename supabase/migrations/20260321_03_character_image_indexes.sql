create index if not exists idx_character_images_character_created_at
  on public.character_images (character_id, created_at desc);

create index if not exists idx_character_images_character_primary_created_at
  on public.character_images (character_id, is_primary desc, created_at desc);

create index if not exists idx_character_images_user_created_at
  on public.character_images (user_id, created_at desc);

create index if not exists idx_custom_characters_user_slug
  on public.custom_characters (user_id, slug);
