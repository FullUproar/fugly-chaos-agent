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
};
