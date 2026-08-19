import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants";
import type { Listing } from "../types";
import { getAgencyFee } from "../utils/currency";

interface ListingCardProps {
  listing: Listing;
  locationLabel: string;
  isFavorite?: boolean;
  onPress: () => void;
  onToggleFavorite?: () => void;
  fullWidth?: boolean;
  showAgencyFee?: boolean;
  showPropertyMeta?: boolean;
}

export function ListingCard({
  listing,
  locationLabel,
  isFavorite,
  onPress,
  onToggleFavorite,
  fullWidth,
  showAgencyFee = false,
  showPropertyMeta = false,
}: ListingCardProps) {
  const mainImage = listing.images[0]?.url;
  const agencyFee = getAgencyFee(listing);
  const offerLabel =
    listing.propertyDetails?.offerType === "SALE"
      ? "For Sale"
      : listing.propertyDetails?.offerType === "SHORT_LET"
        ? "Short Let"
        : "For Rent";

  return (
    <Pressable
      style={[styles.card, fullWidth && styles.fullWidth]}
      onPress={onPress}
    >
      <View style={styles.imageWrapper}>
        {mainImage ? (
          <Image
            source={{ uri: mainImage }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        {showPropertyMeta && listing.propertyDetails && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>{offerLabel}</Text>
          </View>
        )}
        {onToggleFavorite && (
          <Pressable
            style={styles.favoriteButton}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? COLORS.danger : COLORS.text}
            />
          </Pressable>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={styles.price}>₦{listing.price.toLocaleString()}</Text>
        {showAgencyFee && agencyFee > 0 && (
          <Text style={styles.fee} numberOfLines={1}>
            Agent fee: ₦{agencyFee.toLocaleString()}
            {listing.propertyDetails?.agencyFeeType === "PERCENTAGE"
              ? ` (${Number(listing.propertyDetails.agencyFee)}%)`
              : ""}
          </Text>
        )}
        <Text style={styles.location} numberOfLines={1}>
          {locationLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  fullWidth: { width: "100%" },
  imageWrapper: {
    width: "100%",
    height: 140,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    backgroundColor: COLORS.surface,
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#050A18DD",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 6,
  },
  offerBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: COLORS.primary,
  },
  offerText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  body: {
    padding: 10,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  fee: { color: COLORS.text, fontSize: 12 },
  location: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
