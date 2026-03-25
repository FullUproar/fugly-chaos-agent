export type VotingMechanicId =
  | 'standard' | 'dictator' | 'pitch_it' | 'volunteer_tribunal'
  | 'reverse_psychology' | 'auction' | 'russian_roulette' | 'alibi'
  | 'the_bribe' | 'hot_seat' | 'proxy_vote' | 'unanimous_or_bust'
  | 'points_gamble' | 'crowd_cheer' | 'the_skeptic';

export interface VotingMechanic {
  id: VotingMechanicId;
  name: string;
  description: string;
  reveal_text: string;
  chaos_level: 'chill' | 'moderate' | 'maximum';
  needs_input: boolean;
  auto_resolve: boolean;
  weight: number;
}

export const VOTING_MECHANICS: Record<VotingMechanicId, VotingMechanic> = {
  standard: {
    id: 'standard',
    name: 'Standard Vote',
    description: 'Everyone votes LEGIT or BULLSHIT. Majority rules.',
    reveal_text: 'The people will decide your fate.',
    chaos_level: 'chill',
    needs_input: false,
    auto_resolve: false,
    weight: 30,
  },
  dictator: {
    id: 'dictator',
    name: 'THE DICTATOR',
    description: 'One player has been chosen. Their word is law.',
    reveal_text: 'Democracy is overrated. ONE shall decide.',
    chaos_level: 'moderate',
    needs_input: false,
    auto_resolve: false,
    weight: 7,
  },
  pitch_it: {
    id: 'pitch_it',
    name: 'Pitch It',
    description: 'The claimant gets 15 seconds to make their case. Then you vote.',
    reveal_text: 'Convince us. You have 15 seconds.',
    chaos_level: 'chill',
    needs_input: true,
    auto_resolve: false,
    weight: 8,
  },
  volunteer_tribunal: {
    id: 'volunteer_tribunal',
    name: 'Volunteer Tribunal',
    description: 'Who wants to judge? First volunteers become the jury.',
    reveal_text: 'We need volunteers. Step forward or stay silent.',
    chaos_level: 'chill',
    needs_input: false,
    auto_resolve: false,
    weight: 7,
  },
  reverse_psychology: {
    id: 'reverse_psychology',
    name: 'Reverse Psychology',
    description: 'Vote normally... or did we flip everything?',
    reveal_text: 'Cast your votes. Trust your instincts. Or don\'t.',
    chaos_level: 'maximum',
    needs_input: false,
    auto_resolve: false,
    weight: 5,
  },
  auction: {
    id: 'auction',
    name: 'The Auction',
    description: 'Bid your own points. Highest bidder decides the outcome.',
    reveal_text: 'How much is the truth worth to you?',
    chaos_level: 'moderate',
    needs_input: true,
    auto_resolve: false,
    weight: 5,
  },
  russian_roulette: {
    id: 'russian_roulette',
    name: 'Russian Roulette',
    description: 'No vote. The chaos gods decide. 50/50.',
    reveal_text: 'Votes? Where we\'re going, we don\'t need votes.',
    chaos_level: 'maximum',
    needs_input: false,
    auto_resolve: true,
    weight: 4,
  },
  alibi: {
    id: 'alibi',
    name: 'The Alibi',
    description: 'Claimant and a random witness both tell the story. Do they match?',
    reveal_text: 'Let\'s hear both sides. Separately.',
    chaos_level: 'moderate',
    needs_input: true,
    auto_resolve: false,
    weight: 6,
  },
  the_bribe: {
    id: 'the_bribe',
    name: 'The Bribe',
    description: 'The claimant can offer their own points to buy your silence.',
    reveal_text: 'Everyone has a price. What\'s yours?',
    chaos_level: 'moderate',
    needs_input: true,
    auto_resolve: false,
    weight: 5,
  },
  hot_seat: {
    id: 'hot_seat',
    name: 'Hot Seat',
    description: '3 rapid-fire questions. Answer them all in 10 seconds or fail.',
    reveal_text: 'Three questions. Ten seconds. No hesitation.',
    chaos_level: 'moderate',
    needs_input: true,
    auto_resolve: false,
    weight: 5,
  },
  proxy_vote: {
    id: 'proxy_vote',
    name: 'Proxy Vote',
    description: 'You vote on behalf of the player to your LEFT. Think like them.',
    reveal_text: 'You are not yourself right now. Vote as your neighbor.',
    chaos_level: 'maximum',
    needs_input: false,
    auto_resolve: false,
    weight: 4,
  },
  unanimous_or_bust: {
    id: 'unanimous_or_bust',
    name: 'Unanimous or Bust',
    description: 'ONE bullshit call and it\'s over. All or nothing.',
    reveal_text: 'This requires UNANIMOUS approval. One dissenter ends it.',
    chaos_level: 'maximum',
    needs_input: false,
    auto_resolve: false,
    weight: 4,
  },
  points_gamble: {
    id: 'points_gamble',
    name: 'Double or Nothing',
    description: 'No vote. Coin flip. Win double or lose it all.',
    reveal_text: 'Forget the vote. Let fate decide. Double or nothing.',
    chaos_level: 'maximum',
    needs_input: false,
    auto_resolve: true,
    weight: 4,
  },
  crowd_cheer: {
    id: 'crowd_cheer',
    name: 'Crowd Cheer',
    description: 'Rate it 1-5. Average above 3 and it passes.',
    reveal_text: 'Make some noise! Rate the performance.',
    chaos_level: 'chill',
    needs_input: true,
    auto_resolve: false,
    weight: 6,
  },
  the_skeptic: {
    id: 'the_skeptic',
    name: 'THE SKEPTIC',
    description: 'One player\'s vote counts TRIPLE. Everyone else counts once.',
    reveal_text: 'One among you has been granted... extra authority.',
    chaos_level: 'moderate',
    needs_input: false,
    auto_resolve: false,
    weight: 6,
  },
};

const CHAOS_LEVEL_ORDER: Record<string, number> = { chill: 1, moderate: 2, maximum: 3 };

export function selectMechanic(
  chaosComfort: 'chill' | 'moderate' | 'maximum',
  recentMechanics: VotingMechanicId[] = [],
): VotingMechanic {
  const comfortLevel = CHAOS_LEVEL_ORDER[chaosComfort] || 2;
  const lastThree = new Set(recentMechanics.slice(-3));

  const eligible = Object.values(VOTING_MECHANICS).filter(
    (m) => CHAOS_LEVEL_ORDER[m.chaos_level] <= comfortLevel && !lastThree.has(m.id)
  );

  if (eligible.length === 0) {
    return VOTING_MECHANICS.standard;
  }

  const totalWeight = eligible.reduce((sum, m) => sum + m.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const mechanic of eligible) {
    roll -= mechanic.weight;
    if (roll <= 0) return mechanic;
  }

  return eligible[eligible.length - 1];
}

export const HOT_SEAT_QUESTIONS = [
  'Did you actually do it?',
  'Would you swear on Fugly\'s honor?',
  'Can anyone back you up?',
  'Did anyone see you?',
  'Are you sweating right now?',
  'Would you bet 20 points on it?',
  'Is this the whole truth?',
  'Did you practice this?',
  'Would you do it again?',
  'Are you making eye contact right now?',
  'Can you say that with a straight face?',
  'Is there video evidence?',
  'Did you hesitate before claiming?',
  'Would Fugly approve?',
  'Are you proud of yourself?',
  'Did anyone try to stop you?',
  'Is this your first offense?',
  'Can you demonstrate right now?',
  'Were there any witnesses?',
  'Do you feel lucky?',
];
