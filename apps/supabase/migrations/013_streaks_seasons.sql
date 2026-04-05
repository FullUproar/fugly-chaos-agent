-- ============================================================
-- Streaks & Season/Episode Framing
-- Consecutive-week streaks + TV-style session numbering
-- ============================================================

-- Crew streaks (consecutive weeks with a session)
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS current_streak int DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS longest_streak int DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS last_session_week text; -- ISO week: "2026-W14"

-- Session numbering per crew
ALTER TABLE session_history ADD COLUMN IF NOT EXISTS season_number int DEFAULT 1;
ALTER TABLE session_history ADD COLUMN IF NOT EXISTS episode_number int DEFAULT 1;

-- Room tracking for streak/season
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS season_number int;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS episode_number int;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS crew_name text;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS streak_count int;
