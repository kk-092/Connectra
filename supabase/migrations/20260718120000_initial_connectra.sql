create type public.user_role as enum ('admin', 'employee');
create type public.user_status as enum ('active', 'suspended');
create type public.conversation_type as enum ('group', 'direct');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null default 'employee',
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  type public.conversation_type not null default 'group',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  client_generated_id text,
  created_at timestamptz not null default now(),
  unique (sender_id, client_generated_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  bucket text not null default 'chat-attachments',
  object_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.is_active_user(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and status = 'active'
  );
$$;

create or replace function public.is_conversation_member(conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_members.conversation_id = is_conversation_member.conversation_id
      and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;

create policy "active users can read profiles"
on public.profiles for select
using (public.is_active_user(auth.uid()));

create policy "admins can update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

create policy "members can read conversations"
on public.conversations for select
using (public.is_conversation_member(id) or public.is_admin());

create policy "admins can create conversations"
on public.conversations for insert
with check (public.is_admin());

create policy "members can read conversation members"
on public.conversation_members for select
using (public.is_conversation_member(conversation_id) or public.is_admin());

create policy "admins can manage conversation members"
on public.conversation_members for all
using (public.is_admin())
with check (public.is_admin());

create policy "members can read messages"
on public.messages for select
using (public.is_conversation_member(conversation_id));

create policy "members can send messages"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and public.is_active_user(auth.uid())
  and public.is_conversation_member(conversation_id)
);

create policy "members can read attachments"
on public.attachments for select
using (
  exists (
    select 1
    from public.messages
    where messages.id = attachments.message_id
      and public.is_conversation_member(messages.conversation_id)
  )
);

create policy "members can create attachments"
on public.attachments for insert
with check (uploader_id = auth.uid() and public.is_active_user(auth.uid()));

create policy "admins can read audit logs"
on public.audit_logs for select
using (public.is_admin());
