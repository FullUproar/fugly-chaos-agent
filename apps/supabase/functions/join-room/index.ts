import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

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

    const { code, nickname } = await req.json();
    if (!code || !nickname) {
      return new Response(JSON.stringify({ error: 'Code and nickname required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Ensure player record exists
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('id', userId)
      .single();

    if (!player) {
      await supabase.from('players').insert({ id: userId, device_id: userId });
    }

    // Find room by code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status, max_players')
      .eq('code', code.toUpperCase())
      .single();

    if (roomError || !room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (room.status === 'ENDED') {
      return new Response(JSON.stringify({ error: 'Game has ended' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already in room
    const { data: existing } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)
      .eq('player_id', userId)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ room_id: room.id, room_player_id: existing.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check player count
    const { count } = await supabase
      .from('room_players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room.id);

    if ((count ?? 0) >= room.max_players) {
      return new Response(JSON.stringify({ error: 'Room is full' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Join room
    const { data: roomPlayer, error: joinError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        player_id: userId,
        nickname: nickname.trim(),
        is_host: false,
      })
      .select('id')
      .single();

    if (joinError) throw joinError;

    return new Response(JSON.stringify({ room_id: room.id, room_player_id: roomPlayer.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
