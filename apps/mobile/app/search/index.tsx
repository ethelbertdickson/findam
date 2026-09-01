import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { LocationAutocomplete } from "../../components/LocationAutocomplete";
import { ListingCard } from "../../components/ListingCard";
import { locationLabel } from "../../components/ListingFeed";
import { COLORS } from "../../constants";
import { fetchListings, type ListingFilters } from "../../services/listings";
import { RADIUS_OPTIONS } from "../../types";
import type {
  HouseholdCategory,
  HouseholdCondition,
  LandTenure,
  ListingType,
  LocationSuggestion,
  PropertyOfferType,
  PropertyType,
} from "../../types";
import { formatAmountInput, parseAmountInput } from "../../utils/currency";

type Option = { label: string; value: string };

const PROPERTY_TYPES: Option[] = [
  { label: "Any property type", value: "" },
  { label: "Apartment", value: "APARTMENT" },
  { label: "Flat", value: "FLAT" },
  { label: "Self-contained", value: "SELF_CONTAINED" },
  { label: "Short let", value: "SHORT_LET" },
  { label: "Serviced apartment", value: "SERVICED_APARTMENT" },
  { label: "New / uncompleted project", value: "NEW_PROJECT" },
  { label: "House", value: "HOUSE" },
  { label: "Bungalow", value: "BUNGALOW" },
  { label: "Duplex", value: "DUPLEX" },
  { label: "Detached duplex", value: "DETACHED_DUPLEX" },
  { label: "Semi-detached duplex", value: "SEMI_DETACHED_DUPLEX" },
  { label: "Terrace", value: "TERRACE" },
  { label: "Shop", value: "SHOP" },
  { label: "Office", value: "OFFICE" },
  { label: "Commercial", value: "COMMERCIAL" },
];

const BEDROOMS: Option[] = [
  { label: "Any bedrooms", value: "" },
  { label: "Self-contained", value: "SELF" },
  ...Array.from({ length: 6 }, (_, index) => ({
    label: `${index + 1} bedroom${index ? "s" : ""}`,
    value: String(index + 1),
  })),
];

const HOUSEHOLD_CATEGORIES: Option[] = [
  { label: "Any category", value: "" },
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

const CONDITIONS: Option[] = [
  { label: "Any condition", value: "" },
  { label: "New", value: "NEW" },
  { label: "Like new", value: "LIKE_NEW" },
  { label: "Good", value: "GOOD" },
  { label: "Fair", value: "FAIR" },
  { label: "For parts", value: "FOR_PARTS" },
];

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <>
      <Pressable style={styles.select} onPress={() => setOpen(true)}>
        <Text style={styles.selectText} numberOfLines={1}>
          {selected?.label || label}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.text} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.optionSheet}>
            <Text style={styles.optionTitle}>{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => (
                <Pressable
                  key={option.label}
                  style={styles.option}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                  {option.value === value && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={COLORS.primary}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const requestedType = Array.isArray(params.type)
    ? params.type[0]
    : params.type;
  const type: ListingType | undefined = [
    "PROPERTY",
    "LAND",
    "HOUSEHOLD",
  ].includes(requestedType || "")
    ? (requestedType as ListingType)
    : undefined;
  const [query, setQuery] = useState("");
  const [offerType, setOfferType] = useState<PropertyOfferType>("SALE");
  const [tenure, setTenure] = useState<LandTenure>("SALE");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [searchLocation, setSearchLocation] =
    useState<LocationSuggestion | null>(null);
  const [searchLocationText, setSearchLocationText] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [submitted, setSubmitted] = useState<ListingFilters | null>(null);
  const [searchVersion, setSearchVersion] = useState(0);

  const results = useQuery({
    queryKey: ["category-search", submitted, searchVersion],
    queryFn: () => fetchListings(submitted!),
    enabled: Boolean(submitted),
  });

  const search = () => {
    const selfContained = type === "PROPERTY" && bedrooms === "SELF";
    const parsedMinPrice = minPrice ? parseAmountInput(minPrice) : undefined;
    const parsedMaxPrice = maxPrice ? parseAmountInput(maxPrice) : undefined;
    if (parsedMinPrice !== undefined && parsedMaxPrice !== undefined && parsedMinPrice > parsedMaxPrice) {
      Alert.alert("Check the price range", "Minimum price cannot be greater than maximum price.");
      return;
    }
    setSubmitted({
      type,
      q: [query.trim(), !searchLocation ? searchLocationText.trim() : ""]
        .filter(Boolean)
        .join(" ") || undefined,
      offerType: type === "PROPERTY" ? offerType : undefined,
      tenure: type === "LAND" ? tenure : undefined,
      propertyType:
        type === "PROPERTY"
          ? selfContained
            ? "SELF_CONTAINED"
            : (propertyType as PropertyType) || undefined
          : undefined,
      bedrooms:
        type === "PROPERTY" && bedrooms && !selfContained
          ? Number(bedrooms)
          : undefined,
      category:
        type === "HOUSEHOLD"
          ? (category as HouseholdCategory) || undefined
          : undefined,
      condition:
        type === "HOUSEHOLD"
          ? (condition as HouseholdCondition) || undefined
          : undefined,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      latitude: searchLocation?.latitude,
      longitude: searchLocation?.longitude,
      radiusKm: searchLocation ? radiusKm : undefined,
      limit: 50,
    });
    setSearchVersion((value) => value + 1);
  };

  const title =
    type === "PROPERTY"
      ? "Property search"
      : type === "LAND"
        ? "Land search"
        : type === "HOUSEHOLD"
          ? "Household search"
          : "Search all listings";
  const placeholder =
    type === "PROPERTY"
      ? "Keyword, title or feature"
      : type === "LAND"
        ? "Keyword, title or feature"
        : type === "HOUSEHOLD"
          ? "Search household items"
          : "Search all listings";

  const form = (
    <View style={styles.formWrap}>
      <Text style={styles.title}>{title}</Text>
      {type === "PROPERTY" && (
        <View style={styles.tabs}>
          {(
            [
              ["Buy", "SALE"],
              ["Rent", "RENT"],
              ["Short Let", "SHORT_LET"],
            ] as [string, PropertyOfferType][]
          ).map(([label, value]) => (
            <Pressable
              key={value}
              style={[styles.tab, offerType === value && styles.tabActive]}
              onPress={() => setOfferType(value)}
            >
              <Text
                style={[
                  styles.tabText,
                  offerType === value && styles.tabTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {type === "LAND" && (
        <View style={styles.tabs}>
          {(
            [
              ["Buy", "SALE"],
              ["Lease", "LEASE"],
            ] as [string, LandTenure][]
          ).map(([label, value]) => (
            <Pressable
              key={value}
              style={[styles.tab, tenure === value && styles.tabActive]}
              onPress={() => setTenure(value)}
            >
              <Text
                style={[
                  styles.tabText,
                  tenure === value && styles.tabTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.searchInputWrap}>
        <Ionicons name="search" size={22} color={COLORS.text} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          returnKeyType="search"
          onSubmitEditing={search}
        />
        {query ? <Pressable accessibilityLabel="Clear keyword" onPress={() => setQuery("")}><Ionicons name="close-circle" size={20} color={COLORS.muted} /></Pressable> : null}
      </View>
      <LocationAutocomplete
        label="Search location"
        placeholder="Search any area, city or country"
        selected={searchLocation}
        onSelect={(value) => {
          setSearchLocation(value);
          if (value) setSearchLocationText(value.formattedAddress);
        }}
        onTextChange={setSearchLocationText}
      />
      {searchLocation && (
        <View style={styles.radiusSection}>
          <Text style={styles.filterLabel}>Distance from location</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.radiusOptions}
          >
            {RADIUS_OPTIONS.map((option) => (
              <Pressable
                key={option.km}
                onPress={() => setRadiusKm(option.km)}
                style={[
                  styles.radiusChip,
                  radiusKm === option.km && styles.radiusChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.radiusText,
                    radiusKm === option.km && styles.radiusTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {type === "PROPERTY" && (
        <View style={styles.grid}>
          <SelectField
            label="Property type"
            value={propertyType}
            options={PROPERTY_TYPES}
            onChange={setPropertyType}
          />
          <SelectField
            label="Bedrooms"
            value={bedrooms}
            options={BEDROOMS}
            onChange={setBedrooms}
          />
        </View>
      )}
      {type === "HOUSEHOLD" && (
        <View style={styles.grid}>
          <SelectField
            label="Category"
            value={category}
            options={HOUSEHOLD_CATEGORIES}
            onChange={setCategory}
          />
          <SelectField
            label="Condition"
            value={condition}
            options={CONDITIONS}
            onChange={setCondition}
          />
        </View>
      )}
      <View style={styles.grid}>
        <View style={styles.priceInputWrap}><TextInput style={styles.priceInput} value={minPrice} onChangeText={(value) => setMinPrice(formatAmountInput(value))} placeholder="Min. price (₦)" placeholderTextColor={COLORS.muted} keyboardType="numeric" />{minPrice ? <Pressable accessibilityLabel="Clear minimum price" onPress={() => setMinPrice("")}><Ionicons name="close-circle" size={19} color={COLORS.muted} /></Pressable> : null}</View>
        <View style={styles.priceInputWrap}><TextInput style={styles.priceInput} value={maxPrice} onChangeText={(value) => setMaxPrice(formatAmountInput(value))} placeholder="Max. price (₦)" placeholderTextColor={COLORS.muted} keyboardType="numeric" />{maxPrice ? <Pressable accessibilityLabel="Clear maximum price" onPress={() => setMaxPrice("")}><Ionicons name="close-circle" size={19} color={COLORS.muted} /></Pressable> : null}</View>
      </View>
      <Button label="Search" onPress={search} loading={results.isFetching} />
      {submitted && (
        <Text style={styles.resultTitle}>
          {results.data?.total ?? 0} result
          {results.data?.total === 1 ? "" : "s"}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={results.data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={form}
        refreshing={results.isRefetching}
        onRefresh={submitted ? results.refetch : undefined}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            fullWidth
            showAgencyFee={type === "PROPERTY"}
            showPropertyMeta={type === "PROPERTY"}
            locationLabel={locationLabel(item)}
            onPress={() => router.push(`/listing/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          submitted && !results.isFetching ? (
            <Text style={styles.empty}>
              No matching listings found. Try changing the filters.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12 },
  formWrap: { gap: 16, paddingBottom: 10 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.muted, fontSize: 16, fontWeight: "600" },
  tabTextActive: { color: COLORS.text },
  searchInputWrap: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 15,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },
  grid: { flexDirection: "row", gap: 12 },
  radiusSection: { gap: 8 },
  filterLabel: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  radiusOptions: { gap: 8 },
  radiusChip: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  radiusChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  radiusText: { color: COLORS.text, fontSize: 13 },
  radiusTextActive: { color: "#FFFFFF", fontWeight: "800" },
  select: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  selectText: { flex: 1, color: COLORS.text, fontSize: 14 },
  priceInput: {
    flex: 1,
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 4,
    paddingVertical: 14,
    fontSize: 14,
  },
  priceInputWrap: { flex: 1, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#00000099",
  },
  optionSheet: {
    maxHeight: "75%",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
  },
  optionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  optionText: { color: COLORS.text, fontSize: 15 },
  resultTitle: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 16,
    marginTop: 4,
  },
  empty: { color: COLORS.muted, paddingVertical: 24, textAlign: "center" },
});
