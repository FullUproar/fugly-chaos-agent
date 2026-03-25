-- Mini-game variations: store selected variation and metadata per session
ALTER TABLE mini_games ADD COLUMN IF NOT EXISTS variation text DEFAULT 'standard';
ALTER TABLE mini_games ADD COLUMN IF NOT EXISTS variation_data jsonb DEFAULT '{}';
