import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListingFeed } from "../../components/ListingFeed";
import { COLORS } from "../../constants";

export default function AllListingsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Latest listings</Text>
        <Pressable onPress={() => router.push("/search")} accessibilityLabel="Search listings">
          <Ionicons name="search" size={22} color={COLORS.text} />
        </Pressable>
      </View>
      <ListingFeed />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "800" },
});
