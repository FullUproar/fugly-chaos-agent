import { useCallback, useRef, useState } from 'react';

/**
 * Wraps an async handler to prevent double-taps.
 * Returns [wrappedHandler, isBusy].
 */
export function useDebouncePress(
  handler: (...args: any[]) => Promise<void>,
): [(...args: any[]) => Promise<void>, boolean] {
  const busyRef = useRef(false);
  const [, setTick] = useState(0);

  const wrapped = useCallback(
    async (...args: any[]) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setTick((t) => t + 1);
      try {
        await handler(...args);
      } finally {
        busyRef.current = false;
        setTick((t) => t + 1);
      }
    },
    [handler],
  );

  return [wrapped, busyRef.current];
}
