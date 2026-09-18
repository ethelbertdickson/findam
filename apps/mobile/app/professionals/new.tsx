import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants";
import { createManagedProfessional } from "../../services/professionals";
import { uploadImage } from "../../services/listings";
import { Button } from "../../components/Button";
import { getApiErrorMessage } from "../../utils/errors";
import type { ProfessionalCategory } from "../../types";
const categories: ProfessionalCategory[] = [
  "PLUMBER",
  "ELECTRICIAN",
  "TILER",
  "BRICKLAYER",
  "CARPENTER",
  "PAINTER",
  "ENGINEER",
  "ARCHITECT",
  "SURVEYOR",
  "OTHER",
];
export default function NewProfessionalScreen() {
  const [category, setCategory] = useState<ProfessionalCategory>("PLUMBER");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [areas, setAreas] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [loading, setLoading] = useState(false);
  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };
  const save = async () => {
    if (!name.trim() || !phone.trim())
      return Alert.alert("Missing details", "Add a name and contact number.");
    setLoading(true);
    try {
      const photoUrl = photo ? await uploadImage(photo) : undefined;
      await createManagedProfessional({
        category,
        displayName: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        bio: bio.trim() || undefined,
        serviceAreas: areas
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        portfolioUrls: photoUrl ? [photoUrl] : undefined,
      });
      Alert.alert("Submitted", "The profile was added for review.");
      router.replace("/professionals");
    } catch (e) {
      Alert.alert("Could not save", getApiErrorMessage(e, "Please try again."));
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add a professional or artisan</Text>
        <Text style={styles.note}>
          You can publish this profile on someone’s behalf. Add their consent
          and accurate contact details.
        </Text>
        <Text style={styles.label}>Profile picture (optional)</Text>
        <Pressable style={styles.photoPicker} onPress={choosePhoto}>
          {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <Text style={styles.photoText}>Add a photo</Text>}
        </Pressable>
        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {categories.map((item) => (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[styles.chip, category === item && styles.active]}
            >
              <Text
                style={[
                  styles.chipText,
                  category === item && styles.activeText,
                ]}
              >
                {item.replaceAll("_", " ")}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Name or business name"
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone or WhatsApp"
          placeholderTextColor={COLORS.muted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Email (optional)"
          placeholderTextColor={COLORS.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Experience and specialties"
          placeholderTextColor={COLORS.muted}
          value={bio}
          onChangeText={setBio}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Service areas, separated by commas"
          placeholderTextColor={COLORS.muted}
          value={areas}
          onChangeText={setAreas}
        />
        <Button label="Submit profile" loading={loading} onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 14 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  note: { color: COLORS.muted, lineHeight: 19 },
  label: { color: COLORS.text, fontWeight: "700" },
  photoPicker: { height: 150, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
  photoText: { color: COLORS.primary, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  active: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.text, fontSize: 12 },
  activeText: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 13,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  multiline: { minHeight: 110, textAlignVertical: "top" },
});
