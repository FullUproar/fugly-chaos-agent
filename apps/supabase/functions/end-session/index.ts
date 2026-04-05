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

    // Verify caller is host
    const { data: hostCheck } = await supabase
      .from('room_players')
      .select('is_host')
      .eq('room_id', room_id)
      .eq('player_id', userId)
      .single();

    if (!hostCheck?.is_host) {
      return new Response(JSON.stringify({ error: 'Only the host can end the session' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve any pending claims as accepted
    await supabase
      .from('claims')
      .update({ status: 'ACCEPTED', resolved_at: new Date().toISOString() })
      .in('status', ['PENDING', 'CHALLENGED'])
      .in('mission_id',
        supabase.from('missions').select('id').eq('room_id', room_id),
      );

    // End the room
    await supabase
      .from('rooms')
      .update({ status: 'ENDED', ended_at: new Date().toISOString() })
      .eq('id', room_id);

    // Get room season/episode info for session_history records
    const { data: roomInfo } = await supabase
      .from('rooms')
      .select('season_number, episode_number, crew_name')
      .eq('id', room_id)
      .single();

    const seasonNumber = roomInfo?.season_number ?? 1;
    const episodeNumber = roomInfo?.episode_number ?? 1;

    // Create session_history records for all players with profiles
    const { data: allRoomPlayers } = await supabase
      .from('room_players')
      .select('player_id, nickname, score')
      .eq('room_id', room_id)
      .order('score', { ascending: false });

    if (allRoomPlayers && allRoomPlayers.length > 0) {
      const playerIds = allRoomPlayers.map((rp: any) => rp.player_id);
      const { data: profiles } = await supabase
        .from('player_profiles')
        .select('id, player_id')
        .in('player_id', playerIds);

      if (profiles && profiles.length > 0) {
        const profileMap = new Map(profiles.map((p: any) => [p.player_id, p.id]));
        const historyRecords = allRoomPlayers
          .filter((rp: any) => profileMap.has(rp.player_id))
          .map((rp: any, idx: number) => ({
            room_id,
            player_profile_id: profileMap.get(rp.player_id),
            nickname: rp.nickname,
            final_score: rp.score ?? 0,
            final_rank: idx + 1,
            season_number: seasonNumber,
            episode_number: episodeNumber,
            played_at: new Date().toISOString(),
          }));

        if (historyRecords.length > 0) {
          await supabase.from('session_history').insert(historyRecords);
        }
      }
    }

    // Update streaks for all players
    let streakResults: any[] = [];
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      const streakRes = await fetch(`${supabaseUrl}/functions/v1/update-streak`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ room_id }),
      });

      if (streakRes.ok) {
        const streakData = await streakRes.json();
        streakResults = streakData.streaks ?? [];
      }
    } catch {
      // Streak update failure is non-critical
    }

    // Sync stats to Afterroar HQ for linked players
    let ahqSynced = 0;
    try {
      // Check if any players in this room are linked to AHQ
      const { data: linkedPlayers } = await supabase
        .from('room_players')
        .select('id, ahq_user_id')
        .eq('room_id', room_id)
        .not('ahq_user_id', 'is', null);

      if (linkedPlayers && linkedPlayers.length > 0) {
        // Call sync-to-ahq internally via fetch to the same Supabase instance
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const syncRes = await fetch(`${supabaseUrl}/functions/v1/sync-to-ahq`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ room_id }),
        });

        if (syncRes.ok) {
          const syncData = await syncRes.json();
          ahqSynced = syncData.synced_players ?? 0;
        }
      }
    } catch {
      // AHQ sync failure is non-critical — don't block the end-session response
    }

    return new Response(JSON.stringify({
      ended: true,
      ahq_synced: ahqSynced,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      streaks: streakResults,
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
