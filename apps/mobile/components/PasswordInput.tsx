import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { COLORS } from "../constants";

type PasswordInputProps = Omit<
  TextInputProps,
  "secureTextEntry" | "value" | "onChangeText"
> & {
  value: string;
  onChangeText: (value: string) => void;
};

export function PasswordInput({
  value,
  onChangeText,
  placeholderTextColor = COLORS.muted,
  style,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={placeholderTextColor}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, style]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        hitSlop={10}
        onPress={() => setVisible((current) => !current)}
        style={styles.toggle}
      >
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={22}
          color={COLORS.muted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 4,
    fontSize: 15,
    color: COLORS.text,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
