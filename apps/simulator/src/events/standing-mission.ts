import type { Agent } from '../agents/agent.js';
import type { SessionState } from '../engine/session-state.js';
import type { GameState } from '../engine/game-state.js';
import type { ScenarioVariation } from '../config/scenarios.js';

/**
 * Check whether any agent would spontaneously claim a standing mission
 * between scheduled events. Deterministic based on agent traits and game state.
 *
 * Returns at most one claim per tick to avoid flooding.
 */
/**
 * Check whether any agent would spontaneously claim a standing mission.
 * Only checks every 3-5 minutes (not every tick) to keep claims organic.
 * Competitive agents (Marcus, Alex) and social agents (Jade) claim more often.
 */
export function checkStandingClaims(
  tick: number,
  agents: Agent[],
  sessionState: SessionState,
  gameState: GameState,
  variation?: ScenarioVariation | null,
): { agentId: string; missionId: string; missionTitle: string; points: number } | null {
  const available = sessionState.standingMissions.filter(
    (m) => !sessionState.standingMissionsClaimed.has(m.title),
  );
  if (available.length === 0) return null;

  // Don't allow claims during blocking activities
  if (sessionState.hasBlockingActivity) return null;

  // Only check every 3-5 minutes, not every tick.
  // Use a deterministic hash to decide which ticks are "claim check" ticks.
  const checkHash = simpleHash(`claim-check-${tick}`);
  const checkInterval = 3 + (checkHash % 3); // 3, 4, or 5
  if (tick % checkInterval !== 0) return null;

  // Shuffle agent order per tick so the same agent doesn't always get first pick
  const shuffled = [...agents].sort((a, b) => {
    return simpleHash(`${a.id}-${tick}`) - simpleHash(`${b.id}-${tick}`);
  });

  for (const agent of shuffled) {
    // Skip distracted agents
    if (agent.isDistracted(tick)) continue;

    // Base probability from persona engagement with standing missions
    const baseChance = agent.persona.eventEngagement.standingMission;

    // Competitive agents (high competitiveness) are more likely to claim
    const competitiveBoost = 1.0 + (agent.persona.competitiveness / 10) * 0.5;

    // Social agents claim social missions more (handled in pickMissionForAgent),
    // but also have a general boost from socialEngagement
    const socialBoost = 1.0 + (agent.persona.socialEngagement / 10) * 0.3;

    // Boost during dead time -- standing claims fit naturally in downtime
    const deadTimeBoost = gameState.isDeadTime ? 1.3 : 1.0;

    // Competitive agents claim more when behind
    const otherScores = agents.filter((a) => a.id !== agent.id).map((a) => a.score);
    const maxOtherScore = Math.max(0, ...otherScores);
    const behindBoost = agent.score < maxOtherScore
      ? 1.0 + (agent.persona.competitiveness / 10) * 0.3
      : 1.0;

    // Energy matters -- low energy agents don't bother
    const energyFactor = Math.max(0.3, agent.energy / 10);

    // Higher per-check probability since we check less often (every 3-5 min instead of every tick).
    // Target: roughly one claim every 5-15 minutes across the whole group.
    const claimChance = baseChance * competitiveBoost * socialBoost * deadTimeBoost * behindBoost * energyFactor * 0.15;

    // Deterministic-ish: use tick + agent hash to make it reproducible
    const hash = simpleHash(`${agent.id}-${tick}`);
    const roll = (hash % 1000) / 1000;

    if (roll < claimChance) {
      // Pick a mission that fits the agent
      const mission = pickMissionForAgent(agent, available);
      if (mission) {
        let points = mission.points;

        // Comeback mechanic: double_points for bottom 2 players
        if (variation?.comebackMechanic === 'double_points') {
          const sorted = [...agents].sort((a, b) => b.score - a.score);
          const bottom2Ids = new Set(sorted.slice(-2).map((a) => a.id));
          if (bottom2Ids.has(agent.id)) {
            points *= 2;
          }
        }

        return {
          agentId: agent.id,
          missionId: `standing-${tick}-${agent.id}`,
          missionTitle: mission.title,
          points,
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
