import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { api } from '../lib/api';
import { useSessionStore } from '../stores/session-store';
import { showToast } from '../components/Toast';
import { POLL_INTERVAL_MS, POLL_INTERVAL_PUSH_MS } from '@chaos-agent/shared';
import { isPushEnabled, setOnPushReceived } from '../lib/notifications';

const MAX_CONSECUTIVE_FAILURES = 3;
const AUTO_SCHEDULE_DEFAULT_SECONDS = 30;

export function usePolling(roomId: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Auto-schedule loop: checks if the server should fire an event
  const scheduleAutoCheck = useCallback(async () => {
    if (!roomId) return;
    try {
      const result = await api.autoSchedule({ room_id: roomId });
      const nextSeconds = result.next_check_seconds ?? AUTO_SCHEDULE_DEFAULT_SECONDS;
      // If an event was triggered, do an immediate room-state poll to pick it up
      if (result.triggered) {
        poll();
      }
      autoScheduleRef.current = setTimeout(scheduleAutoCheck, nextSeconds * 1000);
    } catch {
      // On failure, retry after default interval
      autoScheduleRef.current = setTimeout(scheduleAutoCheck, AUTO_SCHEDULE_DEFAULT_SECONDS * 1000);
    }
  }, [roomId, poll]);

  useEffect(() => {
    if (!roomId) return;

    const getInterval = () =>
      isPushEnabled() ? POLL_INTERVAL_PUSH_MS : POLL_INTERVAL_MS;

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(poll, getInterval());
    };

    const startAutoSchedule = () => {
      if (autoScheduleRef.current) clearTimeout(autoScheduleRef.current);
      // Start after an initial delay so the room has time to settle
      autoScheduleRef.current = setTimeout(scheduleAutoCheck, AUTO_SCHEDULE_DEFAULT_SECONDS * 1000);
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
    startAutoSchedule();

    // Pause polling when app is backgrounded
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        poll();
        startPolling();
        startAutoSchedule();
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (autoScheduleRef.current) {
          clearTimeout(autoScheduleRef.current);
          autoScheduleRef.current = null;
        }
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (autoScheduleRef.current) clearTimeout(autoScheduleRef.current);
      setOnPushReceived(null);
      sub.remove();
    };
  }, [roomId, poll, scheduleAutoCheck]);
}
