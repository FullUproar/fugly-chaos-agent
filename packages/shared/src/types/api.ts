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
  Message,
  MessageType,
} from './database';

// POST /create-room
export interface CreateRoomRequest {
  game_type: GameType;
  game_name?: string;
  room_name?: string;
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
  recent_messages: Message[];
  active_mini_game: {
    session: Record<string, unknown>;
    my_submission: Record<string, unknown> | null;
    submissions: Array<Record<string, unknown>> | null;
  } | null;
  game_context?: {
    gameType: string;
    flashEnabled: boolean;
    autoBreakEnabled: boolean;
    autoBreakAfterMinutes: number;
    provocativePolls: boolean;
    flashPointMultiplier: number;
  };
}

export interface ClaimWithContext {
  claim: Claim;
  mission_title: string;
  mission_description?: string;
  mission_points: number;
  claimant_nickname: string;
  votes: Vote[];
  my_vote: VoteType | null;
  voting_mechanic: string;
  mechanic_data: Record<string, any>;
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
  mechanic?: { id: string; name: string; description: string; reveal_text: string; data: Record<string, any> };
}

// POST /vote-claim
export interface VoteClaimRequest {
  claim_id: string;
  vote: VoteType;
  action?: 'vote' | 'pitch' | 'volunteer' | 'bid' | 'bribe_offer' | 'alibi_story' | 'hot_seat_answer' | 'rate';
  amount?: number;
  text?: string;
  rating?: number;
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
  event_type: 'flash_mission' | 'poll' | 'mini_game';
  flash_type?: FlashType;
  compress_timers?: boolean;
  mini_game_type?: 'drawing' | 'caption' | 'hot_take' | 'lie_detector';
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

// POST /mini-game (action: start | submit | vote | advance | state)
export interface MiniGameStartRequest {
  action: 'start';
  room_id: string;
  game_type: 'drawing' | 'caption' | 'hot_take' | 'lie_detector';
  prompt: string;
  points?: number;
  submission_time_sec?: number;
  voting_time_sec?: number;
  target_player_id?: string;
}
export interface MiniGameSubmitRequest {
  action: 'submit';
  mini_game_id: string;
  content: string;
}
export interface MiniGameVoteRequest {
  action: 'vote';
  mini_game_id: string;
  submission_id: string;
}
export interface MiniGameAdvanceRequest {
  action: 'advance';
  mini_game_id: string;
}
export interface MiniGameStateRequest {
  action: 'state';
  room_id: string;
}
export interface MiniGameStateResponse {
  active: boolean;
  game?: {
    id: string;
    game_type: string;
    prompt: string;
    status: string;
    points: number;
    phase_ends_at: string | null;
    winner_nickname: string | null;
  };
  submissions?: Array<{ id: string; content: string; room_player_id?: string }>;
  submission_nicknames?: Record<string, string>;
  votes?: Array<{ room_player_id: string; voted_for_submission_id: string }>;
  my_submission?: string | null;
  my_vote?: string | null;
}

// POST /send-message
export interface SendMessageRequest {
  room_id: string;
  content: string;
  recipient_id?: string; // null/omitted = room-wide, set = DM
  message_type?: MessageType;
}
export interface SendMessageResponse {
  message_id: string;
  created_at: string;
}

// POST /get-messages
export interface GetMessagesRequest {
  room_id: string;
  since?: string; // ISO timestamp — only messages after this
  limit?: number; // max 100, default 50
}
export interface GetMessagesResponse {
  messages: Message[];
}

// POST /nudge-voters
export interface NudgeVotersRequest {
  claim_id: string;
}
export interface NudgeVotersResponse {
  nudge_id: string;
  message: string;
  tier: number;
  cooldown_remaining: number;
}

// POST /link-ahq-account
export interface LinkAHQAccountRequest {
  ahq_token: string;
  room_player_id?: string;
}
export interface LinkAHQAccountResponse {
  linked: boolean;
  display_name: string;
  chaos_title: string;
  crews: Array<{ id: string; name: string }>;
}

// POST /sync-to-ahq
export interface SyncToAHQRequest {
  room_id: string;
}
export interface SyncToAHQResponse {
  synced_players: number;
  session_history_ids: string[];
}

// POST /get-player-profile
export interface PlayerProfileResponse {
  profile: {
    id: string;
    ahq_user_id: string;
    display_name: string;
    chaos_title: string;
    total_games_played: number;
    total_points_earned: number;
    total_claims_made: number;
    total_claims_won: number;
    total_bullshit_calls: number;
    total_bullshit_correct: number;
    win_rate: number;
    bs_accuracy: number;
    claim_success_rate: number;
  } | null;
  recent_sessions: Array<{
    id: string;
    room_id: string;
    nickname: string;
    final_score: number;
    final_rank: number;
    highlights: Array<{ type: string; description: string }>;
    played_at: string;
    ahq_crew_id: string | null;
    ahq_game_night_id: string | null;
  }>;
}

// POST /generate-teasers
export interface GenerateTeasersRequest {
  event_id: string;
  mode?: 'static' | 'ai';
}
export interface GenerateTeasersResponse {
  teasers_created: number;
  days_until_event: number;
  mode: string;
}

// POST /get-teasers
export interface GetTeasersRequest {
  event_id: string;
}
export interface GetTeasersResponse {
  teasers: Array<{
    id: string;
    message: string;
    teaser_type: string;
    target_player_id: string | null;
    sent_at: string;
  }>;
  days_until_event: number | null;
  scheduled_at: string | null;
}

// Generic error response
export interface ApiError {
  error: string;
  code?: string;
}
