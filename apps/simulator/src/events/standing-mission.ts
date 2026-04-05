import type { Agent } from '../agents/agent.js';
import type { SessionState } from '../engine/session-state.js';
import type { GameState } from '../engine/game-state.js';

/**
 * Check whether any agent would spontaneously claim a standing mission
 * between scheduled events. Deterministic based on agent traits and game state.
 *
 * Returns at most one claim per tick to avoid flooding.
 */
export function checkStandingClaims(
  tick: number,
  agents: Agent[],
  sessionState: SessionState,
  gameState: GameState,
): { agentId: string; missionId: string; missionTitle: string; points: number } | null {
  const available = sessionState.standingMissions.filter(
    (m) => !sessionState.standingMissionsClaimed.has(m.title),
  );
  if (available.length === 0) return null;

  // Don't allow claims during blocking activities
  if (sessionState.hasBlockingActivity) return null;

  for (const agent of agents) {
    // Skip distracted agents
    if (agent.isDistracted(tick)) continue;

    // Base probability from persona engagement with standing missions
    const baseChance = agent.persona.eventEngagement.standingMission;

    // Boost during dead time -- standing claims fit naturally in downtime
    const deadTimeBoost = gameState.isDeadTime ? 1.5 : 0.8;

    // Competitive agents claim more when behind
    const otherScores = agents.filter((a) => a.id !== agent.id).map((a) => a.score);
    const maxOtherScore = Math.max(0, ...otherScores);
    const behindBoost = agent.score < maxOtherScore
      ? 1.0 + (agent.persona.competitiveness / 10) * 0.3
      : 1.0;

    // Energy matters -- low energy agents don't bother
    const energyFactor = agent.energy / 10;

    // Overall probability per tick (per mission check)
    const claimChance = baseChance * deadTimeBoost * behindBoost * energyFactor * 0.02;

    // Deterministic-ish: use tick + agent hash to make it reproducible
    const hash = simpleHash(`${agent.id}-${tick}`);
    const roll = (hash % 1000) / 1000;

    if (roll < claimChance) {
      // Pick a mission that fits the agent
      const mission = pickMissionForAgent(agent, available);
      if (mission) {
        return {
          agentId: agent.id,
          missionId: `standing-${tick}-${agent.id}`,
          missionTitle: mission.title,
          points: mission.points,
        };
      }
    }
  }

  return null;
}

/**
 * Pick a standing mission that the agent is most likely to attempt,
 * based on category preference and personality.
 */
function pickMissionForAgent(
  agent: Agent,
  missions: Array<{ title: string; description: string; points: number; category: string }>,
): typeof missions[0] | null {
  if (missions.length === 0) return null;

  // Social-style agents prefer social missions, instigators prefer sabotage, etc.
  const categoryWeights: Record<string, number> = {
    social: agent.persona.socialEngagement / 10,
    performance: agent.persona.chaosTolerance / 10,
    sabotage: agent.persona.socialStyle === 'instigator' ? 0.8 : 0.3,
    alliance: agent.persona.socialEngagement / 10,
    endurance: agent.persona.attentionSpan / 10,
    meta: agent.persona.competitiveness / 10,
  };

  let bestMission = missions[0];
  let bestWeight = 0;

  for (const mission of missions) {
    const weight = categoryWeights[mission.category] ?? 0.5;
    // Add some variation
    const hash = simpleHash(`${agent.id}-${mission.title}`);
    const variation = 0.5 + (hash % 100) / 100;
    const finalWeight = weight * variation;

    if (finalWeight > bestWeight) {
      bestWeight = finalWeight;
      bestMission = mission;
    }
  }

  return bestMission;
}

/** Simple deterministic hash for reproducible pseudo-randomness. */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
