import { useCallback, useRef, useState } from 'react';

import { rakazErrorText } from '@rakaz/contract';

import { Haptics } from '@/utils/haptics';

/**
 * Runs a request and tracks its outcome for a form: `busy` while it is in flight and `error`
 * (Arabic, ready to show) when it failed. `run` resolves to whether it succeeded.
 */
export function useSubmit(): { busy: boolean; error: string | null; run: (task: () => Promise<void>) => Promise<boolean> } {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(async (task: () => Promise<void>): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await task();
      return true;
    } catch (err) {
      Haptics.error();
      setError(rakazErrorText(err));
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, error, run };
}
