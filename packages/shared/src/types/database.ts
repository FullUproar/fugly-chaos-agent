// Types matching Supabase table rows

export type RoomStatus = 'INVITED' | 'LOBBY' | 'SETUP' | 'ACTIVE' | 'INTERMISSION' | 'ENDED';
export type MissionStatus = 'HIDDEN' | 'REVEALED' | 'CLAIMED' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
export type ClaimStatus = 'PENDING' | 'ACCEPTED' | 'CHALLENGED' | 'VOTE_PASSED' | 'VOTE_FAILED';
export type VoteType = 'ACCEPT' | 'BULLSHIT';
export type GameType = 'board_game' | 'party_game' | 'dinner_party' | 'house_party' | 'bar_night' | 'custom';

// New mission types
export type MissionType = 'standing' | 'flash';
export type FlashType = 'race' | 'target' | 'group';
export type MissionVisibility = 'all' | 'assigned';

// Social signals
export type SignalType = 'shake_it_up' | 'slow_your_roll' | 'target_player' | 'im_bored' | 'nudge';

// Polls
export type PollType = 'player_vote' | 'text_vote';
export type PollStatus = 'ACTIVE' | 'CLOSED';

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
  scheduled_at: string | null;
  description: string | null;
  invite_phase_enabled: boolean;
  slow_burn_enabled: boolean;
  intermission_duration_minutes: number;
  photo_challenges_enabled: boolean;
  ahq_game_night_id: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

// Event invite status
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface EventInvite {
  id: string;
  room_id: string;
  invited_by: string;
  player_id: string | null;
  invite_name: string | null;
  invite_contact: string | null;
  status: InviteStatus;
  pre_game_answers: PreGameAnswers;
  invite_token: string;
  invited_at: string;
  responded_at: string | null;
}

export interface PreGameAnswers {
  most_competitive?: string; // player nickname
  cracks_under_pressure?: string;
  most_likely_to_cheat?: string;
  secret_weakness?: string;
  custom_responses?: Record<string, string>;
}

export interface Teaser {
  id: string;
  room_id: string;
  message: string;
  teaser_type: 'generic' | 'personalized' | 'host_custom';
  target_player_id: string | null;
  sent_at: string;
}

export interface PlayerStats {
  id: string;
  player_id: string;
  total_games: number;
  total_points: number;
  total_claims: number;
  total_claims_won: number;
  total_claims_lost: number;
  total_bullshit_calls: number;
  total_bullshit_correct: number;
  current_streak: number;
  longest_streak: number;
  last_played_at: string | null;
  updated_at: string;
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
  room_player_id: string | null; // null for standing missions
  title: string;
  description: string;
  difficulty: number;
  points: number;
  category: MissionCategory;
  status: MissionStatus;
  type: MissionType;
  flash_type: FlashType | null;
  expires_at: string | null; // ISO timestamp, null for standing
  visible_to: MissionVisibility;
  target_player_id: string | null; // for flash target missions
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

export interface Signal {
  id: string;
  room_id: string;
  room_player_id: string;
  signal_type: SignalType;
  target_player_id: string | null;
  created_at: string;
}

export interface Poll {
  id: string;
  room_id: string;
  question: string;
  poll_type: PollType;
  options: string[];
  status: PollStatus;
  expires_at: string;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  room_player_id: string;
  answer: string;
  voted_at: string;
}

// Mini-games
export type MiniGameType = 'drawing' | 'caption' | 'hot_take' | 'lie_detector';
export type MiniGameStatus = 'PROMPTING' | 'SUBMITTING' | 'VOTING' | 'RESULTS' | 'CLOSED';

export interface MiniGame {
  id: string;
  room_id: string;
  game_type: MiniGameType;
  prompt: string;
  status: MiniGameStatus;
  points: number;
  phase_ends_at: string | null;
  winner_room_player_id: string | null;
  created_at: string;
}

export interface MiniGameSubmission {
  id: string;
  mini_game_id: string;
  room_player_id: string;
  content: string; // JSON for drawings, text for captions, 'true'/'false' for hot takes
  submitted_at: string;
}

export interface MiniGameVote {
  id: string;
  mini_game_id: string;
  room_player_id: string;
  voted_for_submission_id: string;
  voted_at: string;
}

// Table Talk messages
export type MessageType = 'chat' | 'system' | 'reaction';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string; // room_player_id
  recipient_id: string | null; // null = room-wide, set = DM
  content: string;
  message_type: MessageType;
  created_at: string;
}
