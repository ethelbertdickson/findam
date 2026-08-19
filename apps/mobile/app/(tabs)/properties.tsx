import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListingFeed } from "../../components/ListingFeed";
import { MarketplaceTabHeader } from "../../components/MarketplaceTabHeader";
import { SearchOverlay } from "../../components/SearchOverlay";
import { COLORS } from "../../constants";
import type { ListingFilters } from "../../services/listings";
import type { PropertyType } from "../../types";

const PROPERTY_TYPES: { label: string; value?: PropertyType }[] = [
  { label: "All" },
  { label: "Apartments", value: "APARTMENT" },
  { label: "Flats", value: "FLAT" },
  { label: "Self-contained", value: "SELF_CONTAINED" },
  { label: "Short lets", value: "SHORT_LET" },
  { label: "Serviced apartments", value: "SERVICED_APARTMENT" },
  { label: "New projects", value: "NEW_PROJECT" },
  { label: "Houses", value: "HOUSE" },
  { label: "Bungalows", value: "BUNGALOW" },
  { label: "Duplexes", value: "DUPLEX" },
  { label: "Detached duplexes", value: "DETACHED_DUPLEX" },
  { label: "Semi-detached", value: "SEMI_DETACHED_DUPLEX" },
  { label: "Terraces", value: "TERRACE" },
  { label: "Shops", value: "SHOP" },
  { label: "Offices", value: "OFFICE" },
  { label: "Commercial", value: "COMMERCIAL" },
  { label: "Other", value: "OTHER" },
];

export default function PropertiesScreen() {
  const params = useLocalSearchParams<{ search?: string }>();
  const [selected, setSelected] = useState<PropertyType | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<ListingFilters | null>(null);
  useEffect(() => {
    if (params.search) setSearchOpen(true);
  }, [params.search]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <MarketplaceTabHeader
        title="Properties"
        onSearch={() => setSearchOpen(true)}
      />
      <ScrollView
        horizontal
        style={styles.filters}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {PROPERTY_TYPES.map((item) => {
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
        type="PROPERTY"
        propertyType={selected}
        showAgencyFee
        showPropertyMeta
        filters={searchFilters}
      />
      <SearchOverlay
        visible={searchOpen}
        type="PROPERTY"
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
