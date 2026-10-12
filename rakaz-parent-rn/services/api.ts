import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  createRakazClient,
  RakazHttpPaths,
  resolveRakazApiUrl,
  type RakazAbsenceInput,
  type RakazAbsenceReport,
  type RakazHandoverResult,
  type RakazParentBootstrap,
  type RakazParentTripView,
  type RakazStoredTokens,
  type RakazStudentAddress,
  type RakazSupportTicket,
  type RakazSupportTicketInput,
  type RakazTokenStorage,
  type RakazTripKind,
} from '@rakaz/contract';

const SESSION_KEY = 'rakaz.parent.session';

export function getRakazApiUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra as { rakazApiUrl?: string } | undefined)?.rakazApiUrl;
  return resolveRakazApiUrl(process.env.EXPO_PUBLIC_RAKAZ_API_URL ?? fromExtra ?? null);
}

/** Keychain / Keystore on devices; the web build (development only) falls back to AsyncStorage. */
const tokenStorage: RakazTokenStorage = {
  async load(): Promise<RakazStoredTokens | null> {
    const raw = Platform.OS === 'web' ? await AsyncStorage.getItem(SESSION_KEY) : await SecureStore.getItemAsync(SESSION_KEY);
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
    else await SecureStore.setItemAsync(SESSION_KEY, raw);
  },
  async clear(): Promise<void> {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(SESSION_KEY);
    else await SecureStore.deleteItemAsync(SESSION_KEY);
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

const P = RakazHttpPaths.parent;

export interface TodayTrips {
  morning: RakazParentTripView;
  afternoon: RakazParentTripView;
  activeKind: RakazTripKind;
}

export const parentApi = {
  bootstrap: (): Promise<RakazParentBootstrap> => client.request(P.bootstrap),
  todayTrips: (studentId: string): Promise<TodayTrips> =>
    client.request(`${P.todayTrips}?studentId=${encodeURIComponent(studentId)}`),
  reportAbsence: (input: RakazAbsenceInput): Promise<RakazAbsenceReport> => client.request(P.absences, 'POST', input),
  cancelAbsence: (id: string): Promise<void> => client.request(P.absence(id), 'DELETE'),
  updateAddress: (studentId: string, address: RakazStudentAddress): Promise<RakazStudentAddress> =>
    client.request(P.address(studentId), 'PUT', address),
  handover: (result: RakazHandoverResult): Promise<void> => client.request(P.handovers, 'POST', result),
  listTickets: (): Promise<RakazSupportTicket[]> => client.request(P.tickets),
  createTicket: (input: RakazSupportTicketInput): Promise<RakazSupportTicket> => client.request(P.tickets, 'POST', input),
};
