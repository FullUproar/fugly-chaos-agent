export type MiniGameVariationId =
  | 'standard' | 'worst_wins' | 'the_editor' | 'blind_swap'
  | 'mashup' | 'double_down' | 'the_reveal' | 'confidence_bet'
  | 'interrogation' | 'artists_choice' | 'crowd_favorite' | 'sabotage'
  | 'the_skeptic';

export type MiniGameType =
  | 'drawing' | 'caption' | 'hot_take' | 'lie_detector'
  | 'worst_advice' | 'speed_superlative' | 'emoji_story'
  | 'two_word_story' | 'bluff_stats' | 'assumption_arena';

export interface MiniGameVariation {
  id: MiniGameVariationId;
  name: string;
  description: string;
  reveal_text: string;
  applicable_to: MiniGameType[];
  weight: number;
}

export const MINI_GAME_VARIATIONS: Record<MiniGameVariationId, MiniGameVariation> = {
  standard: {
    id: 'standard',
    name: 'Standard Vote',
    description: 'Vote for your favorite. Classic rules.',
    reveal_text: 'Vote for your favorite.',
    applicable_to: ['drawing', 'caption', 'hot_take', 'lie_detector', 'worst_advice', 'speed_superlative', 'emoji_story', 'two_word_story', 'bluff_stats', 'assumption_arena'],
    weight: 25,
  },
  worst_wins: {
    id: 'worst_wins',
    name: 'WORST WINS',
    description: 'Vote for the WORST submission. That person gets the points.',
    reveal_text: 'The worse it is, the better.',
    applicable_to: ['drawing', 'caption', 'worst_advice', 'emoji_story', 'two_word_story'],
    weight: 10,
  },
  the_editor: {
    id: 'the_editor',
    name: 'THE EDITOR',
    description: 'One random player is the sole judge. Apples to Apples style.',
    reveal_text: 'One critic. One opinion. No appeals.',
    applicable_to: ['drawing', 'caption', 'worst_advice', 'emoji_story', 'two_word_story'],
    weight: 8,
  },
  blind_swap: {
    id: 'blind_swap',
    name: 'Blind Swap',
    description: 'You vote on a random submission, not knowing who made it.',
    reveal_text: 'Judge the work, not the person.',
    applicable_to: ['drawing', 'caption', 'worst_advice', 'emoji_story', 'two_word_story'],
    weight: 8,
  },
  mashup: {
    id: 'mashup',
    name: 'MASHUP',
    description: 'Two random captions get combined. Group votes if the mashup is funnier than either original.',
    reveal_text: 'What if we... combined them?',
    applicable_to: ['caption', 'two_word_story'],
    weight: 6,
  },
  double_down: {
    id: 'double_down',
    name: 'Double Down',
    description: 'After seeing the vote split, players can switch sides. Final minority gets 2x points.',
    reveal_text: 'The minority report pays double.',
    applicable_to: ['hot_take', 'bluff_stats', 'assumption_arena'],
    weight: 8,
  },
  the_reveal: {
    id: 'the_reveal',
    name: 'THE REVEAL',
    description: 'Everyone votes blind, then the most controversial player defends their position in 15 seconds.',
    reveal_text: 'Explain yourself.',
    applicable_to: ['hot_take', 'assumption_arena'],
    weight: 7,
  },
  confidence_bet: {
    id: 'confidence_bet',
    name: 'Confidence Bet',
    description: 'Vote AND wager 1-5 points on confidence. Right = multiply, wrong = lose wager.',
    reveal_text: 'Put your points where your mouth is.',
    applicable_to: ['lie_detector', 'hot_take', 'bluff_stats'],
    weight: 8,
  },
  interrogation: {
    id: 'interrogation',
    name: 'INTERROGATION',
    description: 'Group gets 2 yes/no questions before voting.',
    reveal_text: 'Two questions. Choose wisely.',
    applicable_to: ['lie_detector'],
    weight: 8,
  },
  artists_choice: {
    id: 'artists_choice',
    name: "Artist's Choice",
    description: "Each artist picks their favorite that ISN'T their own.",
    reveal_text: "Appreciate someone else's chaos.",
    applicable_to: ['drawing', 'emoji_story'],
    weight: 7,
  },
  crowd_favorite: {
    id: 'crowd_favorite',
    name: 'Crowd Favorite',
    description: 'Audience cheers (1-5 rating) instead of binary vote. Highest average wins.',
    reveal_text: 'Rate the performance.',
    applicable_to: ['drawing', 'caption', 'hot_take', 'lie_detector', 'worst_advice', 'speed_superlative', 'emoji_story', 'two_word_story', 'assumption_arena'],
    weight: 8,
  },
  sabotage: {
    id: 'sabotage',
    name: 'SABOTAGE',
    description: "Before voting, one random player gets to swap two submissions' authors. Nobody knows which were swapped.",
    reveal_text: "Something doesn't feel right...",
    applicable_to: ['drawing', 'caption'],
    weight: 5,
  },
  the_skeptic: {
    id: 'the_skeptic',
    name: 'THE SKEPTIC',
    description: "One random player's vote counts 3x. Nobody knows who.",
    reveal_text: 'Someone here has serious pull.',
    applicable_to: ['speed_superlative'],
    weight: 8,
  },
};

/**
 * Select a variation for a mini-game, avoiding recently used ones.
 * Same anti-repetition pattern as voting mechanics.
 */
export function selectVariation(
  gameType: MiniGameType,
  recentVariations: MiniGameVariationId[] = [],
): MiniGameVariation {
  const lastThree = new Set(recentVariations.slice(-3));

  const eligible = Object.values(MINI_GAME_VARIATIONS).filter(
    (v) => v.applicable_to.includes(gameType) && !lastThree.has(v.id),
  );

  if (eligible.length === 0) {
    return MINI_GAME_VARIATIONS.standard;
  }

  const totalWeight = eligible.reduce((sum, v) => sum + v.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const variation of eligible) {
    roll -= variation.weight;
    if (roll <= 0) return variation;
  }

  return eligible[eligible.length - 1];
}
