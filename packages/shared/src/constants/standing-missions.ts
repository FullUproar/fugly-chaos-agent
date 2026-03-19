import type { MissionCategory } from '../types/database';

export interface StandingMissionTemplate {
  title: string;
  description: string;
  points: number;
  category: MissionCategory;
}

export const STANDING_MISSION_POOL: StandingMissionTemplate[] = [
  // Social catches (5 pts each — low stakes background chaos)
  { title: 'Um Counter', description: "Catch someone saying 'um' or 'uh'. Call it out to claim.", points: 5, category: 'social' },
  { title: 'Phone Addict', description: 'Catch someone checking their phone when they should be paying attention.', points: 5, category: 'social' },
  { title: 'Name Dropper', description: "Catch someone name-dropping a celebrity or famous person.", points: 5, category: 'social' },
  { title: 'The Apologizer', description: "Catch someone saying 'sorry' for no real reason.", points: 5, category: 'social' },
  { title: 'Potty Mouth', description: 'Catch someone swearing. First to call it out gets the points.', points: 5, category: 'social' },
  { title: 'Story Repeater', description: "Catch someone telling a story they've already told tonight.", points: 10, category: 'social' },
  { title: 'The Interrupter', description: 'Catch someone interrupting another player mid-sentence.', points: 5, category: 'social' },
  { title: 'Drink Spotter', description: 'Catch someone taking a drink at the exact same time as another player.', points: 5, category: 'social' },

  // Endurance challenges (10 pts — you have to maintain something)
  { title: 'No Laughing Zone', description: "Don't laugh for 5 minutes straight. Others can try to make you crack.", points: 10, category: 'endurance' },
  { title: 'The Whisperer', description: 'Only speak in whispers for 3 minutes. If caught talking normally, someone else claims.', points: 10, category: 'endurance' },
  { title: 'Straight Face', description: 'Keep a completely straight face during the next funny moment. Others judge if you cracked.', points: 10, category: 'endurance' },
  { title: 'Left Hand Only', description: 'Only use your left hand for 5 minutes. First person to catch you using your right claims.', points: 10, category: 'endurance' },

  // Social engineering (10-15 pts — make something happen)
  { title: 'Compliment Chain', description: 'Get 3 different people to compliment each other within 5 minutes.', points: 15, category: 'alliance' },
  { title: 'Topic Hijacker', description: 'Steer the group conversation to a completely random topic. Claim when everyone is discussing it.', points: 10, category: 'sabotage' },
  { title: 'The Matchmaker', description: 'Get two people who rarely talk to each other into a real conversation.', points: 15, category: 'alliance' },
  { title: 'Laugh Riot', description: 'Make at least 3 people laugh at once with a single joke or comment.', points: 10, category: 'performance' },

  // Meta (5-10 pts — game about the game)
  { title: 'Secret Agent', description: "Do something obviously chaotic and don't get caught by any other player for 2 minutes.", points: 10, category: 'meta' },
  { title: 'Chaos Detector', description: 'Correctly guess which player just completed a mission before they claim it.', points: 10, category: 'meta' },
  { title: 'Wallflower Watch', description: 'Be the first to notice when someone has been quiet for more than 3 minutes. Call it out.', points: 5, category: 'social' },
  { title: 'Rule Lawyer', description: 'Catch someone breaking a rule of the actual game you are playing.', points: 5, category: 'meta' },
];
