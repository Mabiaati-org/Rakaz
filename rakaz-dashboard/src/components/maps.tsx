import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import type { RakazGeoPoint } from '@rakaz/contract';

const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Drawn with CSS so no marker images have to be bundled.
const pin = (className: string, label = ''): L.DivIcon =>
  L.divIcon({ className: '', html: `<div class="map-pin ${className}">${label}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] });

const toLatLng = (p: RakazGeoPoint): L.LatLngTuple => [p.latitude, p.longitude];

function Recenter({ point }: { point: RakazGeoPoint }) {
  const map = useMap();
  useEffect(() => {
    map.setView(toLatLng(point), map.getZoom(), { animate: true });
  }, [map, point.latitude, point.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickToSet({ onPick }: { onPick: (point: RakazGeoPoint) => void }) {
  useMapEvents({
    click: (e) => onPick({ latitude: Number(e.latlng.lat.toFixed(6)), longitude: Number(e.latlng.lng.toFixed(6)) }),
  });
  return null;
}

/** Click anywhere on the map to place the point (a home or a school). */
export function MapPicker({ value, onChange }: { value: RakazGeoPoint; onChange: (point: RakazGeoPoint) => void }) {
  const icon = useMemo(() => pin('pick'), []);
  return (
    <div className="map-box" dir="ltr">
      <MapContainer center={toLatLng(value)} zoom={14} scrollWheelZoom className="map-canvas">
        <TileLayer url={TILES} attribution={ATTRIBUTION} />
        <Marker position={toLatLng(value)} icon={icon} />
        <Recenter point={value} />
        <ClickToSet onPick={onChange} />
      </MapContainer>
    </div>
  );
}

export interface FleetBus {
  id: string;
  label: string;
  position: RakazGeoPoint;
  moving: boolean;
}

function FitBuses({ buses }: { buses: FleetBus[] }) {
  const map = useMap();
  const key = buses.map((b) => b.id).join('|');
  // Refit only when the set of buses changes, so the admin can pan and zoom between position updates.
  useEffect(() => {
    if (buses.length === 0) return;
    if (buses.length === 1) map.setView(toLatLng(buses[0]!.position), 14);
    else map.fitBounds(L.latLngBounds(buses.map((b) => toLatLng(b.position))), { padding: [40, 40] });
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Every bus that has reported a position today. */
export function FleetMap({ buses }: { buses: FleetBus[] }) {
  if (buses.length === 0) return null;
  return (
    <div className="map-box tall" dir="ltr">
      <MapContainer center={toLatLng(buses[0]!.position)} zoom={13} scrollWheelZoom className="map-canvas">
        <TileLayer url={TILES} attribution={ATTRIBUTION} />
        {buses.map((bus) => (
          <Marker key={bus.id} position={toLatLng(bus.position)} icon={pin(bus.moving ? 'bus moving' : 'bus', '🚌')}>
            <Tooltip permanent direction="top" offset={[0, -14]}>
              {bus.label}
            </Tooltip>
          </Marker>
        ))}
        <FitBuses buses={buses} />
      </MapContainer>
    </div>
  );
}
