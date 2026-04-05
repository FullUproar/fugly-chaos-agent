import type { GameProfile, GamePhase } from '../config/game-profiles';
import { getTotalDuration } from '../config/game-profiles';

/**
 * Tracks the progression of the underlying real-world game (board game, party, etc.)
 * through its phases. The simulator advances ticks; GameState translates elapsed
 * time into phase, tension, disruption tolerance, and dead-time windows.
 */
export class GameState {
  private readonly profile: GameProfile;
  private readonly totalMinutes: number;
  private readonly phaseStartMinutes: number[];
  private currentPhaseIndex: number = 0;
  private tick: number = 0;

  constructor(profile: GameProfile) {
    this.profile = profile;
    this.totalMinutes = getTotalDuration(profile);

    // Pre-compute the start minute of each phase for fast lookup.
    let cumulative = 0;
    this.phaseStartMinutes = profile.phases.map((p) => {
      const start = cumulative;
      cumulative += p.durationMinutes;
      return start;
    });
  }

  /** Advance the game clock. tick = elapsed minutes since session start. */
  advance(tick: number): void {
    this.tick = tick;

    // Walk forward through phases based on elapsed time.
    for (let i = 0; i < this.profile.phases.length; i++) {
      const phaseEnd = this.phaseStartMinutes[i] + this.profile.phases[i].durationMinutes;
      if (tick < phaseEnd) {
        this.currentPhaseIndex = i;
        return;
      }
    }
    // Past all phases -- clamp to the last one.
    this.currentPhaseIndex = this.profile.phases.length - 1;
  }

  /** The current phase definition. */
  get currentPhase(): GamePhase {
    return this.profile.phases[this.currentPhaseIndex];
  }

  /** Current tension level (1-10). */
  get tensionLevel(): number {
    return this.currentPhase.tensionLevel;
  }

  /** Current disruption tolerance (1-10). Higher = more tolerant. */
  get disruptionTolerance(): number {
    return this.currentPhase.disruptionTolerance;
  }

  /**
   * Probabilistic: is this moment likely dead time between turns?
   * For games with no structured turns (turnDuration = 0) this always returns false.
   * For turn-based games, dead time occurs ~naturalDeadTimeMinutes per cycle.
   */
  get isDeadTime(): boolean {
    const { turnDurationMinutes, naturalDeadTimeMinutes } = this.profile;
    if (turnDurationMinutes <= 0) return false;
    const cycleDuration = turnDurationMinutes + naturalDeadTimeMinutes;
    if (cycleDuration <= 0) return false;
    const deadTimeProbability = naturalDeadTimeMinutes / cycleDuration;
    return Math.random() < deadTimeProbability;
  }

  /** Minutes remaining in the session. */
  get minutesRemaining(): number {
    return Math.max(0, this.totalMinutes - this.tick);
  }

  /** Progress through the current phase, 0.0 to 1.0. */
  get phaseProgress(): number {
    const phaseStart = this.phaseStartMinutes[this.currentPhaseIndex];
    const phaseDuration = this.currentPhase.durationMinutes;
    if (phaseDuration <= 0) return 1;
    return Math.min(1, Math.max(0, (this.tick - phaseStart) / phaseDuration));
  }

  /** Total elapsed minutes. */
  get elapsed(): number {
    return this.tick;
  }

  /** The game profile driving this state. */
  get gameProfile(): GameProfile {
    return this.profile;
  }

  /** Whether the game has ended (elapsed >= total duration). */
  get isFinished(): boolean {
    return this.tick >= this.totalMinutes;
  }
}
