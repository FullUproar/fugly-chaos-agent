import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

/**
 * Derives a chaos title from total games played.
 */
function getChaosTitle(gamesPlayed: number): string {
  if (gamesPlayed > 50) return "Fugly's Chosen One";
  if (gamesPlayed >= 21) return 'Legendary Chaos Lord';
  if (gamesPlayed >= 11) return 'Master of Mayhem';
  if (gamesPlayed >= 6) return 'Certified Troublemaker';
  if (gamesPlayed >= 3) return 'Agent of Mischief';
  return 'Chaos Rookie';
}

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
    if (!room_id) {
      return new Response(JSON.stringify({ error: 'Missing room_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Get all room players with AHQ links
    const { data: players } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', room_id)
      .order('score', { ascending: false });

    if (!players || players.length === 0) {
      return new Response(JSON.stringify({ synced_players: 0, session_history_ids: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gather claims and votes for stats
    const { data: claims } = await supabase
      .from('claims')
      .select('*, missions!inner(room_id, title, points)')
      .eq('missions.room_id', room_id);

    const { data: votes } = await supabase
      .from('votes')
      .select('*, claims!inner(mission_id, room_player_id, missions!inner(room_id))')
      .eq('claims.missions.room_id', room_id);

    const allClaims = claims ?? [];
    const allVotes = votes ?? [];

    // Get room info for game night linkage
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room_id)
      .single();

    const sessionHistoryIds: string[] = [];
    let syncedCount = 0;

    for (let rank = 0; rank < players.length; rank++) {
      const player = players[rank];
      if (!player.ahq_user_id) continue;

      // Find or verify the player_profile
      const { data: profile } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('ahq_user_id', player.ahq_user_id)
        .maybeSingle();

      if (!profile) continue;

      // Calculate this session's stats for this player
      const playerClaims = allClaims.filter(
        (c: { room_player_id: string }) => c.room_player_id === player.id
      );
      const claimsMade = playerClaims.length;
      const claimsWon = playerClaims.filter(
        (c: { status: string }) => ['VOTE_PASSED', 'ACCEPTED'].includes(c.status)
      ).length;

      // Bullshit calls this player made
      const bullshitCalls = allVotes.filter(
        (v: { room_player_id: string; vote: string }) =>
          v.room_player_id === player.id && v.vote === 'BULLSHIT'
      );
      const bullshitCallsMade = bullshitCalls.length;
      const bullshitCorrect = bullshitCalls.filter(
        (v: { claims: { room_player_id: string; status?: string } }) => {
          // Find the claim this vote belongs to
          const claim = allClaims.find(
            (c: { id: string }) => c.id === (v as unknown as { claim_id: string }).claim_id
          );
          return claim && claim.status === 'VOTE_FAILED';
        }
      ).length;

      // Build highlights for this player's session
      const highlights = [];
      if (rank === 0) highlights.push({ type: 'winner', description: 'Won the game!' });
      if (claimsWon > 0) highlights.push({ type: 'claims', description: `${claimsWon} claims accepted` });
      if (bullshitCorrect > 0) highlights.push({ type: 'detective', description: `${bullshitCorrect} correct BS calls` });

      // Update player_profile stats
      const newGamesPlayed = (profile.total_games_played ?? 0) + 1;
      const newTitle = getChaosTitle(newGamesPlayed);

      await supabase
        .from('player_profiles')
        .update({
          total_games_played: newGamesPlayed,
          total_points_earned: (profile.total_points_earned ?? 0) + (player.score ?? 0),
          total_claims_made: (profile.total_claims_made ?? 0) + claimsMade,
          total_claims_won: (profile.total_claims_won ?? 0) + claimsWon,
          total_bullshit_calls: (profile.total_bullshit_calls ?? 0) + bullshitCallsMade,
          total_bullshit_correct: (profile.total_bullshit_correct ?? 0) + bullshitCorrect,
          chaos_title: newTitle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      // Create session_history record
      const { data: historyRecord } = await supabase
        .from('session_history')
        .insert({
          room_id,
          player_profile_id: profile.id,
          ahq_game_night_id: room?.settings?.ahq_game_night_id ?? null,
          ahq_crew_id: player.ahq_crew_id ?? null,
          nickname: player.nickname,
          final_score: player.score ?? 0,
          final_rank: rank + 1,
          highlights,
          played_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (historyRecord) {
        sessionHistoryIds.push(historyRecord.id);
      }
      syncedCount++;
    }

    return new Response(JSON.stringify({
      synced_players: syncedCount,
      session_history_ids: sessionHistoryIds,
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
