import { RefreshCw, UserX } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { OutlineButton, PrimaryButton } from '@/components/Buttons';
import { IconBadge, LogoBadge } from '@/components/Primitives';
import { card, Theme } from '@/constants/theme';
import { useFamily } from '@/store/familyStore';
import { useSession } from '@/store/sessionStore';

/**
 * Shown after sign-in while there is nothing to display yet: the first load is in flight,
 * it failed with nothing cached, or the administration has not linked a student to this account.
 */
export default function WaitingScreen() {
  const store = useFamily();
  const session = useSession();
  const { loaded, loadError } = store.state;

  if (!loaded && loadError == null) {
    return (
      <View style={styles.root}>
        <LogoBadge height={46} />
        <ActivityIndicator color={Theme.gold} size="large" />
        <AppText size="footnote" color={Theme.muted} align="center">
          جارٍ تحميل بيانات أطفالك…
        </AppText>
      </View>
    );
  }

  const failed = !loaded;
  return (
    <View style={styles.root}>
      <View style={[card(22, 26), styles.box]}>
        <IconBadge icon={failed ? RefreshCw : UserX} tint={Theme.gold} soft={Theme.goldSoft} size={56} />
        <AppText size="title3" weight="bold" align="center">
          {failed ? 'تعذّر تحميل البيانات' : 'لا يوجد طلاب مرتبطون بحسابك'}
        </AppText>
        <AppText size="footnote" color={Theme.muted} align="center">
          {failed ? loadError : 'ستظهر بيانات أطفالك هنا بعد أن تربطهم إدارة ركاز برقم هاتفك. إن كنت تتوقع رؤيتهم الآن فتواصل مع الإدارة.'}
        </AppText>
        <PrimaryButton title="إعادة المحاولة" icon={RefreshCw} onPress={() => void store.load()} />
        <OutlineButton title="تسجيل الخروج" onPress={session.logout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.canvas, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 },
  box: { alignSelf: 'stretch', alignItems: 'stretch', gap: 14, maxWidth: 480 },
});
