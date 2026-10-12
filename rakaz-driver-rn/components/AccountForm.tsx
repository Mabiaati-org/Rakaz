import { router } from 'expo-router';
import { ChevronRight, CircleAlert, KeyRound, Lock, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RAKAZ_MIN_PASSWORD_LENGTH } from '@rakaz/contract';

import { AppText } from '@/components/AppText';
import { AuthBackdrop, AuthField } from '@/components/AuthParts';
import { PressableScale } from '@/components/PressableScale';
import { Rakaz, withAlpha } from '@/constants/theme';
import { useDriverStore } from '@/store/driverStore';

/**
 * - `set`: forced after first sign-in with the temporary password; the only exit is signing out.
 * - `change`: opened from the menu.
 * - `delete`: permanent account deletion, confirmed with the password.
 */
export function AccountForm({ mode }: { mode: 'set' | 'change' | 'delete' }) {
  const store = useDriverStore();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleting = mode === 'delete';
  const mismatch = !deleting && confirm.length > 0 && next !== confirm;
  const canSubmit = deleting ? current.length > 0 : current.length > 0 && next.length >= RAKAZ_MIN_PASSWORD_LENGTH && next === confirm;

  const submit = () => {
    if (loading || !canSubmit) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    const task = deleting ? store.deleteAccount(current) : store.changePassword(current, next);
    void task.then((message) => {
      setLoading(false);
      setError(message);
      if (message == null && mode === 'change') router.back();
    });
  };

  const title = deleting ? 'حذف الحساب' : mode === 'set' ? 'اختر كلمة مرور جديدة' : 'تغيير كلمة المرور';
  const subtitle = deleting
    ? 'سيُحذف حسابك نهائياً ولن تتمكن من الدخول بعدها. لإعادة تفعيله يجب أن تنشئ الإدارة حساباً جديداً.'
    : mode === 'set'
      ? 'كلمة المرور التي استلمتها من الإدارة مؤقتة. استبدلها بكلمة مرور خاصة بك للمتابعة.'
      : `على الأقل ${RAKAZ_MIN_PASSWORD_LENGTH} أحرف وتحتوي حرفاً ورقماً.`;

  return (
    <View style={styles.root}>
      <AuthBackdrop />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
        >
          {mode !== 'set' ? (
            <PressableScale onPress={() => router.back()} accessibilityLabel="رجوع" style={styles.back}>
              <ChevronRight color={Rakaz.White} size={24} />
              <AppText variant="labelLarge" color={Rakaz.White}>
                رجوع
              </AppText>
            </PressableScale>
          ) : null}

          <View style={styles.titles}>
            {deleting ? <Trash2 color={Rakaz.LoginError} size={36} /> : <KeyRound color={Rakaz.Gold} size={36} />}
            <AppText variant="headlineSmall" color={Rakaz.White} style={styles.center}>
              {title}
            </AppText>
            <AppText variant="bodyMedium" color={withAlpha(Rakaz.White, 0.7)} style={styles.center}>
              {subtitle}
            </AppText>
          </View>

          <View style={styles.form}>
            <AuthField
              icon={Lock}
              placeholder={mode === 'set' ? 'كلمة المرور المؤقتة' : 'كلمة المرور الحالية'}
              value={current}
              onChange={setCurrent}
              maxLength={128}
              secure
              autoComplete="current-password"
              onSubmit={deleting ? submit : undefined}
            />
            {deleting ? null : (
              <>
                <AuthField icon={KeyRound} placeholder="كلمة المرور الجديدة" value={next} onChange={setNext} maxLength={128} secure autoComplete="new-password" />
                <AuthField icon={KeyRound} placeholder="تأكيد كلمة المرور الجديدة" value={confirm} onChange={setConfirm} maxLength={128} secure autoComplete="new-password" onSubmit={submit} />
              </>
            )}
            {mismatch || error ? (
              <View style={styles.error}>
                <CircleAlert color={Rakaz.LoginError} size={18} />
                <AppText variant="labelMedium" color={Rakaz.LoginError} style={styles.flex}>
                  {mismatch ? 'كلمتا المرور غير متطابقتين' : error}
                </AppText>
              </View>
            ) : null}
            <PressableScale
              onPress={submit}
              disabled={loading || !canSubmit}
              accessibilityLabel={deleting ? 'حذف الحساب نهائياً' : 'حفظ كلمة المرور'}
              style={[styles.submit, deleting && styles.submitDanger, !canSubmit && styles.dim]}
            >
              {loading ? (
                <ActivityIndicator color={deleting ? Rakaz.White : Rakaz.Ink} />
              ) : (
                <AppText variant="labelLarge" color={deleting ? Rakaz.White : Rakaz.Ink}>
                  {deleting ? 'حذف الحساب نهائياً' : 'حفظ كلمة المرور'}
                </AppText>
              )}
            </PressableScale>
            {mode === 'set' ? (
              <PressableScale onPress={store.logout} accessibilityLabel="تسجيل الخروج" style={styles.secondary}>
                <AppText variant="labelMedium" color={withAlpha(Rakaz.White, 0.6)}>
                  تسجيل الخروج
                </AppText>
              </PressableScale>
            ) : null}
          </View>
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
  content: { flexGrow: 1, paddingHorizontal: 22 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  titles: { marginTop: 24, alignItems: 'center', gap: 10 },
  form: {
    marginTop: 28,
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
  },
  submitDanger: { backgroundColor: Rakaz.Red },
  secondary: { minHeight: 44, justifyContent: 'center' },
});
