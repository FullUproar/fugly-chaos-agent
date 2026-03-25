-- Chaos voting mechanics: each claim gets a random resolution method
ALTER TABLE claims ADD COLUMN IF NOT EXISTS voting_mechanic text DEFAULT 'standard';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mechanic_data jsonb DEFAULT '{}';

-- mechanic_data stores mechanic-specific state:
-- dictator: {dictator_id: uuid}
-- pitch_it: {pitch: string}
-- auction: {bids: [{player_id, amount}]}
-- alibi: {witness_id: uuid, claimant_story: string, witness_story: string}
-- the_bribe: {offered_points: number}
-- hot_seat: {questions: string[], answers: string[], answered_in_time: boolean}
-- proxy_vote: {proxy_map: {voter_id: voting_as_id}}
-- the_skeptic: {skeptic_id: uuid}
-- russian_roulette: {result: boolean}
-- points_gamble: {wager: number, result: boolean}
-- crowd_cheer: {ratings: [{player_id, rating}]}
-- reverse_psychology: {flipped: true}
-- volunteer_tribunal: {volunteers: uuid[]}
-- unanimous_or_bust: {}

-- Track recent mechanics per room to avoid repetition
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS recent_mechanics text[] DEFAULT '{}';
