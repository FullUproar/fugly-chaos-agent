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
  /** Target the leading player with harder/more events. */
  targetLeader?: boolean;
  /** Rubber-banding: give trailing players advantages. */
  rubberBanding?: boolean;
  /** Persona stat modifiers applied on top of base persona (e.g. drunk mode). */
  personaModifiers?: Partial<import('./personas').AgentPersona>;
  /** Comeback mechanic for trailing players. */
  comebackMechanic?: 'double_points' | 'revenge_mission' | 'none';
  /** Notification delivery mode: silent (no alert), subtle (badge only), standard (full). */
  notificationMode?: 'silent' | 'subtle' | 'standard';
  /** Alternate between gentle (2x interval) and intense (0.5x interval) in 15-min waves. */
  wavePattern?: boolean;
  /** Only half the agents see each event (alternating halves). */
  splitRoom?: boolean;
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

// ══════════════════════════════════════════════════════════════════════════════
// ROUND 3: WILD EXPERIMENTS
// Push every assumption to breaking point. 10 experiments x 3 variations = 30
// new simulation runs designed to find the edges of the system.
// ══════════════════════════════════════════════════════════════════════════════

// ── Experiment 1: The Escalator ─────────────────────────────────────────────
// What happens when chaos intensity RAMPS throughout the night? Start gentle,
// end absolutely unhinged. Three ramp profiles: linear, sudden spike, and waves.

const escalatorVariations: ScenarioVariation[] = [
  {
    id: 'escalator_A',
    label: 'A',
    description:
      'Linear ramp: flash interval starts at 20min, compresses to 3min by minute 120. ' +
      'Aggressive intervalRampFactor 0.3 means early events are 3x slower than baseline.',
    eventFrequency: {
      flashMissionIntervalMin: [3, 20],
      pollIntervalMin: [5, 15],
      miniGameIntervalMin: [8, 25],
    },
    intervalRampFactor: 0.3,
  },
  {
    id: 'escalator_B',
    label: 'B',
    description:
      'Sudden spike: gentle pacing for 80 minutes, then EVERYTHING fires for the final 40. ' +
      'Neutral ramp factor — the spike is a hard cutover, not a gradient.',
    eventFrequency: {
      flashMissionIntervalMin: [15, 25],
      pollIntervalMin: [20, 30],
      miniGameIntervalMin: [30, 45],
    },
    intervalRampFactor: 1.0,
    firstEventDelayMin: 5,
  },
  {
    id: 'escalator_C',
    label: 'C',
    description:
      'Waves: 20min gentle, 10min intense, repeat. Breathing room between bursts. ' +
      'Wave pattern creates oscillating intensity without ever letting you settle.',
    eventFrequency: {
      flashMissionIntervalMin: [5, 15],
      pollIntervalMin: [8, 18],
      miniGameIntervalMin: [12, 25],
    },
    intervalRampFactor: 0.6,
    wavePattern: true,
  },
];

const escalator: ScenarioDefinition = {
  id: 'escalator',
  name: 'The Escalator',
  description:
    'Chaos intensity ramps throughout the night. Start gentle, end insane. ' +
    'Tests whether a slow build makes players more tolerant of late-game mayhem ' +
    'or if the contrast just makes the spike feel worse.',
  playerCount: 6,
  personaIds: ['marcus', 'jade', 'tyler', 'pat', 'river', 'alex'],
  gameType: 'party_game',
  chaosComfort: 'moderate',
  totalMinutes: 120,
  eventFrequency: {
    flashMissionIntervalMin: [5, 15],
    pollIntervalMin: [8, 18],
    miniGameIntervalMin: [12, 25],
  },
  variations: escalatorVariations,
};

// ── Experiment 2: Target the Leader ─────────────────────────────────────────
// Rubber-banding: the game hunts whoever is winning. Does this create dramatic
// comebacks or just punish good play?

const targetLeaderVariations: ScenarioVariation[] = [
  {
    id: 'target_leader_A',
    label: 'A',
    description:
      'Leader gets targeted: flash missions aimed specifically at the #1 player. ' +
      'They become the center of attention whether they want it or not.',
    eventFrequency: {
      flashMissionIntervalMin: [6, 12],
      pollIntervalMin: [10, 18],
      miniGameIntervalMin: [15, 25],
    },
    targetLeader: true,
  },
  {
    id: 'target_leader_B',
    label: 'B',
    description:
      'Full rubber-banding: leader gets harder missions, last place gets freebies. ' +
      'The game actively compresses the leaderboard.',
    eventFrequency: {
      flashMissionIntervalMin: [6, 12],
      pollIntervalMin: [10, 18],
      miniGameIntervalMin: [15, 25],
    },
    targetLeader: true,
    rubberBanding: true,
  },
  {
    id: 'target_leader_C',
    label: 'C',
    description:
      'Control: no targeting, no rubber-banding. Pure meritocracy. ' +
      'Whoever earns the most points wins, no handicaps.',
    eventFrequency: {
      flashMissionIntervalMin: [6, 12],
      pollIntervalMin: [10, 18],
      miniGameIntervalMin: [15, 25],
    },
    targetLeader: false,
    rubberBanding: false,
  },
];

const targetLeaderScenario: ScenarioDefinition = {
  id: 'target_leader',
  name: 'Target the Leader',
  description:
    'The game specifically hunts whoever is winning. Tests whether rubber-banding ' +
    'creates thrilling comebacks or just frustrates skilled players into quitting.',
  playerCount: 6,
  personaIds: ['marcus', 'jade', 'tyler', 'pat', 'river', 'alex'],
  gameType: 'party_game',
  chaosComfort: 'moderate',
  totalMinutes: 120,
  eventFrequency: {
    flashMissionIntervalMin: [6, 12],
    pollIntervalMin: [10, 18],
    miniGameIntervalMin: [15, 25],
  },
  variations: targetLeaderVariations,
};

// ── Experiment 3: The Introvert Table ───────────────────────────────────────
// All quiet/competitive personalities. No social butterflies. Does the chaos
// agent just annoy everyone, or can it draw out the quiet ones?

const introvertTableVariations: ScenarioVariation[] = [
  {
    id: 'introvert_table_A',
    label: 'A',
    description:
      'Standard frequency with all introverts. The baseline misery test — ' +
      'how badly does normal pacing land when nobody wants to be disrupted?',
    eventFrequency: {
      flashMissionIntervalMin: [10, 18],
      pollIntervalMin: [15, 22],
      miniGameIntervalMin: [20, 30],
    },
  },
  {
    id: 'introvert_table_B',
    label: 'B',
    description:
      'Ultra-conservative: flash every 40min, mostly standing missions. ' +
      'The chaos agent barely whispers. Respects the vibe completely.',
    eventFrequency: {
      flashMissionIntervalMin: [35, 45],
      pollIntervalMin: [30, 40],
      miniGameIntervalMin: [50, 65],
    },
    standingMissionCount: 8,
  },
  {
    id: 'introvert_table_C',
    label: 'C',
    description:
      'Social-only mode: no competitive missions, all alliance/social category. ' +
      'Can the agent bring introverts together without triggering their competitive anxiety?',
    eventFrequency: {
      flashMissionIntervalMin: [15, 25],
      pollIntervalMin: [12, 18],
      miniGameIntervalMin: [25, 35],
    },
    allowedMissionCategories: ['social', 'alliance'],
  },
];

const introvertTable: ScenarioDefinition = {
  id: 'introvert_table',
  name: 'The Introvert Table',
  description:
    'All quiet and competitive personalities — no extroverts in sight. ' +
    'Tests whether the chaos agent can create connection among people who ' +
    'would rather just play the game in focused silence.',
  playerCount: 4,
  personaIds: ['marcus', 'diana', 'river', 'sam'],
  gameType: 'board_game',
  chaosComfort: 'chill',
  totalMinutes: 150,
  eventFrequency: {
    flashMissionIntervalMin: [10, 18],
    pollIntervalMin: [15, 22],
    miniGameIntervalMin: [20, 30],
  },
  variations: introvertTableVariations,
};

// ── Experiment 4: The Extrovert Table ───────────────────────────────────────
// All social/chaos personalities. Zero introverts. Does the system go TOO hard
// when everyone is already at eleven?

const extrovertTableVariations: ScenarioVariation[] = [
  {
    id: 'extrovert_table_A',
    label: 'A',
    description:
      'Maximum chaos: flash every 2-3min, mini-game every 8min. ' +
      'Pedal to the floor. See if even chaos-lovers can be overwhelmed.',
    eventFrequency: {
      flashMissionIntervalMin: [2, 3],
      pollIntervalMin: [4, 6],
      miniGameIntervalMin: [7, 9],
    },
  },
  {
    id: 'extrovert_table_B',
    label: 'B',
    description:
      'Standard house party settings. Control run — does the normal pace feel ' +
      'boring when the table is already chaotic without help?',
    eventFrequency: {
      flashMissionIntervalMin: [8, 15],
      pollIntervalMin: [10, 18],
      miniGameIntervalMin: [18, 28],
    },
  },
  {
    id: 'extrovert_table_C',
    label: 'C',
    description:
      'Player-controlled frequency: signals steer the pace. shake_it_up = faster, ' +
      'slow_your_roll = slower. The group is its own throttle.',
    eventFrequency: {
      flashMissionIntervalMin: [5, 10],
      pollIntervalMin: [8, 14],
      miniGameIntervalMin: [12, 20],
    },
    aiAdaptiveFrequency: true,
  },
];

const extrovertTable: ScenarioDefinition = {
  id: 'extrovert_table',
  name: 'The Extrovert Table',
  description:
    'All social and chaos personalities — no introverts, no wallflowers. ' +
    'Tests whether the system goes too hard when the table is already at max energy, ' +
    'or if extroverts are literally impossible to overwhelm.',
  playerCount: 4,
  personaIds: ['jade', 'tyler', 'alex', 'pat'],
  gameType: 'house_party',
  chaosComfort: 'maximum',
  totalMinutes: 120,
  eventFrequency: {
    flashMissionIntervalMin: [5, 10],
    pollIntervalMin: [8, 14],
    miniGameIntervalMin: [12, 20],
  },
  variations: extrovertTableVariations,
};

// ── Experiment 5: Alcohol Mode ──────────────────────────────────────────────
// Simulate a group that has been drinking. Attention spans crater, chaos
// tolerance skyrockets, social engagement spikes, competitiveness evaporates.
// Everything gets looser and louder.

const drunkModifiers: Partial<import('./personas').AgentPersona> = {
  attentionSpan: -2,
  chaosTolerance: 3,
  socialEngagement: 2,
  competitiveness: -2,
  phoneCheckFrequencyMin: -4, // check phones twice as often (halved interval)
};

const alcoholModeVariations: ScenarioVariation[] = [
  {
    id: 'alcohol_mode_A',
    label: 'A',
    description:
      'Standard bar settings with drunk personas. Baseline alcohol run — ' +
      'does the normal bar pacing feel right when everyone is three drinks deep?',
    eventFrequency: {
      flashMissionIntervalMin: [8, 14],
      pollIntervalMin: [10, 16],
      miniGameIntervalMin: [18, 28],
    },
    personaModifiers: drunkModifiers,
  },
  {
    id: 'alcohol_mode_B',
    label: 'B',
    description:
      'Maximum chaos with drunk personas. The nuclear option — everyone is hammered ' +
      'AND the system is firehosing events. Pure pandemonium stress test.',
    eventFrequency: {
      flashMissionIntervalMin: [3, 5],
      pollIntervalMin: [4, 7],
      miniGameIntervalMin: [8, 12],
    },
    personaModifiers: drunkModifiers,
  },
  {
    id: 'alcohol_mode_C',
    label: 'C',
    description:
      'Adaptive AI with drunk personas. The AI reads the room and adjusts — ' +
      'can it detect the sloppy energy and dial back appropriately?',
    eventFrequency: {
      flashMissionIntervalMin: [6, 12],
      pollIntervalMin: [8, 14],
      miniGameIntervalMin: [14, 22],
    },
    personaModifiers: drunkModifiers,
    aiAdaptiveFrequency: true,
    aiPersonalizationDepth: 'deep',
  },
];

const alcoholMode: ScenarioDefinition = {
  id: 'alcohol_mode',
  name: 'Alcohol Mode',
  description:
    'Everyone has been drinking. Attention spans drop, chaos tolerance rises, social ' +
    'engagement spikes, competitiveness evaporates, phones get checked constantly. ' +
    'Tests whether the system needs a dedicated "drunk mode" or if adaptive AI handles it.',
  playerCount: 6,
  personaIds: ['marcus', 'jade', 'tyler', 'pat', 'river', 'alex'],
  gameType: 'bar_night',
  chaosComfort: 'maximum',
  totalMinutes: 120,
  eventFrequency: {
    flashMissionIntervalMin: [6, 12],
    pollIntervalMin: [8, 14],
    miniGameIntervalMin: [14, 22],
  },
  variations: alcoholModeVariations,
};

// ── Experiment 6: The 10-Player Stress Test ─────────────────────────────────
// What happens with a huge group? More voters, longer vote cycles, more noise,
// more signal conflicts. Can the system handle the crowd?

const tenPlayerVariations: ScenarioVariation[] = [
  {
    id: 'ten_player_A',
    label: 'A',
    description:
      'Standard frequency at 10 players. Baseline stress test — ' +
      'does normal pacing create a traffic jam of events with this many agents?',
    eventFrequency: {
      flashMissionIntervalMin: [6, 12],
      pollIntervalMin: [8, 15],
      miniGameIntervalMin: [14, 22],
    },
  },
  {
    id: 'ten_player_B',
    label: 'B',
    description:
      'Half frequency: events every 2x normal interval. Hypothesis: more players ' +
      'means more organic chaos, so the system should back off.',
    eventFrequency: {
      flashMissionIntervalMin: [12, 24],
      pollIntervalMin: [16, 30],
      miniGameIntervalMin: [28, 44],
    },
  },
  {
    id: 'ten_player_C',
    label: 'C',
    description:
      'Split-room mode: alternate which half of players see each event. ' +
      'Simulates two parallel experiences sharing one session.',
    eventFrequency: {
      flashMissionIntervalMin: [6, 12],
      pollIntervalMin: [8, 15],
      miniGameIntervalMin: [14, 22],
    },
    splitRoom: true,
  },
];

const tenPlayerStressTest: ScenarioDefinition = {
  id: 'ten_player_stress_test',
  name: 'The 10-Player Stress Test',
  description:
    'Massive group: all 8 personas plus Marcus2 and Jade2 duplicates. ' +
    'Tests vote cycle length, signal noise, event queuing, and whether the system ' +
    'collapses under the weight of 10 simultaneous agents.',
  playerCount: 10,
  personaIds: [
    'marcus', 'jade', 'tyler', 'pat', 'river', 'alex', 'diana', 'sam',
    'marcus', 'jade', // duplicates: Marcus2 and Jade2
  ],
  gameType: 'house_party',
  chaosComfort: 'maximum',
  totalMinutes: 180,
  eventFrequency: {
    flashMissionIntervalMin: [6, 12],
    pollIntervalMin: [8, 15],
    miniGameIntervalMin: [14, 22],
  },
  variations: tenPlayerVariations,
};

// ── Experiment 7: Mini-Game Marathon ────────────────────────────────────────
// Strip out everything except mini-games. No flash missions, no standing
// missions. Just back-to-back interactive group challenges.

const miniGameMarathonVariations: ScenarioVariation[] = [
  {
    id: 'mini_game_marathon_A',
    label: 'A',
    description:
      'Mini-game every 5min, no flash, no standing. Drawing and caption heavy. ' +
      'Pure interactive chaos — the game IS the mini-games.',
    eventFrequency: {
      flashMissionIntervalMin: [999, 999],
      pollIntervalMin: [999, 999],
      miniGameIntervalMin: [4, 6],
    },
    allowedEventTypes: ['mini_game'],
    allowedMiniGameTypes: ['drawing', 'caption', 'photo_challenge', 'hot_take'],
    standingMissionCount: 0,
  },
  {
    id: 'mini_game_marathon_B',
    label: 'B',
    description:
      'Mini-game every 8min with polls between — no flash, no standing. ' +
      'Polls serve as palate cleansers between the main events.',
    eventFrequency: {
      flashMissionIntervalMin: [999, 999],
      pollIntervalMin: [4, 6],
      miniGameIntervalMin: [7, 9],
    },
    allowedEventTypes: ['mini_game', 'poll'],
    standingMissionCount: 0,
  },
  {
    id: 'mini_game_marathon_C',
    label: 'C',
    description:
      'Control: standard mix of all event types. Does the full toolkit outperform ' +
      'a focused mini-game-only experience?',
    eventFrequency: {
      flashMissionIntervalMin: [6, 12],
      pollIntervalMin: [8, 15],
      miniGameIntervalMin: [12, 20],
    },
  },
];

const miniGameMarathon: ScenarioDefinition = {
  id: 'mini_game_marathon',
  name: 'Mini-Game Marathon',
  description:
    'All mini-games, all the time. No flash missions, no standing missions. ' +
    'Tests whether focused interactive challenges create a better experience ' +
    'than the standard diverse event mix.',
  playerCount: 6,
  personaIds: ['marcus', 'jade', 'tyler', 'pat', 'river', 'alex'],
  gameType: 'party_game',
  chaosComfort: 'maximum',
  totalMinutes: 90,
  eventFrequency: {
    flashMissionIntervalMin: [6, 12],
    pollIntervalMin: [8, 15],
    miniGameIntervalMin: [10, 18],
  },
  variations: miniGameMarathonVariations,
};

// ── Experiment 8: The Comeback Kid ──────────────────────────────────────────
// Losing players get special opportunities. Does this keep everyone engaged
// or does it invalidate the entire scoring system?

const comebackKidVariations: ScenarioVariation[] = [
  {
    id: 'comeback_kid_A',
    label: 'A',
    description:
      'Double points: bottom 2 players get 2x points on their next successful claim. ' +
      'Quiet boost — the losing players just score bigger without fanfare.',
    eventFrequency: {
      flashMissionIntervalMin: [6, 12],
      pollIntervalMin: [10, 18],
      miniGameIntervalMin: [15, 25],
    },
    comebackMechanic: 'double_points',
    flashPointMultiplier: 2.0,
  },
  {
    id: 'comeback_kid_B',
    label: 'B',
    description:
      'Revenge mission: the bottom player gets a special mission targeting the leader. ' +
      'Maximum drama — the loser gets a loaded gun aimed at first place.',
    eventFrequency: {
      flashMissionIntervalMin: [6, 12],
      pollIntervalMin: [10, 18],
      miniGameIntervalMin: [15, 25],
    },
    comebackMechanic: 'revenge_mission',
    targetLeader: true,
  },
  {
    id: 'comeback_kid_C',
    label: 'C',
    description:
      'Control: no rubber-banding, no comeback mechanics. If you fall behind, ' +
      'you stay behind. Pure survival of the fittest.',
    eventFrequency: {
      flashMissionIntervalMin: [6, 12],
      pollIntervalMin: [10, 18],
      miniGameIntervalMin: [15, 25],
    },
    comebackMechanic: 'none',
  },
];

const comebackKid: ScenarioDefinition = {
  id: 'comeback_kid',
  name: 'The Comeback Kid',
  description:
    'Losing players get special opportunities to claw back into contention. ' +
    'Tests whether comeback mechanics keep trailing players engaged or just ' +
    'make the leaderboard feel meaningless.',
  playerCount: 6,
  personaIds: ['marcus', 'jade', 'tyler', 'pat', 'river', 'alex'],
  gameType: 'party_game',
  chaosComfort: 'moderate',
  totalMinutes: 120,
  eventFrequency: {
    flashMissionIntervalMin: [6, 12],
    pollIntervalMin: [10, 18],
    miniGameIntervalMin: [15, 25],
  },
  variations: comebackKidVariations,
};

// ── Experiment 9: Silent Chaos ──────────────────────────────────────────────
// What if events just... appear? No notifications, no alerts. Players discover
// them when they happen to check. Organic discovery vs forced interruption.

const silentChaosVariations: ScenarioVariation[] = [
  {
    id: 'silent_chaos_A',
    label: 'A',
    description:
      'Silent mode: events appear but never alert or steal focus. Players must organically ' +
      'discover them. Expect high miss rates, especially from low-phone-check personas.',
    eventFrequency: {
      flashMissionIntervalMin: [8, 14],
      pollIntervalMin: [10, 18],
      miniGameIntervalMin: [18, 28],
    },
    notificationMode: 'silent',
  },
  {
    id: 'silent_chaos_B',
    label: 'B',
    description:
      'Subtle mode: small badge notification only — no sound, no popup, no screen takeover. ' +
      'A gentle nudge without the interruption.',
    eventFrequency: {
      flashMissionIntervalMin: [8, 14],
      pollIntervalMin: [10, 18],
      miniGameIntervalMin: [18, 28],
    },
    notificationMode: 'subtle',
  },
  {
    id: 'silent_chaos_C',
    label: 'C',
    description:
      'Standard mode: full alert with sound and screen steal. The normal experience. ' +
      'Control run to measure the value of aggressive notifications.',
    eventFrequency: {
      flashMissionIntervalMin: [8, 14],
      pollIntervalMin: [10, 18],
      miniGameIntervalMin: [18, 28],
    },
    notificationMode: 'standard',
  },
];

const silentChaos: ScenarioDefinition = {
  id: 'silent_chaos',
  name: 'Silent Chaos',
  description:
    'No notifications — events appear silently and players discover them organically. ' +
    'Tests whether forced interruptions are essential to engagement or if ' +
    'curiosity-driven discovery creates a more natural experience.',
  playerCount: 6,
  personaIds: ['marcus', 'jade', 'tyler', 'pat', 'river', 'alex'],
  gameType: 'dinner_party',
  chaosComfort: 'chill',
  totalMinutes: 150,
  eventFrequency: {
    flashMissionIntervalMin: [8, 14],
    pollIntervalMin: [10, 18],
    miniGameIntervalMin: [18, 28],
  },
  variations: silentChaosVariations,
};

// ── Experiment 10: Speed Round ──────────────────────────────────────────────
// 30-minute blitz. Can the chaos agent deliver a meaningful experience in the
// time it takes to eat a pizza?

const speedRoundVariations: ScenarioVariation[] = [
  {
    id: 'speed_round_A',
    label: 'A',
    description:
      'Constant chaos: flash every 2min, mini-game every 5min. No breathing room. ' +
      'The entire 30 minutes is a single unbroken wave of events.',
    eventFrequency: {
      flashMissionIntervalMin: [1.5, 2.5],
      pollIntervalMin: [2, 4],
      miniGameIntervalMin: [4, 6],
    },
    standingMissionCount: 3,
    firstEventDelayMin: 0,
  },
  {
    id: 'speed_round_B',
    label: 'B',
    description:
      'Quality over quantity: exactly 3 perfectly timed events across 30 minutes. ' +
      'One at minute 5, one at minute 15, one at minute 25. Maximum impact per event.',
    eventFrequency: {
      flashMissionIntervalMin: [8, 12],
      pollIntervalMin: [8, 12],
      miniGameIntervalMin: [8, 12],
    },
    maxEventsPerSession: 3,
    firstEventDelayMin: 5,
  },
  {
    id: 'speed_round_C',
    label: 'C',
    description:
      'Standard frequency compressed: normal event ratios squeezed into 30 minutes. ' +
      'Does the standard formula just work at any timescale?',
    eventFrequency: {
      flashMissionIntervalMin: [3, 6],
      pollIntervalMin: [4, 8],
      miniGameIntervalMin: [8, 14],
    },
  },
];

const speedRound: ScenarioDefinition = {
  id: 'speed_round',
  name: 'Speed Round',
  description:
    '30-minute blitz session. Tests whether the chaos agent can deliver a complete, ' +
    'satisfying experience in the time it takes to eat a pizza — or if it needs ' +
    'longer sessions to build momentum.',
  playerCount: 6,
  personaIds: ['marcus', 'jade', 'tyler', 'pat', 'river', 'alex'],
  gameType: 'party_game',
  chaosComfort: 'maximum',
  totalMinutes: 30,
  eventFrequency: {
    flashMissionIntervalMin: [3, 6],
    pollIntervalMin: [4, 8],
    miniGameIntervalMin: [8, 14],
  },
  variations: speedRoundVariations,
};

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  casual_board_game: casualBoardGame,
  chaotic_party_game: chaoticPartyGame,
  newbie_overwhelm: newbieOverwhelm,
  chill_dinner_party: chillDinnerParty,
  bar_night_brawl: barNightBrawl,
  ai_enhanced_party: aiEnhancedParty,
  // Round 3: Wild Experiments
  escalator,
  target_leader: targetLeaderScenario,
  introvert_table: introvertTable,
  extrovert_table: extrovertTable,
  alcohol_mode: alcoholMode,
  ten_player_stress_test: tenPlayerStressTest,
  mini_game_marathon: miniGameMarathon,
  comeback_kid: comebackKid,
  silent_chaos: silentChaos,
  speed_round: speedRound,
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
