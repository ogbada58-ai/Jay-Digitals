import { withSupabase } from 'npm:@supabase/server@^1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { prompt, aspectRatio = '16:9', duration = 5, model = 'ray-flash-2' } = await req.json()
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'A valid prompt is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const apiKey = Deno.env.get('LUMA_API_KEY')
    if (!apiKey) throw new Error('LUMA_API_KEY is not configured in Supabase secrets.')

    const { data: row, error: insertError } = await ctx.supabase
      .from('video_generations')
      .insert({ user_id: ctx.user.id, prompt: prompt.trim(), aspect_ratio: aspectRatio, duration: Number(duration), model, status: 'processing' })
      .select()
      .single()
    if (insertError) throw insertError

    const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/video', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ generation_type: 'video', prompt: prompt.trim(), aspect_ratio: aspectRatio, model, duration: `${Number(duration)}s`, resolution: '720p' })
    })

    const generation = await response.json()
    if (!response.ok) {
      await ctx.supabase.from('video_generations').update({ status: 'failed', error_message: generation?.message || 'Video provider rejected the request.' }).eq('id', row.id)
      return new Response(JSON.stringify({ error: generation?.message || 'Video generation failed.' }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const providerId = generation.id
    await ctx.supabase.from('video_generations').update({ provider_id: providerId, provider_data: generation }).eq('id', row.id)

    return new Response(JSON.stringify({ id: row.id, providerId, status: 'processing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}))
