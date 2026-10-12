import {
  ArrowLeft,
  Bell,
  Bus,
  Calendar,
  CalendarMinus,
  Check,
  ChevronLeft,
  CircleCheck,
  Clock,
  Info,
  type LucideIcon,
  MapPin,
  MapPinned,
  MessageSquare,
  Phone,
  Radio,
  RotateCw,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BrandScreen, HeaderBar, StudentSwitcher } from '@/components/Brand';
import { PressableScale } from '@/components/PressableScale';
import { IconBadge, LogoBadge, RowDivider, SectionTitle, StatusPill } from '@/components/Primitives';
import { card, heroShadow, shadow, Theme, withAlpha } from '@/constants/theme';
import { useAppNav } from '@/hooks/useAppNav';
import { useFamily } from '@/store/familyStore';
import {
  eventDate,
  hasArrived,
  isActive,
  isPickedUp,
  type Trip,
  TripKind,
  TripKindTitle,
  TripStatus,
  tripDestination,
  tripOrigin,
  tripStatusTitle,
} from '@/types/models';
import { Fmt } from '@/utils/fmt';
import { Haptics } from '@/utils/haptics';

/** "رحلات اليوم": daily schedule, both trips as cards, pickup confirmations and the upcoming driver. */
export default function TripsScreen() {
  const store = useFamily();
  const nav = useAppNav();
  const student = store.student;
  const family = student.guardianName.split(' ')[0];

  const header = (
    <View style={styles.header}>
      <HeaderBar
        leading={{ icon: User, label: 'العائلة', onPress: () => nav.openTab('family') }}
        trailing={{ icon: Bell, label: 'الإشعارات', badge: store.unreadCount > 0, onPress: nav.showNotifications }}
      >
        <LogoBadge height={36} />
      </HeaderBar>
      <View style={styles.gap2}>
        <AppText size="subheadline" color={withAlpha(Theme.white, 0.7)}>
          {`متابعة رحلات ${family ? `عائلة ${family}` : 'العائلة'}`}
        </AppText>
        <View style={styles.titleRow}>
          <AppText size={30} weight="bold" color={Theme.white}>
            رحلات اليوم
          </AppText>
          <AppText size="caption" color={withAlpha(Theme.white, 0.55)}>
            {Fmt.dayDate(Date.now())}
          </AppText>
        </View>
      </View>
      {store.state.students.length > 1 ? (
        <View style={styles.switcher}>
          <StudentSwitcher dark />
        </View>
      ) : null}
    </View>
  );

  return (
    <BrandScreen overlap={76} header={header}>
      <ScheduleCard />
      <SectionTitle title={`خط سير ${student.firstName}`} action="تحديث" actionIcon={RotateCw} onAction={() => void store.refreshTrips()} />
      <TripCard kind={TripKind.morning} />
      <TripCard kind={TripKind.afternoon} />
      <Confirmations />
      <DriverStrip />
      <View style={[card(14, 20), styles.between]}>
        <View style={styles.row6}>
          <MessageSquare size={16} color={Theme.ink} />
          <AppText size="subheadline" weight="medium">
            تحتاج إلى مساعدة؟
          </AppText>
        </View>
        <PressableScale
          accessibilityLabel="تواصل معنا"
          onPress={() => {
            Haptics.tap();
            nav.openTab('support');
          }}
          style={styles.contactButton}
        >
          <AppText size="footnote" weight="bold" color={Theme.white}>
            تواصل معنا
          </AppText>
        </PressableScale>
      </View>
      <View style={[styles.row6, styles.lastUpdate]}>
        <MapPinned size={14} color={Theme.muted} />
        <AppText size="caption" color={Theme.muted}>
          {`آخر تحديث للجدول ${Fmt.relative(store.activeTrip.updatedAt)}`}
        </AppText>
      </View>
    </BrandScreen>
  );
}

function ScheduleCard() {
  const store = useFamily();
  return (
    <View style={[card(16, 26), heroShadow, styles.gap14]}>
      <View style={styles.row12}>
        <IconBadge icon={Calendar} tint={Theme.ink} soft={Theme.blueSoft} size={44} />
        <View style={styles.flexGap1}>
          <AppText size="headline" weight="bold">
            الجدول اليومي
          </AppText>
          <AppText size="caption" color={Theme.muted}>
            {`رحلتان مقررتان لـ${store.student.firstName}`}
          </AppText>
        </View>
        <StatusPill title="اليوم" tint={Theme.greenDeep} soft={Theme.greenSoft} />
      </View>
      <View style={styles.row10}>
        <Slot kind={TripKind.morning} bg="#F1F5F7" />
        <Slot kind={TripKind.afternoon} bg={Theme.cream} />
      </View>
    </View>
  );
}

function slotNote(trip: Trip): string {
  if (isPickedUp(trip)) return hasArrived(trip) ? 'وصلت بأمان ✓' : 'تم الالتقاط ✓';
  if (isActive(trip.status)) return tripStatusTitle(trip.status, trip.kind);
  const mins = Math.trunc((trip.scheduledStart - Date.now()) / 60_000);
  if (mins > 60) return `بعد ${Fmt.digits(String(Math.trunc(mins / 60)))} ساعات`;
  if (mins > 0) return `بعد ${Fmt.minutes(mins)}`;
  return 'مجدولة';
}

function Slot({ kind, bg }: { kind: TripKind; bg: string }) {
  const store = useFamily();
  const nav = useAppNav();
  const trip = store.trip(kind);
  const absent = store.isAbsent(kind);
  return (
    <PressableScale accessibilityLabel={TripKindTitle[kind]} onPress={() => nav.liveTrip(kind)} style={[styles.slot, { backgroundColor: bg }]}>
      <AppText size="caption" color={kind === TripKind.morning ? Theme.muted : Theme.gold}>
        {kind === TripKind.morning ? 'الذهاب' : 'العودة'}
      </AppText>
      <AppText size="title2" weight="bold">
        {Fmt.clock(trip.scheduledStart)}
      </AppText>
      <AppText size="caption" color={absent ? Theme.red : Theme.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {absent ? 'غياب مُبلَّغ' : slotNote(trip)}
      </AppText>
    </PressableScale>
  );
}

function Confirmations() {
  const store = useFamily();
  const m = store.state.morningTrip;
  const r = store.state.returnTrip;
  const confirmedAt = store.state.handoverConfirmedAt;
  const name = store.student.firstName;
  const picked = eventDate(m, TripStatus.studentPickedUp);
  const arrived = eventDate(m, TripStatus.arrivedAtSchool);
  return (
    <View style={styles.gap10}>
      <SectionTitle title="تأكيدات الاستلام" />
      <View style={card(8)}>
        <ConfirmationRow
          done={isPickedUp(m)}
          title={isPickedUp(m) ? `تم استلام ${name} بأمان` : `بانتظار استلام ${name}`}
          subtitle={picked != null ? `من المنزل · ${Fmt.time(picked)}` : 'رحلة الذهاب'}
        />
        <RowDivider inset={60} />
        <ConfirmationRow
          done={hasArrived(m)}
          title={hasArrived(m) ? `وصلت ${name} إلى المدرسة` : 'الوصول إلى المدرسة'}
          subtitle={arrived != null ? `عند بوابة المدرسة · ${Fmt.time(arrived)}` : `متوقع ${Fmt.clock(store.etaDate(TripKind.morning))}`}
        />
        <RowDivider inset={60} />
        <ConfirmationRow
          done={confirmedAt != null}
          title={confirmedAt != null ? `أكدتَ استلام ${name} في المنزل` : 'تأكيد الاستلام في المنزل'}
          subtitle={confirmedAt != null ? Fmt.time(confirmedAt) : hasArrived(r) ? 'بانتظار تأكيدك' : 'بعد رحلة العودة'}
        />
      </View>
    </View>
  );
}

function ConfirmationRow({ done, title, subtitle }: { done: boolean; title: string; subtitle: string }) {
  const Icon = done ? Check : Clock;
  return (
    <View style={[styles.row12, styles.pad10]}>
      <View style={[styles.confirmIcon, { backgroundColor: done ? Theme.greenSoft : Theme.canvas }]}>
        <Icon size={18} color={done ? Theme.greenDeep : Theme.muted} strokeWidth={2.4} />
        {done ? <View style={styles.confirmDot} /> : null}
      </View>
      <View style={styles.flexGap1}>
        <AppText size="subheadline" weight="bold" color={done ? Theme.ink : Theme.muted}>
          {title}
        </AppText>
        <AppText size="caption" color={Theme.muted}>
          {subtitle}
        </AppText>
      </View>
      {done ? <ShieldCheck size={18} color={Theme.gold} /> : null}
    </View>
  );
}

function DriverStrip() {
  const store = useFamily();
  const nav = useAppNav();
  const driver = store.student.driver;
  return (
    <View style={styles.driverStrip}>
      <Pressable accessibilityRole="button" accessibilityLabel="السائق" onPress={nav.driver} style={[styles.row12, styles.flex]}>
        <View style={styles.whiteCircle}>
          <Bus size={18} color={Theme.ink} />
        </View>
        <View style={styles.flexGap1}>
          <AppText size="subheadline" weight="bold">
            السائق في الرحلة القادمة
          </AppText>
          <AppText size="caption" color={Theme.muted}>
            {`${driver.name} · ${driver.vehicle.plateNumber}`}
          </AppText>
        </View>
      </Pressable>
      <PressableScale accessibilityLabel="الاتصال بالسائق" onPress={() => void Linking.openURL(`tel:${driver.phone}`)} style={styles.whiteCircle}>
        <Phone size={16} color={Theme.ink} />
      </PressableScale>
    </View>
  );
}

interface CardState {
  icon: LucideIcon;
  tint: string;
  soft: string;
  pill: string;
  foot: string;
  footIcon: LucideIcon;
  footTint: string;
  highlight: boolean;
}

/** One trip ("رحلة الذهاب" / "رحلة العودة") as in designs 43 and 48. */
function TripCard({ kind }: { kind: TripKind }) {
  const store = useFamily();
  const nav = useAppNav();
  const trip = store.trip(kind);
  const absent = store.isAbsent(kind);
  const school = store.student.school.name;

  const state: CardState = (() => {
    if (absent) {
      return { icon: CalendarMinus, tint: Theme.red, soft: Theme.redSoft, pill: 'غياب', foot: 'تم إبلاغ الإدارة والسائق بالغياب', footIcon: Info, footTint: Theme.red, highlight: false };
    }
    switch (trip.status) {
      case TripStatus.arrivedAtSchool:
      case TripStatus.finished: {
        const d = eventDate(trip, TripStatus.arrivedAtSchool);
        return {
          icon: CircleCheck,
          tint: Theme.greenDeep,
          soft: Theme.greenSoft,
          pill: 'وصلت بأمان',
          foot: d != null ? `تم تسجيل الوصول ${kind === TripKind.morning ? 'عند بوابة المدرسة' : 'إلى المنزل'} · ${Fmt.time(d)}` : 'اكتملت الرحلة',
          footIcon: Check,
          footTint: Theme.muted,
          highlight: false,
        };
      }
      case TripStatus.notStarted:
        return { icon: Clock, tint: Theme.gold, soft: Theme.goldSoft, pill: 'مجدولة', foot: 'سيصلك تنبيه عند اقتراب الحافلة', footIcon: Bell, footTint: Theme.muted, highlight: kind === store.state.activeKind };
      default:
        return { icon: MapPin, tint: Theme.gold, soft: Theme.goldSoft, pill: 'جارية الآن', foot: tripStatusTitle(trip.status, kind), footIcon: Radio, footTint: Theme.gold, highlight: true };
    }
  })();
  const Icon = state.icon;
  const FootIcon = state.footIcon;

  return (
    <PressableScale
      scale={0.98}
      accessibilityLabel={TripKindTitle[kind]}
      onPress={() => nav.liveTrip(kind)}
      style={[
        styles.tripCard,
        { backgroundColor: state.highlight ? withAlpha(Theme.cream, 0.6) : Theme.card, borderColor: state.highlight ? withAlpha(Theme.goldLight, 0.7) : 'transparent' },
      ]}
    >
      <View style={[styles.row12, styles.alignTop]}>
        <View style={[styles.tripIcon, { backgroundColor: state.soft }]}>
          <Icon size={24} color={state.tint} strokeWidth={1.7} />
        </View>
        <View style={styles.flex}>
          <AppText size="headline" weight="bold">
            {TripKindTitle[kind]}
          </AppText>
          <View style={styles.baseline}>
            <AppText size={26} weight="bold">
              {Fmt.clock(trip.scheduledStart)}
            </AppText>
            <AppText size="caption" color={Theme.muted}>
              {kind === TripKind.morning ? 'صباحاً' : 'ظهراً'}
            </AppText>
          </View>
        </View>
        <StatusPill title={state.pill} tint={state.tint} soft={state.soft} />
      </View>
      <View style={styles.hairline} />
      <View style={styles.row6}>
        <View style={styles.greenDot} />
        <AppText size="caption" weight="medium" color={Theme.muted} numberOfLines={1} style={styles.shrink}>
          {tripOrigin(kind) === 'المنزل' ? 'منزل العائلة' : school}
        </AppText>
        <ArrowLeft size={11} color={withAlpha(Theme.muted, 0.6)} />
        <AppText size="caption" weight="medium" numberOfLines={1} style={styles.shrink}>
          {tripDestination(kind) === 'المنزل' ? 'منزل العائلة' : school}
        </AppText>
      </View>
      <View style={styles.row6}>
        <FootIcon size={13} color={state.footTint} />
        <AppText size="caption" color={state.footTint} numberOfLines={1} style={styles.flex}>
          {state.foot}
        </AppText>
        <AppText size="caption" color={Theme.muted}>
          التفاصيل
        </AppText>
        <ChevronLeft size={11} color={Theme.muted} strokeWidth={2.6} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { gap: 16 },
  gap2: { gap: 2 },
  gap10: { gap: 10 },
  gap14: { gap: 14 },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  flexGap1: { flex: 1, gap: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  switcher: { marginHorizontal: -20 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row10: { flexDirection: 'row', gap: 10 },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alignTop: { alignItems: 'flex-start' },
  pad10: { padding: 10 },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  hairline: { height: 1, backgroundColor: Theme.line },
  lastUpdate: { paddingTop: 2, paddingHorizontal: 4 },
  contactButton: { height: 40, paddingHorizontal: 16, borderRadius: 10, backgroundColor: Theme.navyRaised, alignItems: 'center', justifyContent: 'center' },
  slot: { flex: 1, padding: 14, borderRadius: 16, gap: 4 },
  confirmIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmDot: { position: 'absolute', bottom: -2, end: -2, width: 11, height: 11, borderRadius: 6, backgroundColor: Theme.green, borderWidth: 2, borderColor: Theme.white },
  driverStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: '#EAF0F5' },
  whiteCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.white, alignItems: 'center', justifyContent: 'center' },
  tripCard: { padding: 16, borderRadius: 24, borderWidth: 1, gap: 12, boxShadow: shadow(6, 16, 0.06) },
  tripIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Theme.green },
});
