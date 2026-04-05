/**
 * Adaptive AI Frequency — adjusts event intervals based on room energy.
 *
 * Only applies to rooms with aiMode enabled (paid tier).
 * Tracks recent player interactions (claims, votes, signals, messages)
 * and signal sentiment to dynamically tune when the next event fires.
 */

export function getAdaptiveInterval(
  baseInterval: [number, number],
  recentActivityCount: number, // claims + votes + signals in last 10 min
  recentShakeSignals: number,  // "shake_it_up" signals in last 10 min
  recentSlowSignals: number,   // "slow_your_roll" signals in last 10 min
): number {
  let multiplier = 1.0;

  // High activity = back off, let the natural chaos flow
  if (recentActivityCount > 8) multiplier *= 1.5;
  else if (recentActivityCount > 5) multiplier *= 1.2;

  // Low activity = fire sooner to re-energize the room
  if (recentActivityCount < 2) multiplier *= 0.6;
  else if (recentActivityCount < 4) multiplier *= 0.8;

  // Signal overrides — direct player requests take priority
  if (recentShakeSignals > 0) multiplier *= 0.5;
  if (recentSlowSignals > 0) multiplier *= 1.5;

  const base =
    baseInterval[0] + Math.random() * (baseInterval[1] - baseInterval[0]);
  return Math.max(60_000, base * multiplier); // minimum 1 minute
}
