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
};
