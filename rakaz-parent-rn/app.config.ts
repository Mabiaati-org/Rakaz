import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Adds the values that differ per environment and must not live in git:
 * - GOOGLE_MAPS_API_KEY: Google Maps key for react-native-maps on Android.
 * - EXPO_PUBLIC_RAKAZ_API_URL: base URL of rakaz-api (HTTPS in production).
 * - EAS_PROJECT_ID: written by `eas init`; needed for builds and push notifications.
 */
/**
 * Stops a store or tester build that would ship broken: pointing at a developer machine,
 * or missing the Google Maps key (the Android map crashes without it).
 * EAS sets EAS_BUILD_PROFILE on its build machines; local development is not affected.
 */
function assertReleaseConfig(values: { apiUrl?: string; mapsKey?: string; projectId?: string }): void {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile !== 'production' && profile !== 'preview') return;

  const problems: string[] = [];
  if (!values.apiUrl || !values.apiUrl.startsWith('https://') || values.apiUrl.includes('example.com')) {
    problems.push('EXPO_PUBLIC_RAKAZ_API_URL must be the real https:// address of rakaz-api (set it in eas.json).');
  }
  if (!values.mapsKey) problems.push('GOOGLE_MAPS_API_KEY is missing (add it with `eas env:create`).');
  if (!values.projectId) problems.push('EAS_PROJECT_ID is missing (run `eas init`, then add it with `eas env:create`).');
  if (problems.length > 0) throw new Error(`Cannot build the "${profile}" profile:\n- ${problems.join('\n- ')}`);
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  const projectId = process.env.EAS_PROJECT_ID;
  const apiUrl = process.env.EXPO_PUBLIC_RAKAZ_API_URL;
  assertReleaseConfig({ apiUrl, mapsKey, projectId });
  return {
    ...config,
    name: config.name ?? 'ركاز',
    slug: config.slug ?? 'rakaz-parent-rn',
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
