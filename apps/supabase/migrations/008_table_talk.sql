-- ============================================================
-- Chaos Agent — Table Talk Chat System
-- ============================================================

-- Message type enum
create type message_type as enum ('chat', 'system', 'reaction');

-- Messages table
create table messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  sender_id uuid not null references room_players(id) on delete cascade,
  recipient_id uuid references room_players(id) on delete cascade, -- null = room-wide, set = DM
  content text not null check (char_length(content) <= 500),
  message_type message_type not null default 'chat',
  created_at timestamptz default now()
);

-- Index for efficient polling: room messages ordered by time
create index idx_messages_room_created on messages (room_id, created_at desc);

-- Index for DM lookups
create index idx_messages_recipient on messages (recipient_id) where recipient_id is not null;

-- ============================================================
-- RLS Policies
-- ============================================================

alter table messages enable row level security;

-- Players can only read messages in rooms they belong to
-- Room-wide messages (recipient_id is null) visible to all room members
-- DMs visible only to sender or recipient
create policy "Room members can read visible messages"
  on messages for select
  using (
    exists (
      select 1 from room_players rp
      where rp.room_id = messages.room_id
        and rp.player_id = auth.uid()
    )
    and (
      recipient_id is null
      or sender_id in (
        select rp.id from room_players rp
        where rp.player_id = auth.uid() and rp.room_id = messages.room_id
      )
      or recipient_id in (
        select rp.id from room_players rp
        where rp.player_id = auth.uid() and rp.room_id = messages.room_id
      )
    )
  );

-- Players can insert messages only as themselves in rooms they belong to
create policy "Room members can send messages"
  on messages for insert
  with check (
    sender_id in (
      select rp.id from room_players rp
      where rp.player_id = auth.uid() and rp.room_id = messages.room_id
    )
  );
