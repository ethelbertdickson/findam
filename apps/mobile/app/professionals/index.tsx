import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Linking } from "react-native";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants";
import { fetchProfessionals } from "../../services/professionals";
import type { ProfessionalCategory } from "../../types";

const CATEGORIES: { label: string; value?: ProfessionalCategory }[] = [
  { label: "All" }, { label: "Plumbers", value: "PLUMBER" }, { label: "Electricians", value: "ELECTRICIAN" },
  { label: "Carpenters", value: "CARPENTER" }, { label: "Painters", value: "PAINTER" },
  { label: "Engineers", value: "ENGINEER" }, { label: "Architects", value: "ARCHITECT" },
  { label: "Other", value: "OTHER" },
];

export default function ProfessionalsScreen() {
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<ProfessionalCategory | undefined>();
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["professionals", q, category], queryFn: () => fetchProfessionals({ q: q.trim() || undefined, category }) });
  return <SafeAreaView style={styles.container} edges={["top"]}>
    <View style={styles.header}><Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></Pressable><Text style={styles.title}>Find a professional</Text><View style={{ width: 24 }} /></View>
    <TextInput style={styles.search} value={q} onChangeText={setQ} placeholder="Search plumbers, architects..." placeholderTextColor={COLORS.muted} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{CATEGORIES.map((item) => <Pressable key={item.label} onPress={() => setCategory(item.value)} style={[styles.chip, category === item.value && styles.chipActive]}><Text style={[styles.chipText, category === item.value && styles.chipTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
    <ScrollView contentContainerStyle={styles.list}>{isLoading && <Text style={styles.note}>Loading professionals...</Text>}{isError && <Text style={styles.note}>Professionals are temporarily unavailable.</Text>}{!isLoading && !isError && data.length === 0 && <Text style={styles.note}>No professionals found yet.</Text>}{data.map((profile) => { const phone = profile.whatsapp || profile.phone || profile.user.phone; return <View key={profile.id} style={styles.card}><View style={styles.cardTop}><View style={styles.avatar}><Text style={styles.avatarText}>{(profile.displayName || profile.user.firstName).slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{profile.displayName || `${profile.user.firstName} ${profile.user.lastName}`}</Text><Text style={styles.category}>{profile.category.replaceAll("_", " ")}{profile.isVerified ? " · Verified" : ""}</Text></View></View>{profile.bio && <Text style={styles.bio} numberOfLines={3}>{profile.bio}</Text>}<Text style={styles.location}>{[profile.city?.name, profile.state?.name].filter(Boolean).join(", ") || "Service area available"}</Text>{phone && <Pressable style={styles.contact} onPress={() => Linking.openURL(`tel:${phone}`)}><Ionicons name="call-outline" size={16} color="#fff" /><Text style={styles.contactText}>Contact</Text></Pressable>}</View>})}</ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }, title: { color: COLORS.text, fontSize: 20, fontWeight: "800" }, search: { marginHorizontal: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 13, color: COLORS.text, backgroundColor: COLORS.surface }, chips: { gap: 8, padding: 16 }, chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface }, chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, chipText: { color: COLORS.text, fontSize: 12, fontWeight: "700" }, chipTextActive: { color: "#fff" }, list: { padding: 16, gap: 12 }, card: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 10 }, cardTop: { flexDirection: "row", alignItems: "center", gap: 12 }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" }, name: { color: COLORS.text, fontWeight: "800", fontSize: 16 }, category: { color: COLORS.primary, fontSize: 12, fontWeight: "700", textTransform: "capitalize" }, bio: { color: COLORS.muted, lineHeight: 19 }, location: { color: COLORS.muted, fontSize: 12 }, contact: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 }, contactText: { color: "#fff", fontWeight: "700" }, note: { color: COLORS.muted, textAlign: "center", padding: 24 } });
