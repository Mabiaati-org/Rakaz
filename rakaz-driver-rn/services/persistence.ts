import AsyncStorage from '@react-native-async-storage/async-storage';

import { type AppSnapshot, emptyTripState } from '@/types/models';

// v1 held the sample data of the demo build; never read it back.
const KEY = 'snapshot_v2';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Decodes a stored snapshot, tolerating missing/unknown keys like the Android JSON decoder. */
function decode(raw: string): AppSnapshot | null {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || !isRecord(parsed.route)) return null;
  const route = parsed.route as unknown as AppSnapshot['route'];
  if (!Array.isArray(route.students) || !Array.isArray(route.stops) || !isRecord(route.school)) return null;
  const trip = isRecord(parsed.trip) ? (parsed.trip as Partial<AppSnapshot['trip']>) : {};
  return {
    profile: isRecord(parsed.profile) ? (parsed.profile as unknown as AppSnapshot['profile']) : null,
    route,
    trip: { ...emptyTripState(), ...trip },
    pending: Array.isArray(parsed.pending)
      ? (parsed.pending as AppSnapshot['pending']).map((a) => ({ ...a, tripKind: a.tripKind ?? 'morning' }))
      : [],
    notifications: Array.isArray(parsed.notifications) ? (parsed.notifications as AppSnapshot['notifications']) : [],
    lastSyncAt: typeof parsed.lastSyncAt === 'number' ? parsed.lastSyncAt : null,
    completedTripsTotal: typeof parsed.completedTripsTotal === 'number' ? parsed.completedTripsTotal : 0,
    mustChangePassword: parsed.mustChangePassword === true,
  };
}

/** Stores the whole app snapshot locally so every feature keeps working offline. */
export const PersistenceService = {
  async load(): Promise<AppSnapshot | null> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw == null ? null : decode(raw);
    } catch {
      console.warn('Persistence: snapshot decode failed');
      return null;
    }
  },

  async save(snapshot: AppSnapshot): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
    } catch {
      console.warn('Persistence: snapshot save failed');
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      console.warn('Persistence: snapshot clear failed');
    }
  },
};
