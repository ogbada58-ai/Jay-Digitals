import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // Verify the signature using your provider's documented webhook-signing method.
  // Keep provider secrets in Supabase Edge Function secrets.
  const payload = await req.json();
  const { phone_number, sender, body, provider_message_id } = payload;
  if (!phone_number || !body) return new Response('Invalid payload', { status: 400 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: number } = await supabase
    .from('phone_numbers')
    .select('id')
    .eq('phone_number', phone_number)
    .maybeSingle();

  if (!number) return new Response('Unknown number', { status: 404 });

  const { error } = await supabase.from('sms_messages').insert({
    phone_number_id: number.id,
    sender: sender ?? null,
    body: String(body),
    provider_message_id: provider_message_id ?? null
  });

  if (error) return new Response('Database error', { status: 500 });
  return new Response('OK', { status: 200 });
});
