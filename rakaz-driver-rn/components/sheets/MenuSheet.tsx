import { Check, ChevronLeft, KeyRound, LogOut, Phone, RefreshCw, Trash2 } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { BrandButton, LogoBadge } from '@/components/Components';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PressableScale } from '@/components/PressableScale';
import { Rakaz, withAlpha } from '@/constants/theme';
import { findStudent } from '@/store/driverState';
import { useDriverStore } from '@/store/driverStore';
import { ActionKindTitle, RouteOptimizationModeTitle } from '@/types/models';
import { ArabicFormat, arabicDigits } from '@/utils/arabicFormat';

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText variant="labelMedium" color={Rakaz.Gold}>
        {title}
      </AppText>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

function MenuRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.menuRow}>
      <AppText variant="bodyLarge" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="bodyMedium" color={Rakaz.InkSecondary}>
        {value}
      </AppText>
    </View>
  );
}

export interface MenuSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onCall: (phone: string) => void;
  onLogout: () => void;
}

export function MenuSheet({ visible, onDismiss, onCall, onLogout }: MenuSheetProps) {
  const store = useDriverStore();
  const { state, derived } = store;
  const [confirmLogout, setConfirmLogout] = useState(false);
  const profile = state.profile;
  const canSync = derived.isOnline && state.pending.length > 0;

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      overlay={
        <ConfirmDialog
          inline
          visible={confirmLogout}
          title="تسجيل الخروج؟"
          message={
            state.pending.length > 0
              ? `لديك ${ArabicFormat.number(state.pending.length)} إجراءات لم تُرسل للإدارة بعد وستُحذف عند الخروج.`
              : 'ستحتاج رقم الهاتف وكلمة المرور للدخول من جديد.'
          }
          confirmTitle="خروج"
          onDismiss={() => setConfirmLogout(false)}
          onConfirm={() => {
            setConfirmLogout(false);
            onLogout();
          }}
        />
      }
    >
      <View style={styles.profile}>
        <LogoBadge size={56} />
        <View style={styles.flex}>
          <AppText variant="titleLarge">{profile?.name ?? ''}</AppText>
          <AppText variant="bodySmall" color={Rakaz.InkSecondary}>
            {`حافلة ${profile?.busNumber ?? ''} · ${profile?.plate ?? ''}`}
          </AppText>
          <AppText variant="bodySmall" color={Rakaz.InkSecondary}>
            {arabicDigits(profile?.phone ?? '')}
          </AppText>
        </View>
      </View>

      <MenuGroup title="المسار">
        <MenuRow label="رمز المسار" value={state.route.code || '—'} />
        <MenuRow label="المدرسة" value={state.route.school.name || '—'} />
        <MenuRow label="عدد الطلاب" value={ArabicFormat.number(state.route.students.length)} />
        <MenuRow label="طريقة الترتيب" value={RouteOptimizationModeTitle[state.route.optimizationMode]} />
      </MenuGroup>

      <MenuGroup title="العمل دون اتصال">
        <MenuRow label="إجراءات بانتظار المزامنة" value={ArabicFormat.number(state.pending.length)} />
        <PressableScale onPress={store.sync} disabled={!canSync} accessibilityLabel="مزامنة الآن" style={[styles.syncRow, !canSync && styles.dim]}>
          <RefreshCw color={Rakaz.Navy} size={20} />
          <AppText variant="labelLarge" color={Rakaz.Navy}>
            {state.isSyncing ? 'جارٍ المزامنة…' : 'مزامنة الآن'}
          </AppText>
        </PressableScale>
        <AppText variant="bodySmall" color={Rakaz.InkSecondary}>
          يتم حفظ كل الإجراءات على الجهاز ومزامنتها تلقائياً عند عودة الاتصال.
        </AppText>
      </MenuGroup>

      {state.pending.length > 0 ? (
        <MenuGroup title="سجل الانتظار">
          {state.pending
            .slice(-8)
            .reverse()
            .map((a) => {
              const student = a.studentId ? findStudent(state, a.studentId) : undefined;
              return (
                <View key={a.id} style={styles.pendingRow}>
                  <Check color={Rakaz.Gold} size={18} />
                  <View style={styles.flex}>
                    <AppText variant="titleSmall">{ActionKindTitle[a.kind]}</AppText>
                    {student ? (
                      <AppText variant="bodySmall" color={Rakaz.InkSecondary}>
                        {student.name}
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="labelSmall" color={Rakaz.InkSecondary}>
                    {ArabicFormat.time(a.timestamp)}
                  </AppText>
                </View>
              );
            })}
        </MenuGroup>
      ) : null}

      <MenuGroup title="الحساب">
        <PressableScale
          onPress={() => {
            onDismiss();
            router.push('/change-password');
          }}
          accessibilityLabel="تغيير كلمة المرور"
          style={styles.linkRow}
        >
          <KeyRound color={Rakaz.Navy} size={20} />
          <AppText variant="bodyLarge" style={styles.flex}>
            تغيير كلمة المرور
          </AppText>
          <ChevronLeft color={Rakaz.InkSecondary} size={18} />
        </PressableScale>
        <PressableScale
          onPress={() => {
            onDismiss();
            router.push('/delete-account');
          }}
          accessibilityLabel="حذف الحساب"
          style={styles.linkRow}
        >
          <Trash2 color={Rakaz.Red} size={20} />
          <AppText variant="bodyLarge" color={Rakaz.Red} style={styles.flex}>
            حذف الحساب
          </AppText>
          <ChevronLeft color={Rakaz.InkSecondary} size={18} />
        </PressableScale>
      </MenuGroup>

      {profile?.adminPhone ? (
        <BrandButton title="الاتصال بالإدارة" icon={Phone} kind="OUTLINE" onPress={() => onCall(profile.adminPhone)} />
      ) : null}
      <PressableScale onPress={() => setConfirmLogout(true)} accessibilityLabel="تسجيل الخروج" style={styles.logout}>
        <LogOut color={Rakaz.Red} size={20} />
        <AppText variant="labelLarge" color={Rakaz.Red}>
          تسجيل الخروج
        </AppText>
      </PressableScale>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dim: { opacity: 0.4 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  group: { gap: 6 },
  groupBody: { borderRadius: 18, backgroundColor: Rakaz.Canvas, paddingHorizontal: 16, paddingVertical: 10 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: withAlpha(Rakaz.Line, 0.6),
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  logout: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
