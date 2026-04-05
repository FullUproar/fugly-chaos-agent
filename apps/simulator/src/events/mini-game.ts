import type { Agent } from '../agents/agent.js';
import type { SimEvent } from './event-types.js';

/**
 * Simulate a mini-game event.
 * Phase 1: Agents submit based on their reaction (submission_if_applicable).
 * Phase 2: Voting -- agents vote for a favorite submission.
 * Phase 3: Determine winner based on variation rules.
 */
export function simulateMiniGame(event: SimEvent, agents: Agent[]): void {
  const variationId = event.miniGameVariation?.id ?? 'standard';

  // Phase 1: Collect submissions from engaged agents
  const submissions: { agentId: string; content: string; engagement: number }[] = [];

  for (const agent of agents) {
    const reaction = event.reactions.get(agent.id);
    if (!reaction) continue;
    if (reaction.decision === 'ignore') continue;

    const content = reaction.submission_if_applicable ?? generateFallbackSubmission(agent);
    submissions.push({
      agentId: agent.id,
      content,
      engagement: reaction.engagement,
    });
  }

  if (submissions.length === 0) {
    event.resolution = { passed: false, pointsAwarded: 0 };
    return;
  }

  // Phase 2: Determine winner based on variation
  let winnerId: string;

  switch (variationId) {
    case 'worst_wins': {
      // Lowest engagement wins (intentionally bad)
      submissions.sort((a, b) => a.engagement - b.engagement);
      winnerId = submissions[0].agentId;
      break;
    }

    case 'the_editor': {
      // Random agent is sole judge -- pick the one they'd most like
      const judgeIdx = simpleHash(event.title) % agents.length;
      const judge = agents[judgeIdx];
      // Judge picks the submission from the agent they have the most social
      // affinity with (approximated by engagement similarity)
      const otherSubs = submissions.filter((s) => s.agentId !== judge.id);
      if (otherSubs.length > 0) {
        // Pick based on hash for determinism
        const pickIdx = simpleHash(`${judge.id}-judge`) % otherSubs.length;
        winnerId = otherSubs[pickIdx].agentId;
      } else {
        winnerId = submissions[0].agentId;
      }
      break;
    }

    case 'crowd_favorite': {
      // Highest average engagement wins
      submissions.sort((a, b) => b.engagement - a.engagement);
      winnerId = submissions[0].agentId;
      break;
    }

    case 'sabotage': {
      // Two random submissions get swapped, then highest engagement wins
      if (submissions.length >= 2) {
        const idx1 = simpleHash(`${event.title}-sab1`) % submissions.length;
        let idx2 = simpleHash(`${event.title}-sab2`) % submissions.length;
        if (idx2 === idx1) idx2 = (idx1 + 1) % submissions.length;
        // Swap agent ids
        const tempId = submissions[idx1].agentId;
        submissions[idx1].agentId = submissions[idx2].agentId;
        submissions[idx2].agentId = tempId;
      }
      submissions.sort((a, b) => b.engagement - a.engagement);
      winnerId = submissions[0].agentId;
      break;
    }

    case 'the_skeptic': {
      // One random agent's "vote" counts 3x (simulated as engagement * 3)
      const skepticIdx = simpleHash(`${event.title}-skeptic`) % agents.length;
      const skepticId = agents[skepticIdx].id;

      // Tally votes: each agent votes for their favorite (not themselves)
      const voteTally = new Map<string, number>();
      for (const sub of submissions) {
        voteTally.set(sub.agentId, 0);
      }

      for (const agent of agents) {
        const reaction = event.reactions.get(agent.id);
        if (!reaction || reaction.decision === 'ignore') continue;

        // Vote for someone other than themselves
        const otherSubs = submissions.filter((s) => s.agentId !== agent.id);
        if (otherSubs.length === 0) continue;
        const voteIdx = simpleHash(`${agent.id}-vote-${event.title}`) % otherSubs.length;
        const votedFor = otherSubs[voteIdx].agentId;

        const multiplier = agent.id === skepticId ? 3 : 1;
        voteTally.set(votedFor, (voteTally.get(votedFor) ?? 0) + multiplier);
      }

      let maxVotes = 0;
      winnerId = submissions[0].agentId;
      for (const [agentId, count] of voteTally) {
        if (count > maxVotes) {
          maxVotes = count;
          winnerId = agentId;
        }
      }
      break;
    }

    case 'double_down':
    case 'confidence_bet':
    case 'the_reveal':
    case 'interrogation':
    case 'blind_swap':
    case 'mashup':
    case 'artists_choice':
    case 'standard':
    default: {
      // Standard: tally votes, highest wins
      const voteTally = new Map<string, number>();
      for (const sub of submissions) {
        voteTally.set(sub.agentId, 0);
      }

      for (const agent of agents) {
        const reaction = event.reactions.get(agent.id);
        if (!reaction || reaction.decision === 'ignore') continue;

        const otherSubs = submissions.filter((s) => s.agentId !== agent.id);
        if (otherSubs.length === 0) continue;
        const voteIdx = simpleHash(`${agent.id}-vote-${event.title}`) % otherSubs.length;
        const votedFor = otherSubs[voteIdx].agentId;
        voteTally.set(votedFor, (voteTally.get(votedFor) ?? 0) + 1);
      }

      let maxVotes = 0;
      winnerId = submissions[0].agentId;
      for (const [agentId, count] of voteTally) {
        if (count > maxVotes) {
          maxVotes = count;
          winnerId = agentId;
        }
      }
      break;
    }
  }

  // Award points to winner
  const winnerAgent = agents.find((a) => a.id === winnerId);
  if (winnerAgent) {
    winnerAgent.score += event.points;
  }

  event.resolution = {
    passed: true,
    pointsAwarded: event.points,
    winnerId,
  };
}

/** Generate a fallback submission when the agent engaged but didn't submit text. */
function generateFallbackSubmission(agent: Agent): string {
  const fallbacks = [
    `${agent.persona.name}'s quick attempt`,
    `Something ${agent.persona.name} threw together`,
    `${agent.persona.name} gave it a shot`,
  ];
  const idx = simpleHash(agent.id) % fallbacks.length;
  return fallbacks[idx];
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
