/**
 * Map tiles come from OpenStreetMap, so the apps need no Google Maps key or billing account.
 * The public tile server is meant for light use; for a large fleet point this at your own or a
 * paid OSM tile provider with EXPO_PUBLIC_MAP_TILE_URL.
 */
export const MAP_TILE_URL = process.env.EXPO_PUBLIC_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/** The OpenStreetMap licence requires this credit to be visible on every map. */
export const MAP_ATTRIBUTION = '© OpenStreetMap';
