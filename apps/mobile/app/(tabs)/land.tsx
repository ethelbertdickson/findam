import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListingFeed } from "../../components/ListingFeed";
import { MarketplaceTabHeader } from "../../components/MarketplaceTabHeader";
import { SearchOverlay } from "../../components/SearchOverlay";
import { COLORS } from "../../constants";
import type { ListingFilters } from "../../services/listings";
import type { LandTenure } from "../../types";
import { useLocationStore } from "../../store/location-store";

const TENURES: { label: string; value?: LandTenure }[] = [
  { label: "All" },
  { label: "For sale", value: "SALE" },
  { label: "For lease", value: "LEASE" },
];

export default function LandScreen() {
  const params = useLocalSearchParams<{ search?: string }>();
  const [selected, setSelected] = useState<LandTenure | undefined>();
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
  useEffect(() => {
    if (params.search) setSearchOpen(true);
  }, [params.search]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <MarketplaceTabHeader title="Land" onSearch={() => setSearchOpen(true)} />
      <ScrollView
        horizontal
        style={styles.filters}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {TENURES.map((item) => {
          const active = selected === item.value;
          return (
            <Pressable
              key={item.label}
              onPress={() => setSelected(item.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text
                numberOfLines={1}
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {searchFilters && (
        <View style={styles.searchStatus}>
          <Text style={styles.searchStatusText}>Filtered results</Text>
          <Pressable onPress={() => setSearchFilters(null)}>
            <Text style={styles.clearSearch}>Clear search</Text>
          </Pressable>
        </View>
      )}
      <ListingFeed type="LAND" tenure={selected} filters={searchFilters} />
      <SearchOverlay
        visible={searchOpen}
        type="LAND"
        onClose={() => setSearchOpen(false)}
        onSearch={setSearchFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filters: { flexGrow: 0 },
  list: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  chip: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.text, fontSize: 13, lineHeight: 18 },
  chipTextActive: { color: "#FFFFFF", fontWeight: "800" },
  searchStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchStatusText: { color: COLORS.text, fontWeight: "700" },
  clearSearch: { color: COLORS.primary, fontWeight: "700" },
});
