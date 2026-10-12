import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  createRakazClient,
  RakazHttpPaths,
  resolveRakazApiUrl,
  type RakazAbsenceReport,
  type RakazCheckinInput,
  type RakazDriverBootstrap,
  type RakazDriverCheckin,
  type RakazDriverEventInput,
  type RakazLocationPing,
  type RakazStoredTokens,
  type RakazTokenStorage,
} from '@rakaz/contract';

const SESSION_KEY = 'rakaz.driver.session';

export function getRakazApiUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra as { rakazApiUrl?: string } | undefined)?.rakazApiUrl;
  return resolveRakazApiUrl(process.env.EXPO_PUBLIC_RAKAZ_API_URL ?? fromExtra ?? null);
}

// The background location task uploads while the phone is locked, so the session must stay
// readable after the first unlock.
const secureOptions: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

/** Keychain / Keystore on devices; the web build (development only) falls back to AsyncStorage. */
const tokenStorage: RakazTokenStorage = {
  async load(): Promise<RakazStoredTokens | null> {
    const raw =
      Platform.OS === 'web' ? await AsyncStorage.getItem(SESSION_KEY) : await SecureStore.getItemAsync(SESSION_KEY, secureOptions);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<RakazStoredTokens>;
      return parsed.accessToken && parsed.refreshToken
        ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
        : null;
    } catch {
      return null;
    }
  },
  async save(tokens: RakazStoredTokens): Promise<void> {
    const raw = JSON.stringify(tokens);
    if (Platform.OS === 'web') await AsyncStorage.setItem(SESSION_KEY, raw);
    else await SecureStore.setItemAsync(SESSION_KEY, raw, secureOptions);
  },
  async clear(): Promise<void> {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(SESSION_KEY);
    else await SecureStore.deleteItemAsync(SESSION_KEY, secureOptions);
  },
};

const sessionLostListeners = new Set<() => void>();

/** Called when the session can no longer be renewed (account disabled, signed out elsewhere). */
export function onSessionLost(listener: () => void): () => void {
  sessionLostListeners.add(listener);
  return () => sessionLostListeners.delete(listener);
}

export const client = createRakazClient({
  baseUrl: getRakazApiUrl(),
  storage: tokenStorage,
  onSessionLost: () => {
    for (const listener of sessionLostListeners) listener();
  },
});

const P = RakazHttpPaths.driver;

export const driverApi = {
  bootstrap: (): Promise<RakazDriverBootstrap> => client.request(P.bootstrap),
  sendEvents: (events: RakazDriverEventInput[]): Promise<{ accepted: number; duplicates: number }> =>
    client.request(P.events, 'POST', { events }),
  sendLocations: (pings: RakazLocationPing[]): Promise<{ stored: number }> =>
    client.request(P.location, 'POST', { pings }),
  absencesToday: (): Promise<RakazAbsenceReport[]> => client.request(P.absencesToday),
  checkin: (input: RakazCheckinInput): Promise<RakazDriverCheckin> => client.request(P.checkins, 'POST', input),
};
