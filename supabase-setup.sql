-- MARVY SIGNATURE customer account tables
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

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

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'Pending',
  total numeric(12,2) not null default 0,
  items text,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.wishlist enable row level security;

-- Customers can only access their own records.
drop policy if exists "Customers manage own addresses" on public.addresses;
create policy "Customers manage own addresses" on public.addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Customers view own orders" on public.orders;
create policy "Customers view own orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "Customers manage own wishlist" on public.wishlist;
create policy "Customers manage own wishlist" on public.wishlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Helpful indexes
create index if not exists addresses_user_id_idx on public.addresses(user_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists wishlist_user_id_idx on public.wishlist(user_id);
