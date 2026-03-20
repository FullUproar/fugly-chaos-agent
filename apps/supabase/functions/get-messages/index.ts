import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

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

    const { room_id, since, limit } = await req.json();

    if (!room_id) {
      return new Response(JSON.stringify({ error: 'room_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Verify caller is in the room
    const { data: roomPlayer } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room_id)
      .eq('player_id', userId)
      .single();

    if (!roomPlayer) {
      return new Response(JSON.stringify({ error: 'Not in this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const effectiveLimit = Math.min(
      Math.max(1, typeof limit === 'number' ? limit : DEFAULT_LIMIT),
      MAX_LIMIT,
    );

    // Build query: room-wide messages + DMs where caller is sender or recipient
    let query = supabase
      .from('messages')
      .select('*')
      .eq('room_id', room_id)
      .or(`recipient_id.is.null,sender_id.eq.${roomPlayer.id},recipient_id.eq.${roomPlayer.id}`)
      .order('created_at', { ascending: false })
      .limit(effectiveLimit);

    if (since) {
      query = query.gt('created_at', since);
    }

    const { data: messages, error: queryError } = await query;
    if (queryError) throw queryError;

    return new Response(JSON.stringify({
      messages: messages ?? [],
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
