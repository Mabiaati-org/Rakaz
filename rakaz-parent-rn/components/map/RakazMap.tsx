import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';

import { AppText } from '@/components/AppText';
import { MAP_ATTRIBUTION, MAP_TILE_URL } from '@/constants/map';
import { Theme, withAlpha } from '@/constants/theme';

import type { RakazMapProps } from '@/components/map/mapTypes';

export default function RakazMap({ region, markers = [], lines = [], interactive = false, onPanStart, onRegionChangeComplete, style }: RakazMapProps) {
  const mapRef = useRef<MapView>(null);
  const initialRegion = useRef(region).current;
  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  useEffect(() => {
    mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta, longitudeDelta }, 900);
  }, [latitude, longitude, latitudeDelta, longitudeDelta]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        // Android: hide Google's base map and draw OpenStreetMap tiles over the empty canvas.
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        showsPointsOfInterests={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        onPanDrag={onPanStart}
        onRegionChangeComplete={(r) => onRegionChangeComplete?.(r)}
      >
        <UrlTile urlTemplate={MAP_TILE_URL} maximumZ={19} shouldReplaceMapContent zIndex={-1} />
        {lines.map((l) => (
          <Polyline key={l.id} coordinates={l.coordinates} strokeColor={l.color} strokeWidth={l.width} lineDashPattern={l.dash} lineCap="round" lineJoin="round" />
        ))}
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={m.coordinate}
            anchor={m.anchor === 'bottom' ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
            tracksViewChanges={m.animated ?? false}
          >
            {m.view}
          </Marker>
        ))}
      </MapView>
      <View pointerEvents="none" style={styles.attribution}>
        <AppText size={9} color={Theme.muted}>
          {MAP_ATTRIBUTION}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#E8ECE6' },
  attribution: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: withAlpha(Theme.white, 0.75),
  },
});
