create table if not exists public.built_in_character_overrides (
  id uuid primary key default gen_random_uuid(),
  character_slug text not null unique,
  role_label text null,
  headline text null,
  description text null,
  is_listed_in_professional boolean not null default true,
  is_chat_enabled boolean not null default true,
  is_visible_in_sidebar boolean not null default true,
  is_visible_in_photo_studio boolean not null default true,
  sort_order integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.built_in_character_overrides enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'built_in_character_overrides'
      and policyname = 'built_in_character_overrides_public_select'
  ) then
    create policy built_in_character_overrides_public_select
      on public.built_in_character_overrides
      for select
      using (true);
  end if;
end
$$;
