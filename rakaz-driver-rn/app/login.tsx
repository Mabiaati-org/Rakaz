import { CircleAlert, Lock, Phone, Shield } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AuthBackdrop, AuthField } from '@/components/AuthParts';
import { rakazLogo } from '@/components/Components';
import { PressableScale } from '@/components/PressableScale';
import { Rakaz, withAlpha } from '@/constants/theme';
import { useDriverStore } from '@/store/driverStore';

export default function LoginScreen() {
  const { login } = useDriverStore();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appear = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const errorFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(appear, { toValue: 1, damping: 9, stiffness: 120, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
    ]).start();
  }, [appear, fade]);

  useEffect(() => {
    if (error) {
      errorFade.setValue(0);
      Animated.timing(errorFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [error, errorFade]);

  const canSubmit = phone.trim().length > 0 && password.length > 0;
  const submit = () => {
    if (loading || !canSubmit) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    void login(phone, password).then((message) => {
      setError(message);
      setLoading(false);
    });
  };

  return (
    <View style={styles.root}>
      <AuthBackdrop />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.logoCard, { opacity: fade, transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
            <Image source={rakazLogo} resizeMode="contain" style={styles.logo} accessibilityLabel="ركاز" />
          </Animated.View>

          <Animated.View style={[styles.titles, { opacity: fade }]}>
            <AppText variant="displaySmall" color={Rakaz.White} style={styles.center}>
              تطبيق السائق
            </AppText>
            <AppText variant="titleMedium" color={Rakaz.Gold} style={styles.center}>
              نقل وتوصيل الطلاب بأمان
            </AppText>
          </Animated.View>

          <Animated.View style={[styles.form, { opacity: fade }]}>
            <AuthField icon={Phone} placeholder="رقم الهاتف" value={phone} onChange={setPhone} keyboardType="phone-pad" maxLength={16} autoComplete="tel" />
            <AuthField icon={Lock} placeholder="كلمة المرور" value={password} onChange={setPassword} maxLength={128} secure autoComplete="current-password" onSubmit={submit} />
            {error ? (
              <Animated.View style={[styles.error, { opacity: errorFade }]}>
                <CircleAlert color={Rakaz.LoginError} size={18} />
                <AppText variant="labelMedium" color={Rakaz.LoginError} style={styles.flex}>
                  {error}
                </AppText>
              </Animated.View>
            ) : null}
            <PressableScale onPress={submit} disabled={loading || !canSubmit} accessibilityLabel="تسجيل الدخول" style={[styles.submit, !canSubmit && styles.dim]}>
              {loading ? (
                <ActivityIndicator color={Rakaz.Ink} />
              ) : (
                <AppText variant="labelLarge" color={Rakaz.Ink}>
                  تسجيل الدخول
                </AppText>
              )}
            </PressableScale>
            <View style={styles.note}>
              <Shield color={withAlpha(Rakaz.White, 0.45)} size={14} />
              <AppText variant="bodySmall" color={withAlpha(Rakaz.White, 0.45)} style={styles.center}>
                الحساب وكلمة المرور تصدرهما إدارة النقل. إن نسيت كلمة المرور فاطلب من الإدارة إصدار واحدة جديدة.
              </AppText>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Rakaz.Navy },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  dim: { opacity: 0.5 },
  content: { flexGrow: 1, paddingHorizontal: 22, alignItems: 'center' },
  logoCard: {
    borderRadius: 28,
    backgroundColor: Rakaz.White,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  logo: { width: 190, height: 130 },
  titles: { marginTop: 28, alignItems: 'center' },
  form: {
    marginTop: 28,
    alignSelf: 'stretch',
    borderRadius: 26,
    backgroundColor: withAlpha(Rakaz.White, 0.06),
    borderWidth: 1,
    borderColor: withAlpha(Rakaz.White, 0.1),
    padding: 20,
    gap: 14,
    alignItems: 'center',
  },
  error: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 6 },
  submit: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 18,
    backgroundColor: Rakaz.Gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Rakaz.Gold,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingTop: 6 },
});
