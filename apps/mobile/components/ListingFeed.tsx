import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS } from "../constants";
import { fetchListings, type ListingFilters } from "../services/listings";
import type {
  HouseholdCategory,
  LandTenure,
  Listing,
  ListingType,
  PropertyType,
  PropertyOfferType,
} from "../types";
import { ListingCard } from "./ListingCard";
import { fetchFavorites, toggleFavorite } from "../services/listings";
import { useAuth } from "../hooks/useAuth";

export function ListingFeed({
  type,
  query,
  propertyType,
  category,
  tenure,
  offerType,
  bedrooms,
  showAgencyFee = false,
  showPropertyMeta = false,
  horizontal = false,
  filters,
}: {
  type?: ListingType;
  query?: string;
  propertyType?: PropertyType;
  category?: HouseholdCategory;
  tenure?: LandTenure;
  offerType?: PropertyOfferType;
  bedrooms?: number;
  showAgencyFee?: boolean;
  showPropertyMeta?: boolean;
  horizontal?: boolean;
  filters?: ListingFilters | null;
}) {
  const { isAuthenticated } = useAuth();
  const result = useQuery({
    queryKey: [
      "listings",
      type,
      query,
      propertyType,
      category,
      tenure,
      offerType,
      bedrooms,
      filters,
    ],
    queryFn: () =>
      fetchListings({
        ...filters,
        type: type ?? filters?.type,
        q: query ?? filters?.q,
        propertyType: propertyType ?? filters?.propertyType,
        category: category ?? filters?.category,
        tenure: tenure ?? filters?.tenure,
        offerType: offerType ?? filters?.offerType,
        bedrooms: bedrooms ?? filters?.bedrooms,
        limit: 30,
        latitude: filters?.latitude,
        longitude: filters?.longitude,
        radiusKm: filters?.radiusKm,
      }),
    staleTime: 30_000,
  });
  const client = useQueryClient();
  const favorites = useQuery({
    queryKey: ["favorites"],
    queryFn: fetchFavorites,
    enabled: isAuthenticated,
  });
  const favoriteMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleFavorite(id, enabled),
    onSuccess: () => client.invalidateQueries({ queryKey: ["favorites"] }),
  });
  if (result.isLoading) return <ListingSkeleton horizontal={horizontal} />;
  if (result.isError)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Connection lost. Tap to reconnect"
        style={[styles.connectionCard, horizontal && styles.connectionHorizontal]}
        onPress={() => result.refetch()}
      >
        <Ionicons name="cloud-offline-outline" size={25} color={COLORS.danger} />
        <View style={styles.connectionText}>
          <Text style={styles.connectionTitle}>Connection lost</Text>
          <Text style={styles.connectionAction}>Tap to reconnect</Text>
        </View>
        <Ionicons name="refresh" size={21} color={COLORS.primary} />
      </Pressable>
    );
  return (
    <FlatList
      data={result.data?.items ?? []}
      keyExtractor={(item) => item.id}
      horizontal={horizontal}
      showsHorizontalScrollIndicator={false}
      refreshing={!horizontal && result.isRefetching}
      onRefresh={horizontal ? undefined : result.refetch}
      contentContainerStyle={horizontal ? styles.row : styles.list}
      ListEmptyComponent={
        <Text style={styles.message}>
          No listings found yet. Pull down to refresh.
        </Text>
      }
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          showAgencyFee={showAgencyFee}
          showPropertyMeta={showPropertyMeta}
          fullWidth={!horizontal}
          locationLabel={locationLabel(item)}
          onPress={() => router.push(`/listing/${item.id}`)}
          onToggleFavorite={
            isAuthenticated
              ? () =>
                  favoriteMutation.mutate({
                    id: item.id,
                    enabled: !favorites.data?.some(
                      (favorite) => favorite.id === item.id,
                    ),
                  })
              : undefined
          }
          isFavorite={favorites.data?.some(
            (favorite) => favorite.id === item.id,
          )}
        />
      )}
    />
  );
}

function ListingSkeleton({ horizontal }: { horizontal: boolean }) {
  return (
    <View style={horizontal ? styles.skeletonRow : styles.skeletonList}>
      {Array.from({ length: horizontal ? 3 : 4 }, (_, index) => (
        <View
          key={index}
          style={[styles.skeletonCard, !horizontal && styles.skeletonFull]}
        >
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonBody}>
            <View style={[styles.skeletonLine, { width: "78%" }]} />
            <View style={[styles.skeletonLine, { width: "48%" }]} />
            <View style={[styles.skeletonLine, { width: "64%" }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export const locationLabel = (listing: Listing) =>
  listing.formattedAddress ||
  [listing.area?.name, listing.city?.name, listing.state?.name]
    .filter(Boolean)
    .join(", ") ||
  "Location not provided";
const styles = StyleSheet.create({
  message: { color: COLORS.muted, paddingHorizontal: 16, paddingVertical: 18 },
  connectionCard: {
    margin: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  connectionHorizontal: { width: 280 },
  connectionText: { flex: 1 },
  connectionTitle: { color: COLORS.text, fontWeight: "800", fontSize: 15 },
  connectionAction: { color: COLORS.primary, fontSize: 12, marginTop: 2 },
  row: { gap: 12, paddingHorizontal: 16 },
  list: { gap: 12, padding: 16 },
  skeletonRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16 },
  skeletonList: { gap: 12, padding: 16 },
  skeletonCard: {
    width: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  skeletonFull: { width: "100%" },
  skeletonImage: { height: 140, backgroundColor: COLORS.surfaceElevated },
  skeletonBody: { padding: 10, gap: 8 },
  skeletonLine: {
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceElevated,
  },
});
