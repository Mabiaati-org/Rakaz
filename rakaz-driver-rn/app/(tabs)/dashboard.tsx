import { router } from 'expo-router';
import {
  Armchair,
  Bus,
  CalendarDays,
  Check,
  ChevronLeft,
  CloudCheck,
  CloudUpload,
  Trophy,
  UserX,
  Users,
  Wifi,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { BrandHeader, SectionTitle } from '@/components/Components';
import { PressableScale } from '@/components/PressableScale';
import { Rakaz, card, withAlpha } from '@/constants/theme';
import { useDriverStore } from '@/store/driverStore';
import { useUiStore } from '@/store/uiStore';
import { TripPhase } from '@/types/models';
import { ArabicFormat, arabicDigits } from '@/utils/arabicFormat';

function ProgressRing({ progress, done, total }: { progress: number; done: number; total: number }) {
  const size = 92;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = useRef(new Animated.Value(progress)).current;
  const [shown, setShown] = useState(progress);
  useEffect(() => {
    const id = value.addListener(({ value: v }) => setShown(v));
    Animated.spring(value, { toValue: progress, stiffness: 80, damping: 14, useNativeDriver: false }).start();
    return () => value.removeListener(id);
  }, [progress, value]);
  return (
    <View style={styles.ring}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={withAlpha(Rakaz.White, 0.12)} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={Rakaz.Gold}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, shown)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <AppText variant="headlineSmall" color={Rakaz.White} style={styles.center}>
        {ArabicFormat.number(done)}
      </AppText>
      <AppText variant="labelSmall" color={withAlpha(Rakaz.White, 0.6)} style={styles.center}>
        {`من ${ArabicFormat.number(total)}`}
      </AppText>
    </View>
  );
}

function HeroCard() {
  const { state, derived } = useDriverStore();
  return (
    <PressableScale onPress={() => router.navigate('/')} accessibilityLabel={derived.tripTitle} style={styles.hero}>
      <View style={[styles.flex, styles.heroText]}>
        <AppText variant="labelMedium" color={Rakaz.Gold}>
          {ArabicFormat.day(Date.now())}
        </AppText>
        <AppText variant="headlineSmall" color={Rakaz.White}>
          {derived.tripTitle}
        </AppText>
        <AppText variant="bodySmall" color={withAlpha(Rakaz.White, 0.7)}>
          {`مسار ${state.route.code} · ${state.profile?.busNumber ?? ''}`}
        </AppText>
        <View style={styles.heroCta}>
          <AppText variant="labelMedium">{state.trip.phase === TripPhase.IDLE ? 'ابدأ الرحلة' : 'متابعة الرحلة'}</AppText>
          <ChevronLeft color={Rakaz.Ink} size={18} />
        </View>
      </View>
      <ProgressRing progress={derived.progress} done={derived.doneCount} total={derived.legStops.length} />
    </PressableScale>
  );
}

function StatTile({ title, value, icon: Icon, tint }: { title: string; value: number; icon: LucideIcon; tint: string }) {
  return (
    <View style={[card(), styles.stat]}>
      <View style={[styles.statIcon, { backgroundColor: withAlpha(tint, 0.12) }]}>
        <Icon color={tint} size={20} />
      </View>
      <AppText variant="headlineMedium">{ArabicFormat.number(value)}</AppText>
      <AppText variant="labelMedium" color={Rakaz.InkSecondary}>
        {title}
      </AppText>
    </View>
  );
}

function TripRow({ title, time, done, active }: { title: string; time: string; done: boolean; active: boolean }) {
  const { state } = useDriverStore();
  const Icon = done ? Check : Bus;
  return (
    <View style={styles.tripRow}>
      <View style={[styles.statIcon, { backgroundColor: done ? Rakaz.Green : Rakaz.GoldSoft }]}>
        <Icon color={done ? Rakaz.White : Rakaz.GoldDeep} size={20} />
      </View>
      <View style={styles.flex}>
        <AppText variant="titleSmall">{title}</AppText>
        <AppText variant="bodySmall" color={Rakaz.InkSecondary}>
          {state.route.school.name}
        </AppText>
      </View>
      <AppText variant="labelMedium" color={done ? Rakaz.Green : active ? Rakaz.GoldDeep : Rakaz.InkSecondary}>
        {done ? 'مكتملة' : active ? 'الحالية' : arabicDigits(time)}
      </AppText>
    </View>
  );
}

function TripsCard() {
  const { state } = useDriverStore();
  const phase = state.trip.phase;
  const stops = state.route.stops;
  return (
    <View style={[card(), styles.cardBody]}>
      <SectionTitle title="رحلات اليوم" icon={CalendarDays} />
      <TripRow
        title="رحلة الصباح"
        time={stops[0]?.pickupTime ?? ''}
        done={phase !== TripPhase.IDLE && phase !== TripPhase.MORNING_PICKUP}
        active={phase === TripPhase.IDLE || phase === TripPhase.MORNING_PICKUP}
      />
      <TripRow
        title="رحلة العودة"
        time={stops[stops.length - 1]?.dropoffTime ?? ''}
        done={phase === TripPhase.COMPLETED}
        active={phase === TripPhase.RETURN_TRIP || phase === TripPhase.AT_SCHOOL}
      />
      <View style={[styles.tripRow, styles.totalRow]}>
        <Trophy color={Rakaz.InkSecondary} size={18} />
        <AppText variant="bodySmall" color={Rakaz.InkSecondary} style={styles.flex}>
          إجمالي الرحلات المنجزة
        </AppText>
        <AppText variant="titleMedium">{ArabicFormat.number(state.completedTripsTotal)}</AppText>
      </View>
    </View>
  );
}

function SyncCard() {
  const store = useDriverStore();
  const { state } = store;
  const synced = state.pending.length === 0;
  const Icon = synced ? CloudCheck : CloudUpload;
  return (
    <View style={[card(), styles.cardBody]}>
      <View style={styles.tripRow}>
        <Icon color={synced ? Rakaz.Green : Rakaz.Orange} size={28} />
        <View style={styles.flex}>
          <AppText variant="titleSmall">
            {synced ? 'كل البيانات متزامنة' : `${ArabicFormat.number(state.pending.length)} إجراءات محفوظة محلياً`}
          </AppText>
          <AppText variant="bodySmall" color={Rakaz.InkSecondary}>
            تعمل الوظائف الأساسية دون إنترنت وتُزامن تلقائياً
          </AppText>
        </View>
      </View>
      <PressableScale onPress={store.checkConnection} accessibilityLabel="فحص الاتصال" style={styles.checkButton}>
        {state.isChecking || state.isSyncing ? <ActivityIndicator color={Rakaz.Navy} size="small" /> : <Wifi color={Rakaz.Navy} size={18} />}
        <AppText variant="labelMedium" color={Rakaz.Navy}>
          فحص الاتصال
        </AppText>
      </PressableScale>
    </View>
  );
}

/** How many of today's two legs (morning, return) the driver has started. */
function legsStartedToday(phase: TripPhase): number {
  if (phase === TripPhase.IDLE) return 0;
  return phase === TripPhase.RETURN_TRIP || phase === TripPhase.COMPLETED ? 2 : 1;
}

export default function DashboardScreen() {
  const { state, derived } = useDriverStore();
  const ui = useUiStore();
  return (
    <View style={styles.root}>
      <BrandHeader
        subtitle={`مرحباً ${state.profile?.name ?? ''}`}
        title="لوحة السائق"
        isOnline={derived.isOnline}
        pendingCount={state.pending.length}
        onMenu={ui.openMenu}
      />
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        <HeroCard />
        <View style={styles.statsRow}>
          <StatTile title="عدد الطلاب" value={state.route.students.length} icon={Users} tint={Rakaz.Gold} />
          <StatTile title="رحلات اليوم" value={legsStartedToday(state.trip.phase)} icon={Bus} tint={Rakaz.Navy} />
        </View>
        <View style={styles.statsRow}>
          <StatTile title="على متن الحافلة" value={derived.onBoardCount} icon={Armchair} tint={Rakaz.Green} />
          <StatTile title="غياب اليوم" value={derived.absentCount} icon={UserX} tint={Rakaz.Red} />
        </View>
        <TripsCard />
        <SyncCard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Rakaz.Canvas },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  scroll: { padding: 16, gap: 16 },
  hero: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, backgroundColor: Rakaz.Navy, padding: 18, gap: 12 },
  heroText: { gap: 6 },
  heroCta: {
    marginTop: 6,
    height: 36,
    alignSelf: 'flex-start',
    borderRadius: 18,
    backgroundColor: Rakaz.Gold,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ring: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 16, gap: 10 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 16, gap: 12 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalRow: { marginTop: 4, gap: 6 },
  checkButton: {
    height: 44,
    borderRadius: 14,
    backgroundColor: Rakaz.Canvas,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
