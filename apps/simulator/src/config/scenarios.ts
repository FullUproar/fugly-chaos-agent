type GameType = 'board_game' | 'party_game' | 'dinner_party' | 'house_party' | 'bar_night' | 'custom';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  playerCount: number;
  personaIds: string[];
  gameType: GameType;
  chaosComfort: 'chill' | 'moderate' | 'maximum';
  totalMinutes: number;
  eventFrequency: {
    flashMissionIntervalMin: [number, number];
    pollIntervalMin: [number, number];
    miniGameIntervalMin: [number, number];
  };
  aiMode?: boolean;
}

const casualBoardGame: ScenarioDefinition = {
  id: 'casual_board_game',
  name: 'Casual Board Game Night',
  description:
    'A typical board game night with 6 friends. Mixed chaos tolerance, one phone addict, ' +
    'one competitor who wants to focus, and a host keeping things together.',
  playerCount: 6,
  personaIds: ['marcus', 'jade', 'tyler', 'pat', 'river', 'diana'],
  gameType: 'board_game',
  chaosComfort: 'moderate',
  totalMinutes: 150,
  eventFrequency: {
    flashMissionIntervalMin: [8, 15],
    pollIntervalMin: [12, 20],
    miniGameIntervalMin: [18, 30],
  },
};

const chaoticPartyGame: ScenarioDefinition = {
  id: 'chaotic_party_game',
  name: 'Maximum Chaos Party Game',
  description:
    'A high-energy party game night where most players are all-in on chaos. ' +
    'Events fire frequently and the instigator is in full effect.',
  playerCount: 6,
  personaIds: ['alex', 'jade', 'pat', 'tyler', 'sam', 'marcus'],
  gameType: 'party_game',
  chaosComfort: 'maximum',
  totalMinutes: 120,
  eventFrequency: {
    flashMissionIntervalMin: [4, 10],
    pollIntervalMin: [6, 12],
    miniGameIntervalMin: [10, 20],
  },
};

const newbieOverwhelm: ScenarioDefinition = {
  id: 'newbie_overwhelm',
  name: 'Newbie Overwhelm Test',
  description:
    'Stress test: Sam (first-timer) dropped into a high-frequency event scenario. ' +
    'Tests whether the system detects engagement drop-off and adapts.',
  playerCount: 5,
  personaIds: ['sam', 'alex', 'jade', 'marcus', 'pat'],
  gameType: 'party_game',
  chaosComfort: 'maximum',
  totalMinutes: 90,
  eventFrequency: {
    flashMissionIntervalMin: [3, 7],
    pollIntervalMin: [4, 8],
    miniGameIntervalMin: [8, 15],
  },
};

const chillDinnerParty: ScenarioDefinition = {
  id: 'chill_dinner_party',
  name: 'Chill Dinner Party',
  description:
    'A laid-back dinner party with minimal disruption. Events are infrequent and low-key. ' +
    'Tests whether the system can maintain engagement at a slow burn.',
  playerCount: 8,
  personaIds: ['pat', 'jade', 'river', 'diana', 'sam', 'marcus', 'tyler', 'alex'],
  gameType: 'dinner_party',
  chaosComfort: 'chill',
  totalMinutes: 150,
  eventFrequency: {
    flashMissionIntervalMin: [15, 25],
    pollIntervalMin: [20, 35],
    miniGameIntervalMin: [30, 45],
  },
};

const barNightBrawl: ScenarioDefinition = {
  id: 'bar_night_brawl',
  name: 'Bar Night Brawl',
  description:
    'A rowdy bar night with heavy drinkers and short attention spans. ' +
    'High signal frequency, lots of phone usage, moderate chaos.',
  playerCount: 5,
  personaIds: ['alex', 'jade', 'tyler', 'pat', 'river'],
  gameType: 'bar_night',
  chaosComfort: 'moderate',
  totalMinutes: 120,
  eventFrequency: {
    flashMissionIntervalMin: [6, 12],
    pollIntervalMin: [8, 15],
    miniGameIntervalMin: [15, 25],
  },
};

const aiEnhancedParty: ScenarioDefinition = {
  id: 'ai_enhanced_party',
  name: 'AI-Enhanced Party Game (vs Static)',
  description:
    'Same as chaotic_party_game but with AI-personalized missions that reference player names, ' +
    'recent events, and inside jokes. Compare results with chaotic_party_game to measure AI impact.',
  playerCount: 6,
  personaIds: ['alex', 'jade', 'pat', 'tyler', 'sam', 'marcus'],
  gameType: 'party_game',
  chaosComfort: 'maximum',
  totalMinutes: 120,
  eventFrequency: {
    flashMissionIntervalMin: [4, 10],
    pollIntervalMin: [6, 12],
    miniGameIntervalMin: [10, 20],
  },
  aiMode: true,
};

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  casual_board_game: casualBoardGame,
  chaotic_party_game: chaoticPartyGame,
  newbie_overwhelm: newbieOverwhelm,
  chill_dinner_party: chillDinnerParty,
  bar_night_brawl: barNightBrawl,
  ai_enhanced_party: aiEnhancedParty,
};

/** Get a scenario by id. Throws on unknown id. */
export function getScenario(id: string): ScenarioDefinition {
  const scenario = SCENARIOS[id];
  if (!scenario) {
    throw new Error(`Unknown scenario id: "${id}". Available: ${Object.keys(SCENARIOS).join(', ')}`);
  }
  return scenario;
}

/** List all available scenario ids. */
export function listScenarioIds(): string[] {
  return Object.keys(SCENARIOS);
}
