import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LineChart } from "react-native-gifted-charts";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { DriveSession } from "@/lib/types";
import { getSessions } from "@/lib/storage";
import { scoreColor, formatDuration, RATING_ICONS } from "@/lib/display";

export default function HistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [sessions, setSessions] = useState<DriveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const all = await getSessions();
    all.sort((a, b) => b.startTime - a.startTime);
    setSessions(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const avgScore =
    sessions.length > 0
      ? Math.round(sessions.reduce((s, d) => s + d.score, 0) / sessions.length)
      : 0;
  const totalDuration = sessions.reduce((s, d) => s + d.duration, 0);
  const totalEvents = sessions.reduce((s, d) => s + d.events.length, 0);

  const trendData = [...sessions]
    .reverse()
    .slice(-10)
    .map((s) => ({ value: s.score, dataPointText: `${s.score}` }));

  const renderSession = ({ item }: { item: DriveSession }) => (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/summary/[id]", params: { id: item.id } })
      }
    >
      <ThemedView type="backgroundElement" style={styles.sessionCard}>
        <View
          style={[styles.scoreChip, { backgroundColor: scoreColor(item.score) }]}
        >
          <ThemedText style={styles.scoreChipText}>{item.score}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.ratingLine}>
            <Ionicons
              name={RATING_ICONS[item.rating]}
              size={15}
              color={scoreColor(item.score)}
            />
            <ThemedText type="smallBold">{item.rating}</ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {new Date(item.startTime).toLocaleDateString()} ·{" "}
            {formatDuration(item.duration)} · {item.events.length} events
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </ThemedView>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold" style={{ fontSize: 18 }}>
            Your Dashboard
          </ThemedText>
          <View style={{ width: 26 }} />
        </View>

        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          renderItem={renderSession}
          ListHeaderComponent={
            sessions.length > 0 ? (
              <View style={{ gap: Spacing.three, marginBottom: Spacing.three }}>
                <View style={styles.statsGrid}>
                  <ThemedView type="backgroundElement" style={styles.statCard}>
                    <ThemedText
                      style={{ fontSize: 30, lineHeight: 34, fontWeight: "900", color: scoreColor(avgScore) }}
                    >
                      {avgScore}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Avg score
                    </ThemedText>
                  </ThemedView>
                  <ThemedView type="backgroundElement" style={styles.statCard}>
                    <ThemedText style={{ fontSize: 30, lineHeight: 34, fontWeight: "900" }}>
                      {sessions.length}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Drives
                    </ThemedText>
                  </ThemedView>
                </View>

                <View style={styles.statsGrid}>
                  <ThemedView type="backgroundElement" style={styles.statCardSm}>
                    <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
                    <ThemedText type="smallBold">
                      {formatDuration(totalDuration)}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Total time
                    </ThemedText>
                  </ThemedView>
                  <ThemedView type="backgroundElement" style={styles.statCardSm}>
                    <Ionicons name="alert-circle-outline" size={18} color={theme.textSecondary} />
                    <ThemedText type="smallBold">{totalEvents}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Total events
                    </ThemedText>
                  </ThemedView>
                </View>

                {trendData.length > 1 && (
                  <ThemedView type="backgroundElement" style={styles.chartCard}>
                    <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>
                      Score trend
                    </ThemedText>
                    <LineChart
                      data={trendData}
                      height={130}
                      color="#3c87f7"
                      thickness={3}
                      curved
                      startFillColor="rgba(60,135,247,0.25)"
                      endFillColor="rgba(60,135,247,0)"
                      areaChart
                      hideRules
                      yAxisThickness={0}
                      xAxisThickness={0}
                      dataPointsColor="#3c87f7"
                      dataPointsRadius={4}
                      yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                      noOfSections={3}
                      maxValue={100}
                    />
                  </ThemedView>
                )}

                <ThemedText type="smallBold" style={{ fontSize: 15, marginTop: Spacing.one }}>
                  All drives
                </ThemedText>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <ThemedView type="backgroundElement" style={styles.emptyState}>
                <Ionicons name="car-outline" size={44} color={theme.textSecondary} />
                <ThemedText type="smallBold">No drives yet</ThemedText>
                <ThemedText
                  type="small"
                  style={{ textAlign: "center", color: theme.textSecondary }}
                >
                  Start your first drive from the home screen.
                </ThemedText>
                <Pressable style={styles.startBtn} onPress={() => router.replace("/")}>
                  <ThemedText style={{ color: "#fff", fontWeight: "700" }}>
                    Go Home
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <ActivityIndicator size="large" style={{ marginTop: Spacing.five }} />
            )
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.three,
  },
  listContent: { paddingBottom: Spacing.six },
  statsGrid: { flexDirection: "row", gap: Spacing.three },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  statCardSm: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  chartCard: { padding: Spacing.three, borderRadius: Spacing.four },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  scoreChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreChipText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  ratingLine: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  emptyState: {
    padding: Spacing.five,
    borderRadius: Spacing.four,
    alignItems: "center",
    gap: Spacing.two,
    marginTop: Spacing.five,
  },
  startBtn: {
    backgroundColor: "#3c87f7",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
  },
});
