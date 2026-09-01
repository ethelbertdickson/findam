import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { COLORS } from "../constants";
import { autocompleteLocations } from "../services/locations";
import type { LocationSuggestion } from "../types";

export function LocationAutocomplete({
  label = "Location",
  placeholder = "Start typing an area, city or address",
  selected,
  onSelect,
  bias,
  required = false,
  allowCustom = false,
  onTextChange,
}: {
  label?: string;
  placeholder?: string;
  selected?: LocationSuggestion | null;
  onSelect: (location: LocationSuggestion | null) => void;
  bias?: { latitude: number; longitude: number };
  required?: boolean;
  allowCustom?: boolean;
  onTextChange?: (value: string) => void;
}) {
  const [text, setText] = useState(selected?.formattedAddress || "");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (selected?.formattedAddress && selected.formattedAddress !== text)
      setText(selected.formattedAddress);
  }, [selected?.formattedAddress]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);

  const confirmed = selected?.formattedAddress === text;
  const suggestions = useQuery({
    queryKey: ["location-autocomplete", debounced, bias],
    queryFn: () => autocompleteLocations(debounced, bias),
    enabled: focused && debounced.length >= 3 && !confirmed,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      <View style={[styles.inputWrap, focused && styles.inputFocused]}>
        <Ionicons name="location-outline" size={20} color={COLORS.muted} />
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(value) => {
            setText(value);
            onTextChange?.(value);
            if (selected) onSelect(null);
          }}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {suggestions.isFetching ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : text ? (
          <Pressable
            accessibilityLabel="Clear location"
            onPress={() => {
              setText("");
              setDebounced("");
              onTextChange?.("");
              onSelect(null);
            }}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>

      {focused && !confirmed && suggestions.data?.length ? (
        <View style={styles.suggestions}>
          {suggestions.data.map((item) => (
            <Pressable
              key={item.id}
              style={styles.suggestion}
              onPress={() => {
                setText(item.formattedAddress);
                onSelect(item);
                setFocused(false);
              }}
            >
              <Ionicons name="location" size={18} color={COLORS.primary} />
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {item.name || item.areaName || item.cityName}
                </Text>
                <Text style={styles.suggestionAddress} numberOfLines={2}>
                  {item.formattedAddress}
                </Text>
              </View>
            </Pressable>
          ))}
          <Text style={styles.attribution}>Powered by Geoapify · OpenStreetMap</Text>
        </View>
      ) : null}

      {suggestions.isError ? (
        <Text style={styles.error}>
          Location suggestions are temporarily unavailable. You can continue
          with a manually entered location.
        </Text>
      ) : selected ? (
        <View style={styles.confirmed}>
          <Ionicons name="checkmark-circle" size={17} color={COLORS.success} />
          <Text style={styles.confirmedText} numberOfLines={1}>
            {selected.cityName}, {selected.countryName}
          </Text>
        </View>
      ) : required && text.length > 0 ? (
        <Text style={styles.help}>
          {allowCustom
            ? "No exact match? You can continue with this location."
            : "Select one of the suggested locations."}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 7, zIndex: 5 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
  },
  inputFocused: { borderColor: COLORS.primary },
  input: { flex: 1, color: COLORS.text, paddingVertical: 13, fontSize: 15 },
  suggestions: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    overflow: "hidden",
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  suggestionText: { flex: 1 },
  suggestionTitle: { color: COLORS.text, fontWeight: "700" },
  suggestionAddress: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  attribution: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: "right",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmed: { flexDirection: "row", alignItems: "center", gap: 6 },
  confirmedText: { color: COLORS.muted, fontSize: 12, flex: 1 },
  help: { color: COLORS.muted, fontSize: 12 },
  error: { color: COLORS.danger, fontSize: 12 },
});
