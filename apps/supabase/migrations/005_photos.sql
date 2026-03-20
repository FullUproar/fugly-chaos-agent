-- Migration 005: Photo challenges
-- NOTE: rooms.photo_challenges_enabled already exists from migration 003

-- 1. Photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  room_player_id uuid NOT NULL REFERENCES room_players(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  caption text,
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_photos_room ON photos(room_id);
CREATE INDEX IF NOT EXISTS idx_photos_room_player ON photos(room_player_id);
CREATE INDEX IF NOT EXISTS idx_photos_mission ON photos(mission_id) WHERE mission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(room_id, created_at DESC);

-- 4. RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view photos in their room" ON photos
  FOR SELECT USING (
    room_id IN (SELECT room_id FROM room_players WHERE player_id = auth.uid())
  );

CREATE POLICY "Players can insert photos in their room" ON photos
  FOR INSERT WITH CHECK (
    room_player_id IN (SELECT id FROM room_players WHERE player_id = auth.uid())
  );

-- 5. Storage bucket (run via Supabase dashboard or seed script)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chaos-photos', 'chaos-photos', true)
-- ON CONFLICT (id) DO NOTHING;
