import { create } from 'zustand';
import type {
  Room,
  RoomPlayer,
  Mission,
  RoomStateResponse,
  ClaimWithContext,
  PlayerScore,
} from '@chaos-agent/shared';

interface SessionState {
  // Identity
  playerId: string | null;
  roomPlayerId: string | null;
  nickname: string | null;
  isHost: boolean;

  // Room state
  room: Room | null;
  players: RoomPlayer[];
  missions: Mission[];
  activeClaims: ClaimWithContext[];
  scores: PlayerScore[];

  // Actions
  setIdentity: (playerId: string, roomPlayerId: string, nickname: string, isHost: boolean) => void;
  updateFromPoll: (state: RoomStateResponse) => void;
  reset: () => void;
}

const initialState = {
  playerId: null,
  roomPlayerId: null,
  nickname: null,
  isHost: false,
  room: null,
  players: [],
  missions: [],
  activeClaims: [],
  scores: [],
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setIdentity: (playerId, roomPlayerId, nickname, isHost) =>
    set({ playerId, roomPlayerId, nickname, isHost }),

  updateFromPoll: (state) =>
    set({
      room: state.room,
      players: state.players,
      missions: state.missions,
      activeClaims: state.active_claims,
      scores: state.scores,
    }),

  reset: () => set(initialState),
}));
