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
DeviceMotion (10Hz)
  → rolling average buffer (5 samples)
  → threshold check (6 event types)
  → cooldown gate (3s per type)
  → fire event → deduct score
```

## Thresholds

| Event | Trigger | Penalty |
|-------|---------|---------|
| Harsh Braking | `accel.z < -4.0` | -5 |
| Harsh Acceleration | `accel.z > 3.5` | -5 |
| Sharp Turn | `|accel.x| > 3.0` | -3 |
| Aggressive Steering | `rotationRate mag > 2.5` | -5 |
| Excessive Movement | `accel mag > 6.0` | -8 |
| Phone Handling | `stddev(accel) > 1.5` (2s window) | -10 |

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
