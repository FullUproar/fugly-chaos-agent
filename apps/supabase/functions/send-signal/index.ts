import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

const SIGNAL_POINTS = 1;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { room_id, signal_type, target_player_id } = await req.json();

    if (!room_id || !signal_type) {
      return new Response(JSON.stringify({ error: 'room_id and signal_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Verify player is in room
    const { data: roomPlayer } = await supabase
      .from('room_players')
      .select('id, score')
      .eq('room_id', room_id)
      .eq('player_id', userId)
      .single();

    if (!roomPlayer) {
      return new Response(JSON.stringify({ error: 'Not in this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert signal
    const { data: signal, error: signalError } = await supabase
      .from('signals')
      .insert({
        room_id,
        room_player_id: roomPlayer.id,
        signal_type,
        target_player_id: target_player_id ?? null,
      })
      .select('id')
      .single();

    if (signalError) throw signalError;

    // Award points for sending signal
    await supabase
      .from('room_players')
      .update({ score: roomPlayer.score + SIGNAL_POINTS })
      .eq('id', roomPlayer.id);

    return new Response(JSON.stringify({
      signal_id: signal.id,
      points_awarded: SIGNAL_POINTS,
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
