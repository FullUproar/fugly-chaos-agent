import type { Agent } from '../agents/agent.js';
import type { SimEvent } from './event-types.js';

/**
 * Process a claim vote on a standing mission using the specified voting mechanic.
 *
 * Each mechanic has different rules for how votes are counted and whether
 * the claim passes or fails.
 */
export function simulateClaimVote(
  event: SimEvent,
  agents: Agent[],
  claimantId: string,
  votingMechanicId: string,
): { passed: boolean; pointsAwarded: number; votes: { agentId: string; vote: string }[] } {
  const voters = agents.filter((a) => a.id !== claimantId);
  const votes: { agentId: string; vote: string }[] = [];

  // Collect raw votes from reactions
  for (const agent of voters) {
    const reaction = event.reactions.get(agent.id);
    if (!reaction) continue;
    if (reaction.decision === 'ignore') continue;

    const vote = reaction.vote_if_applicable ?? 'ACCEPT';
    votes.push({ agentId: agent.id, vote });
  }

  // If nobody voted, auto-pass
  if (votes.length === 0) {
    return { passed: true, pointsAwarded: event.points, votes };
  }

  switch (votingMechanicId) {
    case 'standard':
      return resolveStandard(votes, event.points);

    case 'dictator':
      return resolveDictator(votes, event.points);

    case 'unanimous_or_bust':
      return resolveUnanimous(votes, event.points);

    case 'reverse_psychology':
      return resolveReversePsychology(votes, event.points);

    case 'the_skeptic':
      return resolveSkeptic(votes, event.points);

    case 'russian_roulette':
      return resolveRussianRoulette(votes, event.points, event.title);

    case 'points_gamble':
      return resolvePointsGamble(votes, event.points, event.title);

    case 'crowd_cheer':
      return resolveCrowdCheer(votes, event.points);

    case 'proxy_vote':
      return resolveProxyVote(votes, event.points);

    case 'pitch_it':
    case 'volunteer_tribunal':
    case 'auction':
    case 'alibi':
    case 'the_bribe':
    case 'hot_seat':
    default:
      // Fall back to standard majority for mechanics that need extra input
      return resolveStandard(votes, event.points);
  }
}

/** Standard: majority rules. */
function resolveStandard(
  votes: { agentId: string; vote: string }[],
  points: number,
): { passed: boolean; pointsAwarded: number; votes: typeof votes } {
  const accepts = votes.filter((v) => v.vote === 'ACCEPT').length;
  const passed = accepts > votes.length / 2;
  return { passed, pointsAwarded: passed ? points : 0, votes };
}

/** Dictator: first voter decides everything. */
function resolveDictator(
  votes: { agentId: string; vote: string }[],
  points: number,
): { passed: boolean; pointsAwarded: number; votes: typeof votes } {
  const dictatorVote = votes[0]?.vote ?? 'ACCEPT';
  const passed = dictatorVote === 'ACCEPT';
  return { passed, pointsAwarded: passed ? points : 0, votes };
}

/** Unanimous or Bust: one BULLSHIT = fail. */
function resolveUnanimous(
  votes: { agentId: string; vote: string }[],
  points: number,
): { passed: boolean; pointsAwarded: number; votes: typeof votes } {
  const hasBullshit = votes.some((v) => v.vote === 'BULLSHIT');
  const passed = !hasBullshit;
  return { passed, pointsAwarded: passed ? points : 0, votes };
}

/** Reverse Psychology: all votes are flipped. */
function resolveReversePsychology(
  votes: { agentId: string; vote: string }[],
  points: number,
): { passed: boolean; pointsAwarded: number; votes: typeof votes } {
  const flippedVotes = votes.map((v) => ({
    ...v,
    vote: v.vote === 'ACCEPT' ? 'BULLSHIT' : 'ACCEPT',
  }));
  const accepts = flippedVotes.filter((v) => v.vote === 'ACCEPT').length;
  const passed = accepts > flippedVotes.length / 2;
  return { passed, pointsAwarded: passed ? points : 0, votes: flippedVotes };
}

/** The Skeptic: one random voter's vote counts 3x. */
function resolveSkeptic(
  votes: { agentId: string; vote: string }[],
  points: number,
): { passed: boolean; pointsAwarded: number; votes: typeof votes } {
  if (votes.length === 0) return { passed: true, pointsAwarded: points, votes };

  // Pick a deterministic "skeptic"
  const skepticIdx = simpleHash(votes.map((v) => v.agentId).join('-')) % votes.length;
  let acceptWeight = 0;
  let totalWeight = 0;

  for (let i = 0; i < votes.length; i++) {
    const weight = i === skepticIdx ? 3 : 1;
    totalWeight += weight;
    if (votes[i].vote === 'ACCEPT') {
      acceptWeight += weight;
    }
  }

  const passed = acceptWeight > totalWeight / 2;
  return { passed, pointsAwarded: passed ? points : 0, votes };
}

/** Russian Roulette: no vote matters, 50/50 coin flip. */
function resolveRussianRoulette(
  votes: { agentId: string; vote: string }[],
  points: number,
  seed: string,
): { passed: boolean; pointsAwarded: number; votes: typeof votes } {
  const flip = simpleHash(`roulette-${seed}`) % 2 === 0;
  return { passed: flip, pointsAwarded: flip ? points : 0, votes };
}

/** Points Gamble (Double or Nothing): coin flip, double or zero. */
function resolvePointsGamble(
  votes: { agentId: string; vote: string }[],
  points: number,
  seed: string,
): { passed: boolean; pointsAwarded: number; votes: typeof votes } {
  const flip = simpleHash(`gamble-${seed}`) % 2 === 0;
  return { passed: flip, pointsAwarded: flip ? points * 2 : 0, votes };
}

/** Crowd Cheer: treat engagement levels as a 1-5 rating. Average > 3 passes. */
function resolveCrowdCheer(
  votes: { agentId: string; vote: string }[],
  points: number,
): { passed: boolean; pointsAwarded: number; votes: typeof votes } {
  // Map ACCEPT = 4, BULLSHIT = 2 as a simplified cheer rating
  const total = votes.reduce((sum, v) => sum + (v.vote === 'ACCEPT' ? 4 : 2), 0);
  const avg = total / votes.length;
  const passed = avg > 3;
  return { passed, pointsAwarded: passed ? points : 0, votes };
}

/** Proxy Vote: votes shift one position (vote on behalf of the person to your left). */
function resolveProxyVote(
  votes: { agentId: string; vote: string }[],
  points: number,
): { passed: boolean; pointsAwarded: number; votes: typeof votes } {
  // Shift votes: each agent casts the next agent's vote
  const proxiedVotes = votes.map((v, i) => ({
    agentId: v.agentId,
    vote: votes[(i + 1) % votes.length].vote,
  }));
  const accepts = proxiedVotes.filter((v) => v.vote === 'ACCEPT').length;
  const passed = accepts > proxiedVotes.length / 2;
  return { passed, pointsAwarded: passed ? points : 0, votes: proxiedVotes };
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
