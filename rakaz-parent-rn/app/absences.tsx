import { CalendarCheck, CircleCheck, Clock, Plus, Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StudentSwitcher } from '@/components/Brand';
import { DetailScreen, EmptyState } from '@/components/DetailScreen';
import { PressableScale } from '@/components/PressableScale';
import { StatusPill } from '@/components/Primitives';
import { AbsenceReasonIcon } from '@/constants/visuals';
import { card, Theme } from '@/constants/theme';
import { useAppNav } from '@/hooks/useAppNav';
import { rakazErrorText } from '@rakaz/contract';

import { useFamily } from '@/store/familyStore';
import { showAlert } from '@/utils/dialog';
import { AbsenceReasonTitle, AbsenceScopeTitle } from '@/types/models';
import { Fmt } from '@/utils/fmt';
import { Haptics } from '@/utils/haptics';

export default function AbsenceHistoryScreen() {
  const store = useFamily();
  const nav = useAppNav();
  const items = store.absencesFor(store.state.selectedStudentID);

  const add = (
    <PressableScale accessibilityLabel="إبلاغ غياب" onPress={nav.reportAbsence} style={styles.add} hitSlop={8}>
      <Plus size={24} color={Theme.gold} strokeWidth={2.4} />
    </PressableScale>
  );

  return (
    <DetailScreen title="سجل الغياب" trailing={add}>
      {store.state.students.length > 1 ? (
        <View style={styles.switcher}>
          <StudentSwitcher />
        </View>
      ) : null}
      {items.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="لا توجد بلاغات غياب" message="عند إبلاغ الغياب سيظهر هنا مع حالة اطّلاع الإدارة والسائق." />
      ) : (
        <View style={styles.gap8}>
          <AppText size="footnote" weight="semibold" color={Theme.muted} style={styles.px4}>
            البلاغات
          </AppText>
          <View style={card(0, 16)}>
            {items.map((a, i) => {
              const ReasonIcon = AbsenceReasonIcon[a.reason];
              return (
                <View key={a.id} style={[styles.item, i > 0 ? styles.itemBorder : null]}>
                  <View style={styles.between}>
                    <AppText size="subheadline" weight="bold">
                      {Fmt.shortDay(a.day)}
                    </AppText>
                    <StatusPill title={AbsenceScopeTitle[a.scope]} tint={Theme.red} soft={Theme.redSoft} />
                  </View>
                  <View style={styles.row6}>
                    <ReasonIcon size={13} color={Theme.muted} />
                    <AppText size="caption" weight="semibold" color={Theme.muted}>
                      {AbsenceReasonTitle[a.reason]}
                    </AppText>
                  </View>
                  {a.note.length > 0 ? <AppText size="footnote">{a.note}</AppText> : null}
                  <View style={styles.between}>
                    <View style={styles.row12}>
                      <Seen who="الإدارة" ok={a.seenByAdmin} />
                      <Seen who="السائق" ok={a.seenByDriver} />
                    </View>
                    <PressableScale
                      accessibilityLabel="إلغاء"
                      onPress={() => {
                        Haptics.tap();
                        void store.cancelAbsence(a.id).catch((error: unknown) => showAlert('تعذّر إلغاء البلاغ', rakazErrorText(error)));
                      }}
                      style={styles.cancel}
                    >
                      <Trash2 size={13} color={Theme.red} />
                      <AppText size="caption" weight="semibold" color={Theme.red}>
                        إلغاء
                      </AppText>
                    </PressableScale>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </DetailScreen>
  );
}

function Seen({ who, ok }: { who: string; ok: boolean }) {
  const color = ok ? Theme.green : Theme.muted;
  return (
    <View style={styles.row4}>
      {ok ? <CircleCheck size={13} color={Theme.white} fill={Theme.green} /> : <Clock size={13} color={color} />}
      <AppText size="caption" color={color}>
        {ok ? `اطّلع ${who}` : `بانتظار ${who}`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  add: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  switcher: { marginHorizontal: -16 },
  gap8: { gap: 8 },
  px4: { paddingHorizontal: 16 },
  item: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.line },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancel: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: 4 },
});
