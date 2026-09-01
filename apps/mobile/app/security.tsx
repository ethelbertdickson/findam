import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import { useAuth } from "../hooks/useAuth";

export default function SecurityScreen() {
  const { isAuthenticated } = useAuth();
  return <SafeAreaView style={styles.container}>
    <Text style={styles.title}>Security</Text>
    <Text style={styles.body}>Keep your account secure by using a strong password and signing out on shared devices.</Text>
    {!isAuthenticated ? <Pressable style={styles.button} onPress={() => router.push("/auth/login")}><Text style={styles.buttonText}>Log in to manage security</Text></Pressable> : <View style={styles.card}><Text style={styles.cardTitle}>Account protection</Text><Text style={styles.body}>Your session tokens are stored securely on this device.</Text></View>}
  </SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:COLORS.background,padding:16,gap:16},title:{fontSize:22,fontWeight:"800",color:COLORS.text},body:{color:COLORS.muted,lineHeight:21},card:{backgroundColor:COLORS.surface,borderColor:COLORS.border,borderWidth:1,borderRadius:14,padding:16,gap:8},cardTitle:{color:COLORS.text,fontWeight:"800",fontSize:16},button:{backgroundColor:COLORS.primary,borderRadius:12,padding:15,alignItems:"center"},buttonText:{color:"#fff",fontWeight:"700"}});
