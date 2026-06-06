# BrakeWise

Expo/React Native driving telematics app. Tracks driving behavior via phone sensors, scores trips, persists history.

## Screenshots

<p align="center">
  <img src="./assets/screenshoots/WhatsApp%20Image%202026-06-06%20at%208.35.16%20PM.jpeg" width="250" />
  <img src="./assets/screenshoots/WhatsApp%20Image%202026-06-06%20at%208.35.16%20PM%20(1).jpeg" width="250" />
  <img src="./assets/screenshoots/WhatsApp%20Image%202026-06-06%20at%208.35.15%20PM.jpeg" width="250" />
</p>

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Expo 55, React Native 0.83, React 19 |
| Router | Expo Router (file-based, typed routes) |
| State | Zustand (sliced: sensor/location/event/score/session) |
| Sensors | `expo-sensors` DeviceMotion @ 10Hz |
| GPS | `expo-location` watch (1Hz / 5m) |
| Storage | AsyncStorage (write on drive end) |
| Charts | react-native-gifted-charts |
| UI | expo-glass-effect, expo-linear-gradient, expo-symbols |
| Lang | TypeScript 5.9 |

## Run

```bash
npm install
npx expo start
```

Scripts: `npm run android` · `npm run ios` · `npm run web` · `npm run lint`

Requires location permission on first Start Drive. Build target: Expo SDK 55.

## Pipeline

```
DeviceMotion 10Hz            GPS watch 1Hz/5m
  ↓                              ↓
5-sample rolling avg          push RoutePoint
  ↓                              ↓
speed gate (≥10 km/h) ←─────────┘
  ↓
threshold check (6 event types)
  ↓
3s cooldown gate per type
  ↓
fire event (tagged lat/lng) → deduct round(base × severity)
```

Sensor display split into throttled `SensorDebug` so 10Hz updates don't re-render score/timer/event list.

## Events & Penalties

| Event | Trigger (5-sample avg) | Base |
|-------|------------------------|------|
| Harsh Braking | `accel.z < -4.0` m/s² | -5 |
| Harsh Acceleration | `accel.z > 3.5` m/s² | -5 |
| Sharp Turn | `|accel.x| > 3.0` m/s² | -3 |
| Aggressive Steering | rotation mag > 150 deg/s | -5 |
| Excessive Movement | accel mag > 6.0 m/s² | -8 |
| Phone Handling | stddev(accel) > 1.5 | -10 |

Acceleration is gravity-removed linear (m/s²). Severity scales 1→2× past threshold. Score starts at 100, floored at 0.

## Rating

| Score | Rating |
|-------|--------|
| 90+ | Excellent |
| 75-89 | Good |
| 60-74 | Fair |
| 40-59 | Poor |
| <40 | Dangerous |

## Routes

| Path | Screen |
|------|--------|
| `/` | Home: last drive card, Start Drive, recent sessions |
| `/drive` | Live: timer, score, event feed, hold-to-end, debug |
| `/summary/[id]` | Result: hero score, bar chart, event timeline |
| `/history` | Dashboard: stat cards, trend line, session list |

## Persisted Session Shape

```ts
DriveSession {
  id, startTime, endTime, duration,
  score, rating,
  events: DriveEvent[],      // tagged w/ lat/lng + penalty
  route: RoutePoint[],       // GPS breadcrumbs
  distanceKm,                // haversine
  maxSpeedKmh
}
```

Derived rates (events/10min, events/100km, avgSpeed) computed via `driveRates()` for cross-trip comparison.

## Folder Structure

```
src/
  app/                       # Expo Router screens
    _layout.tsx, index.tsx, drive.tsx, history.tsx
    summary/[id].tsx
  features/
    drive/
      hooks/                 # useDeviceMotion, useLocation
      store/driveStore.ts    # Zustand sliced store
      utils/                 # scoring, thresholds, geo
      components/            # EventRow, LiveStatus
  lib/                       # storage, types, display
  components/                # themed-text, themed-view
  hooks/                     # use-color-scheme, use-theme
  constants/theme.ts
```

## Storage Keys

- `safedrive_sessions` — array of completed `DriveSession`
- `safedrive_interrupted` — partial session saved on `AppState` inactive (recovered on next launch)

## Edge Cases

- Sensor failure → banner, drive continues
- App killed mid-drive → partial save, recover on launch
- NaN/Inf filtering in rolling buffer
- AsyncStorage write failure → toast + retry
- Permission denied → settings link, motion-only fallback (no speed gate)
- `testMode` flag bypasses speed gate for demos without a vehicle

## Config

Thresholds live in `src/lib/types.ts` (`DEFAULT_THRESHOLDS`). Override per-session via `setThresholds()`. See `PLAN.md` for full architecture rationale.
