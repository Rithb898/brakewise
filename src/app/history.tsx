import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { DriveSession } from '@/lib/types';
import { getSessions } from '@/lib/storage';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const scoreColor = (score: number) => {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#3b82f6';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<DriveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await getSessions();
    all.sort((a, b) => b.startTime - a.startTime);
    setSessions(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((s, d) => s + d.score, 0) / sessions.length)
    : 0;
  const totalDrives = sessions.length;
  const totalDuration = sessions.reduce((s, d) => s + d.duration, 0);
  const totalEvents = sessions.reduce((s, d) => s + d.events.length, 0);

  // Trend chart: last 10 sessions, reversed to chronological
  const trendData = [...sessions]
    .reverse()
    .slice(-10)
    .map((s, i) => ({ value: s.score, label: `${i + 1}`, dataPointText: `${s.score}` }));

  const renderSession = ({ item }: { item: DriveSession }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/summary/[id]', params: { id: item.id } })}
    >
      <ThemedView type="backgroundElement" style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <ThemedText style={[styles.scoreBadge, { color: scoreColor(item.score) }]}>
            {item.score}
          </ThemedText>
          <ThemedText style={{ color: scoreColor(item.score), fontWeight: '700' }}>
            {item.rating}
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ opacity: 0.5 }}>
          {new Date(item.startTime).toLocaleDateString()} · {formatDuration(item.duration)} · {item.events.length} events
        </ThemedText>
      </ThemedView>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          renderItem={renderSession}
          ListHeaderComponent={
            <View>
              <ThemedText type="title" style={styles.title}>
                Dashboard
              </ThemedText>

              {sessions.length > 0 && (
                <>
                  <ThemedView type="backgroundElement" style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <ThemedText type="title" style={{ fontSize: 28, color: scoreColor(avgScore) }}>
                        {avgScore}
                      </ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.5 }}>Avg Score</ThemedText>
                    </View>
                    <View style={styles.statCard}>
                      <ThemedText type="title" style={{ fontSize: 28 }}>{totalDrives}</ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.5 }}>Drives</ThemedText>
                    </View>
                  </ThemedView>

                  {trendData.length > 1 && (
                    <>
                      <ThemedText type="subtitle" style={{ fontSize: 20, marginTop: Spacing.four }}>
                        Score Trend
                      </ThemedText>
                      <LineChart
                        data={trendData}
                        width={300}
                        height={150}
                        color="#3c87f7"
                        thickness={2}
                        startFillColor="rgba(60,135,247,0.2)"
                        endFillColor="rgba(60,135,247,0)"
                        yAxisThickness={0}
                        xAxisThickness={1}
                        xAxisColor="#ccc"
                        dataPointsColor="#3c87f7"
                        dataPointsRadius={3}
                        textColor="#999"
                        yAxisTextStyle={{ color: '#999', fontSize: 10 }}
                        noOfSections={3}
                        maxValue={100}
                      />
                    </>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.four }}>
                    <ThemedText type="small">{formatDuration(totalDuration)} total</ThemedText>
                    <ThemedText type="small">{totalEvents} events total</ThemedText>
                  </View>

                  <ThemedText type="subtitle" style={{ fontSize: 20, marginTop: Spacing.five }}>
                    All Drives
                  </ThemedText>
                </>
              )}
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <ThemedView type="backgroundElement" style={styles.emptyState}>
                <ThemedText style={{ textAlign: 'center', opacity: 0.6 }}>
                  No drives yet.{'\n'}Start your first drive from the home screen.
                </ThemedText>
                <Pressable
                  style={styles.startBtn}
                  onPress={() => router.replace('/')}
                >
                  <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Go Home</ThemedText>
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
  listContent: { paddingBottom: Spacing.six },
  title: { marginTop: Spacing.six, marginBottom: Spacing.four },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  statCard: { flex: 1, alignItems: 'center', gap: 2 },
  sessionCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.two,
    gap: Spacing.one,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreBadge: { fontSize: 24, fontWeight: '800' },
  emptyState: {
    padding: Spacing.five,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.five,
  },
  startBtn: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
});
