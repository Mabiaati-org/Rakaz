import type { RakazUid } from './ids';
export type RakazRole = 'admin' | 'driver' | 'guardian';
export interface RakazAuthUser {
    uid: RakazUid;
    /** E.164, e.g. +9647701234567 */
    phone: string;
    name: string;
    role: RakazRole;
    /** True while the account still uses the temporary password issued by the administration. */
    mustChangePassword: boolean;
}
export interface RakazLoginRequest {
    phone: string;
    password: string;
}
export interface RakazAuthSession {
    accessToken: string;
    refreshToken: string;
    /** Access token lifetime in seconds. */
    expiresIn: number;
    user: RakazAuthUser;
}
export interface RakazRefreshRequest {
    refreshToken: string;
}
export interface RakazChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
export interface RakazDeleteAccountRequest {
    password: string;
}
/** Returned once when the administration creates an account or resets a password. */
export interface RakazIssuedCredentials {
    uid: RakazUid;
    phone: string;
    temporaryPassword: string;
}
export declare const RAKAZ_MIN_PASSWORD_LENGTH = 8;
export interface RakazDeviceRegistration {
    /** Expo push token, e.g. ExponentPushToken[...] */
    token: string;
    platform: 'ios' | 'android' | 'web';
}
