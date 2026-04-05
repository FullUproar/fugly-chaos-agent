import type { Agent } from '../agents/agent.js';
import type { SimEvent } from '../events/event-types.js';
import type { TickMetrics } from './types.js';

/**
 * Records per-tick metrics throughout the simulation for later aggregation.
 */
export class MetricsCollector {
  private ticks: TickMetrics[] = [];

  /**
   * Record the state at a given tick.
   * If an event was active, captures agent reactions from it.
   */
  recordTick(
    tick: number,
    phase: string,
    tensionLevel: number,
    disruptionTolerance: number,
    event: SimEvent | null,
    agents: Agent[],
  ): void {
    const agentMetrics = new Map<string, {
      energy: number;
      score: number;
      engagement: number;
      disruption: number;
      funFactor: number;
      annoyance: number;
      humorLanded: number;
      attentionCost: number;
      decision: string;
      overallVibe: string;
    }>();

    for (const agent of agents) {
      const reaction = event?.reactions.get(agent.id);

      agentMetrics.set(agent.id, {
        energy: agent.energy,
        score: agent.score,
        engagement: reaction?.engagement ?? 0,
        disruption: reaction?.disruption_perception ?? 0,
        funFactor: reaction?.fun_factor ?? 0,
        annoyance: reaction?.annoyance ?? 0,
        humorLanded: reaction?.humor_landed ?? 0,
        attentionCost: reaction?.attention_cost ?? 0,
        decision: reaction?.decision ?? 'none',
        overallVibe: agent.lastOverallVibe,
      });
    }

    this.ticks.push({
      tick,
      phase,
      tensionLevel,
      disruptionTolerance,
      activeEventType: event?.type ?? null,
      agentMetrics,
    });
  }

  /** Return the full timeline of tick metrics. */
  getTimeline(): TickMetrics[] {
    return this.ticks;
  }

  /** Total number of ticks recorded. */
  get tickCount(): number {
    return this.ticks.length;
  }
}
