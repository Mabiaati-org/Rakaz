import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Calendar, CalendarCheck, ChevronLeft, Clock, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { StudentSwitcher } from '@/components/Brand';
import { DetailScreen } from '@/components/DetailScreen';
import { PressableScale } from '@/components/PressableScale';
import { IconBadge, StatusPill } from '@/components/Primitives';
import { AccountStatusIcon, AccountStatusSoft, AccountStatusTint, PaymentMethodIcon } from '@/constants/visuals';
import { card, Gradients, shadow, Theme, withAlpha } from '@/constants/theme';
import { useFamily } from '@/store/familyStore';
import { AccountStatus, AccountStatusTitle, daysUntilDue, type Payment, PaymentMethodTitle, subscriptionProgress, subscriptionRemaining, subscriptionStatus } from '@/types/models';
import { Fmt } from '@/utils/fmt';
import { Haptics } from '@/utils/haptics';

const RING = 112;
const STROKE = 12;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ProgressRing({ progress, resetKey }: { progress: number; resetKey: string }) {
  const value = useRef(new Animated.Value(0)).current;
  const [fraction, setFraction] = useState(0);
  const percent = Math.trunc(fraction * 100);

  useEffect(() => {
    const id = value.addListener(({ value: v }) => setFraction(v));
    return () => value.removeListener(id);
  }, [value]);

  useEffect(() => {
    value.setValue(0);
    const anim = Animated.sequence([Animated.delay(150), Animated.spring(value, { toValue: progress, speed: 6, bounciness: 2, useNativeDriver: false })]);
    anim.start();
    return () => anim.stop();
  }, [progress, resetKey, value]);

  return (
    <View style={styles.ring}>
      <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgLinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={Theme.goldLight} />
            <Stop offset="1" stopColor={Theme.gold} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke={withAlpha(Theme.white, 0.12)} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={RADIUS}
          stroke="url(#gold)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(Math.max(fraction, 0), 1))}
          opacity={percent === 0 ? 0 : 1}
        />
      </Svg>
      <View style={styles.ringLabel}>
        <AppText size="title2" weight="bold" color={Theme.white} align="center">
          {`${Fmt.digits(String(percent))}٪`}
        </AppText>
        <AppText size="caption2" color={withAlpha(Theme.white, 0.6)} align="center">
          مدفوع
        </AppText>
      </View>
    </View>
  );
}

export default function FinanceScreen() {
  const store = useFamily();
  const router = useRouter();
  const sub = store.subscription;
  if (sub == null) {
    return (
      <DetailScreen title="الاشتراك والمدفوعات" gap={18}>
        {store.state.students.length > 1 ? (
          <View style={styles.bleed}>
            <StudentSwitcher />
          </View>
        ) : null}
        <View style={[card(18, 20), styles.gap4]}>
          <AppText size="headline" weight="bold">
            لا يوجد اشتراك مسجّل
          </AppText>
          <AppText size="footnote" color={Theme.muted}>
            {`لم تسجّل الإدارة اشتراكاً لـ ${store.student.firstName} بعد. سيظهر هنا مع الدفعات فور تسجيله.`}
          </AppText>
        </View>
      </DetailScreen>
    );
  }
  const status = subscriptionStatus(sub);
  const StatusIcon = AccountStatusIcon[status];
  const days = daysUntilDue(sub);
  const payments = store.payments;
  const overdue = status === AccountStatus.overdue;

  return (
    <DetailScreen title="الاشتراك والمدفوعات" gap={18}>
      {store.state.students.length > 1 ? (
        <View style={styles.bleed}>
          <StudentSwitcher />
        </View>
      ) : null}

      <View style={styles.balance}>
        <LinearGradient colors={Gradients.navyCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Svg width={320} height={320} style={styles.glow} pointerEvents="none">
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={Theme.gold} stopOpacity={0.28} />
              <Stop offset="1" stopColor={Theme.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={160} cy={160} r={160} fill="url(#glow)" />
        </Svg>
        <View style={styles.between}>
          <View style={styles.gap4}>
            <AppText size="caption" color={withAlpha(Theme.white, 0.65)}>
              {sub.periodTitle}
            </AppText>
            <AppText size="headline" weight="bold" color={Theme.white}>
              {store.student.fullName}
            </AppText>
          </View>
          <StatusPill title={AccountStatusTitle[status]} tint={AccountStatusTint[status]} soft={AccountStatusSoft[status]} icon={StatusIcon} />
        </View>
        <View style={styles.row18}>
          <ProgressRing progress={subscriptionProgress(sub)} resetKey={store.state.selectedStudentID} />
          <View style={styles.gap12}>
            <AmountLine label="المبلغ المدفوع" value={sub.paidAmount} color={Theme.goldLight} />
            <AmountLine label="المبلغ المتبقي" value={subscriptionRemaining(sub)} color={Theme.white} />
            <AmountLine label="إجمالي المستحق" value={sub.dueAmount} color={withAlpha(Theme.white, 0.7)} />
          </View>
        </View>
      </View>

      <View style={styles.row10}>
        <FeeTile icon={Calendar} title="الاشتراك الشهري" value={Fmt.money(sub.monthlyFee)} tint={Theme.navy} />
        <FeeTile
          icon={CalendarCheck}
          title="الاشتراك السنوي"
          value={sub.yearlyFee != null ? Fmt.money(sub.yearlyFee) : 'غير متوفر'}
          tint={Theme.gold}
          note={sub.yearlyFee != null ? `توفير ${Fmt.money(sub.monthlyFee * 12 - sub.yearlyFee)}` : undefined}
        />
      </View>

      <View style={[card(14, 20), styles.row12]}>
        <IconBadge icon={Clock} tint={overdue ? Theme.red : Theme.gold} soft={overdue ? Theme.redSoft : Theme.goldSoft} size={44} />
        <View style={styles.flexGap3}>
          <AppText size="caption" color={Theme.muted}>
            تاريخ الاستحقاق
          </AppText>
          <AppText size="headline" weight="bold">
            {Fmt.date(sub.dueDate)}
          </AppText>
        </View>
        {status === AccountStatus.paid ? (
          <AppText size="caption" weight="bold" color={Theme.green}>
            لا توجد مستحقات
          </AppText>
        ) : (
          <View style={[styles.duePill, { backgroundColor: days >= 0 ? Theme.goldSoft : Theme.redSoft }]}>
            <AppText size="caption" weight="bold" color={days >= 0 ? Theme.gold : Theme.red}>
              {days >= 0 ? `بعد ${Fmt.digits(String(days))} يوم` : `متأخر ${Fmt.digits(String(-days))} يوم`}
            </AppText>
          </View>
        )}
      </View>

      <View style={[card(14, 20), styles.gap10]}>
        <AppText size="subheadline" weight="bold">
          حالة الحساب
        </AppText>
        <View style={styles.row6}>
          {[AccountStatus.paid, AccountStatus.partiallyPaid, AccountStatus.overdue, AccountStatus.unpaid].map((s) => {
            const active = s === status;
            const Icon = AccountStatusIcon[s];
            const fg = active ? Theme.white : AccountStatusTint[s];
            return (
              <View key={s} style={[styles.legend, { backgroundColor: active ? AccountStatusTint[s] : AccountStatusSoft[s], transform: [{ scale: active ? 1.04 : 1 }] }]}>
                <Icon size={16} color={fg} strokeWidth={2.4} />
                <AppText size={11} weight="semibold" color={fg} align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {AccountStatusTitle[s]}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.gap12}>
        <View style={[styles.between, styles.px4]}>
          <AppText size="title3" weight="bold">
            سجل الدفعات
          </AppText>
          <AppText size="caption" color={Theme.muted}>
            {`${Fmt.digits(String(payments.length))} عمليات`}
          </AppText>
        </View>
        <View style={card(8, 22)}>
          {payments.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <View style={styles.paymentDivider} /> : null}
              <PressableScale
                scale={0.98}
                accessibilityLabel={`${PaymentMethodTitle[p.method]} ${Fmt.money(p.amount)}`}
                onPress={() => {
                  Haptics.tap();
                  router.push({ pathname: '/payment/[id]', params: { id: p.id } });
                }}
              >
                <PaymentRow payment={p} />
              </PressableScale>
            </View>
          ))}
        </View>
      </View>
    </DetailScreen>
  );
}

function AmountLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.gap1}>
      <AppText size="caption2" color={withAlpha(Theme.white, 0.6)}>
        {label}
      </AppText>
      <AppText size="headline" weight="bold" color={color}>
        {Fmt.money(value)}
      </AppText>
    </View>
  );
}

function FeeTile({ icon, title, value, tint, note }: { icon: LucideIcon; title: string; value: string; tint: string; note?: string }) {
  return (
    <View style={[card(14, 20), styles.fee]}>
      <IconBadge icon={icon} tint={tint} soft={withAlpha(tint, 0.1)} size={38} />
      <AppText size="caption" color={Theme.muted}>
        {title}
      </AppText>
      <AppText size="headline" weight="bold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </AppText>
      {note != null ? (
        <AppText size="caption2" weight="semibold" color={Theme.green}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <View style={[styles.row12, styles.pad10]}>
      <IconBadge icon={PaymentMethodIcon[payment.method]} tint={Theme.green} soft={Theme.greenSoft} size={42} />
      <View style={styles.flexGap3}>
        <AppText size="subheadline" weight="semibold">
          {PaymentMethodTitle[payment.method]}
        </AppText>
        <AppText size="caption" color={Theme.muted}>
          {`${Fmt.date(payment.date)} · ${payment.id}`}
        </AppText>
      </View>
      <AppText size="subheadline" weight="bold" color={Theme.green}>
        {`+${Fmt.money(payment.amount)}`}
      </AppText>
      <ChevronLeft size={12} color={withAlpha(Theme.muted, 0.6)} strokeWidth={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -16 },
  balance: { padding: 20, gap: 18, borderRadius: 26, overflow: 'hidden', boxShadow: shadow(10, 18, 0.25) },
  glow: { position: 'absolute', top: -240, end: -40 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  row6: { flexDirection: 'row', gap: 6 },
  row10: { flexDirection: 'row', gap: 10 },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row18: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  gap1: { gap: 1 },
  gap4: { flex: 1, gap: 4 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  flexGap3: { flex: 1, gap: 3 },
  px4: { paddingHorizontal: 4 },
  pad10: { padding: 10 },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center' },
  fee: { flex: 1, gap: 10, alignSelf: 'auto' },
  duePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  legend: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 14 },
  paymentDivider: { height: 1, backgroundColor: Theme.line, marginStart: 60 },
});
