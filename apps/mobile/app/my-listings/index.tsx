import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ListingCard } from "../../components/ListingCard";
import { locationLabel } from "../../components/ListingFeed";
import { COLORS } from "../../constants";
import { fetchMyListings } from "../../services/listings";
import { fetchMyRequests, type UserRequest } from "../../services/requests";
import { fetchMyProfessional } from "../../services/professionals";
import { fetchMyServices } from "../../services/services";

export default function MyListingsScreen() {
  const result = useQuery({
    queryKey: ["my-listings"],
    queryFn: fetchMyListings,
  });
  const requests = useQuery({ queryKey: ["my-requests"], queryFn: fetchMyRequests });
  const professional = useQuery({ queryKey: ["my-professional"], queryFn: fetchMyProfessional, retry: false });
  const services = useQuery({ queryKey: ["my-services"], queryFn: fetchMyServices });
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
      data={result.data || []}
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
        <Text style={styles.hint}>Pull down to refresh your listings.</Text>
      }
      ListEmptyComponent={<Text style={styles.empty}>You have not created any property listings yet.</Text>}
      ListFooterComponent={<View style={styles.requestsSection}>
        <Text style={styles.sectionTitle}>My professionals and services</Text>
        {professional.data && <View style={styles.requestCard}><Text style={styles.requestType}>PROFESSIONAL</Text><Text style={styles.requestTitle}>{professional.data.displayName || 'My professional profile'}</Text><Text style={styles.requestDescription}>{professional.data.category.replaceAll('_', ' ')}</Text></View>}
        {!services.isLoading && (services.data || []).map((service) => <View key={service.id} style={styles.requestCard}><Text style={styles.requestType}>SERVICE · {service.category.replaceAll('_', ' ')}</Text><Text style={styles.requestTitle}>{service.title}</Text><Text style={styles.requestDescription}>{service.description}</Text><Text style={styles.requestStatus}>{service.status}</Text></View>)}
        {!professional.data && !services.isLoading && !(services.data || []).length && <Text style={styles.empty}>You have not added a professional or service yet.</Text>}
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>My posted needs</Text><Pressable onPress={() => router.push('/requests/new')}><Text style={styles.newRequest}>Post another</Text></Pressable></View>
        {requests.isLoading && <ActivityIndicator color={COLORS.primary} />}
        {!requests.isLoading && (requests.data || []).length === 0 && <Text style={styles.empty}>You have not posted a request yet.</Text>}
        {(requests.data || []).map((request: UserRequest) => <View key={request.id} style={styles.requestCard}><Text style={styles.requestType}>{request.type.replaceAll('_', ' ')}</Text><Text style={styles.requestTitle}>{request.title}</Text><Text style={styles.requestDescription}>{request.description}</Text><Text style={styles.requestStatus}>{request.status}</Text></View>)}
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
