import { LinearGradient } from 'expo-linear-gradient';
import { Bus, Hash, Palette, Phone, ShieldCheck, User } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/Buttons';
import { DetailScreen } from '@/components/DetailScreen';
import { Avatar, InfoRow, RowDivider } from '@/components/Primitives';
import { card, Theme, withAlpha } from '@/constants/theme';
import { useFamily } from '@/store/familyStore';
import { driverTenure, maskedPhone } from '@/types/models';
import { Fmt } from '@/utils/fmt';

/** Guardian-facing driver profile. Only non-sensitive fields are shown; the phone number is masked. */
export default function DriverScreen() {
  const store = useFamily();
  const driver = store.student.driver;
  const vehicle = driver.vehicle;
  const tenure = driverTenure(driver);

  return (
    <DetailScreen title="بيانات السائق">
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Bus size={70} color={withAlpha(Theme.goldLight, 0.7)} strokeWidth={1.4} />
        </View>
        <LinearGradient colors={['transparent', withAlpha(Theme.black, 0.6)]} start={{ x: 0.5, y: 0.5 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.heroText}>
          <AppText size="title3" weight="bold" color={Theme.white}>
            {vehicle.model || `حافلة ${vehicle.busNumber}`}
          </AppText>
          <AppText size="caption" weight="semibold" color={withAlpha(Theme.white, 0.8)}>
            {vehicle.capacity != null ? `حافلة ${vehicle.busNumber} · ${Fmt.digits(String(vehicle.capacity))} مقعداً` : `حافلة ${vehicle.busNumber}`}
          </AppText>
        </View>
        <View style={styles.plate}>
          <AppText size="caption" weight="bold" color={Theme.navy}>
            {vehicle.plateNumber}
          </AppText>
        </View>
      </View>

      <View style={[card(16), styles.row14]}>
        <Avatar initials={driver.name.charAt(0)} size={72} tint={Theme.navy} />
        <View style={styles.flexGap4}>
          <AppText size="caption" color={Theme.muted}>
            السائق
          </AppText>
          <AppText size="title3" weight="bold">
            {driver.name}
          </AppText>
          {tenure ? (
            <AppText size="caption" weight="semibold" color={Theme.muted}>
              {Fmt.digits(tenure)}
            </AppText>
          ) : null}
        </View>
      </View>

      <View style={card(12)}>
        <InfoRow icon={User} label="اسم السائق" value={driver.name} />
        <RowDivider />
        <InfoRow icon={Phone} label="رقم الهاتف" value={driver.phone ? maskedPhone(driver) : '—'} mono />
        <RowDivider />
        <InfoRow icon={Bus} label="نوع المركبة" value={vehicle.model || '—'} />
        <RowDivider />
        <InfoRow icon={Hash} label="رقم المركبة" value={vehicle.plateNumber || '—'} />
        <RowDivider />
        <InfoRow icon={Palette} label="اللون" value={vehicle.color || '—'} />
      </View>

      {driver.assigned ? (
        <PrimaryButton title="الاتصال بالسائق" icon={Phone} fill={Theme.green} onPress={() => void Linking.openURL(`tel:${driver.phone}`)} />
      ) : (
        <AppText size="footnote" color={Theme.muted} align="center">
          لم تُسند الإدارة سائقاً لهذا الطالب بعد.
        </AppText>
      )}

      <View style={styles.privacy}>
        <ShieldCheck size={16} color={Theme.blue} fill={withAlpha(Theme.blue, 0.2)} />
        <AppText size="caption" color={Theme.muted} style={styles.flex}>
          حفاظاً على الخصوصية، يتم إخفاء البيانات الحساسة للسائق مثل رقم الهاتف الكامل والعنوان ووثائق الهوية.
        </AppText>
      </View>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 210, borderRadius: 24, overflow: 'hidden', backgroundColor: Theme.navy },
  heroIcon: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  heroText: { position: 'absolute', bottom: 16, start: 16, gap: 2 },
  plate: {
    position: 'absolute',
    top: 14,
    end: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Theme.white,
    borderWidth: 1.5,
    borderColor: Theme.navy,
  },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row14: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1 },
  flexGap4: { flex: 1, gap: 4 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 16, backgroundColor: Theme.blueSoft },
});
