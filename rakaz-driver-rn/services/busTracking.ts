import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { RakazLocationPing, RakazTripKind } from '@rakaz/contract';

import { driverApi } from '@/services/api';
import { Checkins } from '@/services/checkin';

const TASK = 'rakaz-bus-tracking';
const KIND_KEY = 'rakaz.driver.trackingKind';
const QUEUE_KEY = 'rakaz.driver.pingQueue';
const MAX_QUEUED = 240; // roughly 40 minutes at one fix every 10 s
const FOREGROUND_INTERVAL_MS = 10_000;

async function readQueue(): Promise<RakazLocationPing[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as RakazLocationPing[]) : [];
  } catch {
    return [];
  }
}

/** Uploads fixes together with any that failed earlier; on failure they wait for the next attempt. */
async function upload(fresh: RakazLocationPing[]): Promise<void> {
  const pending = [...(await readQueue()), ...fresh].slice(-MAX_QUEUED);
  if (pending.length === 0) return;
  try {
    await driverApi.sendLocations(pending);
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(pending)).catch(() => undefined);
  }
}

// Must be defined at module load so the OS can wake the app into it; `index.ts` imports this file.
if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const tripKind = (await AsyncStorage.getItem(KIND_KEY)) as RakazTripKind | null;
    if (!tripKind) return;
    await upload(
      data.locations.map((l) => ({
        tripKind,
        latitude: l.coords.latitude,
        longitude: l.coords.longitude,
        at: l.timestamp,
        speed: l.coords.speed,
        heading: l.coords.heading,
      })),
    );
    // The same wake-up keeps the five-minute check-in going while the screen is off.
    const latest = data.locations[data.locations.length - 1];
    if (latest) {
      await Checkins.fromBackground({
        latitude: latest.coords.latitude,
        longitude: latest.coords.longitude,
        accuracy: latest.coords.accuracy,
      });
    }
  });
}

let lastForegroundUpload = 0;

export const BusTracking = {
  /** Whether the OS dialog for "Always" location can still be shown or is already granted. */
  async backgroundPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
    if (Platform.OS === 'web') return 'denied';
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      return status;
    } catch {
      return 'denied';
    }
  },

  async requestBackgroundPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.status !== Location.PermissionStatus.GRANTED) return false;
      const background = await Location.requestBackgroundPermissionsAsync();
      return background.status === Location.PermissionStatus.GRANTED;
    } catch {
      return false;
    }
  },

  /**
   * Starts sharing the bus position for the running trip. With "Always" permission the OS keeps
   * delivering fixes while the screen is off; without it only `reportForegroundFix` uploads.
   */
  async start(tripKind: RakazTripKind): Promise<void> {
    await AsyncStorage.setItem(KIND_KEY, tripKind).catch(() => undefined);
    if (Platform.OS === 'web') return;
    try {
      if ((await this.backgroundPermission()) !== 'granted') return;
      if (await Location.hasStartedLocationUpdatesAsync(TASK)) return;
      await Location.startLocationUpdatesAsync(TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10_000,
        distanceInterval: 25,
        activityType: Location.ActivityType.AutomotiveNavigation,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'ركاز — الرحلة جارية',
          notificationBody: 'يُشارك موقع الباص مع أولياء الأمور والإدارة حتى تنتهي الرحلة.',
          notificationColor: '#C09034',
        },
      });
    } catch {
      console.warn('BusTracking: unable to start background updates');
    }
  },

  async stop(): Promise<void> {
    await AsyncStorage.multiRemove([KIND_KEY, QUEUE_KEY]).catch(() => undefined);
    if (Platform.OS === 'web') return;
    try {
      if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
    } catch {
      console.warn('BusTracking: unable to stop background updates');
    }
  },

  /** Uploads a fix seen while the app is open, when the background task is not doing it already. */
  async reportForegroundFix(tripKind: RakazTripKind, latitude: number, longitude: number): Promise<void> {
    const now = Date.now();
    if (now - lastForegroundUpload < FOREGROUND_INTERVAL_MS) return;
    lastForegroundUpload = now;
    if (Platform.OS !== 'web' && (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false))) return;
    await upload([{ tripKind, latitude, longitude, at: now, speed: null, heading: null }]);
  },
};
