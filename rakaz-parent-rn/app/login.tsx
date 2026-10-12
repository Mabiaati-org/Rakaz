import { ArrowLeft, CircleAlert, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BrandHeaderBackground } from '@/components/Brand';
import { PrimaryButton } from '@/components/Buttons';
import { PasswordInput } from '@/components/PasswordInput';
import { PressableScale } from '@/components/PressableScale';
import { LogoBadge } from '@/components/Primitives';
import { card, Fonts, Theme, withAlpha } from '@/constants/theme';
import { client } from '@/services/api';
import { useSession } from '@/store/sessionStore';
import { Haptics } from '@/utils/haptics';

/** Physical-left text alignment for LTR inputs (native RTL swaps left/right). */
const LTR_ALIGN = Platform.OS === 'web' ? 'left' : 'right';

export default function LoginScreen() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const loadingRef = useRef(false);
  const [privacyUrl, setPrivacyUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    void client.publicSettings().then((settings) => {
      if (!cancelled && settings) setPrivacyUrl(settings.privacyPolicyUrl);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (loadingRef.current) return;
    Keyboard.dismiss();
    loadingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await session.login(phone, password);
    } catch (error) {
      Haptics.error();
      setErrorMessage(error instanceof Error ? error.message : 'تعذّر تسجيل الدخول. حاول مرة أخرى.');
      shake.setValue(0);
      Animated.timing(shake, { toValue: 1, duration: 350, easing: Easing.linear, useNativeDriver: true }).start();
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  const shakeX = shake.interpolate({
    inputRange: [0, 0.125, 0.375, 0.625, 0.875, 1],
    outputRange: [0, 8, -8, 8, -8, 0],
  });

  return (
    <View style={styles.root}>
      <BrandHeaderBackground style={[styles.headerBg, { height: 330 + insets.top }]} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top }]}
        bounces={false}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <LogoBadge height={46} />
          </View>
          <AppText size={28} weight="bold" color={Theme.white} align="center">
            أهلاً بك في ركاز
          </AppText>
          <AppText size="subheadline" color={withAlpha(Theme.white, 0.7)} align="center">
            سجّل الدخول لمتابعة رحلات أطفالك
          </AppText>
        </View>

        <Animated.View style={[styles.form, { transform: [{ translateX: shakeX }] }]}>
          <AppText size="subheadline" weight="semibold">
            رقم الهاتف
          </AppText>
          <View style={styles.ltrRow}>
            <View style={styles.prefix}>
              <AppText size="body">🇮🇶</AppText>
              <AppText size="body" weight="semibold">
                +964
              </AppText>
            </View>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="7XX XXX XXXX"
              placeholderTextColor={withAlpha(Theme.muted, 0.7)}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={16}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              style={[styles.phoneInput, { borderColor: phoneFocused ? Theme.gold : 'transparent' }]}
              accessibilityLabel="رقم الهاتف"
            />
          </View>

          <PasswordInput label="كلمة المرور" value={password} onChange={setPassword} onSubmit={() => void submit()} />

          {errorMessage != null ? (
            <View style={styles.error} accessibilityRole="alert">
              <CircleAlert size={15} color={Theme.white} fill={Theme.red} />
              <AppText size="footnote" weight="medium" color={Theme.red} style={styles.flex}>
                {errorMessage}
              </AppText>
            </View>
          ) : null}

          <PrimaryButton title="تسجيل الدخول" icon={ArrowLeft} trailingIcon onPress={() => void submit()} loading={isLoading} />
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.hint}>
            <ShieldCheck size={15} color={Theme.green} fill={withAlpha(Theme.green, 0.2)} />
            <AppText size="footnote" weight="medium" color={Theme.muted}>
              بياناتك محمية ومشفّرة
            </AppText>
          </View>
          <AppText size="caption" color={withAlpha(Theme.muted, 0.8)} align="center">
            الحساب وكلمة المرور تصدرهما إدارة ركاز. إن نسيت كلمة المرور فاطلب من الإدارة إصدار واحدة جديدة.
          </AppText>
          {privacyUrl ? (
            <PressableScale onPress={() => void Linking.openURL(privacyUrl)} accessibilityLabel="سياسة الخصوصية" style={styles.link}>
              <AppText size="footnote" weight="semibold" color={Theme.gold}>
                سياسة الخصوصية
              </AppText>
            </PressableScale>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.canvas },
  headerBg: { position: 'absolute', top: 0, start: 0, end: 0, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  scroll: { paddingHorizontal: 20, paddingBottom: 30, gap: 22, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { alignItems: 'center', gap: 6, paddingBottom: 4 },
  logo: { paddingTop: 18, paddingBottom: 12 },
  form: { ...card(20, 26), gap: 16 },
  ltrRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  prefix: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 54,
    borderRadius: 14,
    backgroundColor: Theme.canvas,
  },
  phoneInput: {
    flex: 1,
    // Lets the field shrink inside the row on the web, where inputs have an intrinsic width.
    minWidth: 0,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    backgroundColor: Theme.canvas,
    color: Theme.ink,
    fontFamily: Fonts.semibold,
    fontSize: 20,
    textAlign: LTR_ALIGN,
    writingDirection: 'ltr',
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: Theme.redSoft },
  flex: { flex: 1 },
  footer: { alignItems: 'center', gap: 6 },
  link: { minHeight: 44, justifyContent: 'center' },
});
