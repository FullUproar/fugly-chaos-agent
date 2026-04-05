import { supabase } from './supabase';
import { ensureAuth } from './auth';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RoomStateResponse,
  SetupCompleteRequest,
  SetupCompleteResponse,
  ClaimMissionRequest,
  ClaimMissionResponse,
  VoteClaimRequest,
  VoteClaimResponse,
  EndSessionRequest,
  SessionHighlightsResponse,
  TriggerEventRequest,
  TriggerEventResponse,
  SendSignalRequest,
  SendSignalResponse,
  SubmitPollVoteRequest,
  SubmitPollVoteResponse,
  CreateEventRequest,
  CreateEventResponse,
  InvitePlayerRequest,
  InvitePlayerResponse,
  RespondInviteRequest,
  RespondInviteResponse,
  EventStateResponse,
  StartIntermissionRequest,
  StartIntermissionResponse,
  EndIntermissionRequest,
  EndIntermissionResponse,
  PlayerStatsResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetMessagesRequest,
  GetMessagesResponse,
  NudgeVotersRequest,
  NudgeVotersResponse,
  LinkAHQAccountRequest,
  LinkAHQAccountResponse,
  SyncToAHQResponse,
  PlayerProfileResponse,
} from '@chaos-agent/shared';

async function invoke<T>(functionName: string, body?: Record<string, unknown>): Promise<T> {
  await ensureAuth();

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ?? {},
  });

  if (error) {
    const msg = typeof error === 'object' && 'message' in error
      ? error.message
      : String(error);
    throw new Error(msg ?? 'Request failed');
  }

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (parsed.error) throw new Error(parsed.error);
      return parsed as T;
    } catch {
      throw new Error(data);
    }
  }

  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error((data as { error: string }).error);
  }

  return data as T;
}

export const api = {
  createRoom: (req: CreateRoomRequest) =>
    invoke<CreateRoomResponse>('create-room', { ...req }),

  joinRoom: (req: JoinRoomRequest) =>
    invoke<JoinRoomResponse>('join-room', { ...req }),

  getRoomState: (roomId: string) =>
    invoke<RoomStateResponse>('room-state', { room_id: roomId }),

  submitSetup: (req: SetupCompleteRequest) =>
    invoke<SetupCompleteResponse>('setup-complete', { ...req }),

  claimMission: (req: ClaimMissionRequest) =>
    invoke<ClaimMissionResponse>('claim-mission', { ...req }),

  voteClaim: (req: VoteClaimRequest) =>
    invoke<VoteClaimResponse>('vote-claim', { ...req }),

  endSession: (req: EndSessionRequest) =>
    invoke<void>('end-session', { ...req }),

  getHighlights: (roomId: string) =>
    invoke<SessionHighlightsResponse>('session-highlights', { room_id: roomId }),

  // New endpoints
  triggerEvent: (req: TriggerEventRequest) =>
    invoke<TriggerEventResponse>('trigger-event', { ...req }),

  sendSignal: (req: SendSignalRequest) =>
    invoke<SendSignalResponse>('send-signal', { ...req }),

  submitPollVote: (req: SubmitPollVoteRequest) =>
    invoke<SubmitPollVoteResponse>('submit-poll-vote', { ...req }),

  // Event lifecycle
  createEvent: (req: CreateEventRequest) =>
    invoke<CreateEventResponse>('create-event', { ...req }),

  invitePlayer: (req: InvitePlayerRequest) =>
    invoke<InvitePlayerResponse>('invite-player', { ...req }),

  respondInvite: (req: RespondInviteRequest) =>
    invoke<RespondInviteResponse>('respond-invite', { ...req }),

  getEventState: (roomId: string) =>
    invoke<EventStateResponse>('event-state', { room_id: roomId }),

  startIntermission: (req: StartIntermissionRequest) =>
    invoke<StartIntermissionResponse>('start-intermission', { ...req }),

  endIntermission: (req: EndIntermissionRequest) =>
    invoke<EndIntermissionResponse>('end-intermission', { ...req }),

  getPlayerStats: () =>
    invoke<PlayerStatsResponse>('player-stats', {}),

  // Mini-games
  startMiniGame: (req: Record<string, unknown>) =>
    invoke<Record<string, unknown>>('mini-game', { action: 'start', ...req }),

  submitMiniGame: (miniGameId: string, content: string) =>
    invoke<{ submitted: boolean }>('mini-game', { action: 'submit', mini_game_id: miniGameId, content }),

  voteMiniGame: (miniGameId: string, submissionId: string) =>
    invoke<{ voted: boolean }>('mini-game', { action: 'vote', mini_game_id: miniGameId, submission_id: submissionId }),

  advanceMiniGame: (miniGameId: string) =>
    invoke<{ phase: string }>('mini-game', { action: 'advance', mini_game_id: miniGameId }),

  getMiniGameState: (roomId: string) =>
    invoke<Record<string, unknown>>('mini-game', { action: 'state', room_id: roomId }),

  // Table Talk
  sendMessage: (req: SendMessageRequest) =>
    invoke<SendMessageResponse>('send-message', { ...req }),

  getMessages: (req: GetMessagesRequest) =>
    invoke<GetMessagesResponse>('get-messages', { ...req }),

  // Photos
  uploadPhoto: (req: { room_id: string; photo: string; mission_id?: string; caption?: string }) =>
    invoke<{ photo_id: string; photo_url: string }>('upload-photo', { ...req }),

  getPhotos: (roomId: string) =>
    invoke<{ photos: Array<{ id: string; room_player_id: string; nickname: string; mission_id: string | null; caption: string | null; photo_url: string; created_at: string }> }>('get-photos', { room_id: roomId }),

  // Nudge voters
  nudgeVoters: (req: NudgeVotersRequest) =>
    invoke<NudgeVotersResponse>('nudge-voters', { ...req }),

  // Push notifications
  registerPushToken: (req: { room_id: string; push_token: string }) =>
    invoke<{ registered: boolean }>('register-push-token', { ...req }),

  // Afterroar HQ integration
  linkAHQAccount: (req: LinkAHQAccountRequest) =>
    invoke<LinkAHQAccountResponse>('link-ahq-account', { ...req }),

  syncToAHQ: (roomId: string) =>
    invoke<SyncToAHQResponse>('sync-to-ahq', { room_id: roomId }),

  getPlayerProfile: () =>
    invoke<PlayerProfileResponse>('get-player-profile', {}),

  // Teasers
  generateTeasers: (eventId: string, mode: 'static' | 'ai' = 'static') =>
    invoke<{ teasers_created: number; days_until_event: number; mode: string }>(
      'generate-teasers', { event_id: eventId, mode },
    ),

  getTeasers: (eventId: string) =>
    invoke<{
      teasers: Array<{ id: string; message: string; teaser_type: string; sent_at: string }>;
      days_until_event: number | null;
      scheduled_at: string | null;
    }>('get-teasers', { event_id: eventId }),

  // Auto-scheduler
  autoSchedule: (req: { room_id: string }) =>
    invoke<{
      triggered: boolean;
      event_type?: string;
      event_id?: string;
      next_check_seconds: number;
      reason?: string;
    }>('auto-schedule', { ...req }),
};
