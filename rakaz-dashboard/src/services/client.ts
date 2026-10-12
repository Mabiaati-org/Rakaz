import {
  createRakazClient,
  RakazApiError,
  rakazErrorText,
  resolveRakazApiUrl,
  type RakazStoredTokens,
} from '@rakaz/contract';

const REFRESH_KEY = 'rakaz.admin.refreshToken';
const sessionLostListeners = new Set<() => void>();

// Only the refresh token is written to disk; the access token stays in memory and is
// re-issued after a page reload.
let memoryAccessToken = '';

export const client = createRakazClient({
  baseUrl: resolveRakazApiUrl(import.meta.env.VITE_RAKAZ_API_URL ?? null),
  storage: {
    async load(): Promise<RakazStoredTokens | null> {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      return refreshToken ? { accessToken: memoryAccessToken, refreshToken } : null;
    },
    async save(tokens: RakazStoredTokens): Promise<void> {
      memoryAccessToken = tokens.accessToken;
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    },
    async clear(): Promise<void> {
      memoryAccessToken = '';
      localStorage.removeItem(REFRESH_KEY);
    },
  },
  onSessionLost: () => {
    for (const listener of sessionLostListeners) listener();
  },
});

export const api = client.request;
export const errorText = rakazErrorText;

export function hasStoredSession(): boolean {
  return localStorage.getItem(REFRESH_KEY) !== null;
}

/** Called when the session can no longer be renewed, so the UI can return to the sign-in page. */
export function onSessionLost(listener: () => void): () => void {
  sessionLostListeners.add(listener);
  return () => sessionLostListeners.delete(listener);
}

const RECONNECT_MS = 3000;

/**
 * Server-sent events over `fetch`, because `EventSource` cannot send an Authorization header.
 * Reconnects by itself until the returned function is called.
 */
export function openEventStream<T>(
  path: string,
  onData: (data: T) => void,
  onError?: (error: unknown) => void,
): () => void {
  const controller = new AbortController();
  let stopped = false;

  const run = async (): Promise<void> => {
    while (!stopped) {
      try {
        const response = await client.authorizedFetch(path, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
          timeoutMs: 0,
        });
        if (!response.ok || !response.body) throw new RakazApiError('تعذّر فتح البث الحي', response.status);

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const data = chunk
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trimStart())
              .join('\n');
            if (data) onData(JSON.parse(data) as T);
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        if (stopped) return;
        onError?.(error);
      }
      if (!stopped) await new Promise((resolve) => setTimeout(resolve, RECONNECT_MS));
    }
  };

  void run();
  return () => {
    stopped = true;
    controller.abort();
  };
}
