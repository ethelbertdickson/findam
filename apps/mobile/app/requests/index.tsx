import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants';
import { fetchRequests } from '../../services/requests';

export default function RequestsScreen() {
  const { data = [], isLoading } = useQuery({ queryKey: ['requests'], queryFn: () => fetchRequests() });
  return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.title}>What people need</Text><Pressable onPress={() => router.push('/requests/new')}><Text style={styles.action}>Post a request</Text></Pressable></View><ScrollView contentContainerStyle={styles.list}>{isLoading && <Text style={styles.note}>Loading requests...</Text>}{!isLoading && data.length === 0 && <Text style={styles.note}>No open requests yet.</Text>}{data.map((item) => <View key={item.id} style={styles.card}><Text style={styles.type}>{item.type.replaceAll('_', ' ')}</Text><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.description}>{item.description}</Text>{item.city?.name && <Text style={styles.note}>{item.city.name}</Text>}</View>)}</ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:COLORS.background},header:{padding:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{color:COLORS.text,fontSize:22,fontWeight:'800'},action:{color:COLORS.primary,fontWeight:'700'},list:{padding:16,gap:12},card:{padding:15,borderRadius:14,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.surface,gap:7},type:{color:COLORS.primary,fontSize:11,fontWeight:'800',textTransform:'uppercase'},cardTitle:{color:COLORS.text,fontSize:16,fontWeight:'800'},description:{color:COLORS.text,lineHeight:19},note:{color:COLORS.muted,paddingVertical:8}});
