
-- Notifications insert restricted to self (server fn uses service role to bypass)
drop policy "System inserts notifications" on public.notifications;
create policy "Users insert own notifications" on public.notifications
  for insert to authenticated with check (auth.uid() = user_id);

-- Revoke execute on security definer functions from anon/authenticated
revoke execute on function public.has_role(uuid, app_role) from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
