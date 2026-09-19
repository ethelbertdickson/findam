import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import { useAuth } from "../hooks/useAuth";
import { CURRENCIES } from "../utils/currency";
import { updateProfile } from "../services/auth";
import { getStoredRefreshToken, useAuthStore } from "../store/auth-store";
import type { CurrencyCode } from "../types";

export default function AppSettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const setCurrency = async (currencyCode: CurrencyCode) => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const updated = await updateProfile({ currencyCode });
      // Update the in-memory profile immediately; a refresh token may not be
      // available for older sessions, but the server update has still succeeded.
      useAuthStore.getState().setUser(updated);
      const accessToken = useAuthStore.getState().accessToken;
      const refreshToken = await getStoredRefreshToken();
      if (accessToken && refreshToken) await useAuthStore.getState().setSession({ user: updated, accessToken, refreshToken });
    } catch { Alert.alert("Could not save currency", "Please try again."); }
    finally { setSaving(false); }
  };
  return <SafeAreaView style={styles.container}>
    <Text style={styles.title}>App settings</Text>
    <View style={styles.row}><View style={styles.copy}><Text style={styles.label}>Notifications</Text><Text style={styles.body}>Receive updates about your listings and saved searches.</Text></View><Switch value={notifications} onValueChange={setNotifications} trackColor={{false:COLORS.border,true:COLORS.primary}} /></View>
    <View style={styles.card}><Text style={styles.label}>Search behavior</Text><Text style={styles.body}>Search filters are applied only when you submit them. Clear buttons remove a single field without changing the other criteria.</Text></View>
    <View style={styles.card}><Text style={styles.label}>Display currency</Text><Text style={styles.body}>Choose the currency used when formatting your prices. Original listing currencies are preserved.</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyRow}>{CURRENCIES.map((item) => <Pressable key={item.code} disabled={!user || saving} onPress={() => setCurrency(item.code)} style={[styles.currency, user?.currencyCode === item.code && styles.currencyActive]}><Text style={[styles.currencyText, user?.currencyCode === item.code && styles.currencyTextActive]}>{item.code}</Text></Pressable>)}</ScrollView></View>
  </SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:COLORS.background,padding:16,gap:16},title:{fontSize:22,fontWeight:"800",color:COLORS.text},row:{backgroundColor:COLORS.surface,borderRadius:14,padding:16,flexDirection:"row",alignItems:"center",gap:12},copy:{flex:1},label:{color:COLORS.text,fontWeight:"800",fontSize:16},body:{color:COLORS.muted,lineHeight:21,marginTop:4},card:{backgroundColor:COLORS.surface,borderColor:COLORS.border,borderWidth:1,borderRadius:14,padding:16},currencyRow:{gap:8,paddingTop:14},currency:{borderWidth:1,borderColor:COLORS.border,borderRadius:18,paddingHorizontal:13,paddingVertical:8},currencyActive:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},currencyText:{color:COLORS.text,fontWeight:"700",fontSize:12},currencyTextActive:{color:"#FFFFFF"}});
