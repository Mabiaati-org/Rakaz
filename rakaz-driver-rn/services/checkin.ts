import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import {
  isWithinWorkSchedule,
  RAKAZ_CHECKIN_INTERVAL_SECONDS,
  RakazApiError,
  type RakazCheckinInput,
  type RakazWorkSchedule,
} from '@rakaz/contract';

import { driverApi } from '@/services/api';

const LAST_KEY = 'rakaz.driver.lastCheckinAt';
const INTERVAL_MS = RAKAZ_CHECKIN_INTERVAL_SECONDS * 1000;
// Timers and OS location callbacks drift by a few seconds; firing slightly early keeps the 5-minute rhythm.
const EARLY_MS = 10_000;

let sending = false;

async function isDue(): Promise<boolean> {
  const last = Number((await AsyncStorage.getItem(LAST_KEY).catch(() => null)) ?? 0);
  return Date.now() - last >= INTERVAL_MS - EARLY_MS;
}

const markSent = (): Promise<void> => AsyncStorage.setItem(LAST_KEY, String(Date.now())).catch(() => undefined);

/** Sends one check-in. The server decides whether it is duty time and answers 422 when it is not. */
async function send(fix: RakazCheckinInput): Promise<void> {
  if (sending) return;
  sending = true;
  try {
    await driverApi.checkin(fix);
    await markSent();
  } catch (error) {
    // Off duty: wait a full interval before asking again. Anything else is retried on the next tick.
    if (error instanceof RakazApiError && error.code === 'OUTSIDE_WORKING_HOURS') await markSent();
  } finally {
    sending = false;
  }
}

/**
 * Every five minutes on duty the app tells the administration exactly where the driver is;
 * the server records who is on the bus at that moment.
 */
export const Checkins = {
  /** Called on a timer while the app is open. Reads a fresh GPS fix only when a check-in is due. */
  async tick(schedule: RakazWorkSchedule | null): Promise<void> {
    if (Platform.OS === 'web') return;
    const now = new Date();
    // The phone's clock only saves a pointless request; the server has the final say.
    if (schedule && !isWithinWorkSchedule(schedule, now.getDay(), now.getHours() * 60 + now.getMinutes())) return;
    if (!(await isDue())) return;
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await send({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
    } catch {
      // No fix right now (GPS off, indoors); the next tick tries again.
    }
  },

  /** Called from the background location task during a trip, with the fix the OS just delivered. */
  async fromBackground(fix: RakazCheckinInput): Promise<void> {
    if (await isDue()) await send(fix);
  },

  /** Forget the rhythm when the account signs out. */
  reset: (): Promise<void> => AsyncStorage.removeItem(LAST_KEY).catch(() => undefined),
};
