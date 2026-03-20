-- ============================================================
-- Afterroar HQ Integration
-- Link Chaos Agent players to Full Uproar accounts
-- ============================================================

-- Link anonymous chaos agent players to Full Uproar accounts
ALTER TABLE room_players ADD COLUMN ahq_user_id text;
ALTER TABLE room_players ADD COLUMN ahq_crew_id text;

-- Persistent player profiles that survive across sessions
CREATE TABLE IF NOT EXISTS player_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid REFERENCES players(id),
  ahq_user_id text UNIQUE,
  display_name text NOT NULL,
  total_games_played int DEFAULT 0,
  total_points_earned int DEFAULT 0,
  total_claims_made int DEFAULT 0,
  total_claims_won int DEFAULT 0,
  total_bullshit_calls int DEFAULT 0,
  total_bullshit_correct int DEFAULT 0,
  chaos_title text DEFAULT 'Chaos Rookie',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Session history for cross-night stats
CREATE TABLE IF NOT EXISTS session_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES rooms(id),
  player_profile_id uuid REFERENCES player_profiles(id),
  ahq_game_night_id text,
  ahq_crew_id text,
  nickname text NOT NULL,
  final_score int DEFAULT 0,
  final_rank int,
  highlights jsonb DEFAULT '[]',
  played_at timestamptz DEFAULT now()
);

CREATE INDEX idx_session_history_profile ON session_history(player_profile_id);
CREATE INDEX idx_session_history_crew ON session_history(ahq_crew_id);
CREATE INDEX idx_player_profiles_ahq ON player_profiles(ahq_user_id);

-- RLS for player_profiles
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own profile" ON player_profiles FOR SELECT
  USING (player_id = auth.uid());

-- RLS for session_history
ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own history" ON session_history FOR SELECT
  USING (player_profile_id IN (SELECT id FROM player_profiles WHERE player_id = auth.uid()));
