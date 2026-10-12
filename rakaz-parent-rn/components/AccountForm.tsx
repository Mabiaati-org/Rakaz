import { useRouter } from 'expo-router';
import { KeyRound, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RAKAZ_MIN_PASSWORD_LENGTH } from '@rakaz/contract';

import { AppText } from '@/components/AppText';
import { BrandHeaderBackground } from '@/components/Brand';
import { OutlineButton, PrimaryButton } from '@/components/Buttons';
import { DetailScreen } from '@/components/DetailScreen';
import { FormError } from '@/components/FormError';
import { PasswordInput } from '@/components/PasswordInput';
import { IconBadge, LogoBadge } from '@/components/Primitives';
import { card, Theme, withAlpha } from '@/constants/theme';
import { useSubmit } from '@/hooks/useSubmit';
import { useSession } from '@/store/sessionStore';
import { Fmt } from '@/utils/fmt';

/**
 * - `set`: forced after the first sign-in with the temporary password; the only exit is signing out.
 * - `change`: opened from the family tab.
 * - `delete`: permanent account deletion, confirmed with the password.
 */
export function AccountForm({ mode }: { mode: 'set' | 'change' | 'delete' }) {
  const session = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const submit = useSubmit();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const deleting = mode === 'delete';
  const mismatch = !deleting && confirm.length > 0 && next !== confirm;
  const canSubmit = deleting ? current.length > 0 : current.length > 0 && next.length >= RAKAZ_MIN_PASSWORD_LENGTH && next === confirm;

  const send = () => {
    if (!canSubmit) return;
    void submit
      .run(() => (deleting ? session.deleteAccount(current) : session.changePassword(current, next)))
      .then((ok) => {
        if (ok && mode === 'change') router.back();
      });
  };

  const fields = (
    <View style={[card(20, 26), styles.gap16]}>
      <PasswordInput
        label={mode === 'set' ? 'كلمة المرور المؤقتة' : 'كلمة المرور الحالية'}
        value={current}
        onChange={setCurrent}
        onSubmit={deleting ? send : undefined}
      />
      {deleting ? null : (
        <>
          <PasswordInput label="كلمة المرور الجديدة" value={next} onChange={setNext} kind="new" />
          <PasswordInput label="تأكيد كلمة المرور الجديدة" value={confirm} onChange={setConfirm} kind="new" onSubmit={send} />
          <AppText size="caption" color={Theme.muted}>
            {`${Fmt.digits(String(RAKAZ_MIN_PASSWORD_LENGTH))} أحرف على الأقل، وتحتوي حرفاً ورقماً.`}
          </AppText>
        </>
      )}
      <FormError message={mismatch ? 'كلمتا المرور غير متطابقتين' : submit.error} />
      <PrimaryButton
        title={deleting ? 'حذف الحساب نهائياً' : 'حفظ كلمة المرور'}
        icon={deleting ? Trash2 : KeyRound}
        fill={deleting ? Theme.red : Theme.navy}
        onPress={send}
        loading={submit.busy}
        disabled={!canSubmit}
        dimmed={!canSubmit}
      />
    </View>
  );

  if (mode === 'set') {
    return (
      <View style={styles.root}>
        <BrandHeaderBackground style={[styles.headerBg, { height: 290 + insets.top }]} />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingTop: insets.top }]} bounces={false}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <LogoBadge height={46} />
            </View>
            <AppText size={26} weight="bold" color={Theme.white} align="center">
              اختر كلمة مرور جديدة
            </AppText>
            <AppText size="subheadline" color={withAlpha(Theme.white, 0.7)} align="center">
              كلمة المرور التي استلمتها من الإدارة مؤقتة. استبدلها بكلمة مرور خاصة بك للمتابعة.
            </AppText>
          </View>
          {fields}
          <OutlineButton title="تسجيل الخروج" onPress={session.logout} />
        </ScrollView>
      </View>
    );
  }

  return (
    <DetailScreen title={deleting ? 'حذف الحساب' : 'تغيير كلمة المرور'} gap={18}>
      {deleting ? (
        <View style={[card(16, 20), styles.row12]}>
          <IconBadge icon={Trash2} tint={Theme.red} soft={Theme.redSoft} size={44} />
          <View style={styles.flex}>
            <AppText size="headline" weight="bold">
              هذا الإجراء نهائي
            </AppText>
            <AppText size="footnote" color={Theme.muted}>
              سيُحذف حسابك وإشعاراتك وطلبات الدعم الخاصة بك، ولن تتمكن من متابعة رحلات أطفالك من التطبيق. تبقى سجلات الطلاب والرحلات لدى إدارة النقل. لاستعادة الخدمة يجب أن تنشئ الإدارة حساباً جديداً.
            </AppText>
          </View>
        </View>
      ) : null}
      {fields}
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.canvas },
  headerBg: { position: 'absolute', top: 0, start: 0, end: 0, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  scroll: { paddingHorizontal: 20, paddingBottom: 30, gap: 18, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { alignItems: 'center', gap: 6, paddingBottom: 4 },
  logo: { paddingTop: 18, paddingBottom: 12 },
  gap16: { gap: 16 },
  row12: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex: { flex: 1, gap: 4 },
});
