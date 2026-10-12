import { useRouter } from 'expo-router';
import { Building, Bus, Eye, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StudentSwitcher } from '@/components/Brand';
import { PrimaryButton } from '@/components/Buttons';
import { FormError } from '@/components/FormError';
import { DetailScreen } from '@/components/DetailScreen';
import { PressableScale } from '@/components/PressableScale';
import { Avatar } from '@/components/Primitives';
import { HeaderTextButton } from '@/components/ScreenHeader';
import { Segmented } from '@/components/Segmented';
import { SentConfirmation } from '@/components/SentConfirmation';
import { AbsenceReasonIcon } from '@/constants/visuals';
import { card, plex, TextSizes, Theme, withAlpha } from '@/constants/theme';
import { useSubmit } from '@/hooks/useSubmit';
import { useFamily } from '@/store/familyStore';
import {
  AbsenceReason,
  AbsenceReasonTitle,
  AbsenceScope,
  AbsenceScopeTitle,
  addDays,
  allAbsenceReasons,
  allAbsenceScopes,
  isSameDay,
  isToday,
  isTomorrow,
  startOfDay,
} from '@/types/models';
import { Fmt } from '@/utils/fmt';
import { Haptics } from '@/utils/haptics';

/** Next school days: Friday and Saturday are the Iraqi weekend, Sunday is a school day. */
function upcomingDays(): number[] {
  const start = startOfDay(Date.now());
  const result: number[] = [];
  for (let i = 0; i < 10 && result.length < 7; i += 1) {
    const d = addDays(start, i);
    const weekday = new Date(d).getDay();
    if (weekday !== 5 && weekday !== 6) result.push(d);
  }
  return result;
}

export default function ReportAbsenceScreen() {
  const store = useFamily();
  const submit = useSubmit();
  const router = useRouter();
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [scope, setScope] = useState<AbsenceScope>(AbsenceScope.fullDay);
  const [reason, setReason] = useState<AbsenceReason>(AbsenceReason.none);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const days = upcomingDays();
  const student = store.student;

  return (
    <DetailScreen title="إبلاغ غياب" inSheet leading={<HeaderTextButton title="إغلاق" onPress={() => router.back()} />} gap={20}>
      {sent ? (
        <SentConfirmation
          title="تم إرسال بلاغ الغياب"
          message={`${student.firstName} غائب ${isToday(day) ? 'اليوم' : Fmt.shortDay(day)} · ${AbsenceScopeTitle[scope]}`}
          onDone={() => router.back()}
        >
          <View style={styles.recipients}>
            <Recipient title="الإدارة" icon="admin" />
            <Recipient title="السائق" icon="driver" />
          </View>
        </SentConfirmation>
      ) : (
        <>
          <View style={[card(12, 18), styles.row12]}>
            <Avatar initials={student.firstName.charAt(0)} size={46} tint={Theme.gold} />
            <View style={styles.flexGap2}>
              <AppText size="caption" color={Theme.muted}>
                الطالب
              </AppText>
              <AppText size="headline" weight="bold">
                {student.fullName}
              </AppText>
            </View>
          </View>

          {store.state.students.length > 1 ? (
            <View style={styles.bleed}>
              <StudentSwitcher />
            </View>
          ) : null}

          <Label text="اليوم" />
          <View style={styles.bleed}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
              {days.map((d) => {
                const selected = isSameDay(d, day);
                const fg = selected ? Theme.white : Theme.ink;
                return (
                  <PressableScale
                    key={d}
                    accessibilityLabel={Fmt.shortDay(d)}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      Haptics.selection();
                      setDay(d);
                    }}
                    style={[styles.day, { backgroundColor: selected ? Theme.navy : Theme.card }]}
                  >
                    <AppText size="caption2" weight="semibold" color={fg} align="center">
                      {isToday(d) ? 'اليوم' : isTomorrow(d) ? 'غداً' : Fmt.weekday(d)}
                    </AppText>
                    <AppText size="title3" weight="bold" color={fg} align="center">
                      {Fmt.digits(String(new Date(d).getDate()))}
                    </AppText>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>

          <Label text="الرحلات" />
          <Segmented options={allAbsenceScopes.map((s) => ({ value: s, title: AbsenceScopeTitle[s] }))} value={scope} onChange={setScope} />

          <Label text="السبب (اختياري)" />
          <View style={styles.reasons}>
            {allAbsenceReasons.map((r) => {
              const selected = reason === r;
              const Icon = AbsenceReasonIcon[r];
              const fg = selected ? Theme.white : Theme.ink;
              return (
                <PressableScale
                  key={r}
                  accessibilityLabel={AbsenceReasonTitle[r]}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    Haptics.selection();
                    setReason(r);
                  }}
                  style={[styles.reason, { backgroundColor: selected ? Theme.gold : Theme.card }]}
                >
                  <Icon size={14} color={fg} />
                  <AppText size="footnote" weight="semibold" color={fg}>
                    {AbsenceReasonTitle[r]}
                  </AppText>
                </PressableScale>
              );
            })}
          </View>

          <Label text="ملاحظة" />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="مثال: سيعود الطالب للدوام يوم الأحد"
            placeholderTextColor={withAlpha(Theme.muted, 0.8)}
            multiline
            style={styles.note}
            accessibilityLabel="ملاحظة"
          />

          <View style={styles.row8}>
            <Eye size={14} color={Theme.muted} fill={Theme.muted} />
            <AppText size="caption" weight="medium" color={Theme.muted}>
              سيظهر البلاغ للإدارة والسائق فوراً
            </AppText>
          </View>

          <FormError message={submit.error} />
          <PrimaryButton
            title="إرسال البلاغ"
            icon={Send}
            fill={Theme.red}
            loading={submit.busy}
            onPress={() => {
              void submit.run(() => store.reportAbsence(day, scope, reason, note)).then((ok) => {
                if (ok) setSent(true);
              });
            }}
          />
        </>
      )}
    </DetailScreen>
  );
}

function Label({ text }: { text: string }) {
  return (
    <AppText size="subheadline" weight="bold" style={styles.label}>
      {text}
    </AppText>
  );
}

function Recipient({ title, icon }: { title: string; icon: 'admin' | 'driver' }) {
  const Icon = icon === 'admin' ? Building : Bus;
  return (
    <View style={styles.recipient}>
      <Icon size={13} color={Theme.green} />
      <AppText size="caption" weight="bold" color={Theme.green}>
        {`أُرسل إلى ${title}`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flexGap2: { flex: 1, gap: 2 },
  label: { marginBottom: -8 },
  bleed: { marginHorizontal: -16 },
  days: { gap: 8, paddingHorizontal: 16 },
  day: { width: 64, height: 70, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 4 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reason: { flexGrow: 1, flexBasis: 100, minHeight: 42, borderRadius: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  note: {
    ...plex(TextSizes.body),
    lineHeight: undefined,
    minHeight: 96,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Theme.card,
    color: Theme.ink,
    textAlignVertical: 'top',
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    writingDirection: 'rtl',
  },
  recipients: { flexDirection: 'row', gap: 10, paddingTop: 6, flexWrap: 'wrap', justifyContent: 'center' },
  recipient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Theme.greenSoft },
});
