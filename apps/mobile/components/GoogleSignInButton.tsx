import { FontAwesome } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { COLORS, GOOGLE_WEB_CLIENT_ID } from "../constants";
import * as auth from "../services/auth";
import { useAuthStore } from "../store/auth-store";
import { getApiErrorMessage } from "../utils/errors";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      return Alert.alert(
        "Google sign-in needs setup",
        "Add your Google OAuth client ID to the mobile and API environment files.",
      );
    }

    if (Constants.appOwnership === "expo") {
      return Alert.alert(
        "Development build required",
        "Google sign-in uses a native Google component and cannot run inside Expo Go.",
      );
    }

    setLoading(true);
    try {
      const { GoogleSignin } = await import(
        "@react-native-google-signin/google-signin"
      );
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type !== "success") return;

      const idToken = result.data.idToken;
      if (!idToken) throw new Error("Google did not return an ID token");

      const session = await auth.google(idToken);
      await useAuthStore.getState().setSession(session);
      router.back();
    } catch (error: any) {
      Alert.alert(
        "Could not sign in with Google",
        getApiErrorMessage(error, error?.message || "Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={handleGoogleSignIn}
      style={[styles.button, loading && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.text} />
      ) : (
        <>
          <FontAwesome name="google" size={18} color="#DB4437" />
          <Text style={styles.label}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.surface,
  },
  disabled: { opacity: 0.5 },
  label: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
});
