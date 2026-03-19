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

    const { room_id } = await req.json();
    const supabase = getAdminClient();

    // Get room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is in the room or is the host
    const { data: membership } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room_id)
      .eq('player_id', userId)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a member of this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get invites
    const { data: invites } = await supabase
      .from('event_invites')
      .select('id, invite_name, status, invite_token, pre_game_answers, invited_at, responded_at')
      .eq('room_id', room_id)
      .order('invited_at', { ascending: true });

    // Get teasers
    const { data: teasers } = await supabase
      .from('teasers')
      .select('*')
      .eq('room_id', room_id)
      .order('sent_at', { ascending: false })
      .limit(20);

    const accepted = (invites ?? []).filter(i => i.status === 'ACCEPTED').length;
    const declined = (invites ?? []).filter(i => i.status === 'DECLINED').length;
    const pending = (invites ?? []).filter(i => i.status === 'PENDING').length;

    return new Response(JSON.stringify({
      room,
      invites: invites ?? [],
      teasers: teasers ?? [],
      accepted_count: accepted,
      declined_count: declined,
      pending_count: pending,
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
