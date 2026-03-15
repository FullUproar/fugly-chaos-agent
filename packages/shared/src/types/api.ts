// Request/response shapes for edge function endpoints

import type {
  GameType,
  RoomSettings,
  SetupAnswers,
  Room,
  RoomPlayer,
  Mission,
  Claim,
  Vote,
  VoteType,
} from './database';

// POST /create-room
export interface CreateRoomRequest {
  game_type: GameType;
  game_name?: string;
  settings?: RoomSettings;
}
export interface CreateRoomResponse {
  room_id: string;
  code: string;
}

// POST /join-room
export interface JoinRoomRequest {
  code: string;
  nickname: string;
}
export interface JoinRoomResponse {
  room_id: string;
  room_player_id: string;
}

// GET /room-state?room_id=X
export interface RoomStateResponse {
  room: Room;
  players: RoomPlayer[];
  missions: Mission[]; // Only the requesting player's missions
  active_claims: ClaimWithContext[];
  scores: PlayerScore[];
}

export interface ClaimWithContext {
  claim: Claim;
  mission_title: string;
  mission_points: number;
  claimant_nickname: string;
  votes: Vote[];
  my_vote: VoteType | null;
}

export interface PlayerScore {
  room_player_id: string;
  nickname: string;
  score: number;
  claims_made: number;
  claims_won: number;
  claims_lost: number;
}

// POST /setup-complete
export interface SetupCompleteRequest {
  room_id: string;
  answers: SetupAnswers;
}
export interface SetupCompleteResponse {
  ready: boolean; // true if all players have submitted
  waiting_on: string[]; // nicknames of players who haven't submitted
}

// POST /claim-mission
export interface ClaimMissionRequest {
  mission_id: string;
}
export interface ClaimMissionResponse {
  claim_id: string;
  claimed_at: string;
}

// POST /vote-claim
export interface VoteClaimRequest {
  claim_id: string;
  vote: VoteType;
}
export interface VoteClaimResponse {
  resolved: boolean;
  claim_status?: Claim['status'];
  points_awarded?: number;
}

// POST /end-session
export interface EndSessionRequest {
  room_id: string;
}

// GET /session-highlights?room_id=X
export interface SessionHighlightsResponse {
  leaderboard: PlayerScore[];
  highlights: Highlight[];
  total_claims: number;
  total_bullshits: number;
  total_missions: number;
}

export interface Highlight {
  type: 'most_bullshitted' | 'biggest_bluffer' | 'most_points_single' | 'most_contested';
  player_nickname: string;
  description: string;
  value: number;
}

// Generic error response
export interface ApiError {
  error: string;
  code?: string;
}
