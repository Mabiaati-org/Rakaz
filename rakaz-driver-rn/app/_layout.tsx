import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/tajawal';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocationDisclosure } from '@/components/LocationDisclosure';
import { Toast } from '@/components/Toast';
import { AbsenceSheet } from '@/components/sheets/AbsenceSheet';
import { EmergencyActiveScreen } from '@/components/sheets/EmergencyActiveScreen';
import { EmergencySheet } from '@/components/sheets/EmergencySheet';
import { MenuSheet } from '@/components/sheets/MenuSheet';
import { NavigationChooser } from '@/components/sheets/NavigationChooser';
import { RouteOrderSheet } from '@/components/sheets/RouteOrderSheet';
import { Rakaz } from '@/constants/theme';
import { NavigationLauncher } from '@/services/navigationLauncher';
import { DriverStoreProvider, useDriverStore } from '@/store/driverStore';
import { UiStoreProvider, useUiStore } from '@/store/uiStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Sheets presented over the main shell (menu, emergency, stop order, absence, navigation). */
function SheetsHost() {
  const store = useDriverStore();
  const ui = useUiStore();
  const adminPhone = store.state.profile?.adminPhone ?? null;
  const dial = (phone: string) => void NavigationLauncher.dial(phone);

  return (
    <>
      <MenuSheet
        visible={ui.menuOpen}
        onDismiss={ui.closeMenu}
        onCall={dial}
        onLogout={() => {
          ui.closeMenu();
          store.logout();
        }}
      />
      <EmergencySheet
        visible={ui.emergencyOpen}
        adminPhone={adminPhone}
        onDismiss={ui.closeEmergency}
        onCall={dial}
        onSend={(type, note) => {
          ui.closeEmergency();
          store.triggerEmergency(type, note);
        }}
      />
      <RouteOrderSheet visible={ui.reorderOpen} onDismiss={ui.closeReorder} />
      <AbsenceSheet
        student={ui.absentStudent}
        onDismiss={ui.closeAbsence}
        onConfirm={(reason) => {
          if (ui.absentStudent) store.markAbsent(ui.absentStudent.id, reason);
          ui.closeAbsence();
        }}
      />
      <NavigationChooser
        target={ui.navTarget}
        onDismiss={ui.closeNavigation}
        onPick={(provider) => {
          const target = ui.navTarget;
          ui.closeNavigation();
          if (target) void NavigationLauncher.open(provider, target.coordinate, target.title);
        }}
      />
      <LocationDisclosure />
      <EmergencyActiveScreen
        visible={store.state.emergencyActive}
        isOnline={store.derived.isOnline}
        adminPhone={adminPhone}
        onCall={dial}
        onResolve={store.resolveEmergency}
      />
    </>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const store = useDriverStore();
  const ready = fontsLoaded && store.hydrated;
  const signedIn = store.state.profile != null;
  // An account with a temporary password can reach nothing but the screen that replaces it.
  const needsPassword = signedIn && store.state.mustChangePassword;
  const loggedIn = signedIn && !needsPassword;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Rakaz.Canvas } }}>
        <Stack.Protected guard={loggedIn}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="student/[id]" />
          <Stack.Screen name="map" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="change-password" />
          <Stack.Screen name="delete-account" />
        </Stack.Protected>
        <Stack.Protected guard={needsPassword}>
          <Stack.Screen name="set-password" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
      {loggedIn ? <SheetsHost /> : null}
      <Toast toast={store.toast} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <DriverStoreProvider>
        <UiStoreProvider>
          <RootNavigator fontsLoaded={fontsLoaded || fontError != null} />
        </UiStoreProvider>
      </DriverStoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Rakaz.Canvas },
});
