import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useDriveStore } from "@/features/drive/store/driveStore";

/**
 * Driver-facing live status. Replaces the raw sensor debug panel: shows current
 * speed (the one number a driver understands), a gentle "monitoring" pulse, and
 * a plain GPS status. Subscribes only to speed/gps so the 1 Hz updates don't
 * re-render the rest of the drive screen.
 */
export function LiveStatus() {
  const theme = useTheme();
  const speed = useDriveStore((s) => s.speed);
  const gpsActive = useDriveStore((s) => s.gpsActive);

  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const kmh = speed != null ? Math.max(0, Math.round(speed * 3.6)) : null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.statusRow}>
        <Animated.View style={[styles.pulseDot, { opacity: pulse }]} />
        <ThemedText type="smallBold">Monitoring your drive</ThemedText>
      </View>

      <View style={styles.speedBlock}>
        <ThemedText style={styles.speedValue}>{kmh ?? "--"}</ThemedText>
        <ThemedText type="small" style={styles.speedUnit}>
          km/h
        </ThemedText>
      </View>

      <View style={styles.gpsRow}>
        <Ionicons
          name={gpsActive ? "location" : "location-outline"}
          size={14}
          color={gpsActive ? "#22c55e" : theme.textSecondary}
        />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {gpsActive ? "GPS active" : "Searching for GPS…"}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.three,
    alignItems: "center",
    gap: Spacing.one,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  speedBlock: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.one,
  },
  speedValue: {
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 48,
  },
  speedUnit: { opacity: 0.5, marginBottom: 8 },
  gpsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
});
