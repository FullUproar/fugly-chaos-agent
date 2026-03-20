import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';
import { sendPushToPlayer } from '../_shared/push.ts';

const COOLDOWN_MS = 30_000;

const TIER_1 = [
  'Votes are open...',
  "Whenever you're ready...",
  'No rush... okay maybe a little rush',
  "Just saying, we're here...",
  'The clock is ticking...',
  'Hello? Anyone home?',
];

const TIER_2 = [
  "WE'RE WAITING...",
  'The table is staring at you',
  'Your phone is literally in your hand',
  "The suspense isn't killing us, YOU are",
  'Did you fall asleep?',
  "This isn't a democracy if nobody votes",
];

const TIER_3 = [
  'VOTE OR WE RIOT',
  'The chaos gods grow impatient',
  'This is your final warning',
  'We will remember this betrayal',
  'The council demands your answer',
];

const TIER_4 = [
  '...',
  '\u{1F480}',
  'The void stares back',
  'Chaos Agent is disappointed in you',
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTierMessage(nudgeCount: number): { message: string; tier: number } {
  if (nudgeCount <= 2) return { message: pickRandom(TIER_1), tier: 1 };
  if (nudgeCount <= 4) return { message: pickRandom(TIER_2), tier: 2 };
  if (nudgeCount <= 6) return { message: pickRandom(TIER_3), tier: 3 };
  return { message: pickRandom(TIER_4), tier: 4 };
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

    const { claim_id } = await req.json();

    if (!claim_id) {
      return new Response(JSON.stringify({ error: 'claim_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Get the claim and its room
    const { data: claim } = await supabase
      .from('claims')
      .select('id, room_player_id, mission_id, status')
      .eq('id', claim_id)
      .single();

    if (!claim) {
      return new Response(JSON.stringify({ error: 'Claim not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (claim.status !== 'PENDING') {
      return new Response(JSON.stringify({ error: 'Claim is no longer pending' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the mission to find room_id
    const { data: mission } = await supabase
      .from('missions')
      .select('room_id')
      .eq('id', claim.mission_id)
      .single();

    if (!mission) {
      return new Response(JSON.stringify({ error: 'Mission not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the caller's room_player
    const { data: roomPlayer } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', mission.room_id)
      .eq('player_id', userId)
      .single();

    if (!roomPlayer) {
      return new Response(JSON.stringify({ error: 'Not in this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate: caller must be the claimant OR have already voted
    const isClaimant = claim.room_player_id === roomPlayer.id;
    if (!isClaimant) {
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('claim_id', claim_id)
        .eq('room_player_id', roomPlayer.id)
        .single();

      if (!existingVote) {
        return new Response(JSON.stringify({ error: 'You must vote before nudging' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check cooldown: find the most recent nudge signal from this player for this claim
    const { data: recentNudges } = await supabase
      .from('signals')
      .select('id, created_at')
      .eq('room_id', mission.room_id)
      .eq('room_player_id', roomPlayer.id)
      .eq('signal_type', 'nudge')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentNudges && recentNudges.length > 0) {
      const lastNudge = new Date(recentNudges[0].created_at).getTime();
      const elapsed = Date.now() - lastNudge;
      if (elapsed < COOLDOWN_MS) {
        const cooldownRemaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        return new Response(JSON.stringify({
          error: 'Cooldown active',
          cooldown_remaining: cooldownRemaining,
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Count total nudges for this claim (from all players) to determine tier
    const { count: totalNudges } = await supabase
      .from('signals')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', mission.room_id)
      .eq('signal_type', 'nudge');

    const nudgeCount = (totalNudges ?? 0) + 1;
    const { message, tier } = getTierMessage(nudgeCount);

    // Insert nudge signal with claim_id in metadata
    const { data: signal, error: signalError } = await supabase
      .from('signals')
      .insert({
        room_id: mission.room_id,
        room_player_id: roomPlayer.id,
        signal_type: 'nudge',
        target_player_id: null,
        metadata: { claim_id },
      })
      .select('id')
      .single();

    if (signalError) throw signalError;

    // Push NUDGE to players who haven't voted yet
    const { data: allPlayers } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', mission.room_id)
      .neq('id', claim.room_player_id); // exclude claimant

    const { data: existingVotes } = await supabase
      .from('votes')
      .select('room_player_id')
      .eq('claim_id', claim_id);

    const votedIds = new Set((existingVotes ?? []).map((v: { room_player_id: string }) => v.room_player_id));
    const nonVoters = (allPlayers ?? []).filter((p: { id: string }) => !votedIds.has(p.id));

    for (const player of nonVoters) {
      sendPushToPlayer(
        player.id,
        '\u{1F440} Nudge!',
        `\u{1F440} ${message}`,
        { claim_id, tier },
        'NUDGE',
      );
    }

    return new Response(JSON.stringify({
      nudge_id: signal.id,
      message,
      tier,
      cooldown_remaining: COOLDOWN_MS / 1000,
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
