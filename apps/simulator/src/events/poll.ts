import type { Agent } from '../agents/agent.js';
import type { SimEvent } from './event-types.js';

/**
 * Simulate a poll event. Each agent that engaged picks an option.
 * The winning option is the one with the most votes.
 */
export function simulatePoll(event: SimEvent, agents: Agent[]): void {
  const options = event.pollOptions ?? [];
  if (options.length === 0) {
    event.resolution = { passed: false, pointsAwarded: 0 };
    return;
  }

  const votes: { agentId: string; vote: string }[] = [];
  const tally = new Map<string, number>();

  for (const option of options) {
    tally.set(option, 0);
  }

  for (const agent of agents) {
    const reaction = event.reactions.get(agent.id);
    if (!reaction) continue;
    if (reaction.decision === 'ignore') continue;

    // Use their vote_if_applicable as a player name if it matches an option,
    // otherwise pick based on persona traits and a deterministic selection
    let choice: string;
    if (reaction.vote_if_applicable && options.includes(reaction.vote_if_applicable)) {
      choice = reaction.vote_if_applicable;
    } else {
      // Pick based on a hash of the agent id + event title for determinism
      const hash = simpleHash(`${agent.id}-${event.title}`);
      choice = options[hash % options.length];
    }

    votes.push({ agentId: agent.id, vote: choice });
    tally.set(choice, (tally.get(choice) ?? 0) + 1);
  }

  // Find the winner
  let winnerOption = options[0];
  let maxVotes = 0;
  for (const [option, count] of tally) {
    if (count > maxVotes) {
      maxVotes = count;
      winnerOption = option;
    }
  }

  // The "winner" of a poll is the most-voted player/option
  // Polls award points to the subject if it's a player-vote poll
  const winnerAgent = agents.find(
    (a) => a.persona.name === winnerOption || a.id === winnerOption,
  );
  if (winnerAgent) {
    winnerAgent.score += event.points;
  }

  event.resolution = {
    passed: true,
    pointsAwarded: event.points,
    votes,
    winnerId: winnerAgent?.id,
  };
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
