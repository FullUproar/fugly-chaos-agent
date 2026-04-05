// Curated mission pools for edge functions (duplicated from shared package since Deno can't import it)

import { getAdminClient } from './supabase-client.ts';

// --- Standing Mission Pool ---

interface StandingTemplate {
  title: string;
  description: string;
  points: number;
  category: string;
}

const STANDING_POOL: StandingTemplate[] = [
  { title: 'Um Counter', description: "Catch someone saying 'um' or 'uh'. Call it out to claim.", points: 5, category: 'social' },
  { title: 'Phone Addict', description: 'Catch someone checking their phone when they should be paying attention.', points: 5, category: 'social' },
  { title: 'Name Dropper', description: 'Catch someone name-dropping a celebrity or famous person.', points: 5, category: 'social' },
  { title: 'The Apologizer', description: "Catch someone saying 'sorry' for no real reason.", points: 5, category: 'social' },
  { title: 'Potty Mouth', description: 'Catch someone swearing. First to call it out gets the points.', points: 5, category: 'social' },
  { title: 'Story Repeater', description: "Catch someone telling a story they've already told tonight.", points: 10, category: 'social' },
  { title: 'The Interrupter', description: 'Catch someone interrupting another player mid-sentence.', points: 5, category: 'social' },
  { title: 'Drink Spotter', description: 'Catch someone taking a drink at the exact same time as another player.', points: 5, category: 'social' },
  { title: 'No Laughing Zone', description: "Don't laugh for 5 minutes straight. Others can try to make you crack.", points: 10, category: 'endurance' },
  { title: 'The Whisperer', description: 'Only speak in whispers for 3 minutes. If caught talking normally, someone else claims.', points: 10, category: 'endurance' },
  { title: 'Straight Face', description: 'Keep a completely straight face during the next funny moment.', points: 10, category: 'endurance' },
  { title: 'Left Hand Only', description: 'Only use your left hand for 5 minutes. Catch someone using their right to claim.', points: 10, category: 'endurance' },
  { title: 'Compliment Chain', description: 'Get 3 different people to compliment each other within 5 minutes.', points: 15, category: 'alliance' },
  { title: 'Topic Hijacker', description: 'Steer the group conversation to a completely random topic. Claim when everyone is discussing it.', points: 10, category: 'sabotage' },
  { title: 'The Matchmaker', description: 'Get two people who rarely talk into a real conversation.', points: 15, category: 'alliance' },
  { title: 'Laugh Riot', description: 'Make at least 3 people laugh at once with a single joke or comment.', points: 10, category: 'performance' },
  { title: 'Secret Agent', description: "Do something obviously chaotic and don't get caught for 2 minutes.", points: 10, category: 'meta' },
  { title: 'Chaos Detector', description: 'Correctly guess which player just completed a mission before they claim it.', points: 10, category: 'meta' },
  { title: 'Wallflower Watch', description: 'Be the first to notice when someone has been quiet for more than 3 minutes.', points: 5, category: 'social' },
  { title: 'Rule Lawyer', description: 'Catch someone breaking a rule of the actual game you are playing.', points: 5, category: 'meta' },
];

// --- Flash Mission Pool ---

interface FlashTemplate {
  flash_type: 'race' | 'target' | 'group';
  title: string;
  description: string;
  points: number;
  category: string;
  requires_target?: boolean;
}

const FLASH_POOL: FlashTemplate[] = [
  { flash_type: 'race', title: 'Say It Loud', description: "First person to yell 'CHAOS AGENT' wins!", points: 10, category: 'performance' },
  { flash_type: 'race', title: 'Pineapple!', description: "First person to work the word 'pineapple' into conversation naturally wins.", points: 10, category: 'social' },
  { flash_type: 'race', title: 'Compliment Bomb', description: 'First person to give a genuine compliment to the player on their left wins.', points: 10, category: 'social' },
  { flash_type: 'race', title: 'Air Guitar Solo', description: 'First person to bust out a 5-second air guitar solo wins.', points: 10, category: 'performance' },
  { flash_type: 'race', title: 'Celebrity Impression', description: 'First person to do a recognizable celebrity impression wins.', points: 15, category: 'performance' },
  { flash_type: 'race', title: 'Dad Joke Showdown', description: 'First person to make someone else groan at a dad joke wins.', points: 10, category: 'social' },
  { flash_type: 'race', title: 'High Five Chain', description: 'First person to high-five 3 different players wins.', points: 10, category: 'social' },
  { flash_type: 'race', title: 'Toast Master', description: 'First person to raise their glass and give a toast wins.', points: 10, category: 'performance' },
  { flash_type: 'target', title: 'Topic Trap', description: 'Get [PLAYER] to talk about their job without directly asking.', points: 25, category: 'sabotage', requires_target: true },
  { flash_type: 'target', title: 'Laugh Attack', description: 'Make [PLAYER] laugh within 60 seconds.', points: 20, category: 'social', requires_target: true },
  { flash_type: 'target', title: 'The Echo', description: 'Get [PLAYER] to repeat a specific word you say without them noticing.', points: 25, category: 'sabotage', requires_target: true },
  { flash_type: 'target', title: 'Copycat', description: 'Get [PLAYER] to mirror your body language within 30 seconds.', points: 20, category: 'sabotage', requires_target: true },
  { flash_type: 'target', title: 'Story Time', description: 'Get [PLAYER] to tell a story about their childhood.', points: 20, category: 'social', requires_target: true },
  { flash_type: 'target', title: 'Snack Run', description: 'Convince [PLAYER] to get up and get you something.', points: 25, category: 'sabotage', requires_target: true },
  { flash_type: 'group', title: 'Point of Blame', description: 'Everyone point at who you think is the most chaotic!', points: 5, category: 'meta' },
  { flash_type: 'group', title: 'Freeze!', description: 'Everyone freeze for 10 seconds. Last to move gets bonus points.', points: 5, category: 'endurance' },
  { flash_type: 'group', title: 'Confess!', description: 'Everyone confess something slightly embarrassing. Group votes on best one.', points: 5, category: 'performance' },
];

// --- Poll Question Pool ---

const POLL_POOL: string[] = [
  "Who's the most chaotic tonight?",
  "Who's most likely to crack first?",
  "Who's been suspiciously quiet?",
  "Who would survive a zombie apocalypse?",
  "Who tells the best stories?",
  "Who's the worst liar here?",
  "Who's the most competitive?",
  "Who should get targeted next?",
  "Who's having the most fun right now?",
  "Who would you trust with a secret?",
  "Who's the biggest troublemaker?",
  "Who would be the best spy?",
  "Who gives the best advice?",
  "Who's most likely to forget this night?",
  "Who's the funniest person here?",
];

// --- Provocative Poll Pool (bar_night) ---

const PROVOCATIVE_POLL_POOL: string[] = [
  "Who's the worst driver here?",
  "Who's most likely to drunk-text their ex?",
  "Who would be the worst roommate?",
  "Who has the most embarrassing music taste?",
  "Who would survive the longest on a desert island?",
  "Who talks the most trash but can't back it up?",
  "Who's most likely to start a bar fight?",
  "Who would be the worst at keeping a secret?",
  "Who's most likely to ghost someone?",
  "Who has the worst taste in movies?",
];

// --- Helpers ---

function pickRandom<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

interface PlayerInfo {
  id: string; // room_player_id
  nickname: string;
}

export async function generateStandingMissions(
  roomId: string,
  count: number = 8,
  allowedCategories: string[] | null = null,
): Promise<void> {
  const supabase = getAdminClient();
  const pool = allowedCategories
    ? STANDING_POOL.filter((t) => allowedCategories.includes(t.category))
    : STANDING_POOL;
  const selected = pickRandom(pool, count);

  // Generate all missions as HIDDEN, then reveal 1-2 at session start
  const missions = selected.map((t) => ({
    room_id: roomId,
    room_player_id: null,
    title: t.title,
    description: t.description,
    difficulty: t.points <= 5 ? 1 : t.points <= 10 ? 2 : 3,
    points: t.points,
    category: t.category,
    status: 'HIDDEN',
    type: 'standing',
    flash_type: null,
    expires_at: null,
    visible_to: 'all',
    target_player_id: null,
  }));

  await supabase.from('missions').insert(missions);

  // Reveal 1-2 missions immediately so there's something to play with
  const revealCount = Math.random() < 0.5 ? 1 : 2;
  const { data: hiddenMissions } = await supabase
    .from('missions')
    .select('id')
    .eq('room_id', roomId)
    .eq('type', 'standing')
    .eq('status', 'HIDDEN')
    .limit(revealCount);

  if (hiddenMissions && hiddenMissions.length > 0) {
    await supabase
      .from('missions')
      .update({ status: 'REVEALED' })
      .in('id', hiddenMissions.map((m) => m.id));
  }
}

export async function generateFlashMission(
  roomId: string,
  players: PlayerInfo[],
  compressTimers: boolean = false,
  specificFlashType?: 'race' | 'target' | 'group',
): Promise<{ id: string; title: string; points: number }> {
  const supabase = getAdminClient();

  // Filter by flash type if specified
  let pool = FLASH_POOL;
  if (specificFlashType) {
    pool = pool.filter((t) => t.flash_type === specificFlashType);
  }

  const [template] = pickRandom(pool, 1);

  // Substitute [PLAYER] for target missions
  let description = template.description;
  let targetPlayerId: string | null = null;

  if (template.requires_target && players.length > 0) {
    const [target] = pickRandom(players, 1);
    description = description.replace('[PLAYER]', target.nickname);
    targetPlayerId = target.id;
  }

  const durationMs = compressTimers ? 30000 : 75000;
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  const { data, error } = await supabase
    .from('missions')
    .insert({
      room_id: roomId,
      room_player_id: null,
      title: template.title,
      description,
      difficulty: template.points <= 10 ? 2 : 3,
      points: template.points,
      category: template.category,
      status: 'REVEALED',
      type: 'flash',
      flash_type: template.flash_type,
      expires_at: expiresAt,
      visible_to: 'all',
      target_player_id: targetPlayerId,
    })
    .select('id, title, points')
    .single();

  if (error) throw error;
  return data;
}

export async function generatePoll(
  roomId: string,
  players: PlayerInfo[],
  compressTimers: boolean = false,
  provocative: boolean = false,
): Promise<{ id: string; question: string }> {
  const supabase = getAdminClient();

  const questionPool = provocative ? PROVOCATIVE_POLL_POOL : POLL_POOL;
  const [question] = pickRandom(questionPool, 1);
  const options = players.map((p) => p.nickname);
  const durationMs = compressTimers ? 15000 : 30000;
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  const { data, error } = await supabase
    .from('polls')
    .insert({
      room_id: roomId,
      question,
      poll_type: 'player_vote',
      options: JSON.stringify(options),
      status: 'ACTIVE',
      expires_at: expiresAt,
    })
    .select('id, question')
    .single();

  if (error) throw error;
  return data;
}
