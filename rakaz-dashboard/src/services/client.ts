import {
  RakazHttpPaths,
  resolveRakazApiUrl,
  type ApiFailure,
  type ApiFieldError,
  type ApiResponse,
  type RakazAuthSession,
  type RakazErrorCode,
} from '@rakaz/contract';

const REFRESH_KEY = 'rakaz.admin.refreshToken';
const API_URL = resolveRakazApiUrl(import.meta.env.VITE_RAKAZ_API_URL ?? null);

// The access token lives in memory only; the refresh token survives a page reload.
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
const sessionLostListeners = new Set<() => void>();

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: RakazErrorCode,
    readonly errors: ApiFieldError[] = [],
  ) {
    super(message);
  }

  /** The most specific message to show the user. */
  get display(): string {
    return this.errors[0]?.message ?? this.message;
  }
}

export function errorText(error: unknown): string {
  if (error instanceof ApiRequestError) return error.display;
  if (error instanceof TypeError) return 'تعذّر الاتصال بالخادم. تحقق من الشبكة وحاول مجدداً.';
  return error instanceof Error ? error.message : String(error);
}

export function apiBaseUrl(): string {
  return API_URL;
}

export function hasStoredSession(): boolean {
  return localStorage.getItem(REFRESH_KEY) !== null;
}

export function storeSession(session: RakazAuthSession): void {
  accessToken = session.accessToken;
  localStorage.setItem(REFRESH_KEY, session.refreshToken);
}

export function currentRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function clearSession(): void {
  accessToken = null;
  localStorage.removeItem(REFRESH_KEY);
}

/** Called when the session can no longer be renewed, so the UI can return to the sign-in page. */
export function onSessionLost(listener: () => void): () => void {
  sessionLostListeners.add(listener);
  return () => sessionLostListeners.delete(listener);
}

async function parseFailure(response: Response): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as ApiFailure;
    return new ApiRequestError(body.message, response.status, body.code, body.errors ?? []);
  } catch {
    return new ApiRequestError('حدث خطأ غير متوقع', response.status);
  }
}

/** Exchanges the refresh token for a new session. Concurrent callers share one request. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = currentRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_URL}${RakazHttpPaths.auth.refresh}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        // Only a definite rejection ends the session; a 5xx may be temporary.
        if (response.status === 401) clearSession();
        return false;
      }
      const body = (await response.json()) as ApiResponse<RakazAuthSession>;
      if (!body.success) return false;
      storeSession(body.data);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** `fetch` with the bearer token attached and one transparent renewal when it has expired. */
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = (): Promise<Response> =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });

  if (!accessToken && currentRefreshToken()) await refreshSession();
  let response = await send();
  if (response.status === 401 && currentRefreshToken()) {
    if (await refreshSession()) response = await send();
  }
  if (response.status === 401 && !currentRefreshToken()) {
    for (const listener of sessionLostListeners) listener();
  }
  return response;
}

async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseFailure(response);
  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success) throw new ApiRequestError(body.message, body.statusCode, body.code, body.errors);
  return body.data;
}

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await authorizedFetch(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return unwrap<T>(response);
}

/** For the sign-in endpoints, which must not send or renew a token. */
export async function publicApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return unwrap<T>(response);
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
        const response = await authorizedFetch(path, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
        });
        if (!response.ok || !response.body) throw await parseFailure(response);

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
