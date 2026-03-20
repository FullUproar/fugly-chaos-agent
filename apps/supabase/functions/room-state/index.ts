import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

const AUTO_ACCEPT_FLASH_SECONDS = 60;
const AUTO_ACCEPT_STANDING_SECONDS = 180; // 3 minutes for standing missions

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
    const now = new Date();
    const nowIso = now.toISOString();

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

    // --- AUTO-EXPIRE flash missions ---
    await supabase
      .from('missions')
      .update({ status: 'EXPIRED' })
      .eq('room_id', room_id)
      .eq('type', 'flash')
      .eq('status', 'REVEALED')
      .lt('expires_at', nowIso);

    // --- AUTO-CLOSE expired polls ---
    await supabase
      .from('polls')
      .update({ status: 'CLOSED' })
      .eq('room_id', room_id)
      .eq('status', 'ACTIVE')
      .lt('expires_at', nowIso);

    // --- AUTO-ACCEPT old pending claims (different timeouts by mission type) ---
    const flashCutoff = new Date(Date.now() - AUTO_ACCEPT_FLASH_SECONDS * 1000).toISOString();
    const standingCutoff = new Date(Date.now() - AUTO_ACCEPT_STANDING_SECONDS * 1000).toISOString();
    const { data: roomMissions } = await supabase
      .from('missions')
      .select('id, type')
      .eq('room_id', room_id);

    const flashMissionIds = (roomMissions ?? []).filter((m: { type: string }) => m.type === 'flash').map((m: { id: string }) => m.id);
    const standingMissionIds = (roomMissions ?? []).filter((m: { type: string }) => m.type === 'standing').map((m: { id: string }) => m.id);
    const missionIds = (roomMissions ?? []).map((m: { id: string }) => m.id);

    // Auto-accept flash claims (60s)
    const staleFlash = flashMissionIds.length > 0
      ? (await supabase.from('claims').select('id, mission_id, room_player_id, points_awarded')
          .in('status', ['PENDING', 'CHALLENGED']).lt('claimed_at', flashCutoff).in('mission_id', flashMissionIds)).data ?? []
      : [];

    // Auto-accept standing claims (180s)
    const staleStanding = standingMissionIds.length > 0
      ? (await supabase.from('claims').select('id, mission_id, room_player_id, points_awarded')
          .in('status', ['PENDING', 'CHALLENGED']).lt('claimed_at', standingCutoff).in('mission_id', standingMissionIds)).data ?? []
      : [];

    const staleClaimsData = [...staleFlash, ...staleStanding];

    if (missionIds.length > 0) {

      const staleClaims = staleClaimsData ?? [];
      if (staleClaims.length > 0) {
        const staleIds = staleClaims.map((c: { id: string }) => c.id);
        await supabase
          .from('claims')
          .update({ status: 'ACCEPTED', resolved_at: nowIso })
          .in('id', staleIds);

        for (const claim of staleClaims) {
          // Mark flash missions as VERIFIED on auto-accept
          await supabase
            .from('missions')
            .update({ status: 'VERIFIED' })
            .eq('id', claim.mission_id)
            .neq('type', 'standing'); // standing missions stay REVEALED

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
    }

    // --- FETCH ALL STATE ---
    const [
      roomResult,
      playersResult,
      standingResult,
      flashResult,
      pollResult,
      signalsResult,
      claimsResult,
      messagesResult,
    ] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', room_id).single(),
      supabase.from('room_players').select('*').eq('room_id', room_id).order('joined_at'),
      // Standing missions (all, visible to everyone)
      supabase.from('missions').select('*').eq('room_id', room_id).eq('type', 'standing'),
      // Active flash mission (unexpired, type=flash, status=REVEALED or CLAIMED)
      supabase.from('missions').select('*').eq('room_id', room_id).eq('type', 'flash').in('status', ['REVEALED', 'CLAIMED']).order('created_at', { ascending: false }).limit(1),
      // Active poll
      supabase.from('polls').select('*').eq('room_id', room_id).eq('status', 'ACTIVE').order('created_at', { ascending: false }).limit(1),
      // Recent signals
      supabase.from('signals').select('*').eq('room_id', room_id).order('created_at', { ascending: false }).limit(20),
      // All claims for this room's missions
      supabase
        .from('claims')
        .select('*, missions!inner(title, points, room_id, room_player_id, type)')
        .eq('missions.room_id', room_id)
        .order('claimed_at', { ascending: false }),
      // Recent messages (room-wide + DMs for this player) — last 10
      supabase
        .from('messages')
        .select('*')
        .eq('room_id', room_id)
        .or(`recipient_id.is.null,sender_id.eq.${myRoomPlayer.id},recipient_id.eq.${myRoomPlayer.id}`)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const players = playersResult.data ?? [];
    const activeFlash = (flashResult.data ?? [])[0] ?? null;
    const activePoll = (pollResult.data ?? [])[0] ?? null;

    // Check if caller voted on active poll
    let myPollVote: string | null = null;
    if (activePoll) {
      const { data: vote } = await supabase
        .from('poll_votes')
        .select('answer')
        .eq('poll_id', activePoll.id)
        .eq('room_player_id', myRoomPlayer.id)
        .single();
      myPollVote = vote?.answer ?? null;

      // Also fetch poll votes for display
      const { data: pollVotes } = await supabase
        .from('poll_votes')
        .select('room_player_id, answer')
        .eq('poll_id', activePoll.id);
      (activePoll as Record<string, unknown>).votes = pollVotes ?? [];
    }

    // Build claims with context
    const allClaimIds = (claimsResult.data ?? []).map((c: { id: string }) => c.id);
    const { data: votes } = allClaimIds.length > 0
      ? await supabase.from('votes').select('*').in('claim_id', allClaimIds)
      : { data: [] };

    const allClaims = (claimsResult.data ?? []).map((c: Record<string, unknown>) => {
      const mission = c.missions as { title: string; points: number; room_player_id: string; type: string };
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

    const activeClaims = allClaims.filter((c: { claim: { status: string } }) =>
      ['PENDING', 'CHALLENGED'].includes(c.claim.status)
    );

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
      standing_missions: standingResult.data ?? [],
      active_flash: activeFlash,
      active_poll: activePoll,
      my_poll_vote: myPollVote,
      recent_signals: signalsResult.data ?? [],
      active_claims: activeClaims,
      all_claims: allClaims,
      scores: scores.sort((a: { score: number }, b: { score: number }) => b.score - a.score),
      recent_messages: messagesResult.data ?? [],
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
