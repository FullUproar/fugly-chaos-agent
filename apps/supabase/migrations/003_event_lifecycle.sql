-- Migration 003: Event lifecycle expansion
-- Adds INVITED/INTERMISSION room statuses, event invites, teasers, session persistence

-- 1. Extend room status enum
ALTER TYPE room_status ADD VALUE IF NOT EXISTS 'INVITED' BEFORE 'LOBBY';
ALTER TYPE room_status ADD VALUE IF NOT EXISTS 'INTERMISSION' AFTER 'ACTIVE';

-- 2. Add event planning columns to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS invite_phase_enabled boolean DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS slow_burn_enabled boolean DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS intermission_duration_minutes integer DEFAULT 5;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS photo_challenges_enabled boolean DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS ahq_game_night_id text; -- link to Afterroar HQ

-- 3. Event invites table
CREATE TABLE IF NOT EXISTS event_invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES players(id),
  -- Invitee can be a known player or just a name/contact
  player_id uuid REFERENCES players(id),
  invite_name text, -- display name for unregistered invitees
  invite_contact text, -- phone/email for sending invite
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  pre_game_answers jsonb DEFAULT '{}',
  invite_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(room_id, player_id)
);

-- 4. Teasers table (slow-burn pre-event messages)
CREATE TABLE IF NOT EXISTS teasers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  message text NOT NULL,
  teaser_type text NOT NULL DEFAULT 'generic' CHECK (teaser_type IN ('generic', 'personalized', 'host_custom')),
  target_player_id uuid REFERENCES players(id), -- null = sent to all
  sent_at timestamptz DEFAULT now()
);

-- 5. Player stats table (cross-session persistence)
CREATE TABLE IF NOT EXISTS player_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  total_games integer DEFAULT 0,
  total_points integer DEFAULT 0,
  total_claims integer DEFAULT 0,
  total_claims_won integer DEFAULT 0,
  total_claims_lost integer DEFAULT 0,
  total_bullshit_calls integer DEFAULT 0,
  total_bullshit_correct integer DEFAULT 0,
  current_streak integer DEFAULT 0, -- consecutive games
  longest_streak integer DEFAULT 0,
  last_played_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(player_id)
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_event_invites_room ON event_invites(room_id);
CREATE INDEX IF NOT EXISTS idx_event_invites_token ON event_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_event_invites_player ON event_invites(player_id);
CREATE INDEX IF NOT EXISTS idx_teasers_room ON teasers(room_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_rooms_scheduled ON rooms(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- 7. RLS policies for event_invites
ALTER TABLE event_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE teasers ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read invites for rooms they're in
CREATE POLICY "Users can view invites for their rooms" ON event_invites
  FOR SELECT USING (
    player_id = auth.uid() OR
    room_id IN (SELECT room_id FROM room_players WHERE player_id = auth.uid())
  );

-- Allow host to manage invites
CREATE POLICY "Host can manage invites" ON event_invites
  FOR ALL USING (
    room_id IN (SELECT id FROM rooms WHERE host_id = auth.uid())
  );

-- Players can read their own stats
CREATE POLICY "Users can view own stats" ON player_stats
  FOR SELECT USING (player_id = auth.uid());
