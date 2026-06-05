import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useDriveStore } from "@/features/drive/store/driveStore";
import { useDeviceMotion } from "@/features/drive/hooks/useDeviceMotion";
import type { DriveEvent } from "@/lib/types";
import { EVENT_LABELS, getSafetyRating } from "@/lib/types";
import {
  saveSession,
  saveInterruptedSession,
  clearInterruptedSession,
} from "@/lib/storage";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const scoreColor = (score: number) => {
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#3b82f6";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
};

export default function DriveScreen() {
  const router = useRouter();
  useDeviceMotion();

  const isActive = useDriveStore((s) => s.isActive);
  const durations = useDriveStore((s) => s.durations);
  const score = useDriveStore((s) => s.score);
  const rating = useDriveStore((s) => s.rating);
  const events = useDriveStore((s) => s.events);
  const sensorError = useDriveStore((s) => s.sensorError);
  const endDrive = useDriveStore((s) => s.endDrive);
  const startTime = useDriveStore((s) => s.startTime);
  const tick = useDriveStore((s) => s.tick);
  const sensorData = useDriveStore((s) => s.sensorData);

  const [holdActive, setHoldActive] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer tick
  useEffect(() => {
    if (isActive) {
      tickRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isActive, tick]);

  // Save partial on app kill
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "inactive" && isActive) {
        const session = endDrive();
        if (session) saveInterruptedSession(session);
      }
    });
    return () => sub.remove();
  }, [isActive, endDrive]);

  // Redirect if not active
  useEffect(() => {
    if (!isActive && !startTime) {
      router.replace("/");
    }
  }, [isActive, startTime, router]);

  const handleEndPress = () => {
    setHoldActive(true);
    holdTimer.current = setTimeout(async () => {
      setHoldActive(false);
      const session = endDrive();
      if (!session) return;
      try {
        await clearInterruptedSession();
        await saveSession(session);
        router.replace({
          pathname: "/summary/[id]",
          params: { id: session.id },
        });
      } catch {
        Alert.alert("Error", "Failed to save session. Please try again.");
      }
    }, 1500);
  };

  const handleEndRelease = () => {
    setHoldActive(false);
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const renderEvent = ({ item }: { item: DriveEvent }) => (
    <ThemedView type="backgroundElement" style={styles.eventRow}>
      <ThemedText type="small">{EVENT_LABELS[item.type]}</ThemedText>
      <ThemedText type="small" style={{ opacity: 0.5 }}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {sensorError && (
          <ThemedView type="backgroundElement" style={styles.errorBanner}>
            <ThemedText type="small">⚠ Motion sensors unavailable</ThemedText>
          </ThemedView>
        )}

        <View style={styles.hero}>
          <ThemedText type="code" style={{ opacity: 0.5 }}>
            DRIVE TIME
          </ThemedText>
          <ThemedText type="title">{formatDuration(durations)}</ThemedText>

          <View style={{ height: Spacing.four }} />

          <ThemedText type="small" style={{ opacity: 0.5 }}>
            SCORE
          </ThemedText>
          <ThemedText style={[styles.scoreText, { color: scoreColor(score) }]}>
            {score}
          </ThemedText>
          <ThemedText style={{ color: scoreColor(score), fontWeight: "700" }}>
            {rating}
          </ThemedText>
        </View>

        <FlatList
          data={[...events].reverse().slice(0, 20)}
          keyExtractor={(e) => e.id}
          renderItem={renderEvent}
          style={styles.eventList}
          contentContainerStyle={{
            gap: Spacing.one,
            paddingBottom: Spacing.four,
          }}
          ListEmptyComponent={
            <ThemedText
              type="small"
              style={{
                textAlign: "center",
                opacity: 0.4,
                marginTop: Spacing.four,
              }}
            >
              No events detected yet
            </ThemedText>
          }
        />

        {sensorData.acceleration && (
          <ThemedView type="backgroundElement" style={styles.sensorDebug}>
            <ThemedText type="code" style={{ fontSize: 10 }}>
              Accel: x={sensorData.acceleration.x.toFixed(1)} y=
              {sensorData.acceleration.y.toFixed(1)} z=
              {sensorData.acceleration.z.toFixed(1)}
            </ThemedText>
            {sensorData.rotationRate && (
              <ThemedText type="code" style={{ fontSize: 10 }}>
                Rot: x={sensorData.rotationRate.x.toFixed(0)} y=
                {sensorData.rotationRate.y.toFixed(0)} z=
                {sensorData.rotationRate.z.toFixed(0)} deg/s
              </ThemedText>
            )}
          </ThemedView>
        )}

        <Pressable
          onPressIn={handleEndPress}
          onPressOut={handleEndRelease}
          style={[styles.endButton, holdActive && styles.endButtonHolding]}
        >
          <ThemedText style={styles.endButtonText}>
            {holdActive ? "Keep holding..." : "Hold to End Drive"}
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  hero: { alignItems: "center", paddingVertical: Spacing.six },
  scoreText: { fontSize: 72, fontWeight: "800", lineHeight: 80 },
  eventList: { flex: 1 },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.two,
    borderRadius: Spacing.one,
  },
  errorBanner: {
    padding: Spacing.two,
    borderRadius: Spacing.one,
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  sensorDebug: {
    padding: Spacing.two,
    borderRadius: Spacing.one,
    marginBottom: Spacing.three,
    gap: 2,
  },
  endButton: {
    backgroundColor: "#ef4444",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: "center",
    marginBottom: Spacing.four,
  },
  endButtonHolding: { backgroundColor: "#dc2626", opacity: 0.8 },
  endButtonText: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
});
