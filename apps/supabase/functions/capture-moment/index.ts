import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

/**
 * Capture a memorable moment during gameplay.
 *
 * POST { room_id, moment_type, description, involved_player_ids? }
 * moment_type: 'epic_claim' | 'bullshit_call' | 'funny_quote' | 'mini_game_win' | 'photo' | 'custom'
 *
 * Can be called manually by players or auto-triggered by other edge functions.
 * auto_captured flag distinguishes the two.
 */

const VALID_MOMENT_TYPES = [
  'epic_claim',
  'bullshit_call',
  'funny_quote',
  'mini_game_win',
  'photo',
  'custom',
] as const;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const { room_id, moment_type, description, involved_player_ids, auto_captured } = body;

    if (!room_id || !moment_type || !description) {
      return new Response(JSON.stringify({ error: 'room_id, moment_type, and description required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!VALID_MOMENT_TYPES.includes(moment_type)) {
      return new Response(JSON.stringify({ error: `Invalid moment_type. Must be one of: ${VALID_MOMENT_TYPES.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Verify room exists and is active (or just ended for post-game captures)
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status, started_at')
      .eq('id', room_id)
      .single();

    if (!room || !['ACTIVE', 'ENDED'].includes(room.status)) {
      return new Response(JSON.stringify({ error: 'Room not found or not active' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate tick_minute (minutes since session start)
    let tickMinute: number | null = null;
    if (room.started_at) {
      tickMinute = Math.floor((Date.now() - new Date(room.started_at).getTime()) / 60_000);
    }

    // If not auto_captured, verify the caller is in the room
    if (!auto_captured) {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: player } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', room_id)
        .eq('player_id', userId)
        .single();

      if (!player) {
        return new Response(JSON.stringify({ error: 'Not in this room' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: moment, error: insertError } = await supabase
      .from('moments')
      .insert({
        room_id,
        moment_type,
        description,
        involved_player_ids: involved_player_ids ?? [],
        auto_captured: !!auto_captured,
        tick_minute: tickMinute,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      moment_id: moment.id,
      tick_minute: tickMinute,
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
