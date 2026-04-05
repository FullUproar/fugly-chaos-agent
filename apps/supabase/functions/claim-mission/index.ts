import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';
import { sendPush } from '../_shared/push.ts';

// ── Voting mechanics (inlined for Deno edge function compatibility) ──

type VotingMechanicId =
  | 'standard' | 'dictator' | 'pitch_it' | 'volunteer_tribunal'
  | 'reverse_psychology' | 'auction' | 'russian_roulette' | 'alibi'
  | 'the_bribe' | 'hot_seat' | 'proxy_vote' | 'unanimous_or_bust'
  | 'points_gamble' | 'crowd_cheer' | 'the_skeptic';

interface VotingMechanic {
  id: VotingMechanicId;
  name: string;
  description: string;
  reveal_text: string;
  chaos_level: 'chill' | 'moderate' | 'maximum';
  weight: number;
  auto_resolve: boolean;
}

const VOTING_MECHANICS: Record<VotingMechanicId, VotingMechanic> = {
  standard: { id: 'standard', name: 'Standard Vote', description: 'Everyone votes LEGIT or BULLSHIT. Majority rules.', reveal_text: 'The people will decide your fate.', chaos_level: 'chill', weight: 30, auto_resolve: false },
  dictator: { id: 'dictator', name: 'THE DICTATOR', description: 'One player has been chosen. Their word is law.', reveal_text: 'Democracy is overrated. ONE shall decide.', chaos_level: 'moderate', weight: 7, auto_resolve: false },
  pitch_it: { id: 'pitch_it', name: 'Pitch It', description: 'The claimant gets 15 seconds to make their case. Then you vote.', reveal_text: 'Convince us. You have 15 seconds.', chaos_level: 'chill', weight: 8, auto_resolve: false },
  volunteer_tribunal: { id: 'volunteer_tribunal', name: 'Volunteer Tribunal', description: 'Who wants to judge? First volunteers become the jury.', reveal_text: 'We need volunteers. Step forward or stay silent.', chaos_level: 'chill', weight: 7, auto_resolve: false },
  reverse_psychology: { id: 'reverse_psychology', name: 'Reverse Psychology', description: 'Vote normally... or did we flip everything?', reveal_text: "Cast your votes. Trust your instincts. Or don't.", chaos_level: 'maximum', weight: 5, auto_resolve: false },
  auction: { id: 'auction', name: 'The Auction', description: 'Bid your own points. Highest bidder decides the outcome.', reveal_text: 'How much is the truth worth to you?', chaos_level: 'moderate', weight: 5, auto_resolve: false },
  russian_roulette: { id: 'russian_roulette', name: 'Russian Roulette', description: 'No vote. The chaos gods decide. 50/50.', reveal_text: "Votes? Where we're going, we don't need votes.", chaos_level: 'maximum', weight: 4, auto_resolve: true },
  alibi: { id: 'alibi', name: 'The Alibi', description: 'Claimant and a random witness both tell the story. Do they match?', reveal_text: "Let's hear both sides. Separately.", chaos_level: 'moderate', weight: 6, auto_resolve: false },
  the_bribe: { id: 'the_bribe', name: 'The Bribe', description: 'The claimant can offer their own points to buy your silence.', reveal_text: "Everyone has a price. What's yours?", chaos_level: 'moderate', weight: 5, auto_resolve: false },
  hot_seat: { id: 'hot_seat', name: 'Hot Seat', description: '3 rapid-fire questions. Answer them all in 10 seconds or fail.', reveal_text: 'Three questions. Ten seconds. No hesitation.', chaos_level: 'moderate', weight: 5, auto_resolve: false },
  proxy_vote: { id: 'proxy_vote', name: 'Proxy Vote', description: 'You vote on behalf of the player to your LEFT. Think like them.', reveal_text: 'You are not yourself right now. Vote as your neighbor.', chaos_level: 'maximum', weight: 4, auto_resolve: false },
  unanimous_or_bust: { id: 'unanimous_or_bust', name: 'Unanimous or Bust', description: "ONE bullshit call and it's over. All or nothing.", reveal_text: 'This requires UNANIMOUS approval. One dissenter ends it.', chaos_level: 'maximum', weight: 4, auto_resolve: false },
  points_gamble: { id: 'points_gamble', name: 'Double or Nothing', description: 'No vote. Coin flip. Win double or lose it all.', reveal_text: 'Forget the vote. Let fate decide. Double or nothing.', chaos_level: 'maximum', weight: 4, auto_resolve: true },
  crowd_cheer: { id: 'crowd_cheer', name: 'Crowd Cheer', description: 'Rate it 1-5. Average above 3 and it passes.', reveal_text: 'Make some noise! Rate the performance.', chaos_level: 'chill', weight: 6, auto_resolve: false },
  the_skeptic: { id: 'the_skeptic', name: 'THE SKEPTIC', description: "One player's vote counts TRIPLE. Everyone else counts once.", reveal_text: 'One among you has been granted... extra authority.', chaos_level: 'moderate', weight: 6, auto_resolve: false },
};

const CHAOS_LEVEL_ORDER: Record<string, number> = { chill: 1, moderate: 2, maximum: 3 };

function selectMechanic(
  chaosComfort: 'chill' | 'moderate' | 'maximum',
  recentMechanics: VotingMechanicId[] = [],
): VotingMechanic {
  const comfortLevel = CHAOS_LEVEL_ORDER[chaosComfort] || 2;
  const lastThree = new Set(recentMechanics.slice(-3));
  const eligible = Object.values(VOTING_MECHANICS).filter(
    (m) => CHAOS_LEVEL_ORDER[m.chaos_level] <= comfortLevel && !lastThree.has(m.id)
  );
  if (eligible.length === 0) return VOTING_MECHANICS.standard;
  const totalWeight = eligible.reduce((sum, m) => sum + m.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const mechanic of eligible) {
    roll -= mechanic.weight;
    if (roll <= 0) return mechanic;
  }
  return eligible[eligible.length - 1];
}

const HOT_SEAT_QUESTIONS = [
  'Did you actually do it?', "Would you swear on Fugly's honor?", 'Can anyone back you up?',
  'Did anyone see you?', 'Are you sweating right now?', 'Would you bet 20 points on it?',
  'Is this the whole truth?', 'Did you practice this?', 'Would you do it again?',
  'Are you making eye contact right now?', 'Can you say that with a straight face?',
  'Is there video evidence?', 'Did you hesitate before claiming?', 'Would Fugly approve?',
  'Are you proud of yourself?', 'Did anyone try to stop you?', 'Is this your first offense?',
  'Can you demonstrate right now?', 'Were there any witnesses?', 'Do you feel lucky?',
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
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

    const { mission_id } = await req.json();
    const supabase = getAdminClient();

    // Fetch mission
    const { data: mission } = await supabase
      .from('missions')
      .select('id, room_id, room_player_id, points, status, type, flash_type, expires_at, title')
      .eq('id', mission_id)
      .single();

    if (!mission) {
      return new Response(JSON.stringify({ error: 'Mission not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify player is in the room
    const { data: roomPlayer } = await supabase
      .from('room_players')
      .select('id, nickname')
      .eq('room_id', mission.room_id)
      .eq('player_id', userId)
      .single();

    if (!roomPlayer) {
      return new Response(JSON.stringify({ error: 'Not in this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this player already has a pending/challenged claim in this room
    // Flash missions bypass this check — they're time-sensitive and urgent
    if (mission.type === 'standing') {
      const { data: pendingClaims } = await supabase
        .from('claims')
        .select('id, missions!inner(room_id)')
        .eq('room_player_id', roomPlayer.id)
        .in('status', ['PENDING', 'CHALLENGED'])
        .eq('missions.room_id', mission.room_id);

      if (pendingClaims && pendingClaims.length > 0) {
        return new Response(JSON.stringify({ error: 'You have a pending claim — wait for it to resolve' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- STANDING MISSIONS ---
    if (mission.type === 'standing') {
      if (mission.status !== 'REVEALED') {
        return new Response(JSON.stringify({ error: 'Mission not claimable' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if there's already an unresolved claim on this standing mission (cooldown)
      const { data: activeClaim } = await supabase
        .from('claims')
        .select('id, room_player_id, claimed_at')
        .eq('mission_id', mission_id)
        .in('status', ['PENDING', 'CHALLENGED'])
        .order('claimed_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (activeClaim) {
        // There's an active claim — check for tie-break (within 2 seconds = "simultaneous")
        const activeClaimed = new Date(activeClaim.claimed_at).getTime();
        const now = Date.now();
        const timeDiff = now - activeClaimed;

        if (timeDiff < 2000 && activeClaim.room_player_id !== roomPlayer.id) {
          // Coin flip tie-break!
          const coinFlip = Math.random() < 0.5;
          if (coinFlip) {
            // New claimant wins the flip — delete the old claim and create new one
            await supabase.from('claims').delete().eq('id', activeClaim.id);
            // Fall through to create the new claim below
          } else {
            // Existing claim wins
            return new Response(JSON.stringify({
              error: 'Beat you by a coin flip!',
              locked_by: activeClaim.room_player_id,
            }), {
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else if (activeClaim.room_player_id === roomPlayer.id) {
          return new Response(JSON.stringify({ error: 'You already claimed this — waiting for votes' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Not a tie — mission is locked by someone else
          return new Response(JSON.stringify({
            error: 'Mission locked — vote on the active claim first',
            locked_by: activeClaim.room_player_id,
          }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // ── Select voting mechanic ──
      const { data: room } = await supabase
        .from('rooms')
        .select('recent_mechanics')
        .eq('id', mission.room_id)
        .single();

      // Determine room's aggregate chaos comfort from setup_answers majority
      const { data: allRoomPlayers } = await supabase
        .from('room_players')
        .select('setup_answers')
        .eq('room_id', mission.room_id);

      const comfortVotes: Record<string, number> = { chill: 0, moderate: 0, maximum: 0 };
      for (const rp of allRoomPlayers ?? []) {
        const ans = rp.setup_answers as { chaos_comfort?: string } | null;
        if (ans?.chaos_comfort) comfortVotes[ans.chaos_comfort] = (comfortVotes[ans.chaos_comfort] || 0) + 1;
      }
      const chaosComfort = (Object.entries(comfortVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'moderate') as 'chill' | 'moderate' | 'maximum';

      const recentMechanics = (room?.recent_mechanics ?? []) as VotingMechanicId[];
      const selectedMechanic = selectMechanic(chaosComfort, recentMechanics);

      // Get all non-claimant players for role assignment
      const otherPlayers = (allRoomPlayers ?? [])
        .map((_rp: Record<string, unknown>, _i: number) => null); // placeholder; re-query with ids
      const { data: roomPlayersWithIds } = await supabase
        .from('room_players')
        .select('id, nickname')
        .eq('room_id', mission.room_id)
        .neq('id', roomPlayer.id);

      const otherPlayerIds = (roomPlayersWithIds ?? []).map((p: { id: string }) => p.id);

      // Build mechanic_data based on selected mechanic
      let mechanicData: Record<string, unknown> = {};

      if (selectedMechanic.id === 'russian_roulette') {
        // Auto-resolve: coin flip
        const result = Math.random() < 0.5;
        mechanicData = { result };
      } else if (selectedMechanic.id === 'points_gamble') {
        // Auto-resolve: coin flip, double or nothing
        const result = Math.random() < 0.5;
        mechanicData = { wager: mission.points, result };
      } else if (selectedMechanic.id === 'dictator') {
        const dictatorId = otherPlayerIds[Math.floor(Math.random() * otherPlayerIds.length)];
        mechanicData = { dictator_id: dictatorId };
      } else if (selectedMechanic.id === 'the_skeptic') {
        const skepticId = otherPlayerIds[Math.floor(Math.random() * otherPlayerIds.length)];
        mechanicData = { skeptic_id: skepticId };
      } else if (selectedMechanic.id === 'alibi') {
        const witnessId = otherPlayerIds[Math.floor(Math.random() * otherPlayerIds.length)];
        mechanicData = { witness_id: witnessId, claimant_story: null, witness_story: null };
      } else if (selectedMechanic.id === 'hot_seat') {
        mechanicData = { questions: pickRandom(HOT_SEAT_QUESTIONS, 3), answers: [] };
      } else if (selectedMechanic.id === 'proxy_vote') {
        // Each player votes as the player to their left (by join order)
        const allSorted = await supabase
          .from('room_players')
          .select('id')
          .eq('room_id', mission.room_id)
          .neq('id', roomPlayer.id)
          .order('joined_at');
        const sorted = (allSorted.data ?? []).map((p: { id: string }) => p.id);
        const proxyMap: Record<string, string> = {};
        for (let i = 0; i < sorted.length; i++) {
          proxyMap[sorted[i]] = sorted[(i + 1) % sorted.length];
        }
        mechanicData = { proxy_map: proxyMap };
      } else if (selectedMechanic.id === 'volunteer_tribunal') {
        mechanicData = { volunteers: [] };
      } else if (selectedMechanic.id === 'auction') {
        mechanicData = { bids: [] };
      } else if (selectedMechanic.id === 'the_bribe') {
        mechanicData = { offered_points: null };
      } else if (selectedMechanic.id === 'crowd_cheer') {
        mechanicData = { ratings: [] };
      } else if (selectedMechanic.id === 'reverse_psychology') {
        mechanicData = { flipped: true };
      } else if (selectedMechanic.id === 'unanimous_or_bust') {
        mechanicData = {};
      }

      // Create claim with mechanic info
      const { data: claim, error: claimError } = await supabase
        .from('claims')
        .insert({
          mission_id,
          room_player_id: roomPlayer.id,
          points_awarded: mission.points,
          voting_mechanic: selectedMechanic.id,
          mechanic_data: mechanicData,
        })
        .select('id, claimed_at')
        .single();

      if (claimError) throw claimError;

      // Handle auto-resolve mechanics
      if (selectedMechanic.auto_resolve) {
        if (selectedMechanic.id === 'russian_roulette') {
          const passed = (mechanicData as { result: boolean }).result;
          await supabase.from('claims').update({
            status: passed ? 'VOTE_PASSED' : 'VOTE_FAILED',
            resolved_at: new Date().toISOString(),
            points_awarded: passed ? mission.points : 0,
          }).eq('id', claim.id);

          if (passed) {
            const { data: claimant } = await supabase.from('room_players').select('score').eq('id', roomPlayer.id).single();
            if (claimant) await supabase.from('room_players').update({ score: claimant.score + mission.points }).eq('id', roomPlayer.id);
          }
        } else if (selectedMechanic.id === 'points_gamble') {
          const won = (mechanicData as { result: boolean }).result;
          const pointsDelta = won ? mission.points * 2 : 0;
          await supabase.from('claims').update({
            status: won ? 'VOTE_PASSED' : 'VOTE_FAILED',
            resolved_at: new Date().toISOString(),
            points_awarded: pointsDelta,
          }).eq('id', claim.id);

          const { data: claimant } = await supabase.from('room_players').select('score').eq('id', roomPlayer.id).single();
          if (claimant) {
            const newScore = won ? claimant.score + pointsDelta : Math.max(0, claimant.score - mission.points);
            await supabase.from('room_players').update({ score: newScore }).eq('id', roomPlayer.id);
          }
        }
      }

      // Update room's recent_mechanics
      const updatedRecent = [...recentMechanics, selectedMechanic.id].slice(-5);
      await supabase.from('rooms').update({ recent_mechanics: updatedRecent }).eq('id', mission.room_id);

      // Push CLAIM notification to all other players
      sendPush({
        room_id: mission.room_id,
        exclude_player_id: userId,
        title: '\u{1F3AF} Claim!',
        body: `\u{1F3AF} ${roomPlayer.nickname} claims "${mission.title}" \u{2014} LEGIT or BULLSHIT?`,
        data: { claim_id: claim.id, mission_id: mission.id },
        category: 'CLAIM',
      });

      const mechanicResponse = {
        id: selectedMechanic.id,
        name: selectedMechanic.name,
        description: selectedMechanic.description,
        reveal_text: selectedMechanic.reveal_text,
        data: mechanicData,
      };

      return new Response(JSON.stringify({
        claim_id: claim.id,
        claimed_at: claim.claimed_at,
        mechanic: mechanicResponse,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- FLASH MISSIONS ---
    if (mission.type === 'flash') {
      // Check expiry
      if (mission.expires_at && new Date(mission.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Mission has expired' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (mission.status !== 'REVEALED') {
        return new Response(JSON.stringify({ error: 'Mission already claimed or expired' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Race missions: first claim wins
      if (mission.flash_type === 'race') {
        const { data: existingClaim } = await supabase
          .from('claims')
          .select('id')
          .eq('mission_id', mission_id)
          .limit(1)
          .maybeSingle();

        if (existingClaim) {
          return new Response(JSON.stringify({ error: 'Already claimed by another player' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // ── Select voting mechanic for flash ──
      const { data: flashRoom } = await supabase
        .from('rooms')
        .select('recent_mechanics')
        .eq('id', mission.room_id)
        .single();

      const { data: flashRoomPlayers } = await supabase
        .from('room_players')
        .select('id, setup_answers')
        .eq('room_id', mission.room_id);

      const flashComfortVotes: Record<string, number> = { chill: 0, moderate: 0, maximum: 0 };
      for (const rp of flashRoomPlayers ?? []) {
        const ans = rp.setup_answers as { chaos_comfort?: string } | null;
        if (ans?.chaos_comfort) flashComfortVotes[ans.chaos_comfort] = (flashComfortVotes[ans.chaos_comfort] || 0) + 1;
      }
      const flashChaosComfort = (Object.entries(flashComfortVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'moderate') as 'chill' | 'moderate' | 'maximum';

      const flashRecentMechanics = (flashRoom?.recent_mechanics ?? []) as VotingMechanicId[];
      const flashMechanic = selectMechanic(flashChaosComfort, flashRecentMechanics);

      const flashOtherPlayers = (flashRoomPlayers ?? []).filter((p: { id: string }) => p.id !== roomPlayer.id).map((p: { id: string }) => p.id);

      let flashMechanicData: Record<string, unknown> = {};
      if (flashMechanic.id === 'russian_roulette') {
        flashMechanicData = { result: Math.random() < 0.5 };
      } else if (flashMechanic.id === 'points_gamble') {
        flashMechanicData = { wager: mission.points, result: Math.random() < 0.5 };
      } else if (flashMechanic.id === 'dictator') {
        flashMechanicData = { dictator_id: flashOtherPlayers[Math.floor(Math.random() * flashOtherPlayers.length)] };
      } else if (flashMechanic.id === 'the_skeptic') {
        flashMechanicData = { skeptic_id: flashOtherPlayers[Math.floor(Math.random() * flashOtherPlayers.length)] };
      } else if (flashMechanic.id === 'alibi') {
        flashMechanicData = { witness_id: flashOtherPlayers[Math.floor(Math.random() * flashOtherPlayers.length)], claimant_story: null, witness_story: null };
      } else if (flashMechanic.id === 'hot_seat') {
        flashMechanicData = { questions: pickRandom(HOT_SEAT_QUESTIONS, 3), answers: [] };
      } else if (flashMechanic.id === 'proxy_vote') {
        const sorted = flashOtherPlayers;
        const proxyMap: Record<string, string> = {};
        for (let i = 0; i < sorted.length; i++) proxyMap[sorted[i]] = sorted[(i + 1) % sorted.length];
        flashMechanicData = { proxy_map: proxyMap };
      } else if (flashMechanic.id === 'volunteer_tribunal') {
        flashMechanicData = { volunteers: [] };
      } else if (flashMechanic.id === 'auction') {
        flashMechanicData = { bids: [] };
      } else if (flashMechanic.id === 'the_bribe') {
        flashMechanicData = { offered_points: null };
      } else if (flashMechanic.id === 'crowd_cheer') {
        flashMechanicData = { ratings: [] };
      } else if (flashMechanic.id === 'reverse_psychology') {
        flashMechanicData = { flipped: true };
      }

      // Create claim and mark mission as CLAIMED
      const { data: claim, error: claimError } = await supabase
        .from('claims')
        .insert({
          mission_id,
          room_player_id: roomPlayer.id,
          points_awarded: mission.points,
          voting_mechanic: flashMechanic.id,
          mechanic_data: flashMechanicData,
        })
        .select('id, claimed_at')
        .single();

      if (claimError) throw claimError;

      await supabase
        .from('missions')
        .update({ status: 'CLAIMED' })
        .eq('id', mission_id);

      // Handle auto-resolve for flash
      if (flashMechanic.auto_resolve) {
        const passed = (flashMechanicData as { result: boolean }).result;
        const pointsDelta = flashMechanic.id === 'points_gamble' ? (passed ? mission.points * 2 : 0) : (passed ? mission.points : 0);
        await supabase.from('claims').update({
          status: passed ? 'VOTE_PASSED' : 'VOTE_FAILED',
          resolved_at: new Date().toISOString(),
          points_awarded: pointsDelta,
        }).eq('id', claim.id);

        const { data: claimant } = await supabase.from('room_players').select('score').eq('id', roomPlayer.id).single();
        if (claimant) {
          const newScore = passed ? claimant.score + pointsDelta : (flashMechanic.id === 'points_gamble' ? Math.max(0, claimant.score - mission.points) : claimant.score);
          await supabase.from('room_players').update({ score: newScore }).eq('id', roomPlayer.id);
        }
      }

      // Update room's recent_mechanics
      const flashUpdatedRecent = [...flashRecentMechanics, flashMechanic.id].slice(-5);
      await supabase.from('rooms').update({ recent_mechanics: flashUpdatedRecent }).eq('id', mission.room_id);

      // Push CLAIM notification to all other players
      sendPush({
        room_id: mission.room_id,
        exclude_player_id: userId,
        title: '\u{1F3AF} Claim!',
        body: `\u{1F3AF} ${roomPlayer.nickname} claims "${mission.title}" \u{2014} LEGIT or BULLSHIT?`,
        data: { claim_id: claim.id, mission_id: mission.id },
        category: 'CLAIM',
      });

      return new Response(JSON.stringify({
        claim_id: claim.id,
        claimed_at: claim.claimed_at,
        mechanic: {
          id: flashMechanic.id,
          name: flashMechanic.name,
          description: flashMechanic.description,
          reveal_text: flashMechanic.reveal_text,
          data: flashMechanicData,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown mission type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
