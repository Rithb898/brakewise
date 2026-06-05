import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { DeviceMotion } from "expo-sensors";
import { useDriveStore } from "../store/driveStore";
import { createBuffer, pushToBuffer, detectEvents } from "../utils/thresholds";

export function useDeviceMotion() {
  const isActive = useDriveStore((s) => s.isActive);
  const setSensorData = useDriveStore((s) => s.setSensorData);
  const setListening = useDriveStore((s) => s.setListening);
  const setSensorError = useDriveStore((s) => s.setSensorError);
  const addEvent = useDriveStore((s) => s.addEvent);
  const thresholds = useDriveStore((s) => s.thresholds);
  const isOnCooldown = useDriveStore((s) => s.isOnCooldown);

  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const bufferRef = useRef(createBuffer(thresholds.bufferSize));
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    bufferRef.current = createBuffer(thresholds.bufferSize);
  }, [thresholds.bufferSize]);

  const startSensors = useCallback(() => {
    DeviceMotion.setUpdateInterval(100);
    subscriptionRef.current = DeviceMotion.addListener((data) => {
      if (!data.acceleration && !data.rotationRate) return;

      const accel = data.acceleration;
      const rot = data.rotationRate;

      const sensorData = {
        acceleration: accel ? { x: accel.x, y: accel.y, z: accel.z } : null,
        rotationRate: rot ? { x: rot.alpha, y: rot.beta, z: rot.gamma } : null,
      };

      setSensorData(sensorData);
      pushToBuffer(bufferRef.current, sensorData);

      const detected = detectEvents(bufferRef.current, thresholds, sensorData);
      for (const eventType of detected) {
        if (!isOnCooldown(eventType)) {
          addEvent(eventType, 0);
        }
      }
    });
    setListening(true);
  }, [
    isActive,
    setSensorData,
    setListening,
    thresholds,
    addEvent,
    isOnCooldown,
  ]);

  const stopSensors = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setListening(false);
  }, [setListening]);

  // App state: pause on background, resume on foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/active/) &&
        nextState.match(/inactive|background/)
      ) {
        if (isActive) stopSensors();
      } else if (nextState === "active" && isActive) {
        startSensors();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [isActive, startSensors, stopSensors]);

  // Drive lifecycle
  useEffect(() => {
    if (isActive) {
      startSensors();
    } else {
      stopSensors();
    }
    return () => stopSensors();
  }, [isActive, startSensors, stopSensors]);

  // Sensor error handling
  useEffect(() => {
    DeviceMotion.isAvailableAsync()
      .then((available) => {
        if (!available && isActive) {
          setSensorError(true);
        }
      })
      .catch(() => {
        setSensorError(true);
      });
  }, [isActive, setSensorError]);

  return { startSensors, stopSensors };
}
