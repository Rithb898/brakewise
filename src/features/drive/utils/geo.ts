import type { RoutePoint } from "@/lib/types";

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Sum of segment distances along a route, in kilometres. */
export function routeDistanceKm(route: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1];
    const cur = route[i];
    total += haversineKm(
      prev.latitude,
      prev.longitude,
      cur.latitude,
      cur.longitude,
    );
  }
  return total;
}

/** Peak speed across the route, converted from m/s to km/h. */
export function maxSpeedKmh(route: RoutePoint[]): number {
  let max = 0;
  for (const p of route) {
    if (p.speed != null && p.speed > max) max = p.speed;
  }
  return max * 3.6;
}
