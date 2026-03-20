import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';
import { generateWithSystem } from '../_shared/claude.ts';

// Static teaser pool — Fugly's voice: paranoid, playful, building anticipation
const TEASER_POOL = [
  // Personal
  "We know what you did last game night.",
  "Your chaos profile is being compiled...",
  "Someone in your group has a secret weakness... we'll exploit it.",
  "We've been studying your play style. Interesting choices.",
  "Your confidence will be tested. Enjoy it while it lasts.",
  "You think you're ready. You're not.",
  "We've seen your setup answers. Bold moves.",
  "One of you picked 'maximum chaos.' We noticed.",
  "Your wildcard answer was... revealing.",
  "We remember your last score. Do better.",
  // Group
  "Your crew's dynamics have been... analyzed.",
  "We've been watching your group chat. Thursday will be interesting.",
  "One of you will betray the others. You know who you are.",
  "Your group has an obvious weak link. They don't know it yet.",
  "Someone in your group is already plotting. Smart.",
  "The alliance that forms first will crumble hardest.",
  "We polled your group. The results were... unanimous.",
  "Your friend group has trust issues. We'll make them worse.",
  "Two of you gave the same wildcard answer. Suspicious.",
  "The quiet one in your group? They're the threat.",
  // Mysterious
  "Something is different this time.",
  "The missions are ready. You are not.",
  "We added something new. You'll know when you see it.",
  "Not all missions are created equal. Some are traps.",
  "There's a mission in the deck that will change everything.",
  "The algorithm has spoken. It chose chaos.",
  "Something unexpected is scheduled. That's all we'll say.",
  "We've hidden a surprise in the mission pool. Good luck.",
  // Threats (playful)
  "Your reputation is on the line. No pressure.",
  "We will expose liars. We always do.",
  "The BULLSHIT button exists for a reason. You'll need it.",
  "Someone is going to lose badly. Statistically, it might be you.",
  "Friendships will be tested. Some won't survive.",
  "Last warning: bring your A-game or get humiliated.",
  "We've calibrated the difficulty. It's personal.",
  "The chaos comfort levels in your group are... incompatible.",
  // Countdown
  "The countdown has begun. There's no backing out now.",
  "Chaos doesn't wait. Neither should you.",
  "Final preparations are underway. Brace yourself.",
  "Tomorrow, someone's ego dies. Today, they still have hope.",
  "The calm before the storm. Enjoy it.",
  "Clock's ticking. Your fate is already written.",
];

const AI_TEASER_SYSTEM = `You are Fugly's Chaos Agent — generating teaser messages to build anticipation before a game night.

RULES:
- Generate personalized teasers that reference specific players by name and their setup answers.
- Tone: paranoid, playful, cryptic, building anticipation. Like a mysterious text from a reality show producer.
- Keep each teaser to 1-2 sentences max.
- Never offensive, harmful, or genuinely threatening.
- Reference past game sessions, player weaknesses, and group dynamics when possible.
- Each teaser should feel unique and slightly escalating in intensity.

OUTPUT FORMAT:
Respond with ONLY a JSON array of strings (no markdown). Each string is one teaser message.`;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { event_id, mode = 'static' } = await req.json();

    if (!event_id) {
      return new Response(JSON.stringify({ error: 'event_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Get the room associated with the event
    const { data: room } = await supabase
      .from('rooms')
      .select('id, scheduled_at, status')
      .eq('id', event_id)
      .single();

    if (!room) throw new Error('Event not found');
    if (!room.scheduled_at) throw new Error('Event has no scheduled date');

    // Calculate days until event
    const scheduledDate = new Date(room.scheduled_at);
    const now = new Date();
    const daysUntil = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0) {
      return new Response(JSON.stringify({ error: 'Event is in the past or today' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get players who have accepted the invite
    const { data: playersData } = await supabase
      .from('room_players')
      .select('id, nickname, setup_answers, player_id')
      .eq('room_id', event_id);

    const players = playersData ?? [];
    const teaserCount = Math.min(daysUntil, 14); // Max 14 teasers (2 weeks)

    let teaserMessages: string[];

    if (mode === 'ai' && players.length > 0) {
      teaserMessages = await generateAITeasers(players, teaserCount);
    } else {
      teaserMessages = pickRandomTeasers(teaserCount);
    }

    // Schedule teasers: one per day, random time between 10am-8pm
    const teaserRows = teaserMessages.map((message, i) => {
      const deliveryDate = new Date(scheduledDate);
      deliveryDate.setDate(deliveryDate.getDate() - (teaserCount - i)); // Count up to event
      // Random hour between 10-20 (10am-8pm)
      const randomHour = 10 + Math.floor(Math.random() * 10);
      const randomMinute = Math.floor(Math.random() * 60);
      deliveryDate.setHours(randomHour, randomMinute, 0, 0);

      return {
        room_id: event_id,
        message,
        teaser_type: mode === 'ai' ? 'personalized' : 'generic',
        target_player_id: null, // broadcast to all
        sent_at: deliveryDate.toISOString(),
      };
    });

    // Delete any existing teasers for this event (regeneration)
    await supabase
      .from('teasers')
      .delete()
      .eq('room_id', event_id)
      .in('teaser_type', ['generic', 'personalized']);

    // Insert new teasers
    const { error } = await supabase.from('teasers').insert(teaserRows);
    if (error) throw error;

    return new Response(JSON.stringify({
      teasers_created: teaserRows.length,
      days_until_event: daysUntil,
      mode,
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

function pickRandomTeasers(count: number): string[] {
  const shuffled = [...TEASER_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

interface PlayerData {
  id: string;
  nickname: string;
  setup_answers: Record<string, unknown> | null;
  player_id: string;
}

async function generateAITeasers(players: PlayerData[], count: number): Promise<string[]> {
  const playerDescriptions = players.map(p => {
    const answers = p.setup_answers;
    return `- ${p.nickname}: chaos_comfort=${answers?.chaos_comfort ?? 'unknown'}, social_style=${answers?.social_style ?? 'unknown'}, wildcard="${answers?.wildcard ?? ''}"`;
  }).join('\n');

  const contextPrompt = `Generate ${count} teaser messages for an upcoming game night.

PLAYERS:
${playerDescriptions}

Generate teasers that escalate in intensity — start mysterious and cryptic, end dramatic and urgent. Reference specific player names and their answers when it makes sense. Mix personal, group, and mysterious teasers.

The last teaser should feel like a final warning before the event.`;

  const response = await generateWithSystem(AI_TEASER_SYSTEM, contextPrompt);

  try {
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const teasers: string[] = JSON.parse(jsonStr);
    return teasers.slice(0, count);
  } catch {
    // Fallback to static pool if AI response is malformed
    return pickRandomTeasers(count);
  }
}
