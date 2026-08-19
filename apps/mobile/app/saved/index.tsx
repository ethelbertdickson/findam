import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ListingCard } from "../../components/ListingCard";
import { locationLabel } from "../../components/ListingFeed";
import { COLORS } from "../../constants";
import { fetchFavorites } from "../../services/listings";

export default function SavedListingsScreen() {
  const result = useQuery({ queryKey: ["favorites"], queryFn: fetchFavorites });
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
        <ListingCard
          listing={item}
          fullWidth
          locationLabel={locationLabel(item)}
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>Your saved listings will appear here.</Text>
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
  list: { padding: 16, gap: 12 },
  empty: { color: COLORS.muted, textAlign: "center", padding: 30 },
});
