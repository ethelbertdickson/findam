import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants";

export default function PrivacyScreen() {
  return <SafeAreaView style={styles.container}>
    <Text style={styles.title}>Privacy</Text>
    <Text style={styles.body}>Your account data is used to provide listings, favourites, messaging and location-based search. Find Am does not activate device location unless you grant permission.</Text>
    <View style={styles.card}><Text style={styles.cardTitle}>Location data</Text><Text style={styles.body}>Location search uses your selected coordinates only to find nearby listings. You can turn it off at any time from Location settings.</Text></View>
    <Pressable style={styles.row} onPress={() => Linking.openSettings()}><Text style={styles.rowText}>Review device permissions</Text><Text style={styles.link}>Open settings</Text></Pressable>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ container:{flex:1,backgroundColor:COLORS.background,padding:16,gap:16}, title:{fontSize:22,fontWeight:"800",color:COLORS.text}, body:{color:COLORS.muted,lineHeight:21}, card:{backgroundColor:COLORS.surface,borderColor:COLORS.border,borderWidth:1,borderRadius:14,padding:16,gap:8}, cardTitle:{color:COLORS.text,fontWeight:"800",fontSize:16}, row:{backgroundColor:COLORS.surface,borderRadius:12,padding:16,flexDirection:"row",justifyContent:"space-between"},rowText:{color:COLORS.text},link:{color:COLORS.primary,fontWeight:"700"} });
