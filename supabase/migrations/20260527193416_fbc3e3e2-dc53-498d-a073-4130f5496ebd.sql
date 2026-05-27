
-- Admin promotion helper (bootstrap-friendly)
create or replace function public.promote_to_admin(_email text)
returns table(user_id uuid, email text, role app_role)
language plpgsql
security definer
set search_path = public
as $$
declare
  _caller uuid := auth.uid();
  _target uuid;
  _admin_count int;
begin
  if _caller is null then
    raise exception 'You must be signed in to promote a user';
  end if;

  select count(*) into _admin_count from public.user_roles where role = 'admin';

  -- Only existing admins can promote, unless no admin exists yet (bootstrap).
  if _admin_count > 0 and not public.has_role(_caller, 'admin') then
    raise exception 'Only an admin can promote other users';
  end if;

  select id into _target from auth.users where lower(auth.users.email) = lower(_email) limit 1;
  if _target is null then
    raise exception 'No user found with that email';
  end if;

  insert into public.user_roles (user_id, role) values (_target, 'admin')
  on conflict (user_id, role) do nothing;

  return query
    select _target, _email, 'admin'::app_role;
end;
$$;

revoke all on function public.promote_to_admin(text) from public;
grant execute on function public.promote_to_admin(text) to authenticated;

-- Storage: admin override for item-images
drop policy if exists "Admins manage item images update" on storage.objects;
drop policy if exists "Admins manage item images delete" on storage.objects;
drop policy if exists "Users update own item images" on storage.objects;

create policy "Users update own item images"
on storage.objects for update to authenticated
using (
  bucket_id = 'item-images'
  and (auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'item-images'
  and (auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Admins manage item images update"
on storage.objects for update to authenticated
using (bucket_id = 'item-images' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'item-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins manage item images delete"
on storage.objects for delete to authenticated
using (bucket_id = 'item-images' and public.has_role(auth.uid(), 'admin'));
