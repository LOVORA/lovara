insert into storage.buckets (id, name, public)
values ('character-images', 'character-images', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'character_images_authenticated_select'
  ) then
    create policy character_images_authenticated_select
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'character-images');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'character_images_authenticated_insert'
  ) then
    create policy character_images_authenticated_insert
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'character-images');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'character_images_authenticated_update'
  ) then
    create policy character_images_authenticated_update
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'character-images')
    with check (bucket_id = 'character-images');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'character_images_authenticated_delete'
  ) then
    create policy character_images_authenticated_delete
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'character-images');
  end if;
end
$$;
