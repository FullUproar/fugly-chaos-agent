import type { FlashType, MissionCategory } from '../types/database';

export interface FlashMissionTemplate {
  flash_type: FlashType;
  title: string;
  description: string;
  points: number;
  category: MissionCategory;
  requires_target?: boolean; // needs [PLAYER] substitution
}

export const FLASH_MISSION_POOL: FlashMissionTemplate[] = [
  // Race missions — first to complete wins
  { flash_type: 'race', title: 'Say It Loud', description: "First person to yell 'CHAOS AGENT' wins!", points: 10, category: 'performance' },
  { flash_type: 'race', title: 'Pineapple!', description: "First person to work the word 'pineapple' into conversation naturally wins.", points: 10, category: 'social' },
  { flash_type: 'race', title: 'Compliment Bomb', description: 'First person to give a genuine compliment to the player on their left wins.', points: 10, category: 'social' },
  { flash_type: 'race', title: 'Air Guitar Solo', description: 'First person to bust out a 5-second air guitar solo wins.', points: 10, category: 'performance' },
  { flash_type: 'race', title: 'Celebrity Impression', description: 'First person to do a recognizable celebrity impression wins.', points: 15, category: 'performance' },
  { flash_type: 'race', title: 'Dad Joke Showdown', description: 'First person to make someone else groan at a dad joke wins.', points: 10, category: 'social' },
  { flash_type: 'race', title: 'High Five Chain', description: 'First person to high-five 3 different players wins.', points: 10, category: 'social' },
  { flash_type: 'race', title: 'Toast Master', description: 'First person to raise their glass and give a toast (real or ridiculous) wins.', points: 10, category: 'performance' },

  // Target missions — get a specific player to do something
  { flash_type: 'target', title: 'Topic Trap', description: 'Get [PLAYER] to talk about their job without directly asking them about it.', points: 25, category: 'sabotage', requires_target: true },
  { flash_type: 'target', title: 'Laugh Attack', description: 'Make [PLAYER] laugh within 60 seconds. Any laugh counts.', points: 20, category: 'social', requires_target: true },
  { flash_type: 'target', title: 'The Echo', description: 'Get [PLAYER] to repeat a specific word you say, without them noticing.', points: 25, category: 'sabotage', requires_target: true },
  { flash_type: 'target', title: 'Copycat', description: 'Get [PLAYER] to mirror your body language within 30 seconds.', points: 20, category: 'sabotage', requires_target: true },
  { flash_type: 'target', title: 'Story Time', description: 'Get [PLAYER] to tell a story about their childhood.', points: 20, category: 'social', requires_target: true },
  { flash_type: 'target', title: 'Snack Run', description: 'Convince [PLAYER] to get up and get you something to drink or eat.', points: 25, category: 'sabotage', requires_target: true },

  // Group missions — everyone participates
  { flash_type: 'group', title: 'Point of Blame', description: 'Everyone point at who you think is the most chaotic player tonight!', points: 5, category: 'meta' },
  { flash_type: 'group', title: 'Freeze!', description: "Everyone freeze in place for 10 seconds. Last one to move wins 5 bonus points. Anyone who moves first loses 2.", points: 5, category: 'endurance' },
  { flash_type: 'group', title: 'Confess!', description: 'Everyone must confess one slightly embarrassing thing. Group votes on the best confession.', points: 5, category: 'performance' },
];
