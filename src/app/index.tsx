import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { DeviceMotion } from "expo-sensors";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useDriveStore } from "@/features/drive/store/driveStore";
import type { DriveSession } from "@/lib/types";
import {
  getSessions,
  getInterruptedSession,
  clearInterruptedSession,
} from "@/lib/storage";

export default function HomeScreen() {
  const router = useRouter();
  const startDrive = useDriveStore((s) => s.startDrive);
  const isActive = useDriveStore((s) => s.isActive);
  const [lastSession, setLastSession] = useState<DriveSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<DriveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const sessions = await getSessions();
    sessions.sort((a, b) => b.startTime - a.startTime);
    if (sessions.length > 0) setLastSession(sessions[0]);
    setRecentSessions(sessions.slice(0, 3));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    (async () => {
      const interrupted = await getInterruptedSession();
      if (interrupted) {
        await clearInterruptedSession();
        router.replace({
          pathname: "/summary/[id]",
          params: { id: interrupted.id },
        });
      }
    })();
  }, [router]);

  const handleStart = async () => {
    if (Platform.OS === 'android') {
      startDrive();
      router.push('/drive');
      return;
    }

    const { status } = await DeviceMotion.getPermissionsAsync();
    if (status === "granted") {
      startDrive();
      router.push("/drive");
      return;
    }
    const { status: newStatus } = await DeviceMotion.requestPermissionsAsync();
    if (newStatus === "granted") {
      startDrive();
      router.push("/drive");
    } else {
      Alert.alert(
        "Motion Permission Required",
        "SafeDrive needs motion sensors to detect driving events. Please enable Motion & Fitness in your device settings.",
        [{ text: "OK" }],
      );
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return "#22c55e";
    if (score >= 75) return "#3b82f6";
    if (score >= 60) return "#f59e0b";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title" style={styles.logo}>
            SafeDrive
          </ThemedText>

          {lastSession && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/summary/[id]",
                  params: { id: lastSession.id },
                })
              }
            >
              <ThemedView type="backgroundElement" style={styles.lastDriveCard}>
                <ThemedText type="small">Last Drive</ThemedText>
                <ThemedText
                  type="subtitle"
                  style={{ color: scoreColor(lastSession.score) }}
                >
                  {lastSession.score} · {lastSession.rating}
                </ThemedText>
                <ThemedText type="small">
                  {formatDuration(lastSession.duration)} ·{" "}
                  {lastSession.events.length} events
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}

          <Pressable
            style={[styles.startButton, isActive && styles.startButtonDisabled]}
            onPress={handleStart}
            disabled={isActive}
          >
            <ThemedText style={styles.startButtonText}>
              {isActive ? "Drive in progress..." : "Start Drive"}
            </ThemedText>
          </Pressable>

          {recentSessions.length > 0 && (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Recent Drives
              </ThemedText>
              {recentSessions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() =>
                    router.push({
                      pathname: "/summary/[id]",
                      params: { id: s.id },
                    })
                  }
                >
                  <ThemedView
                    type="backgroundElement"
                    style={styles.sessionRow}
                  >
                    <ThemedText
                      style={{ color: scoreColor(s.score), fontWeight: "700" }}
                    >
                      {s.score}
                    </ThemedText>
                    <ThemedText type="small">{s.rating}</ThemedText>
                    <ThemedText type="small">
                      {formatDuration(s.duration)}
                    </ThemedText>
                    <ThemedText type="small">
                      {s.events.length} events
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
              <Pressable onPress={() => router.push("/history")}>
                <ThemedText
                  type="linkPrimary"
                  style={{ textAlign: "center", marginTop: Spacing.two }}
                >
                  View All Drives →
                </ThemedText>
              </Pressable>
            </>
          )}

          {!loading && recentSessions.length === 0 && !lastSession && (
            <ThemedView type="backgroundElement" style={styles.emptyState}>
              <ThemedText style={{ textAlign: "center", opacity: 0.6 }}>
                No drives yet.{"\n"}Tap Start Drive to begin your first session.
              </ThemedText>
            </ThemedView>
          )}

          {loading && (
            <ActivityIndicator
              size="large"
              style={{ marginTop: Spacing.four }}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  scroll: {
    paddingVertical: Spacing.six,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  logo: { textAlign: "center" },
  lastDriveCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  startButton: {
    backgroundColor: "#3c87f7",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: "center",
  },
  startButtonDisabled: { opacity: 0.5 },
  startButtonText: { color: "#ffffff", fontSize: 20, fontWeight: "700" },
  sectionTitle: { marginTop: Spacing.two },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  emptyState: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    marginTop: Spacing.four,
  },
});
