
-- Enums
create type public.app_role as enum ('admin', 'user');
create type public.item_type as enum ('lost', 'found');
create type public.item_status as enum ('open', 'claimed', 'returned', 'rejected');
create type public.claim_status as enum ('pending', 'approved', 'rejected');
create type public.item_category as enum ('Electronics','ID Card','Wallet','Books','Keys','Clothing','Other');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  matric_no text unique,
  full_name text not null,
  department text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles viewable by authenticated" on public.profiles
  for select to authenticated using (true);
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "Admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Items
create table public.items (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  type item_type not null,
  category item_category not null,
  title text not null,
  description text not null,
  location text not null,
  item_date date not null,
  image_urls text[] not null default '{}',
  status item_status not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.items enable row level security;
create index items_created_idx on public.items(created_at desc);
create index items_type_idx on public.items(type);
create index items_category_idx on public.items(category);

create policy "Items viewable by authenticated" on public.items
  for select to authenticated using (true);
create policy "Users insert own items" on public.items
  for insert to authenticated with check (auth.uid() = reporter_id);
create policy "Owners update own items" on public.items
  for update to authenticated using (auth.uid() = reporter_id or public.has_role(auth.uid(),'admin'));
create policy "Owners delete own items" on public.items
  for delete to authenticated using (auth.uid() = reporter_id or public.has_role(auth.uid(),'admin'));

-- Claims
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  claimant_id uuid not null references auth.users(id) on delete cascade,
  proof_details text not null,
  status claim_status not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.claims enable row level security;

create policy "Claims viewable to participants" on public.claims
  for select to authenticated using (
    auth.uid() = claimant_id
    or public.has_role(auth.uid(),'admin')
    or exists(select 1 from public.items i where i.id = claims.item_id and i.reporter_id = auth.uid())
  );
create policy "Users create own claims" on public.claims
  for insert to authenticated with check (auth.uid() = claimant_id);
create policy "Owners/admins update claims" on public.claims
  for update to authenticated using (
    public.has_role(auth.uid(),'admin')
    or exists(select 1 from public.items i where i.id = claims.item_id and i.reporter_id = auth.uid())
  );

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create policy "Users read own notifications" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications
  for update to authenticated using (auth.uid() = user_id);
create policy "System inserts notifications" on public.notifications
  for insert to authenticated with check (true);

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, matric_no, department, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'matric_no',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'phone'
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for item images
insert into storage.buckets (id, name, public) values ('item-images','item-images', true)
on conflict (id) do nothing;

create policy "Item images publicly readable" on storage.objects
  for select using (bucket_id = 'item-images');
create policy "Authenticated upload item images" on storage.objects
  for insert to authenticated with check (bucket_id = 'item-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own item images" on storage.objects
  for delete to authenticated using (bucket_id = 'item-images' and auth.uid()::text = (storage.foldername(name))[1]);
