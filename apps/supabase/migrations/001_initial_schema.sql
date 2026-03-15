-- ============================================================
-- Chaos Agent — Initial Schema
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type room_status as enum ('LOBBY', 'SETUP', 'ACTIVE', 'ENDED');
create type mission_status as enum ('HIDDEN', 'REVEALED', 'CLAIMED', 'VERIFIED', 'FAILED');
create type claim_status as enum ('PENDING', 'ACCEPTED', 'CHALLENGED', 'VOTE_PASSED', 'VOTE_FAILED');
create type vote_type as enum ('ACCEPT', 'BULLSHIT');
create type game_type as enum ('board_game', 'party_game', 'dinner_party', 'house_party', 'bar_night', 'custom');

-- ============================================================
-- TABLES
-- ============================================================

-- Players (anonymous auth — no email/password for MVP)
create table players (
  id uuid primary key default uuid_generate_v4(),
  device_id text unique not null,
  display_name text,
  created_at timestamptz default now()
);

-- Rooms
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  code char(6) unique not null,
  host_id uuid not null references players(id),
  game_type game_type not null default 'party_game',
  game_name text,
  status room_status not null default 'LOBBY',
  settings jsonb default '{}',
  max_players int default 12,
  created_at timestamptz default now(),
  started_at timestamptz,
  ended_at timestamptz
);

-- Room players (join table)
create table room_players (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id uuid not null references players(id),
  nickname text not null,
  is_host boolean default false,
  setup_answers jsonb,
  score int default 0,
  joined_at timestamptz default now(),
  unique(room_id, player_id)
);

-- Missions (AI-generated, private per player)
create table missions (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  room_player_id uuid not null references room_players(id) on delete cascade,
  title text not null,
  description text not null,
  difficulty int not null check (difficulty between 1 and 5),
  points int not null,
  category text,
  status mission_status not null default 'HIDDEN',
  ai_context jsonb,
  created_at timestamptz default now()
);

-- Claims (player says "I did it")
create table claims (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid not null references missions(id) on delete cascade,
  room_player_id uuid not null references room_players(id),
  status claim_status not null default 'PENDING',
  claimed_at timestamptz not null default now(),
  resolved_at timestamptz,
  points_awarded int default 0
);

-- Votes (other players respond to a claim)
create table votes (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid not null references claims(id) on delete cascade,
  room_player_id uuid not null references room_players(id),
  vote vote_type not null,
  voted_at timestamptz not null default now(),
  unique(claim_id, room_player_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_rooms_code on rooms(code);
create index idx_room_players_room on room_players(room_id);
create index idx_room_players_player on room_players(player_id);
create index idx_missions_room on missions(room_id);
create index idx_missions_room_player on missions(room_player_id);
create index idx_claims_mission on claims(mission_id);
create index idx_claims_status on claims(status);
create index idx_votes_claim on votes(claim_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Players: can read own record
alter table players enable row level security;
create policy "Players read own" on players for select
  using (id = auth.uid());

-- Rooms: members can read their rooms
alter table rooms enable row level security;
create policy "Room members can read" on rooms for select
  using (id in (select room_id from room_players where player_id = auth.uid()));

-- Room players: members see each other
alter table room_players enable row level security;
create policy "Room members see each other" on room_players for select
  using (room_id in (select room_id from room_players where player_id = auth.uid()));

-- Missions: player can ONLY see their own missions
alter table missions enable row level security;
create policy "Players see own missions" on missions for select
  using (room_player_id in (select id from room_players where player_id = auth.uid()));

-- Claims: all room members can see claims (needed for voting)
alter table claims enable row level security;
create policy "Room members see claims" on claims for select
  using (
    mission_id in (
      select m.id from missions m
      join room_players rp on rp.id = m.room_player_id
      where rp.room_id in (select room_id from room_players where player_id = auth.uid())
    )
  );

-- Votes: room members can see votes
alter table votes enable row level security;
create policy "Room members see votes" on votes for select
  using (
    claim_id in (
      select c.id from claims c
      join missions m on m.id = c.mission_id
      join room_players rp on rp.id = m.room_player_id
      where rp.room_id in (select room_id from room_players where player_id = auth.uid())
    )
  );
