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

    const { invite_token, status, nickname, pre_game_answers } = await req.json();

    if (!invite_token || !status) {
      return new Response(JSON.stringify({ error: 'Invite token and status required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (status !== 'ACCEPTED' && status !== 'DECLINED') {
      return new Response(JSON.stringify({ error: 'Status must be ACCEPTED or DECLINED' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Find invite by token
    const { data: invite, error: findError } = await supabase
      .from('event_invites')
      .select('id, room_id, status')
      .eq('invite_token', invite_token)
      .single();

    if (findError || !invite) {
      return new Response(JSON.stringify({ error: 'Invalid invite token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (invite.status !== 'PENDING') {
      return new Response(JSON.stringify({ error: 'Invite already responded to' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get room info
    const { data: room } = await supabase
      .from('rooms')
      .select('id, code, status')
      .eq('id', invite.room_id)
      .single();

    if (!room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure player record exists
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('id', userId)
      .single();

    if (!player) {
      await supabase.from('players').insert({ id: userId, device_id: userId });
    }

    // Update invite
    await supabase
      .from('event_invites')
      .update({
        status,
        player_id: userId,
        pre_game_answers: pre_game_answers ?? {},
        responded_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    let room_player_id: string | undefined;

    // If accepted, add player to room
    if (status === 'ACCEPTED') {
      const displayName = nickname?.trim() || 'Player';

      // Check if already in room
      const { data: existing } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', room.id)
        .eq('player_id', userId)
        .single();

      if (existing) {
        room_player_id = existing.id;
      } else {
        const { data: rp, error: rpError } = await supabase
          .from('room_players')
          .insert({
            room_id: room.id,
            player_id: userId,
            nickname: displayName,
            is_host: false,
          })
          .select('id')
          .single();

        if (rpError) throw rpError;
        room_player_id = rp.id;
      }
    }

    return new Response(JSON.stringify({
      room_id: room.id,
      room_player_id,
      code: room.code,
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
