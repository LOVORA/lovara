alter table if exists public.character_images enable row level security;
alter table if exists public.character_image_jobs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'character_images'
      and policyname = 'character_images_authenticated_select_rows'
  ) then
    create policy character_images_authenticated_select_rows
    on public.character_images
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
      and tablename = 'character_images'
      and policyname = 'character_images_authenticated_insert_rows'
  ) then
    create policy character_images_authenticated_insert_rows
    on public.character_images
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
      and tablename = 'character_images'
      and policyname = 'character_images_authenticated_update_rows'
  ) then
    create policy character_images_authenticated_update_rows
    on public.character_images
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
      and tablename = 'character_images'
      and policyname = 'character_images_authenticated_delete_rows'
  ) then
    create policy character_images_authenticated_delete_rows
    on public.character_images
    for delete
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
      and tablename = 'character_image_jobs'
      and policyname = 'character_image_jobs_authenticated_select_rows'
  ) then
    create policy character_image_jobs_authenticated_select_rows
    on public.character_image_jobs
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
      and tablename = 'character_image_jobs'
      and policyname = 'character_image_jobs_authenticated_insert_rows'
  ) then
    create policy character_image_jobs_authenticated_insert_rows
    on public.character_image_jobs
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
      and tablename = 'character_image_jobs'
      and policyname = 'character_image_jobs_authenticated_update_rows'
  ) then
    create policy character_image_jobs_authenticated_update_rows
    on public.character_image_jobs
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
      and tablename = 'character_image_jobs'
      and policyname = 'character_image_jobs_authenticated_delete_rows'
  ) then
    create policy character_image_jobs_authenticated_delete_rows
    on public.character_image_jobs
    for delete
    to authenticated
    using (user_id = auth.uid());
  end if;
end
$$;
