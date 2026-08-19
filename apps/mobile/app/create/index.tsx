import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../../components/Button";
import { LocationAutocomplete } from "../../components/LocationAutocomplete";
import { COLORS } from "../../constants";
import { useAuth } from "../../hooks/useAuth";
import {
  createListing,
  fetchListing,
  updateListing,
  uploadImage,
} from "../../services/listings";
import type {
  AgencyFeeType,
  HouseholdCategory,
  HouseholdCondition,
  LandTenure,
  ListingType,
  MeasurementUnit,
  LocationSuggestion,
  PropertyOfferType,
  PropertyType,
  RentPeriod,
} from "../../types";
import { formatAmountInput, parseAmountInput } from "../../utils/currency";
import { getApiErrorMessage } from "../../utils/errors";

const TYPES: { label: string; value: ListingType }[] = [
  { label: "Property", value: "PROPERTY" },
  { label: "Land", value: "LAND" },
  { label: "Household", value: "HOUSEHOLD" },
];
const PROPERTY_TYPES: { label: string; value: PropertyType }[] = [
  { label: "Apartment", value: "APARTMENT" },
  { label: "Flat", value: "FLAT" },
  { label: "Self-contained", value: "SELF_CONTAINED" },
  { label: "Short let", value: "SHORT_LET" },
  { label: "Serviced apartment", value: "SERVICED_APARTMENT" },
  { label: "New project / uncompleted", value: "NEW_PROJECT" },
  { label: "House", value: "HOUSE" },
  { label: "Bungalow", value: "BUNGALOW" },
  { label: "Duplex", value: "DUPLEX" },
  { label: "Detached duplex", value: "DETACHED_DUPLEX" },
  { label: "Semi-detached", value: "SEMI_DETACHED_DUPLEX" },
  { label: "Terrace", value: "TERRACE" },
  { label: "Shop", value: "SHOP" },
  { label: "Office", value: "OFFICE" },
  { label: "Commercial", value: "COMMERCIAL" },
  { label: "Other", value: "OTHER" },
];
const OFFER_TYPES: { label: string; value: PropertyOfferType }[] = [
  { label: "For rent", value: "RENT" },
  { label: "Short let", value: "SHORT_LET" },
  { label: "For sale", value: "SALE" },
];
const RENT_PERIODS: { label: string; value: RentPeriod }[] = [
  { label: "Monthly", value: "MONTHLY" },
  { label: "Quarterly", value: "QUARTERLY" },
  { label: "6 months", value: "BIANNUALLY" },
  { label: "Yearly", value: "ANNUALLY" },
];
const HOUSEHOLD_CATEGORIES: { label: string; value: HouseholdCategory }[] = [
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

function ChoiceField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text
                style={[
                  styles.choiceText,
                  selected && styles.choiceTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          style={styles.stepButton}
          onPress={() => onChange(Math.max(0, value - 1))}
        >
          <Ionicons name="remove" size={18} color={COLORS.text} />
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable
          style={styles.stepButton}
          onPress={() => onChange(Math.min(24, value + 1))}
        >
          <Ionicons name="add" size={18} color={COLORS.text} />
        </Pressable>
      </View>
    </View>
  );
}

export default function CreateListingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const listingId = Array.isArray(id) ? id[0] : id;
  const isEditing = Boolean(listingId);
  const navigation = useNavigation();
  const { isAuthenticated, isHydrated } = useAuth();
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const existing = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => fetchListing(listingId!),
    enabled: isEditing,
  });

  const [type, setType] = useState<ListingType>("PROPERTY");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [propertyType, setPropertyType] = useState<PropertyType>("APARTMENT");
  const [offerType, setOfferType] = useState<PropertyOfferType>("RENT");
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>("ANNUALLY");
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [toilets, setToilets] = useState(1);
  const [parking, setParking] = useState(0);
  const [isFurnished, setIsFurnished] = useState(false);
  const [agencyFeeType, setAgencyFeeType] = useState<AgencyFeeType>("FLAT");
  const [agencyFee, setAgencyFee] = useState("");
  const [landTenure, setLandTenure] = useState<LandTenure>("SALE");
  const [landSize, setLandSize] = useState("1");
  const [measurementUnit, setMeasurementUnit] =
    useState<MeasurementUnit>("PLOT");
  const [numberOfPlots, setNumberOfPlots] = useState("1");
  const [householdCategory, setHouseholdCategory] =
    useState<HouseholdCategory>("OTHER");
  const [householdCondition, setHouseholdCondition] =
    useState<HouseholdCondition>("GOOD");

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? "Edit listing" : "Create listing",
    });
  }, [isEditing, navigation]);
  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.replace("/auth/login");
  }, [isAuthenticated, isHydrated]);
  useEffect(() => {
    const listing = existing.data;
    if (!listing || initialized.current) return;
    initialized.current = true;
    setType(listing.type);
    setTitle(listing.title);
    setDescription(listing.description);
    setPrice(formatAmountInput(listing.price));
    if (listing.latitude != null && listing.longitude != null) {
      setSelectedLocation({
        id: listing.locationPlaceId || listing.id,
        provider: "GEOAPIFY",
        formattedAddress:
          listing.formattedAddress ||
          [listing.area?.name, listing.city?.name, listing.state?.name, listing.country?.name]
            .filter(Boolean)
            .join(", "),
        countryName: listing.country?.name || "Unknown",
        countryCode: listing.country?.code || "XX",
        stateName: listing.state?.name || listing.country?.name || "Unknown",
        cityName: listing.city?.name || listing.state?.name || "Unknown",
        areaName: listing.area?.name || undefined,
        latitude: listing.latitude,
        longitude: listing.longitude,
      });
    }
    setPhotos(listing.images.map((image) => image.url));
    if (listing.propertyDetails) {
      setPropertyType(listing.propertyDetails.propertyType);
      setOfferType(listing.propertyDetails.offerType || "RENT");
      setRentPeriod(listing.propertyDetails.rentPeriod);
      setBedrooms(listing.propertyDetails.bedrooms ?? 0);
      setBathrooms(listing.propertyDetails.bathrooms ?? 0);
      setToilets(listing.propertyDetails.toilets ?? 0);
      setParking(listing.propertyDetails.parking ?? 0);
      setIsFurnished(listing.propertyDetails.isFurnished);
      setAgencyFeeType(listing.propertyDetails.agencyFeeType || "FLAT");
      setAgencyFee(
        listing.propertyDetails.agencyFeeType === "PERCENTAGE"
          ? String(Number(listing.propertyDetails.agencyFee || 0))
          : formatAmountInput(listing.propertyDetails.agencyFee || 0),
      );
    }
    if (listing.landDetails) {
      setLandTenure(listing.landDetails.tenure);
      setLandSize(String(listing.landDetails.landSize));
      setMeasurementUnit(listing.landDetails.measurementUnit);
      setNumberOfPlots(String(listing.landDetails.numberOfPlots ?? 1));
    }
    if (listing.householdDetails) {
      setHouseholdCategory(listing.householdDetails.category);
      setHouseholdCondition(listing.householdDetails.condition);
    }
  }, [existing.data]);

  const pickPhotos = async () => {
    if (photos.length >= 5) {
      Alert.alert("Photo limit", "You can add up to five photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.75,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled)
      setPhotos((current) =>
        [...current, ...result.assets.map((asset) => asset.uri)].slice(0, 5),
      );
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const images = await Promise.all(
        photos.map((uri) => (uri.startsWith("http") ? uri : uploadImage(uri))),
      );
      const details =
        type === "PROPERTY"
          ? {
              propertyDetails: {
                propertyType,
                offerType,
                rentPeriod,
                bedrooms,
                bathrooms,
                toilets,
                parking,
                isFurnished,
                agencyFeeType,
                agencyFee:
                  agencyFeeType === "PERCENTAGE"
                    ? Number(agencyFee)
                    : parseAmountInput(agencyFee),
              },
            }
          : type === "LAND"
            ? {
                landDetails: {
                  tenure: landTenure,
                  landSize: Number(landSize),
                  numberOfPlots: Number(numberOfPlots) || undefined,
                  measurementUnit,
                },
              }
            : {
                householdDetails: {
                  category: householdCategory,
                  condition: householdCondition,
                },
              };
      const input = {
        type,
        title: title.trim(),
        description: description.trim(),
        price: parseAmountInput(price),
        countryName: selectedLocation?.countryName,
        countryCode: selectedLocation?.countryCode,
        stateName: selectedLocation?.stateName,
        cityName: selectedLocation?.cityName,
        areaName: selectedLocation?.areaName,
        latitude: selectedLocation?.latitude,
        longitude: selectedLocation?.longitude,
        formattedAddress: selectedLocation?.formattedAddress,
        locationProvider: selectedLocation?.provider,
        locationPlaceId: selectedLocation?.id,
        images,
        ...details,
      };
      return isEditing
        ? updateListing(listingId!, input)
        : createListing(input);
    },
    onSuccess: async (listing) => {
      queryClient.setQueryData(["listing", listing.id], listing);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["listings"] }),
        queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
      ]);
      Alert.alert(
        isEditing ? "Changes saved" : "Published",
        isEditing
          ? "Your listing has been updated."
          : "Your listing is now live.",
      );
      router.replace("/my-listings");
    },
    onError: (error: unknown) =>
      Alert.alert(
        isEditing ? "Could not save changes" : "Could not publish",
        getApiErrorMessage(error, "Please check your details."),
      ),
  });

  if (isEditing && existing.isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  if (isEditing && existing.isError)
    return (
      <View style={styles.center}>
        <Text style={styles.note}>This listing could not be loaded.</Text>
      </View>
    );
  const isInvalid =
    !title.trim() ||
    !description.trim() ||
    !parseAmountInput(price) ||
    !selectedLocation ||
    (type === "PROPERTY" &&
      agencyFeeType === "PERCENTAGE" &&
      Number(agencyFee) > 100) ||
    (type === "LAND" && !Number(landSize));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>What are you listing?</Text>
      <View style={styles.typeRow}>
        {TYPES.map((item) => {
          const selected = type === item.value;
          return (
            <Pressable
              key={item.value}
              disabled={isEditing}
              onPress={() => setType(item.value)}
              style={[
                styles.type,
                selected && styles.typeActive,
                isEditing && !selected && styles.disabledType,
              ]}
            >
              <Text
                style={[styles.typeText, selected && styles.typeTextActive]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>Basic information</Text>
      <TextInput
        style={styles.input}
        placeholder="Listing title"
        placeholderTextColor={COLORS.muted}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Describe the listing and its key features"
        placeholderTextColor={COLORS.muted}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Price (₦)"
        placeholderTextColor={COLORS.muted}
        value={price}
        onChangeText={(value) => setPrice(formatAmountInput(value))}
        keyboardType="numeric"
      />
      <LocationAutocomplete
        label="Listing location"
        selected={selectedLocation}
        onSelect={setSelectedLocation}
        required
      />

      {type === "PROPERTY" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property details</Text>
          <ChoiceField
            label="Property type"
            options={PROPERTY_TYPES}
            value={propertyType}
            onChange={setPropertyType}
          />
          <ChoiceField
            label="Listing purpose"
            options={OFFER_TYPES}
            value={offerType}
            onChange={setOfferType}
          />
          <Text style={styles.label}>Bedrooms</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.numberChoices}
          >
            {Array.from({ length: 24 }, (_, index) => index + 1).map(
              (number) => (
                <Pressable
                  key={number}
                  onPress={() => setBedrooms(number)}
                  style={[
                    styles.numberChoice,
                    bedrooms === number && styles.choiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      bedrooms === number && styles.choiceTextSelected,
                    ]}
                  >
                    {number}
                  </Text>
                </Pressable>
              ),
            )}
          </ScrollView>
          <View style={styles.numberGrid}>
            <NumberField
              label="Bathrooms"
              value={bathrooms}
              onChange={setBathrooms}
            />
            <NumberField
              label="Toilets"
              value={toilets}
              onChange={setToilets}
            />
            <NumberField
              label="Parking spaces"
              value={parking}
              onChange={setParking}
            />
          </View>
          {offerType !== "SALE" && (
            <ChoiceField
              label={
                offerType === "SHORT_LET" ? "Booking period" : "Rent period"
              }
              options={RENT_PERIODS}
              value={rentPeriod}
              onChange={setRentPeriod}
            />
          )}
          <ChoiceField
            label="Furnished"
            options={[
              { label: "No", value: "no" },
              { label: "Yes", value: "yes" },
            ]}
            value={isFurnished ? "yes" : "no"}
            onChange={(value) => setIsFurnished(value === "yes")}
          />
          <ChoiceField
            label="Agent fee"
            options={[
              { label: "Flat amount", value: "FLAT" },
              { label: "Percentage (%)", value: "PERCENTAGE" },
            ]}
            value={agencyFeeType}
            onChange={(value) => {
              setAgencyFeeType(value);
              setAgencyFee("");
            }}
          />
          <View style={styles.feeInputWrap}>
            {agencyFeeType === "FLAT" && (
              <Text style={styles.inputAffix}>₦</Text>
            )}
            <TextInput
              style={styles.feeInput}
              placeholder={
                agencyFeeType === "FLAT"
                  ? "Agent fee amount"
                  : "Percentage, e.g. 5"
              }
              placeholderTextColor={COLORS.muted}
              value={agencyFee}
              onChangeText={(value) =>
                setAgencyFee(
                  agencyFeeType === "FLAT"
                    ? formatAmountInput(value)
                    : value.replace(/[^0-9.]/g, "").slice(0, 5),
                )
              }
              keyboardType="decimal-pad"
            />
            {agencyFeeType === "PERCENTAGE" && (
              <Text style={styles.inputAffix}>%</Text>
            )}
          </View>
          {agencyFeeType === "PERCENTAGE" && Number(agencyFee) > 100 && (
            <Text style={styles.errorText}>
              Percentage cannot be more than 100%.
            </Text>
          )}
        </View>
      )}

      {type === "LAND" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Land details</Text>
          <ChoiceField
            label="Offer type"
            options={[
              { label: "For sale", value: "SALE" },
              { label: "For lease", value: "LEASE" },
            ]}
            value={landTenure}
            onChange={setLandTenure}
          />
          <TextInput
            style={styles.input}
            placeholder="Land size"
            placeholderTextColor={COLORS.muted}
            value={landSize}
            onChangeText={setLandSize}
            keyboardType="numeric"
          />
          <ChoiceField
            label="Measurement"
            options={[
              { label: "Plot", value: "PLOT" },
              { label: "Square metre", value: "SQM" },
              { label: "Square foot", value: "SQFT" },
              { label: "Acre", value: "ACRE" },
              { label: "Hectare", value: "HECTARE" },
            ]}
            value={measurementUnit}
            onChange={setMeasurementUnit}
          />
          <TextInput
            style={styles.input}
            placeholder="Number of plots"
            placeholderTextColor={COLORS.muted}
            value={numberOfPlots}
            onChangeText={setNumberOfPlots}
            keyboardType="numeric"
          />
        </View>
      )}

      {type === "HOUSEHOLD" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item details</Text>
          <ChoiceField
            label="Category"
            options={HOUSEHOLD_CATEGORIES}
            value={householdCategory}
            onChange={setHouseholdCategory}
          />
          <ChoiceField
            label="Condition"
            options={[
              { label: "New", value: "NEW" },
              { label: "Like new", value: "LIKE_NEW" },
              { label: "Good", value: "GOOD" },
              { label: "Fair", value: "FAIR" },
              { label: "For parts", value: "FOR_PARTS" },
            ]}
            value={householdCondition}
            onChange={setHouseholdCondition}
          />
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.photoHeading}>
          <View>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.note}>
              Up to 5. The first photo is the search cover.
            </Text>
          </View>
          <Text style={styles.photoCount}>{photos.length}/5</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoList}
        >
          {photos.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.photoItem}>
              <Image source={{ uri }} style={styles.photo} contentFit="cover" />
              {index === 0 && <Text style={styles.coverBadge}>Cover</Text>}
              <Pressable
                style={styles.removePhoto}
                onPress={() =>
                  setPhotos((current) =>
                    current.filter((_, photoIndex) => photoIndex !== index),
                  )
                }
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
          {photos.length < 5 && (
            <Pressable style={styles.addPhoto} onPress={pickPhotos}>
              <Ionicons name="camera-outline" size={26} color={COLORS.text} />
              <Text style={styles.addPhotoText}>Add photos</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
      <Text style={styles.note}>
        Listings appear publicly as soon as they are published.
      </Text>
      <Button
        label={isEditing ? "Save changes" : "Publish listing"}
        loading={mutation.isPending}
        disabled={isInvalid}
        onPress={() => mutation.mutate()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  heading: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  label: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  typeRow: { flexDirection: "row", gap: 8 },
  type: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  disabledType: { opacity: 0.45 },
  typeText: { color: COLORS.text, fontWeight: "700" },
  typeTextActive: { color: "#FFFFFF" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
  },
  feeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 12,
  },
  feeInput: { flex: 1, color: COLORS.text, paddingVertical: 13, fontSize: 15 },
  inputAffix: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginHorizontal: 4,
  },
  errorText: { color: COLORS.danger, fontSize: 12 },
  multiline: { minHeight: 120, textAlignVertical: "top" },
  section: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800" },
  fieldGroup: { gap: 9 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
  },
  choiceSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  choiceText: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  choiceTextSelected: { color: "#FFFFFF" },
  numberChoices: { gap: 8, paddingRight: 8 },
  numberChoice: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
  },
  numberGrid: { gap: 10 },
  numberField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    overflow: "hidden",
  },
  stepButton: {
    width: 40,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceElevated,
  },
  stepValue: {
    minWidth: 42,
    textAlign: "center",
    color: COLORS.text,
    fontWeight: "800",
  },
  photoHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  photoCount: { color: COLORS.text, fontWeight: "700" },
  photoList: { gap: 10 },
  photoItem: {
    width: 112,
    height: 92,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceElevated,
  },
  photo: { width: "100%", height: "100%" },
  coverBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    color: "#FFFFFF",
    backgroundColor: COLORS.primary,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "800",
  },
  removePhoto: {
    position: "absolute",
    right: 5,
    top: 5,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D1117DD",
  },
  addPhoto: {
    width: 112,
    height: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: COLORS.surfaceElevated,
  },
  addPhotoText: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  note: { color: COLORS.muted, lineHeight: 19 },
});
