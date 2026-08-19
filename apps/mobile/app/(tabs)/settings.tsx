import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants";
import { useAuth } from "../../hooks/useAuth";

interface SettingsRow {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: Parameters<typeof Link>[0]["href"];
  requiresAuth?: boolean;
}

const ROWS: SettingsRow[] = [
  {
    label: "User profile",
    icon: "person-outline",
    href: "/profile",
    requiresAuth: true,
  },
  {
    label: "Agent profile",
    icon: "briefcase-outline",
    href: "/agent-profile",
    requiresAuth: true,
  },
  {
    label: "Saved listings",
    icon: "heart-outline",
    href: "/saved",
    requiresAuth: true,
  },
  {
    label: "My listings",
    icon: "list-outline",
    href: "/my-listings",
    requiresAuth: true,
  },
  { label: "Notifications", icon: "notifications-outline" },
  { label: "Location", icon: "location-outline", href: "/location" },
  { label: "Privacy", icon: "lock-closed-outline" },
  { label: "Security", icon: "shield-checkmark-outline" },
  { label: "App settings", icon: "options-outline" },
];

export default function SettingsScreen() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>Settings</Text>

      {!isAuthenticated && (
        <View style={styles.authBanner}>
          <Text style={styles.authBannerText}>
            Log in to save listings, rate agents and more.
          </Text>
          <Pressable onPress={() => router.push("/auth/login")}>
            <Text style={styles.authBannerAction}>Log in</Text>
          </Pressable>
        </View>
      )}

      <ScrollView>
        {isAuthenticated && (
          <Pressable
            style={styles.createButton}
            onPress={() =>
              router.push(user?.role === "AGENT" ? "/create" : "/agent-profile")
            }
          >
            <Ionicons
              name={
                user?.role === "AGENT"
                  ? "add-circle-outline"
                  : "briefcase-outline"
              }
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.createButtonText}>
              {user?.role === "AGENT"
                ? "Create a listing"
                : "Become an agent to publish"}
            </Text>
          </Pressable>
        )}
        {ROWS.map((row) => (
          <Pressable
            key={row.label}
            style={styles.row}
            onPress={() => {
              if (row.requiresAuth && !isAuthenticated) {
                router.push("/auth/login");
                return;
              }
              if (row.href) {
                router.push(row.href);
              }
            }}
          >
            <Ionicons name={row.icon} size={20} color={COLORS.text} />
            <Text style={styles.rowLabel}>
              {row.label === "Agent profile" && user?.role !== "AGENT"
                ? "Become an agent"
                : row.label}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </Pressable>
        ))}

        {isAuthenticated && (
          <Pressable style={styles.row} onPress={() => logout()}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={[styles.rowLabel, { color: COLORS.danger }]}>
              Logout
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  authBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authBannerText: {
    flex: 1,
    color: COLORS.text,
    marginRight: 8,
  },
  authBannerAction: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  createButton: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  createButtonText: { color: "#FFFFFF", fontWeight: "700" },
});
