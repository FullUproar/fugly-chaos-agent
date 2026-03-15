import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';
import { generateText } from '../_shared/claude.ts';

interface GeneratedMission {
  assignedTo: string;
  title: string;
  description: string;
  difficulty: number;
  points: number;
  category: string;
}

const POINTS_BY_DIFFICULTY: Record<number, number> = {
  1: 10,
  2: 20,
  3: 35,
  4: 50,
  5: 50,
};

// Called internally by setup-complete, not directly by clients
Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { room_id } = await req.json();
    const supabase = getAdminClient();

    // Fetch room and players
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room_id)
      .single();

    if (!room) throw new Error('Room not found');

    const { data: players } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', room_id);

    if (!players || players.length < 2) throw new Error('Need at least 2 players');

    // Build prompt
    const prompt = buildPrompt(room, players);
    const responseText = await generateText(prompt, 3000);

    // Parse missions from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse missions from AI response');

    const parsed = JSON.parse(jsonMatch[0]);
    const missions: GeneratedMission[] = parsed.missions;

    // Insert missions
    const inserts = missions.map((m) => {
      const player = players.find((p) => p.nickname === m.assignedTo);
      if (!player) return null;

      return {
        room_id,
        room_player_id: player.id,
        title: m.title,
        description: m.description,
        difficulty: Math.min(5, Math.max(1, m.difficulty)),
        points: POINTS_BY_DIFFICULTY[m.difficulty] ?? 20,
        category: m.category,
        status: 'REVEALED',
        ai_context: { prompt_version: '1.0', game_type: room.game_type },
      };
    }).filter(Boolean);

    if (inserts.length > 0) {
      await supabase.from('missions').insert(inserts);
    }

    // Update room status
    await supabase
      .from('rooms')
      .update({ status: 'ACTIVE', started_at: new Date().toISOString() })
      .eq('id', room_id);

    return new Response(JSON.stringify({ missions_created: inserts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildPrompt(
  room: Record<string, unknown>,
  players: Array<Record<string, unknown>>,
): string {
  const settings = (room.settings as Record<string, unknown>) ?? {};
  const playerProfiles = players.map((p) => {
    const answers = (p.setup_answers as Record<string, unknown>) ?? {};
    return `- "${p.nickname}": Chaos comfort: ${answers.chaos_comfort ?? 'moderate'}, Style: ${answers.social_style ?? 'participant'}, Physical OK: ${answers.physical_ok ?? false}, Competitive OK: ${answers.competitive_ok ?? false}${answers.wildcard ? `, Wildcard answer: "${answers.wildcard}"` : ''}`;
  }).join('\n');

  const otherPlayerNames = (names: string[], exclude: string) =>
    names.filter((n) => n !== exclude).join(', ');

  const nicknames = players.map((p) => p.nickname as string);

  return `You are the Chaos Agent, a mischievous game master who creates secret missions for players at social gatherings. Generate personalized secret missions.

CONTEXT:
- Event type: ${room.game_type}${room.game_name ? ` (${room.game_name})` : ''}
- Number of players: ${players.length}
- Players: ${nicknames.join(', ')}
- Intensity: ${settings.intensity ?? 2} (1=chill, 2=moderate, 3=maximum chaos)

PLAYER PROFILES:
${playerProfiles}

GENERATE exactly 3 secret missions per player (${players.length * 3} total).

RULES:
- Missions must be completable during a real social gathering
- Missions should be SECRET — they are fun because others don't know about them
- Difficulty 1 (Easy, 10pts): Simple social tasks anyone can do
- Difficulty 2 (Medium, 20pts): Requires some skill or bravery
- Difficulty 3 (Hard, 35pts): Challenging, requires creativity
- Difficulty 4-5 (Legendary, 50pts): Outrageous but still possible
- Match difficulty to each player's chaos comfort level
- Reference other players by nickname when appropriate (e.g., "Get ${nicknames[0]} to...")
- Spread targets across different players — don't pile on one person
- Each mission needs a clear success condition that others can verify when claimed
- Keep missions fun and safe — nothing illegal, harmful, or mean-spirited
- Categories: social, performance, sabotage, alliance, endurance, meta

OUTPUT FORMAT (strict JSON, no other text):
{
  "missions": [
    {
      "assignedTo": "PlayerNickname",
      "title": "Short Fun Title",
      "description": "Clear description of what to do and how success is verified",
      "difficulty": 1,
      "points": 10,
      "category": "social"
    }
  ]
}`;
}
