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

    const { game_type, game_name, room_name, settings, nickname } = await req.json();
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
    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code)
        .single();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    // Create room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: userId,
        game_type: game_type ?? 'party_game',
        game_name: game_name ?? null,
        room_name: room_name ?? null,
        settings: settings ?? {},
      })
      .select('id, code')
      .single();

    if (roomError) throw roomError;

    // Add host as first player
    const { data: roomPlayer, error: rpError } = await supabase.from('room_players').insert({
      room_id: room.id,
      player_id: userId,
      nickname: nickname ?? 'Host',
      is_host: true,
    }).select('id').single();

    if (rpError) throw rpError;

    return new Response(JSON.stringify({ room_id: room.id, code: room.code, room_player_id: roomPlayer.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
