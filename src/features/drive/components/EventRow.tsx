import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { DriveEvent } from "@/lib/types";
import { EVENT_DESCRIPTIONS, EVENT_ICONS } from "@/lib/display";

/** A single detected-event line, used in the live feed and the summary timeline. */
export function EventRow({ event }: { event: DriveEvent }) {
  const theme = useTheme();
  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.iconBubble}>
        <MaterialCommunityIcons
          name={EVENT_ICONS[event.type]}
          size={20}
          color="#f97316"
        />
      </View>

      <View style={styles.body}>
        <ThemedText type="smallBold">{EVENT_DESCRIPTIONS[event.type]}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {time}
        </ThemedText>
      </View>

      <ThemedText style={styles.penalty}>−{event.penalty}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(249,115,22,0.12)",
  },
  body: { flex: 1, gap: 1 },
  penalty: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ef4444",
  },
});
