import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { COLORS } from "../constants";
import { useAuth } from "../hooks/useAuth";
import type { ListingType } from "../types";

export function FloatingCreateButton({ type }: { type?: ListingType }) {
  const { user, isAuthenticated } = useAuth();
  const [highlighted, setHighlighted] = useState(false);
  const opacity = useRef(new Animated.Value(0.5)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const openCreate = () => {
    setHighlighted(true);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, speed: 20 }),
    ]).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setHighlighted(false);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.5, duration: 350, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
    }, 2000);

    if (!isAuthenticated) return router.push("/auth/login");
    if (user?.role !== "AGENT") return router.push("/agent-profile");
    return router.push(type ? { pathname: "/create", params: { type } } : "/create/options");
  };

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create listing"
        onPress={openCreate}
        style={[styles.button, highlighted && styles.buttonActive]}
      >
        <Ionicons name="add" size={24} color={COLORS.text} />
        {highlighted && <Text style={styles.label}>Add listing</Text>}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: 18, bottom: 78, zIndex: 20 },
  button: {
    minWidth: 50,
    height: 50,
    paddingHorizontal: 12,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    backgroundColor: "#7C839066",
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  buttonActive: { backgroundColor: `${COLORS.primary}DD`, borderColor: COLORS.primary },
  label: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
});
