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

    // Fetch all data for this room (including moments)
    const [playersResult, claimsResult, votesResult, missionsResult, momentsResult] = await Promise.all([
      supabase.from('room_players').select('*').eq('room_id', room_id).order('score', { ascending: false }),
      supabase.from('claims').select('*, missions!inner(room_id, title, points)').eq('missions.room_id', room_id),
      supabase.from('votes').select('*, claims!inner(mission_id, room_player_id, missions!inner(room_id))').eq('claims.missions.room_id', room_id),
      supabase.from('missions').select('*').eq('room_id', room_id),
      supabase.from('moments').select('*').eq('room_id', room_id).order('created_at', { ascending: true }),
    ]);

    const players = playersResult.data ?? [];
    const claims = claimsResult.data ?? [];
    const votes = votesResult.data ?? [];
    const missions = missionsResult.data ?? [];
    const moments = momentsResult.data ?? [];

    // Build leaderboard
    const leaderboard = players.map((p) => {
      const playerClaims = claims.filter((c: { room_player_id: string }) => c.room_player_id === p.id);
      return {
        room_player_id: p.id,
        nickname: p.nickname,
        score: p.score,
        claims_made: playerClaims.length,
        claims_won: playerClaims.filter((c: { status: string }) => ['VOTE_PASSED', 'ACCEPTED'].includes(c.status)).length,
        claims_lost: playerClaims.filter((c: { status: string }) => c.status === 'VOTE_FAILED').length,
      };
    });

    // Generate highlights
    const highlights = [];

    // Most bullshitted (got called out the most)
    const bullshitCounts = players.map((p) => ({
      nickname: p.nickname,
      count: votes.filter((v: { vote: string; claims: { room_player_id: string } }) =>
        v.vote === 'BULLSHIT' && v.claims?.room_player_id === p.id
      ).length,
    }));
    const mostBullshitted = bullshitCounts.sort((a, b) => b.count - a.count)[0];
    if (mostBullshitted && mostBullshitted.count > 0) {
      highlights.push({
        type: 'most_bullshitted',
        player_nickname: mostBullshitted.nickname,
        description: `Called out ${mostBullshitted.count} time${mostBullshitted.count > 1 ? 's' : ''}`,
        value: mostBullshitted.count,
      });
    }

    // Biggest single mission
    const biggestClaim = claims
      .filter((c: { status: string }) => ['VOTE_PASSED', 'ACCEPTED'].includes(c.status))
      .sort((a: { points_awarded: number }, b: { points_awarded: number }) => b.points_awarded - a.points_awarded)[0];
    if (biggestClaim) {
      const player = players.find((p) => p.id === biggestClaim.room_player_id);
      highlights.push({
        type: 'most_points_single',
        player_nickname: player?.nickname ?? 'Unknown',
        description: `${biggestClaim.missions.title} (${biggestClaim.points_awarded} pts)`,
        value: biggestClaim.points_awarded,
      });
    }

    const totalBullshits = votes.filter((v: { vote: string }) => v.vote === 'BULLSHIT').length;

    // Build moments list with player nicknames resolved
    const playerNickMap: Record<string, string> = {};
    for (const p of players) {
      playerNickMap[p.id] = p.nickname;
    }
    const capturedMoments = moments.map((m: {
      id: string;
      moment_type: string;
      description: string;
      involved_player_ids: string[];
      auto_captured: boolean;
      tick_minute: number | null;
      created_at: string;
    }) => ({
      id: m.id,
      moment_type: m.moment_type,
      description: m.description,
      involved_players: (m.involved_player_ids ?? []).map((pid: string) => playerNickMap[pid] ?? 'Unknown'),
      auto_captured: m.auto_captured,
      tick_minute: m.tick_minute,
      created_at: m.created_at,
    }));

    return new Response(JSON.stringify({
      leaderboard,
      highlights,
      moments: capturedMoments,
      total_claims: claims.length,
      total_bullshits: totalBullshits,
      total_missions: missions.length,
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
