export const POINTS_BY_DIFFICULTY: Record<number, number> = {
  1: 10,
  2: 20,
  3: 35,
  4: 50,
  5: 50,
};

export const FALSE_CLAIM_PENALTY = 5;

export const AUTO_ACCEPT_SECONDS = 60;

export const STANDING_MISSION_COUNT = 8;

export const MAX_PLAYERS_FREE = 12;

export const POLL_INTERVAL_MS = 3000;
export const POLL_INTERVAL_PUSH_MS = 10000; // Reduced polling when push notifications are active

// Flash mission timing
export const FLASH_DURATION_MS = 75000; // 75 seconds
export const POLL_DURATION_MS = 30000; // 30 seconds

// Signal rewards
export const SIGNAL_POINTS = 1;

// Dev/test mode (compressed timers)
export const DEV_FLASH_DURATION_MS = 30000; // 30 seconds
export const DEV_POLL_DURATION_MS = 15000; // 15 seconds
