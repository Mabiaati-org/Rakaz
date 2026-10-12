import { router } from 'expo-router';
import {
  ArrowUpDown,
  BadgeCheck,
  Bus,
  Check,
  CircleCheck,
  Clock,
  CloudUpload,
  Flag,
  Landmark,
  LocateFixed,
  MapPin,
  Maximize2,
  Navigation,
  Route,
  Sun,
  TriangleAlert,
  Undo2,
  UserX,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import {
  BrandButton,
  BrandHeader,
  InitialsAvatar,
  MapChip,
  ProgressBar,
  SquareIconButton,
  StatusBadge,
} from '@/components/Components';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FadeSlideIn } from '@/components/FadeSlideIn';
import { PressableScale } from '@/components/PressableScale';
import RouteMap from '@/components/RouteMap';
import { Rakaz, card } from '@/constants/theme';
import { hasRoute } from '@/services/serverMapping';
import { useDriverStore } from '@/store/driverStore';
import { useUiStore } from '@/store/uiStore';
import { type LegStop, StopStatus, TripLeg, TripPhase, isDone, studentAddress, studentInitials } from '@/types/models';
import { ArabicFormat, arabicDigits } from '@/utils/arabicFormat';

const openStudent = (id: string) => router.push({ pathname: '/student/[id]', params: { id } });

/** Map card from the design: live map, gold route, bus marker, route label and ETA footer. */
function TripMapCard() {
  const { derived } = useDriverStore();
  const [recentered, setRecentered] = useState(false);
  return (
    <View style={[card(24), styles.mapCard]}>
      <View style={styles.mapBox}>
        <RouteMap
          style={StyleSheet.absoluteFill}
          focus={recentered ? derived.currentPosition : null}
          zoom={recentered ? 1.8 : 1}
        />
        <View style={[styles.mapChip, styles.mapChipStart]}>
          <MapChip icon={LocateFixed} label="توسيط الخريطة" onPress={() => setRecentered((v) => !v)} />
        </View>
        <View style={[styles.mapChip, styles.mapChipEnd]}>
          <MapChip icon={Maximize2} label="تكبير الخريطة" onPress={() => router.push('/map')} />
        </View>
        <View style={styles.mapLabel}>
          <AppText variant="labelMedium">{derived.routeSubtitle}</AppText>
        </View>
      </View>
      <View style={styles.mapFooter}>
        <Route color={Rakaz.Gold} size={18} />
        <AppText variant="bodySmall" color={Rakaz.InkSecondary} style={styles.flex}>
          {`${ArabicFormat.km(derived.remainingMeters)} كم متبقية`}
        </AppText>
        <Clock color={Rakaz.Gold} size={18} />
        <AppText variant="labelMedium">{`الوصول ${ArabicFormat.time(derived.etaToDestination)}`}</AppText>
      </View>
    </View>
  );
}

interface NextStopProps {
  stop: LegStop;
  leg: TripLeg;
  onNavigate: () => void;
  onArrive: () => void;
  onPickUp: () => void;
  onAbsent: () => void;
  onDetails: () => void;
}

/** "Next stop" block with the primary arrive → pick up flow. */
function NextStopSection({ stop, leg, onNavigate, onArrive, onPickUp, onAbsent, onDetails }: NextStopProps) {
  const morning = leg === TripLeg.MORNING;
  const { record, student } = stop;
  return (
    <View style={styles.section}>
      <PressableScale onPress={onDetails} haptic={false} accessibilityLabel={student.name} style={styles.nextHeader}>
        <View style={styles.flex}>
          <AppText variant="labelMedium" color={Rakaz.Gold}>
            {morning ? 'المحطة التالية' : 'التسليم التالي'}
          </AppText>
          <AppText variant="headlineMedium">{student.name}</AppText>
          <View style={styles.inlineRow}>
            <MapPin color={Rakaz.InkSecondary} size={15} />
            <AppText variant="bodySmall" color={Rakaz.InkSecondary}>
              {studentAddress(student)}
            </AppText>
          </View>
        </View>
        <InitialsAvatar initials={studentInitials(student)} size={54} corner={16} />
      </PressableScale>

      {record.status === StopStatus.ARRIVED ? (
        <>
          {record.arrivedAt != null ? (
            <View style={styles.inlineRow}>
              <CircleCheck color={Rakaz.Green} size={16} />
              <AppText variant="labelSmall" color={Rakaz.InkSecondary} numberOfLines={1} style={styles.flexShrink}>
                {`وصلت ${ArabicFormat.time(record.arrivedAt)}${record.location ? ' · ' + ArabicFormat.coordinate(record.location) : ''}`}
              </AppText>
            </View>
          ) : null}
          <View style={styles.actionRow}>
            {morning ? (
              <PressableScale onPress={onAbsent} accessibilityLabel="غائب" style={styles.absentButton}>
                <UserX color={Rakaz.Red} size={20} />
                <AppText variant="labelLarge" color={Rakaz.Red}>
                  غائب
                </AppText>
              </PressableScale>
            ) : null}
            <BrandButton
              title={morning ? 'تم استلام الطالب' : 'تم تسليم الطالب'}
              icon={CircleCheck}
              kind="NAVY"
              style={styles.flex}
              onPress={onPickUp}
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.actionRow}>
            <SquareIconButton icon={Navigation} accessibilityLabel="الملاحة إلى الطالب" onPress={onNavigate} />
            <BrandButton title="وصلت إلى المحطة" icon={MapPin} style={styles.flex} onPress={onArrive} />
          </View>
          {morning ? (
            <PressableScale onPress={onAbsent} accessibilityLabel="تسجيل غياب دون الوصول" style={styles.linkButton}>
              <AppText variant="labelMedium" color={Rakaz.InkSecondary}>
                تسجيل غياب دون الوصول
              </AppText>
            </PressableScale>
          ) : null}
        </>
      )}
    </View>
  );
}

interface DestinationCardProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  actionTitle: string;
  onAction: () => void;
  onNavigate: (() => void) | null;
}

function DestinationCard({ eyebrow, title, subtitle, actionTitle, onAction, onNavigate }: DestinationCardProps) {
  const Icon = onNavigate ? Landmark : Flag;
  return (
    <View style={styles.section}>
      <View style={styles.nextHeader}>
        <View style={styles.flex}>
          <AppText variant="labelMedium" color={Rakaz.Gold}>
            {eyebrow}
          </AppText>
          <AppText variant="headlineSmall">{title}</AppText>
          <View style={styles.inlineRow}>
            <MapPin color={Rakaz.InkSecondary} size={15} />
            <AppText variant="bodySmall" color={Rakaz.InkSecondary}>
              {subtitle}
            </AppText>
          </View>
        </View>
        <View style={styles.destinationIcon}>
          <Icon color={Rakaz.GoldDeep} size={24} />
        </View>
      </View>
      <View style={styles.actionRow}>
        {onNavigate ? <SquareIconButton icon={Navigation} accessibilityLabel="الملاحة" onPress={onNavigate} /> : null}
        <BrandButton title={actionTitle} icon={CircleCheck} style={styles.flex} onPress={onAction} />
      </View>
    </View>
  );
}

function SummaryPill({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.summaryPill}>
      <AppText variant="headlineSmall" style={styles.center}>
        {ArabicFormat.number(value)}
      </AppText>
      <AppText variant="labelMedium" color={Rakaz.InkSecondary} style={styles.center}>
        {label}
      </AppText>
    </View>
  );
}

function PhaseContent({ onConfirmEnd }: { onConfirmEnd: () => void }) {
  const store = useDriverStore();
  const ui = useUiStore();
  const { state, derived } = store;
  const school = state.route.school;

  switch (state.trip.phase) {
    case TripPhase.IDLE:
    case TripPhase.MORNING_PICKUP:
    case TripPhase.RETURN_TRIP: {
      const next = derived.nextStop;
      if (next) {
        const morning = derived.currentLeg === TripLeg.MORNING;
        return (
          <NextStopSection
            stop={next}
            leg={derived.currentLeg}
            onNavigate={() => ui.openNavigation({ title: next.student.name, coordinate: next.student.home })}
            onArrive={() => store.arrive(next.student.id)}
            onPickUp={() => (morning ? store.pickUp(next.student.id) : store.dropOff(next.student.id))}
            onAbsent={() => ui.openAbsence(next.student)}
            onDetails={() => openStudent(next.student.id)}
          />
        );
      }
      if (state.trip.phase === TripPhase.MORNING_PICKUP) {
        return (
          <DestinationCard
            eyebrow="جميع الطلاب على متن الحافلة"
            title={school.name}
            subtitle={school.address}
            actionTitle="وصلت إلى المدرسة"
            onAction={store.arriveSchool}
            onNavigate={() => ui.openNavigation({ title: school.name, coordinate: school.coordinate })}
          />
        );
      }
      return (
        <DestinationCard
          eyebrow="تم تسليم جميع الطلاب"
          title="رحلة العودة مكتملة"
          subtitle={`${ArabicFormat.number(derived.doneCount)} طلاب تم توصيلهم`}
          actionTitle="إنهاء الرحلة"
          onAction={onConfirmEnd}
          onNavigate={null}
        />
      );
    }
    case TripPhase.AT_SCHOOL:
      return (
        <View style={styles.section}>
          <View style={styles.arrivedCard}>
            <BadgeCheck color={Rakaz.Green} size={40} />
            <View style={styles.flex}>
              <AppText variant="titleMedium">تم الوصول إلى المدرسة</AppText>
              {state.trip.schoolArrivalAt != null ? (
                <AppText variant="bodySmall" color={Rakaz.InkSecondary}>
                  {`الساعة ${ArabicFormat.time(state.trip.schoolArrivalAt)} · ${ArabicFormat.number(derived.pickedUpCount)} طلاب`}
                </AppText>
              ) : null}
              {state.trip.schoolArrivalLocation ? (
                <AppText variant="labelSmall" color={Rakaz.InkSecondary}>
                  {ArabicFormat.coordinate(state.trip.schoolArrivalLocation)}
                </AppText>
              ) : null}
            </View>
          </View>
          <BrandButton title="بدء رحلة العودة" icon={Undo2} kind="NAVY" onPress={store.startReturn} />
        </View>
      );
    case TripPhase.COMPLETED:
      return (
        <View style={[card(), styles.completed]}>
          <Flag color={Rakaz.Gold} size={48} />
          <AppText variant="titleLarge" style={styles.center}>
            أحسنت! انتهت رحلة اليوم
          </AppText>
          <View style={styles.summaryRow}>
            <SummaryPill value={derived.pickedUpCount} label="استلام" />
            <SummaryPill value={derived.absentCount} label="غياب" />
            <SummaryPill value={derived.droppedOffCount} label="تسليم" />
          </View>
          {state.pending.length > 0 ? (
            <View style={styles.inlineRow}>
              <CloudUpload color={Rakaz.Orange} size={18} />
              <AppText variant="labelMedium" color={Rakaz.Orange}>
                {`${ArabicFormat.number(state.pending.length)} إجراءات بانتظار المزامنة`}
              </AppText>
            </View>
          ) : null}
          <BrandButton title="بدء يوم جديد" icon={Sun} kind="OUTLINE" onPress={store.resetForNewDay} />
        </View>
      );
  }
}

function PassengerRow({ stop, isNext, isLast, onPress }: { stop: LegStop; isNext: boolean; isLast: boolean; onPress: () => void }) {
  const status = stop.record.status;
  const done = isDone(status);
  const fill =
    status === StopStatus.PICKED_UP || status === StopStatus.DROPPED_OFF
      ? Rakaz.Green
      : status === StopStatus.ABSENT
        ? Rakaz.Red
        : isNext
          ? Rakaz.Gold
          : Rakaz.Chip;
  const fg = isNext || done ? Rakaz.White : Rakaz.Ink;
  const DoneIcon = status === StopStatus.ABSENT ? X : Check;
  const time = stop.record.completedAt ?? stop.record.arrivedAt;
  return (
    <>
      <PressableScale
        onPress={onPress}
        haptic={false}
        accessibilityLabel={stop.student.name}
        style={[styles.passenger, isNext && styles.passengerNext]}
      >
        <View style={styles.avatarSlot}>
          {done ? (
            <FadeSlideIn offset={0} style={[styles.doneAvatar, { backgroundColor: fill }]}>
              <DoneIcon color={Rakaz.White} size={18} strokeWidth={3} />
            </FadeSlideIn>
          ) : (
            <InitialsAvatar initials={studentInitials(stop.student)} size={34} fill={fill} foreground={fg} />
          )}
        </View>
        <View style={styles.flex}>
          <AppText variant="titleSmall" color={done ? Rakaz.InkSecondary : Rakaz.Ink}>
            {stop.student.name}
          </AppText>
          <AppText variant="bodySmall" color={Rakaz.InkSecondary}>
            {`${stop.student.grade} · ${stop.student.area}`}
          </AppText>
        </View>
        {isNext && status === StopStatus.PENDING ? (
          <AppText variant="labelMedium" color={Rakaz.GoldDeep}>
            التالي
          </AppText>
        ) : status === StopStatus.PENDING ? (
          <AppText variant="labelSmall" color={Rakaz.InkSecondary}>
            {arabicDigits(stop.scheduled)}
          </AppText>
        ) : (
          <View style={styles.endColumn}>
            <StatusBadge status={status} />
            {time != null ? (
              <AppText variant="labelSmall" color={Rakaz.InkSecondary}>
                {ArabicFormat.time(time)}
              </AppText>
            ) : null}
          </View>
        )}
      </PressableScale>
      {!isLast ? <View style={styles.timeline} /> : null}
    </>
  );
}

/** "ترتيب الركاب" card with a timeline of stops. */
function PassengerOrderCard() {
  const { state, derived } = useDriverStore();
  const ui = useUiStore();
  const stops = derived.legStops;
  const nextId = derived.nextStop?.student.id;
  const morning = derived.currentLeg === TripLeg.MORNING;
  return (
    <View style={[card(26), styles.orderCard]}>
      <View style={styles.inlineRow}>
        <Bus color={Rakaz.Gold} size={22} />
        <AppText variant="titleMedium" style={styles.flex}>
          {morning ? 'ترتيب الركاب' : 'ترتيب التسليم'}
        </AppText>
        <View style={styles.doneChip}>
          <AppText variant="labelSmall" color={Rakaz.Green}>
            {`${ArabicFormat.number(derived.doneCount)} من ${ArabicFormat.number(stops.length)} تم`}
          </AppText>
        </View>
      </View>
      <ProgressBar progress={derived.progress} />
      <View>
        {stops.map((stop, index) => (
          <PassengerRow
            key={stop.student.id}
            stop={stop}
            isNext={stop.student.id === nextId}
            isLast={index === stops.length - 1}
            onPress={() => openStudent(stop.student.id)}
          />
        ))}
      </View>
      {morning && state.trip.phase !== TripPhase.COMPLETED ? (
        <PressableScale onPress={ui.openReorder} accessibilityLabel="تعديل ترتيب المحطات" style={styles.reorder}>
          <ArrowUpDown color={Rakaz.GoldDeep} size={18} />
          <AppText variant="labelMedium" color={Rakaz.GoldDeep}>
            تعديل ترتيب المحطات
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Driver trip screen: header, map card, next stop, primary action, passenger order and emergency. */
export default function TripScreen() {
  const store = useDriverStore();
  const ui = useUiStore();
  const { state, derived } = store;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const phaseKey = `${state.trip.phase}-${derived.nextStop?.student.id ?? ''}-${derived.nextStop?.record.status ?? ''}`;

  return (
    <View style={styles.root}>
      <BrandHeader
        subtitle={derived.tripTitle}
        title={state.route.school.name || 'ركاز'}
        isOnline={derived.isOnline}
        pendingCount={state.pending.length}
        onMenu={ui.openMenu}
      />
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        {hasRoute(state.route) ? (
          <>
            <TripMapCard />
            <FadeSlideIn key={phaseKey}>
              <PhaseContent onConfirmEnd={() => setConfirmEnd(true)} />
            </FadeSlideIn>
            <PassengerOrderCard />
          </>
        ) : (
          <View style={[card(), styles.completed]}>
            <Route color={Rakaz.Gold} size={48} />
            <AppText variant="titleLarge" style={styles.center}>
              لم يُسند لك مسار بعد
            </AppText>
            <AppText variant="bodyMedium" color={Rakaz.InkSecondary} style={styles.center}>
              عندما تسند الإدارة مساراً لحسابك سيظهر هنا مع طلابه ومواعيده.
            </AppText>
            <BrandButton title="تحديث" icon={CloudUpload} kind="OUTLINE" onPress={() => void store.refresh()} />
          </View>
        )}
      </ScrollView>
      <View style={styles.emergencyBar}>
        <PressableScale onPress={ui.openEmergency} accessibilityLabel="حالة طارئة" style={styles.emergencyButton}>
          <TriangleAlert color={Rakaz.Red} size={22} />
          <AppText variant="labelLarge" color={Rakaz.Red}>
            حالة طارئة
          </AppText>
        </PressableScale>
      </View>
      <ConfirmDialog
        visible={confirmEnd}
        title="إنهاء الرحلة؟"
        message="سيتم إرسال تقرير الرحلة إلى الإدارة."
        confirmTitle="إنهاء"
        onDismiss={() => setConfirmEnd(false)}
        onConfirm={() => {
          setConfirmEnd(false);
          store.endTrip();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Rakaz.Canvas },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  center: { textAlign: 'center' },
  scroll: { padding: 16, gap: 18 },
  section: { paddingHorizontal: 4, gap: 14 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  nextHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  absentButton: {
    width: 110,
    height: 56,
    borderRadius: 18,
    backgroundColor: Rakaz.RedSoft,
    borderWidth: 1.2,
    borderColor: Rakaz.RedLine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  linkButton: { alignSelf: 'center', minHeight: 36, padding: 8, justifyContent: 'center' },
  destinationIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Rakaz.GoldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    backgroundColor: Rakaz.GreenSoft,
    padding: 16,
  },
  completed: { padding: 18, alignItems: 'center', gap: 14 },
  summaryRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  summaryPill: { flex: 1, borderRadius: 16, backgroundColor: Rakaz.Canvas, paddingVertical: 12, alignItems: 'center' },
  mapCard: { overflow: 'hidden' },
  mapBox: { height: 200, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  mapChip: { position: 'absolute', top: 12 },
  mapChipStart: { start: 12 },
  mapChipEnd: { end: 12 },
  mapLabel: {
    position: 'absolute',
    bottom: 12,
    start: 12,
    borderRadius: 10,
    backgroundColor: Rakaz.White,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapFooter: { height: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderCard: { padding: 18, gap: 14 },
  doneChip: { borderRadius: 999, backgroundColor: Rakaz.GreenSoft, paddingHorizontal: 10, paddingVertical: 5 },
  passenger: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 10 },
  passengerNext: { backgroundColor: Rakaz.GoldTint },
  avatarSlot: { width: 34, alignItems: 'center' },
  doneAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  endColumn: { alignItems: 'flex-end', gap: 2 },
  timeline: { marginStart: 26, width: 1.5, height: 6, backgroundColor: Rakaz.Line },
  reorder: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  emergencyBar: { backgroundColor: Rakaz.Canvas, paddingHorizontal: 16, paddingVertical: 8 },
  emergencyButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: Rakaz.RedSoft,
    borderWidth: 1.2,
    borderColor: Rakaz.RedLine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
