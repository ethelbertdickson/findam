import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ListingCard } from "../../components/ListingCard";
import { locationLabel } from "../../components/ListingFeed";
import { COLORS } from "../../constants";
import { fetchMyListings } from "../../services/listings";
import { fetchMyRequests, type UserRequest } from "../../services/requests";
import { fetchMyProfessional } from "../../services/professionals";
import { fetchMyServices } from "../../services/services";
import type { ListingType } from "../../types";

type MyContentType = "ALL" | ListingType | "PROFESSIONAL" | "REQUEST";

const LISTING_TYPES: { label: string; value: MyContentType }[] = [
  { label: "All", value: "ALL" },
  { label: "Property", value: "PROPERTY" },
  { label: "Land", value: "LAND" },
  { label: "Household", value: "HOUSEHOLD" },
  { label: "Professional", value: "PROFESSIONAL" },
  { label: "What I need", value: "REQUEST" },
];
const RECENCY: { label: string; days?: number }[] = [
  { label: "Any time" },
  { label: "Past week", days: 7 },
  { label: "Past month", days: 30 },
];

export default function MyListingsScreen() {
  const [searchText, setSearchText] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [contentType, setContentType] = React.useState<MyContentType>("ALL");
  const [days, setDays] = React.useState<number | undefined>();
  const type = ["PROPERTY", "LAND", "HOUSEHOLD"].includes(contentType)
    ? (contentType as ListingType)
    : undefined;
  const result = useQuery({
    queryKey: ["my-listings", query, type, days],
    queryFn: () => fetchMyListings({
      q: query || undefined,
      type,
      createdAfter: days
        ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    }),
  });
  const requests = useQuery({ queryKey: ["my-requests"], queryFn: fetchMyRequests });
  const professional = useQuery({ queryKey: ["my-professional"], queryFn: fetchMyProfessional, retry: false });
  const services = useQuery({ queryKey: ["my-services"], queryFn: fetchMyServices });
  const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : undefined;
  const matches = (text: string, createdAt?: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    return (!normalizedQuery || text.toLowerCase().includes(normalizedQuery)) &&
      (cutoff === undefined || (createdAt ? new Date(createdAt).getTime() >= cutoff : false));
  };
  const showListings = contentType === "ALL" || type !== undefined;
  // Keep the view correct even while an older API instance is being rolled out;
  // the server still receives the same type filter for efficient querying.
  const visibleListings = (result.data || []).filter((listing) => !type || listing.type === type);
  const showProfessional = contentType === "ALL" || contentType === "PROFESSIONAL";
  const showRequests = contentType === "ALL" || contentType === "REQUEST";
  const filteredProfessional = professional.data && matches(
    `${professional.data.displayName || ""} ${professional.data.category} ${professional.data.bio || ""}`,
    professional.data.createdAt,
  ) ? professional.data : null;
  const filteredServices = (services.data || []).filter((service) =>
    matches(`${service.title} ${service.description} ${service.category}`, service.createdAt),
  );
  const filteredRequests = (requests.data || []).filter((request) =>
    matches(`${request.title} ${request.description} ${request.type}`, request.createdAt),
  );
  if (result.isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={showListings ? visibleListings : []}
      keyExtractor={(item) => item.id}
      refreshing={result.isRefetching}
      onRefresh={result.refetch}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <ListingCard
            listing={item}
            fullWidth
            locationLabel={locationLabel(item)}
            onPress={() => router.push(`/listing/${item.id}`)}
          />
          <View style={styles.actions}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                {item.status === "ACTIVE" ? "Live" : item.status.toLowerCase()}
              </Text>
            </View>
            <Pressable
              style={styles.editButton}
              onPress={() =>
                router.push({ pathname: "/create", params: { id: item.id } })
              }
            >
              <Ionicons name="create-outline" size={17} color={COLORS.text} />
              <Text style={styles.editText}>Edit listing</Text>
            </Pressable>
          </View>
        </View>
      )}
      ListHeaderComponent={
        <View style={styles.headerTools}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={19} color={COLORS.muted} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={() => setQuery(searchText.trim())}
              placeholder="Search my listings"
              placeholderTextColor={COLORS.muted}
              returnKeyType="search"
            />
            <Pressable
              accessibilityLabel="Search my listings"
              onPress={() => setQuery(searchText.trim())}
            >
              <Text style={styles.searchAction}>Search</Text>
            </Pressable>
          </View>
          <Text style={styles.filterLabel}>Listing type</Text>
          <View style={styles.chips}>
            {LISTING_TYPES.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => setContentType(item.value)}
                style={[styles.chip, contentType === item.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, contentType === item.value && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.filterLabel}>Posted</Text>
          <View style={styles.chips}>
            {RECENCY.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => setDays(item.days)}
                style={[styles.chip, days === item.days && styles.chipActive]}
              >
                <Text style={[styles.chipText, days === item.days && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>Pull down to refresh your listings.</Text>
        </View>
      }
      ListEmptyComponent={showListings ? <Text style={styles.empty}>{query || contentType !== "ALL" || days ? "No items match these filters." : "You have not created any listings yet."}</Text> : null}
      ListFooterComponent={<View style={styles.requestsSection}>
        {showProfessional && <>
          <Text style={styles.sectionTitle}>My professionals and services</Text>
          {filteredProfessional && <View style={styles.requestCard}><Text style={styles.requestType}>PROFESSIONAL</Text><Text style={styles.requestTitle}>{filteredProfessional.displayName || "My professional profile"}</Text><Text style={styles.requestDescription}>{filteredProfessional.category.replaceAll("_", " ")}</Text></View>}
          {!services.isLoading && filteredServices.map((service) => <View key={service.id} style={styles.requestCard}><Text style={styles.requestType}>SERVICE · {service.category.replaceAll("_", " ")}</Text><Text style={styles.requestTitle}>{service.title}</Text><Text style={styles.requestDescription}>{service.description}</Text><Text style={styles.requestStatus}>{service.status}</Text></View>)}
          {!filteredProfessional && !services.isLoading && !filteredServices.length && <Text style={styles.empty}>No professional or service matches these filters.</Text>}
        </>}
        {showRequests && <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>My posted needs</Text><Pressable onPress={() => router.push("/requests/new")}><Text style={styles.newRequest}>Post another</Text></Pressable></View>
          {requests.isLoading && <ActivityIndicator color={COLORS.primary} />}
          {!requests.isLoading && !filteredRequests.length && <Text style={styles.empty}>No posted need matches these filters.</Text>}
          {filteredRequests.map((request: UserRequest) => <View key={request.id} style={styles.requestCard}><Text style={styles.requestType}>{request.type.replaceAll("_", " ")}</Text><Text style={styles.requestTitle}>{request.title}</Text><Text style={styles.requestDescription}>{request.description}</Text><Text style={styles.requestStatus}>{request.status}</Text>{(request.contactPhone || request.contactEmail || request.createdBy?.phone || request.createdBy?.email) && <Pressable onPress={() => Linking.openURL(request.contactPhone || request.createdBy?.phone ? `tel:${request.contactPhone || request.createdBy?.phone}` : `mailto:${request.contactEmail || request.createdBy?.email}`)}><Text style={styles.newRequest}>{request.contactPhone || request.contactEmail || request.createdBy?.phone || request.createdBy?.email}</Text></Pressable>}</View>)}
        </>}
      </View>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  list: { padding: 16, gap: 16 },
  item: { gap: 9 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  liveText: { color: COLORS.text, fontSize: 12, textTransform: "capitalize" },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
  },
  editText: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  headerTools: { gap: 10 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, backgroundColor: COLORS.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: COLORS.text, paddingVertical: 11 },
  searchAction: { color: COLORS.primary, fontWeight: "800", fontSize: 12 },
  filterLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  chipText: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  hint: { color: COLORS.muted, marginBottom: 4 },
  empty: { color: COLORS.muted, textAlign: "center", padding: 30 },
  requestsSection: { gap: 12, paddingTop: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800" },
  newRequest: { color: COLORS.primary, fontWeight: "700" },
  requestCard: { padding: 14, gap: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface },
  requestType: { color: COLORS.primary, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  requestTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  requestDescription: { color: COLORS.muted, lineHeight: 19 },
  requestStatus: { color: COLORS.muted, fontSize: 11, textTransform: "capitalize" },
});
