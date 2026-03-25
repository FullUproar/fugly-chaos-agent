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

        // Inline prompt pools (shared constants can't be imported in edge functions)
        const WORST_ADVICE_PROMPTS = [
          "Your date is 20 minutes late",
          "You just got pulled over for speeding",
          "Your boss catches you napping at your desk",
          "You accidentally liked your ex's photo from 3 years ago",
          "You're stuck in an elevator with your crush",
          "Your friend asks you to help them move... again",
          "You just sent a text to the wrong person",
          "Your card gets declined on a first date",
          "You realize you've been on mute for 10 minutes",
          "Your neighbor's dog won't stop barking at 3am",
          "You accidentally call your teacher 'mom'",
          "You show up to a costume party and no one else is in costume",
          "Your phone dies during an important call",
          "You walk into a glass door in front of everyone",
          "Your fly has been down all day and no one told you",
          "You accidentally reply-all with something embarrassing",
          "Your stomach growls during a moment of silence",
          "You get caught talking to yourself in public",
          "You wave back at someone who wasn't waving at you",
          "You realize you've been telling the same story twice",
        ];

        const SPEED_SUPERLATIVE_PROMPTS = [
          "Most likely to adopt a raccoon",
          "Most likely to survive a zombie apocalypse",
          "Most likely to accidentally start a cult",
          "Most likely to get arrested for something stupid",
          "Most likely to cry during a commercial",
          "Most likely to eat something off the floor",
          "Most likely to become a reality TV star",
          "Most likely to forget their own birthday",
          "Most likely to fight a goose and lose",
          "Most likely to accidentally become famous",
          "Most likely to sleep through an earthquake",
          "Most likely to befriend a stranger's dog and forget the stranger",
          "Most likely to laugh at the worst possible moment",
          "Most likely to get stuck in a baby swing at the park",
          "Most likely to accidentally commit a crime",
          "Most likely to start a food fight at a fancy restaurant",
          "Most likely to get lost in their own neighborhood",
          "Most likely to text something weird to their boss",
          "Most likely to fall asleep standing up",
          "Most likely to win a hot dog eating contest",
          "Most likely to talk their way out of a speeding ticket",
          "Most likely to adopt 7 cats and name them all Greg",
          "Most likely to challenge a stranger to an arm wrestle",
          "Most likely to get banned from a buffet",
        ];

        const EMOJI_STORY_SEQUENCES = [
          ["\u{1F431}", "\u{1F525}", "\u{1F692}", "\u{1F631}"],
          ["\u{1F476}", "\u{1F382}", "\u{1F480}", "\u{1F47B}"],
          ["\u{1F9B7}", "\u{1F9DA}", "\u{1F4B0}", "\u{1F3C3}"],
          ["\u{1F40D}", "\u2708\uFE0F", "\u{1F628}", "\u{1FA82}"],
          ["\u{1F355}", "\u{1F4DE}", "\u{1F6AA}", "\u{1F47D}"],
          ["\u{1F415}", "\u{1F4DD}", "\u{1F393}", "\u{1F454}"],
          ["\u{1F9CA}", "\u2600\uFE0F", "\u{1F3D6}\uFE0F", "\u{1F988}"],
          ["\u{1F470}", "\u{1F3C3}", "\u{1F697}", "\u{1F32E}"],
          ["\u{1F916}", "\u2764\uFE0F", "\u{1F9F9}", "\u{1F622}"],
          ["\u{1F986}", "\u{1F451}", "\u2694\uFE0F", "\u{1F3F0}"],
          ["\u{1F9EA}", "\u{1F4A5}", "\u{1F9B8}", "\u{1F9B9}"],
          ["\u{1F438}", "\u{1F48B}", "\u{1F478}", "\u{1F922}"],
          ["\u{1F383}", "\u{1F52A}", "\u{1F631}", "\u{1F3AA}"],
          ["\u{1F412}", "\u{1F34C}", "\u{1F680}", "\u{1F319}"],
          ["\u{1F9D3}", "\u{1F48A}", "\u{1F4AA}", "\u{1F3CB}\uFE0F"],
          ["\u{1F3B8}", "\u{1F404}", "\u{1F319}", "\u{1F47D}"],
        ];

        const TWO_WORD_STORY_TEMPLATES = [
          "The wedding was perfect until someone brought a _____ and the priest said '_____'.",
          "My first day at work, the boss handed me a _____ and whispered '_____'.",
          "The detective found _____ in the fridge next to a note that said '_____'.",
          "At 3am, the doorbell rang. It was a _____ delivering '_____'.",
          "The fortune cookie said: 'Beware the _____ that _____.'",
          "My tinder date showed up with _____ and immediately _____.",
          "The president's speech was interrupted by _____ yelling '_____'.",
          "Grandma's secret recipe calls for _____ and a tablespoon of _____.",
          "The escape room's final clue was a _____ labeled '_____'.",
          "The last thing the astronaut saw was _____ floating past the _____.",
          "My cat brought home a _____ and dropped it on my _____.",
          "The school mascot quit after someone _____ their _____.",
          "The therapy session ended when the therapist _____ the _____.",
          "The airplane announcement said: 'Please fasten your _____ and prepare for _____.'",
          "The museum's most valuable artifact is a _____ once owned by _____.",
          "My autobiography will be titled: 'The _____ That _____.'",
        ];

        const BLUFF_STATS = [
          { stat: "The average person swallows 8 spiders in their sleep per year", real: false },
          { stat: "Honey never spoils \u2014 3000 year old honey is still edible", real: true },
          { stat: "A group of flamingos is called a 'flamboyance'", real: true },
          { stat: "The inventor of the Pringles can is buried in one", real: true },
          { stat: "Cows have best friends and get stressed when separated", real: true },
          { stat: "The average cloud weighs about 1.1 million pounds", real: true },
          { stat: "Bananas are technically berries, but strawberries aren't", real: true },
          { stat: "A jiffy is an actual unit of time (1/100th of a second)", real: true },
          { stat: "95% of people text things they could never say in person", real: false },
          { stat: "The moon has moonquakes", real: true },
          { stat: "Octopuses have 3 hearts and blue blood", real: true },
          { stat: "The human nose can detect over 1 trillion scents", real: true },
          { stat: "Oxford University is older than the Aztec Empire", real: true },
          { stat: "Sharks are older than trees", real: true },
          { stat: "The average person walks past 36 murderers in their lifetime", real: false },
          { stat: "Cleopatra lived closer to the Moon landing than to the building of the Great Pyramid", real: true },
          { stat: "A cockroach can live for 2 weeks without its head", real: true },
          { stat: "Nintendo was founded in 1889", real: true },
          { stat: "There are more fake flamingos in the world than real ones", real: true },
          { stat: "Humans share 60% of their DNA with bananas", real: true },
          { stat: "The average person will spend 6 months of their life waiting for red lights", real: true },
          { stat: "Vikings used to give kittens to new brides as wedding gifts", real: true },
          { stat: "Scotland's national animal is the unicorn", real: true },
          { stat: "There are more public libraries than McDonald's in the US", real: true },
        ];

        const ASSUMPTION_ARENA_PROMPTS = [
          "The best time to eat pizza is ___",
          "The worst superpower would be ___",
          "The most overrated movie of all time is ___",
          "If animals could talk, the rudest would be ___",
          "The most useless invention ever is ___",
          "The worst flavor of ice cream would be ___",
          "The most embarrassing thing to Google is ___",
          "If you could ban one word, it would be ___",
          "The worst place to propose is ___",
          "The most annoying sound in the world is ___",
          "The worst thing to say on a first date is ___",
          "If aliens visited Earth, the first thing they'd notice is ___",
          "The most overrated holiday is ___",
          "The worst middle name would be ___",
          "The most suspicious thing to buy at 3am is ___",
          "The worst possible Wi-Fi password is ___",
          "The most awkward text to accidentally send your boss is ___",
          "The worst theme for a birthday party is ___",
          "If life had a loading screen, the tip would be ___",
          "The most dangerous food to eat while driving is ___",
        ];

        // Inline selectVariation logic (shared constants can't be imported in edge functions)
        const VARIATIONS: Record<string, { id: string; name: string; reveal_text: string; applicable_to: string[]; weight: number }> = {
          standard: { id: 'standard', name: 'Standard Vote', reveal_text: 'Vote for your favorite.', applicable_to: ['drawing', 'caption', 'hot_take', 'lie_detector', 'worst_advice', 'speed_superlative', 'emoji_story', 'two_word_story', 'bluff_stats', 'assumption_arena'], weight: 25 },
          worst_wins: { id: 'worst_wins', name: 'WORST WINS', reveal_text: 'The worse it is, the better.', applicable_to: ['drawing', 'caption', 'worst_advice', 'emoji_story', 'two_word_story'], weight: 10 },
          the_editor: { id: 'the_editor', name: 'THE EDITOR', reveal_text: 'One critic. One opinion. No appeals.', applicable_to: ['drawing', 'caption', 'worst_advice', 'emoji_story', 'two_word_story'], weight: 8 },
          blind_swap: { id: 'blind_swap', name: 'Blind Swap', reveal_text: 'Judge the work, not the person.', applicable_to: ['drawing', 'caption', 'worst_advice', 'emoji_story', 'two_word_story'], weight: 8 },
          mashup: { id: 'mashup', name: 'MASHUP', reveal_text: 'What if we... combined them?', applicable_to: ['caption', 'two_word_story'], weight: 6 },
          double_down: { id: 'double_down', name: 'Double Down', reveal_text: 'The minority report pays double.', applicable_to: ['hot_take', 'bluff_stats', 'assumption_arena'], weight: 8 },
          the_reveal: { id: 'the_reveal', name: 'THE REVEAL', reveal_text: 'Explain yourself.', applicable_to: ['hot_take', 'assumption_arena'], weight: 7 },
          confidence_bet: { id: 'confidence_bet', name: 'Confidence Bet', reveal_text: 'Put your points where your mouth is.', applicable_to: ['lie_detector', 'hot_take', 'bluff_stats'], weight: 8 },
          interrogation: { id: 'interrogation', name: 'INTERROGATION', reveal_text: 'Two questions. Choose wisely.', applicable_to: ['lie_detector'], weight: 8 },
          artists_choice: { id: 'artists_choice', name: "Artist's Choice", reveal_text: "Appreciate someone else's chaos.", applicable_to: ['drawing', 'emoji_story'], weight: 7 },
          crowd_favorite: { id: 'crowd_favorite', name: 'Crowd Favorite', reveal_text: 'Rate the performance.', applicable_to: ['drawing', 'caption', 'hot_take', 'lie_detector', 'worst_advice', 'speed_superlative', 'emoji_story', 'two_word_story', 'assumption_arena'], weight: 8 },
          sabotage: { id: 'sabotage', name: 'SABOTAGE', reveal_text: "Something doesn't feel right...", applicable_to: ['drawing', 'caption'], weight: 5 },
          the_skeptic: { id: 'the_skeptic', name: 'THE SKEPTIC', reveal_text: 'Someone here has serious pull.', applicable_to: ['speed_superlative'], weight: 8 },
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

        if (selectedVariation.id === 'the_skeptic') {
          // Pick a random player whose vote counts 3x — keep it secret
          const { data: players } = await supabase
            .from('room_players')
            .select('id, nickname')
            .eq('room_id', room_id);
          if (players && players.length > 0) {
            const skeptic = players[Math.floor(Math.random() * players.length)];
            variationData.skeptic_player_id = skeptic.id;
          }
        }

        // --- Resolve prompt and initial status based on game type ---
        let resolvedPrompt = prompt ?? 'Be creative!';
        let initialStatus = 'SUBMITTING';
        const playerListForVoting: Array<{ id: string; nickname: string }> = [];

        if (resolvedGameType === 'worst_advice' && !prompt) {
          resolvedPrompt = WORST_ADVICE_PROMPTS[Math.floor(Math.random() * WORST_ADVICE_PROMPTS.length)];
        }

        if (resolvedGameType === 'speed_superlative') {
          if (!prompt) {
            resolvedPrompt = SPEED_SUPERLATIVE_PROMPTS[Math.floor(Math.random() * SPEED_SUPERLATIVE_PROMPTS.length)];
          }
          initialStatus = 'VOTING';
          // Fetch player list as vote options
          const { data: players } = await supabase
            .from('room_players')
            .select('id, nickname')
            .eq('room_id', room_id);
          if (players) {
            playerListForVoting.push(...players);
            variationData.player_options = players.map((p: any) => ({ id: p.id, nickname: p.nickname }));
          }
        }

        if (resolvedGameType === 'emoji_story') {
          const sequence = EMOJI_STORY_SEQUENCES[Math.floor(Math.random() * EMOJI_STORY_SEQUENCES.length)];
          resolvedPrompt = sequence.join(' ');
          variationData.emoji_sequence = sequence;
        }

        if (resolvedGameType === 'two_word_story') {
          if (!prompt) {
            resolvedPrompt = TWO_WORD_STORY_TEMPLATES[Math.floor(Math.random() * TWO_WORD_STORY_TEMPLATES.length)];
          }
        }

        if (resolvedGameType === 'bluff_stats') {
          const stat = BLUFF_STATS[Math.floor(Math.random() * BLUFF_STATS.length)];
          resolvedPrompt = stat.stat;
          initialStatus = 'VOTING';
          variationData.correct_answer = stat.real;
        }

        if (resolvedGameType === 'assumption_arena') {
          if (!prompt) {
            resolvedPrompt = ASSUMPTION_ARENA_PROMPTS[Math.floor(Math.random() * ASSUMPTION_ARENA_PROMPTS.length)];
          }
        }

        const votingPhaseEndsAt = initialStatus === 'VOTING'
          ? new Date(Date.now() + (voting_time_sec ?? 30) * 1000).toISOString()
          : phaseEndsAt;

        const { data: game, error: gameError } = await supabase
          .from('mini_games')
          .insert({
            room_id,
            game_type: resolvedGameType,
            prompt: resolvedPrompt,
            points: points ?? 20,
            status: initialStatus,
            phase_ends_at: votingPhaseEndsAt,
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
          .select('id, room_id, status, game_type')
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
          if (game.game_type === 'bluff_stats') {
            await resolveBluffStats(supabase, mini_game_id);
          } else if (game.game_type === 'speed_superlative') {
            await resolveSuperlative(supabase, mini_game_id);
          } else {
            await resolveGame(supabase, mini_game_id);
          }
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
          if (game.game_type === 'bluff_stats') {
            await resolveBluffStats(supabase, mini_game_id);
          } else if (game.game_type === 'speed_superlative') {
            await resolveSuperlative(supabase, mini_game_id);
          } else {
            await resolveGame(supabase, mini_game_id);
          }
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
            if (game.game_type === 'bluff_stats') {
              await resolveBluffStats(supabase, game.id);
            } else if (game.game_type === 'speed_superlative') {
              await resolveSuperlative(supabase, game.id);
            } else {
              await resolveGame(supabase, game.id);
            }
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

async function resolveBluffStats(supabase: any, miniGameId: string) {
  // Bluff stats: players vote TRUE or FALSE, correct guessers get points
  const { data: game } = await supabase
    .from('mini_games')
    .select('points, variation_data')
    .eq('id', miniGameId)
    .single();

  const correctAnswer = game?.variation_data?.correct_answer === true ? 'TRUE' : 'FALSE';

  const { data: votes } = await supabase
    .from('mini_game_votes')
    .select('room_player_id, voted_for_submission_id')
    .eq('mini_game_id', miniGameId);

  // Award points to everyone who guessed correctly
  const correctVoters = (votes ?? []).filter((v: any) => v.voted_for_submission_id === correctAnswer);

  if (game && correctVoters.length > 0) {
    for (const voter of correctVoters) {
      await supabase.rpc('increment_score', {
        p_room_player_id: voter.room_player_id,
        p_amount: game.points,
      }).catch(() => {});
    }
  }

  // Store results in variation_data for the reveal
  const updatedVariationData = {
    ...(game?.variation_data ?? {}),
    correct_voters: correctVoters.map((v: any) => v.room_player_id),
    total_voters: (votes ?? []).length,
  };

  await supabase
    .from('mini_games')
    .update({
      status: 'RESULTS',
      variation_data: updatedVariationData,
      phase_ends_at: new Date(Date.now() + 15 * 1000).toISOString(),
    })
    .eq('id', miniGameId);
}

async function resolveSuperlative(supabase: any, miniGameId: string) {
  // Speed superlative: players vote for a player (stored as player ID in voted_for_submission_id)
  const { data: votes } = await supabase
    .from('mini_game_votes')
    .select('room_player_id, voted_for_submission_id')
    .eq('mini_game_id', miniGameId);

  const { data: game } = await supabase
    .from('mini_games')
    .select('points, variation, variation_data')
    .eq('id', miniGameId)
    .single();

  // Count votes per player (voted_for_submission_id holds the player ID)
  const voteCounts: Record<string, number> = {};
  for (const v of votes ?? []) {
    let weight = 1;
    // The skeptic variation: one player's vote counts 3x
    if (game?.variation === 'the_skeptic' && game?.variation_data?.skeptic_player_id === v.room_player_id) {
      weight = 3;
    }
    voteCounts[v.voted_for_submission_id] = (voteCounts[v.voted_for_submission_id] ?? 0) + weight;
  }

  // Find winner (most votes)
  let maxVotes = 0;
  let winnerPlayerId: string | null = null;
  for (const [playerId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes || (count === maxVotes && Math.random() > 0.5)) {
      maxVotes = count;
      winnerPlayerId = playerId;
    }
  }

  // Award points
  if (winnerPlayerId && game) {
    await supabase.rpc('increment_score', {
      p_room_player_id: winnerPlayerId,
      p_amount: game.points,
    }).catch(() => {});
  }

  await supabase
    .from('mini_games')
    .update({
      status: 'RESULTS',
      winner_room_player_id: winnerPlayerId,
      phase_ends_at: new Date(Date.now() + 15 * 1000).toISOString(),
    })
    .eq('id', miniGameId);
}
