import {
  Bell,
  Bus,
  CalendarMinus,
  ChevronLeft,
  CreditCard,
  Ellipsis,
  House,
  IdCard,
  KeyRound,
  LogOut,
  type LucideIcon,
  MapPinned,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { type ReactNode, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { BrandScreen, HeaderBar } from '@/components/Brand';
import { PrimaryButton } from '@/components/Buttons';
import { PressableScale } from '@/components/PressableScale';
import { IconBadge, RowDivider, SectionTitle, StatusPill, StudentAvatar } from '@/components/Primitives';
import { card, heroShadow, shadow, Theme, withAlpha } from '@/constants/theme';
import { useAppNav } from '@/hooks/useAppNav';
import { useFamily } from '@/store/familyStore';
import { useSession } from '@/store/sessionStore';
import { AccountStatusTitle, AccountTypeTitle, addressSummary, Gender, shortName, type Student, studentAge, subscriptionStatus } from '@/types/models';
import { showAlert } from '@/utils/dialog';
import { Fmt } from '@/utils/fmt';
import { Haptics } from '@/utils/haptics';

function maskedContact(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return Fmt.digits(`0${d.slice(3, 6)} ••• ${d.slice(-4)}`);
}

/** "ملف العائلة" (designs 73 / 78): family header, children, addresses, authorized contacts and settings. */
export default function FamilyScreen() {
  const store = useFamily();
  const session = useSession();
  const nav = useAppNav();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const account = session.account;
  const student = store.student;
  const initials = (account?.name ?? '')
    .split(' ')
    .filter((p) => p.length > 0)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join(' ');

  const header = (
    <View style={styles.header}>
      <HeaderBar
        leading={{ icon: Pencil, label: 'تعديل العنوان', onPress: () => nav.address(store.state.selectedStudentID) }}
        trailing={{ icon: Bell, label: 'الإشعارات', badge: store.unreadCount > 0, onPress: nav.showNotifications }}
      >
        <View>
          <AppText size="caption" color={withAlpha(Theme.white, 0.55)} align="center">
            ركاز · مساحة العائلة
          </AppText>
          <AppText size="headline" weight="bold" color={Theme.white} align="center">
            ملف العائلة
          </AppText>
        </View>
      </HeaderBar>
      <View style={styles.row14}>
        <View style={styles.monogram}>
          <AppText size="title2" weight="bold" color={Theme.goldLight} align="center">
            {initials}
          </AppText>
        </View>
        <View style={styles.flexGap1}>
          <AppText size="title3" weight="bold" color={Theme.white}>
            {account?.familyName ?? ''}
          </AppText>
          <AppText size="caption" color={withAlpha(Theme.white, 0.6)}>
            {`${account ? AccountTypeTitle[account.type] : 'ولي الأمر'} · ${account?.name ?? ''}`}
          </AppText>
        </View>
      </View>
    </View>
  );

  // The guardian registered by the administration is the only person the driver hands the child to.
  const people: [string, string, string][] = [[student.guardianName, 'ولي الأمر · جهة أساسية', student.guardianPhone]];

  return (
    <BrandScreen overlap={60} header={header}>
      <View style={[card(18, 26), heroShadow, styles.between]}>
        <View>
          <AppText size="caption" color={Theme.muted}>
            أطفال مسجلون
          </AppText>
          <View style={styles.baseline}>
            <AppText size={32} weight="bold">
              {Fmt.digits(String(store.state.students.length))}
            </AppText>
            <AppText size="footnote" color={Theme.muted}>
              أطفال
            </AppText>
          </View>
        </View>
        <View style={styles.stack}>
          {store.state.students.map((s, i) => (
            <View key={s.id} style={[styles.stackItem, i > 0 ? styles.stackOverlap : null]}>
              <StudentAvatar student={s} size={36} filled round />
            </View>
          ))}
        </View>
      </View>

      <SectionTitle
        title="أطفالي"
        action="إضافة طفل"
        actionIcon={Plus}
        onAction={() => showAlert('إضافة طفل', 'تتم إضافة الأطفال الجدد عبر إدارة ركاز بعد التحقق من التسجيل. تواصل معنا من مركز المساعدة.')}
      />
      {store.state.students.map((s) => (
        <ChildCard key={s.id} student={s} />
      ))}

      <SectionTitle title="العناوين" action="تعديل" actionIcon={Pencil} onAction={() => nav.address(store.state.selectedStudentID)} />
      <View style={styles.addresses}>
        <PressableScale scale={0.99} accessibilityLabel="عنوان المنزل" onPress={() => nav.address(student.id)} style={{ backgroundColor: withAlpha(Theme.cream, 0.7) }}>
          <AddressRow
            icon={House}
            title="عنوان المنزل"
            subtitle={`${addressSummary(student.address)}، ${student.address.governorate}`}
            tint={Theme.gold}
            soft={Theme.goldSoft}
            trailing={<StatusPill title="أساسي" tint={Theme.greenDeep} soft={Theme.greenSoft} />}
          />
        </PressableScale>
        <View style={styles.hairline} />
        <PressableScale scale={0.99} accessibilityLabel={student.school.name} onPress={nav.school}>
          <AddressRow
            icon={MapPinned}
            title={student.school.name}
            subtitle={student.school.address}
            tint={Theme.ink}
            soft={Theme.sageSoft}
            trailing={
              <AppText size="caption2" color={Theme.muted}>
                مدرسة
              </AppText>
            }
          />
        </PressableScale>
      </View>

      <SectionTitle title="جهات الاستلام المصرّح لها" />
      <View style={styles.gap10}>
        {people.map(([name, role, phone]) => (
          <View key={name} style={[card(14, 20), styles.row12]}>
            <View style={styles.contactInitial}>
              <AppText size="headline" weight="bold" align="center">
                {name.charAt(0)}
              </AppText>
            </View>
            <View style={styles.flexGap1}>
              <AppText size="subheadline" weight="bold">
                {name}
              </AppText>
              <AppText size="caption" color={Theme.muted}>
                {role}
              </AppText>
            </View>
            <View style={styles.ltrRow}>
              <Phone size={12} color={Theme.muted} />
              <AppText size="caption" color={Theme.muted}>
                {maskedContact(phone)}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <SectionTitle title="الحساب" />
      <View style={card(8)}>
        <MenuRow icon={CreditCard} title="الاشتراك والمدفوعات" tint={Theme.gold} soft={Theme.goldSoft} onPress={nav.finance} />
        <RowDivider inset={56} />
        <MenuRow icon={IdCard} title="بيانات السائق والمركبة" tint={Theme.ink} soft={Theme.blueSoft} onPress={nav.driver} />
        <RowDivider inset={56} />
        <MenuRow icon={CalendarMinus} title="سجل الغياب" tint={Theme.red} soft={Theme.redSoft} onPress={nav.absences} />
        <RowDivider inset={56} />
        <MenuRow icon={Bell} title="الإشعارات" tint={Theme.greenDeep} soft={Theme.greenSoft} badge={store.unreadCount} onPress={nav.notifications} />
        <RowDivider inset={56} />
        <MenuRow icon={SlidersHorizontal} title="إعدادات الإشعارات" tint={Theme.muted} soft={Theme.canvas} onPress={nav.notificationSettings} />
        <RowDivider inset={56} />
        <MenuRow icon={KeyRound} title="تغيير كلمة المرور" tint={Theme.ink} soft={Theme.blueSoft} onPress={nav.changePassword} />
        {store.state.support.privacyPolicyUrl ? (
          <>
            <RowDivider inset={56} />
            <MenuRow
              icon={ShieldCheck}
              title="سياسة الخصوصية"
              tint={Theme.muted}
              soft={Theme.canvas}
              onPress={() => void Linking.openURL(store.state.support.privacyPolicyUrl)}
            />
          </>
        ) : null}
        <RowDivider inset={56} />
        <MenuRow icon={Trash2} title="حذف الحساب" tint={Theme.red} soft={Theme.redSoft} onPress={nav.deleteAccount} />
      </View>

      <PrimaryButton title="تسجيل الخروج" icon={LogOut} fill={Theme.redSoft} foreground={Theme.red} onPress={() => setConfirmLogout(true)} />
      <AppText size="caption" color={Theme.muted} align="center">
        {`ركاز للنقل العام · الإصدار ${Fmt.digits(Constants.expoConfig?.version ?? '')}`}
      </AppText>

      <ActionSheet
        visible={confirmLogout}
        title="هل تريد تسجيل الخروج؟"
        actions={[{ label: 'تسجيل الخروج', destructive: true, onPress: session.logout }]}
        onClose={() => setConfirmLogout(false)}
      />
    </BrandScreen>
  );
}

function AddressRow({ icon, title, subtitle, tint, soft, trailing }: { icon: LucideIcon; title: string; subtitle: string; tint: string; soft: string; trailing: ReactNode }) {
  return (
    <View style={[styles.row12, styles.pad16]}>
      <IconBadge icon={icon} tint={tint} soft={soft} size={44} />
      <View style={styles.flexGap1}>
        <AppText size="subheadline" weight="bold">
          {title}
        </AppText>
        <AppText size="caption" color={Theme.muted} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {trailing}
    </View>
  );
}

function MenuRow({ icon, title, tint, soft, badge = 0, onPress }: { icon: LucideIcon; title: string; tint: string; soft: string; badge?: number; onPress: () => void }) {
  return (
    <PressableScale scale={0.98} accessibilityLabel={title} onPress={onPress} style={[styles.row12, styles.pad10]}>
      <IconBadge icon={icon} tint={tint} soft={soft} size={38} />
      <AppText size="subheadline" weight="semibold" style={styles.flex}>
        {title}
      </AppText>
      {badge > 0 ? (
        <View style={styles.badge}>
          <AppText size="caption2" weight="bold" color={Theme.white} align="center">
            {Fmt.digits(String(badge))}
          </AppText>
        </View>
      ) : null}
      <ChevronLeft size={14} color={withAlpha(Theme.muted, 0.6)} strokeWidth={2.6} />
    </PressableScale>
  );
}

/** Child card with avatar, grade/age, enrolment status and the bus strip (design 78). */
function ChildCard({ student }: { student: Student }) {
  const store = useFamily();
  const nav = useAppNav();
  const [menu, setMenu] = useState(false);
  const sub = store.subscriptionFor(student.id);
  const age = studentAge(student);
  const onRoute = student.routeName != null;
  return (
    <View style={[card(16), styles.gap12]}>
      <View style={[styles.row12, styles.alignTop]}>
        <StudentAvatar student={student} size={52} filled />
        <View style={styles.flexGap2}>
          <AppText size="headline" weight="bold">
            {shortName(student)}
          </AppText>
          <AppText size="caption" color={Theme.muted}>
            {age != null ? `${student.grade} · ${Fmt.digits(String(age))} سنوات` : student.grade}
          </AppText>
          {onRoute ? (
            <View style={[styles.row4, styles.enrolled]}>
              <View style={styles.greenDot} />
              <AppText size="caption" weight="semibold" color={Theme.greenDeep}>
                {student.gender === Gender.female ? 'مسجلة في الرحلة' : 'مسجّل في الرحلة'}
              </AppText>
            </View>
          ) : (
            <AppText size="caption" weight="semibold" color={Theme.muted}>
              بانتظار إسناد مسار من الإدارة
            </AppText>
          )}
        </View>
        <PressableScale accessibilityLabel="خيارات" onPress={() => setMenu(true)} style={styles.menuButton}>
          <Ellipsis size={20} color={Theme.muted} strokeWidth={2.4} />
        </PressableScale>
      </View>
      <PressableScale scale={0.98} accessibilityLabel="التفاصيل" onPress={() => nav.student(student.id)} style={styles.busStrip}>
        <Bus size={14} color={Theme.ink} />
        <AppText size="caption" weight="medium" style={styles.flex}>
          {student.driver.assigned ? `حافلة ${student.driver.vehicle.busNumber} · ${student.routeName ?? ''}` : 'لم تُحدَّد الحافلة بعد'}
        </AppText>
        <AppText size="caption" weight="bold" color={Theme.gold}>
          التفاصيل
        </AppText>
        <ChevronLeft size={11} color={Theme.gold} strokeWidth={3} />
      </PressableScale>
      <ActionSheet
        visible={menu}
        title={shortName(student)}
        actions={[
          { label: 'ملف الطالب', icon: IdCard, onPress: () => nav.student(student.id) },
          { label: 'العنوان', icon: MapPinned, onPress: () => nav.address(student.id) },
          {
            label: `الاشتراك: ${sub ? AccountStatusTitle[subscriptionStatus(sub)] : 'غير مسجّل'}`,
            icon: CreditCard,
            onPress: () => {
              store.select(student.id);
              nav.finance();
            },
          },
        ]}
        onClose={() => {
          Haptics.tap();
          setMenu(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 20 },
  flex: { flex: 1 },
  flexGap1: { flex: 1, gap: 1 },
  flexGap2: { flex: 1, gap: 2 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row14: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  alignTop: { alignItems: 'flex-start' },
  pad10: { padding: 10 },
  pad16: { padding: 16 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  endAligned: { alignItems: 'flex-end', gap: 2 },
  hairline: { height: 1, backgroundColor: Theme.line },
  monogram: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#2A2E2B',
    borderWidth: 1,
    borderColor: withAlpha(Theme.gold, 0.4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: Theme.greenDeep },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: withAlpha(Theme.white, 0.8) },
  stack: { flexDirection: 'row' },
  stackItem: { borderRadius: 20, borderWidth: 2, borderColor: Theme.white },
  stackOverlap: { marginStart: -8 },
  addresses: { backgroundColor: Theme.card, borderRadius: 24, overflow: 'hidden', boxShadow: shadow(6, 16, 0.06) },
  contactInitial: { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.blueSoft, alignItems: 'center', justifyContent: 'center' },
  ltrRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  badge: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, backgroundColor: Theme.gold, minWidth: 22 },
  enrolled: { paddingTop: 2 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Theme.green },
  menuButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  busStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: Theme.sageSoft },
});
