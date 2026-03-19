import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

const FALSE_CLAIM_PENALTY = 5;
const VOTE_WINDOW_SECONDS = 60; // Non-voters auto-accept after this

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

    const { claim_id, vote } = await req.json();
    if (!claim_id || !['ACCEPT', 'BULLSHIT'].includes(vote)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Get claim and its mission
    const { data: claim } = await supabase
      .from('claims')
      .select('id, mission_id, room_player_id, status, points_awarded')
      .eq('id', claim_id)
      .single();

    if (!claim || !['PENDING', 'CHALLENGED'].includes(claim.status)) {
      return new Response(JSON.stringify({ error: 'Claim not votable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get mission's room_id
    const { data: mission } = await supabase
      .from('missions')
      .select('room_id, type')
      .eq('id', claim.mission_id)
      .single();

    if (!mission) throw new Error('Mission not found');

    // Find the voter's room_player record
    const { data: voter } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', mission.room_id)
      .eq('player_id', userId)
      .single();

    if (!voter) {
      return new Response(JSON.stringify({ error: 'Not in this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Can't vote on your own claim
    if (voter.id === claim.room_player_id) {
      return new Response(JSON.stringify({ error: "Can't vote on your own claim" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert vote (unique constraint prevents double voting)
    const { error: voteError } = await supabase
      .from('votes')
      .insert({ claim_id, room_player_id: voter.id, vote });

    if (voteError) {
      if (voteError.code === '23505') {
        return new Response(JSON.stringify({ error: 'Already voted' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw voteError;
    }

    // If first BULLSHIT vote, update claim to CHALLENGED
    if (vote === 'BULLSHIT' && claim.status === 'PENDING') {
      await supabase.from('claims').update({ status: 'CHALLENGED' }).eq('id', claim_id);
    }

    // Check if ALL eligible voters have voted (no early majority cutoff)
    const { count: totalPlayers } = await supabase
      .from('room_players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', mission.room_id);

    const eligibleVoters = (totalPlayers ?? 0) - 1; // exclude claimant

    const { data: allVotes } = await supabase
      .from('votes')
      .select('vote')
      .eq('claim_id', claim_id);

    const voteCount = allVotes?.length ?? 0;

    // Only resolve when ALL eligible voters have voted
    let resolved = false;
    let claimStatus = claim.status;
    let pointsAwarded = 0;

    if (voteCount >= eligibleVoters) {
      resolved = true;
      const acceptCount = allVotes?.filter((v) => v.vote === 'ACCEPT').length ?? 0;
      const bullshitCount = allVotes?.filter((v) => v.vote === 'BULLSHIT').length ?? 0;
      const accepted = acceptCount >= bullshitCount; // ties favor claimant

      if (accepted) {
        claimStatus = 'VOTE_PASSED';
        pointsAwarded = claim.points_awarded;

        await supabase
          .from('claims')
          .update({ status: 'VOTE_PASSED', resolved_at: new Date().toISOString() })
          .eq('id', claim_id);

        // Only update mission status for flash missions (standing stay REVEALED)
        if (mission.type !== 'standing') {
          await supabase
            .from('missions')
            .update({ status: 'VERIFIED' })
            .eq('id', claim.mission_id);
        }

        // Add points to claimant
        const { data: claimant } = await supabase
          .from('room_players')
          .select('score')
          .eq('id', claim.room_player_id)
          .single();

        if (claimant) {
          await supabase
            .from('room_players')
            .update({ score: claimant.score + pointsAwarded })
            .eq('id', claim.room_player_id);
        }
      } else {
        claimStatus = 'VOTE_FAILED';

        await supabase
          .from('claims')
          .update({ status: 'VOTE_FAILED', resolved_at: new Date().toISOString(), points_awarded: 0 })
          .eq('id', claim_id);

        if (mission.type !== 'standing') {
          await supabase
            .from('missions')
            .update({ status: 'FAILED' })
            .eq('id', claim.mission_id);
        }

        // Deduct penalty from claimant
        const { data: claimant } = await supabase
          .from('room_players')
          .select('score')
          .eq('id', claim.room_player_id)
          .single();

        if (claimant) {
          await supabase
            .from('room_players')
            .update({ score: claimant.score - FALSE_CLAIM_PENALTY })
            .eq('id', claim.room_player_id);
        }
      }
    }

    return new Response(JSON.stringify({
      resolved,
      claim_status: claimStatus,
      points_awarded: pointsAwarded,
      votes_in: voteCount,
      votes_needed: eligibleVoters,
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
