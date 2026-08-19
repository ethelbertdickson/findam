import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { locationLabel } from "../../components/ListingFeed";
import { COLORS } from "../../constants";
import { fetchListing } from "../../services/listings";
import { getAgencyFee } from "../../utils/currency";

const readable = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const galleryWidth = width - 32;
  const galleryRef = useRef<FlatList>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const result = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id),
    enabled: Boolean(id),
  });

  if (result.isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  if (result.isError || !result.data)
    return (
      <View style={styles.content}>
        <Text style={styles.bodyText}>Listing not found.</Text>
      </View>
    );
  const listing = result.data;
  const property = listing.propertyDetails;
  const offerLabel =
    property?.offerType === "SALE"
      ? "For Sale"
      : property?.offerType === "SHORT_LET"
        ? "Short Let"
        : "For Rent";
  const agencyFee = getAgencyFee(listing);
  const total = property
    ? listing.price +
      agencyFee +
      [
        property.securityDeposit,
        property.legalFee,
        property.cautionFee,
        property.serviceCharge,
        property.otherCharges,
      ].reduce((sum, fee) => sum + Number(fee || 0), 0)
    : listing.price;

  const selectImage = (index: number) => {
    setActiveImage(index);
    galleryRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={result.isRefetching}
            onRefresh={result.refetch}
            tintColor={COLORS.text}
            colors={[COLORS.primary]}
          />
        }
      >
        {listing.images.length > 0 && (
          <View>
            <FlatList
              ref={galleryRef}
              data={listing.images}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, index) => ({
                length: galleryWidth,
                offset: galleryWidth * index,
                index,
              })}
              onMomentumScrollEnd={(event) =>
                setActiveImage(
                  Math.round(event.nativeEvent.contentOffset.x / galleryWidth),
                )
              }
              renderItem={({ item }) => (
                <Pressable onPress={() => setExpanded(true)}>
                  <Image
                    source={{ uri: item.url }}
                    style={[styles.hero, { width: galleryWidth }]}
                    contentFit="cover"
                  />
                  <View style={styles.expandButton}>
                    <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
                  </View>
                </Pressable>
              )}
            />
            {listing.images.length > 1 && (
              <>
                <Text style={styles.imageCount}>
                  {activeImage + 1} / {listing.images.length}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnails}
                >
                  {listing.images.map((image, index) => (
                    <Pressable
                      key={image.id}
                      onPress={() => selectImage(index)}
                      style={[
                        styles.thumbnailWrap,
                        activeImage === index && styles.thumbnailActive,
                      ]}
                    >
                      <Image
                        source={{ uri: image.url }}
                        style={styles.thumbnail}
                        contentFit="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        )}
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>₦{listing.price.toLocaleString()}</Text>
        <Text style={styles.location}>{locationLabel(listing)}</Text>
        {property && (
          <View style={styles.featureRow}>
            <View style={styles.feature}>
              <Ionicons name="bed-outline" size={19} color={COLORS.text} />
              <Text style={styles.featureText}>
                {property.propertyType === "SELF_CONTAINED"
                  ? "Self-contained"
                  : `${property.bedrooms ?? 0} beds`}
              </Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="water-outline" size={19} color={COLORS.text} />
              <Text style={styles.featureText}>
                {property.bathrooms ?? 0} baths
              </Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="car-outline" size={19} color={COLORS.text} />
              <Text style={styles.featureText}>
                {property.parking ?? 0} parking
              </Text>
            </View>
          </View>
        )}
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{listing.description}</Text>
        {property && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Property details</Text>
            <Text style={styles.bodyText}>
              {readable(property.propertyType)} · {offerLabel}
            </Text>
            {property.offerType !== "SALE" && (
              <Text style={styles.bodyText}>
                {property.offerType === "SHORT_LET" ? "Booking" : "Rent"}{" "}
                period: {readable(property.rentPeriod)}
              </Text>
            )}
            <Text style={styles.bodyText}>
              {property.toilets ?? 0} toilets ·{" "}
              {property.isFurnished ? "Furnished" : "Not furnished"}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.cardTitle}>Move-in cost</Text>
            <Text style={styles.bodyText}>
              {property.offerType === "SALE"
                ? "Price"
                : property.offerType === "SHORT_LET"
                  ? "Short-let price"
                  : "Rent"}
              : ₦{listing.price.toLocaleString()}
            </Text>
            <Text style={styles.bodyText}>
              Agent fee
              {property.agencyFeeType === "PERCENTAGE"
                ? ` (${Number(property.agencyFee)}%)`
                : ""}
              : ₦{agencyFee.toLocaleString()}
            </Text>
            <Text style={styles.bodyText}>
              All fees: ₦{(total - listing.price).toLocaleString()}
            </Text>
            <Text style={styles.total}>Total: ₦{total.toLocaleString()}</Text>
          </View>
        )}
        {listing.owner && (
          <Link
            href={
              listing.owner.agentProfile
                ? `/agent/${listing.owner.agentProfile.id}`
                : "/profile"
            }
            asChild
          >
            <Pressable style={styles.agent}>
              <View style={styles.contactText}>
                <Text style={styles.contactLabel}>Contact</Text>
                <Text style={styles.contactName}>
                  {listing.owner.firstName} {listing.owner.lastName}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.primary}
              />
            </Pressable>
          </Link>
        )}
      </ScrollView>

      <Modal
        visible={expanded}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <View style={styles.modal}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setExpanded(false)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
          <FlatList
            data={listing.images}
            keyExtractor={(item) => `expanded-${item.id}`}
            horizontal
            pagingEnabled
            initialScrollIndex={activeImage}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) =>
              setActiveImage(
                Math.round(event.nativeEvent.contentOffset.x / width),
              )
            }
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.url }}
                style={{ width, height: "100%" }}
                contentFit="contain"
              />
            )}
          />
          <Text style={styles.modalCount}>
            {activeImage + 1} / {listing.images.length}
          </Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 36 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  hero: { height: 260, borderRadius: 14 },
  expandButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D1117CC",
  },
  imageCount: {
    position: "absolute",
    right: 10,
    top: 10,
    color: "#FFFFFF",
    backgroundColor: "#0D1117CC",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  thumbnails: { gap: 8, paddingVertical: 10 },
  thumbnailWrap: {
    width: 70,
    height: 54,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnailActive: { borderColor: COLORS.primary },
  thumbnail: { width: "100%", height: "100%" },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 8,
  },
  price: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  location: { color: COLORS.muted, marginBottom: 16 },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureText: { color: COLORS.text, fontSize: 13 },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  description: { color: COLORS.text, lineHeight: 23, marginBottom: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    gap: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: COLORS.text,
  },
  bodyText: { color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  total: { fontWeight: "800", color: COLORS.text, marginTop: 6, fontSize: 16 },
  agent: {
    marginTop: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  contactText: { flex: 1, gap: 3 },
  contactLabel: { color: COLORS.muted, fontSize: 12 },
  contactName: { color: COLORS.primary, fontWeight: "800" },
  modal: { flex: 1, backgroundColor: "#000000" },
  closeButton: {
    position: "absolute",
    zIndex: 2,
    top: 48,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161B22CC",
  },
  modalCount: {
    position: "absolute",
    bottom: 35,
    alignSelf: "center",
    color: "#FFFFFF",
    fontWeight: "700",
    backgroundColor: "#161B22CC",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
