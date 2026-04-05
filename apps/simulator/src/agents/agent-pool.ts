import type { AgentPersona } from '../config/personas.js';
import { Agent } from './agent.js';

/**
 * Manages the collection of simulated agents for a session.
 * Provides convenience accessors for aggregate state (scoreboard,
 * average energy, group mood).
 */
export class AgentPool {
  private agents: Map<string, Agent> = new Map();

  constructor(personas: AgentPersona[]) {
    for (const persona of personas) {
      this.agents.set(persona.id, new Agent(persona));
    }
  }

  getAgent(id: string): Agent {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Unknown agent: ${id}`);
    return agent;
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getOtherAgents(excludeId: string): Agent[] {
    return this.getAllAgents().filter((a) => a.id !== excludeId);
  }

  /** Get a random agent id. */
  getRandomAgentId(): string {
    const ids = Array.from(this.agents.keys());
    return ids[Math.floor(Math.random() * ids.length)];
  }

  /** Get all agent names. */
  getNames(): string[] {
    return this.getAllAgents().map((a) => a.persona.name);
  }

  /** Sorted scoreboard with rank. */
  getScoreboard(): { name: string; score: number; rank: number }[] {
    const sorted = this.getAllAgents()
      .map((a) => ({ name: a.persona.name, score: a.score }))
      .sort((a, b) => b.score - a.score);
    return sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));
  }

  /** Average energy across all agents (1-10 scale). */
  getAverageEnergy(): number {
    const agents = this.getAllAgents();
    if (agents.length === 0) return 0;
    const total = agents.reduce((sum, a) => sum + a.energy, 0);
    return total / agents.length;
  }

  /**
   * Dominant mood across all agents. Returns the most common
   * overall_vibe, breaking ties toward the more negative mood
   * (better to flag problems than hide them).
   */
  getAverageMood(): string {
    const agents = this.getAllAgents();
    if (agents.length === 0) return 'fine';

    const vibePriority = [
      'checked_out',
      'frustrated',
      'annoyed',
      'meh',
      'fine',
      'loving_it',
    ];

    const counts = new Map<string, number>();
    for (const agent of agents) {
      const vibe = agent.lastOverallVibe;
      counts.set(vibe, (counts.get(vibe) ?? 0) + 1);
    }

    let maxCount = 0;
    let dominant = 'fine';
    for (const vibe of vibePriority) {
      const count = counts.get(vibe) ?? 0;
      if (count >= maxCount && count > 0) {
        maxCount = count;
        dominant = vibe;
      }
    }

    return dominant;
  }

  /** Record energy for all agents (call once per tick). */
  recordAllEnergy(): void {
    for (const agent of this.getAllAgents()) {
      agent.recordEnergy();
    }
  }

  /** Number of agents in the pool. */
  get size(): number {
    return this.agents.size;
  }
}
