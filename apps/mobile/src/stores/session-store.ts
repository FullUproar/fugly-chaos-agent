import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Room,
  RoomPlayer,
  Mission,
  Signal,
  Poll,
  Message,
  RoomStateResponse,
  ClaimWithContext,
  PlayerScore,
} from '@chaos-agent/shared';

const SESSION_KEY = 'chaos_agent_session';

interface SessionState {
  // Identity
  playerId: string | null;
  roomPlayerId: string | null;
  roomId: string | null;
  nickname: string | null;
  isHost: boolean;

  // Room state
  room: Room | null;
  players: RoomPlayer[];
  standingMissions: Mission[];
  totalStandingCount: number;
  activeFlash: Mission | null;
  activePoll: (Poll & { votes?: Array<{ room_player_id: string; answer: string }> }) | null;
  myPollVote: string | null;
  recentSignals: Signal[];
  activeClaims: ClaimWithContext[];
  allClaims: ClaimWithContext[];
  scores: PlayerScore[];
  recentMessages: Message[];
  activeMiniGame: any | null;
  gameContext: {
    gameType: string;
    flashEnabled: boolean;
    autoBreakEnabled: boolean;
    autoBreakAfterMinutes: number;
    provocativePolls: boolean;
    flashPointMultiplier: number;
  } | null;

  // Local UI state
  flashDismissed: boolean;
  pollDismissed: boolean;
  miniGameDismissed: boolean;
  _lastFlashId: string | null;
  _lastPollId: string | null;
  _lastMiniGameId: string | null;

  // Actions
  setIdentity: (playerId: string, roomPlayerId: string, roomId: string, nickname: string, isHost: boolean) => void;
  updateFromPoll: (state: RoomStateResponse) => void;
  dismissFlash: () => void;
  dismissPoll: () => void;
  dismissMiniGame: () => void;
  reset: () => void;
}

const initialState = {
  playerId: null,
  roomPlayerId: null,
  roomId: null,
  nickname: null,
  isHost: false,
  room: null,
  players: [],
  standingMissions: [],
  totalStandingCount: 0,
  activeFlash: null,
  activePoll: null,
  myPollVote: null,
  recentSignals: [],
  activeClaims: [],
  allClaims: [],
  scores: [],
  recentMessages: [],
  activeMiniGame: null,
  gameContext: null,
  flashDismissed: false,
  pollDismissed: false,
  miniGameDismissed: false,
  _lastFlashId: null,
  _lastPollId: null,
  _lastMiniGameId: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  setIdentity: (playerId, roomPlayerId, roomId, nickname, isHost) => {
    set({ playerId, roomPlayerId, roomId, nickname, isHost });
    // Persist session for auto-rejoin
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
      playerId, roomPlayerId, roomId, nickname, isHost,
      code: null, // Will be set when room state comes in
    })).catch(() => {});
  },

  updateFromPoll: (state) => {
    const prev = get();
    const newFlashId = state.active_flash?.id ?? null;
    const newPollId = state.active_poll?.id ?? null;
    const newMiniGameId = state.active_mini_game?.game?.id ?? null;

    set({
      room: state.room,
      players: state.players,
      standingMissions: state.standing_missions,
      totalStandingCount: (state as any).total_standing_count ?? prev.totalStandingCount,
      activeFlash: state.active_flash,
      activePoll: state.active_poll,
      myPollVote: state.my_poll_vote,
      recentSignals: state.recent_signals,
      activeClaims: state.active_claims,
      allClaims: state.all_claims ?? [],
      scores: state.scores,
      recentMessages: state.recent_messages ?? [],
      activeMiniGame: state.active_mini_game ?? null,
      gameContext: state.game_context ?? prev.gameContext,
      // Reset dismissed state when a new flash/poll/mini-game arrives
      flashDismissed: newFlashId !== prev._lastFlashId ? false : prev.flashDismissed,
      pollDismissed: newPollId !== prev._lastPollId ? false : prev.pollDismissed,
      miniGameDismissed: newMiniGameId !== prev._lastMiniGameId ? false : prev.miniGameDismissed,
      _lastFlashId: newFlashId,
      _lastPollId: newPollId,
      _lastMiniGameId: newMiniGameId as string | null,
    });

    // Update persisted session with room code for rejoin
    if (state.room?.code) {
      const identity = get();
      AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
        playerId: identity.playerId,
        roomPlayerId: identity.roomPlayerId,
        roomId: identity.roomId,
        nickname: identity.nickname,
        isHost: identity.isHost,
        code: state.room.code,
      })).catch(() => {});
    }
  },

  dismissFlash: () => set({ flashDismissed: true }),
  dismissPoll: () => set({ pollDismissed: true }),
  dismissMiniGame: () => set({ miniGameDismissed: true }),

  reset: () => {
    set(initialState);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  },
}));
