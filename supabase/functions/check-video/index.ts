import { withSupabase } from 'npm:@supabase/server@^1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { id } = await req.json()
    if (!id) throw new Error('Generation id is required.')

    const { data: row, error: readError } = await ctx.supabase
      .from('video_generations').select('*').eq('id', id).eq('user_id', ctx.user.id).single()
    if (readError || !row) return new Response(JSON.stringify({ error: 'Generation not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (row.status !== 'processing') return new Response(JSON.stringify(row), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const apiKey = Deno.env.get('LUMA_API_KEY')
    if (!apiKey) throw new Error('LUMA_API_KEY is not configured in Supabase secrets.')

    const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${row.provider_id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
    })
    const generation = await response.json()
    if (!response.ok) throw new Error(generation?.message || 'Unable to check video status.')

    const state = String(generation.state || generation.status || '').toLowerCase()
    const completed = ['completed', 'complete', 'succeeded'].includes(state)
    const failed = ['failed', 'error', 'cancelled'].includes(state)
    const videoUrl = generation.assets?.video || generation.video?.url || generation.video_url || null
    const patch = {
      status: completed ? 'completed' : failed ? 'failed' : 'processing',
      video_url: videoUrl,
      provider_data: generation,
      error_message: failed ? (generation.failure_reason || generation.error || 'Video generation failed.') : null,
      updated_at: new Date().toISOString()
    }
    const { data: updated, error: updateError } = await ctx.supabase.from('video_generations').update(patch).eq('id', id).eq('user_id', ctx.user.id).select().single()
    if (updateError) throw updateError

    return new Response(JSON.stringify(updated), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}))
