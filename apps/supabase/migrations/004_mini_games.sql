-- Migration 004: Mini-games (Drawing Contest, Caption This, Hot Takes, Lie Detector)

-- 1. Mini-games table
CREATE TABLE IF NOT EXISTS mini_games (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('drawing', 'caption', 'hot_take', 'lie_detector')),
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'PROMPTING' CHECK (status IN ('PROMPTING', 'SUBMITTING', 'VOTING', 'RESULTS', 'CLOSED')),
  points integer NOT NULL DEFAULT 20,
  phase_ends_at timestamptz,
  winner_room_player_id uuid REFERENCES room_players(id),
  target_player_id uuid REFERENCES room_players(id), -- player referenced in prompt
  created_at timestamptz DEFAULT now()
);

-- 2. Mini-game submissions
CREATE TABLE IF NOT EXISTS mini_game_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mini_game_id uuid NOT NULL REFERENCES mini_games(id) ON DELETE CASCADE,
  room_player_id uuid NOT NULL REFERENCES room_players(id),
  content text NOT NULL, -- text for captions, JSON for drawings, 'agree'/'disagree' for hot takes
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(mini_game_id, room_player_id)
);

-- 3. Mini-game votes (who voted for which submission)
CREATE TABLE IF NOT EXISTS mini_game_votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mini_game_id uuid NOT NULL REFERENCES mini_games(id) ON DELETE CASCADE,
  room_player_id uuid NOT NULL REFERENCES room_players(id),
  voted_for_submission_id uuid NOT NULL REFERENCES mini_game_submissions(id),
  voted_at timestamptz DEFAULT now(),
  UNIQUE(mini_game_id, room_player_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_mini_games_room ON mini_games(room_id);
CREATE INDEX IF NOT EXISTS idx_mini_games_status ON mini_games(status) WHERE status != 'CLOSED';
CREATE INDEX IF NOT EXISTS idx_mini_game_subs_game ON mini_game_submissions(mini_game_id);
CREATE INDEX IF NOT EXISTS idx_mini_game_votes_game ON mini_game_votes(mini_game_id);

-- 5. RLS
ALTER TABLE mini_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_game_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_game_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view mini-games in their room" ON mini_games
  FOR SELECT USING (
    room_id IN (SELECT room_id FROM room_players WHERE player_id = auth.uid())
  );

CREATE POLICY "Players can view submissions in their room" ON mini_game_submissions
  FOR SELECT USING (
    mini_game_id IN (SELECT id FROM mini_games WHERE room_id IN
      (SELECT room_id FROM room_players WHERE player_id = auth.uid()))
  );
