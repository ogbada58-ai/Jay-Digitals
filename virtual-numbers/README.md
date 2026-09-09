# Virtual Numbers App

Professional mobile-friendly starter for a virtual-number/SMS inbox service.

## Included
- Supabase email/password authentication
- Protected dashboard UI
- Number inventory and assignment views
- SMS inbox UI
- Provider webhook endpoint starter
- No hard-coded provider secrets or credentials

## Safety / production notes
This app is designed for numbers you lawfully provision through an SMS/telephony provider. Provider credentials belong only on the server/Edge Function. Do not use the service to intercept codes, defeat verification, or access accounts you do not own.

## Setup
1. Create a Supabase project.
2. Add the SQL schema in `supabase/schema.sql`.
3. Configure the Supabase URL and anon key in `app.js`.
4. Deploy the webhook as a Supabase Edge Function and configure your provider to call it.
5. Keep provider API keys in Supabase Edge Function secrets, never in frontend code.
