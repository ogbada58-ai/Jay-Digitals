-- STREET FOOTBALL ULTIMATE ONLINE SETUP
-- Run this entire file once in Supabase SQL Editor for the project already used by this site.

create extension if not exists pgcrypto;

create table if not exists public.game_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Player',
  coins integer not null default 500 check (coins >= 0),
  level integer not null default 1 check (level >= 1),
  upgrade_points integer not null default 0 check (upgrade_points >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  matches integer not null default 0 check (matches >= 0),
  selected_team text not null default 'Lagos Lions',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists game_profiles_username_lower_idx on public.game_profiles (lower(username));

create table if not exists public.game_tournament_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_name text not null default 'Street Cup',
  round integer not null default 1 check (round between 1 and 3),
  wins integer not null default 0 check (wins >= 0),
  eliminated boolean not null default false,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists game_tournament_one_active_idx
on public.game_tournament_entries(user_id)
where completed = false and eliminated = false;

create table if not exists public.game_match_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  team_name text not null,
  opponent_name text not null,
  score_for integer not null default 0,
  score_against integer not null default 0,
  result text not null check (result in ('win','loss','draw')),
  coins_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists game_match_history_user_idx on public.game_match_history(user_id, created_at desc);

create or replace function public.set_game_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists game_profiles_updated_at on public.game_profiles;
create trigger game_profiles_updated_at before update on public.game_profiles
for each row execute function public.set_game_updated_at();

drop trigger if exists game_tournament_updated_at on public.game_tournament_entries;
create trigger game_tournament_updated_at before update on public.game_tournament_entries
for each row execute function public.set_game_updated_at();

create or replace function public.handle_new_game_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_name text;
begin
  base_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1), 'Player');
  insert into public.game_profiles(id, username)
  values(new.id, left(base_name, 24))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_game on auth.users;
create trigger on_auth_user_created_game after insert on auth.users
for each row execute function public.handle_new_game_profile();

alter table public.game_profiles enable row level security;
alter table public.game_tournament_entries enable row level security;
alter table public.game_match_history enable row level security;

drop policy if exists game_profiles_public_read on public.game_profiles;
create policy game_profiles_public_read on public.game_profiles for select using (true);
drop policy if exists game_profiles_self_insert on public.game_profiles;
create policy game_profiles_self_insert on public.game_profiles for insert with check (auth.uid() = id);
drop policy if exists game_profiles_self_update on public.game_profiles;
create policy game_profiles_self_update on public.game_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists game_tournament_self_read on public.game_tournament_entries;
create policy game_tournament_self_read on public.game_tournament_entries for select using (auth.uid() = user_id);
drop policy if exists game_tournament_self_insert on public.game_tournament_entries;
create policy game_tournament_self_insert on public.game_tournament_entries for insert with check (auth.uid() = user_id);
drop policy if exists game_tournament_self_update on public.game_tournament_entries;
create policy game_tournament_self_update on public.game_tournament_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists game_history_self_read on public.game_match_history;
create policy game_history_self_read on public.game_match_history for select using (auth.uid() = user_id);

create or replace function public.ensure_game_profile()
returns public.game_profiles
language plpgsql security definer set search_path = public
as $$
declare p public.game_profiles;
  base_name text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  base_name := coalesce(nullif(trim((select raw_user_meta_data->>'full_name' from auth.users where id=auth.uid())), ''), 'Player');
  insert into public.game_profiles(id, username) values(auth.uid(), left(base_name,24)) on conflict(id) do nothing;
  select * into p from public.game_profiles where id=auth.uid();
  return p;
end;
$$;

create or replace function public.record_game_result(
  p_mode text,
  p_team_name text,
  p_opponent_name text,
  p_score_for integer,
  p_score_against integer
)
returns public.game_profiles
language plpgsql security definer set search_path = public
as $$
declare
  p public.game_profiles;
  r text;
  reward integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_score_for < 0 or p_score_against < 0 or p_score_for > 99 or p_score_against > 99 then raise exception 'Invalid score'; end if;
  if p_score_for > p_score_against then r := 'win'; reward := 150;
  elsif p_score_for < p_score_against then r := 'loss'; reward := 25;
  else r := 'draw'; reward := 75;
  end if;
  if p_mode = 'tournament' and r = 'win' then reward := 250; end if;

  insert into public.game_profiles(id, username) values(auth.uid(), 'Player') on conflict(id) do nothing;
  update public.game_profiles
  set coins = coins + reward,
      wins = wins + case when r='win' then 1 else 0 end,
      losses = losses + case when r='loss' then 1 else 0 end,
      draws = draws + case when r='draw' then 1 else 0 end,
      matches = matches + 1,
      selected_team = left(coalesce(p_team_name,'Lagos Lions'),40),
      level = greatest(1, 1 + floor((upgrade_points + case when r='win' then 1 else 0 end)/2)::integer)
  where id=auth.uid()
  returning * into p;

  insert into public.game_match_history(user_id, mode, team_name, opponent_name, score_for, score_against, result, coins_earned)
  values(auth.uid(), left(coalesce(p_mode,'quick'),20), left(coalesce(p_team_name,'Lagos Lions'),40), left(coalesce(p_opponent_name,'Rivals'),40), p_score_for, p_score_against, r, reward);
  return p;
end;
$$;

create or replace function public.buy_game_upgrade()
returns public.game_profiles
language plpgsql security definer set search_path = public
as $$
declare p public.game_profiles;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.game_profiles
  set coins=coins-100, upgrade_points=upgrade_points+1, level=greatest(level, 1+floor((upgrade_points+1)/2)::integer)
  where id=auth.uid() and coins >= 100
  returning * into p;
  if p.id is null then raise exception 'You need 100 coins'; end if;
  return p;
end;
$$;

create or replace function public.enter_street_cup()
returns public.game_tournament_entries
language plpgsql security definer set search_path = public
as $$
declare e public.game_tournament_entries;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into e from public.game_tournament_entries where user_id=auth.uid() and completed=false and eliminated=false limit 1;
  if e.id is not null then return e; end if;
  insert into public.game_tournament_entries(user_id) values(auth.uid()) returning * into e;
  return e;
end;
$$;

create or replace function public.advance_street_cup(p_won boolean)
returns public.game_tournament_entries
language plpgsql security definer set search_path = public
as $$
declare e public.game_tournament_entries;
  reward integer := 0;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into e from public.game_tournament_entries where user_id=auth.uid() and completed=false and eliminated=false order by created_at desc limit 1 for update;
  if e.id is null then raise exception 'No active tournament'; end if;
  if p_won then
    if e.round >= 3 then
      update public.game_tournament_entries set wins=wins+1, round=3, completed=true where id=e.id returning * into e;
      reward := 500;
    else
      update public.game_tournament_entries set wins=wins+1, round=round+1 where id=e.id returning * into e;
      reward := 150;
    end if;
    update public.game_profiles set coins=coins+reward where id=auth.uid();
  else
    update public.game_tournament_entries set eliminated=true where id=e.id returning * into e;
  end if;
  return e;
end;
$$;

grant execute on function public.ensure_game_profile() to authenticated;
grant execute on function public.record_game_result(text,text,text,integer,integer) to authenticated;
grant execute on function public.buy_game_upgrade() to authenticated;
grant execute on function public.enter_street_cup() to authenticated;
grant execute on function public.advance_street_cup(boolean) to authenticated;
