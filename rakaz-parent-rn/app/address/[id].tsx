import { useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Building, Check, Flag, House, type LucideIcon, Map, MapPin, NotebookPen, Route } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/Buttons';
import { FormError } from '@/components/FormError';
import { DetailScreen, EmptyState } from '@/components/DetailScreen';
import { MapPinBadge } from '@/components/map/MapMarkers';
import RakazMap from '@/components/map/RakazMap';
import { type MapRegion, regionAround } from '@/components/map/mapTypes';
import { InfoRow, RowDivider } from '@/components/Primitives';
import { HeaderTextButton } from '@/components/ScreenHeader';
import { card, plex, TextSizes, Theme, withAlpha } from '@/constants/theme';
import { useSubmit } from '@/hooks/useSubmit';
import { useFamily } from '@/store/familyStore';
import { addressCoordinate, type StudentAddress } from '@/types/models';
import { Fmt } from '@/utils/fmt';
import { Haptics } from '@/utils/haptics';

type TextKey = 'governorate' | 'area' | 'neighborhood' | 'street' | 'landmark' | 'accessNotes';

const FIELDS: { key: TextKey; icon: LucideIcon; label: string; multiline?: boolean }[] = [
  { key: 'governorate', icon: Building, label: 'المحافظة' },
  { key: 'area', icon: Map, label: 'المنطقة' },
  { key: 'neighborhood', icon: House, label: 'الحي' },
  { key: 'street', icon: Route, label: 'الشارع' },
  { key: 'landmark', icon: Flag, label: 'أقرب نقطة دالة' },
  { key: 'accessNotes', icon: NotebookPen, label: 'ملاحظات الوصول', multiline: true },
];

/** Student address with a draggable-by-pan map: the pin stays centered and the map moves under it. */
export default function AddressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useFamily();
  const submit = useSubmit();
  const student = store.state.students.find((s) => s.id === id);
  const [draft, setDraft] = useState<StudentAddress | null>(student?.address ?? null);
  const [camera, setCamera] = useState<MapRegion | null>(student ? regionAround(addressCoordinate(student.address), 0.006) : null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(lift, { toValue: isDragging ? 1 : 0, speed: 20, bounciness: 10, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [isDragging, lift]);

  if (student == null || draft == null || camera == null) {
    return (
      <DetailScreen title="عنوان الطالب">
        <EmptyState icon={MapPin} title="الطالب غير موجود" />
      </DetailScreen>
    );
  }

  const save = () => {
    void submit.run(() => store.updateAddress(draft, student.id)).then((ok) => {
      if (!ok) return;
      setIsEditing(false);
      setIsDragging(false);
      setSaved(true);
      setCamera(regionAround(addressCoordinate(draft), 0.006));
    });
  };

  const trailing = isEditing ? (
    <HeaderTextButton title="حفظ" bold onPress={save} />
  ) : (
    <HeaderTextButton
      title="تعديل"
      onPress={() => {
        Haptics.tap();
        setIsEditing(true);
      }}
    />
  );

  return (
    <DetailScreen title="عنوان الطالب" trailing={trailing}>
      <View style={styles.mapCard}>
        <RakazMap
          region={camera}
          interactive={isEditing}
          markers={isEditing ? [] : [{ id: 'home', coordinate: addressCoordinate(draft), view: <MapPinBadge icon={House} tint={Theme.red} /> }]}
          onPanStart={() => {
            if (isEditing && !isDragging) setIsDragging(true);
          }}
          onRegionChangeComplete={(r) => {
            if (!isEditing) return;
            setIsDragging(false);
            Haptics.soft();
            setDraft((d) => (d ? { ...d, latitude: r.latitude, longitude: r.longitude } : d));
          }}
          style={StyleSheet.absoluteFill}
        />
        {isEditing ? (
          <View pointerEvents="none" style={styles.pinCenter}>
            <Animated.View style={[styles.pinStack, { transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [-26, -36] }) }] }]}>
              <View style={styles.pinHead}>
                <MapPin size={20} color={Theme.white} strokeWidth={2.6} />
              </View>
              <View style={styles.pinStem} />
            </Animated.View>
            <Animated.View style={[styles.pinShadow, { transform: [{ scaleX: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.57] }) }] }]} />
          </View>
        ) : null}
        <View pointerEvents="none" style={styles.hint}>
          <AppText size="caption" weight="semibold" color={Theme.navy} align="center">
            {isEditing ? 'حرّك الخريطة لتثبيت الدبوس على موقع المنزل' : 'اضغط «تعديل» لتغيير موقع الاستلام'}
          </AppText>
        </View>
      </View>

      <View style={styles.row10}>
        <Coord label="Latitude" value={draft.latitude} />
        <Coord label="Longitude" value={draft.longitude} />
      </View>

      <View style={card(12)}>
        {FIELDS.map((f, i) => (
          <View key={f.key}>
            {i > 0 ? <RowDivider /> : null}
            {isEditing ? (
              <View style={styles.fieldRow}>
                <View style={styles.fieldIcon}>
                  <f.icon size={15} color={Theme.gold} strokeWidth={2.2} />
                </View>
                <View style={styles.flexGap2}>
                  <AppText size="caption" color={Theme.muted}>
                    {f.label}
                  </AppText>
                  <TextInput
                    value={draft[f.key]}
                    onChangeText={(text) => setDraft((d) => (d ? { ...d, [f.key]: text } : d))}
                    placeholder={f.label}
                    placeholderTextColor={withAlpha(Theme.muted, 0.7)}
                    multiline={f.multiline}
                    numberOfLines={f.multiline ? 3 : 1}
                    style={[styles.input, f.multiline ? styles.multiline : null]}
                    accessibilityLabel={f.label}
                  />
                </View>
              </View>
            ) : (
              <InfoRow icon={f.icon} label={f.label} value={draft[f.key]} />
            )}
          </View>
        ))}
      </View>

      <FormError message={submit.error} />
      {isEditing ? <PrimaryButton title="حفظ العنوان" icon={Check} onPress={save} loading={submit.busy} /> : null}
      {saved && !isEditing ? (
        <View style={styles.saved}>
          <BadgeCheck size={16} color={Theme.green} />
          <AppText size="footnote" weight="semibold" color={Theme.green}>
            تم حفظ العنوان وإبلاغ السائق والإدارة
          </AppText>
        </View>
      ) : null}
    </DetailScreen>
  );
}

function Coord({ label, value }: { label: string; value: number }) {
  return (
    <View style={[card(14, 18), styles.coord]}>
      <AppText size="caption" color={Theme.muted}>
        {label}
      </AppText>
      <AppText size="subheadline" weight="bold" style={styles.mono}>
        {Fmt.coordinate(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: { height: 300, borderRadius: 24, overflow: 'hidden', backgroundColor: '#E8ECE6' },
  pinCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pinStack: { alignItems: 'center', position: 'absolute' },
  pinHead: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Theme.red,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 6px rgba(0,0,0,0.25)',
  },
  pinStem: { width: 3, height: 14, backgroundColor: Theme.red },
  pinShadow: { width: 14, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)' },
  hint: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: withAlpha(Theme.white, 0.92),
  },
  row10: { flexDirection: 'row', gap: 10 },
  coord: { flex: 1, gap: 4, alignSelf: 'auto' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), writingDirection: 'ltr' },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  fieldIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Theme.goldSoft, alignItems: 'center', justifyContent: 'center' },
  flexGap2: { flex: 1, gap: 2 },
  input: {
    ...plex(TextSizes.subheadline, 'semibold'),
    lineHeight: undefined,
    color: Theme.ink,
    paddingVertical: 2,
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    writingDirection: 'rtl',
  },
  multiline: { minHeight: 44, textAlignVertical: 'top' },
  saved: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 14, backgroundColor: Theme.greenSoft },
});
