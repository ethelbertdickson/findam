import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListingFeed } from "../../components/ListingFeed";
import { MarketplaceTabHeader } from "../../components/MarketplaceTabHeader";
import { SearchOverlay } from "../../components/SearchOverlay";
import { COLORS } from "../../constants";
import type { ListingFilters } from "../../services/listings";
import { useLocationStore } from "../../store/location-store";
import type { HouseholdCategory } from "../../types";

const CATEGORIES: { label: string; value?: HouseholdCategory }[] = [
  { label: "All" },
  { label: "Furniture", value: "FURNITURE" },
  { label: "Television", value: "TELEVISION" },
  { label: "Refrigerator", value: "REFRIGERATOR" },
  { label: "Air conditioner", value: "AIR_CONDITIONER" },
  { label: "Cooker", value: "COOKER" },
  { label: "Generator", value: "GENERATOR" },
  { label: "Electronics", value: "ELECTRONICS" },
  { label: "Kitchen equipment", value: "KITCHEN_EQUIPMENT" },
  { label: "Office furniture", value: "OFFICE_FURNITURE" },
  { label: "Other", value: "OTHER" },
];

export default function HouseholdScreen() {
  const [selected, setSelected] = useState<HouseholdCategory | undefined>();
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
      <MarketplaceTabHeader
        title="Household"
        onSearch={() => setSearchOpen(true)}
      />
      <ScrollView
        horizontal
        style={styles.filters}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {CATEGORIES.map((item) => {
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
      <ListingFeed
        type="HOUSEHOLD"
        category={selected}
        filters={searchFilters}
      />
      <SearchOverlay
        visible={searchOpen}
        type="HOUSEHOLD"
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
