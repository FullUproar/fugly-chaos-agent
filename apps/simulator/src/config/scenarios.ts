type GameType = 'board_game' | 'party_game' | 'dinner_party' | 'house_party' | 'bar_night' | 'custom';

export interface ScenarioVariation {
  id: string;
  label: string; // "A" or "B" or "C"
  description: string;
  eventFrequency: {
    flashMissionIntervalMin: [number, number];
    pollIntervalMin: [number, number];
    miniGameIntervalMin: [number, number];
  };
  // Override settings
  standingMissionCount?: number;
  flashDurationMs?: number;
  suppressDuringHighTension?: boolean;
  autoBreakEnabled?: boolean;
  autoBreakThreshold?: number; // energy level to trigger
  personalChaosLevel?: boolean; // allow per-player chaos settings
  miniGameWeight?: number; // relative weight vs flash/poll
  /** Max events allowed in entire session (for gentle onboarding). */
  maxEventsPerSession?: number;
  /** Delay in minutes before first event fires. */
  firstEventDelayMin?: number;
  /** Gradual ramp: multiply intervals by this factor early, shrinking to 1.0 over time. */
  intervalRampFactor?: number;
  /** Flash mission point multiplier. */
  flashPointMultiplier?: number;
  /** Restrict event types (e.g. no flash missions for dinner). */
  allowedEventTypes?: Array<'flash_mission' | 'poll' | 'mini_game'>;
  /** Filter standing missions to these categories only. */
  allowedMissionCategories?: Array<'social' | 'performance' | 'sabotage' | 'alliance' | 'endurance' | 'meta'>;
  /** Filter mini-game types to these only. */
  allowedMiniGameTypes?: Array<string>;
  /** AI personalization depth: 'deep', 'light', 'none'. */
  aiPersonalizationDepth?: 'deep' | 'light' | 'none';
  /** Use provocative poll pool instead of standard. */
  provocativePolls?: boolean;
}

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
  variations: ScenarioVariation[];
}

// ── Board Game Variations ────────────────────────────────────────────────────
// Sim data: 5.6/10 fun, 0.3 events/10min (way too low), Marcus hated interruptions
// during strategy moments, Diana frustrated by vagueness. Need to test slower pace
// vs current vs even slower with tension suppression.

const boardGameVariations: ScenarioVariation[] = [
  {
    id: 'casual_board_game_A',
    label: 'A',
    description: 'Conservative: sparse events, suppress during tense moments, auto-breaks ON',
    eventFrequency: {
      flashMissionIntervalMin: [20, 30],
      pollIntervalMin: [30, 40],
      miniGameIntervalMin: [45, 60],
    },
    suppressDuringHighTension: true,
    autoBreakEnabled: true,
    autoBreakThreshold: 4,
  },
  {
    id: 'casual_board_game_B',
    label: 'B',
    description: 'Moderate: balanced events, suppress during tension',
    eventFrequency: {
      flashMissionIntervalMin: [12, 18],
      pollIntervalMin: [20, 25],
      miniGameIntervalMin: [30, 40],
    },
    suppressDuringHighTension: true,
  },
  {
    id: 'casual_board_game_C',
    label: 'C',
    description: 'Current settings (control group)',
    eventFrequency: {
      flashMissionIntervalMin: [8, 15],
      pollIntervalMin: [12, 20],
      miniGameIntervalMin: [18, 30],
    },
  },
];

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
  variations: boardGameVariations,
};

// ── Party Game Variations ────────────────────────────────────────────────────
// Sim data: 5.3/10 fun, 1.2 events/10min, Marcus (3.6 fun) hated relentless pace,
// but Alex/Jade/Pat loved it. Need to test if more chaos helps the majority
// while potentially alienating competitive players.

const partyGameVariations: ScenarioVariation[] = [
  {
    id: 'chaotic_party_game_A',
    label: 'A',
    description: 'Relentless: maximum event density for chaos lovers',
    eventFrequency: {
      flashMissionIntervalMin: [3, 5],
      pollIntervalMin: [6, 8],
      miniGameIntervalMin: [10, 15],
    },
  },
  {
    id: 'chaotic_party_game_B',
    label: 'B',
    description: 'Moderate: balanced pace with breathing room',
    eventFrequency: {
      flashMissionIntervalMin: [5, 8],
      pollIntervalMin: [10, 15],
      miniGameIntervalMin: [15, 20],
    },
  },
  {
    id: 'chaotic_party_game_C',
    label: 'C',
    description: 'Breathing Room: slower pace, more space between events',
    eventFrequency: {
      flashMissionIntervalMin: [8, 12],
      pollIntervalMin: [15, 20],
      miniGameIntervalMin: [20, 30],
    },
  },
];

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
  variations: partyGameVariations,
};

// ── Bar Night Variations ─────────────────────────────────────────────────────
// Sim data: 6.1/10 fun (HIGHEST), 0.8 events/10min, 100% would play again,
// 100% would recommend. Standing claims are the star (6.3 avg fun).
// Fewer standing missions, bigger flash rewards, provocative polls.

const barNightVariations: ScenarioVariation[] = [
  {
    id: 'bar_night_brawl_A',
    label: 'A',
    description: 'Background: casual pace, fewer standing missions, low-key',
    eventFrequency: {
      flashMissionIntervalMin: [10, 15],
      pollIntervalMin: [15, 20],
      miniGameIntervalMin: [25, 35],
    },
    standingMissionCount: 5,
  },
  {
    id: 'bar_night_brawl_B',
    label: 'B',
    description: 'Party Mode: moderate pace, bigger flash rewards, provocative polls',
    eventFrequency: {
      flashMissionIntervalMin: [5, 8],
      pollIntervalMin: [8, 12],
      miniGameIntervalMin: [15, 20],
    },
    standingMissionCount: 5,
    flashPointMultiplier: 1.5,
    provocativePolls: true,
    allowedMiniGameTypes: ['worst_advice', 'speed_superlative', 'hot_take', 'caption'],
  },
  {
    id: 'bar_night_brawl_C',
    label: 'C',
    description: 'Chaos Max: relentless pace, fewer rules, maximum provocation',
    eventFrequency: {
      flashMissionIntervalMin: [3, 5],
      pollIntervalMin: [5, 8],
      miniGameIntervalMin: [8, 12],
    },
    standingMissionCount: 5,
    flashPointMultiplier: 2.0,
    provocativePolls: true,
    allowedMiniGameTypes: ['worst_advice', 'speed_superlative', 'hot_take', 'caption'],
  },
];

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
  variations: barNightVariations,
};

// ── Dinner Party Variations ──────────────────────────────────────────────────
// Sim data: 3.6/10 fun (WORST), humor quality 3.2/10, Marcus 2.1 fun,
// Tyler 1.4 fun. Performance challenges and flash missions don't work here.
// Social polls and alliance missions only for variation A.

const dinnerPartyVariations: ScenarioVariation[] = [
  {
    id: 'chill_dinner_party_A',
    label: 'A',
    description: 'Minimal: polls only (no flash), social/alliance missions only, gentle mini-games',
    eventFrequency: {
      flashMissionIntervalMin: [25, 35],
      pollIntervalMin: [20, 30],
      miniGameIntervalMin: [40, 50],
    },
    allowedEventTypes: ['poll', 'mini_game'], // NO flash missions
    allowedMissionCategories: ['social', 'alliance'],
    allowedMiniGameTypes: ['caption', 'hot_take', 'assumption_arena'],
    standingMissionCount: 5,
  },
  {
    id: 'chill_dinner_party_B',
    label: 'B',
    description: 'Social Focus: social-only flash missions, frequent polls, social mini-games',
    eventFrequency: {
      flashMissionIntervalMin: [15, 20],
      pollIntervalMin: [12, 18],
      miniGameIntervalMin: [25, 35],
    },
    allowedMissionCategories: ['social', 'alliance'],
    allowedMiniGameTypes: ['caption', 'hot_take', 'assumption_arena'],
  },
  {
    id: 'chill_dinner_party_C',
    label: 'C',
    description: 'Standard: current settings (control group)',
    eventFrequency: {
      flashMissionIntervalMin: [15, 25],
      pollIntervalMin: [20, 35],
      miniGameIntervalMin: [30, 45],
    },
  },
];

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
  variations: dinnerPartyVariations,
};

// ── Newbie Variations ────────────────────────────────────────────────────────
// Sim data: 5.9/10 fun, Sam (newbie) at 5.4 fun is actually decent.
// Marcus crashed to 1.1 energy. Test gentle onboarding with delayed start
// and max event cap vs buddy system vs sink-or-swim.

const newbieVariations: ScenarioVariation[] = [
  {
    id: 'newbie_overwhelm_A',
    label: 'A',
    description: 'Gentle Onboarding: delayed first event, gradual ramp, auto-breaks, max 8 events',
    eventFrequency: {
      flashMissionIntervalMin: [8, 12],
      pollIntervalMin: [10, 15],
      miniGameIntervalMin: [15, 25],
    },
    firstEventDelayMin: 15,
    intervalRampFactor: 2.0, // starts at 2x interval, shrinks to 1x over time
    autoBreakEnabled: true,
    autoBreakThreshold: 5,
    maxEventsPerSession: 8,
  },
  {
    id: 'newbie_overwhelm_B',
    label: 'B',
    description: 'Buddy System: moderate frequency, personal chaos tracking per player',
    eventFrequency: {
      flashMissionIntervalMin: [5, 10],
      pollIntervalMin: [8, 12],
      miniGameIntervalMin: [12, 20],
    },
    personalChaosLevel: true,
  },
  {
    id: 'newbie_overwhelm_C',
    label: 'C',
    description: 'Sink or Swim: standard frequency, no special treatment (control group)',
    eventFrequency: {
      flashMissionIntervalMin: [3, 7],
      pollIntervalMin: [4, 8],
      miniGameIntervalMin: [8, 15],
    },
  },
];

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
  variations: newbieVariations,
};

// ── AI Enhanced Variations ───────────────────────────────────────────────────
// Sim data: 5.1/10 fun -- LOWER than static 5.3. AI prompts are too generic,
// just swapping names into templates. Need deep personalization that references
// specific player answers, recent events, and player relationships.

const aiEnhancedVariations: ScenarioVariation[] = [
  {
    id: 'ai_enhanced_party_A',
    label: 'A',
    description: 'Deep Personalization: AI references specific answers, events, and relationships',
    eventFrequency: {
      flashMissionIntervalMin: [4, 10],
      pollIntervalMin: [6, 12],
      miniGameIntervalMin: [10, 20],
    },
    aiPersonalizationDepth: 'deep',
  },
  {
    id: 'ai_enhanced_party_B',
    label: 'B',
    description: 'Light Personalization: AI uses player names in templates',
    eventFrequency: {
      flashMissionIntervalMin: [4, 10],
      pollIntervalMin: [6, 12],
      miniGameIntervalMin: [10, 20],
    },
    aiPersonalizationDepth: 'light',
  },
  {
    id: 'ai_enhanced_party_C',
    label: 'C',
    description: 'Static: no AI personalization (control group)',
    eventFrequency: {
      flashMissionIntervalMin: [4, 10],
      pollIntervalMin: [6, 12],
      miniGameIntervalMin: [10, 20],
    },
    aiPersonalizationDepth: 'none',
  },
];

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
  variations: aiEnhancedVariations,
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

/** Get a specific variation for a scenario. Throws on unknown label. */
export function getVariation(scenario: ScenarioDefinition, label: string): ScenarioVariation {
  const variation = scenario.variations.find((v) => v.label.toLowerCase() === label.toLowerCase());
  if (!variation) {
    const available = scenario.variations.map((v) => v.label).join(', ');
    throw new Error(`Unknown variation "${label}" for scenario "${scenario.id}". Available: ${available}`);
  }
  return variation;
}
