
create or replace function public.notify_on_new_found_item()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'found' then
    insert into public.notifications(user_id, title, body, link)
    select distinct i.reporter_id,
           'A possible match for your lost item',
           'Someone reported a found ' || new.category || ' titled "' || new.title || '" at ' || new.location,
           '/items/' || new.id::text
    from public.items i
    where i.type = 'lost' and i.status = 'open' and i.category = new.category and i.reporter_id <> new.reporter_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_on_new_found_item() from anon, authenticated, public;

create trigger on_new_item after insert on public.items
  for each row execute function public.notify_on_new_found_item();

create or replace function public.notify_on_claim_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications(user_id, title, body, link)
    values (
      new.claimant_id,
      'Your claim was ' || new.status,
      'Update on your claim',
      '/items/' || new.item_id::text
    );
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_on_claim_update() from anon, authenticated, public;

create trigger on_claim_status_change after update on public.claims
  for each row execute function public.notify_on_claim_update();
