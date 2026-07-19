insert into public.conversations (id, title, type)
values ('00000000-0000-4000-8000-000000000001', 'Company Lobby', 'group')
on conflict (id) do nothing;

insert into public.conversation_members (conversation_id, user_id)
select '00000000-0000-4000-8000-000000000001', id
from public.profiles
where status = 'active'
on conflict (conversation_id, user_id) do nothing;

create or replace function public.add_profile_to_company_lobby()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' then
    insert into public.conversation_members (conversation_id, user_id)
    values ('00000000-0000-4000-8000-000000000001', new.id)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists add_profile_to_company_lobby_trigger on public.profiles;

create trigger add_profile_to_company_lobby_trigger
after insert on public.profiles
for each row
execute function public.add_profile_to_company_lobby();

drop policy if exists "members can upload chat files" on storage.objects;
drop policy if exists "members can read chat files" on storage.objects;

create policy "members can upload chat files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "members can read chat files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'chat-attachments'
  and exists (
    select 1
    from public.attachments
    join public.messages on messages.id = attachments.message_id
    where attachments.object_path = storage.objects.name
      and public.is_conversation_member(messages.conversation_id)
  )
);
