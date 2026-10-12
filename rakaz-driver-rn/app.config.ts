import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Adds the values that differ per environment and must not live in git:
 * - GOOGLE_MAPS_API_KEY: Google Maps key for react-native-maps on Android.
 * - EXPO_PUBLIC_RAKAZ_API_URL: base URL of rakaz-api (HTTPS in production).
 * - EAS_PROJECT_ID: written by `eas init`; needed for builds and push notifications.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  const projectId = process.env.EAS_PROJECT_ID;
  const apiUrl = process.env.EXPO_PUBLIC_RAKAZ_API_URL;
  return {
    ...config,
    name: config.name ?? 'ركاز السائق',
    slug: config.slug ?? 'rakaz-driver-rn',
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', mapsKey ? { androidGoogleMapsApiKey: mapsKey } : {}],
    ],
    extra: {
      ...config.extra,
      ...(apiUrl ? { rakazApiUrl: apiUrl } : {}),
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
