import { useEffect, useRef, useState } from "react";
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useDriveStore } from "@/features/drive/store/driveStore";
import { useDeviceMotion } from "@/features/drive/hooks/useDeviceMotion";
import { useLocation } from "@/features/drive/hooks/useLocation";
import { LiveStatus } from "@/features/drive/components/LiveStatus";
import { EventRow } from "@/features/drive/components/EventRow";
import { scoreColor, formatDuration } from "@/lib/display";
import {
  saveSession,
  saveInterruptedSession,
  clearInterruptedSession,
} from "@/lib/storage";

export default function DriveScreen() {
  const router = useRouter();
  const theme = useTheme();
  useDeviceMotion();
  useLocation();

  const isActive = useDriveStore((s) => s.isActive);
  const durations = useDriveStore((s) => s.durations);
  const score = useDriveStore((s) => s.score);
  const rating = useDriveStore((s) => s.rating);
  const events = useDriveStore((s) => s.events);
  const sensorError = useDriveStore((s) => s.sensorError);
  const endDrive = useDriveStore((s) => s.endDrive);
  const startTime = useDriveStore((s) => s.startTime);
  const tick = useDriveStore((s) => s.tick);
  const testMode = useDriveStore((s) => s.testMode);

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

  const tint = scoreColor(score);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {sensorError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color="#fff" />
            <ThemedText style={styles.errorText}>
              Motion sensors unavailable
            </ThemedText>
          </View>
        )}

        {testMode && (
          <View style={styles.testBanner}>
            <MaterialCommunityIcons name="flask-outline" size={14} color="#fff" />
            <ThemedText style={styles.errorText}>
              Test mode — events detected while still
            </ThemedText>
          </View>
        )}

        {/* Score hero */}
        <View style={styles.hero}>
          <View style={styles.timePill}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formatDuration(durations)}
            </ThemedText>
          </View>

          <ThemedText style={[styles.scoreText, { color: tint }]}>
            {score}
          </ThemedText>
          <View style={[styles.ratingPill, { backgroundColor: tint }]}>
            <ThemedText style={styles.ratingText}>{rating}</ThemedText>
          </View>
        </View>

        <LiveStatus />

        <View style={styles.feedHeader}>
          <ThemedText type="smallBold">Recent events</ThemedText>
          {events.length > 0 && (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {events.length} total
            </ThemedText>
          )}
        </View>

        <FlatList
          data={[...events].reverse().slice(0, 20)}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EventRow event={item} />}
          style={styles.eventList}
          contentContainerStyle={{ gap: Spacing.two, paddingBottom: Spacing.four }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="shield-check"
                size={40}
                color="#22c55e"
              />
              <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>
                You&apos;re driving smoothly
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                Keep it up — events will appear here if anything happens.
              </ThemedText>
            </View>
          }
        />

        <Pressable
          onPressIn={handleEndPress}
          onPressOut={handleEndRelease}
          style={[styles.endButton, holdActive && styles.endButtonHolding]}
        >
          <Ionicons
            name={holdActive ? "ellipsis-horizontal" : "stop-circle"}
            size={20}
            color="#fff"
          />
          <ThemedText style={styles.endButtonText}>
            {holdActive ? "Keep holding…" : "Hold to End Drive"}
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  hero: { alignItems: "center", paddingTop: Spacing.four, paddingBottom: Spacing.three },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  scoreText: { fontSize: 88, fontWeight: "900", lineHeight: 92 },
  ratingPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    marginTop: Spacing.two,
  },
  ratingText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  eventList: { flex: 1 },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.six,
    gap: Spacing.one,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    backgroundColor: "#f59e0b",
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  errorText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  testBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    backgroundColor: "#3c87f7",
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    backgroundColor: "#ef4444",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    marginBottom: Spacing.four,
  },
  endButtonHolding: { backgroundColor: "#dc2626", opacity: 0.85 },
  endButtonText: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
});
