alter table if exists public.custom_conversations enable row level security;
alter table if exists public.custom_messages enable row level security;
alter table if exists public.conversation_memory_state enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'custom_conversations'
      and policyname = 'custom_conversations_select_rows'
  ) then
    create policy custom_conversations_select_rows
    on public.custom_conversations
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
      and tablename = 'custom_conversations'
      and policyname = 'custom_conversations_insert_rows'
  ) then
    create policy custom_conversations_insert_rows
    on public.custom_conversations
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
      and tablename = 'custom_conversations'
      and policyname = 'custom_conversations_update_rows'
  ) then
    create policy custom_conversations_update_rows
    on public.custom_conversations
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
      and tablename = 'custom_conversations'
      and policyname = 'custom_conversations_delete_rows'
  ) then
    create policy custom_conversations_delete_rows
    on public.custom_conversations
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
      and tablename = 'custom_messages'
      and policyname = 'custom_messages_select_rows'
  ) then
    create policy custom_messages_select_rows
    on public.custom_messages
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
      and tablename = 'custom_messages'
      and policyname = 'custom_messages_insert_rows'
  ) then
    create policy custom_messages_insert_rows
    on public.custom_messages
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
      and tablename = 'custom_messages'
      and policyname = 'custom_messages_update_rows'
  ) then
    create policy custom_messages_update_rows
    on public.custom_messages
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
      and tablename = 'custom_messages'
      and policyname = 'custom_messages_delete_rows'
  ) then
    create policy custom_messages_delete_rows
    on public.custom_messages
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
      and tablename = 'conversation_memory_state'
      and policyname = 'conversation_memory_state_select_rows'
  ) then
    create policy conversation_memory_state_select_rows
    on public.conversation_memory_state
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
      and tablename = 'conversation_memory_state'
      and policyname = 'conversation_memory_state_insert_rows'
  ) then
    create policy conversation_memory_state_insert_rows
    on public.conversation_memory_state
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
      and tablename = 'conversation_memory_state'
      and policyname = 'conversation_memory_state_update_rows'
  ) then
    create policy conversation_memory_state_update_rows
    on public.conversation_memory_state
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
      and tablename = 'conversation_memory_state'
      and policyname = 'conversation_memory_state_delete_rows'
  ) then
    create policy conversation_memory_state_delete_rows
    on public.conversation_memory_state
    for delete
    to authenticated
    using (user_id = auth.uid());
  end if;
end
$$;
