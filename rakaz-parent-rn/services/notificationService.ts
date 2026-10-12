import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { client } from '@/services/api';

type NotificationsModule = typeof import('expo-notifications');

// Importing expo-notifications inside Expo Go on Android throws (push support was removed in SDK 53),
// so the module is only loaded where it works; the in-app banner still covers every event.
const isAndroidExpoGo =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: NotificationsModule | null = null;
if ((Platform.OS === 'ios' || Platform.OS === 'android') && !isAndroidExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications') as NotificationsModule;
  } catch (error) {
    console.log('[Notifications] module unavailable:', error);
  }
}

// The in-app banner covers foreground delivery, so the system alert only shows in the background.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let registeredToken: string | null = null;

/** Push notifications sent by the Rakaz API as the trip progresses. */
export const NotificationService = {
  /** Asks for permission and registers this phone with the API. Quietly does nothing where push is unavailable. */
  async register(): Promise<void> {
    if (!Notifications || !Device.isDevice) return;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return;
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'إشعارات الرحلات',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      const granted = current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
      if (!granted) return;
      const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
      await client.notifications.registerDevice({ token: data, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
      registeredToken = data;
    } catch (error) {
      console.log('[Notifications] registration failed:', error);
    }
  },

  /** Stops this phone receiving pushes for the account that is signing out. */
  async unregister(): Promise<void> {
    const token = registeredToken;
    registeredToken = null;
    if (token) await client.notifications.unregisterDevice(token).catch(() => undefined);
  },

  /** Runs `onOpen` when the user taps a notification; returns the unsubscribe function. */
  onOpened(onOpen: () => void): () => void {
    if (!Notifications) return () => undefined;
    const subscription = Notifications.addNotificationResponseReceivedListener(() => onOpen());
    return () => subscription.remove();
  },
};
