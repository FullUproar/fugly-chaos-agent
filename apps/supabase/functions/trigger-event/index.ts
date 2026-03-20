import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';
import { generateFlashMission, generatePoll } from '../_shared/mission-pool.ts';
import { sendPush } from '../_shared/push.ts';
import { generateWithSystem } from '../_shared/claude.ts';

const AI_FLASH_SYSTEM = `You are Fugly's Chaos Agent — a mischievous party game AI generating a single flash mission that reacts to what just happened in the room.

RULES:
- Generate ONE flash mission that references recent events, player names, and the room's energy.
- Keep it fun, safe, and legal. Never offensive or harmful.
- Tone: dramatic, theatrical, a little unhinged. Like a wrestling announcer meets a reality TV producer.
- Reference specific moments from chat or recent claims when possible.

OUTPUT FORMAT:
Respond with ONLY a JSON object (no markdown): { "title": string, "description": string, "points": number (10-25), "category": string, "flash_type": "race"|"target"|"group", "target_nickname"?: string }`;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { room_id, event_type, flash_type, compress_timers, mode = 'static' } = await req.json();

    if (!room_id || !event_type) {
      return new Response(JSON.stringify({ error: 'room_id and event_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Verify room exists and is ACTIVE
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status, started_at')
      .eq('id', room_id)
      .single();

    if (!room || room.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ error: 'Room not found or not active' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get players for this room
    const { data: playersData } = await supabase
      .from('room_players')
      .select('id, nickname, setup_answers, score')
      .eq('room_id', room_id);

    const players = (playersData ?? []).map((p: { id: string; nickname: string; setup_answers: Record<string, unknown> | null; score: number }) => ({
      id: p.id,
      nickname: p.nickname,
      setup_answers: p.setup_answers,
      score: p.score,
    }));

    if (event_type === 'flash_mission') {
      // Expire any active flash missions
      await supabase
        .from('missions')
        .update({ status: 'EXPIRED' })
        .eq('room_id', room_id)
        .eq('type', 'flash')
        .eq('status', 'REVEALED');

      // AI mode: generate contextual flash mission via Claude
      if (mode === 'ai') {
        const mission = await generateAIFlashMission(
          room_id,
          room,
          players,
          compress_timers ?? true,
          flash_type,
        );

        sendPush({
          room_id,
          title: '\u{26A1} Flash Mission!',
          body: `\u{26A1} FLASH MISSION: ${mission.title}`,
          data: { mission_id: mission.id, type: 'flash_mission' },
          category: 'FLASH_MISSION',
        });

        return new Response(JSON.stringify({
          event_id: mission.id,
          type: 'flash_mission',
          title: mission.title,
          mode: 'ai',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Static mode (default)
      const mission = await generateFlashMission(
        room_id,
        players,
        compress_timers ?? true,
        flash_type,
      );

      sendPush({
        room_id,
        title: '\u{26A1} Flash Mission!',
        body: `\u{26A1} FLASH MISSION: ${mission.title}`,
        data: { mission_id: mission.id, type: 'flash_mission' },
        category: 'FLASH_MISSION',
      });

      return new Response(JSON.stringify({
        event_id: mission.id,
        type: 'flash_mission',
        title: mission.title,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (event_type === 'poll') {
      // Close any active polls
      await supabase
        .from('polls')
        .update({ status: 'CLOSED' })
        .eq('room_id', room_id)
        .eq('status', 'ACTIVE');

      const poll = await generatePoll(room_id, players, compress_timers ?? true);

      sendPush({
        room_id,
        title: '\u{1F4CA} Quick Vote!',
        body: `\u{1F4CA} Quick vote: ${poll.question}`,
        data: { poll_id: poll.id, type: 'poll' },
        category: 'POLL',
      });

      return new Response(JSON.stringify({
        event_id: poll.id,
        type: 'poll',
        question: poll.question,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid event_type' }), {
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

interface PlayerContext {
  id: string;
  nickname: string;
  setup_answers: Record<string, unknown> | null;
  score: number;
}

async function generateAIFlashMission(
  roomId: string,
  room: { id: string; started_at: string | null },
  players: PlayerContext[],
  compressTimers: boolean,
  specificFlashType?: string,
): Promise<{ id: string; title: string }> {
  const supabase = getAdminClient();

  // Check for pre-generated AI flash missions first (from generate-missions AI mode)
  const { data: aiPreGenerated } = await supabase
    .from('missions')
    .select('id, title')
    .eq('room_id', roomId)
    .eq('type', 'flash')
    .eq('status', 'HIDDEN')
    .not('ai_context', 'is', null)
    .limit(1);

  if (aiPreGenerated && aiPreGenerated.length > 0) {
    const hiddenFlash = aiPreGenerated[0];
    const durationMs = compressTimers ? 30000 : 75000;
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    await supabase
      .from('missions')
      .update({ status: 'REVEALED', expires_at: expiresAt })
      .eq('id', hiddenFlash.id);

    return { id: hiddenFlash.id, title: hiddenFlash.title };
  }

  // No pre-generated flash available — generate contextually with Claude
  const { data: recentClaims } = await supabase
    .from('claims')
    .select('room_player_id, status, points_awarded')
    .eq('status', 'VOTE_FAILED')
    .order('claimed_at', { ascending: false })
    .limit(5);

  const { data: recentMessages } = await supabase
    .from('messages')
    .select('content, sender_id')
    .eq('room_id', roomId)
    .eq('message_type', 'chat')
    .order('created_at', { ascending: false })
    .limit(10);

  const playerMap = new Map(players.map(p => [p.id, p.nickname]));
  const scoreStandings = [...players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => `${i + 1}. ${p.nickname}: ${p.score} pts`);

  const minutesElapsed = room.started_at
    ? Math.round((Date.now() - new Date(room.started_at).getTime()) / 60000)
    : 0;

  const bullshitCalls = (recentClaims ?? []).map(c => {
    const nickname = playerMap.get(c.room_player_id) ?? 'Unknown';
    return `${nickname} got BULLSHIT-called (claim failed)`;
  });

  const chatLines = (recentMessages ?? [])
    .map(m => `${playerMap.get(m.sender_id) ?? 'Unknown'}: ${m.content}`)
    .reverse();

  const contextPrompt = `Generate a contextual flash mission for this moment.

PLAYERS: ${players.map(p => p.nickname).join(', ')}
SCORES: ${scoreStandings.join(', ')}
TIME ELAPSED: ${minutesElapsed} minutes
${specificFlashType ? `REQUIRED FLASH TYPE: ${specificFlashType}` : 'Choose the best flash_type for the moment.'}

RECENT EVENTS:
${bullshitCalls.length > 0 ? `BULLSHIT calls: ${bullshitCalls.join('; ')}` : 'No recent bullshit calls.'}
${bullshitCalls.length > 0 ? `After that last BULLSHIT call, someone needs to redeem themselves...` : ''}

RECENT CHAT:
${chatLines.length > 0 ? chatLines.join('\n') : '(Quiet room — shake things up!)'}

Make this flash mission feel like a REACTION to what's happening. If someone just got bullshit-called, reference it ("After that last BULLSHIT call, [Player] needs to redeem themselves..."). If chat is lively, play off the energy. If the room is quiet, shock them.`;

  const response = await generateWithSystem(AI_FLASH_SYSTEM, contextPrompt);

  let aiMission: {
    title: string;
    description: string;
    points: number;
    category: string;
    flash_type: string;
    target_nickname?: string;
  };

  try {
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    aiMission = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse AI flash mission response');
  }

  // Resolve target player
  const targetPlayer = aiMission.target_nickname
    ? players.find(p => p.nickname.toLowerCase() === aiMission.target_nickname!.toLowerCase())
    : null;

  const durationMs = compressTimers ? 30000 : 75000;
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  const { data, error } = await supabase
    .from('missions')
    .insert({
      room_id: roomId,
      room_player_id: null,
      title: aiMission.title,
      description: aiMission.description,
      difficulty: aiMission.points <= 10 ? 2 : 3,
      points: Math.min(Math.max(aiMission.points, 10), 25),
      category: aiMission.category,
      status: 'REVEALED',
      type: 'flash',
      flash_type: aiMission.flash_type,
      expires_at: expiresAt,
      visible_to: 'all',
      target_player_id: targetPlayer?.id ?? null,
      ai_context: { generated_by: 'claude', contextual: true },
    })
    .select('id, title')
    .single();

  if (error) throw error;
  return data;
}
