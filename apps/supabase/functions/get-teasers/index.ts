import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { event_id } = await req.json();

    if (!event_id) {
      return new Response(JSON.stringify({ error: 'event_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();
    const now = new Date().toISOString();

    // Return teasers that have been "delivered" (sent_at <= now)
    const { data: teasers, error } = await supabase
      .from('teasers')
      .select('id, message, teaser_type, target_player_id, sent_at')
      .eq('room_id', event_id)
      .lte('sent_at', now)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    // Get event scheduled_at for countdown
    const { data: room } = await supabase
      .from('rooms')
      .select('scheduled_at')
      .eq('id', event_id)
      .single();

    const scheduledAt = room?.scheduled_at ?? null;
    let daysUntil: number | null = null;
    if (scheduledAt) {
      const msUntil = new Date(scheduledAt).getTime() - Date.now();
      daysUntil = Math.max(0, Math.ceil(msUntil / (1000 * 60 * 60 * 24)));
    }

    return new Response(JSON.stringify({
      teasers: teasers ?? [],
      days_until_event: daysUntil,
      scheduled_at: scheduledAt,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
