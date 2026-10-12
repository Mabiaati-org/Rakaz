import type {
  RakazAuthSession,
  RakazAuthUser,
  RakazDeviceRegistration,
} from './auth';
import type { ApiFailure, ApiFieldError, ApiPageMeta, ApiResponse, RakazErrorCode } from './envelope';
import type { RakazNotificationPreferences, RakazParentNotification } from './events';
import { RakazHttpPaths } from './http';
import type { RakazSupportContact } from './parent';

export interface RakazStoredTokens {
  accessToken: string;
  refreshToken: string;
}

/** Where a client keeps its session between launches (Keychain / Keystore on phones, localStorage on the web). */
export interface RakazTokenStorage {
  load(): Promise<RakazStoredTokens | null>;
  save(tokens: RakazStoredTokens): Promise<void>;
  clear(): Promise<void>;
}

/** A failed API call. `status` is 0 when the server could not be reached at all. */
export class RakazApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: RakazErrorCode,
    readonly errors: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = 'RakazApiError';
  }

  /** True when the request never got an answer (offline, DNS, timeout). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** The most specific message to show the user. */
  get display(): string {
    return this.errors[0]?.message ?? this.message;
  }
}

/** Arabic text for any thrown value, for showing in the UI. */
export function rakazErrorText(error: unknown): string {
  if (error instanceof RakazApiError) return error.display;
  return error instanceof Error ? error.message : String(error);
}

export interface RakazClientOptions {
  baseUrl: string;
  storage: RakazTokenStorage;
  /** Abort a request that takes longer than this. Streams opt out per call. Default 15s. */
  timeoutMs?: number;
  /** Called once the session can no longer be renewed, so the app can return to sign-in. */
  onSessionLost?: () => void;
}

export interface RakazFetchInit {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Set to 0 for long-lived responses such as event streams. */
  timeoutMs?: number;
}

export interface RakazClient {
  readonly baseUrl: string;
  /** Authenticated JSON call; returns the envelope's `data`. */
  request<T>(path: string, method?: string, body?: unknown): Promise<T>;
  /** Like `request`, but also returns pagination `meta`. */
  requestPage<T>(path: string): Promise<{ items: T[]; meta: ApiPageMeta | undefined }>;
  /** Authenticated `fetch` for callers that read the raw response (streams). */
  authorizedFetch(path: string, init?: RakazFetchInit): Promise<Response>;
  hasSession(): Promise<boolean>;
  login(phone: string, password: string): Promise<RakazAuthSession>;
  /** Ends the session on the server (best effort) and forgets it locally. */
  logout(): Promise<void>;
  /** Forgets the session locally without contacting the server. */
  dropSession(): Promise<void>;
  me(): Promise<RakazAuthUser>;
  changePassword(currentPassword: string, newPassword: string): Promise<RakazAuthSession>;
  deleteAccount(password: string): Promise<void>;
  ping(): Promise<boolean>;
  /** Contact details and the privacy policy link; works without a session. Null when unreachable. */
  publicSettings(): Promise<RakazSupportContact | null>;
  notifications: {
    list(page?: number, limit?: number): Promise<RakazParentNotification[]>;
    markRead(id: string): Promise<void>;
    markAllRead(): Promise<void>;
    remove(id: string): Promise<void>;
    getPreferences(): Promise<RakazNotificationPreferences>;
    savePreferences(preferences: RakazNotificationPreferences): Promise<RakazNotificationPreferences>;
    registerDevice(device: RakazDeviceRegistration): Promise<void>;
    unregisterDevice(token: string): Promise<void>;
  };
}

const NETWORK_MESSAGE = 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.';
const DEFAULT_TIMEOUT_MS = 15_000;

/** One HTTP client for the dashboard and both mobile apps: bearer auth, silent renewal, envelope unwrapping. */
export function createRakazClient(options: RakazClientOptions): RakazClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const defaultTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const P = RakazHttpPaths;

  let tokens: RakazStoredTokens | null | undefined; // undefined = not read from storage yet
  let refreshing: Promise<boolean> | null = null;

  const loadTokens = async (): Promise<RakazStoredTokens | null> => {
    if (tokens === undefined) tokens = await options.storage.load().catch(() => null);
    return tokens;
  };
  const setTokens = async (next: RakazStoredTokens | null): Promise<void> => {
    tokens = next;
    await (next ? options.storage.save(next) : options.storage.clear()).catch(() => undefined);
  };

  const rawFetch = async (path: string, init: RakazFetchInit, bearer: string | null): Promise<Response> => {
    const timeoutMs = init.timeoutMs ?? defaultTimeout;
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    init.signal?.addEventListener('abort', abort);
    const timer = timeoutMs > 0 ? setTimeout(abort, timeoutMs) : null;
    try {
      return await fetch(`${baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
          ...init.headers,
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (init.signal?.aborted) throw error;
      throw new RakazApiError(NETWORK_MESSAGE, 0);
    } finally {
      if (timer) clearTimeout(timer);
      init.signal?.removeEventListener('abort', abort);
    }
  };

  const failureOf = async (response: Response): Promise<RakazApiError> => {
    try {
      const body = (await response.json()) as ApiFailure;
      return new RakazApiError(body.message, response.status, body.code, body.errors ?? []);
    } catch {
      return new RakazApiError('حدث خطأ غير متوقع', response.status);
    }
  };

  const unwrap = async <T>(response: Response): Promise<{ data: T; meta: ApiPageMeta | undefined }> => {
    if (!response.ok) throw await failureOf(response);
    const body = (await response.json()) as ApiResponse<T>;
    if (!body.success) throw new RakazApiError(body.message, body.statusCode, body.code, body.errors);
    return { data: body.data, meta: body.meta };
  };

  /** Concurrent callers share one renewal, because a refresh token works only once. */
  const refresh = (): Promise<boolean> => {
    refreshing ??= (async () => {
      const current = await loadTokens();
      if (!current) return false;
      try {
        const response = await rawFetch(P.auth.refresh, { method: 'POST', body: { refreshToken: current.refreshToken } }, null);
        if (!response.ok) {
          // Only a definite rejection ends the session; a 5xx may be temporary.
          if (response.status === 401) await setTokens(null);
          return false;
        }
        const { data } = await unwrap<RakazAuthSession>(response);
        await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  };

  const authorizedFetch = async (path: string, init: RakazFetchInit = {}): Promise<Response> => {
    let current = await loadTokens();
    // A store that keeps only the refresh token (the web dashboard) starts each load without an access token.
    if (current && !current.accessToken && (await refresh())) current = await loadTokens();
    let response = await rawFetch(path, init, current?.accessToken ?? null);
    if (response.status === 401 && (await loadTokens())) {
      if (await refresh()) response = await rawFetch(path, init, tokens?.accessToken ?? null);
    }
    if (response.status === 401 && current && !(await loadTokens())) options.onSessionLost?.();
    return response;
  };

  const request = async <T>(path: string, method = 'GET', body?: unknown): Promise<T> =>
    (await unwrap<T>(await authorizedFetch(path, { method, body }))).data;

  const publicRequest = async <T>(path: string, body: unknown): Promise<T> =>
    (await unwrap<T>(await rawFetch(path, { method: 'POST', body }, null))).data;

  const adopt = async (session: RakazAuthSession): Promise<RakazAuthSession> => {
    await setTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    return session;
  };

  return {
    baseUrl,
    request,
    authorizedFetch,

    async requestPage<T>(path: string) {
      const { data, meta } = await unwrap<T[]>(await authorizedFetch(path));
      return { items: data, meta };
    },

    hasSession: async () => (await loadTokens()) !== null,

    login: async (phone, password) => adopt(await publicRequest<RakazAuthSession>(P.auth.login, { phone, password })),

    async logout() {
      const current = await loadTokens();
      await setTokens(null);
      if (current) await publicRequest(P.auth.logout, { refreshToken: current.refreshToken }).catch(() => undefined);
    },

    dropSession: () => setTokens(null),

    me: () => request<RakazAuthUser>(P.auth.me),

    changePassword: async (currentPassword, newPassword) =>
      adopt(await request<RakazAuthSession>(P.auth.changePassword, 'POST', { currentPassword, newPassword })),

    async deleteAccount(password) {
      await request(P.auth.deleteAccount, 'DELETE', { password });
      await setTokens(null);
    },

    async ping() {
      try {
        const response = await rawFetch(P.health, { timeoutMs: 8000 }, null);
        return response.ok;
      } catch {
        return false;
      }
    },

    async publicSettings() {
      try {
        return (await unwrap<RakazSupportContact>(await rawFetch(P.publicSettings, { timeoutMs: 8000 }, null))).data;
      } catch {
        return null;
      }
    },

    notifications: {
      list: (page = 1, limit = 50) => request(`${P.notifications.list}?page=${page}&limit=${limit}`),
      markRead: (id) => request(P.notifications.read(id), 'POST'),
      markAllRead: () => request(P.notifications.readAll, 'POST'),
      remove: (id) => request(P.notifications.remove(id), 'DELETE'),
      getPreferences: () => request(P.notifications.preferences),
      savePreferences: (preferences) => request(P.notifications.preferences, 'PUT', preferences),
      registerDevice: (device) => request(P.notifications.registerDevice, 'PUT', device),
      unregisterDevice: (token) => request(P.notifications.unregisterDevice, 'POST', { token }),
    },
  };
}
