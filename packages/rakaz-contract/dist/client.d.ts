import type { RakazAuthSession, RakazAuthUser, RakazDeviceRegistration } from './auth';
import type { ApiFieldError, ApiPageMeta, RakazErrorCode } from './envelope';
import type { RakazNotificationPreferences, RakazParentNotification } from './events';
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
export declare class RakazApiError extends Error {
    readonly status: number;
    readonly code?: RakazErrorCode | undefined;
    readonly errors: ApiFieldError[];
    constructor(message: string, status: number, code?: RakazErrorCode | undefined, errors?: ApiFieldError[]);
    /** True when the request never got an answer (offline, DNS, timeout). */
    get isNetworkError(): boolean;
    /** The most specific message to show the user. */
    get display(): string;
}
/** Arabic text for any thrown value, for showing in the UI. */
export declare function rakazErrorText(error: unknown): string;
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
    requestPage<T>(path: string): Promise<{
        items: T[];
        meta: ApiPageMeta | undefined;
    }>;
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
/** One HTTP client for the dashboard and both mobile apps: bearer auth, silent renewal, envelope unwrapping. */
export declare function createRakazClient(options: RakazClientOptions): RakazClient;
