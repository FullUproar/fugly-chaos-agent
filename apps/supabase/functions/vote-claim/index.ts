import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';
import { sendPush } from '../_shared/push.ts';

const FALSE_CLAIM_PENALTY = 5;
const VOTE_WINDOW_SECONDS = 60;

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

    const body = await req.json();
    const { claim_id, vote, action, amount, text, rating } = body;
    const effectiveAction = action || 'vote';

    // For standard vote action, require valid vote
    if (effectiveAction === 'vote' && (!claim_id || !['ACCEPT', 'BULLSHIT'].includes(vote))) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!claim_id) {
      return new Response(JSON.stringify({ error: 'claim_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Get claim with mechanic info
    const { data: claim } = await supabase
      .from('claims')
      .select('id, mission_id, room_player_id, status, points_awarded, voting_mechanic, mechanic_data')
      .eq('id', claim_id)
      .single();

    if (!claim || !['PENDING', 'CHALLENGED'].includes(claim.status)) {
      return new Response(JSON.stringify({ error: 'Claim not votable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mechanic = (claim.voting_mechanic || 'standard') as string;
    const mechanicData = (claim.mechanic_data || {}) as Record<string, unknown>;

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

    // ── Handle mechanic-specific actions (non-vote) ──

    // PITCH_IT: claimant submits their pitch text
    if (effectiveAction === 'pitch' && mechanic === 'pitch_it') {
      if (voter.id !== claim.room_player_id) {
        return new Response(JSON.stringify({ error: 'Only claimant can pitch' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const updatedData = { ...mechanicData, pitch: text || '' };
      await supabase.from('claims').update({ mechanic_data: updatedData }).eq('id', claim_id);
      return new Response(JSON.stringify({ resolved: false, action: 'pitch_submitted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // VOLUNTEER_TRIBUNAL: player volunteers as juror
    if (effectiveAction === 'volunteer' && mechanic === 'volunteer_tribunal') {
      const volunteers = (mechanicData.volunteers as string[]) || [];
      if (volunteers.includes(voter.id)) {
        return new Response(JSON.stringify({ error: 'Already volunteered' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (voter.id === claim.room_player_id) {
        return new Response(JSON.stringify({ error: 'Claimant cannot volunteer' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      volunteers.push(voter.id);
      const updatedData = { ...mechanicData, volunteers };
      await supabase.from('claims').update({ mechanic_data: updatedData }).eq('id', claim_id);
      return new Response(JSON.stringify({
        resolved: false,
        action: 'volunteered',
        volunteer_count: volunteers.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // AUCTION: player places a bid
    if (effectiveAction === 'bid' && mechanic === 'auction') {
      if (voter.id === claim.room_player_id) {
        return new Response(JSON.stringify({ error: 'Claimant cannot bid' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const bids = (mechanicData.bids as Array<{ player_id: string; amount: number }>) || [];
      if (bids.some((b) => b.player_id === voter.id)) {
        return new Response(JSON.stringify({ error: 'Already bid' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      bids.push({ player_id: voter.id, amount: amount || 0 });
      const updatedData = { ...mechanicData, bids };
      await supabase.from('claims').update({ mechanic_data: updatedData }).eq('id', claim_id);

      // Check if all non-claimant players have bid
      const { count: totalPlayers } = await supabase
        .from('room_players')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', mission.room_id);
      const eligibleBidders = (totalPlayers ?? 0) - 1;

      if (bids.length >= eligibleBidders) {
        // Highest bidder decides: their vote = ACCEPT (they paid for it)
        const highestBid = bids.reduce((max, b) => (b.amount > max.amount ? b : max), bids[0]);
        // Auto-pass: highest bidder "buys" the claim
        const passed = true;
        const pointsAwarded = claim.points_awarded;

        await supabase.from('claims').update({
          status: 'VOTE_PASSED',
          resolved_at: new Date().toISOString(),
          mechanic_data: { ...updatedData, winner: highestBid.player_id },
        }).eq('id', claim_id);

        // Award points to claimant
        const { data: claimant } = await supabase.from('room_players').select('score').eq('id', claim.room_player_id).single();
        if (claimant) {
          await supabase.from('room_players').update({ score: claimant.score + pointsAwarded }).eq('id', claim.room_player_id);
        }
        // Deduct bid from highest bidder
        const { data: bidder } = await supabase.from('room_players').select('score').eq('id', highestBid.player_id).single();
        if (bidder) {
          await supabase.from('room_players').update({ score: Math.max(0, bidder.score - highestBid.amount) }).eq('id', highestBid.player_id);
        }

        sendPush({
          room_id: mission.room_id,
          title: '\u{2696}\u{FE0F} Verdict!',
          body: '\u{2696}\u{FE0F} The auction is over: LEGIT!',
          data: { claim_id, verdict: 'LEGIT' },
          category: 'VERDICT',
        });

        return new Response(JSON.stringify({
          resolved: true, claim_status: 'VOTE_PASSED', points_awarded: pointsAwarded,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ resolved: false, action: 'bid_placed', bids_in: bids.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // BRIBE: claimant offers points
    if (effectiveAction === 'bribe_offer' && mechanic === 'the_bribe') {
      if (voter.id !== claim.room_player_id) {
        return new Response(JSON.stringify({ error: 'Only claimant can bribe' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const updatedData = { ...mechanicData, offered_points: amount || 0 };
      await supabase.from('claims').update({ mechanic_data: updatedData }).eq('id', claim_id);
      return new Response(JSON.stringify({ resolved: false, action: 'bribe_offered' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ALIBI: claimant or witness submits their story
    if (effectiveAction === 'alibi_story' && mechanic === 'alibi') {
      const witnessId = mechanicData.witness_id as string;
      const isClaimant = voter.id === claim.room_player_id;
      const isWitness = voter.id === witnessId;

      if (!isClaimant && !isWitness) {
        return new Response(JSON.stringify({ error: 'Only claimant or witness can submit alibi' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const field = isClaimant ? 'claimant_story' : 'witness_story';
      const updatedData = { ...mechanicData, [field]: text || '' };
      await supabase.from('claims').update({ mechanic_data: updatedData }).eq('id', claim_id);

      // Check if both submitted
      const claimantStory = isClaimant ? (text || '') : (mechanicData.claimant_story as string);
      const witnessStory = isWitness ? (text || '') : (mechanicData.witness_story as string);

      if (claimantStory && witnessStory) {
        // Both submitted — auto-resolve: pass if both > 20 chars, fail if one is empty
        const passed = claimantStory.length > 20 && witnessStory.length > 20;
        const pointsAwarded = passed ? claim.points_awarded : 0;

        await supabase.from('claims').update({
          status: passed ? 'VOTE_PASSED' : 'VOTE_FAILED',
          resolved_at: new Date().toISOString(),
          points_awarded: pointsAwarded,
          mechanic_data: updatedData,
        }).eq('id', claim_id);

        if (passed) {
          const { data: claimant } = await supabase.from('room_players').select('score').eq('id', claim.room_player_id).single();
          if (claimant) await supabase.from('room_players').update({ score: claimant.score + pointsAwarded }).eq('id', claim.room_player_id);
        } else {
          const { data: claimant } = await supabase.from('room_players').select('score').eq('id', claim.room_player_id).single();
          if (claimant) await supabase.from('room_players').update({ score: claimant.score - FALSE_CLAIM_PENALTY }).eq('id', claim.room_player_id);
        }

        const verdictText = passed ? 'LEGIT' : 'BULLSHIT';
        sendPush({
          room_id: mission.room_id,
          title: '\u{2696}\u{FE0F} Verdict!',
          body: `\u{2696}\u{FE0F} The alibi check: ${verdictText}!`,
          data: { claim_id, verdict: verdictText },
          category: 'VERDICT',
        });

        return new Response(JSON.stringify({
          resolved: true, claim_status: passed ? 'VOTE_PASSED' : 'VOTE_FAILED', points_awarded: pointsAwarded,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ resolved: false, action: 'alibi_submitted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // HOT_SEAT: claimant answers rapid-fire questions
    if (effectiveAction === 'hot_seat_answer' && mechanic === 'hot_seat') {
      if (voter.id !== claim.room_player_id) {
        return new Response(JSON.stringify({ error: 'Only claimant answers hot seat' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const answers = (mechanicData.answers as string[]) || [];
      const questions = (mechanicData.questions as string[]) || [];
      answers.push(text || 'NO');

      const updatedData = { ...mechanicData, answers };
      await supabase.from('claims').update({ mechanic_data: updatedData }).eq('id', claim_id);

      // Resolve after 3 answers
      if (answers.length >= questions.length) {
        // Hot seat: pass if answered all 3 (any answer counts as "completed")
        const passed = answers.length >= 3;
        const pointsAwarded = passed ? claim.points_awarded : 0;

        await supabase.from('claims').update({
          status: passed ? 'VOTE_PASSED' : 'VOTE_FAILED',
          resolved_at: new Date().toISOString(),
          points_awarded: pointsAwarded,
          mechanic_data: { ...updatedData, answered_in_time: passed },
        }).eq('id', claim_id);

        if (passed) {
          const { data: claimant } = await supabase.from('room_players').select('score').eq('id', claim.room_player_id).single();
          if (claimant) await supabase.from('room_players').update({ score: claimant.score + pointsAwarded }).eq('id', claim.room_player_id);
        }

        const verdictText = passed ? 'LEGIT' : 'BULLSHIT';
        sendPush({
          room_id: mission.room_id,
          title: '\u{2696}\u{FE0F} Verdict!',
          body: `\u{2696}\u{FE0F} Hot Seat result: ${verdictText}!`,
          data: { claim_id, verdict: verdictText },
          category: 'VERDICT',
        });

        return new Response(JSON.stringify({
          resolved: true, claim_status: passed ? 'VOTE_PASSED' : 'VOTE_FAILED', points_awarded: pointsAwarded,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        resolved: false, action: 'hot_seat_answered', answers_count: answers.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CROWD_CHEER: player submits a 1-5 rating
    if (effectiveAction === 'rate' && mechanic === 'crowd_cheer') {
      if (voter.id === claim.room_player_id) {
        return new Response(JSON.stringify({ error: "Can't rate your own claim" }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ratings = (mechanicData.ratings as Array<{ player_id: string; rating: number }>) || [];
      if (ratings.some((r) => r.player_id === voter.id)) {
        return new Response(JSON.stringify({ error: 'Already rated' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ratingValue = Math.min(5, Math.max(1, rating || 3));
      ratings.push({ player_id: voter.id, rating: ratingValue });
      const updatedData = { ...mechanicData, ratings };
      await supabase.from('claims').update({ mechanic_data: updatedData }).eq('id', claim_id);

      // Check if all non-claimant players have rated
      const { count: totalPlayers } = await supabase
        .from('room_players')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', mission.room_id);
      const eligibleRaters = (totalPlayers ?? 0) - 1;

      if (ratings.length >= eligibleRaters) {
        const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        const passed = avgRating > 3;
        const pointsAwarded = passed ? claim.points_awarded : 0;

        await supabase.from('claims').update({
          status: passed ? 'VOTE_PASSED' : 'VOTE_FAILED',
          resolved_at: new Date().toISOString(),
          points_awarded: pointsAwarded,
          mechanic_data: { ...updatedData, average_rating: avgRating },
        }).eq('id', claim_id);

        if (passed) {
          const { data: claimant } = await supabase.from('room_players').select('score').eq('id', claim.room_player_id).single();
          if (claimant) await supabase.from('room_players').update({ score: claimant.score + pointsAwarded }).eq('id', claim.room_player_id);
        } else {
          const { data: claimant } = await supabase.from('room_players').select('score').eq('id', claim.room_player_id).single();
          if (claimant) await supabase.from('room_players').update({ score: claimant.score - FALSE_CLAIM_PENALTY }).eq('id', claim.room_player_id);
        }

        const verdictText = passed ? 'LEGIT' : 'BULLSHIT';
        sendPush({
          room_id: mission.room_id,
          title: '\u{2696}\u{FE0F} Verdict!',
          body: `\u{2696}\u{FE0F} Crowd says: ${avgRating.toFixed(1)}/5 — ${verdictText}!`,
          data: { claim_id, verdict: verdictText },
          category: 'VERDICT',
        });

        return new Response(JSON.stringify({
          resolved: true, claim_status: passed ? 'VOTE_PASSED' : 'VOTE_FAILED',
          points_awarded: pointsAwarded, average_rating: avgRating,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        resolved: false, action: 'rated', ratings_in: ratings.length, ratings_needed: eligibleRaters,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Standard vote path (with mechanic-specific resolution) ──

    // Can't vote on your own claim (except claimant actions handled above)
    if (voter.id === claim.room_player_id) {
      return new Response(JSON.stringify({ error: "Can't vote on your own claim" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For dictator: only the dictator can vote
    if (mechanic === 'dictator') {
      const dictatorId = mechanicData.dictator_id as string;
      if (voter.id !== dictatorId) {
        return new Response(JSON.stringify({ error: 'Only the dictator can vote' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // For volunteer_tribunal: only volunteers can vote
    if (mechanic === 'volunteer_tribunal') {
      const volunteers = (mechanicData.volunteers as string[]) || [];
      if (!volunteers.includes(voter.id)) {
        return new Response(JSON.stringify({ error: 'Only tribunal members can vote' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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

    // ── UNANIMOUS_OR_BUST: instant fail on first BULLSHIT ──
    if (mechanic === 'unanimous_or_bust' && vote === 'BULLSHIT') {
      await supabase.from('claims').update({
        status: 'VOTE_FAILED',
        resolved_at: new Date().toISOString(),
        points_awarded: 0,
      }).eq('id', claim_id);

      if (mission.type !== 'standing') {
        await supabase.from('missions').update({ status: 'FAILED' }).eq('id', claim.mission_id);
      }

      const { data: claimant } = await supabase.from('room_players').select('score').eq('id', claim.room_player_id).single();
      if (claimant) {
        await supabase.from('room_players').update({ score: claimant.score - FALSE_CLAIM_PENALTY }).eq('id', claim.room_player_id);
      }

      sendPush({
        room_id: mission.room_id,
        title: '\u{2696}\u{FE0F} Verdict!',
        body: '\u{2696}\u{FE0F} ONE dissenter! BULLSHIT — unanimous or bust!',
        data: { claim_id, verdict: 'BULLSHIT' },
        category: 'VERDICT',
      });

      return new Response(JSON.stringify({
        resolved: true, claim_status: 'VOTE_FAILED', points_awarded: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DICTATOR: resolve immediately on their single vote ──
    if (mechanic === 'dictator') {
      const accepted = vote === 'ACCEPT';
      const claimStatus = accepted ? 'VOTE_PASSED' : 'VOTE_FAILED';
      const pointsAwarded = accepted ? claim.points_awarded : 0;

      await supabase.from('claims').update({
        status: claimStatus,
        resolved_at: new Date().toISOString(),
        points_awarded: pointsAwarded,
      }).eq('id', claim_id);

      if (mission.type !== 'standing') {
        await supabase.from('missions').update({ status: accepted ? 'VERIFIED' : 'FAILED' }).eq('id', claim.mission_id);
      }

      const { data: claimant } = await supabase.from('room_players').select('score').eq('id', claim.room_player_id).single();
      if (claimant) {
        const newScore = accepted ? claimant.score + pointsAwarded : claimant.score - FALSE_CLAIM_PENALTY;
        await supabase.from('room_players').update({ score: newScore }).eq('id', claim.room_player_id);
      }

      const verdictText = accepted ? 'LEGIT' : 'BULLSHIT';
      sendPush({
        room_id: mission.room_id,
        title: '\u{2696}\u{FE0F} Verdict!',
        body: `\u{2696}\u{FE0F} The dictator says: ${verdictText}!`,
        data: { claim_id, verdict: verdictText },
        category: 'VERDICT',
      });

      return new Response(JSON.stringify({
        resolved: true, claim_status: claimStatus, points_awarded: pointsAwarded,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Count votes and check for resolution ──
    const { data: allVotes } = await supabase
      .from('votes')
      .select('vote, room_player_id')
      .eq('claim_id', claim_id);

    const voteCount = allVotes?.length ?? 0;

    // Determine how many voters are needed
    let eligibleVoters: number;
    if (mechanic === 'volunteer_tribunal') {
      const volunteers = (mechanicData.volunteers as string[]) || [];
      eligibleVoters = Math.max(volunteers.length, 1);
    } else {
      const { count: totalPlayers } = await supabase
        .from('room_players')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', mission.room_id);
      eligibleVoters = (totalPlayers ?? 0) - 1; // exclude claimant
    }

    let resolved = false;
    let claimStatus = claim.status;
    let pointsAwarded = 0;

    if (voteCount >= eligibleVoters) {
      resolved = true;

      let acceptCount = allVotes?.filter((v) => v.vote === 'ACCEPT').length ?? 0;
      let bullshitCount = allVotes?.filter((v) => v.vote === 'BULLSHIT').length ?? 0;

      // ── REVERSE_PSYCHOLOGY: flip all votes ──
      if (mechanic === 'reverse_psychology') {
        const temp = acceptCount;
        acceptCount = bullshitCount;
        bullshitCount = temp;
      }

      // ── THE_SKEPTIC: skeptic's vote counts triple ──
      if (mechanic === 'the_skeptic') {
        const skepticId = mechanicData.skeptic_id as string;
        const skepticVote = allVotes?.find((v) => v.room_player_id === skepticId);
        if (skepticVote) {
          // Add 2 extra for the skeptic (they already counted once)
          if (skepticVote.vote === 'ACCEPT') acceptCount += 2;
          else bullshitCount += 2;
        }
      }

      // ── PROXY_VOTE: votes are already cast as proxy, just count normally ──
      // (The vote insertion above already records the vote; the UI handles the "you're voting as X" aspect)

      const accepted = acceptCount >= bullshitCount; // ties favor claimant

      if (accepted) {
        claimStatus = 'VOTE_PASSED';
        pointsAwarded = claim.points_awarded;

        await supabase.from('claims').update({
          status: 'VOTE_PASSED', resolved_at: new Date().toISOString(),
        }).eq('id', claim_id);

        if (mission.type !== 'standing') {
          await supabase.from('missions').update({ status: 'VERIFIED' }).eq('id', claim.mission_id);
        }

        const { data: claimant } = await supabase.from('room_players').select('score').eq('id', claim.room_player_id).single();
        if (claimant) {
          await supabase.from('room_players').update({ score: claimant.score + pointsAwarded }).eq('id', claim.room_player_id);
        }
      } else {
        claimStatus = 'VOTE_FAILED';

        await supabase.from('claims').update({
          status: 'VOTE_FAILED', resolved_at: new Date().toISOString(), points_awarded: 0,
        }).eq('id', claim_id);

        if (mission.type !== 'standing') {
          await supabase.from('missions').update({ status: 'FAILED' }).eq('id', claim.mission_id);
        }

        const { data: claimant } = await supabase.from('room_players').select('score').eq('id', claim.room_player_id).single();
        if (claimant) {
          await supabase.from('room_players').update({ score: claimant.score - FALSE_CLAIM_PENALTY }).eq('id', claim.room_player_id);
        }
      }
    }

    // Push VERDICT notification when claim resolves
    if (resolved) {
      const verdictText = claimStatus === 'VOTE_PASSED' ? 'LEGIT' : 'BULLSHIT';
      sendPush({
        room_id: mission.room_id,
        title: '\u{2696}\u{FE0F} Verdict!',
        body: `\u{2696}\u{FE0F} The verdict is in: ${verdictText}!`,
        data: { claim_id, verdict: verdictText },
        category: 'VERDICT',
      });
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
