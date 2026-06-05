import { create } from "zustand";
import type {
  DriveEvent,
  DriveSession,
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

interface SensorSlice {
  sensorData: SensorData;
  listening: boolean;
  setSensorData: (data: SensorData) => void;
  setListening: (v: boolean) => void;
}

interface EventSlice {
  events: DriveEvent[];
  cooldowns: Record<string, number>;
  addEvent: (type: EventType, value: number) => void;
  isOnCooldown: (type: EventType) => boolean;
  clearEvents: () => void;
}

interface ScoreSlice {
  score: number;
  rating: SafetyRating;
  deduct: (type: EventType) => void;
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
  startDrive: () => void;
  endDrive: () => DriveSession | null;
  tick: () => void;
  setSensorError: (v: boolean) => void;
  setThresholds: (t: Partial<ThresholdConfig>) => void;
}

export type DriveStore = SensorSlice & EventSlice & ScoreSlice & SessionSlice;

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

  // ── Event Slice ──
  events: [],
  cooldowns: {},
  addEvent: (type, value) => {
    if (get().isOnCooldown(type)) return;
    const event: DriveEvent = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: Date.now(),
      value,
      message: EVENT_LABELS[type],
    };
    set((s) => ({
      events: [...s.events, event],
      cooldowns: {
        ...s.cooldowns,
        [type]: Date.now() + get().thresholds.cooldownMs,
      },
    }));
    get().deduct(type);
  },
  isOnCooldown: (type) => {
    const cd = get().cooldowns[type];
    return cd != null && Date.now() < cd;
  },
  clearEvents: () => set({ events: [], cooldowns: {} }),

  // ── Score Slice ──
  score: 100,
  rating: "Excellent",
  deduct: (type) => {
    set((s) => {
      const penalty = EVENT_PENALTIES[type] ?? 0;
      const newScore = Math.max(0, s.score - penalty);
      return { score: newScore, rating: getSafetyRating(newScore) };
    });
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
  startDrive: () => {
    const id = `drive_${Date.now()}`;
    const now = Date.now();
    get().clearEvents();
    get().resetScore();
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
    const { driveId, startTime, score, rating, events } = get();
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
