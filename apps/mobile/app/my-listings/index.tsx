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

export default function MyListingsScreen() {
  const result = useQuery({
    queryKey: ["my-listings"],
    queryFn: fetchMyListings,
  });
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
      ListEmptyComponent={
        <Text style={styles.empty}>You have not created any listings yet.</Text>
      }
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
});
