import type { ComponentProps } from "react";
import type { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { EventType, type SafetyRating } from "./types";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** Color for a 0–100 score, matching the safety-rating bands. */
export function scoreColor(score: number): string {
  if (score >= 90) return "#22c55e"; // green  – Excellent
  if (score >= 75) return "#3b82f6"; // blue   – Good
  if (score >= 60) return "#f59e0b"; // amber  – Fair
  if (score >= 40) return "#f97316"; // orange – Poor
  return "#ef4444"; //                  red    – Dangerous
}

/** "1h 04m", "12m 30s", "45s" — human-friendly, no leading-zero noise. */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** MaterialCommunityIcons glyph shown next to each event type. */
export const EVENT_ICONS: Record<EventType, MciName> = {
  [EventType.HarshBraking]: "car-brake-alert",
  [EventType.HarshAcceleration]: "speedometer",
  [EventType.SharpTurn]: "sign-direction",
  [EventType.AggressiveSteering]: "steering",
  [EventType.ExcessiveMovement]: "vibrate",
  [EventType.PhoneHandling]: "cellphone",
};

/** Plain-language descriptions for a non-technical driver. */
export const EVENT_DESCRIPTIONS: Record<EventType, string> = {
  [EventType.HarshBraking]: "You braked hard",
  [EventType.HarshAcceleration]: "You sped up quickly",
  [EventType.SharpTurn]: "Sharp turn",
  [EventType.AggressiveSteering]: "Sudden steering",
  [EventType.ExcessiveMovement]: "Lots of movement",
  [EventType.PhoneHandling]: "Phone was handled",
};

/** Ionicons glyph representing each safety rating. */
export const RATING_ICONS: Record<SafetyRating, IoniconName> = {
  Excellent: "star",
  Good: "thumbs-up",
  Fair: "happy-outline",
  Poor: "warning-outline",
  Dangerous: "alert-circle",
};

/** Encouraging one-liner shown on the summary hero. */
export const RATING_MESSAGE: Record<SafetyRating, string> = {
  Excellent: "Excellent driving — keep it up!",
  Good: "Nice and steady out there.",
  Fair: "A solid drive with a little room to improve.",
  Poor: "A few rough moments — take it easy.",
  Dangerous: "Some risky driving. Stay safe out there.",
};
