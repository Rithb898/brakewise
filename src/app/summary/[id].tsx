import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { BarChart } from "react-native-gifted-charts";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { DriveSession } from "@/lib/types";
import { getSessionById } from "@/lib/storage";
import { EVENT_LABELS, EventType } from "@/lib/types";
import {
  scoreColor,
  formatDuration,
  RATING_ICONS,
  RATING_MESSAGE,
} from "@/lib/display";
import { EventRow } from "@/features/drive/components/EventRow";
import { driveRates } from "@/features/drive/utils/scoring";

function StatCard({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );
}

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [session, setSession] = useState<DriveSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const s = await getSessionById(id);
      setSession(s);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Session not found</ThemedText>
        <Pressable onPress={() => router.replace("/")}>
          <ThemedText type="linkPrimary">Go Home</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const tint = scoreColor(session.score);
  const rates = driveRates(session);

  const eventCounts: Record<string, number> = {};
  for (const e of session.events) {
    eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
  }

  const chartData = Object.values(EventType).map((type) => ({
    value: eventCounts[type] || 0,
    label: EVENT_LABELS[type].split(" ").slice(-1)[0],
    frontColor: eventCounts[type] > 0 ? tint : "#d1d5db",
  }));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={[styles.scoreRing, { borderColor: tint }]}>
              <ThemedText style={[styles.heroScore, { color: tint }]}>
                {session.score}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                / 100
              </ThemedText>
            </View>
            <View style={styles.ratingLine}>
              <Ionicons
                name={RATING_ICONS[session.rating]}
                size={22}
                color={tint}
              />
              <ThemedText style={[styles.heroRating, { color: tint }]}>
                {session.rating}
              </ThemedText>
            </View>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: "center" }}
            >
              {RATING_MESSAGE[session.rating]}
            </ThemedText>
          </View>

          {/* Core stats */}
          <ThemedView type="backgroundElement" style={styles.statsRow}>
            <StatCard value={formatDuration(session.duration)} label="Duration" />
            <StatCard value={`${session.events.length}`} label="Events" />
            <StatCard value={`${100 - session.score}`} label="Points lost" />
          </ThemedView>

          {(session.distanceKm ?? 0) > 0 && (
            <ThemedView type="backgroundElement" style={styles.statsRow}>
              <StatCard
                value={`${session.distanceKm.toFixed(1)} km`}
                label="Distance"
              />
              <StatCard
                value={`${Math.round(session.maxSpeedKmh)}`}
                label="Top km/h"
              />
              {rates.avgSpeedKmh != null && (
                <StatCard
                  value={`${Math.round(rates.avgSpeedKmh)}`}
                  label="Avg km/h"
                />
              )}
            </ThemedView>
          )}

          {session.events.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.statsRow}>
              <StatCard
                value={rates.eventsPer10Min.toFixed(1)}
                label="Events / 10 min"
              />
              {rates.eventsPer100Km != null && (
                <StatCard
                  value={`${Math.round(rates.eventsPer100Km)}`}
                  label="Events / 100 km"
                />
              )}
            </ThemedView>
          )}

          {/* Breakdown */}
          {session.events.length > 0 && (
            <View>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Event breakdown
              </ThemedText>
              <BarChart
                data={chartData}
                barWidth={28}
                spacing={18}
                roundedTop
                height={140}
                noOfSections={3}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={theme.backgroundSelected}
                xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
              />
            </View>
          )}

          {/* Timeline */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Timeline
          </ThemedText>
          {session.events.length === 0 ? (
            <View style={styles.perfect}>
              <MaterialCommunityIcons
                name="trophy"
                size={40}
                color="#22c55e"
              />
              <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>
                Perfect drive!
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary }}
              >
                No risky events detected.
              </ThemedText>
            </View>
          ) : (
            <View style={{ gap: Spacing.two }}>
              {session.events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, { backgroundColor: "#3c87f7" }]}
              onPress={() => router.replace("/")}
            >
              <Ionicons name="home" size={18} color="#fff" />
              <ThemedText style={styles.buttonText}>Home</ThemedText>
            </Pressable>
            <Pressable
              style={styles.buttonOutline}
              onPress={() => router.push("/history")}
            >
              <Ionicons name="time" size={18} color="#3c87f7" />
              <ThemedText style={[styles.buttonText, { color: "#3c87f7" }]}>
                History
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  scroll: { paddingVertical: Spacing.six, gap: Spacing.three },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.three,
  },
  heroCard: { alignItems: "center", gap: Spacing.two, paddingVertical: Spacing.three },
  scoreRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  heroScore: { fontSize: 56, fontWeight: "900", lineHeight: 58 },
  ratingLine: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  heroRating: { fontSize: 22, fontWeight: "800" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  stat: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 22, lineHeight: 26, fontWeight: "800" },
  sectionTitle: { marginTop: Spacing.two, fontSize: 15 },
  perfect: {
    alignItems: "center",
    paddingVertical: Spacing.five,
    gap: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  buttonOutline: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#3c87f7",
  },
});
