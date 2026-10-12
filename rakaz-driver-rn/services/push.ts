import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { client } from '@/services/api';

let registeredToken: string | null = null;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Push notifications from the administration (route changes, absences, broadcasts). */
export const Push = {
  /** Asks for permission and registers this device with the API. Quietly does nothing where push is unavailable. */
  async register(): Promise<void> {
    if (Platform.OS === 'web' || !Device.isDevice) return;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return;
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'إشعارات ركاز',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      const granted = current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
      if (!granted) return;
      const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
      await client.notifications.registerDevice({ token: data, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
      registeredToken = data;
    } catch {
      console.warn('Push: registration failed');
    }
  },

  /** Stops this device receiving pushes for the account that is signing out. */
  async unregister(): Promise<void> {
    const token = registeredToken;
    registeredToken = null;
    if (token) await client.notifications.unregisterDevice(token).catch(() => undefined);
  },
};
