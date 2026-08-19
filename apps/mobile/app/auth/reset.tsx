import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../../components/Button";
import { COLORS } from "../../constants";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "../../services/auth";
import { PasswordInput } from "../../components/PasswordInput";
import { getApiErrorMessage } from "../../utils/errors";

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const request = async () => {
    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      setRequested(true);
      if (result.developmentToken) setToken(result.developmentToken);
      Alert.alert(
        "Check your email",
        result.developmentToken
          ? "Development mode: the reset token has been filled in."
          : result.message,
      );
    } catch {
      Alert.alert("Unable to request reset", "Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const confirm = async () => {
    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      Alert.alert(
        "Password reset",
        "You can now log in with your new password.",
      );
      router.back();
    } catch (error: any) {
      Alert.alert(
        "Unable to reset password",
        getApiErrorMessage(error, "The token may have expired."),
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.note}>
        Enter your email to receive reset instructions.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={COLORS.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Button
        label="Send reset instructions"
        onPress={request}
        loading={loading}
        disabled={!email}
      />
      {requested && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Reset token"
            placeholderTextColor={COLORS.muted}
            value={token}
            onChangeText={setToken}
          />
          <PasswordInput
            placeholder="New password"
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />
          <Button
            label="Set new password"
            onPress={confirm}
            loading={loading}
            disabled={!token || password.length < 8}
          />
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    gap: 14,
  },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  note: { color: COLORS.muted, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
  },
});
