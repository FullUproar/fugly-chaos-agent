type GameType = 'board_game' | 'party_game' | 'dinner_party' | 'house_party' | 'bar_night' | 'custom';

export interface GamePhase {
  name: 'setup' | 'early' | 'mid' | 'late' | 'endgame';
  durationMinutes: number;
  tensionLevel: number;
  disruptionTolerance: number;
}

export interface GameProfile {
  gameType: GameType;
  name: string;
  baseDisruptionTolerance: number;
  naturalDeadTimeMinutes: number;
  turnDurationMinutes: number;
  phases: GamePhase[];
}

const boardGame: GameProfile = {
  gameType: 'board_game',
  name: 'Board Game Night',
  baseDisruptionTolerance: 5,
  naturalDeadTimeMinutes: 1,
  turnDurationMinutes: 4,
  phases: [
    { name: 'setup', durationMinutes: 15, tensionLevel: 2, disruptionTolerance: 8 },
    { name: 'early', durationMinutes: 30, tensionLevel: 3, disruptionTolerance: 6 },
    { name: 'mid', durationMinutes: 45, tensionLevel: 5, disruptionTolerance: 5 },
    { name: 'late', durationMinutes: 40, tensionLevel: 8, disruptionTolerance: 3 },
    { name: 'endgame', durationMinutes: 20, tensionLevel: 9, disruptionTolerance: 2 },
  ],
};

const partyGame: GameProfile = {
  gameType: 'party_game',
  name: 'Party Game Night',
  baseDisruptionTolerance: 8,
  naturalDeadTimeMinutes: 0.5,
  turnDurationMinutes: 1.5,
  phases: [
    { name: 'setup', durationMinutes: 10, tensionLevel: 3, disruptionTolerance: 9 },
    { name: 'early', durationMinutes: 25, tensionLevel: 6, disruptionTolerance: 8 },
    { name: 'mid', durationMinutes: 35, tensionLevel: 7, disruptionTolerance: 7 },
    { name: 'late', durationMinutes: 30, tensionLevel: 8, disruptionTolerance: 6 },
    { name: 'endgame', durationMinutes: 20, tensionLevel: 5, disruptionTolerance: 8 },
  ],
};

const dinnerParty: GameProfile = {
  gameType: 'dinner_party',
  name: 'Dinner Party',
  baseDisruptionTolerance: 6,
  naturalDeadTimeMinutes: 0,
  turnDurationMinutes: 0,
  phases: [
    { name: 'setup', durationMinutes: 20, tensionLevel: 4, disruptionTolerance: 7 },
    { name: 'early', durationMinutes: 30, tensionLevel: 5, disruptionTolerance: 7 },
    { name: 'mid', durationMinutes: 40, tensionLevel: 5, disruptionTolerance: 6 },
    { name: 'late', durationMinutes: 35, tensionLevel: 4, disruptionTolerance: 6 },
    { name: 'endgame', durationMinutes: 25, tensionLevel: 3, disruptionTolerance: 7 },
  ],
};

const houseParty: GameProfile = {
  gameType: 'house_party',
  name: 'House Party',
  baseDisruptionTolerance: 9,
  naturalDeadTimeMinutes: 0,
  turnDurationMinutes: 0,
  phases: [
    { name: 'setup', durationMinutes: 20, tensionLevel: 5, disruptionTolerance: 9 },
    { name: 'early', durationMinutes: 40, tensionLevel: 6, disruptionTolerance: 9 },
    { name: 'mid', durationMinutes: 50, tensionLevel: 7, disruptionTolerance: 8 },
    { name: 'late', durationMinutes: 40, tensionLevel: 6, disruptionTolerance: 8 },
    { name: 'endgame', durationMinutes: 30, tensionLevel: 4, disruptionTolerance: 9 },
  ],
};

const barNight: GameProfile = {
  gameType: 'bar_night',
  name: 'Bar Night',
  baseDisruptionTolerance: 8,
  naturalDeadTimeMinutes: 0,
  turnDurationMinutes: 0,
  phases: [
    { name: 'setup', durationMinutes: 15, tensionLevel: 4, disruptionTolerance: 8 },
    { name: 'early', durationMinutes: 25, tensionLevel: 6, disruptionTolerance: 8 },
    { name: 'mid', durationMinutes: 35, tensionLevel: 7, disruptionTolerance: 7 },
    { name: 'late', durationMinutes: 25, tensionLevel: 5, disruptionTolerance: 7 },
    { name: 'endgame', durationMinutes: 20, tensionLevel: 3, disruptionTolerance: 9 },
  ],
};

const custom: GameProfile = {
  gameType: 'custom',
  name: 'Custom Event',
  baseDisruptionTolerance: 6,
  naturalDeadTimeMinutes: 0.5,
  turnDurationMinutes: 2,
  phases: [
    { name: 'setup', durationMinutes: 15, tensionLevel: 3, disruptionTolerance: 7 },
    { name: 'early', durationMinutes: 25, tensionLevel: 5, disruptionTolerance: 6 },
    { name: 'mid', durationMinutes: 30, tensionLevel: 6, disruptionTolerance: 6 },
    { name: 'late', durationMinutes: 30, tensionLevel: 5, disruptionTolerance: 5 },
    { name: 'endgame', durationMinutes: 20, tensionLevel: 4, disruptionTolerance: 7 },
  ],
};

export const GAME_PROFILES: Record<GameType, GameProfile> = {
  board_game: boardGame,
  party_game: partyGame,
  dinner_party: dinnerParty,
  house_party: houseParty,
  bar_night: barNight,
  custom,
};

/** Get a game profile by type. Throws on unknown type. */
export function getGameProfile(gameType: GameType): GameProfile {
  const profile = GAME_PROFILES[gameType];
  if (!profile) {
    throw new Error(`Unknown game type: "${gameType}". Available: ${Object.keys(GAME_PROFILES).join(', ')}`);
  }
  return profile;
}

/** Total duration of a game profile in minutes. */
export function getTotalDuration(profile: GameProfile): number {
  return profile.phases.reduce((sum, p) => sum + p.durationMinutes, 0);
}
