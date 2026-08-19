import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import * as DeviceLocation from "expo-location";
import { useState } from "react";
import {
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
import { COLORS } from "../constants";
import type { ListingFilters } from "../services/listings";
import type {
  HouseholdCategory,
  HouseholdCondition,
  LandTenure,
  ListingType,
  LocationSuggestion,
  PropertyOfferType,
  PropertyType,
} from "../types";
import { formatAmountInput, parseAmountInput } from "../utils/currency";
import { Button } from "./Button";
import { LocationAutocomplete } from "./LocationAutocomplete";

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
  { label: "Other", value: "OTHER" },
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
        <Ionicons name="chevron-down" size={17} color={COLORS.text} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.optionBackdrop} onPress={() => setOpen(false)}>
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

export function SearchOverlay({
  visible,
  type,
  onClose,
  onSearch,
}: {
  visible: boolean;
  type?: ListingType;
  onClose: () => void;
  onSearch: (filters: ListingFilters) => void;
}) {
  const [query, setQuery] = useState("");
  const [offerType, setOfferType] = useState<PropertyOfferType>("SALE");
  const [tenure, setTenure] = useState<LandTenure>("SALE");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState<LocationSuggestion | null>(null);
  const [radiusKm, setRadiusKm] = useState(0);
  const [locating, setLocating] = useState(false);

  const title =
    type === "PROPERTY"
      ? "Search properties"
      : type === "LAND"
        ? "Search land"
        : type === "HOUSEHOLD"
          ? "Search household finds"
          : "Search Find Am";

  const submit = () => {
    const selfContained = type === "PROPERTY" && bedrooms === "SELF";
    onSearch({
      type,
      q: query.trim() || undefined,
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
      minPrice: minPrice ? parseAmountInput(minPrice) : undefined,
      maxPrice: maxPrice ? parseAmountInput(maxPrice) : undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
      radiusKm: location && radiusKm > 0 ? radiusKm : undefined,
      limit: 50,
    });
    onClose();
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission =
        await DeviceLocation.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Location remains off",
          "You can still type and select any location without enabling phone location.",
        );
        return;
      }

      const current = await DeviceLocation.getCurrentPositionAsync({
        accuracy: DeviceLocation.Accuracy.Balanced,
      });
      const latitude = current.coords.latitude;
      const longitude = current.coords.longitude;
      const [address] = await DeviceLocation.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const addressParts = [
        address?.name,
        address?.street,
        address?.district,
        address?.city,
        address?.region,
        address?.country,
      ].filter((part): part is string => Boolean(part));
      const formattedAddress =
        [...new Set(addressParts)].join(", ") ||
        `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      setLocation({
        id: `device:${latitude},${longitude}`,
        provider: "DEVICE",
        formattedAddress,
        name: address?.name || address?.city || "Current location",
        countryName: address?.country || "Current location",
        countryCode: address?.isoCountryCode || "XX",
        stateName: address?.region || address?.country || "Current location",
        cityName:
          address?.city || address?.subregion || address?.region || "Current location",
        areaName: address?.district || address?.subregion || undefined,
        postcode: address?.postalCode || undefined,
        latitude,
        longitude,
        resultType: "device",
      });
    } catch {
      Alert.alert(
        "Location unavailable",
        "Check that phone location is switched on, or select a location manually.",
      );
    } finally {
      setLocating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView style={styles.sheet} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Results will appear on this page</Text>
            </View>
            <Pressable
              accessibilityLabel="Close search"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.form}
          >
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
              <Ionicons name="search" size={21} color={COLORS.muted} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Keyword, title or feature"
                placeholderTextColor={COLORS.muted}
                returnKeyType="search"
                onSubmitEditing={submit}
                autoFocus
              />
            </View>

            <LocationAutocomplete
              label="Location"
              placeholder="Search any area, city or country"
              selected={location}
              onSelect={setLocation}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use my current location"
              disabled={locating}
              style={[styles.currentLocationButton, locating && styles.disabled]}
              onPress={useCurrentLocation}
            >
              <Ionicons
                name="navigate-outline"
                size={19}
                color={COLORS.primary}
              />
              <Text style={styles.currentLocationText}>
                {locating ? "Finding your location…" : "Use my current location"}
              </Text>
            </Pressable>

            {!location && (
              <Text style={styles.locationHint}>
                Select a location to choose a search distance. Phone location
                stays off unless you use the button above.
              </Text>
            )}

            {location && (
              <View style={styles.radiusSection}>
                <View style={styles.radiusHeader}>
                  <Text style={styles.filterLabel}>Distance from location</Text>
                  <Text style={styles.radiusValue}>
                    {radiusKm === 0
                      ? "Any distance"
                      : `${radiusKm.toFixed(1)} km`}
                  </Text>
                </View>
                <Slider
                  minimumValue={0}
                  maximumValue={20}
                  step={0.5}
                  value={radiusKm}
                  onValueChange={setRadiusKm}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.primary}
                  accessibilityLabel="Search radius"
                />
                <View style={styles.radiusLabels}>
                  <Text style={styles.radiusLimit}>0 km</Text>
                  <Text style={styles.radiusLimit}>20 km</Text>
                </View>
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
              <TextInput
                style={styles.priceInput}
                value={minPrice}
                onChangeText={(value) => setMinPrice(formatAmountInput(value))}
                placeholder="Min. price (₦)"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.priceInput}
                value={maxPrice}
                onChangeText={(value) => setMaxPrice(formatAmountInput(value))}
                placeholder="Max. price (₦)"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
              />
            </View>

            <Button label="Show results" onPress={submit} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#02061799",
    justifyContent: "flex-start",
  },
  sheet: {
    alignSelf: "stretch",
    maxHeight: "94%",
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
    overflow: "hidden",
  },
  headerCopy: { flex: 1, paddingRight: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  title: { color: COLORS.text, fontSize: 21, fontWeight: "800" },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  form: { padding: 18, gap: 16, paddingBottom: 30 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.muted, fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: COLORS.text },
  searchInputWrap: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },
  currentLocationButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  currentLocationText: { color: COLORS.primary, fontWeight: "700" },
  locationHint: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  disabled: { opacity: 0.55 },
  radiusSection: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    padding: 12,
  },
  radiusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterLabel: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  radiusValue: { color: COLORS.primary, fontWeight: "800" },
  radiusLabels: { flexDirection: "row", justifyContent: "space-between" },
  radiusLimit: { color: COLORS.muted, fontSize: 11 },
  grid: { flexDirection: "row", gap: 12 },
  select: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  selectText: { flex: 1, color: COLORS.text, fontSize: 13 },
  priceInput: {
    flex: 1,
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 4,
    paddingVertical: 14,
    fontSize: 13,
  },
  optionBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#00000099",
  },
  optionSheet: {
    maxHeight: "75%",
    backgroundColor: COLORS.surfaceElevated,
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
});
