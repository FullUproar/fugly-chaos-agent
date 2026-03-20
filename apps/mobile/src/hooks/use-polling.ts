import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { api } from '../lib/api';
import { useSessionStore } from '../stores/session-store';
import { showToast } from '../components/Toast';
import { POLL_INTERVAL_MS, POLL_INTERVAL_PUSH_MS } from '@chaos-agent/shared';
import { isPushEnabled, setOnPushReceived } from '../lib/notifications';

const MAX_CONSECUTIVE_FAILURES = 3;

export function usePolling(roomId: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failCountRef = useRef(0);
  const toastShownRef = useRef(false);
  const updateFromPoll = useSessionStore((s) => s.updateFromPoll);

  const poll = useCallback(async () => {
    if (!roomId) return;
    try {
      const state = await api.getRoomState(roomId);
      updateFromPoll(state);
      // Reset failure tracking on success
      if (failCountRef.current > 0) {
        failCountRef.current = 0;
        if (toastShownRef.current) {
          showToast('Reconnected!', 'info');
          toastShownRef.current = false;
        }
      }
    } catch {
      failCountRef.current += 1;
      if (failCountRef.current >= MAX_CONSECUTIVE_FAILURES && !toastShownRef.current) {
        showToast('Unable to connect. Retrying...');
        toastShownRef.current = true;
      }
    }
  }, [roomId, updateFromPoll]);

  useEffect(() => {
    if (!roomId) return;

    const getInterval = () =>
      isPushEnabled() ? POLL_INTERVAL_PUSH_MS : POLL_INTERVAL_MS;

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(poll, getInterval());
    };

    // Register push callback so incoming notifications trigger an immediate refresh
    setOnPushReceived(() => {
      poll();
      // Restart the interval timer so we don't double-poll
      startPolling();
    });

    // Poll immediately, then on interval
    poll();
    startPolling();

    // Pause polling when app is backgrounded
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        poll();
        startPolling();
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setOnPushReceived(null);
      sub.remove();
    };
  }, [roomId, poll]);
}
