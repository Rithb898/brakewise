import type { DriveSession } from "@/lib/types";

/**
 * Normalized exposure metrics. The headline score stays deduction-based
 * (start at 100, subtract penalties) per the spec, but raw counts don't
 * distinguish a 2-minute drive with one harsh brake from a 2-hour one. These
 * rates put drives on a comparable footing, the way real telematics does.
 */
export interface DriveRates {
  /** Events per 10 minutes of driving. */
  eventsPer10Min: number;
  /** Events per 100 km — null when the route is too short to be meaningful. */
  eventsPer100Km: number | null;
  /** Average speed in km/h, or null without GPS distance. */
  avgSpeedKmh: number | null;
}

const MIN_DISTANCE_KM = 0.1;

export function driveRates(session: DriveSession): DriveRates {
  const minutes = session.duration / 60;
  const distance = session.distanceKm ?? 0;

  const eventsPer10Min =
    minutes > 0 ? (session.events.length / minutes) * 10 : 0;

  const eventsPer100Km =
    distance >= MIN_DISTANCE_KM
      ? (session.events.length / distance) * 100
      : null;

  const avgSpeedKmh =
    distance >= MIN_DISTANCE_KM && session.duration > 0
      ? distance / (session.duration / 3600)
      : null;

  return { eventsPer10Min, eventsPer100Km, avgSpeedKmh };
}
