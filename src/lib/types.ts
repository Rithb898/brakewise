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
  value: number;
  message: string;
}

export interface SensorData {
  acceleration: { x: number; y: number; z: number } | null;
  rotationRate: { x: number; y: number; z: number } | null;
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
