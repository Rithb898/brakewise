import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { DriveSession } from '@/lib/types';
import { getSessionById } from '@/lib/storage';
import { EVENT_LABELS, EventType } from '@/lib/types';

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const scoreColor = (score: number) => {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#3b82f6';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
        <Pressable onPress={() => router.replace('/')}>
          <ThemedText type="linkPrimary">Go Home</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const eventCounts: Record<string, number> = {};
  for (const e of session.events) {
    eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
  }

  const chartData = Object.values(EventType)
    .map((type) => ({
      value: eventCounts[type] || 0,
      label: EVENT_LABELS[type].split(' ').slice(-1)[0],
      frontColor: eventCounts[type] > 0 ? scoreColor(session.score) : '#cccccc',
    }))
    .filter((d) => true);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.heroCard}>
            <ThemedText style={[styles.heroScore, { color: scoreColor(session.score) }]}>
              {session.score}
            </ThemedText>
            <ThemedText style={[styles.heroRating, { color: scoreColor(session.score) }]}>
              {session.rating}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.statsRow}>
            <View style={styles.stat}>
              <ThemedText type="title" style={{ fontSize: 24 }}>{formatDuration(session.duration)}</ThemedText>
              <ThemedText type="small" style={{ opacity: 0.5 }}>Duration</ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText type="title" style={{ fontSize: 24 }}>{session.events.length}</ThemedText>
              <ThemedText type="small" style={{ opacity: 0.5 }}>Events</ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText type="title" style={{ fontSize: 24 }}>{100 - session.score}</ThemedText>
              <ThemedText type="small" style={{ opacity: 0.5 }}>Penalties</ThemedText>
            </View>
          </ThemedView>

          {session.events.length > 0 && (
            <>
              <ThemedText type="subtitle" style={{ fontSize: 20, marginTop: Spacing.three }}>
                Event Breakdown
              </ThemedText>
              <BarChart
                data={chartData}
                barWidth={32}
                spacing={20}
                roundedTop
                height={150}
                noOfSections={3}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="#ccc"
              />
            </>
          )}

          <ThemedText type="subtitle" style={{ fontSize: 20, marginTop: Spacing.four }}>
            Timeline
          </ThemedText>

          {session.events.length === 0 ? (
            <ThemedText type="small" style={{ opacity: 0.4, textAlign: 'center', marginTop: Spacing.four }}>
              No events detected — perfect drive!
            </ThemedText>
          ) : (
            session.events.map((e, i) => (
              <ThemedView type="backgroundElement" key={e.id} style={styles.timelineRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <View style={[styles.dot, { backgroundColor: scoreColor(session.score) }]} />
                  <ThemedText>{EVENT_LABELS[e.type]}</ThemedText>
                </View>
                <ThemedText type="small" style={{ opacity: 0.5 }}>
                  {new Date(e.timestamp).toLocaleTimeString()}
                </ThemedText>
              </ThemedView>
            ))
          )}

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, { backgroundColor: '#3c87f7' }]} onPress={() => router.replace('/')}>
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>New Drive</ThemedText>
            </Pressable>
            <Pressable style={styles.buttonOutline} onPress={() => router.push('/history')}>
              <ThemedText style={{ color: '#3c87f7', fontWeight: '700' }}>View History</ThemedText>
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
  scroll: { paddingVertical: Spacing.six, gap: 0, paddingBottom: Spacing.six },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three },
  heroCard: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  heroScore: { fontSize: 96, fontWeight: '900', lineHeight: 100 },
  heroRating: { fontSize: 24, fontWeight: '700', marginTop: Spacing.one },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  stat: { alignItems: 'center', gap: 2 },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Spacing.one,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  buttonRow: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  buttonOutline: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3c87f7',
  },
});
