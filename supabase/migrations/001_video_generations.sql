create table if not exists public.video_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  aspect_ratio text not null default '16:9',
  duration integer not null default 5,
  model text not null default 'ray-flash-2',
  provider_id text,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  video_url text,
  provider_data jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.video_generations enable row level security;

drop policy if exists "Users can read their own video generations" on public.video_generations;
create policy "Users can read their own video generations"
  on public.video_generations for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own video generations" on public.video_generations;
create policy "Users can create their own video generations"
  on public.video_generations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own video generations" on public.video_generations;
create policy "Users can update their own video generations"
  on public.video_generations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists video_generations_user_created_idx
  on public.video_generations(user_id, created_at desc);

alter table public.video_generations replica identity full;
