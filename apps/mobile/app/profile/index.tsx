import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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
import { updateProfile } from "../../services/auth";
import { uploadImage } from "../../services/listings";
import { getStoredRefreshToken, useAuthStore } from "../../store/auth-store";
import { getApiErrorMessage } from "../../utils/errors";

export default function ProfileScreen() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone || "");
    setAvatar(user.avatarUrl || "");
  }, [user]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled) setAvatar(result.assets[0].uri);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const avatarUrl =
        avatar && !avatar.startsWith("http")
          ? await uploadImage(avatar)
          : avatar || undefined;
      return updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        avatarUrl,
      });
    },
    onSuccess: async (updated) => {
      const accessToken = useAuthStore.getState().accessToken;
      const refreshToken = await getStoredRefreshToken();
      if (accessToken && refreshToken)
        await useAuthStore
          .getState()
          .setSession({ user: updated, accessToken, refreshToken });
      setEditing(false);
      Alert.alert("Saved", "Your profile has been updated.");
    },
    onError: (error: unknown) =>
      Alert.alert(
        "Could not save",
        getApiErrorMessage(error, "Please try again."),
      ),
  });

  if (!user)
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Log in to view your profile.</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          disabled={!editing}
          onPress={pickPhoto}
          style={styles.avatarWrap}
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={44} color={COLORS.text} />
            </View>
          )}
          {editing && (
            <View style={styles.camera}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          )}
        </Pressable>
        {!editing && (
          <Pressable style={styles.editButton} onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={17} color={COLORS.text} />
            <Text style={styles.editText}>Edit profile</Text>
          </Pressable>
        )}
      </View>

      {editing ? (
        <View style={styles.form}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor={COLORS.muted}
          />
          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor={COLORS.muted}
          />
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.muted}
          />
          <Button
            label="Save changes"
            loading={mutation.isPending}
            onPress={() => mutation.mutate()}
          />
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => setEditing(false)}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.name}>
            {user.firstName} {user.lastName}
          </Text>
          <View style={styles.detail}>
            <Ionicons name="mail-outline" size={19} color={COLORS.muted} />
            <View>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{user.email}</Text>
            </View>
          </View>
          <View style={styles.detail}>
            <Ionicons name="call-outline" size={19} color={COLORS.muted} />
            <View>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>
                {user.phone || "Not provided"}
              </Text>
            </View>
          </View>
          <View style={styles.detail}>
            <Ionicons
              name="person-circle-outline"
              size={19}
              color={COLORS.muted}
            />
            <View>
              <Text style={styles.detailLabel}>Account type</Text>
              <Text style={styles.detailValue}>
                {user.role === "AGENT" ? "Property agent" : "Personal user"}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, gap: 18 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: { alignItems: "center", gap: 14 },
  avatarWrap: { width: 112, height: 112 },
  avatar: { width: 112, height: 112, borderRadius: 56 },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  camera: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
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
  form: { gap: 10 },
  label: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
    gap: 18,
  },
  name: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  detail: { flexDirection: "row", gap: 12, alignItems: "center" },
  detailLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 2 },
  detailValue: { color: COLORS.text, fontSize: 15 },
  muted: { color: COLORS.muted },
});
