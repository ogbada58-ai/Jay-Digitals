-- MARVY SIGNATURE customer account system
-- Run this script in Supabase SQL Editor once.

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  address_line text not null,
  city text not null,
  state text not null,
  landmark text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  price numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, product_name)
);

create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null unique,
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  status text not null default 'Pending' check (status in ('Pending','Confirmed','Shipped','Delivered','Cancelled')),
  delivery_address jsonb,
  created_at timestamptz not null default now()
);

alter table public.customer_addresses enable row level security;
alter table public.customer_wishlist enable row level security;
alter table public.customer_orders enable row level security;

drop policy if exists "addresses own rows" on public.customer_addresses;
create policy "addresses own rows" on public.customer_addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "wishlist own rows" on public.customer_wishlist;
create policy "wishlist own rows" on public.customer_wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "orders own rows" on public.customer_orders;
create policy "orders own rows" on public.customer_orders for select using (auth.uid() = user_id);

drop policy if exists "orders own insert" on public.customer_orders;
create policy "orders own insert" on public.customer_orders for insert with check (auth.uid() = user_id);

create index if not exists customer_addresses_user_id_idx on public.customer_addresses(user_id);
create index if not exists customer_wishlist_user_id_idx on public.customer_wishlist(user_id);
create index if not exists customer_orders_user_id_idx on public.customer_orders(user_id);
