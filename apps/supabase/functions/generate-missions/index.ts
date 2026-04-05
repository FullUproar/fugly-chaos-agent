import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';
import { generateStandingMissions } from '../_shared/mission-pool.ts';
import { generateWithSystem } from '../_shared/claude.ts';
import { getGameContextProfile, getEffectiveProfile } from '../_shared/game-context-profiles.ts';

interface AIMission {
  title: string;
  description: string;
  points: number;
  category: 'social' | 'performance' | 'sabotage' | 'alliance' | 'endurance' | 'meta';
  type: 'standing' | 'flash';
  flash_type?: 'race' | 'target' | 'group';
  target_nickname?: string;
}

const AI_SYSTEM_PROMPT = `You are Fugly's Chaos Agent — a mischievous, theatrical party game AI that generates missions for real-life social game nights.

RULES:
- Generate missions that are FUN, SAFE, and LEGAL. Never generate anything offensive, discriminatory, sexually explicit, or genuinely harmful.
- Reference actual players BY NAME when it makes sense — this is what makes AI missions special.
- Adapt difficulty based on the group's chaos_comfort level: "chill" = lighthearted/easy, "moderate" = competitive/medium, "maximum" = wild/challenging.
- Create variety across categories: social, performance, sabotage, alliance, endurance, meta.
- Mix standing missions (ongoing, anyone can claim) and flash missions (timed, specific format).
- Flash missions must have a flash_type: "race" (first to do X wins), "target" (do X to specific player), or "group" (everyone participates).
- Use inside jokes, chat references, and recent events when provided. This is what makes it personal.
- Points: easy = 5, medium = 10, hard = 15-25. Target missions pay more (20-25).
- Keep descriptions concise — one or two sentences max.
- Tone: playful, cheeky, a little unhinged, but never mean-spirited.

OUTPUT FORMAT:
Respond with ONLY a JSON array of mission objects. No markdown, no explanation, just the array.
Each object: { "title": string, "description": string, "points": number, "category": string, "type": "standing"|"flash", "flash_type"?: string, "target_nickname"?: string }`;

// Called internally by setup-complete when all players are ready
Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { room_id, mode = 'static' } = await req.json();
    const supabase = getAdminClient();

    // Verify room exists
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status, settings, started_at, created_at, game_type')
      .eq('id', room_id)
      .single();

    if (!room) throw new Error('Room not found');

    // Look up game context profile, applying party/speed mode overrides
    const roomSettings = (room.settings ?? {}) as Record<string, unknown>;
    const profile = getEffectiveProfile(room.game_type ?? 'custom', {
      partyMode: !!roomSettings.partyMode,
      speedMode: !!roomSettings.speedMode,
    });
    const missionCount = profile.standingMissionCount;
    const allowedCategories = profile.allowedMissionCategories;

    if (mode === 'ai') {
      const missions = await generateAIMissions(room_id, room, profile);

      // Update room status to ACTIVE and store the game context profile key fields
      await supabase
        .from('rooms')
        .update({
          status: 'ACTIVE',
          started_at: new Date().toISOString(),
          settings: {
            ...(room.settings as Record<string, unknown> ?? {}),
            game_context_profile: profile.gameType,
          },
        })
        .eq('id', room_id);

      return new Response(JSON.stringify({ missions_created: missions.length, mode: 'ai' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Static mode (default, free tier)
    await generateStandingMissions(room_id, missionCount, allowedCategories);

    // Update room status to ACTIVE and store the game context profile key fields
    await supabase
      .from('rooms')
      .update({
        status: 'ACTIVE',
        started_at: new Date().toISOString(),
        settings: {
          ...(room.settings as Record<string, unknown> ?? {}),
          game_context_profile: profile.gameType,
        },
      })
      .eq('id', room_id);

    return new Response(JSON.stringify({ missions_created: missionCount, mode: 'static' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateAIMissions(
  roomId: string,
  room: { id: string; settings: Record<string, unknown>; started_at: string | null; created_at: string; game_type: string },
  profile: ReturnType<typeof getGameContextProfile>,
): Promise<AIMission[]> {
  const supabase = getAdminClient();

  // Gather rich context for Claude

  // 1. Players with setup answers
  const { data: players } = await supabase
    .from('room_players')
    .select('id, nickname, setup_answers, score')
    .eq('room_id', roomId);
  const playerList = players ?? [];

  // 2. Recent signals
  const { data: signals } = await supabase
    .from('signals')
    .select('signal_type, room_player_id, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(20);

  // 3. Recent poll results
  const { data: polls } = await supabase
    .from('polls')
    .select('question, status')
    .eq('room_id', roomId)
    .eq('status', 'CLOSED')
    .order('created_at', { ascending: false })
    .limit(5);

  // 4. Recent chat messages (last 20)
  const { data: messages } = await supabase
    .from('messages')
    .select('content, sender_id, message_type')
    .eq('room_id', roomId)
    .eq('message_type', 'chat')
    .order('created_at', { ascending: false })
    .limit(20);

  // 5. Completed missions
  const { data: completedMissions } = await supabase
    .from('missions')
    .select('title, category')
    .eq('room_id', roomId)
    .in('status', ['VERIFIED', 'CLAIMED']);

  // 6. Score standings
  const scoreStandings = playerList
    .map(p => ({ nickname: p.nickname, score: p.score }))
    .sort((a, b) => b.score - a.score);

  // 7. Time elapsed
  const startTime = room.started_at ? new Date(room.started_at).getTime() : Date.now();
  const minutesElapsed = Math.round((Date.now() - startTime) / 60000);

  // Build nickname lookup for messages
  const playerMap = new Map(playerList.map(p => [p.id, p.nickname]));
  const chatSummary = (messages ?? [])
    .map(m => `${playerMap.get(m.sender_id) ?? 'Unknown'}: ${m.content}`)
    .reverse();

  // Determine group chaos comfort
  const comfortLevels = playerList
    .filter(p => p.setup_answers?.chaos_comfort)
    .map(p => p.setup_answers.chaos_comfort);
  const groupComfort = comfortLevels.includes('chill') ? 'chill'
    : comfortLevels.includes('maximum') ? 'maximum'
    : 'moderate';

  // Signal summary
  const signalSummary = (signals ?? []).reduce((acc: Record<string, number>, s) => {
    acc[s.signal_type] = (acc[s.signal_type] || 0) + 1;
    return acc;
  }, {});

  const categoryNote = profile.allowedMissionCategories
    ? `IMPORTANT: Only generate standing missions in these categories: ${profile.allowedMissionCategories.join(', ')}.`
    : 'Use a mix of all categories.';
  const flashNote = profile.flashEnabled
    ? `Also generate 4 flash missions with different flash_types.`
    : `Do NOT generate any flash missions — this game type (${profile.gameType}) uses polls-only mode.`;

  const contextPrompt = `Generate ${profile.standingMissionCount} standing missions for this game night.
${flashNote}
${categoryNote}

PLAYERS (${playerList.length}):
${playerList.map(p => {
  const answers = p.setup_answers;
  return `- ${p.nickname}: chaos_comfort=${answers?.chaos_comfort ?? 'unknown'}, social_style=${answers?.social_style ?? 'unknown'}, wildcard="${answers?.wildcard ?? ''}"`;
}).join('\n')}

GROUP CHAOS COMFORT: ${groupComfort}
ROOM SETTINGS: intensity=${(room.settings as Record<string, unknown>)?.intensity ?? 2}, physical_ok=${(room.settings as Record<string, unknown>)?.physical_ok ?? false}

SCORE STANDINGS:
${scoreStandings.map((s, i) => `${i + 1}. ${s.nickname}: ${s.score} pts`).join('\n') || '(No scores yet — game just started)'}

RECENT SIGNALS: ${JSON.stringify(signalSummary) || 'None yet'}
${Object.keys(signalSummary).length > 0 ? `(${signalSummary['shake_it_up'] ? 'Players want more energy!' : ''}${signalSummary['slow_your_roll'] ? 'Players want to chill out.' : ''}${signalSummary['im_bored'] ? 'Someone is bored — spice it up!' : ''})` : ''}

RECENT CHAT:
${chatSummary.length > 0 ? chatSummary.join('\n') : '(No chat activity yet)'}

RECENT POLL QUESTIONS: ${(polls ?? []).map(p => p.question).join(', ') || 'None'}

ALREADY COMPLETED MISSIONS: ${(completedMissions ?? []).map(m => m.title).join(', ') || 'None yet'}

TIME ELAPSED: ${minutesElapsed} minutes

Generate missions that feel personal to THIS group. Reference player names, inside jokes from chat, and adapt to the room's energy. Include a mix of categories and at least 2 flash missions with different flash_types.`;

  const response = await generateWithSystem(AI_SYSTEM_PROMPT, contextPrompt);

  // Parse the JSON response
  let aiMissions: AIMission[];
  try {
    // Handle potential markdown wrapping
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    aiMissions = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse AI mission response');
  }

  // Validate and insert missions
  const playerNicknameToId = new Map(playerList.map(p => [p.nickname.toLowerCase(), p.id]));

  const missionRows = aiMissions.map(m => {
    const targetId = m.target_nickname
      ? playerNicknameToId.get(m.target_nickname.toLowerCase()) ?? null
      : null;

    // Replace target_nickname in description with actual nickname (case correction)
    let description = m.description;
    if (m.target_nickname && targetId) {
      const actualPlayer = playerList.find(p => p.id === targetId);
      if (actualPlayer) {
        description = description.replace(
          new RegExp(m.target_nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
          actualPlayer.nickname,
        );
      }
    }

    return {
      room_id: roomId,
      room_player_id: null,
      title: m.title,
      description,
      difficulty: m.points <= 5 ? 1 : m.points <= 10 ? 2 : 3,
      points: Math.min(Math.max(m.points, 5), 25), // Clamp 5-25
      category: m.category,
      status: m.type === 'standing' ? 'REVEALED' : 'HIDDEN', // Flash missions stay hidden until triggered
      type: m.type,
      flash_type: m.flash_type ?? null,
      expires_at: null,
      visible_to: 'all',
      target_player_id: targetId,
      ai_context: { generated_by: 'claude', group_comfort: groupComfort },
    };
  });

  // Insert standing missions immediately
  const standingMissions = missionRows.filter(m => m.type === 'standing');
  if (standingMissions.length > 0) {
    await supabase.from('missions').insert(standingMissions);
  }

  // Insert flash missions as HIDDEN (will be revealed by trigger-event)
  const flashMissions = missionRows.filter(m => m.type === 'flash');
  if (flashMissions.length > 0) {
    await supabase.from('missions').insert(flashMissions);
  }

  return aiMissions;
}
