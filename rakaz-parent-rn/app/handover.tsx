import { useRouter } from 'expo-router';
import { Check, CircleCheck, Clock, House, Lock, MapPin, ShieldCheck, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BrandHeaderBackground, MonogramTile } from '@/components/Brand';
import { PrimaryButton } from '@/components/Buttons';
import { FormError } from '@/components/FormError';
import { PressableScale } from '@/components/PressableScale';
import { StudentAvatar } from '@/components/Primitives';
import { card, Theme, withAlpha } from '@/constants/theme';
import { usePulse } from '@/hooks/useAnimatedNumber';
import { useSubmit } from '@/hooks/useSubmit';
import { useFamily } from '@/store/familyStore';
import { eventDate, shortName, TripStatus } from '@/types/models';
import { Fmt } from '@/utils/fmt';

const SHEET_BG = '#EEF3F1';

/** Design 63: after the return trip arrives home, the guardian confirms they received the child. */
export default function HandoverScreen() {
  const store = useFamily();
  const submit = useSubmit();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [confirmed, setConfirmed] = useState(false);
  const pulse = usePulse(true, 1200);
  const pop = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);
  const { dismissHandover } = store;
  const student = store.student;
  const [arrival] = useState(() => eventDate(store.state.returnTrip, TripStatus.arrivedAtSchool) ?? Date.now());

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  useEffect(() => () => dismissHandover(), [dismissHandover]);

  // Stay open on the thank-you state after confirming; otherwise follow the server.
  useEffect(() => {
    if (!store.state.handoverPending && !confirmed) close();
  }, [store.state.handoverPending, confirmed, close]);

  const confirm = () => {
    void submit.run(() => store.confirmHandover()).then((ok) => {
      if (!ok) return;
      setConfirmed(true);
      pop.setValue(0.6);
      Animated.spring(pop, { toValue: 1, speed: 12, bounciness: 14, useNativeDriver: Platform.OS !== 'web' }).start();
    });
  };

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom }}>
      <View>
        <BrandHeaderBackground tealTone style={styles.headerBleed} />
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <View style={styles.row12}>
            <MonogramTile size={44} />
            <View style={styles.flex}>
              <AppText size="caption" weight="medium" color={Theme.goldLight}>
                تأكيد الوصول
              </AppText>
              <AppText size="title3" weight="bold" color={Theme.white}>
                {`${student.firstName} وصلت إلى المنزل`}
              </AppText>
            </View>
            <PressableScale accessibilityLabel="إغلاق" onPress={close} style={styles.close}>
              <X size={18} color={Theme.goldLight} strokeWidth={2.4} />
            </PressableScale>
          </View>
          <View style={styles.arrivedBox}>
            <View style={styles.homeIcon}>
              <House size={18} color={Theme.greenDeep} />
            </View>
            <View style={styles.flexGap1}>
              <View style={styles.row6}>
                <View style={styles.arrivedDot} />
                <AppText size="subheadline" weight="bold" color={Theme.white}>
                  المركبة وصلت
                </AppText>
              </View>
              <AppText size="caption" color={withAlpha(Theme.white, 0.6)}>
                السائق بانتظار ولي الأمر عند المدخل الرئيسي.
              </AppText>
            </View>
            <View style={styles.endAligned}>
              <AppText size="caption2" color={withAlpha(Theme.white, 0.6)} align="end">
                وقت الوصول
              </AppText>
              <AppText size="title3" weight="bold" color={Theme.goldLight} align="end">
                {Fmt.clock(arrival)}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.badgeWrap}>
          <Animated.View style={[styles.badgeHalo, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]} />
          <Animated.View style={[styles.badge, { backgroundColor: confirmed ? Theme.green : '#7DBE9F', transform: [{ scale: pop }] }]}>
            {confirmed ? <Check size={34} color={Theme.white} strokeWidth={2.4} /> : <House size={32} color={Theme.white} strokeWidth={1.8} />}
          </Animated.View>
        </View>

        <View style={styles.gap6}>
          <AppText size="title2" weight="bold" align="center">
            {confirmed ? 'شكراً، تم تأكيد الاستلام' : `هل استقبلتِ ${student.firstName}؟`}
          </AppText>
          <AppText size="subheadline" color={Theme.muted} align="center">
            {confirmed ? 'أُغلقت الرحلة وتم إشعار فريق المدرسة.' : 'أكّدي الاستلام لتُغلق الرحلة ويطمئن فريق المدرسة.'}
          </AppText>
        </View>

        <View style={[card(18, 24), styles.gap14]}>
          <View style={styles.row12}>
            <StudentAvatar student={student} size={48} />
            <View style={styles.flexGap1}>
              <AppText size="headline" weight="bold">
                {shortName(student)}
              </AppText>
              <AppText size="caption" color={Theme.muted}>
                {`${student.grade} · رحلة العودة`}
              </AppText>
            </View>
            <View style={styles.endAligned}>
              <AppText size="caption2" color={Theme.muted} align="end">
                الحالة
              </AppText>
              <View style={styles.row4}>
                {confirmed ? <CircleCheck size={13} color={Theme.white} fill={Theme.greenDeep} /> : <Clock size={13} color={Theme.greenDeep} />}
                <AppText size="caption" weight="bold" color={Theme.greenDeep}>
                  {confirmed ? 'تم التأكيد' : 'بانتظار التأكيد'}
                </AppText>
              </View>
            </View>
          </View>
          <View style={styles.hairline} />
          <View style={styles.between}>
            <View style={styles.row4}>
              <MapPin size={13} color={Theme.gold} />
              <AppText size="caption" color={Theme.muted}>
                المنزل · البوابة الرئيسية
              </AppText>
            </View>
            <View style={styles.row4}>
              <Clock size={13} color={Theme.gold} />
              <AppText size="caption" color={Theme.muted}>
                {`وصلت ${Fmt.clock(arrival)}`}
              </AppText>
            </View>
          </View>
        </View>

        <FormError message={submit.error} />
        <PrimaryButton
          title={confirmed ? 'تم' : `تأكيد استلام ${student.firstName}`}
          icon={confirmed ? Check : ShieldCheck}
          fill={confirmed ? Theme.greenDeep : Theme.teal}
          height={58}
          loading={submit.busy}
          onPress={confirmed ? close : confirm}
        />

        {confirmed ? null : (
          <PressableScale
            accessibilityLabel="لم تصلني بعد؟ أبلغي عن مشكلة"
            onPress={() => {
              void submit.run(() => store.reportHandoverIssue()).then((ok) => {
                if (ok) close();
              });
            }}
            style={styles.issue}
          >
            <AppText size="footnote" weight="bold" color={withAlpha(Theme.ink, 0.7)} align="center">
              لم تصلني بعد؟ أبلغي عن مشكلة
            </AppText>
          </PressableScale>
        )}

        <View style={[styles.row6, styles.secure]}>
          <Lock size={12} color={Theme.muted} />
          <AppText size="caption" color={Theme.muted}>
            بيانات طفلك محمية ومشفّرة
          </AppText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SHEET_BG },
  headerBleed: { position: 'absolute', top: -800, bottom: 0, start: 0, end: 0 },
  header: { paddingHorizontal: 20, paddingBottom: 56, gap: 18, width: '100%', maxWidth: 560, alignSelf: 'center' },
  sheet: {
    marginTop: -30,
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 18,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: SHEET_BG,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  flex: { flex: 1 },
  flexGap1: { flex: 1, gap: 1 },
  gap6: { gap: 6 },
  gap14: { gap: 14 },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  endAligned: { alignItems: 'flex-end', gap: 1 },
  hairline: { height: 1, backgroundColor: Theme.line },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrivedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: withAlpha(Theme.white, 0.07),
    borderWidth: 1,
    borderColor: withAlpha(Theme.white, 0.12),
  },
  homeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D0E9DC', alignItems: 'center', justifyContent: 'center' },
  arrivedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#7DBE9F' },
  badgeWrap: { alignSelf: 'center', width: 104, height: 104, alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  badgeHalo: { position: 'absolute', width: 104, height: 104, borderRadius: 52, backgroundColor: Theme.greenSoft },
  badge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  issue: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secure: { justifyContent: 'center', paddingTop: 4 },
});
