import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants";
import { RADIUS_OPTIONS } from "../../types";
import { useLocationStore } from "../../store/location-store";

export default function FiltersScreen() {
  const { radiusKm, setRadius } = useLocationStore();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search radius</Text>
      <View style={styles.row}>
        {RADIUS_OPTIONS.map((option) => (
          <View key={option.km} style={[styles.chip, radiusKm === option.km && styles.selected]} onTouchEnd={() => setRadius(option.km)}>
            <Text style={[styles.chipText, radiusKm === option.km && styles.selectedText]}>{option.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: {
    color: COLORS.text,
    fontSize: 13,
  },
  selected: { backgroundColor: COLORS.primary },
  selectedText: { color: "#FFFFFF", fontWeight: "700" },
});
