create table if not exists public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  phone_number text not null unique,
  provider text,
  provider_number_id text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  phone_number_id uuid not null references public.phone_numbers(id) on delete cascade,
  sender text,
  body text not null,
  provider_message_id text unique,
  received_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.phone_numbers enable row level security;
alter table public.sms_messages enable row level security;

create policy "owners can read their numbers" on public.phone_numbers
for select using (auth.uid() = owner_id);

create policy "owners can read their sms" on public.sms_messages
for select using (exists (select 1 from public.phone_numbers n where n.id = phone_number_id and n.owner_id = auth.uid()));

create index if not exists sms_messages_phone_number_id_idx on public.sms_messages(phone_number_id, received_at desc);
