import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionHeader } from "../../components/SectionHeader";
import { COLORS } from "../../constants";
import { ListingFeed } from "../../components/ListingFeed";
import { SearchOverlay } from "../../components/SearchOverlay";
import type { ListingFilters } from "../../services/listings";
import { useLocationStore } from "../../store/location-store";

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const refreshing = useIsFetching({ queryKey: ["listings"] }) > 0;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<ListingFilters | null>(null);
  const locationSearchActive = useLocationStore((state) => state.searchActive);
  useEffect(() => {
    if (locationSearchActive) return;
    setSearchFilters((current) =>
      current && (current.latitude !== undefined || current.longitude !== undefined || current.radiusKm !== undefined)
        ? { ...current, latitude: undefined, longitude: undefined, radiusKm: undefined }
        : current,
    );
  }, [locationSearchActive]);
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.appName}>Find Am</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search Find Am"
          onPress={() => setSearchOpen(true)}
          style={styles.searchButton}
        >
          <Ionicons name="search" size={22} color={COLORS.text} />
        </Pressable>
      </View>
      {searchFilters ? (
        <View style={styles.searchResults}>
          <SectionHeader
            title="Search results"
            actionLabel="Clear search"
            onActionPress={() => setSearchFilters(null)}
          />
          <ListingFeed filters={searchFilters} />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                queryClient.invalidateQueries({ queryKey: ["listings"] })
              }
              tintColor={COLORS.text}
              colors={[COLORS.primary]}
            />
          }
        >
          <SectionHeader
            title="Latest listings"
            actionLabel="See all"
            onActionPress={() => setSearchOpen(true)}
          />
          <ListingFeed horizontal />
          <SectionHeader
            title="Properties"
            actionLabel="See all"
            onActionPress={() =>
              router.push({
                pathname: "/properties",
                params: { search: String(Date.now()) },
              })
            }
          />
          <ListingFeed type="PROPERTY" horizontal />
          <SectionHeader
            title="Land"
            actionLabel="See all"
            onActionPress={() =>
              router.push({
                pathname: "/land",
                params: { search: String(Date.now()) },
              })
            }
          />
          <ListingFeed type="LAND" horizontal />
          <SectionHeader
            title="Household finds"
            actionLabel="See all"
            onActionPress={() =>
              router.push({
                pathname: "/household",
                params: { search: String(Date.now()) },
              })
            }
          />
          <ListingFeed type="HOUSEHOLD" horizontal />
          <View style={styles.professionalCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.professionalTitle}>Need a trusted professional?</Text>
              <Text style={styles.professionalNote}>Find plumbers, electricians, architects and more near you.</Text>
            </View>
            <Pressable style={styles.professionalButton} onPress={() => router.push("/professionals")}>
              <Text style={styles.professionalButtonText}>Explore</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
      <SearchOverlay
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={setSearchFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchResults: { flex: 1 },
  professionalCard: { margin: 16, padding: 16, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 12 },
  professionalTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  professionalNote: { color: COLORS.muted, marginTop: 4, lineHeight: 18 },
  professionalButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  professionalButtonText: { color: "#fff", fontWeight: "700" },
});
