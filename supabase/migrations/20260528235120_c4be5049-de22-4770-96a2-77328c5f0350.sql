drop policy if exists "Users view own profile or admins view all" on public.profiles;
create policy "Profiles viewable by authenticated"
on public.profiles for select to authenticated
using (true);
drop view if exists public.public_profiles;