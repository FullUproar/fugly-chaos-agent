import type { Agent } from '../agents/agent.js';
import type { SimEvent } from './event-types.js';

/**
 * Simulate the outcome of a flash mission event based on agent reactions.
 * Updates event.resolution in place.
 */
export function simulateFlashMission(event: SimEvent, agents: Agent[]): void {
  const flashType = event.flashType ?? 'race';

  switch (flashType) {
    case 'race':
      resolveRaceMission(event, agents);
      break;
    case 'target':
      resolveTargetMission(event, agents);
      break;
    case 'group':
      resolveGroupMission(event, agents);
      break;
  }
}

/**
 * Race: first to claim wins. Determined by attention + engagement score.
 * Higher attention span + higher engagement = faster reaction.
 */
function resolveRaceMission(event: SimEvent, agents: Agent[]): void {
  let bestAgent: Agent | null = null;
  let bestSpeed = -1;

  for (const agent of agents) {
    const reaction = event.reactions.get(agent.id);
    if (!reaction) continue;
    if (reaction.decision === 'ignore' || reaction.decision === 'complain') continue;
    if (!reaction.claim_if_applicable) continue;

    // Speed = attention span + engagement - attention cost
    const speed =
      agent.persona.attentionSpan +
      reaction.engagement -
      reaction.attention_cost * 0.5;

    if (speed > bestSpeed) {
      bestSpeed = speed;
      bestAgent = agent;
    }
  }

  if (bestAgent) {
    bestAgent.score += event.points;
    event.resolution = {
      passed: true,
      pointsAwarded: event.points,
      claimantId: bestAgent.id,
      winnerId: bestAgent.id,
    };
  } else {
    event.resolution = {
      passed: false,
      pointsAwarded: 0,
    };
  }
}

/**
 * Target: only the targeted player can claim. If they engaged, they succeed.
 */
function resolveTargetMission(event: SimEvent, agents: Agent[]): void {
  const targetId = event.targetPlayer;
  if (!targetId) {
    // No target assigned, treat as failed
    event.resolution = { passed: false, pointsAwarded: 0 };
    return;
  }

  const targetAgent = agents.find((a) => a.id === targetId || a.persona.name === targetId);
  if (!targetAgent) {
    event.resolution = { passed: false, pointsAwarded: 0 };
    return;
  }

  const reaction = event.reactions.get(targetAgent.id);
  if (reaction && (reaction.decision === 'engage' || reaction.decision === 'half_engage')) {
    targetAgent.score += event.points;
    event.resolution = {
      passed: true,
      pointsAwarded: event.points,
      claimantId: targetAgent.id,
      winnerId: targetAgent.id,
    };
  } else {
    event.resolution = {
      passed: false,
      pointsAwarded: 0,
    };
  }
}

/**
 * Group: all participating agents get partial points. Most engaged gets bonus.
 */
function resolveGroupMission(event: SimEvent, agents: Agent[]): void {
  const participants: { agent: Agent; engagement: number }[] = [];
  const basePoints = Math.ceil(event.points / 2);
  const bonusPoints = event.points - basePoints;

  for (const agent of agents) {
    const reaction = event.reactions.get(agent.id);
    if (!reaction) continue;
    if (reaction.decision === 'engage' || reaction.decision === 'half_engage') {
      agent.score += basePoints;
      participants.push({ agent, engagement: reaction.engagement });
    }
  }

  // Highest engagement gets the bonus
  let winnerId: string | undefined;
  if (participants.length > 0) {
    participants.sort((a, b) => b.engagement - a.engagement);
    const winner = participants[0];
    winner.agent.score += bonusPoints;
    winnerId = winner.agent.id;
  }

  event.resolution = {
    passed: participants.length > 0,
    pointsAwarded: participants.length * basePoints + (winnerId ? bonusPoints : 0),
    winnerId,
  };
}
