import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { api } from '../lib/api';
import { useSessionStore } from '../stores/session-store';
import { POLL_INTERVAL_MS } from '@chaos-agent/shared';

export function usePolling(roomId: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateFromPoll = useSessionStore((s) => s.updateFromPoll);

  useEffect(() => {
    if (!roomId) return;

    const poll = async () => {
      try {
        const state = await api.getRoomState(roomId);
        updateFromPoll(state);
      } catch {
        // Silently retry on next interval
      }
    };

    // Poll immediately, then on interval
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    // Pause polling when app is backgrounded
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        poll();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
        }
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [roomId, updateFromPoll]);
}
