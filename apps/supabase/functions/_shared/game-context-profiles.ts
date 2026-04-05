// Game context profiles for Deno edge functions
// Mirrors packages/shared/src/constants/game-context-profiles.ts

export interface GameContextProfile {
  gameType: string;
  flashIntervalMs: [number, number];
  pollIntervalMs: [number, number];
  miniGameIntervalMs: [number, number];
  standingMissionCount: number;
  flashEnabled: boolean;
  flashPointMultiplier: number;
  suppressDuringHighTension: boolean;
  autoBreakEnabled: boolean;
  autoBreakAfterMinutes: number;
  allowedMissionCategories: string[] | null;
  allowedMiniGameTypes: string[] | null;
  provocativePolls: boolean;
  escalationEnabled: boolean;
  estimatedTotalMinutes: number;
}

export const GAME_CONTEXT_PROFILES: Record<string, GameContextProfile> = {
  board_game: {
    gameType: 'board_game',
    flashIntervalMs: [20 * 60_000, 30 * 60_000],
    pollIntervalMs: [30 * 60_000, 40 * 60_000],
    miniGameIntervalMs: [45 * 60_000, 60 * 60_000],
    standingMissionCount: 8,
    flashEnabled: true,
    flashPointMultiplier: 1.0,
    suppressDuringHighTension: true,
    autoBreakEnabled: true,
    autoBreakAfterMinutes: 45,
    allowedMissionCategories: null,
    allowedMiniGameTypes: null,
    provocativePolls: false,
    escalationEnabled: true,
    estimatedTotalMinutes: 120,
  },
  party_game: {
    gameType: 'party_game',
    flashIntervalMs: [8 * 60_000, 12 * 60_000],
    pollIntervalMs: [15 * 60_000, 20 * 60_000],
    miniGameIntervalMs: [20 * 60_000, 30 * 60_000],
    standingMissionCount: 8,
    flashEnabled: true,
    flashPointMultiplier: 1.0,
    suppressDuringHighTension: false,
    autoBreakEnabled: false,
    autoBreakAfterMinutes: 0,
    allowedMissionCategories: null,
    allowedMiniGameTypes: null,
    provocativePolls: false,
    escalationEnabled: true,
    estimatedTotalMinutes: 90,
  },
  bar_night: {
    gameType: 'bar_night',
    flashIntervalMs: [10 * 60_000, 15 * 60_000],
    pollIntervalMs: [15 * 60_000, 20 * 60_000],
    miniGameIntervalMs: [25 * 60_000, 35 * 60_000],
    standingMissionCount: 5,
    flashEnabled: true,
    flashPointMultiplier: 1.5,
    suppressDuringHighTension: false,
    autoBreakEnabled: false,
    autoBreakAfterMinutes: 0,
    allowedMissionCategories: null,
    allowedMiniGameTypes: null,
    provocativePolls: true,
    escalationEnabled: false,
    estimatedTotalMinutes: 120,
  },
  dinner_party: {
    gameType: 'dinner_party',
    flashIntervalMs: [0, 0],
    pollIntervalMs: [12 * 60_000, 18 * 60_000],
    miniGameIntervalMs: [40 * 60_000, 50 * 60_000],
    standingMissionCount: 5,
    flashEnabled: false,
    flashPointMultiplier: 1.0,
    suppressDuringHighTension: false,
    autoBreakEnabled: false,
    autoBreakAfterMinutes: 0,
    allowedMissionCategories: ['social', 'alliance'],
    allowedMiniGameTypes: ['caption', 'hot_take', 'assumption_arena'],
    provocativePolls: false,
    escalationEnabled: false,
    estimatedTotalMinutes: 120,
  },
  house_party: {
    gameType: 'house_party',
    flashIntervalMs: [5 * 60_000, 8 * 60_000],
    pollIntervalMs: [8 * 60_000, 12 * 60_000],
    miniGameIntervalMs: [15 * 60_000, 20 * 60_000],
    standingMissionCount: 8,
    flashEnabled: true,
    flashPointMultiplier: 1.0,
    suppressDuringHighTension: false,
    autoBreakEnabled: false,
    autoBreakAfterMinutes: 0,
    allowedMissionCategories: null,
    allowedMiniGameTypes: null,
    provocativePolls: false,
    escalationEnabled: true,
    estimatedTotalMinutes: 90,
  },
  custom: {
    gameType: 'custom',
    flashIntervalMs: [8 * 60_000, 12 * 60_000],
    pollIntervalMs: [12 * 60_000, 18 * 60_000],
    miniGameIntervalMs: [20 * 60_000, 30 * 60_000],
    standingMissionCount: 8,
    flashEnabled: true,
    flashPointMultiplier: 1.0,
    suppressDuringHighTension: false,
    autoBreakEnabled: false,
    autoBreakAfterMinutes: 0,
    allowedMissionCategories: null,
    allowedMiniGameTypes: null,
    provocativePolls: false,
    escalationEnabled: true,
    estimatedTotalMinutes: 120,
  },
};

/** Override profiles applied on top of the base game type profile */
export const OVERRIDE_PROFILES: Record<string, Partial<GameContextProfile>> = {
  party_mode_override: {
    flashIntervalMs: [3 * 60_000, 5 * 60_000],       // 3-5 min
    pollIntervalMs: [5 * 60_000, 8 * 60_000],         // 5-8 min
    miniGameIntervalMs: [8 * 60_000, 12 * 60_000],    // 8-12 min
    flashPointMultiplier: 2.0,
    provocativePolls: true,
  },
  speed_round: {
    flashIntervalMs: [2 * 60_000, 3 * 60_000],        // 2-3 min
    pollIntervalMs: [4 * 60_000, 6 * 60_000],          // 4-6 min
    miniGameIntervalMs: [5 * 60_000, 8 * 60_000],      // 5-8 min
    standingMissionCount: 5,
    flashPointMultiplier: 2.0,
  },
};

export function getGameContextProfile(gameType: string): GameContextProfile {
  return GAME_CONTEXT_PROFILES[gameType] ?? GAME_CONTEXT_PROFILES.custom;
}

/**
 * Returns a profile with room-level overrides (party mode, speed round) merged
 * on top of the base game type profile.
 */
export function getEffectiveProfile(
  gameType: string,
  roomSettings?: { partyMode?: boolean; speedMode?: boolean },
): GameContextProfile {
  const base = getGameContextProfile(gameType);
  if (!roomSettings) return base;

  let profile = { ...base };

  if (roomSettings.speedMode) {
    profile = { ...profile, ...OVERRIDE_PROFILES.speed_round };
  }
  if (roomSettings.partyMode) {
    profile = { ...profile, ...OVERRIDE_PROFILES.party_mode_override };
  }

  return profile;
}

export const PROVOCATIVE_POLL_POOL: string[] = [
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
