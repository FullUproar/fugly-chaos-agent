import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

/**
 * get-season-info — returns season/episode framing for a crew.
 *
 * POST { room_id } or { crew_id } or { player_ids: string[] }
 *
 * Season = Math.floor(sessionCount / 10) + 1 (10 episodes per season)
 * Episode = (sessionCount % 10) + 1
 */

const EPISODES_PER_SEASON = 10;

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

    const { room_id, crew_id, player_ids } = await req.json();
    const supabase = getAdminClient();

    let profileIds: string[] = [];
    let crewName: string | null = null;
    let streakInfo = { current_streak: 0, longest_streak: 0 };

    if (room_id) {
      // Get players from this room
      const { data: roomPlayers } = await supabase
        .from('room_players')
        .select('player_id')
        .eq('room_id', room_id);

      if (roomPlayers && roomPlayers.length > 0) {
        const pIds = roomPlayers.map((rp: { player_id: string }) => rp.player_id);
        const { data: profiles } = await supabase
          .from('player_profiles')
          .select('id, current_streak, longest_streak')
          .in('player_id', pIds);

        if (profiles) {
          profileIds = profiles.map((p: { id: string }) => p.id);
          // Use the highest streak among players as the "crew streak"
          for (const p of profiles) {
            if ((p.current_streak ?? 0) > streakInfo.current_streak) {
              streakInfo.current_streak = p.current_streak ?? 0;
              streakInfo.longest_streak = p.longest_streak ?? 0;
            }
          }
        }
      }

      // Check for crew_name on the room
      const { data: roomData } = await supabase
        .from('rooms')
        .select('crew_name')
        .eq('id', room_id)
        .single();

      crewName = roomData?.crew_name ?? null;
    } else if (crew_id) {
      // Get sessions for this AHQ crew
      const { data: sessions } = await supabase
        .from('session_history')
        .select('player_profile_id')
        .eq('ahq_crew_id', crew_id);

      if (sessions) {
        profileIds = [...new Set(sessions.map((s: { player_profile_id: string }) => s.player_profile_id))];
      }
    } else if (player_ids && player_ids.length > 0) {
      const { data: profiles } = await supabase
        .from('player_profiles')
        .select('id, current_streak, longest_streak')
        .in('player_id', player_ids);

      if (profiles) {
        profileIds = profiles.map((p: { id: string }) => p.id);
        for (const p of profiles) {
          if ((p.current_streak ?? 0) > streakInfo.current_streak) {
            streakInfo.current_streak = p.current_streak ?? 0;
            streakInfo.longest_streak = p.longest_streak ?? 0;
          }
        }
      }
    }

    // Count total sessions where ANY of these profiles overlap
    // This gives us the "crew" session count
    let totalSessions = 0;

    if (profileIds.length > 0) {
      const { count } = await supabase
        .from('session_history')
        .select('id', { count: 'exact', head: true })
        .in('player_profile_id', profileIds);

      // Deduplicate by room_id to count unique sessions
      const { data: sessions } = await supabase
        .from('session_history')
        .select('room_id')
        .in('player_profile_id', profileIds);

      if (sessions) {
        const uniqueRooms = new Set(sessions.map((s: { room_id: string }) => s.room_id));
        totalSessions = uniqueRooms.size;
      }
    }

    const season = Math.floor(totalSessions / EPISODES_PER_SEASON) + 1;
    const episode = (totalSessions % EPISODES_PER_SEASON) + 1;

    return new Response(JSON.stringify({
      season,
      episode,
      total_sessions: totalSessions,
      crew_name: crewName,
      current_streak: streakInfo.current_streak,
      longest_streak: streakInfo.longest_streak,
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
