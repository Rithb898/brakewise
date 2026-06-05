import { useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";

import { useDriveStore } from "../store/driveStore";

/**
 * Watches GPS during an active drive. Speed feeds the event speed-gate; the
 * coordinate trail feeds the route replay / heatmap and per-event location.
 * GPS is best-effort — if permission is denied the drive still runs on motion
 * sensors alone (events simply aren't speed-gated).
 */
export function useLocation() {
  const isActive = useDriveStore((s) => s.isActive);
  const pushLocation = useDriveStore((s) => s.pushLocation);
  const setGpsActive = useDriveStore((s) => s.setGpsActive);

  const subRef = useRef<Location.LocationSubscription | null>(null);

  const start = useCallback(async () => {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setGpsActive(false);
        return;
      }
      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (loc) => {
          pushLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp,
            speed: loc.coords.speed,
          });
        },
      );
      setGpsActive(true);
    } catch {
      setGpsActive(false);
    }
  }, [pushLocation, setGpsActive]);

  const stop = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
    setGpsActive(false);
  }, [setGpsActive]);

  useEffect(() => {
    if (isActive) start();
    else stop();
    return () => stop();
  }, [isActive, start, stop]);
}
