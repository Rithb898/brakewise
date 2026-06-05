import type { SensorData, ThresholdConfig } from "@/lib/types";
import { EventType } from "@/lib/types";

interface RollingBuffer {
  accelX: number[];
  accelY: number[];
  accelZ: number[];
  rotX: number[];
  rotY: number[];
  rotZ: number[];
  size: number;
}

export function createBuffer(size: number): RollingBuffer {
  return {
    accelX: [],
    accelY: [],
    accelZ: [],
    rotX: [],
    rotY: [],
    rotZ: [],
    size,
  };
}

export function pushToBuffer(buffer: RollingBuffer, data: SensorData): void {
  if (!data.acceleration || !data.rotationRate) return;
  const push = (arr: number[], val: number) => {
    arr.push(val);
    if (arr.length > buffer.size) arr.shift();
  };
  push(buffer.accelX, data.acceleration.x);
  push(buffer.accelY, data.acceleration.y);
  push(buffer.accelZ, data.acceleration.z);
  push(buffer.rotX, data.rotationRate.x);
  push(buffer.rotY, data.rotationRate.y);
  push(buffer.rotZ, data.rotationRate.z);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function mag(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  const variance = arr.reduce((s, v) => s + (v - m) * (v - m), 0) / arr.length;
  return Math.sqrt(variance);
}

export interface DetectedEvent {
  type: EventType;
  /** Raw magnitude that triggered the event (for display in the timeline). */
  value: number;
  /** Penalty multiplier: 1.0 at threshold, scaling up to a 2x cap. */
  severity: number;
}

// Clamp the over-threshold ratio into a sane penalty multiplier.
function severityFor(value: number, threshold: number): number {
  const ratio = Math.abs(value) / Math.abs(threshold);
  return Math.min(2, Math.max(1, ratio));
}

export function detectEvents(
  buffer: RollingBuffer,
  thresholds: ThresholdConfig,
  raw: SensorData,
): DetectedEvent[] {
  if (!raw.acceleration || !raw.rotationRate) return [];
  const events: DetectedEvent[] = [];

  const az = avg(buffer.accelZ);
  const ax = avg(buffer.accelX);
  const rotMag = mag(avg(buffer.rotX), avg(buffer.rotY), avg(buffer.rotZ));
  const accelMag = mag(
    avg(buffer.accelX),
    avg(buffer.accelY),
    avg(buffer.accelZ),
  );
  const accelStd = mag(
    stddev(buffer.accelX),
    stddev(buffer.accelY),
    stddev(buffer.accelZ),
  );

  if (buffer.accelZ.length >= buffer.size) {
    if (az < thresholds.harshBraking)
      events.push({
        type: EventType.HarshBraking,
        value: az,
        severity: severityFor(az, thresholds.harshBraking),
      });
    if (az > thresholds.harshAcceleration)
      events.push({
        type: EventType.HarshAcceleration,
        value: az,
        severity: severityFor(az, thresholds.harshAcceleration),
      });
    if (Math.abs(ax) > thresholds.sharpTurn)
      events.push({
        type: EventType.SharpTurn,
        value: ax,
        severity: severityFor(ax, thresholds.sharpTurn),
      });
    if (rotMag > thresholds.aggressiveSteering)
      events.push({
        type: EventType.AggressiveSteering,
        value: rotMag,
        severity: severityFor(rotMag, thresholds.aggressiveSteering),
      });
    if (accelMag > thresholds.excessiveMovement)
      events.push({
        type: EventType.ExcessiveMovement,
        value: accelMag,
        severity: severityFor(accelMag, thresholds.excessiveMovement),
      });
    if (accelStd > thresholds.phoneHandling)
      events.push({
        type: EventType.PhoneHandling,
        value: accelStd,
        severity: severityFor(accelStd, thresholds.phoneHandling),
      });
  }

  return events;
}
