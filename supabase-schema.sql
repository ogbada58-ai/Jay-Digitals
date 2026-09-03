-- MARVY SIGNATURE customer account data
-- Run this once in Supabase SQL Editor to enable cloud-saved addresses, wishlist and orders.

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  state text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  price text not null,
  created_at timestamptz not null default now(),
  unique(user_id, product_name)
);

create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  status text not null default 'Pending' check (status in ('Pending','Processing','Shipped','Delivered','Cancelled')),
  created_at timestamptz not null default now()
);

alter table public.customer_addresses enable row level security;
alter table public.customer_wishlist enable row level security;
alter table public.customer_orders enable row level security;

create policy "Users manage own addresses" on public.customer_addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own wishlist" on public.customer_wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users view own orders" on public.customer_orders for select using (auth.uid() = user_id);
create policy "Users create own orders" on public.customer_orders for insert with check (auth.uid() = user_id);
