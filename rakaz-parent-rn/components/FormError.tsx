import { CircleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Theme } from '@/constants/theme';

/** Inline message shown when a request failed; renders nothing without a message. */
export function FormError({ message }: { message: string | null }) {
  if (message == null) return null;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <CircleAlert size={15} color={Theme.white} fill={Theme.red} />
      <AppText size="footnote" weight="medium" color={Theme.red} style={styles.flex}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: Theme.redSoft },
  flex: { flex: 1 },
});
