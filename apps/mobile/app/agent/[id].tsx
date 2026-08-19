import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS } from "../../constants";
import {
  fetchAgent,
  fetchAgentListings,
  fetchAgentRatings,
  rateAgent,
} from "../../services/agents";
import { ListingCard } from "../../components/ListingCard";
import { locationLabel } from "../../components/ListingFeed";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../utils/errors";

export default function AgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { isAuthenticated } = useAuth();
  const client = useQueryClient();
  const agent = useQuery({
    queryKey: ["agent", id],
    queryFn: () => fetchAgent(id),
    enabled: Boolean(id),
  });
  const listings = useQuery({
    queryKey: ["agent-listings", id],
    queryFn: () => fetchAgentListings(id),
    enabled: Boolean(id),
  });
  const ratings = useQuery({
    queryKey: ["agent-ratings", id],
    queryFn: () => fetchAgentRatings(id),
    enabled: Boolean(id),
  });
  const ratingMutation = useMutation({
    mutationFn: (overallRating: number) =>
      rateAgent(id, {
        overallRating,
        communication: overallRating,
        listingAccuracy: overallRating,
        professionalism: overallRating,
        responsiveness: overallRating,
        comment: "",
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["agent", id] });
      client.invalidateQueries({ queryKey: ["agent-ratings", id] });
    },
    onError: (error: any) =>
      Alert.alert(
        "Could not rate",
        getApiErrorMessage(error, "You may have already rated this agent."),
      ),
  });
  if (agent.isLoading)
    return (
      <View style={styles.center}>
        <Text style={styles.bodyText}>Loading agent…</Text>
      </View>
    );
  if (agent.isError || !agent.data)
    return (
      <View style={styles.content}>
        <Text style={styles.bodyText}>Agent not found.</Text>
      </View>
    );
  const profile = agent.data;
  const callAgent = async () => {
    const phone = profile.user.phone || profile.whatsapp;
    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "This agent has not added a phone number.",
      );
      return;
    }
    await Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  };
  const openWhatsApp = async () => {
    if (!profile.whatsapp) {
      Alert.alert(
        "WhatsApp unavailable",
        "This agent has not added a WhatsApp number.",
      );
      return;
    }
    let number = profile.whatsapp.replace(/\D/g, "");
    if (number.startsWith("0")) number = `234${number.slice(1)}`;
    await Linking.openURL(
      `https://wa.me/${number}?text=${encodeURIComponent("Hello, I found your listing on Find Am.")}`,
    );
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profile}>
        {profile.user.avatarUrl ? (
          <Image
            source={{ uri: profile.user.avatarUrl }}
            style={styles.avatarImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.user.firstName[0]}
              {profile.user.lastName[0]}
            </Text>
          </View>
        )}
        <Text style={styles.title}>
          {profile.user.firstName} {profile.user.lastName}
        </Text>
        {profile.isVerified && (
          <Text style={styles.verified}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={COLORS.success}
            />{" "}
            Verified agent
          </Text>
        )}
        {profile.agencyName && (
          <Text style={styles.agencyName}>{profile.agencyName}</Text>
        )}
        <Text style={styles.rating}>
          ★ {profile.averageRating.toFixed(1)} · {profile.reviewCount} reviews
        </Text>
      </View>
      {profile.bio && <Text style={styles.description}>{profile.bio}</Text>}
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={callAgent}>
          <Ionicons name="call-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionText}>Call</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={openWhatsApp}>
          <Ionicons name="logo-whatsapp" size={19} color="#FFFFFF" />
          <Text style={styles.actionText}>WhatsApp</Text>
        </Pressable>
      </View>
      <Text style={styles.section}>Rate this agent</Text>
      {!isAuthenticated ? (
        <Pressable onPress={() => router.push("/auth/login")}>
          <Text style={styles.link}>Log in to rate this agent</Text>
        </Pressable>
      ) : (
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => ratingMutation.mutate(star)}>
              <Text style={styles.star}>★</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={styles.section}>Active listings</Text>
      {listings.data?.items.map((item) => (
        <ListingCard
          key={item.id}
          listing={item}
          fullWidth
          locationLabel={locationLabel(item)}
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      ))}
      <Text style={styles.section}>Reviews</Text>
      {ratings.data?.items.map((review) => (
        <View key={review.id} style={styles.review}>
          <Text style={styles.reviewTitle}>
            ★ {review.overallRating} · {review.author.firstName}{" "}
            {review.author.lastName}
          </Text>
          {review.comment && <Text style={styles.muted}>{review.comment}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  profile: { alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#FFFFFF", fontSize: 48, fontWeight: "800" },
  avatarImage: { width: 152, height: 152, borderRadius: 76, marginBottom: 12 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  verified: { color: COLORS.success, fontWeight: "700", marginBottom: 6 },
  muted: { color: COLORS.muted },
  agencyName: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  rating: { color: COLORS.primary, fontWeight: "700", marginTop: 8 },
  description: { color: COLORS.text, lineHeight: 21, marginBottom: 16 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 10 },
  action: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  actionText: { color: "#FFFFFF", fontWeight: "700" },
  section: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 22,
    marginBottom: 10,
  },
  link: { color: COLORS.primary, fontWeight: "700" },
  stars: { flexDirection: "row", gap: 12 },
  star: { fontSize: 32, color: "#F59E0B" },
  review: {
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    marginBottom: 8,
  },
  reviewTitle: { fontWeight: "700", marginBottom: 4, color: COLORS.text },
  bodyText: { color: COLORS.text },
  placeholder: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
});
