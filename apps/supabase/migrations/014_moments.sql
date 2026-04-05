-- ============================================================
-- Moments: captures memorable events during play for recap
-- ============================================================

CREATE TABLE IF NOT EXISTS moments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  moment_type text NOT NULL,
  description text NOT NULL,
  involved_player_ids uuid[] DEFAULT '{}',
  auto_captured boolean DEFAULT false,
  tick_minute int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_moments_room ON moments(room_id);
