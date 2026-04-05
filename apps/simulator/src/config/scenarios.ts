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
  /** Force breaks at a fixed interval in minutes (host superpowers). */
  autoBreakIntervalMin?: number;
  /** Auto-target quiet/low-engagement players with events. */
  autoTargetQuietPlayers?: boolean;
  /** Virality-focused: prefer shareable event types (drawing, caption, photo challenges). */
  viralityFocus?: boolean;
  /** AI references past sessions and running jokes between players. */
  aiMemoryEnabled?: boolean;
  /** AI adjusts event frequency based on real-time group energy levels. */
  aiAdaptiveFrequency?: boolean;
  /** Events specifically reference or target the newbie player to include them. */
  buddyTargeting?: boolean;
  /** First event includes extended explanation/tutorial tooltip. */
  tutorialTooltips?: boolean;
  /** Leaderboard-focused competitive mode with higher point values. */
  competitiveLeaderboard?: boolean;
  /** Polls phrased as conversation-starter icebreakers. */
  icebreakersMode?: boolean;
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

// ── Board Game Variations (Round 2) ──────────────────────────────────────────
// Round 1 winner: A (Conservative). Now refine around that winner with tighter
// variations and test whether host superpowers or removing standing missions
// improve the experience further.

const boardGameVariations: ScenarioVariation[] = [
  {
    id: 'casual_board_game_A',
    label: 'A',
    description: 'R1 Winner baseline: sparse events, tension suppression, auto-breaks',
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
    description: 'Winner + host superpowers: forced breaks every 30min, auto-target quiet players',
    eventFrequency: {
      flashMissionIntervalMin: [20, 30],
      pollIntervalMin: [30, 40],
      miniGameIntervalMin: [45, 60],
    },
    suppressDuringHighTension: true,
    autoBreakEnabled: true,
    autoBreakThreshold: 4,
    autoBreakIntervalMin: 30,
    autoTargetQuietPlayers: true,
  },
  {
    id: 'casual_board_game_C',
    label: 'C',
    description: 'Winner + NO standing missions: only flash/poll/mini-game, test if standing missions matter',
    eventFrequency: {
      flashMissionIntervalMin: [20, 30],
      pollIntervalMin: [30, 40],
      miniGameIntervalMin: [45, 60],
    },
    suppressDuringHighTension: true,
    autoBreakEnabled: true,
    autoBreakThreshold: 4,
    standingMissionCount: 0,
  },
];

const casualBoardGame: ScenarioDefinition = {
  id: 'casual_board_game',
  name: 'Casual Board Game Night',
  description:
    'Round 2: Conservative pacing won R1. Testing host superpowers and zero standing missions ' +
    'against the winner baseline. 6 players, mixed chaos tolerance.',
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

// ── Party Game Variations (Round 2) ──────────────────────────────────────────
// Round 1 winner: C (Breathing Room). Refine around that pacing with heavy
// mini-game weighting and virality-focused event types.

const partyGameVariations: ScenarioVariation[] = [
  {
    id: 'chaotic_party_game_A',
    label: 'A',
    description: 'R1 Winner baseline: breathing room pacing',
    eventFrequency: {
      flashMissionIntervalMin: [8, 12],
      pollIntervalMin: [15, 20],
      miniGameIntervalMin: [20, 30],
    },
  },
  {
    id: 'chaotic_party_game_B',
    label: 'B',
    description: 'Winner + heavy mini-game weight: mini-games every 12-15min, less flash',
    eventFrequency: {
      flashMissionIntervalMin: [15, 20],
      pollIntervalMin: [15, 20],
      miniGameIntervalMin: [12, 15],
    },
    miniGameWeight: 3.0,
  },
  {
    id: 'chaotic_party_game_C',
    label: 'C',
    description: 'Winner + virality focus: drawing/caption/photo challenges, shareable moments',
    eventFrequency: {
      flashMissionIntervalMin: [8, 12],
      pollIntervalMin: [15, 20],
      miniGameIntervalMin: [20, 30],
    },
    viralityFocus: true,
    allowedMiniGameTypes: ['caption', 'drawing', 'photo_challenge', 'hot_take'],
  },
];

const chaoticPartyGame: ScenarioDefinition = {
  id: 'chaotic_party_game',
  name: 'Maximum Chaos Party Game',
  description:
    'Round 2: Breathing Room pacing won R1. Testing heavy mini-game weighting and ' +
    'virality-focused events (drawing/caption/photo) against the winner baseline.',
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

// ── Bar Night Variations (Round 2) ───────────────────────────────────────────
// Round 1 winner: A (Background). Refine around that casual pace with
// social-heavy and competitive-edge variations.

const barNightVariations: ScenarioVariation[] = [
  {
    id: 'bar_night_brawl_A',
    label: 'A',
    description: 'R1 Winner baseline: casual pace, 5 standing missions, low-key background',
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
    description: 'Winner + social-heavy: more polls, fewer flashes, social-only standing missions',
    eventFrequency: {
      flashMissionIntervalMin: [18, 25],
      pollIntervalMin: [10, 14],
      miniGameIntervalMin: [25, 35],
    },
    standingMissionCount: 5,
    allowedMissionCategories: ['social'],
  },
  {
    id: 'bar_night_brawl_C',
    label: 'C',
    description: 'Winner + competitive edge: leaderboard-focused, higher points, more claims',
    eventFrequency: {
      flashMissionIntervalMin: [10, 15],
      pollIntervalMin: [15, 20],
      miniGameIntervalMin: [25, 35],
    },
    standingMissionCount: 5,
    competitiveLeaderboard: true,
    flashPointMultiplier: 2.0,
  },
];

const barNightBrawl: ScenarioDefinition = {
  id: 'bar_night_brawl',
  name: 'Bar Night Brawl',
  description:
    'Round 2: Background pacing won R1. Testing social-heavy (more polls, social-only standing) ' +
    'and competitive edge (leaderboard, higher points) against the winner baseline.',
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

// ── Dinner Party Variations (Round 2) ────────────────────────────────────────
// Round 1 winner: A (Minimal/Social Only). Refine around that minimal approach
// with conversation-starter polls and zero-standing-mission variations.

const dinnerPartyVariations: ScenarioVariation[] = [
  {
    id: 'chill_dinner_party_A',
    label: 'A',
    description: 'R1 Winner baseline: no flash, social/alliance only, gentle mini-games',
    eventFrequency: {
      flashMissionIntervalMin: [25, 35],
      pollIntervalMin: [12, 18],
      miniGameIntervalMin: [40, 50],
    },
    allowedEventTypes: ['poll', 'mini_game'],
    allowedMissionCategories: ['social', 'alliance'],
    allowedMiniGameTypes: ['caption', 'hot_take', 'assumption_arena'],
    standingMissionCount: 5,
  },
  {
    id: 'chill_dinner_party_B',
    label: 'B',
    description: 'Winner + conversation starters: icebreaker polls, more frequent but shorter',
    eventFrequency: {
      flashMissionIntervalMin: [25, 35],
      pollIntervalMin: [8, 12],
      miniGameIntervalMin: [40, 50],
    },
    allowedEventTypes: ['poll', 'mini_game'],
    allowedMissionCategories: ['social', 'alliance'],
    allowedMiniGameTypes: ['caption', 'hot_take', 'assumption_arena'],
    standingMissionCount: 5,
    icebreakersMode: true,
  },
  {
    id: 'chill_dinner_party_C',
    label: 'C',
    description: 'Winner + zero standing missions: ONLY polls and occasional mini-games, absolute minimum chaos',
    eventFrequency: {
      flashMissionIntervalMin: [25, 35],
      pollIntervalMin: [12, 18],
      miniGameIntervalMin: [45, 60],
    },
    allowedEventTypes: ['poll', 'mini_game'],
    allowedMissionCategories: ['social', 'alliance'],
    allowedMiniGameTypes: ['caption', 'hot_take', 'assumption_arena'],
    standingMissionCount: 0,
  },
];

const chillDinnerParty: ScenarioDefinition = {
  id: 'chill_dinner_party',
  name: 'Chill Dinner Party',
  description:
    'Round 2: Minimal/Social Only won R1. Testing icebreaker conversation-starter polls ' +
    'and zero standing missions (absolute minimum chaos) against the winner baseline.',
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

// ── Newbie Variations (Round 2) ──────────────────────────────────────────────
// Round 1 winner: C (Sink or Swim). Newbies don't need coddling -- they want
// the real experience. Refine with tutorial tooltips and buddy targeting.

const newbieVariations: ScenarioVariation[] = [
  {
    id: 'newbie_overwhelm_A',
    label: 'A',
    description: 'R1 Winner baseline: standard frequency, no special treatment',
    eventFrequency: {
      flashMissionIntervalMin: [3, 7],
      pollIntervalMin: [4, 8],
      miniGameIntervalMin: [8, 15],
    },
  },
  {
    id: 'newbie_overwhelm_B',
    label: 'B',
    description: 'Winner + tutorial tooltips: first event has extended explanation, then normal',
    eventFrequency: {
      flashMissionIntervalMin: [3, 7],
      pollIntervalMin: [4, 8],
      miniGameIntervalMin: [8, 15],
    },
    tutorialTooltips: true,
  },
  {
    id: 'newbie_overwhelm_C',
    label: 'C',
    description: 'Winner + buddy targeting: events reference/target the newbie to include them',
    eventFrequency: {
      flashMissionIntervalMin: [3, 7],
      pollIntervalMin: [4, 8],
      miniGameIntervalMin: [8, 15],
    },
    buddyTargeting: true,
  },
];

const newbieOverwhelm: ScenarioDefinition = {
  id: 'newbie_overwhelm',
  name: 'Newbie Overwhelm Test',
  description:
    'Round 2: Sink or Swim won R1 -- newbies want the real experience. Testing tutorial ' +
    'tooltips on first event and buddy targeting (events reference the newbie) against baseline.',
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

// ── AI Enhanced Variations (Round 2) ─────────────────────────────────────────
// Round 1 winner: A (Deep Personalization). AI referencing specific answers and
// relationships was the key. Now test adding memory across sessions and
// adaptive frequency based on group energy.

const aiEnhancedVariations: ScenarioVariation[] = [
  {
    id: 'ai_enhanced_party_A',
    label: 'A',
    description: 'R1 Winner baseline: deep personalization with vulnerability analysis',
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
    description: 'Winner + memory: AI references "last game night" and running jokes between players',
    eventFrequency: {
      flashMissionIntervalMin: [4, 10],
      pollIntervalMin: [6, 12],
      miniGameIntervalMin: [10, 20],
    },
    aiPersonalizationDepth: 'deep',
    aiMemoryEnabled: true,
  },
  {
    id: 'ai_enhanced_party_C',
    label: 'C',
    description: 'Winner + adaptive: AI adjusts frequency based on group energy (more when high, backs off when low)',
    eventFrequency: {
      flashMissionIntervalMin: [4, 10],
      pollIntervalMin: [6, 12],
      miniGameIntervalMin: [10, 20],
    },
    aiPersonalizationDepth: 'deep',
    aiAdaptiveFrequency: true,
  },
];

const aiEnhancedParty: ScenarioDefinition = {
  id: 'ai_enhanced_party',
  name: 'AI-Enhanced Party Game (vs Static)',
  description:
    'Round 2: Deep Personalization won R1. Testing cross-session memory (running jokes, ' +
    '"last game night" references) and adaptive frequency (energy-aware pacing) against baseline.',
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
