import { useLocalSearchParams } from 'expo-router';
import { Bus, ChevronLeft, Gift, GraduationCap, Hash, Landmark, Library, type LucideIcon, MapPinned, Phone, User, UserRound, Users, UserX } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { DetailScreen, EmptyState } from '@/components/DetailScreen';
import { PressableScale } from '@/components/PressableScale';
import { Avatar, IconBadge, InfoRow, RowDivider, StatusPill } from '@/components/Primitives';
import { card, shadow, Theme, withAlpha } from '@/constants/theme';
import { useAppNav } from '@/hooks/useAppNav';
import { useFamily } from '@/store/familyStore';
import { addressSummary, Gender, GenderTitle, studentAge } from '@/types/models';
import { Fmt } from '@/utils/fmt';

export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useFamily();
  const nav = useAppNav();
  const s = store.state.students.find((st) => st.id === id);

  if (s == null) {
    return (
      <DetailScreen title="ملف الطالب">
        <EmptyState icon={UserX} title="الطالب غير موجود" />
      </DetailScreen>
    );
  }

  return (
    <DetailScreen title="ملف الطالب" gap={18}>
      <View style={styles.hero}>
        <View style={styles.avatarFrame}>
          <Avatar initials={s.firstName.charAt(0)} size={108} tint={s.gender === Gender.female ? Theme.gold : Theme.blue} />
        </View>
        <AppText size="title2" weight="bold" align="center">
          {s.fullName}
        </AppText>
        <View style={styles.pills}>
          <StatusPill title={s.grade} tint={Theme.navy} soft={Theme.blueSoft} />
          <StatusPill title={s.stage} tint={Theme.gold} soft={Theme.goldSoft} />
        </View>
      </View>

      <View style={card(12)}>
        <InfoRow icon={User} label="الاسم الكامل" value={s.fullName} />
        <RowDivider />
        {s.birthDate != null ? (
          <>
            <InfoRow icon={Gift} label="تاريخ الميلاد" value={`${Fmt.date(s.birthDate)} (${Fmt.digits(String(studentAge(s)))} سنوات)`} />
            <RowDivider />
          </>
        ) : null}
        {s.gender != null ? (
          <>
            <InfoRow icon={s.gender === Gender.female ? UserRound : User} label="الجنس" value={GenderTitle[s.gender]} />
            <RowDivider />
          </>
        ) : null}
        <InfoRow icon={GraduationCap} label="الصف" value={s.grade} />
        <RowDivider />
        <InfoRow icon={Library} label="المرحلة الدراسية" value={s.stage} />
        <RowDivider />
        <InfoRow icon={Landmark} label="اسم المدرسة" value={s.schoolName} />
        <RowDivider />
        <InfoRow icon={Hash} label="رقم الطالب الداخلي" value={s.internalNumber} mono copyable />
      </View>

      <View style={styles.gap6}>
        <AppText size="subheadline" weight="bold" color={Theme.muted} style={styles.px4}>
          ولي الأمر
        </AppText>
        <View style={card(12)}>
          <InfoRow icon={Users} label="اسم ولي الأمر" value={s.guardianName} />
          <RowDivider />
          <InfoRow icon={Phone} label="رقم ولي الأمر" value={s.guardianPhone} mono />
        </View>
      </View>

      <View style={styles.gap10}>
        <LinkTile icon={MapPinned} title="عنوان الطالب" subtitle={addressSummary(s.address)} tint={Theme.red} onPress={() => nav.address(s.id)} />
        <LinkTile icon={Landmark} title="بيانات المدرسة" subtitle={s.school.name} tint={Theme.teal} onPress={nav.school} />
        <LinkTile icon={Bus} title="السائق والمركبة" subtitle={`${s.driver.name} · ${s.driver.vehicle.model}`} tint={Theme.navy} onPress={nav.driver} />
      </View>
    </DetailScreen>
  );
}

function LinkTile({ icon, title, subtitle, tint, onPress }: { icon: LucideIcon; title: string; subtitle: string; tint: string; onPress: () => void }) {
  return (
    <PressableScale scale={0.98} accessibilityLabel={title} onPress={onPress} style={[card(12, 18), styles.row12]}>
      <IconBadge icon={icon} tint={tint} soft={withAlpha(tint, 0.1)} size={42} />
      <View style={styles.flexGap2}>
        <AppText size="subheadline" weight="bold">
          {title}
        </AppText>
        <AppText size="caption" color={Theme.muted} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <ChevronLeft size={14} color={withAlpha(Theme.muted, 0.6)} strokeWidth={2.8} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  avatarFrame: { borderRadius: 36, borderWidth: 4, borderColor: Theme.white, boxShadow: shadow(8, 16, 0.2) },
  pills: { flexDirection: 'row', gap: 8 },
  gap6: { gap: 6 },
  gap10: { gap: 10 },
  px4: { paddingHorizontal: 4 },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flexGap2: { flex: 1, gap: 2 },
});
