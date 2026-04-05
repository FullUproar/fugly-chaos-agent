import type { MiniGameType } from './mini-game-variations';

export interface MiniGameTemplate {
  type: MiniGameType;
  prompt: string;
  points: number;
  submissionTimeSec: number;
  votingTimeSec: number;
  playerNameSlot?: boolean; // true if {PLAYER} should be replaced with a random player name
}

export const DRAWING_PROMPTS: MiniGameTemplate[] = [
  { type: 'drawing', prompt: "Draw {PLAYER}'s spirit animal", points: 25, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  { type: 'drawing', prompt: "Draw what {PLAYER} looks like at 3am", points: 25, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  { type: 'drawing', prompt: "Draw the most chaotic snack combination", points: 20, submissionTimeSec: 45, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw your reaction when someone calls BULLSHIT", points: 20, submissionTimeSec: 45, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw {PLAYER} winning a Nobel Prize", points: 25, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  { type: 'drawing', prompt: "Draw your last braincell right now", points: 20, submissionTimeSec: 45, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw {PLAYER}'s dating profile photo", points: 30, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  { type: 'drawing', prompt: "Draw what you think the host's search history looks like", points: 25, submissionTimeSec: 60, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw a new mascot for this group", points: 20, submissionTimeSec: 60, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw {PLAYER} as a superhero with the lamest power", points: 25, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  { type: 'drawing', prompt: "Draw what chaos looks like", points: 20, submissionTimeSec: 45, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw {PLAYER}'s autobiography cover", points: 30, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
];

export const CAPTION_PROMPTS: MiniGameTemplate[] = [
  { type: 'caption', prompt: "Write a tagline for {PLAYER}'s reality TV show", points: 20, submissionTimeSec: 30, votingTimeSec: 20, playerNameSlot: true },
  { type: 'caption', prompt: "What's {PLAYER} thinking right now?", points: 15, submissionTimeSec: 25, votingTimeSec: 20, playerNameSlot: true },
  { type: 'caption', prompt: "Write a fortune cookie message for this group", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'caption', prompt: "Name this game night in 5 words or less", points: 15, submissionTimeSec: 20, votingTimeSec: 20 },
  { type: 'caption', prompt: "Write {PLAYER}'s campaign slogan if they ran for president", points: 20, submissionTimeSec: 30, votingTimeSec: 20, playerNameSlot: true },
  { type: 'caption', prompt: "What would {PLAYER}'s autobiography be called?", points: 20, submissionTimeSec: 25, votingTimeSec: 20, playerNameSlot: true },
  { type: 'caption', prompt: "Write a one-star review of this game night", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'caption', prompt: "Last words of the loser tonight", points: 15, submissionTimeSec: 20, votingTimeSec: 20 },
  { type: 'caption', prompt: "Write a breakup text from {PLAYER} to their phone", points: 20, submissionTimeSec: 25, votingTimeSec: 20, playerNameSlot: true },
  { type: 'caption', prompt: "Describe this group in a haiku", points: 25, submissionTimeSec: 40, votingTimeSec: 20 },
];

export const HOT_TAKE_PROMPTS: MiniGameTemplate[] = [
  { type: 'hot_take', prompt: "Pineapple on pizza is a war crime", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "Board games are better than video games", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "The host always has an unfair advantage", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "{PLAYER} would survive a zombie apocalypse", points: 10, submissionTimeSec: 10, votingTimeSec: 0, playerNameSlot: true },
  { type: 'hot_take', prompt: "Cereal is a soup", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "It's acceptable to look at someone else's screen", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "{PLAYER} is secretly the most competitive person here", points: 10, submissionTimeSec: 10, votingTimeSec: 0, playerNameSlot: true },
  { type: 'hot_take', prompt: "The person who brings snacks is more important than the person who brings games", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "Socks with sandals is a power move", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "You can tell everything about a person by their board game strategy", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "{PLAYER} would be the worst roommate", points: 10, submissionTimeSec: 10, votingTimeSec: 0, playerNameSlot: true },
  { type: 'hot_take', prompt: "Monopoly has ruined more friendships than anything else in history", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
];

export const LIE_DETECTOR_PROMPTS: MiniGameTemplate[] = [
  { type: 'lie_detector', prompt: "Tell us something embarrassing you've done at a party", points: 20, submissionTimeSec: 30, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us about a time you got caught doing something you shouldn't", points: 20, submissionTimeSec: 30, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us your most unusual talent or skill", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us the weirdest food you've ever eaten", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us about a celebrity encounter you've had", points: 20, submissionTimeSec: 30, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us your most irrational fear", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us about the dumbest thing you've ever spent money on", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us about a time you completely failed at something easy", points: 20, submissionTimeSec: 30, votingTimeSec: 20 },
];

export const ALL_MINI_GAME_PROMPTS: MiniGameTemplate[] = [
  ...DRAWING_PROMPTS,
  ...CAPTION_PROMPTS,
  ...HOT_TAKE_PROMPTS,
  ...LIE_DETECTOR_PROMPTS,
];

export function pickMiniGamePrompt(type?: MiniGameType): MiniGameTemplate {
  const pool = type
    ? ALL_MINI_GAME_PROMPTS.filter(p => p.type === type)
    : ALL_MINI_GAME_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}
