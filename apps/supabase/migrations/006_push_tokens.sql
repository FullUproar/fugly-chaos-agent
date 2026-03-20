-- Add push token column to room_players for Expo Push Notifications
ALTER TABLE room_players ADD COLUMN push_token text;

-- Index for efficient token lookups when broadcasting to a room
CREATE INDEX idx_room_players_push_token ON room_players (room_id) WHERE push_token IS NOT NULL;
