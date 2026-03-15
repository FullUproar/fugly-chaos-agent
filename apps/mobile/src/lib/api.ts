import { supabase } from './supabase';
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
  ApiError,
} from '@chaos-agent/shared';

async function invoke<T>(functionName: string, body?: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ?? {},
  });

  if (error) {
    throw new Error(error.message ?? 'Request failed');
  }

  return data as T;
}

export const api = {
  createRoom: (req: CreateRoomRequest) =>
    invoke<CreateRoomResponse>('create-room', req),

  joinRoom: (req: JoinRoomRequest) =>
    invoke<JoinRoomResponse>('join-room', req),

  getRoomState: (roomId: string) =>
    invoke<RoomStateResponse>('room-state', { room_id: roomId }),

  submitSetup: (req: SetupCompleteRequest) =>
    invoke<SetupCompleteResponse>('setup-complete', req),

  claimMission: (req: ClaimMissionRequest) =>
    invoke<ClaimMissionResponse>('claim-mission', req),

  voteClaim: (req: VoteClaimRequest) =>
    invoke<VoteClaimResponse>('vote-claim', req),

  endSession: (req: EndSessionRequest) =>
    invoke<void>('end-session', req),

  getHighlights: (roomId: string) =>
    invoke<SessionHighlightsResponse>('session-highlights', { room_id: roomId }),
};
