import { Landmark, Navigation2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline, UrlTile } from 'react-native-maps';

import { MAP_ATTRIBUTION, MAP_TILE_URL } from '@/constants/map';
import { Rakaz, withAlpha } from '@/constants/theme';
import { useDriverStore } from '@/store/driverStore';
import { ArabicFormat } from '@/utils/arabicFormat';

import { AppText } from './AppText';
import { type RouteMapProps, buildRouteMapModel, regionFor } from './routeMapModel';

function BusMarker({ heading }: { heading: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.busWrap}>
      <Animated.View
        style={[
          styles.busPulse,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.25] }) }],
          },
        ]}
      />
      <View style={styles.bus}>
        <View style={{ transform: [{ rotate: `${heading}deg` }] }}>
          <Navigation2 color={Rakaz.White} fill={Rakaz.White} size={16} />
        </View>
      </View>
    </View>
  );
}

/** Live route map: gold route line, numbered stops, the school and a pulsing bus marker. */
export default function RouteMap({ focus = null, zoom = 1, interactive = false, style }: RouteMapProps) {
  const { state, derived } = useDriverStore();
  const model = useMemo(() => buildRouteMapModel(state, derived), [state, derived]);
  const region = useMemo(() => regionFor(model, focus, zoom), [model, focus, zoom]);
  const mapRef = useRef<MapView>(null);
  const initialRegion = useRef(region).current;

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 400);
  }, [region]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        // Android: hide Google's base map and draw OpenStreetMap tiles over the empty canvas.
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsPointsOfInterests={false}
        showsUserLocation={false}
        moveOnMarkerPress={false}
      >
        <UrlTile urlTemplate={MAP_TILE_URL} maximumZ={19} shouldReplaceMapContent zIndex={-1} />
        {model.path.length > 1 ? (
          <>
            <Polyline coordinates={model.path} strokeColor={withAlpha(Rakaz.Navy, 0.18)} strokeWidth={11} lineCap="round" lineJoin="round" zIndex={1} />
            <Polyline coordinates={model.path} strokeColor={Rakaz.Gold} strokeWidth={7} lineCap="round" lineJoin="round" zIndex={2} />
            <Polyline coordinates={model.path} strokeColor={withAlpha(Rakaz.White, 0.7)} strokeWidth={2} lineDashPattern={[6, 12]} zIndex={3} />
          </>
        ) : null}

        {model.school ? (
          <Marker coordinate={model.school} anchor={{ x: 0.5, y: 0.5 }} title="المدرسة" zIndex={4}>
            <View style={styles.school}>
              <Landmark color={Rakaz.White} size={17} />
            </View>
          </Marker>
        ) : null}

        {model.pins.map((pin) => (
          <Marker key={pin.key} coordinate={pin.coordinate} anchor={{ x: 0.5, y: 0.5 }} zIndex={pin.isNext ? 6 : 5}>
            <View
              style={[
                styles.pin,
                { width: pin.size, height: pin.size, borderRadius: pin.size / 2, backgroundColor: pin.fill, borderColor: pin.border },
              ]}
            >
              <AppText variant="labelSmall" color={pin.foreground} style={styles.pinText}>
                {ArabicFormat.number(pin.index + 1)}
              </AppText>
            </View>
          </Marker>
        ))}

        <Marker coordinate={model.bus} anchor={{ x: 0.5, y: 0.5 }} zIndex={10} title="الحافلة">
          <BusMarker heading={model.heading} />
        </Marker>
      </MapView>
      <View pointerEvents="none" style={styles.attribution}>
        <AppText variant="labelSmall" color={Rakaz.InkSecondary} style={styles.attributionText}>
          {MAP_ATTRIBUTION}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Rakaz.MapLand, overflow: 'hidden' },
  school: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Rakaz.Navy,
    borderWidth: 2,
    borderColor: Rakaz.White,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attribution: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: withAlpha(Rakaz.White, 0.75),
  },
  attributionText: { fontSize: 9, lineHeight: 12 },
  pin: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pinText: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  busWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  busPulse: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: withAlpha(Rakaz.Gold, 0.35),
  },
  bus: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Rakaz.Gold,
    borderWidth: 3,
    borderColor: Rakaz.Navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
