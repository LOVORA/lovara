create table if not exists public.user_character_recognition_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  built_in_character_slug text,
  custom_character_id uuid references public.custom_characters(id) on delete cascade,
  known_name text,
  knows_user boolean not null default false,
  recognition_basis text not null default 'unknown',
  introduced_by_user boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_character_recognition_memory_scope_check
    check (
      (built_in_character_slug is not null and custom_character_id is null)
      or
      (built_in_character_slug is null and custom_character_id is not null)
    )
);

create unique index if not exists idx_user_character_recognition_memory_builtin
  on public.user_character_recognition_memory (user_id, built_in_character_slug)
  where built_in_character_slug is not null;

create unique index if not exists idx_user_character_recognition_memory_custom
  on public.user_character_recognition_memory (user_id, custom_character_id)
  where custom_character_id is not null;

alter table if exists public.user_character_recognition_memory enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_character_recognition_memory'
      and policyname = 'user_character_recognition_memory_select_rows'
  ) then
    create policy user_character_recognition_memory_select_rows
      on public.user_character_recognition_memory
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_character_recognition_memory'
      and policyname = 'user_character_recognition_memory_insert_rows'
  ) then
    create policy user_character_recognition_memory_insert_rows
      on public.user_character_recognition_memory
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_character_recognition_memory'
      and policyname = 'user_character_recognition_memory_update_rows'
  ) then
    create policy user_character_recognition_memory_update_rows
      on public.user_character_recognition_memory
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_character_recognition_memory'
      and policyname = 'user_character_recognition_memory_delete_rows'
  ) then
    create policy user_character_recognition_memory_delete_rows
      on public.user_character_recognition_memory
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end
$$;
