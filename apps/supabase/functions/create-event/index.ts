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

    const { game_type, game_name, nickname, scheduled_at, description, slow_burn_enabled, photo_challenges_enabled } = await req.json();

    if (!nickname?.trim()) {
      return new Response(JSON.stringify({ error: 'Nickname required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!scheduled_at) {
      return new Response(JSON.stringify({ error: 'Scheduled date required' }), {
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

    // Generate unique room code
    const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code)
        .single();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    // Create room in INVITED status
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: userId,
        game_type: game_type ?? 'party_game',
        game_name: game_name ?? null,
        status: 'INVITED',
        settings: {},
        scheduled_at,
        description: description ?? null,
        invite_phase_enabled: true,
        slow_burn_enabled: slow_burn_enabled ?? false,
        photo_challenges_enabled: photo_challenges_enabled ?? false,
      })
      .select('id, code')
      .single();

    if (roomError) throw roomError;

    // Add host as first player
    const { data: roomPlayer, error: rpError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        player_id: userId,
        nickname: nickname.trim(),
        is_host: true,
      })
      .select('id')
      .single();

    if (rpError) throw rpError;

    // Create host's invite record (auto-accepted)
    const { data: hostInvite } = await supabase
      .from('event_invites')
      .insert({
        room_id: room.id,
        invited_by: userId,
        player_id: userId,
        invite_name: nickname.trim(),
        status: 'ACCEPTED',
        responded_at: new Date().toISOString(),
      })
      .select('invite_token')
      .single();

    return new Response(JSON.stringify({
      room_id: room.id,
      code: room.code,
      room_player_id: roomPlayer.id,
      invite_token: hostInvite?.invite_token ?? '',
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
