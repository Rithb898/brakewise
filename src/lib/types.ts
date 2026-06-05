export enum EventType {
  HarshBraking = "harsh_braking",
  HarshAcceleration = "harsh_acceleration",
  SharpTurn = "sharp_turn",
  AggressiveSteering = "aggressive_steering",
  ExcessiveMovement = "excessive_movement",
  PhoneHandling = "phone_handling",
}

export interface DriveEvent {
  id: string;
  type: EventType;
  timestamp: number;
  /** Raw sensor magnitude that triggered the event. */
  value: number;
  /** Points actually deducted for this event (base penalty × severity). */
  penalty: number;
  message: string;
  /** Where the event occurred, if a GPS fix was available. */
  latitude?: number;
  longitude?: number;
}

export interface SensorData {
  acceleration: { x: number; y: number; z: number } | null;
  rotationRate: { x: number; y: number; z: number } | null;
}

/** A single GPS sample along the drive, for route replay / heatmap. */
export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  /** Ground speed in m/s, or null if the platform didn't report it. */
  speed: number | null;
}

export const DEG_TO_RAD = Math.PI / 180;

export interface DriveSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number;
  rating: SafetyRating;
  events: DriveEvent[];
  /** GPS breadcrumb trail; empty if location was unavailable/denied. */
  route: RoutePoint[];
  /** Total distance travelled in km (haversine over the route). */
  distanceKm: number;
  /** Peak ground speed in km/h. */
  maxSpeedKmh: number;
}

export type SafetyRating = "Excellent" | "Good" | "Fair" | "Poor" | "Dangerous";

export interface ThresholdConfig {
  harshBraking: number;
  harshAcceleration: number;
  sharpTurn: number;
  aggressiveSteering: number;
  excessiveMovement: number;
  phoneHandling: number;
  cooldownMs: number;
  bufferSize: number;
  /** Min ground speed (m/s) before driving events count. Ignored when GPS speed is unknown. */
  minSpeedForEvents: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  harshBraking: -4.0,
  harshAcceleration: 3.5,
  sharpTurn: 3.0,
  aggressiveSteering: 150,
  excessiveMovement: 6.0,
  phoneHandling: 1.5,
  cooldownMs: 3000,
  bufferSize: 5,
  minSpeedForEvents: 2.8, // ≈10 km/h
};

export const EVENT_PENALTIES: Record<EventType, number> = {
  [EventType.HarshBraking]: 5,
  [EventType.HarshAcceleration]: 5,
  [EventType.SharpTurn]: 3,
  [EventType.AggressiveSteering]: 5,
  [EventType.ExcessiveMovement]: 8,
  [EventType.PhoneHandling]: 10,
};

export const EVENT_LABELS: Record<EventType, string> = {
  [EventType.HarshBraking]: "Harsh Braking",
  [EventType.HarshAcceleration]: "Harsh Acceleration",
  [EventType.SharpTurn]: "Sharp Turn",
  [EventType.AggressiveSteering]: "Aggressive Steering",
  [EventType.ExcessiveMovement]: "Excessive Movement",
  [EventType.PhoneHandling]: "Phone Handling",
};

export function getSafetyRating(score: number): SafetyRating {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Dangerous";
}
