import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

const AUTO_ACCEPT_SECONDS = 60;

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
      return new Response(JSON.stringify({ error: 'room_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Verify player is in this room
    const { data: myRoomPlayer } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room_id)
      .eq('player_id', userId)
      .single();

    if (!myRoomPlayer) {
      return new Response(JSON.stringify({ error: 'Not in this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-accept old pending claims
    const cutoff = new Date(Date.now() - AUTO_ACCEPT_SECONDS * 1000).toISOString();
    await supabase
      .from('claims')
      .update({ status: 'ACCEPTED', resolved_at: new Date().toISOString() })
      .eq('status', 'PENDING')
      .lt('claimed_at', cutoff)
      .in('mission_id', supabase.from('missions').select('id').eq('room_id', room_id));

    // Update scores for auto-accepted claims
    const { data: autoAccepted } = await supabase
      .from('claims')
      .select('room_player_id, points_awarded')
      .eq('status', 'ACCEPTED')
      .gt('resolved_at', cutoff);

    if (autoAccepted) {
      for (const claim of autoAccepted) {
        if (claim.points_awarded > 0) {
          const { data: rp } = await supabase
            .from('room_players')
            .select('score')
            .eq('id', claim.room_player_id)
            .single();
          if (rp) {
            await supabase
              .from('room_players')
              .update({ score: rp.score + claim.points_awarded })
              .eq('id', claim.room_player_id);
          }
        }
      }
    }

    // Fetch all state
    const [roomResult, playersResult, missionsResult, claimsResult] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', room_id).single(),
      supabase.from('room_players').select('*').eq('room_id', room_id).order('joined_at'),
      supabase.from('missions').select('*').eq('room_id', room_id).eq('room_player_id', myRoomPlayer.id),
      supabase
        .from('claims')
        .select('*, missions!inner(title, points, room_id, room_player_id)')
        .eq('missions.room_id', room_id)
        .in('status', ['PENDING', 'CHALLENGED']),
    ]);

    // Fetch votes for active claims
    const activeClaimIds = (claimsResult.data ?? []).map((c: { id: string }) => c.id);
    const { data: votes } = activeClaimIds.length > 0
      ? await supabase.from('votes').select('*').in('claim_id', activeClaimIds)
      : { data: [] };

    // Build response
    const players = playersResult.data ?? [];
    const activeClaims = (claimsResult.data ?? []).map((c: Record<string, unknown>) => {
      const mission = c.missions as { title: string; points: number; room_player_id: string };
      const claimant = players.find((p: { id: string }) => p.id === c.room_player_id);
      const claimVotes = (votes ?? []).filter((v: { claim_id: string }) => v.claim_id === c.id);
      const myVote = claimVotes.find((v: { room_player_id: string }) => v.room_player_id === myRoomPlayer.id);

      return {
        claim: {
          id: c.id,
          mission_id: c.mission_id,
          room_player_id: c.room_player_id,
          status: c.status,
          claimed_at: c.claimed_at,
          resolved_at: c.resolved_at,
          points_awarded: c.points_awarded,
        },
        mission_title: mission.title,
        mission_points: mission.points,
        claimant_nickname: claimant?.nickname ?? 'Unknown',
        votes: claimVotes,
        my_vote: myVote?.vote ?? null,
      };
    });

    const scores = players.map((p: { id: string; nickname: string; score: number }) => ({
      room_player_id: p.id,
      nickname: p.nickname,
      score: p.score,
      claims_made: 0,
      claims_won: 0,
      claims_lost: 0,
    }));

    return new Response(JSON.stringify({
      room: roomResult.data,
      players,
      missions: missionsResult.data ?? [],
      active_claims: activeClaims,
      scores: scores.sort((a: { score: number }, b: { score: number }) => b.score - a.score),
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
