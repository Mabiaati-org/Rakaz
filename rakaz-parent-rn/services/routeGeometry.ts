import type { Coordinate } from '@/types/models';

/** Great-circle distance in metres. */
function distance(a: Coordinate, b: Coordinate): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function length(path: Coordinate[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) total += distance(path[i - 1], path[i]);
  return total;
}

/** Roads are longer than the straight line between two points; this is the usual city estimate. */
const ROAD_FACTOR = 1.35;

/** Estimated driving distance in metres along a chain of points. */
const roadLength = (path: Coordinate[]): number => length(path) * ROAD_FACTOR;

export const RouteGeometry = { distance, length, roadLength };
