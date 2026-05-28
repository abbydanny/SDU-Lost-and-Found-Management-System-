
-- 1. Messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,           -- the student participant in this thread
  item_id uuid,                    -- optional item context
  sender_id uuid not null,         -- whoever sent this message
  from_admin boolean not null default false,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_messages_user_created on public.messages(user_id, created_at desc);
create index idx_messages_item on public.messages(item_id);

grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;

alter table public.messages enable row level security;

create policy "Users read their thread or admins read all"
on public.messages for select to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Student sends own message"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and user_id = auth.uid()
  and from_admin = false
);

create policy "Admin sends admin message"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and from_admin = true
  and public.has_role(auth.uid(), 'admin')
);

create policy "Participants mark read"
on public.messages for update to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Enable realtime
alter publication supabase_realtime add table public.messages;
alter table public.messages replica identity full;

-- 2. Profiles privacy tightening
drop policy if exists "Profiles viewable by authenticated" on public.profiles;
create policy "Users view own profile or admins view all"
on public.profiles for select to authenticated
using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

-- Public view exposing only safe columns for cross-user displays
create or replace view public.public_profiles
with (security_invoker = true) as
select id, full_name, department from public.profiles;

grant select on public.public_profiles to authenticated;

-- Allow authenticated users to read name/department from any profile via the view
create policy "Anyone authenticated reads safe profile fields"
on public.profiles for select to authenticated
using (true);
-- Note: the original tight policy + this permissive one combine OR;
-- to keep sensitive fields hidden we drop the permissive one and rely on the view+security_invoker.
drop policy "Anyone authenticated reads safe profile fields" on public.profiles;

-- 3. Lock down user_roles self-insertion (restrictive guard)
create policy "Only admins may insert roles"
on public.user_roles as restrictive for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

-- 4. promote_to_admin executable only by authenticated users
revoke execute on function public.promote_to_admin(text) from anon, public;
grant execute on function public.promote_to_admin(text) to authenticated;
