import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Button } from "../../components/Button";
import { COLORS } from "../../constants";
import * as auth from "../../services/auth";
import { useAuthStore } from "../../store/auth-store";
import { PasswordInput } from "../../components/PasswordInput";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import { getApiErrorMessage } from "../../utils/errors";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "AGENT">("USER");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || password.length < 8)
      return Alert.alert(
        "Check your details",
        "Enter your name, a valid email and a password of at least 8 characters.",
      );
    setLoading(true);
    try {
      const session = await auth.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      await useAuthStore.getState().setSession(session);
      router.back();
    } catch (error: any) {
      Alert.alert(
        "Could not create account",
        getApiErrorMessage(error, "Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <View style={styles.field}>
        <Text style={styles.label}>How will you use Find Am?</Text>
        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleCard, role === "USER" && styles.roleCardActive]}
            onPress={() => setRole("USER")}
          >
            <Text style={styles.roleTitle}>Personal user</Text>
            <Text style={styles.roleNote}>Browse, save and contact agents</Text>
          </Pressable>
          <Pressable
            style={[styles.roleCard, role === "AGENT" && styles.roleCardActive]}
            onPress={() => setRole("AGENT")}
          >
            <Text style={styles.roleTitle}>Property agent</Text>
            <Text style={styles.roleNote}>
              Publish listings and build a profile
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>First name</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholderTextColor={COLORS.muted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Last name</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholderTextColor={COLORS.muted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={COLORS.muted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </View>

      <Button
        label="Create account"
        onPress={handleRegister}
        loading={loading}
      />
      <Text style={styles.or}>or</Text>
      <GoogleSignInButton />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: COLORS.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
  },
  or: { textAlign: "center", color: COLORS.muted },
  roleRow: { flexDirection: "row", gap: 10 },
  roleCard: {
    flex: 1,
    minHeight: 92,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceElevated,
  },
  roleTitle: { color: COLORS.text, fontWeight: "800", marginBottom: 5 },
  roleNote: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },
});
