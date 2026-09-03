-- MARVY SIGNATURE customer account setup
-- Run this SQL once in Supabase SQL Editor.
-- Never put a service_role key in the website.

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  state text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  price numeric(12,2) not null default 0,
  product_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total numeric(12,2) not null default 0,
  status text not null default 'Pending',
  items text,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;
alter table public.wishlist enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Users can view own addresses" on public.addresses;
drop policy if exists "Users can insert own addresses" on public.addresses;
drop policy if exists "Users can update own addresses" on public.addresses;
drop policy if exists "Users can delete own addresses" on public.addresses;
create policy "Users can view own addresses" on public.addresses for select using (auth.uid() = user_id);
create policy "Users can insert own addresses" on public.addresses for insert with check (auth.uid() = user_id);
create policy "Users can update own addresses" on public.addresses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own addresses" on public.addresses for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own wishlist" on public.wishlist;
drop policy if exists "Users can insert own wishlist" on public.wishlist;
drop policy if exists "Users can update own wishlist" on public.wishlist;
drop policy if exists "Users can delete own wishlist" on public.wishlist;
create policy "Users can view own wishlist" on public.wishlist for select using (auth.uid() = user_id);
create policy "Users can insert own wishlist" on public.wishlist for insert with check (auth.uid() = user_id);
create policy "Users can update own wishlist" on public.wishlist for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own wishlist" on public.wishlist for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders" on public.orders for select using (auth.uid() = user_id);

create index if not exists addresses_user_id_idx on public.addresses(user_id);
create index if not exists wishlist_user_id_idx on public.wishlist(user_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
