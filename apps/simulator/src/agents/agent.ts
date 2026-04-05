import type { AgentPersona } from '../config/personas.js';
import type { SimEvent, AgentResponse } from '../events/event-types.js';
import type { AgentContext } from './prompts.js';

export interface AgentHistoryEntry {
  tick: number;
  eventType: string;
  title: string;
  decision: string;
  fun: number;
  annoyance: number;
  dialogue: string;
}

/**
 * A simulated player agent with personality, energy, state tracking,
 * and distraction modeling. State evolves over the night as events fire
 * and the agent reacts (or doesn't).
 */
export class Agent {
  readonly id: string;
  readonly persona: AgentPersona;

  energy: number;
  score: number = 0;
  history: AgentHistoryEntry[] = [];
  lastOverallVibe: string = 'fine';
  signalsSent: number = 0;
  totalEngaged: number = 0;
  totalIgnored: number = 0;
  totalComplaints: number = 0;
  energyCurve: number[] = [];

  private lastPhoneCheck: number = 0;
  private readonly _startEnergy: number;
  private _lowPointEnergy: number;
  private _lowPointTick: number = 0;
  private _lastEventTick: number = 0;
  private _flashCount: number = 0;
  private _pollCount: number = 0;
  private _miniGameCount: number = 0;

  constructor(persona: AgentPersona) {
    this.id = persona.id;
    this.persona = persona;
    // Slight randomization: everyone starts between 7.0 and 8.0
    this.energy = 7 + Math.random();
    this._startEnergy = this.energy;
    this._lowPointEnergy = this.energy;
  }

  /** Whether this agent is distracted (on their phone) at this tick. */
  isDistracted(tick: number): boolean {
    const minutesSinceCheck = tick - this.lastPhoneCheck;
    if (minutesSinceCheck >= this.persona.phoneCheckFrequencyMin) {
      // They are checking their phone now
      this.lastPhoneCheck = tick;
      return true;
    }
    return false;
  }

  /** Apply a reaction from an event to update agent state. */
  applyReaction(tick: number, event: SimEvent, reaction: AgentResponse): void {
    // Update energy, clamped to [1, 10]
    this.energy = Math.max(1, Math.min(10, this.energy + reaction.energy_delta));

    // Track energy low point
    if (this.energy < this._lowPointEnergy) {
      this._lowPointEnergy = this.energy;
      this._lowPointTick = tick;
    }

    this.lastOverallVibe = reaction.overall_vibe;
    this._lastEventTick = tick;

    // Track event type counts
    const type = event.type.toLowerCase();
    if (type.includes('flash')) this._flashCount++;
    else if (type.includes('poll')) this._pollCount++;
    else if (type.includes('mini')) this._miniGameCount++;

    // Track engagement decision
    if (reaction.decision === 'engage' || reaction.decision === 'half_engage') {
      this.totalEngaged++;
    } else if (reaction.decision === 'ignore') {
      this.totalIgnored++;
    } else if (reaction.decision === 'complain') {
      this.totalComplaints++;
    }

    if (reaction.would_send_signal) {
      this.signalsSent++;
    }

    // Score: agents who claim get points (simplified — the engine may override)
    if (reaction.claim_if_applicable && reaction.decision !== 'ignore') {
      this.score += event.points ?? 0;
    }

    this.history.push({
      tick,
      eventType: event.type,
      title: event.title,
      decision: reaction.decision,
      fun: reaction.fun_factor,
      annoyance: reaction.annoyance,
      dialogue: reaction.dialogue,
    });
  }

  /** Record energy at current tick for curve tracking. */
  recordEnergy(): void {
    this.energyCurve.push(this.energy);
  }

  /** Get recent history entries (last N). */
  getRecentHistory(count: number = 5): AgentHistoryEntry[] {
    return this.history.slice(-count);
  }

  /** Get top N highlights sorted by fun_factor descending. */
  getHighlights(n: number = 3): AgentHistoryEntry[] {
    return [...this.history]
      .sort((a, b) => b.fun - a.fun)
      .slice(0, n);
  }

  /** Get top N low points sorted by annoyance descending. */
  getLowPoints(n: number = 3): AgentHistoryEntry[] {
    return [...this.history]
      .sort((a, b) => b.annoyance - a.annoyance)
      .slice(0, n);
  }

  /**
   * Build context object for prompt generation. The caller merges in
   * the event-specific fields before passing to buildUserPrompt.
   */
  getContext(
    tick: number,
    totalMinutes: number,
    currentPhase: string,
    tensionLevel: number,
    disruptionTolerance: number,
    isDeadTime: boolean,
    otherAgents: Agent[],
    standingMissions: { title: string; description: string; points: number }[],
    activeClaim: string | null,
    eventCounts: { total: number; flash: number; poll: number; miniGame: number },
    minutesSinceLastEvent: number,
  ): Omit<AgentContext, 'event'> {
    const rank = this.getRank(otherAgents);
    return {
      persona: this.persona,
      tick,
      totalMinutes,
      energy: this.energy,
      score: this.score,
      rank,
      totalPlayers: otherAgents.length + 1,
      eventCount: eventCounts.total,
      flashCount: eventCounts.flash,
      pollCount: eventCounts.poll,
      miniGameCount: eventCounts.miniGame,
      minutesSinceLastEvent,
      currentPhase,
      tensionLevel,
      disruptionTolerance,
      isDeadTime,
      otherPlayers: otherAgents.map((a) => ({
        name: a.persona.name,
        energy: a.energy,
        score: a.score,
        lastVibe: a.lastOverallVibe,
      })),
      standingMissions,
      activeClaim,
      recentHistory: this.getRecentHistory(),
    };
  }

  /** Get this agent's rank among all agents (1 = highest score). */
  private getRank(otherAgents: Agent[]): number {
    const allScores = [this.score, ...otherAgents.map((a) => a.score)];
    allScores.sort((a, b) => b - a);
    return allScores.indexOf(this.score) + 1;
  }

  // ── Read-only accessors ─────────────────────────────────────────────────

  /** The starting energy level (for final assessment). */
  get initialEnergy(): number {
    return this._startEnergy;
  }

  /** Lowest energy recorded during the session. */
  get lowPointEnergy(): number {
    return this._lowPointEnergy;
  }

  /** Tick at which the energy low point occurred. */
  get lowPointTick(): number {
    return this._lowPointTick;
  }

  /** Tick of the last event this agent reacted to. */
  get lastEventTick(): number {
    return this._lastEventTick;
  }

  /** Flash missions this agent has seen. */
  get flashCount(): number {
    return this._flashCount;
  }

  /** Polls this agent has seen. */
  get pollCount(): number {
    return this._pollCount;
  }

  /** Mini-games this agent has seen. */
  get miniGameCount(): number {
    return this._miniGameCount;
  }

  /** Total events this agent has reacted to. */
  get eventCount(): number {
    return this.history.length;
  }
}
