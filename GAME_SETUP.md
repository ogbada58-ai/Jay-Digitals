# Street Football Ultimate — Online Setup

The game now has the database/RLS/RPC backend prepared in `supabase_game_setup.sql`.

## 1. Run the database setup

Open the Supabase project used by the existing site, open **SQL Editor**, paste the complete contents of `supabase_game_setup.sql`, and run it once.

It creates:

- `game_profiles` — player account, coins, level, upgrades and W/L/D
- `game_tournament_entries` — saved Street Cup progress
- `game_match_history` — cloud match history
- Row Level Security policies
- Secure RPCs for match rewards, upgrades and tournament progress
- Automatic player-profile creation when a Supabase account is created

## 2. Account system

The existing `signup.html` and `signin.html` already use the site's Supabase Auth project. New football accounts therefore use the same secure email/password authentication.

## 3. Online features prepared

The football backend supports:

- Cross-device player profiles
- Cloud coins
- Cloud level and upgrades
- Wins, losses and draws
- Global leaderboard reads
- Match history
- Three-round Street Cup tournament progress
- Tournament rewards
- Server-side reward calculation through RPCs
- Server-side upgrade purchases

## 4. Important security note

The publishable Supabase key is intended for browser use. Never put a Supabase service-role/secret key into `game.html` or any other public website file. Rewards and upgrades are handled by database functions so the browser does not need a service-role key.

## 5. Existing game

`game.html` remains playable immediately in guest/local mode. After the online database is installed, the online account layer can use the same Supabase project without changing the existing MARVY SIGNATURE customer pages.
