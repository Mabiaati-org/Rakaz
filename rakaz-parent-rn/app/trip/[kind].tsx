import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bell,
  Bus,
  CalendarMinus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crosshair,
  Flag,
  House,
  LocateFixed,
  type LucideIcon,
  MessageSquare,
  Minus,
  Phone,
  Plus,
  User,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BrandHeaderBackground, CircleIconButton, HeaderBar, MonogramTile } from '@/components/Brand';
import { OutlineButton, PrimaryButton } from '@/components/Buttons';
import { BusMarker, MapPlaceLabel } from '@/components/map/MapMarkers';
import RakazMap from '@/components/map/RakazMap';
import { type MapRegion, regionAround } from '@/components/map/mapTypes';
import { PressableScale } from '@/components/PressableScale';
import { IconBadge, SectionTitle } from '@/components/Primitives';
import { StationRow, type TimelineState } from '@/components/TripCards';
import { NotificationKindIcon, notificationTint } from '@/constants/visuals';
import { card, Gradients, heroShadow, shadow, Theme, withAlpha } from '@/constants/theme';
import { parseTripKind, useAppNav } from '@/hooks/useAppNav';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useFamily } from '@/store/familyStore';
import {
  driverTenure,
  eventDate,
  hasArrived,
  isActive,
  isMoving,
  isPickedUp,
  NotificationCategory,
  notificationCategory,
  NotificationKindTitle,
  type Trip,
  TripKind,
  TripKindTitle,
  TripStatus,
  tripStatusTitle,
} from '@/types/models';
import { Fmt } from '@/utils/fmt';
import { Haptics } from '@/utils/haptics';

/** Live tracking for one trip. Morning uses the navy header (design 53), return uses the teal header (design 58). */
export default function TripLiveScreen() {
  const params = useLocalSearchParams<{ kind: string }>();
  const kind = parseTripKind(params.kind);
  const store = useFamily();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const trip = store.trip(kind);
  const absent = store.isAbsent(kind);
  const isReturn = kind === TripKind.afternoon;
  const bus = store.vehicleCoordinate(kind);

  const [followBus, setFollowBus] = useState(true);
  const [span, setSpan] = useState(0.024);
  const [camera, setCamera] = useState<MapRegion>(() => regionAround(bus, 0.024));
  const lastCenter = useRef<MapRegion>(camera);
  const { latitude: busLat, longitude: busLng } = bus;

  useEffect(() => {
    if (followBus) setCamera(regionAround({ latitude: busLat, longitude: busLng }, span));
  }, [followBus, busLat, busLng, span]);

  const recenter = () => {
    setFollowBus(true);
    setCamera(regionAround(store.vehicleCoordinate(kind), span));
  };

  const zoom = (factor: number) => {
    const next = Math.min(Math.max(span * factor, 0.004), 0.2);
    setSpan(next);
    const center = followBus ? store.vehicleCoordinate(kind) : lastCenter.current;
    setCamera(regionAround({ latitude: center.latitude, longitude: center.longitude }, next));
  };

  const legs = store.legs(kind);
  const liveBus = store.busLocation(kind);

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View>
        <BrandHeaderBackground tealTone={isReturn} style={styles.headerBleed} />
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          {isReturn ? <ReturnHeader trip={trip} absent={absent} onBack={() => router.back()} /> : <MorningHeader trip={trip} absent={absent} onBack={() => router.back()} />}
        </View>
      </View>

      <View style={styles.mapWrap}>
        <RakazMap
          region={camera}
          interactive
          onPanStart={() => setFollowBus(false)}
          onRegionChangeComplete={(r) => {
            lastCenter.current = r;
            if (Math.abs(r.latitudeDelta - span) / span > 0.05) setSpan(r.latitudeDelta);
          }}
          lines={[
            {
              id: 'first',
              coordinates: legs.first,
              color: withAlpha(Theme.navy, trip.status >= TripStatus.arrivedAtPickup ? 0.18 : 0.4),
              width: 4,
              dash: [1, 7],
            },
            { id: 'second-casing', coordinates: legs.second, color: withAlpha(Theme.white, 0.9), width: 10 },
            { id: 'second', coordinates: legs.second, color: Theme.gold, width: 5, dash: [5, 6] },
          ]}
          markers={[
            { id: 'home', coordinate: store.homeCoordinate, anchor: 'bottom', view: <MapPlaceLabel icon={House} title="منزل العائلة" tint={Theme.gold} /> },
            { id: 'school', coordinate: store.schoolCoordinate, anchor: 'bottom', view: <MapPlaceLabel icon={Flag} title="المدرسة" tint={Theme.sage} /> },
            // The bus is drawn only where the driver's phone actually reported it.
            ...(liveBus ? [{ id: 'bus', coordinate: liveBus, animated: isMoving(trip.status), view: <BusMarker moving={isMoving(trip.status)} /> }] : []),
          ]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.mapButtons}>
          <MapButton icon={LocateFixed} label="تتبّع الحافلة" onPress={recenter} />
          <View style={styles.mapGap} />
          <MapButton icon={Plus} label="تكبير" onPress={() => zoom(0.6)} />
          <MapButton icon={Minus} label="تصغير" onPress={() => zoom(1.6)} />
        </View>
        <View pointerEvents="none" style={styles.mapUpdated}>
          <AppText size="caption2" weight="medium">
            {liveBus && trip.busUpdatedAt != null ? `موقع الحافلة ${Fmt.relative(trip.busUpdatedAt)}` : isActive(trip.status) ? 'بانتظار موقع الحافلة' : `آخر تحديث ${Fmt.relative(trip.updatedAt)}`}
          </AppText>
        </View>
      </View>

      <View style={styles.content}>
        {absent ? (
          <View style={[card(18, 26), styles.row12, styles.overlapAbsent]}>
            <IconBadge icon={CalendarMinus} tint={Theme.red} soft={Theme.redSoft} size={48} />
            <View style={styles.flexGap2}>
              <AppText size="headline" weight="bold">
                {`${store.student.firstName} غائب عن هذه الرحلة`}
              </AppText>
              <AppText size="caption" color={Theme.muted}>
                تم إبلاغ الإدارة والسائق، ولن تتوقف الحافلة عند المنزل.
              </AppText>
            </View>
          </View>
        ) : (
          <EtaCard kind={kind} trip={trip} />
        )}
        {absent ? null : (
          <>
            <DriverCard />
            <SectionTitle title="تفاصيل المسار" action={followBus ? undefined : 'تتبّع الحافلة'} actionIcon={Crosshair} onAction={recenter} />
            <RouteDetails kind={kind} trip={trip} />
          </>
        )}
        <UpdatesCard />
        <View style={styles.row10}>
          {store.student.driver.assigned ? (
            <PrimaryButton
              title="اتصال بالسائق"
              icon={Phone}
              fill={isReturn ? Theme.teal : Theme.navy}
              onPress={() => void Linking.openURL(`tel:${store.student.driver.phone}`)}
              style={styles.flex}
            />
          ) : null}
          <SupportButton />
        </View>
      </View>
      <View style={{ height: 30 + insets.bottom }} />
    </ScrollView>
  );
}

function SupportButton() {
  const nav = useAppNav();
  return <OutlineButton title="الدعم" icon={MessageSquare} onPress={() => nav.openTab('support')} style={styles.flex} />;
}

function TopBar({ eyebrow, title, onBack }: { eyebrow: string; title: string; onBack: () => void }) {
  const store = useFamily();
  const nav = useAppNav();
  return (
    <HeaderBar
      leading={{ icon: ChevronRight, label: 'رجوع', onPress: onBack }}
      trailing={{ icon: Bell, label: 'الإشعارات', badge: store.unreadCount > 0, onPress: nav.showNotifications }}
    >
      <View>
        <AppText size="caption" color={withAlpha(Theme.white, 0.55)} align="center">
          {eyebrow}
        </AppText>
        <AppText size="headline" weight="bold" color={Theme.white} align="center">
          {title}
        </AppText>
      </View>
    </HeaderBar>
  );
}

function MorningHeader({ trip, absent, onBack }: { trip: Trip; absent: boolean; onBack: () => void }) {
  const store = useFamily();
  const driver = store.student.driver;
  const pill = absent ? 'غياب' : isMoving(trip.status) ? 'على الطريق' : hasArrived(trip) ? 'وصلت' : trip.status === TripStatus.notStarted ? 'مجدولة' : 'متوقفة';
  const pillBg = absent ? Theme.red : isActive(trip.status) ? Theme.greenDeep : Theme.muted;
  return (
    <View style={styles.gap16}>
      <TopBar eyebrow="ركاز · تتبع مباشر" title={TripKindTitle[trip.kind]} onBack={onBack} />
      <View style={styles.row12}>
        <View style={styles.busTile}>
          <Bus size={17} color={Theme.white} />
        </View>
        <View style={styles.flex}>
          <AppText size="subheadline" weight="bold" color={Theme.white}>
            {`الحافلة ${driver.vehicle.plateNumber}`}
          </AppText>
          <AppText size="caption" color={withAlpha(Theme.white, 0.6)}>
            {`${driver.name} · ${isActive(trip.status) ? 'مباشر الآن' : 'غير متصل'}`}
          </AppText>
        </View>
        <View style={[styles.headerPill, { backgroundColor: pillBg }]}>
          <View style={styles.headerPillDot} />
          <AppText size="caption" weight="bold" color={Theme.white}>
            {pill}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function ReturnHeader({ trip, absent, onBack }: { trip: Trip; absent: boolean; onBack: () => void }) {
  const store = useFamily();
  const live = isActive(trip.status) && !absent;
  const dot = live ? Theme.green : Theme.muted;
  return (
    <View style={styles.gap16}>
      <View style={styles.row12}>
        <MonogramTile size={44} />
        <View style={styles.flex}>
          <AppText size="caption" weight="medium" color={Theme.goldLight}>
            متابعة الرحلة
          </AppText>
          <AppText size="title3" weight="bold" color={Theme.white} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {`عودة ${store.student.firstName} إلى المنزل`}
          </AppText>
        </View>
        <CircleIconButton icon={ChevronRight} onPress={onBack} accessibilityLabel="رجوع" />
      </View>
      <View style={styles.returnStatus}>
        <View style={[styles.row10, styles.flex]}>
          <View style={[styles.statusHalo, { backgroundColor: withAlpha(dot, 0.25) }]}>
            <View style={[styles.statusDot, { backgroundColor: dot }]} />
          </View>
          <View style={styles.flex}>
            <AppText size="subheadline" weight="bold" color={Theme.white}>
              {absent ? 'غياب مُبلَّغ' : isActive(trip.status) ? 'الرحلة نشطة الآن' : tripStatusTitle(trip.status, trip.kind)}
            </AppText>
            <AppText size="caption2" color={withAlpha(Theme.white, 0.6)}>
              {`آخر تحديث ${Fmt.relative(trip.updatedAt)}`}
            </AppText>
          </View>
        </View>
        <View style={styles.endAligned}>
          <AppText size="caption2" color={withAlpha(Theme.white, 0.6)} align="end">
            الوصول المتوقع
          </AppText>
          <AppText size="title2" weight="bold" color={Theme.goldLight} align="end">
            {Fmt.clock(store.etaDate(trip.kind))}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function MapButton({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <PressableScale
      scale={0.9}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.tap();
        onPress();
      }}
      style={styles.mapButton}
    >
      <Icon size={18} color={Theme.ink} strokeWidth={2} />
    </PressableScale>
  );
}

function EtaCard({ kind, trip }: { kind: TripKind; trip: Trip }) {
  const store = useFamily();
  const eta = store.etaDate(kind);
  const [width, setWidth] = useState(0);
  const progress = useAnimatedNumber(store.overallProgress(kind));
  return (
    <View style={[card(18, 26), heroShadow, styles.gap14, styles.overlapEta]}>
      <View style={styles.rowBottom}>
        <View>
          <AppText size="caption" color={Theme.muted}>
            {store.etaTitle(kind)}
          </AppText>
          <View style={styles.baseline}>
            <AppText size={34} weight="bold">
              {Fmt.clock(eta)}
            </AppText>
            <AppText size="footnote" color={Theme.muted}>
              {Fmt.period(eta)}
            </AppText>
          </View>
        </View>
        <View style={styles.etaSide}>
          {isActive(trip.status) ? (
            <View style={styles.row4}>
              <Clock size={14} color={Theme.greenDeep} strokeWidth={2.4} />
              <AppText size="subheadline" weight="bold" color={Theme.greenDeep}>
                {hasArrived(trip) ? 'وصلت' : `بعد ${Fmt.minutes(store.etaMinutes(kind))}`}
              </AppText>
            </View>
          ) : trip.status === TripStatus.notStarted ? (
            <View style={styles.row4}>
              <Clock size={14} color={Theme.gold} strokeWidth={2.4} />
              <AppText size="subheadline" weight="bold" color={Theme.gold}>
                {`تبدأ ${Fmt.clock(trip.scheduledStart)}`}
              </AppText>
            </View>
          ) : null}
          <AppText size="caption" color={Theme.muted} align="end">
            {`المسافة ${Fmt.number(Math.round(store.remainingDistanceKm(kind) * 10) / 10)} كم`}
          </AppText>
        </View>
      </View>
      <View style={styles.progressTrack} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: [8, Math.max(8, width)] }) }]}>
          <LinearGradient colors={Gradients.gold} start={{ x: 1, y: 0.5 }} end={{ x: 0, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
      <View style={styles.between}>
        <AppText size="caption" weight="medium" color={Theme.muted}>
          {kind === TripKind.morning ? 'منزل العائلة' : 'المدرسة'}
        </AppText>
        <AppText size="caption" weight="bold" color={Theme.gold} align="center" style={styles.flex} numberOfLines={1}>
          {isActive(trip.status) ? tripStatusTitle(trip.status, kind) : ''}
        </AppText>
        <AppText size="caption" weight="medium" color={Theme.muted}>
          {kind === TripKind.morning ? 'المدرسة' : 'منزل العائلة'}
        </AppText>
      </View>
    </View>
  );
}

function DriverCard() {
  const store = useFamily();
  const nav = useAppNav();
  const driver = store.student.driver;
  const tenure = driverTenure(driver);
  return (
    <View style={[card(14), styles.row12]}>
      <View style={styles.driverIcon}>
        <User size={20} color={Theme.ink} />
      </View>
      <View style={styles.flexGap1}>
        <AppText size="caption" color={Theme.muted}>
          السائق المسؤول
        </AppText>
        <AppText size="headline" weight="bold">
          {driver.name}
        </AppText>
        {tenure ? (
          <AppText size="caption" weight="semibold" color={Theme.gold}>
            {Fmt.digits(tenure)}
          </AppText>
        ) : null}
      </View>
      <PressableScale accessibilityLabel="الملف" onPress={nav.driver} style={styles.profileButton}>
        <AppText size="footnote" weight="bold" color={Theme.gold}>
          الملف
        </AppText>
      </PressableScale>
    </View>
  );
}

function RouteDetails({ kind, trip }: { kind: TripKind; trip: Trip }) {
  const store = useFamily();
  const name = store.student.firstName;
  const school = store.student.school.name;
  const pickupTitle = kind === TripKind.morning ? 'منزل العائلة' : school;
  const dropTitle = kind === TripKind.morning ? school : 'منزل العائلة';
  const pickupDate = eventDate(trip, TripStatus.studentPickedUp);
  const pickupETA = trip.status < TripStatus.studentPickedUp ? Date.now() + store.etaMinutes(kind) * 60_000 : null;
  const eta = store.etaDate(kind);
  const pickedUp = isPickedUp(trip);
  const arrived = hasArrived(trip);

  const pickupState: TimelineState = pickedUp ? 'done' : isActive(trip.status) ? 'current' : 'pending';
  const dropState: TimelineState = arrived ? 'done' : pickedUp ? 'current' : 'pending';

  return (
    <View style={card(18)}>
      <StationRow title={pickupTitle} subtitle={pickedUp ? `تم الالتقاط · ${name}` : 'نقطة الاستلام'} time={pickupDate ?? pickupETA ?? trip.scheduledStart} state={pickupState} isLast={false} />
      <StationRow title={dropTitle} subtitle={arrived ? 'تم الوصول' : 'الوصول المتوقع'} time={eta} state={dropState} isLast />
    </View>
  );
}

function UpdatesCard() {
  const store = useFamily();
  const nav = useAppNav();
  const updates = store.state.notifications.filter((n) => notificationCategory(n.kind) === NotificationCategory.trips).slice(0, 3);
  return (
    <View style={styles.updates}>
      <View style={[styles.between, styles.updatesHead]}>
        <View style={styles.row6}>
          <Bell size={15} color={Theme.ink} />
          <AppText size="subheadline" weight="bold">
            آخر التحديثات
          </AppText>
        </View>
        <PressableScale accessibilityLabel="كل التنبيهات" onPress={nav.showNotifications} style={styles.allAlerts}>
          <AppText size="caption" weight="bold" color={Theme.gold}>
            كل التنبيهات
          </AppText>
          <ChevronLeft size={11} color={Theme.gold} strokeWidth={3} />
        </PressableScale>
      </View>
      <View style={styles.hairline} />
      {updates.length === 0 ? (
        <AppText size="caption" color={Theme.muted} style={styles.pad20}>
          لا توجد تحديثات بعد
        </AppText>
      ) : null}
      {updates.map((n) => {
        const Icon = NotificationKindIcon[n.kind];
        const green = notificationTint(n.kind) === Theme.green;
        return (
          <View key={n.id} style={styles.updateRow}>
            <View style={[styles.updateIcon, { backgroundColor: green ? Theme.greenSoft : Theme.goldSoft }]}>
              <Icon size={14} color={green ? Theme.greenDeep : Theme.gold} />
            </View>
            <View style={styles.flexGap1}>
              <AppText size="footnote" weight="bold">
                {NotificationKindTitle[n.kind]}
              </AppText>
              <AppText size="caption" color={Theme.muted} numberOfLines={2}>
                {n.body}
              </AppText>
            </View>
            <AppText size="caption2" color={Theme.muted}>
              {Fmt.relative(n.date)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Theme.canvas },
  headerBleed: { position: 'absolute', top: -800, bottom: 0, start: 0, end: 0 },
  header: { paddingHorizontal: 20, paddingBottom: 18, width: '100%', maxWidth: 700, alignSelf: 'center' },
  content: { paddingHorizontal: 16, gap: 16, width: '100%', maxWidth: 700, alignSelf: 'center' },
  flex: { flex: 1 },
  flexGap1: { flex: 1, gap: 1 },
  flexGap2: { flex: 1, gap: 2 },
  gap14: { gap: 14 },
  gap16: { gap: 16 },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row10: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  endAligned: { alignItems: 'flex-end' },
  hairline: { height: 1, backgroundColor: Theme.line },
  pad20: { padding: 20 },
  busTile: { width: 40, height: 40, borderRadius: 12, backgroundColor: withAlpha(Theme.white, 0.08), alignItems: 'center', justifyContent: 'center' },
  headerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  headerPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: withAlpha(Theme.white, 0.85) },
  returnStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: withAlpha(Theme.white, 0.07),
    borderWidth: 1,
    borderColor: withAlpha(Theme.white, 0.12),
  },
  statusHalo: { padding: 4, borderRadius: 9 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  mapWrap: { height: 380 },
  mapButtons: { position: 'absolute', top: 14, start: 14, gap: 10 },
  mapGap: { height: 8 },
  mapButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Theme.white, alignItems: 'center', justifyContent: 'center', boxShadow: shadow(2, 6, 0.08, Theme.black) },
  mapUpdated: { position: 'absolute', start: 14, bottom: 70, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: withAlpha(Theme.white, 0.85) },
  overlapEta: { marginTop: -56 },
  overlapAbsent: { marginTop: -40 },
  etaSide: { alignItems: 'flex-end', gap: 4, paddingBottom: 6 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Theme.blueSoft, overflow: 'hidden' },
  progressFill: { position: 'absolute', start: 0, top: 0, bottom: 0, borderRadius: 4, overflow: 'hidden' },
  driverIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Theme.sageSoft, alignItems: 'center', justifyContent: 'center' },
  profileButton: { height: 40, paddingHorizontal: 16, borderRadius: 12, backgroundColor: Theme.goldSoft, alignItems: 'center', justifyContent: 'center' },
  updates: { backgroundColor: Theme.card, borderRadius: 24, paddingBottom: 6, boxShadow: shadow(6, 16, 0.06) },
  updatesHead: { paddingHorizontal: 16, paddingVertical: 6 },
  allAlerts: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 36 },
  updateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  updateIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
