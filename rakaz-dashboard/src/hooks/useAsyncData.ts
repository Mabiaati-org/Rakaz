import { useEffect, useState } from 'react';

import { errorText } from '@/services/client';

export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []): {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loader()
      .then((value) => {
        if (cancelled) return;
        setData(value);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, error, loading, reload: () => setTick((n) => n + 1) };
}

/** Runs an action and reports its outcome as a notice the page can show. */
export function useAction(): {
  busy: boolean;
  notice: { kind: 'ok' | 'error'; text: string } | null;
  run: (action: () => Promise<string | void>) => Promise<boolean>;
  clear: () => void;
} {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const run = async (action: () => Promise<string | void>): Promise<boolean> => {
    setBusy(true);
    setNotice(null);
    try {
      const text = await action();
      if (text) setNotice({ kind: 'ok', text });
      return true;
    } catch (err) {
      setNotice({ kind: 'error', text: errorText(err) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, notice, run, clear: () => setNotice(null) };
}
