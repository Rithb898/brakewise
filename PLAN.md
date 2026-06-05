# SafeDrive — Implementation Plan

## Architecture

| Layer | Choice |
|-------|--------|
| State | Zustand with slices (sensor, event, score, session) |
| Navigation | Expo Router, stack layout |
| Persistence | AsyncStorage (write on session end) |
| Charts | react-native-gifted-charts |
| Sensors | `expo-sensors` DeviceMotion, 100ms interval |
| Permissions | Check on Start Drive tap |

## Processing Pipeline

```
DeviceMotion (10Hz)            GPS watch (1Hz / 5m)
  → rolling average buffer        → speed + route point
    (5 samples)                   → store
  → speed gate (≥10 km/h) ────────┘
  → threshold check (6 event types)
  → cooldown gate (3s per type)
  → fire event (tagged w/ lat,lng, severity)
  → deduct round(base × severity)
```

Live sensor display is throttled into its own `SensorDebug` component so the
10 Hz updates don't re-render the score/timer/event list.

## Thresholds

Values are the `DEFAULT_THRESHOLDS` in `src/lib/types.ts`. Acceleration is
gravity-removed linear acceleration (m/s²) from DeviceMotion; rotation rate is
in deg/s. Base penalty is the deduction at the threshold; actual deduction is
`round(base × severity)` where severity scales 1→2× by how far past threshold.

| Event | Trigger (5-sample rolling avg) | Base penalty |
|-------|-------------------------------|--------------|
| Harsh Braking | `accel.z < -4.0` | -5 |
| Harsh Acceleration | `accel.z > 3.5` | -5 |
| Sharp Turn | `|accel.x| > 3.0` | -3 |
| Aggressive Steering | `rotationRate mag > 150 deg/s` | -5 |
| Excessive Movement | `accel mag > 6.0` | -8 |
| Phone Handling | `stddev(accel) mag > 1.5` | -10 |

**Speed gate:** events only count when GPS speed ≥ `2.8 m/s` (~10 km/h). When
GPS speed is unknown (no fix / permission denied), detection falls back to
motion-only with no gate.

Score: 100 → deduct. Rating: 90+ Excellent → <40 Dangerous.

## Screens

| Route | Content |
|-------|---------|
| `/` Home | Last drive card, Start Drive button, recent sessions |
| `/drive` Active | Timer, score, event feed, hold-to-end button, debug panel |
| `/summary/[id]` Result | Hero score, bar chart, event timeline |
| `/history` Dashboard | Stat cards, score trend line, session list |

## Folder Structure

```
src/
  app/              # Expo Router screens
  features/
    drive/          # hooks, store, utils, components
    summary/        # components
    history/        # hooks, components
  lib/              # storage.ts, types.ts
  components/ui/    # shared primitives
```

## Safety & Edge Cases

- Graceful degradation on sensor failure (banner, continue drive)
- Partial session save on app kill (`AppState` inactive)
- NaN/Inf filtering in buffer
- AsyncStorage write failure → toast + retry
- Permission denial → settings link, disabled UI
