import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants";

const cards = [
  { title: "Find a trusted professional", note: "Connect with plumbers, electricians, architects and artisans.", icon: "construct-outline" as const, action: () => router.push("/professionals") },
  { title: "Post what you need", note: "Tell agents and providers what you are looking for and let the right match find you.", icon: "megaphone-outline" as const, action: () => router.push("/requests/new") },
];

export default function DiscoverScreen() {
  return <SafeAreaView style={styles.container} edges={["top"]}>
    <View style={styles.header}><View><Text style={styles.kicker}>MORE WAYS TO FIND</Text><Text style={styles.title}>Discover</Text></View><Ionicons name="sparkles-outline" size={26} color={COLORS.primary} /></View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>Find the people and opportunities behind the things you need.</Text>
      {cards.map((card) => <Pressable key={card.title} style={styles.card} onPress={card.action}><View style={styles.icon}><Ionicons name={card.icon} size={28} color={COLORS.primary} /></View><View style={styles.copy}><Text style={styles.cardTitle}>{card.title}</Text><Text style={styles.cardNote}>{card.note}</Text><Text style={styles.link}>Explore <Ionicons name="arrow-forward" size={14} color={COLORS.primary} /></Text></View></Pressable>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, header: { padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, kicker: { color: COLORS.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 }, title: { color: COLORS.text, fontSize: 30, fontWeight: "800", marginTop: 4 }, content: { padding: 16, gap: 14 }, intro: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginBottom: 4 }, card: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.surface }, icon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceElevated }, copy: { flex: 1, gap: 5 }, cardTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800" }, cardNote: { color: COLORS.muted, lineHeight: 19 }, link: { color: COLORS.primary, fontWeight: "800", marginTop: 3 }, });
