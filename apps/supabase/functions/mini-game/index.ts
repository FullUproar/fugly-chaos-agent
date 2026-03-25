import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

/**
 * Mini-game lifecycle handler.
 * Actions: start, submit, vote, advance, state
 */
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
    const { action } = body;
    const supabase = getAdminClient();

    // Find caller's room_player
    const findRoomPlayer = async (roomId: string) => {
      const { data } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', roomId)
        .eq('player_id', userId)
        .single();
      return data?.id ?? null;
    };

    switch (action) {
      // ---- START a mini-game ----
      case 'start': {
        const { room_id, game_type, prompt, points, submission_time_sec, voting_time_sec, target_player_id } = body;

        const roomPlayerId = await findRoomPlayer(room_id);
        if (!roomPlayerId) {
          return respond({ error: 'Not in this room' }, 403);
        }

        // Close any active mini-game
        await supabase
          .from('mini_games')
          .update({ status: 'CLOSED' })
          .eq('room_id', room_id)
          .neq('status', 'CLOSED');

        const phaseEndsAt = new Date(Date.now() + (submission_time_sec ?? 45) * 1000).toISOString();
        const resolvedGameType = game_type ?? 'caption';

        // --- Select a variation ---
        // Fetch recent variations for anti-repetition
        const { data: recentGames } = await supabase
          .from('mini_games')
          .select('variation')
          .eq('room_id', room_id)
          .order('created_at', { ascending: false })
          .limit(5);
        const recentVariations = (recentGames ?? []).map((g: any) => g.variation).filter(Boolean);

        // Inline selectVariation logic (shared constants can't be imported in edge functions)
        const VARIATIONS: Record<string, { id: string; name: string; reveal_text: string; applicable_to: string[]; weight: number }> = {
          standard: { id: 'standard', name: 'Standard Vote', reveal_text: 'Vote for your favorite.', applicable_to: ['drawing', 'caption', 'hot_take', 'lie_detector'], weight: 25 },
          worst_wins: { id: 'worst_wins', name: 'WORST WINS', reveal_text: 'The worse it is, the better.', applicable_to: ['drawing', 'caption'], weight: 10 },
          the_editor: { id: 'the_editor', name: 'THE EDITOR', reveal_text: 'One critic. One opinion. No appeals.', applicable_to: ['drawing', 'caption'], weight: 8 },
          blind_swap: { id: 'blind_swap', name: 'Blind Swap', reveal_text: 'Judge the work, not the person.', applicable_to: ['drawing', 'caption'], weight: 8 },
          mashup: { id: 'mashup', name: 'MASHUP', reveal_text: 'What if we... combined them?', applicable_to: ['caption'], weight: 6 },
          double_down: { id: 'double_down', name: 'Double Down', reveal_text: 'The minority report pays double.', applicable_to: ['hot_take'], weight: 8 },
          the_reveal: { id: 'the_reveal', name: 'THE REVEAL', reveal_text: 'Explain yourself.', applicable_to: ['hot_take'], weight: 7 },
          confidence_bet: { id: 'confidence_bet', name: 'Confidence Bet', reveal_text: 'Put your points where your mouth is.', applicable_to: ['lie_detector', 'hot_take'], weight: 8 },
          interrogation: { id: 'interrogation', name: 'INTERROGATION', reveal_text: 'Two questions. Choose wisely.', applicable_to: ['lie_detector'], weight: 8 },
          artists_choice: { id: 'artists_choice', name: "Artist's Choice", reveal_text: "Appreciate someone else's chaos.", applicable_to: ['drawing'], weight: 7 },
          crowd_favorite: { id: 'crowd_favorite', name: 'Crowd Favorite', reveal_text: 'Rate the performance.', applicable_to: ['drawing', 'caption', 'hot_take', 'lie_detector'], weight: 8 },
          sabotage: { id: 'sabotage', name: 'SABOTAGE', reveal_text: "Something doesn't feel right...", applicable_to: ['drawing', 'caption'], weight: 5 },
        };

        const lastThree = new Set(recentVariations.slice(-3));
        const eligible = Object.values(VARIATIONS).filter(
          (v) => v.applicable_to.includes(resolvedGameType) && !lastThree.has(v.id),
        );
        let selectedVariation = VARIATIONS.standard;
        if (eligible.length > 0) {
          const totalWeight = eligible.reduce((sum, v) => sum + v.weight, 0);
          let roll = Math.random() * totalWeight;
          for (const v of eligible) {
            roll -= v.weight;
            if (roll <= 0) { selectedVariation = v; break; }
          }
          if (roll > 0) selectedVariation = eligible[eligible.length - 1];
        }

        // Build variation_data based on selected variation
        const variationData: Record<string, unknown> = {};

        if (selectedVariation.id === 'the_editor') {
          // Pick a random player as judge
          const { data: players } = await supabase
            .from('room_players')
            .select('id, nickname')
            .eq('room_id', room_id);
          if (players && players.length > 0) {
            const judge = players[Math.floor(Math.random() * players.length)];
            variationData.editor_player_id = judge.id;
            variationData.editor_nickname = judge.nickname;
          }
        }

        if (selectedVariation.id === 'blind_swap') {
          // Create a shuffle mapping at vote time (stored as flag; actual shuffle happens when voting starts)
          variationData.shuffle_pending = true;
        }

        if (selectedVariation.id === 'sabotage') {
          // Pick a random saboteur
          const { data: players } = await supabase
            .from('room_players')
            .select('id, nickname')
            .eq('room_id', room_id);
          if (players && players.length > 0) {
            const saboteur = players[Math.floor(Math.random() * players.length)];
            variationData.saboteur_player_id = saboteur.id;
            variationData.saboteur_nickname = saboteur.nickname;
          }
        }

        if (selectedVariation.id === 'mashup') {
          variationData.mashup_pending = true;
        }

        const { data: game, error: gameError } = await supabase
          .from('mini_games')
          .insert({
            room_id,
            game_type: resolvedGameType,
            prompt: prompt ?? 'Be creative!',
            points: points ?? 20,
            status: 'SUBMITTING',
            phase_ends_at: phaseEndsAt,
            target_player_id: target_player_id ?? null,
            variation: selectedVariation.id,
            variation_data: variationData,
          })
          .select('id, game_type, prompt, status, points, phase_ends_at, variation, variation_data')
          .single();

        if (gameError) throw gameError;

        return respond({
          mini_game: game,
          variation: {
            id: selectedVariation.id,
            name: selectedVariation.name,
            reveal_text: selectedVariation.reveal_text,
          },
        });
      }

      // ---- SUBMIT an answer ----
      case 'submit': {
        const { mini_game_id, content } = body;

        const { data: game } = await supabase
          .from('mini_games')
          .select('id, room_id, status')
          .eq('id', mini_game_id)
          .single();

        if (!game) return respond({ error: 'Mini-game not found' }, 404);
        if (game.status !== 'SUBMITTING') return respond({ error: 'Submissions closed' }, 400);

        const roomPlayerId = await findRoomPlayer(game.room_id);
        if (!roomPlayerId) return respond({ error: 'Not in this room' }, 403);

        const { error: subError } = await supabase
          .from('mini_game_submissions')
          .upsert({
            mini_game_id,
            room_player_id: roomPlayerId,
            content: content ?? '',
          }, { onConflict: 'mini_game_id,room_player_id' });

        if (subError) throw subError;

        return respond({ submitted: true });
      }

      // ---- VOTE for a submission ----
      case 'vote': {
        const { mini_game_id, submission_id } = body;

        const { data: game } = await supabase
          .from('mini_games')
          .select('id, room_id, status')
          .eq('id', mini_game_id)
          .single();

        if (!game) return respond({ error: 'Mini-game not found' }, 404);
        if (game.status !== 'VOTING') return respond({ error: 'Not in voting phase' }, 400);

        const roomPlayerId = await findRoomPlayer(game.room_id);
        if (!roomPlayerId) return respond({ error: 'Not in this room' }, 403);

        const { error: voteError } = await supabase
          .from('mini_game_votes')
          .upsert({
            mini_game_id,
            room_player_id: roomPlayerId,
            voted_for_submission_id: submission_id,
          }, { onConflict: 'mini_game_id,room_player_id' });

        if (voteError) throw voteError;

        // Check if all players voted
        const { count: totalPlayers } = await supabase
          .from('room_players')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', game.room_id);

        const { count: totalVotes } = await supabase
          .from('mini_game_votes')
          .select('id', { count: 'exact', head: true })
          .eq('mini_game_id', mini_game_id);

        // Auto-advance to results if all voted
        if ((totalVotes ?? 0) >= (totalPlayers ?? 0)) {
          await resolveGame(supabase, mini_game_id);
        }

        return respond({ voted: true });
      }

      // ---- ADVANCE phase (host or auto) ----
      case 'advance': {
        const { mini_game_id } = body;

        const { data: game } = await supabase
          .from('mini_games')
          .select('id, room_id, status, game_type')
          .eq('id', mini_game_id)
          .single();

        if (!game) return respond({ error: 'Mini-game not found' }, 404);

        if (game.status === 'SUBMITTING') {
          // Move to voting (or results for hot_takes)
          if (game.game_type === 'hot_take') {
            await resolveHotTake(supabase, mini_game_id);
            return respond({ phase: 'RESULTS' });
          }

          const { count: subs } = await supabase
            .from('mini_game_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('mini_game_id', mini_game_id);

          if ((subs ?? 0) < 2) {
            return respond({ error: 'Need at least 2 submissions to vote' }, 400);
          }

          await supabase
            .from('mini_games')
            .update({
              status: 'VOTING',
              phase_ends_at: new Date(Date.now() + 30 * 1000).toISOString(),
            })
            .eq('id', mini_game_id);

          return respond({ phase: 'VOTING' });
        }

        if (game.status === 'VOTING') {
          await resolveGame(supabase, mini_game_id);
          return respond({ phase: 'RESULTS' });
        }

        if (game.status === 'RESULTS') {
          await supabase
            .from('mini_games')
            .update({ status: 'CLOSED' })
            .eq('id', mini_game_id);
          return respond({ phase: 'CLOSED' });
        }

        return respond({ error: 'Cannot advance from this phase' }, 400);
      }

      // ---- GET STATE ----
      case 'state': {
        const { room_id } = body;

        const roomPlayerId = await findRoomPlayer(room_id);
        if (!roomPlayerId) return respond({ error: 'Not in this room' }, 403);

        // Get active mini-game
        const { data: game } = await supabase
          .from('mini_games')
          .select('*')
          .eq('room_id', room_id)
          .neq('status', 'CLOSED')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!game) return respond({ active: false });

        // Auto-advance if phase expired
        if (game.phase_ends_at && new Date(game.phase_ends_at) < new Date()) {
          if (game.status === 'SUBMITTING') {
            if (game.game_type === 'hot_take') {
              await resolveHotTake(supabase, game.id);
            } else {
              const { count: subs } = await supabase
                .from('mini_game_submissions')
                .select('id', { count: 'exact', head: true })
                .eq('mini_game_id', game.id);

              if ((subs ?? 0) >= 2) {
                await supabase
                  .from('mini_games')
                  .update({
                    status: 'VOTING',
                    phase_ends_at: new Date(Date.now() + 30 * 1000).toISOString(),
                  })
                  .eq('id', game.id);
                game.status = 'VOTING';
              } else {
                await supabase.from('mini_games').update({ status: 'CLOSED' }).eq('id', game.id);
                return respond({ active: false });
              }
            }
          } else if (game.status === 'VOTING') {
            await resolveGame(supabase, game.id);
            game.status = 'RESULTS';
          }
        }

        // Get submissions
        const { data: submissions } = await supabase
          .from('mini_game_submissions')
          .select('id, room_player_id, content, submitted_at')
          .eq('mini_game_id', game.id);

        // Get votes
        const { data: votes } = await supabase
          .from('mini_game_votes')
          .select('room_player_id, voted_for_submission_id')
          .eq('mini_game_id', game.id);

        // Get my submission
        const mySubmission = (submissions ?? []).find(s => s.room_player_id === roomPlayerId);

        // During voting, hide who submitted what (anonymous)
        const anonSubmissions = game.status === 'VOTING'
          ? (submissions ?? []).map(s => ({ id: s.id, content: s.content }))
          : submissions;

        // Get player nicknames for results
        let submissionNicknames: Record<string, string> = {};
        if (game.status === 'RESULTS' || game.status === 'CLOSED') {
          const playerIds = (submissions ?? []).map(s => s.room_player_id);
          const { data: players } = await supabase
            .from('room_players')
            .select('id, nickname')
            .in('id', playerIds);
          for (const p of players ?? []) {
            submissionNicknames[p.id] = p.nickname;
          }
        }

        // Get winner nickname
        let winnerNickname: string | null = null;
        if (game.winner_room_player_id) {
          const { data: winner } = await supabase
            .from('room_players')
            .select('nickname')
            .eq('id', game.winner_room_player_id)
            .single();
          winnerNickname = winner?.nickname ?? null;
        }

        return respond({
          active: true,
          game: {
            id: game.id,
            game_type: game.game_type,
            prompt: game.prompt,
            status: game.status,
            points: game.points,
            phase_ends_at: game.phase_ends_at,
            winner_nickname: winnerNickname,
            variation: game.variation ?? 'standard',
            variation_data: game.variation_data ?? {},
          },
          submissions: anonSubmissions ?? [],
          submission_nicknames: submissionNicknames,
          votes: votes ?? [],
          my_submission: mySubmission?.content ?? null,
          my_vote: (votes ?? []).find(v => v.room_player_id === roomPlayerId)?.voted_for_submission_id ?? null,
        });
      }

      default:
        return respond({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return respond({ error: (err as Error).message }, 500);
  }
});

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function resolveGame(supabase: any, miniGameId: string) {
  // Count votes per submission
  const { data: votes } = await supabase
    .from('mini_game_votes')
    .select('voted_for_submission_id')
    .eq('mini_game_id', miniGameId);

  const voteCounts: Record<string, number> = {};
  for (const v of votes ?? []) {
    voteCounts[v.voted_for_submission_id] = (voteCounts[v.voted_for_submission_id] ?? 0) + 1;
  }

  // Find winner (most votes, random tiebreak)
  let maxVotes = 0;
  let winnerId: string | null = null;
  for (const [subId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes || (count === maxVotes && Math.random() > 0.5)) {
      maxVotes = count;
      winnerId = subId;
    }
  }

  let winnerPlayerId: string | null = null;
  if (winnerId) {
    const { data: sub } = await supabase
      .from('mini_game_submissions')
      .select('room_player_id')
      .eq('id', winnerId)
      .single();
    winnerPlayerId = sub?.room_player_id ?? null;
  }

  // Get points
  const { data: game } = await supabase
    .from('mini_games')
    .select('points')
    .eq('id', miniGameId)
    .single();

  // Award points to winner
  if (winnerPlayerId && game) {
    await supabase.rpc('increment_score', {
      p_room_player_id: winnerPlayerId,
      p_amount: game.points,
    }).catch(() => {
      // Fallback if RPC doesn't exist
      supabase
        .from('room_players')
        .update({ score: supabase.raw(`score + ${game.points}`) })
        .eq('id', winnerPlayerId);
    });
  }

  await supabase
    .from('mini_games')
    .update({
      status: 'RESULTS',
      winner_room_player_id: winnerPlayerId,
      phase_ends_at: new Date(Date.now() + 15 * 1000).toISOString(), // 15s to show results
    })
    .eq('id', miniGameId);
}

async function resolveHotTake(supabase: any, miniGameId: string) {
  // Hot takes: minority opinion wins
  const { data: submissions } = await supabase
    .from('mini_game_submissions')
    .select('room_player_id, content')
    .eq('mini_game_id', miniGameId);

  const agrees = (submissions ?? []).filter((s: any) => s.content === 'agree');
  const disagrees = (submissions ?? []).filter((s: any) => s.content === 'disagree');

  // Minority wins
  const minority = agrees.length < disagrees.length ? agrees : disagrees;

  const { data: game } = await supabase
    .from('mini_games')
    .select('points')
    .eq('id', miniGameId)
    .single();

  // Award points to all minority voters
  if (minority.length > 0 && game) {
    for (const sub of minority) {
      await supabase.rpc('increment_score', {
        p_room_player_id: sub.room_player_id,
        p_amount: game.points,
      }).catch(() => {});
    }
  }

  await supabase
    .from('mini_games')
    .update({
      status: 'RESULTS',
      phase_ends_at: new Date(Date.now() + 10 * 1000).toISOString(),
    })
    .eq('id', miniGameId);
}
