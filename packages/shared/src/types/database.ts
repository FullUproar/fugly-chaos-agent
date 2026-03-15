// Types matching Supabase table rows

export type RoomStatus = 'LOBBY' | 'SETUP' | 'ACTIVE' | 'ENDED';
export type MissionStatus = 'HIDDEN' | 'REVEALED' | 'CLAIMED' | 'VERIFIED' | 'FAILED';
export type ClaimStatus = 'PENDING' | 'ACCEPTED' | 'CHALLENGED' | 'VOTE_PASSED' | 'VOTE_FAILED';
export type VoteType = 'ACCEPT' | 'BULLSHIT';
export type GameType = 'board_game' | 'party_game' | 'dinner_party' | 'house_party' | 'bar_night' | 'custom';

export interface Player {
  id: string;
  device_id: string;
  display_name: string | null;
  created_at: string;
}

export interface Room {
  id: string;
  code: string;
  host_id: string;
  game_type: GameType;
  game_name: string | null;
  status: RoomStatus;
  settings: RoomSettings;
  max_players: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface RoomSettings {
  intensity?: 1 | 2 | 3;
  physical_ok?: boolean;
  competitive_ok?: boolean;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  player_id: string;
  nickname: string;
  is_host: boolean;
  setup_answers: SetupAnswers | null;
  score: number;
  joined_at: string;
}

export interface SetupAnswers {
  chaos_comfort: 'chill' | 'moderate' | 'maximum';
  social_style: 'observer' | 'participant' | 'instigator';
  physical_ok: boolean;
  competitive_ok: boolean;
  wildcard: string;
}

export interface Mission {
  id: string;
  room_id: string;
  room_player_id: string;
  title: string;
  description: string;
  difficulty: number;
  points: number;
  category: MissionCategory;
  status: MissionStatus;
  ai_context: Record<string, unknown> | null;
  created_at: string;
}

export type MissionCategory = 'social' | 'performance' | 'sabotage' | 'alliance' | 'endurance' | 'meta';

export interface Claim {
  id: string;
  mission_id: string;
  room_player_id: string;
  status: ClaimStatus;
  claimed_at: string;
  resolved_at: string | null;
  points_awarded: number;
}

export interface Vote {
  id: string;
  claim_id: string;
  room_player_id: string;
  vote: VoteType;
  voted_at: string;
}
