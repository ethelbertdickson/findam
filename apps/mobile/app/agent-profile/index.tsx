import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../../components/Button";
import { COLORS } from "../../constants";
import { useAuth } from "../../hooks/useAuth";
import { fetchCurrentUser } from "../../services/auth";
import { fetchMyAgentProfile, saveAgentProfile } from "../../services/agents";
import { getStoredRefreshToken, useAuthStore } from "../../store/auth-store";
import { getApiErrorMessage } from "../../utils/errors";

export default function AgentProfileScreen() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["agent-profile", "me"],
    queryFn: fetchMyAgentProfile,
    enabled: isAuthenticated,
  });
  const [editing, setEditing] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [areas, setAreas] = useState("");

  useEffect(() => {
    if (!profile.data) return;
    setAgencyName(profile.data.agencyName || "");
    setWhatsapp(profile.data.whatsapp || "");
    setBio(profile.data.bio || "");
    setAreas(profile.data.areasCovered.join(", "));
  }, [profile.data]);

  const mutation = useMutation({
    mutationFn: () =>
      saveAgentProfile({
        agencyName: agencyName.trim(),
        whatsapp: whatsapp.trim(),
        bio: bio.trim(),
        areasCovered: areas
          .split(",")
          .map((area) => area.trim())
          .filter(Boolean),
      }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(["agent-profile", "me"], saved);
      const updatedUser = await fetchCurrentUser();
      const accessToken = useAuthStore.getState().accessToken;
      const refreshToken = await getStoredRefreshToken();
      if (accessToken && refreshToken)
        await useAuthStore
          .getState()
          .setSession({ user: updatedUser, accessToken, refreshToken });
      setEditing(false);
      Alert.alert(
        user?.role === "AGENT" ? "Saved" : "Agent mode enabled",
        "Your agent profile is ready.",
      );
    },
    onError: (error: unknown) =>
      Alert.alert(
        "Could not save",
        getApiErrorMessage(error, "Please check your details."),
      ),
  });

  const isAgent = user?.role === "AGENT" || Boolean(profile.data);
  if (!isAuthenticated)
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Log in to manage an agent profile.</Text>
      </View>
    );

  if (!isAgent || editing)
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.heading}>
          {isAgent ? "Edit agent profile" : "Become a property agent"}
        </Text>
        <Text style={styles.note}>
          {isAgent
            ? "Keep your professional information current."
            : "Enable agent mode to publish listings and be discovered by buyers and renters."}
        </Text>
        <Text style={styles.label}>Agency or company name</Text>
        <TextInput
          style={styles.input}
          placeholder="Optional"
          placeholderTextColor={COLORS.muted}
          value={agencyName}
          onChangeText={setAgencyName}
        />
        <Text style={styles.label}>WhatsApp number</Text>
        <TextInput
          style={styles.input}
          placeholder="WhatsApp number"
          placeholderTextColor={COLORS.muted}
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
        />
        <Text style={styles.label}>Professional biography</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Tell clients about your experience"
          placeholderTextColor={COLORS.muted}
          value={bio}
          onChangeText={setBio}
          multiline
        />
        <Text style={styles.label}>Areas covered</Text>
        <TextInput
          style={styles.input}
          placeholder="Comma separated"
          placeholderTextColor={COLORS.muted}
          value={areas}
          onChangeText={setAreas}
        />
        <Button
          label={isAgent ? "Save changes" : "Enable agent mode"}
          loading={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
        {isAgent && (
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => setEditing(false)}
          />
        )}
      </ScrollView>
    );

  const agent = profile.data;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        {user?.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="briefcase" size={38} color={COLORS.text} />
          </View>
        )}
        <Text style={styles.heading}>
          {agent?.agencyName || `${user?.firstName} ${user?.lastName}`}
        </Text>
        <Text style={styles.agentBadge}>Property agent</Text>
        <Pressable style={styles.editButton} onPress={() => setEditing(true)}>
          <Ionicons name="create-outline" size={17} color={COLORS.text} />
          <Text style={styles.editText}>Edit profile</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <Text style={styles.value}>
          {agent?.bio || "No biography added yet."}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.cardTitle}>WhatsApp</Text>
        <Text style={styles.value}>{agent?.whatsapp || "Not provided"}</Text>
        <View style={styles.divider} />
        <Text style={styles.cardTitle}>Areas covered</Text>
        <Text style={styles.value}>
          {agent?.areasCovered.length
            ? agent.areasCovered.join(", ")
            : "Not provided"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, gap: 12 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  heading: { fontSize: 21, fontWeight: "800", color: COLORS.text },
  note: { color: COLORS.muted, lineHeight: 20, marginBottom: 6 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
  },
  multiline: { minHeight: 110, textAlignVertical: "top" },
  profileHeader: { alignItems: "center", gap: 9 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  agentBadge: {
    color: COLORS.text,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 12,
  },
  editButton: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
  },
  editText: { color: COLORS.text, fontWeight: "700" },
  card: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
  },
  cardTitle: { color: COLORS.muted, fontSize: 12, marginBottom: 5 },
  value: { color: COLORS.text, lineHeight: 21 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  muted: { color: COLORS.muted },
});
