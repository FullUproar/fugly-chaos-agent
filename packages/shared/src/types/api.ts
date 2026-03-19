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
  EventInvite,
  PreGameAnswers,
  Teaser,
  PlayerStats,
  InviteStatus,
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

// POST /create-event
export interface CreateEventRequest {
  game_type: GameType;
  game_name?: string;
  nickname: string;
  scheduled_at: string; // ISO timestamp
  description?: string;
  slow_burn_enabled?: boolean;
  photo_challenges_enabled?: boolean;
}
export interface CreateEventResponse {
  room_id: string;
  code: string;
  room_player_id: string;
  invite_token: string; // shareable token for the event
}

// POST /invite-player
export interface InvitePlayerRequest {
  room_id: string;
  invite_name: string;
  invite_contact?: string; // phone or email
}
export interface InvitePlayerResponse {
  invite_id: string;
  invite_token: string;
  invite_link: string;
}

// POST /respond-invite
export interface RespondInviteRequest {
  invite_token: string;
  status: 'ACCEPTED' | 'DECLINED';
  nickname?: string;
  pre_game_answers?: PreGameAnswers;
}
export interface RespondInviteResponse {
  room_id: string;
  room_player_id?: string; // only if accepted
  code: string;
}

// POST /event-state (extended room-state for invited events)
export interface EventStateResponse {
  room: Room;
  invites: EventInvite[];
  teasers: Teaser[];
  accepted_count: number;
  declined_count: number;
  pending_count: number;
}

// POST /send-teaser
export interface SendTeaserRequest {
  room_id: string;
  message?: string; // custom message, or auto-generate if omitted
  target_player_id?: string; // null = send to all
}
export interface SendTeaserResponse {
  teaser_id: string;
  message: string;
}

// POST /start-intermission
export interface StartIntermissionRequest {
  room_id: string;
  duration_minutes?: number;
}
export interface StartIntermissionResponse {
  intermission_ends_at: string;
  halftime_stats: HalftimeStats;
}
export interface HalftimeStats {
  leader: { nickname: string; score: number };
  total_claims: number;
  total_bullshits: number;
  funniest_moment?: string;
  missions_completed: number;
  missions_remaining: number;
}

// POST /end-intermission
export interface EndIntermissionRequest {
  room_id: string;
}
export interface EndIntermissionResponse {
  new_missions_count: number;
}

// GET /player-stats
export interface PlayerStatsResponse {
  stats: PlayerStats;
  recent_games: RecentGame[];
}
export interface RecentGame {
  room_id: string;
  game_type: GameType;
  played_at: string;
  final_score: number;
  final_rank: number;
  player_count: number;
}

// Generic error response
export interface ApiError {
  error: string;
  code?: string;
}
