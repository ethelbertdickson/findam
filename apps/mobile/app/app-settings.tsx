import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants";

export default function AppSettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  return <SafeAreaView style={styles.container}>
    <Text style={styles.title}>App settings</Text>
    <View style={styles.row}><View style={styles.copy}><Text style={styles.label}>Notifications</Text><Text style={styles.body}>Receive updates about your listings and saved searches.</Text></View><Switch value={notifications} onValueChange={setNotifications} trackColor={{false:COLORS.border,true:COLORS.primary}} /></View>
    <View style={styles.card}><Text style={styles.label}>Search behavior</Text><Text style={styles.body}>Search filters are applied only when you submit them. Clear buttons remove a single field without changing the other criteria.</Text></View>
  </SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:COLORS.background,padding:16,gap:16},title:{fontSize:22,fontWeight:"800",color:COLORS.text},row:{backgroundColor:COLORS.surface,borderRadius:14,padding:16,flexDirection:"row",alignItems:"center",gap:12},copy:{flex:1},label:{color:COLORS.text,fontWeight:"800",fontSize:16},body:{color:COLORS.muted,lineHeight:21,marginTop:4},card:{backgroundColor:COLORS.surface,borderColor:COLORS.border,borderWidth:1,borderRadius:14,padding:16}});
