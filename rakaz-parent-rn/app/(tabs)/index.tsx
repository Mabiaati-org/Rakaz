import { Bell, CalendarMinus, CreditCard, GraduationCap, IdCard, type LucideIcon, User } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BrandScreen, HeaderBar, StudentSwitcher } from '@/components/Brand';
import { PressableScale } from '@/components/PressableScale';
import { IconBadge, LogoBadge, SectionTitle } from '@/components/Primitives';
import { AbsenceTodayCard, LiveRouteCard, StudentTripCard, TripStationsCard } from '@/components/TripCards';
import { shadow, Theme, withAlpha } from '@/constants/theme';
import { useAppNav } from '@/hooks/useAppNav';
import { useFamily } from '@/store/familyStore';
import { useSession } from '@/store/sessionStore';
import { Fmt } from '@/utils/fmt';
import { Haptics } from '@/utils/haptics';

export default function HomeScreen() {
  const store = useFamily();
  const session = useSession();
  const nav = useAppNav();
  const morning = new Date().getHours() < 12;

  const header = (
    <View style={styles.header}>
      <HeaderBar
        leading={{ icon: User, label: 'العائلة', onPress: () => nav.openTab('family') }}
        trailing={{ icon: Bell, label: 'الإشعارات', badge: store.unreadCount > 0, onPress: nav.showNotifications }}
      >
        <LogoBadge height={36} />
      </HeaderBar>
      <View style={styles.greeting}>
        <AppText size="subheadline" color={withAlpha(Theme.white, 0.7)}>
          {`${morning ? 'صباح الخير' : 'مساء الخير'}، ${session.account?.familyName ?? ''}`}
        </AppText>
        <View style={styles.titleRow}>
          <AppText size={30} weight="bold" color={Theme.white}>
            {morning ? 'صباحك آمن' : 'يومك آمن'}
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
    <BrandScreen overlap={96} header={header}>
      <StudentTripCard />
      {store.todaysAbsence ? <AbsenceTodayCard absence={store.todaysAbsence} /> : null}
      <LiveRouteCard onFollow={() => nav.liveTrip(store.state.activeKind)} />
      <TripStationsCard />
      <View style={styles.quick}>
        <SectionTitle title="اختصارات" />
        <View style={styles.quickRow}>
          <QuickAction icon={IdCard} title="ملف الطالب" tint={Theme.ink} soft={Theme.blueSoft} onPress={() => nav.student(store.state.selectedStudentID)} />
          <QuickAction icon={CalendarMinus} title="إبلاغ غياب" tint={Theme.red} soft={Theme.redSoft} onPress={nav.reportAbsence} />
          <QuickAction icon={GraduationCap} title="المدرسة" tint={Theme.greenDeep} soft={Theme.greenSoft} onPress={nav.school} />
          <QuickAction icon={CreditCard} title="الاشتراك" tint={Theme.gold} soft={Theme.goldSoft} onPress={nav.finance} />
        </View>
      </View>
    </BrandScreen>
  );
}

function QuickAction({ icon, title, tint, soft, onPress }: { icon: LucideIcon; title: string; tint: string; soft: string; onPress: () => void }) {
  return (
    <PressableScale
      scale={0.94}
      accessibilityLabel={title}
      onPress={() => {
        Haptics.tap();
        onPress();
      }}
      style={styles.quickItem}
    >
      <IconBadge icon={icon} tint={tint} soft={soft} size={44} />
      <AppText size="caption" weight="semibold" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {title}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { gap: 18 },
  greeting: { gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  switcher: { marginHorizontal: -20 },
  quick: { gap: 10 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Theme.card,
    borderRadius: 20,
    boxShadow: shadow(4, 10, 0.05),
  },
});
