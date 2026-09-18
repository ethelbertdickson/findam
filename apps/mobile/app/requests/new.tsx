import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants";
import { Button } from "../../components/Button";
import { createRequest, UserRequestType } from "../../services/requests";
import { getApiErrorMessage } from "../../utils/errors";
import type { ProfessionalCategory } from "../../types";
const TYPES: { label: string; value: UserRequestType }[] = [
  { label: "Apartment or home", value: "PROPERTY" },
  { label: "Co-tenant", value: "CO_RENTING" },
  { label: "Land", value: "LAND" },
  { label: "Household item", value: "HOUSEHOLD" },
  { label: "Professional / artisan", value: "PROFESSIONAL" },
  { label: "Service", value: "SERVICE" },
];
const SERVICE_CATEGORIES: { label: string; value: ProfessionalCategory }[] = [
  { label: "Plumber", value: "PLUMBER" }, { label: "Electrician", value: "ELECTRICIAN" },
  { label: "Carpenter", value: "CARPENTER" }, { label: "Painter", value: "PAINTER" },
  { label: "Tiler", value: "TILER" }, { label: "Bricklayer", value: "BRICKLAYER" },
  { label: "Roofer", value: "ROOFER" }, { label: "Engineer", value: "ENGINEER" },
  { label: "Architect", value: "ARCHITECT" }, { label: "Other", value: "OTHER" },
];
export default function NewRequestScreen() {
  const [type, setType] = useState<UserRequestType>("PROPERTY");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState(""); const [toilets, setToilets] = useState(""); const [parking, setParking] = useState(""); const [furnished, setFurnished] = useState("");
  const [landSize, setLandSize] = useState("");
  const [landUnit, setLandUnit] = useState("plots");
  const [condition, setCondition] = useState("");
  const [specialty, setSpecialty] = useState(""); const [experience, setExperience] = useState(""); const [availability, setAvailability] = useState(""); const [contactMode, setContactMode] = useState("IN_APP");
  const [contactPhone, setContactPhone] = useState(""); const [contactEmail, setContactEmail] = useState("");
  const [serviceCategory, setServiceCategory] = useState<ProfessionalCategory | undefined>();
  const [loading, setLoading] = useState(false);
  const save = async () => {
    if (!title.trim() || !description.trim() || !contactPhone.trim())
      return Alert.alert("Missing details", "Add what you need and a contact phone number.");
    setLoading(true);
    try {
      await createRequest({
        type,
        title: title.trim(),
        description: description.trim(),
        budgetMax: budget ? Number(budget.replace(/,/g, "")) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        serviceCategory: type === "PROFESSIONAL" || type === "SERVICE" ? serviceCategory : undefined,
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim() || undefined,
        criteria: { location: location.trim() || undefined, bedrooms: bedrooms ? Number(bedrooms) : undefined, bathrooms: bathrooms ? Number(bathrooms) : undefined, toilets: toilets ? Number(toilets) : undefined, parkingSpaces: parking ? Number(parking) : undefined, furnished: furnished || undefined, landSize: landSize || undefined, landUnit: type === "LAND" ? landUnit : undefined, condition: condition.trim() || undefined, specialty: specialty.trim() || undefined, experience: experience.trim() || undefined, availability: availability.trim() || undefined, serviceCategory, contactMode },
        contactMode,
      });
      Alert.alert(
        "Request posted",
        "Agents and providers can now discover your request.",
      );
      router.back();
    } catch (e) {
      Alert.alert(
        "Could not post request",
        getApiErrorMessage(e, "Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Post what you need</Text>
        <Text style={styles.note}>
          Tell agents and professionals what you are looking for. Keep your
          contact details private until you choose to connect.
        </Text>
        <Text style={styles.label}>What do you need?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.types}
        >
          {TYPES.map((item) => (
            <Text
              key={item.value}
              onPress={() => setType(item.value)}
              style={[styles.type, type === item.value && styles.selected]}
            >
              {item.label}
            </Text>
          ))}
        </ScrollView>
        <TextInput
          style={styles.input}
          placeholder="Short title"
          placeholderTextColor={COLORS.muted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Describe your requirements"
          placeholderTextColor={COLORS.muted}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextInput style={styles.input} placeholder="Phone number (required)" placeholderTextColor={COLORS.muted} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Email (optional)" placeholderTextColor={COLORS.muted} value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput
          style={styles.input}
          placeholder="Preferred location"
          placeholderTextColor={COLORS.muted}
          value={location}
          onChangeText={setLocation}
        />
        {(type === "PROPERTY" || type === "CO_RENTING") && <TextInput style={styles.input} placeholder="Bedrooms (optional)" placeholderTextColor={COLORS.muted} value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" />}
        {(type === "PROPERTY" || type === "CO_RENTING") && <><TextInput style={styles.input} placeholder="Bathrooms" placeholderTextColor={COLORS.muted} value={bathrooms} onChangeText={setBathrooms} keyboardType="numeric" /><TextInput style={styles.input} placeholder="Toilets" placeholderTextColor={COLORS.muted} value={toilets} onChangeText={setToilets} keyboardType="numeric" /><TextInput style={styles.input} placeholder="Parking spaces" placeholderTextColor={COLORS.muted} value={parking} onChangeText={setParking} keyboardType="numeric" /><TextInput style={styles.input} placeholder="Furnished? (yes/no)" placeholderTextColor={COLORS.muted} value={furnished} onChangeText={setFurnished} /></>}
        {type === "LAND" && <><TextInput style={styles.input} placeholder="Land size (optional)" placeholderTextColor={COLORS.muted} value={landSize} onChangeText={setLandSize} keyboardType="numeric" /><ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={styles.types}>{["plots", "acres", "hectares", "square metres"].map((unit) => <Text key={unit} onPress={() => setLandUnit(unit)} style={[styles.type, landUnit === unit && styles.selected]}>{unit}</Text>)}</ScrollView></>}
        {type === "HOUSEHOLD" && <TextInput style={styles.input} placeholder="Condition or preferred specification" placeholderTextColor={COLORS.muted} value={condition} onChangeText={setCondition} />}
        {(type === "PROFESSIONAL" || type === "SERVICE") && <><Text style={styles.label}>Professional or artisan category</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.types}>{SERVICE_CATEGORIES.map((item) => <Text key={item.value} onPress={() => setServiceCategory(item.value)} style={[styles.type, serviceCategory === item.value && styles.selected]}>{item.label}</Text>)}</ScrollView><TextInput style={styles.input} placeholder="Specialty or service needed" placeholderTextColor={COLORS.muted} value={specialty} onChangeText={setSpecialty} /><TextInput style={styles.input} placeholder="Experience level (optional)" placeholderTextColor={COLORS.muted} value={experience} onChangeText={setExperience} /><TextInput style={styles.input} placeholder="Availability (optional)" placeholderTextColor={COLORS.muted} value={availability} onChangeText={setAvailability} /></>}
        <Text style={styles.label}>Preferred contact</Text><ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={styles.types}>{["IN_APP", "PHONE", "WHATSAPP"].map((mode) => <Text key={mode} onPress={() => setContactMode(mode)} style={[styles.type, contactMode === mode && styles.selected]}>{mode.replace("_", " ")}</Text>)}</ScrollView>
        <TextInput
          style={styles.input}
          placeholder="Maximum budget (optional)"
          placeholderTextColor={COLORS.muted}
          value={budget}
          onChangeText={(value) => { const digits = value.replace(/[^0-9]/g, ""); setBudget(digits ? Number(digits).toLocaleString("en-NG") : ""); }}
          keyboardType="numeric"
        />
        <Button label="Post request" loading={loading} onPress={save} />
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
  types: { gap: 8, alignItems: "center" },
  type: {
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  selected: {
    color: "#fff",
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 13,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  multiline: { minHeight: 120, textAlignVertical: "top" },
});
