import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { DeviceMotion } from "expo-sensors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useDriveStore } from "@/features/drive/store/driveStore";
import type { DriveSession } from "@/lib/types";
import { scoreColor, formatDuration, RATING_ICONS } from "@/lib/display";
import {
  getSessions,
  getInterruptedSession,
  clearInterruptedSession,
} from "@/lib/storage";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const startDrive = useDriveStore((s) => s.startDrive);
  const isActive = useDriveStore((s) => s.isActive);
  const testMode = useDriveStore((s) => s.testMode);
  const setTestMode = useDriveStore((s) => s.setTestMode);
  const [lastSession, setLastSession] = useState<DriveSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<DriveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    const sessions = await getSessions();
    sessions.sort((a, b) => b.startTime - a.startTime);
    setLastSession(sessions[0] ?? null);
    setRecentSessions(sessions.slice(0, 3));
    setLoading(false);
  }, []);

  // Refresh whenever the screen regains focus (e.g. after ending a drive).
  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

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
    if (Platform.OS === "android") {
      startDrive();
      router.push("/drive");
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
        "BrakeWise needs motion sensors to detect driving events. Please enable Motion & Fitness in your device settings.",
        [{ text: "OK" }],
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.brandRow}>
              <MaterialCommunityIcons
                name="steering"
                size={30}
                color="#3c87f7"
              />
              <ThemedText style={styles.logo}>BrakeWise</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Drive safe. Score high.
            </ThemedText>
          </View>

          {/* Last drive */}
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
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Your last drive
                  </ThemedText>
                  <View style={styles.ratingLine}>
                    <Ionicons
                      name={RATING_ICONS[lastSession.rating]}
                      size={18}
                      color={scoreColor(lastSession.score)}
                    />
                    <ThemedText
                      type="smallBold"
                      style={{ color: scoreColor(lastSession.score) }}
                    >
                      {lastSession.rating}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {formatDuration(lastSession.duration)} ·{" "}
                    {lastSession.events.length} events
                  </ThemedText>
                </View>
                <ThemedText
                  style={[styles.lastScore, { color: scoreColor(lastSession.score) }]}
                >
                  {lastSession.score}
                </ThemedText>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.textSecondary}
                />
              </ThemedView>
            </Pressable>
          )}

          {/* Start button */}
          <Pressable
            style={[styles.startButton, isActive && styles.startButtonDisabled]}
            onPress={handleStart}
            disabled={isActive}
          >
            <Ionicons name="play" size={22} color="#fff" />
            <ThemedText style={styles.startButtonText}>
              {isActive ? "Drive in progress…" : "Start Drive"}
            </ThemedText>
          </Pressable>

          {/* Test mode */}
          <ThemedView type="backgroundElement" style={styles.testRow}>
            <MaterialCommunityIcons
              name="flask-outline"
              size={20}
              color={theme.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">Test mode</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Detect events while still — for trying it out without driving.
              </ThemedText>
            </View>
            <Switch
              value={testMode}
              onValueChange={setTestMode}
              trackColor={{ true: "#3c87f7" }}
            />
          </ThemedView>

          {/* Recent */}
          {recentSessions.length > 0 && (
            <View style={{ gap: Spacing.two }}>
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">Recent drives</ThemedText>
                <Pressable onPress={() => router.push("/history")}>
                  <ThemedText type="linkPrimary">View all →</ThemedText>
                </Pressable>
              </View>

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
                  <ThemedView type="backgroundElement" style={styles.sessionRow}>
                    <View
                      style={[
                        styles.scoreChip,
                        { backgroundColor: scoreColor(s.score) },
                      ]}
                    >
                      <ThemedText style={styles.scoreChipText}>
                        {s.score}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold">{s.rating}</ThemedText>
                      <ThemedText
                        type="small"
                        style={{ color: theme.textSecondary }}
                      >
                        {new Date(s.startTime).toLocaleDateString()} ·{" "}
                        {formatDuration(s.duration)} · {s.events.length} events
                      </ThemedText>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={theme.textSecondary}
                    />
                  </ThemedView>
                </Pressable>
              ))}
            </View>
          )}

          {!loading && recentSessions.length === 0 && (
            <ThemedView type="backgroundElement" style={styles.emptyState}>
              <MaterialCommunityIcons
                name="car-outline"
                size={44}
                color={theme.textSecondary}
              />
              <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>
                No drives yet
              </ThemedText>
              <ThemedText
                type="small"
                style={{ textAlign: "center", color: theme.textSecondary }}
              >
                Tap Start Drive to record your first session.
              </ThemedText>
            </ThemedView>
          )}

          {loading && (
            <ActivityIndicator size="large" style={{ marginTop: Spacing.four }} />
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
  brand: { alignItems: "center", gap: Spacing.one },
  brandRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  logo: { fontSize: 34, lineHeight: 40, fontWeight: "800" },
  lastDriveCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  ratingLine: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  lastScore: { fontSize: 40, lineHeight: 44, fontWeight: "900" },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    backgroundColor: "#3c87f7",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  startButtonDisabled: { opacity: 0.5 },
  startButtonText: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
  testRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  scoreChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreChipText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  emptyState: {
    padding: Spacing.five,
    borderRadius: Spacing.four,
    alignItems: "center",
    gap: 2,
  },
});
