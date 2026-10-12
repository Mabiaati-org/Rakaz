import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { DetailScreen } from '@/components/DetailScreen';
import { NotificationKindIcon, notificationTint } from '@/constants/visuals';
import { card, Theme, withAlpha } from '@/constants/theme';
import { useFamily } from '@/store/familyStore';
import { allNotificationKinds, isNotificationOn, NotificationKindTitle } from '@/types/models';

export default function NotificationSettingsScreen() {
  const store = useFamily();
  const { sheet } = useLocalSearchParams<{ sheet?: string }>();

  return (
    <DetailScreen title="إعدادات الإشعارات" inSheet={sheet === '1'} gap={8}>
      <AppText size="footnote" weight="semibold" color={Theme.muted} style={styles.px16}>
        الإشعارات الفورية (Push)
      </AppText>
      <View style={card(0, 16)}>
        {allNotificationKinds.map((kind, i) => {
          const Icon = NotificationKindIcon[kind];
          return (
            <View key={kind} style={[styles.row, i > 0 ? styles.rowBorder : null]}>
              <Icon size={18} color={notificationTint(kind)} />
              <AppText size="subheadline" weight="semibold" style={styles.flex}>
                {NotificationKindTitle[kind]}
              </AppText>
              <Switch
                value={isNotificationOn(store.state.preferences, kind)}
                onValueChange={(on) => store.setPreference(kind, on)}
                trackColor={{ true: Theme.gold, false: withAlpha(Theme.muted, 0.3) }}
                thumbColor={Theme.white}
                accessibilityLabel={NotificationKindTitle[kind]}
              />
            </View>
          );
        })}
      </View>
      <AppText size="caption" color={Theme.muted} style={styles.footer}>
        اختر الإشعارات التي تصل إلى هاتفك. ما توقفه هنا يبقى ظاهراً في قائمة الإشعارات داخل التطبيق. نوصي بإبقاء إشعارات الاستلام والتسليم مفعّلة.
      </AppText>

    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  px16: { paddingHorizontal: 16 },
  footer: { paddingHorizontal: 16, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52, paddingVertical: 6 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.line },
  flex: { flex: 1 },
});
