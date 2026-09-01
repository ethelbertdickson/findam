import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants";
import { useLocationStore } from "../../store/location-store";

export default function LocationSettingsScreen() {
  const { latitude, longitude, setLocation, clear } = useLocationStore();
  const [loading, setLoading] = useState(false);
  const enabled = latitude !== null && longitude !== null;

  const updateLocation = async () => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Enable location in Settings",
          "Find Am needs device location permission to activate location-based search.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(current.coords.latitude, current.coords.longitude);
    } catch {
      Alert.alert(
        "Location unavailable",
        "Check that location is enabled on your phone and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location</Text>
      <Text style={styles.intro}>This setting controls location search throughout Find Am. Turn it off to remove location filtering and distance controls from searches.</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons
            name={enabled ? "navigate-circle" : "navigate-circle-outline"}
            size={28}
            color={enabled ? COLORS.primary : COLORS.muted}
          />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Phone location</Text>
            <Text style={styles.status}>
              {enabled
                ? "Using your phone’s current location"
                : "Location access is off"}
            </Text>
          </View>
        </View>
        {enabled && (
          <Text style={styles.coordinates}>
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
        )}
        <Pressable
          style={[styles.button, loading && styles.disabled]}
          onPress={updateLocation}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? "Finding your location…"
              : enabled
                ? "Update my location"
                : "Use my current location"}
          </Text>
        </Pressable>
        {enabled && (
          <Pressable onPress={clear}>
            <Text style={styles.clear}>Turn off location</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  intro: { color: COLORS.muted, lineHeight: 21, marginTop: 8 },
  card: {
    marginTop: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardText: { flex: 1 },
  cardTitle: { color: COLORS.text, fontWeight: "800", fontSize: 16 },
  status: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  coordinates: { color: COLORS.muted, fontSize: 12 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
    padding: 14,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
  clear: { color: COLORS.danger, textAlign: "center" },
  disabled: { opacity: 0.5 },
});
