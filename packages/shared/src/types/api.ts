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
  Signal,
  Poll,
  FlashType,
  SignalType,
} from './database';

// POST /create-room
export interface CreateRoomRequest {
  game_type: GameType;
  game_name?: string;
  nickname?: string;
  settings?: RoomSettings;
}
export interface CreateRoomResponse {
  room_id: string;
  code: string;
  room_player_id: string;
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

// POST /room-state
export interface RoomStateResponse {
  room: Room;
  players: RoomPlayer[];
  standing_missions: Mission[];
  active_flash: Mission | null;
  active_poll: (Poll & { votes?: Array<{ room_player_id: string; answer: string }> }) | null;
  my_poll_vote: string | null;
  recent_signals: Signal[];
  active_claims: ClaimWithContext[];
  all_claims: ClaimWithContext[];
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
  ready: boolean;
  waiting_on: string[];
}

// POST /claim-mission
export interface ClaimMissionRequest {
  mission_id: string;
  evidence?: string;
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

// POST /session-highlights
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

// POST /trigger-event (dev backdoor)
export interface TriggerEventRequest {
  room_id: string;
  event_type: 'flash_mission' | 'poll';
  flash_type?: FlashType;
  compress_timers?: boolean;
}
export interface TriggerEventResponse {
  event_id: string;
  type: string;
}

// POST /send-signal
export interface SendSignalRequest {
  room_id: string;
  signal_type: SignalType;
  target_player_id?: string;
}
export interface SendSignalResponse {
  signal_id: string;
  points_awarded: number;
}

// POST /submit-poll-vote
export interface SubmitPollVoteRequest {
  poll_id: string;
  answer: string;
}
export interface SubmitPollVoteResponse {
  recorded: boolean;
}

// Generic error response
export interface ApiError {
  error: string;
  code?: string;
}
