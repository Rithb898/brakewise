import { create } from "zustand";
import type {
  DriveEvent,
  DriveSession,
  RoutePoint,
  SafetyRating,
  SensorData,
  ThresholdConfig,
} from "@/lib/types";
import {
  DEFAULT_THRESHOLDS,
  EVENT_PENALTIES,
  EVENT_LABELS,
  EventType,
  getSafetyRating,
} from "@/lib/types";
import { routeDistanceKm, maxSpeedKmh } from "../utils/geo";

interface SensorSlice {
  sensorData: SensorData;
  listening: boolean;
  setSensorData: (data: SensorData) => void;
  setListening: (v: boolean) => void;
}

interface LocationSlice {
  /** Latest ground speed in m/s, or null when unknown. */
  speed: number | null;
  /** Latest coordinates, or null before the first fix. */
  coords: { latitude: number; longitude: number } | null;
  /** GPS breadcrumb trail for the active drive. */
  route: RoutePoint[];
  /** True once location permission is granted and watching. */
  gpsActive: boolean;
  pushLocation: (point: RoutePoint) => void;
  setGpsActive: (v: boolean) => void;
  clearRoute: () => void;
}

interface EventSlice {
  events: DriveEvent[];
  cooldowns: Record<string, number>;
  addEvent: (type: EventType, value: number, severity?: number) => void;
  isOnCooldown: (type: EventType) => boolean;
  clearEvents: () => void;
}

interface ScoreSlice {
  score: number;
  rating: SafetyRating;
  deduct: (type: EventType, severity: number) => number;
  resetScore: () => void;
}

interface SessionSlice {
  driveId: string | null;
  isActive: boolean;
  startTime: number | null;
  endTime: number | null;
  durations: number;
  sensorError: boolean;
  thresholds: ThresholdConfig;
  /** When true, the GPS speed-gate is bypassed so events fire while stationary
   *  (for demos / testing without a vehicle). */
  testMode: boolean;
  setTestMode: (v: boolean) => void;
  startDrive: () => void;
  endDrive: () => DriveSession | null;
  tick: () => void;
  setSensorError: (v: boolean) => void;
  setThresholds: (t: Partial<ThresholdConfig>) => void;
}

export type DriveStore = SensorSlice &
  LocationSlice &
  EventSlice &
  ScoreSlice &
  SessionSlice;

export const useDriveStore = create<DriveStore>((set, get) => ({
  // ── Sensor Slice ──
  sensorData: {
    acceleration: null,
    rotationRate: null,
    attitude: null,
  },
  listening: false,
  setSensorData: (data) => set({ sensorData: data }),
  setListening: (v) => set({ listening: v }),

  // ── Location Slice ──
  speed: null,
  coords: null,
  route: [],
  gpsActive: false,
  pushLocation: (point) =>
    set((s) => ({
      speed: point.speed,
      coords: { latitude: point.latitude, longitude: point.longitude },
      route: [...s.route, point],
    })),
  setGpsActive: (v) => set({ gpsActive: v }),
  clearRoute: () => set({ route: [], speed: null, coords: null }),

  // ── Event Slice ──
  events: [],
  cooldowns: {},
  addEvent: (type, value, severity = 1) => {
    if (get().isOnCooldown(type)) return;
    const penalty = get().deduct(type, severity);
    const coords = get().coords;
    const event: DriveEvent = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: Date.now(),
      value,
      penalty,
      message: EVENT_LABELS[type],
      ...(coords && {
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
    };
    set((s) => ({
      events: [...s.events, event],
      cooldowns: {
        ...s.cooldowns,
        [type]: Date.now() + get().thresholds.cooldownMs,
      },
    }));
  },
  isOnCooldown: (type) => {
    const cd = get().cooldowns[type];
    return cd != null && Date.now() < cd;
  },
  clearEvents: () => set({ events: [], cooldowns: {} }),

  // ── Score Slice ──
  score: 100,
  rating: "Excellent",
  deduct: (type, severity) => {
    const penalty = Math.round((EVENT_PENALTIES[type] ?? 0) * severity);
    set((s) => {
      const newScore = Math.max(0, s.score - penalty);
      return { score: newScore, rating: getSafetyRating(newScore) };
    });
    return penalty;
  },
  resetScore: () => set({ score: 100, rating: "Excellent" }),

  // ── Session Slice ──
  driveId: null,
  isActive: false,
  startTime: null,
  endTime: null,
  durations: 0,
  sensorError: false,
  thresholds: { ...DEFAULT_THRESHOLDS },
  testMode: false,
  setTestMode: (v) => set({ testMode: v }),
  startDrive: () => {
    const id = `drive_${Date.now()}`;
    const now = Date.now();
    get().clearEvents();
    get().resetScore();
    get().clearRoute();
    set({
      driveId: id,
      isActive: true,
      startTime: now,
      endTime: null,
      durations: 0,
      sensorError: false,
    });
  },
  endDrive: () => {
    const { driveId, startTime, score, rating, route } = get();
    if (!driveId || !startTime) return null;
    const now = Date.now();
    const session: DriveSession = {
      id: driveId,
      startTime,
      endTime: now,
      duration: Math.floor((now - startTime) / 1000),
      score,
      rating,
      events: [...get().events],
      route: [...route],
      distanceKm: routeDistanceKm(route),
      maxSpeedKmh: maxSpeedKmh(route),
    };
    set({ isActive: false, endTime: now, listening: false });
    return session;
  },
  tick: () => {
    const { startTime } = get();
    if (!startTime) return;
    set({ durations: Math.floor((Date.now() - startTime) / 1000) });
  },
  setSensorError: (v) => set({ sensorError: v }),
  setThresholds: (t) => set((s) => ({ thresholds: { ...s.thresholds, ...t } })),
}));
