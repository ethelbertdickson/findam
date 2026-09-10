import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants';

const OPTIONS = [
  ['Property listing', 'Publish a home, flat or rental', 'home-outline', '/create?type=PROPERTY'],
  ['Land listing', 'List land for sale or lease', 'map-outline', '/create?type=LAND'],
  ['Household item', 'Sell furniture or appliances', 'cube-outline', '/create?type=HOUSEHOLD'],
  ['Add a professional or artisan', 'Create a profile for yourself or someone you manage', 'people-outline', '/professionals/new'],
  ['Add a service', 'Publish a service offered by a professional', 'construct-outline', '/services/new'],
  ['Post what I need', 'Let agents and providers find and respond to you', 'megaphone-outline', '/requests/new'],
] as const;

export default function CreateOptionsScreen() {
  return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.header}><Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></Pressable><Text style={styles.title}>Create</Text><View style={{ width: 24 }} /></View><ScrollView contentContainerStyle={styles.list}>{OPTIONS.map(([title, note, icon, path]) => <Pressable key={title} style={styles.card} onPress={() => router.push(path as any)}><View style={styles.icon}><Ionicons name={icon as any} size={24} color={COLORS.primary} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.note}>{note}</Text></View><Ionicons name="chevron-forward" size={20} color={COLORS.muted} /></Pressable>)}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { color: COLORS.text, fontSize: 22, fontWeight: '800' }, list: { padding: 16, gap: 12 }, card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.surface }, icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' }, cardTitle: { color: COLORS.text, fontWeight: '800', fontSize: 16 }, note: { color: COLORS.muted, marginTop: 4, lineHeight: 18 } });
