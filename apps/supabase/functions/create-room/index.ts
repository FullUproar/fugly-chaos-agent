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

    const { game_type, game_name, room_name, settings, nickname, crew_name, partyMode, speedMode } = await req.json();

    // Merge mode flags into room settings
    const mergedSettings = {
      ...(settings ?? {}),
      ...(partyMode ? { partyMode: true } : {}),
      ...(speedMode ? { speedMode: true } : {}),
    };
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

    // Compute season/episode if this group of players has history together
    let seasonNumber = 1;
    let episodeNumber = 1;
    let resolvedCrewName = crew_name ?? null;
    let streakCount: number | null = null;

    // Check if host has a profile with session history
    const { data: hostProfile } = await supabase
      .from('player_profiles')
      .select('id, current_streak')
      .eq('player_id', userId)
      .single();

    if (hostProfile) {
      // Count past sessions for this player to compute season/episode
      const { data: pastSessions } = await supabase
        .from('session_history')
        .select('room_id')
        .eq('player_profile_id', hostProfile.id);

      if (pastSessions && pastSessions.length > 0) {
        const uniqueRooms = new Set(pastSessions.map((s: { room_id: string }) => s.room_id));
        const totalSessions = uniqueRooms.size;
        seasonNumber = Math.floor(totalSessions / 10) + 1;
        episodeNumber = (totalSessions % 10) + 1;
      }

      streakCount = hostProfile.current_streak ?? 0;

      // Look for a crew_name from previous rooms if not provided
      if (!resolvedCrewName) {
        const { data: prevRooms } = await supabase
          .from('rooms')
          .select('crew_name')
          .eq('host_id', userId)
          .not('crew_name', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (prevRooms && prevRooms.length > 0) {
          resolvedCrewName = prevRooms[0].crew_name;
        }
      }
    }

    // Create room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: userId,
        game_type: game_type ?? 'party_game',
        game_name: game_name ?? null,
        room_name: room_name ?? null,
        settings: mergedSettings,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        crew_name: resolvedCrewName,
        streak_count: streakCount,
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

    return new Response(JSON.stringify({
      room_id: room.id,
      code: room.code,
      room_player_id: roomPlayer.id,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      crew_name: resolvedCrewName,
      streak_count: streakCount,
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

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
