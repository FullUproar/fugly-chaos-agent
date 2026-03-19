-- ============================================================
-- Chaos Agent — Mission System Refactor
-- Standing missions + Flash missions + Signals + Polls
-- ============================================================

-- ============================================================
-- NEW ENUMS
-- ============================================================
CREATE TYPE mission_type AS ENUM ('standing', 'flash');
CREATE TYPE flash_type AS ENUM ('race', 'target', 'group');
CREATE TYPE mission_visibility AS ENUM ('all', 'assigned');
CREATE TYPE signal_type AS ENUM ('shake_it_up', 'slow_your_roll', 'target_player', 'im_bored');
CREATE TYPE poll_type AS ENUM ('player_vote', 'text_vote');
CREATE TYPE poll_status AS ENUM ('ACTIVE', 'CLOSED');

-- Add EXPIRED to mission_status
ALTER TYPE mission_status ADD VALUE 'EXPIRED';

-- ============================================================
-- ALTER MISSIONS TABLE
-- ============================================================

-- Make room_player_id nullable (standing missions have no owner)
ALTER TABLE missions ALTER COLUMN room_player_id DROP NOT NULL;

-- Add new columns
ALTER TABLE missions
  ADD COLUMN type mission_type NOT NULL DEFAULT 'standing',
  ADD COLUMN flash_type flash_type,
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN visible_to mission_visibility NOT NULL DEFAULT 'all',
  ADD COLUMN target_player_id uuid REFERENCES room_players(id);

-- ============================================================
-- NEW TABLES
-- ============================================================

-- Social signals
CREATE TABLE signals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  room_player_id uuid NOT NULL REFERENCES room_players(id),
  signal_type signal_type NOT NULL,
  target_player_id uuid REFERENCES room_players(id),
  created_at timestamptz DEFAULT now()
);

-- Mid-game polls
CREATE TABLE polls (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  question text NOT NULL,
  poll_type poll_type NOT NULL DEFAULT 'player_vote',
  options jsonb NOT NULL DEFAULT '[]',
  status poll_status NOT NULL DEFAULT 'ACTIVE',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Poll votes
CREATE TABLE poll_votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  room_player_id uuid NOT NULL REFERENCES room_players(id),
  answer text NOT NULL,
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, room_player_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_missions_type ON missions(type);
CREATE INDEX idx_missions_expires ON missions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_signals_room ON signals(room_id);
CREATE INDEX idx_signals_created ON signals(created_at);
CREATE INDEX idx_polls_room ON polls(room_id);
CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);

-- ============================================================
-- UPDATE RLS POLICIES
-- ============================================================

-- Missions: update policy to allow seeing standing/flash missions visible to all
DROP POLICY "Players see own missions" ON missions;
CREATE POLICY "Players see visible missions" ON missions FOR SELECT
  USING (
    (visible_to = 'all' AND room_id IN (SELECT room_id FROM room_players WHERE player_id = auth.uid()))
    OR
    (room_player_id IN (SELECT id FROM room_players WHERE player_id = auth.uid()))
  );

-- Claims: update to handle missions with null room_player_id
DROP POLICY "Room members see claims" ON claims;
CREATE POLICY "Room members see claims" ON claims FOR SELECT
  USING (
    mission_id IN (
      SELECT m.id FROM missions m
      WHERE m.room_id IN (SELECT room_id FROM room_players WHERE player_id = auth.uid())
    )
  );

-- Votes: update similarly
DROP POLICY "Room members see votes" ON votes;
CREATE POLICY "Room members see votes" ON votes FOR SELECT
  USING (
    claim_id IN (
      SELECT c.id FROM claims c
      JOIN missions m ON m.id = c.mission_id
      WHERE m.room_id IN (SELECT room_id FROM room_players WHERE player_id = auth.uid())
    )
  );

-- Signals: room members can see
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room members see signals" ON signals FOR SELECT
  USING (room_id IN (SELECT room_id FROM room_players WHERE player_id = auth.uid()));

-- Polls: room members can see
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room members see polls" ON polls FOR SELECT
  USING (room_id IN (SELECT room_id FROM room_players WHERE player_id = auth.uid()));

-- Poll votes: room members can see
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room members see poll votes" ON poll_votes FOR SELECT
  USING (
    poll_id IN (
      SELECT p.id FROM polls p
      WHERE p.room_id IN (SELECT room_id FROM room_players WHERE player_id = auth.uid())
    )
  );
