import type { Claim } from '../types/database';
import { FALSE_CLAIM_PENALTY } from '../constants/scoring';

export function calculateScore(claims: Claim[]): number {
  let score = 0;
  for (const claim of claims) {
    if (claim.status === 'VOTE_PASSED' || claim.status === 'ACCEPTED') {
      score += claim.points_awarded;
    }
    if (claim.status === 'VOTE_FAILED') {
      score -= FALSE_CLAIM_PENALTY;
    }
  }
  return score;
}
