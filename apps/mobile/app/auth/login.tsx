import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { COLORS } from "../../constants";
import * as auth from "../../services/auth";
import { useAuthStore } from "../../store/auth-store";
import { PasswordInput } from "../../components/PasswordInput";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import { getApiErrorMessage } from "../../utils/errors";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password)
      return Alert.alert("Missing details", "Enter your email and password.");
    setLoading(true);
    try {
      const session = await auth.login({
        email: email.trim().toLowerCase(),
        password,
      });
      await useAuthStore.getState().setSession(session);
      router.back();
    } catch (error: any) {
      Alert.alert(
        "Could not log in",
        getApiErrorMessage(error, "Check your email and password."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={COLORS.muted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </View>

      <Button label="Log in" onPress={handleLogin} loading={loading} />
      <Text style={styles.or}>or</Text>
      <GoogleSignInButton />
      <Link href="/auth/reset" style={styles.link}>
        <Text style={styles.linkText}>Forgot password?</Text>
      </Link>

      <Link href="/auth/register" style={styles.link}>
        <Text style={styles.linkText}>
          Don&apos;t have an account? Create one
        </Text>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  link: {
    marginTop: 8,
    alignSelf: "center",
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 13,
  },
  or: { textAlign: "center", color: COLORS.muted },
});
