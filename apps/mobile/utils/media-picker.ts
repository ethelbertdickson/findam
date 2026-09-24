import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

type MediaChoice = "image" | "video";

export async function chooseMedia(
  kind: MediaChoice,
  options: { multiple?: boolean; maxDuration?: number } = {},
) {
  const source = await new Promise<"camera" | "library" | null>((resolve) => {
    if (Platform.OS === "web") {
      resolve("library");
      return;
    }
    Alert.alert("Add media", "Choose where to get your media from.", [
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      { text: "Camera", onPress: () => resolve("camera") },
      { text: "Gallery", onPress: () => resolve("library") },
    ]);
  });

  if (!source) return null;
  const mediaTypes: ImagePicker.MediaType[] = kind === "image" ? ["images"] : ["videos"];
  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes,
    quality: kind === "image" ? 0.75 : 0.7,
    ...(kind === "image" && source === "library" && options.multiple
      ? { allowsMultipleSelection: true, selectionLimit: 5 }
      : {}),
    ...(kind === "video" ? { videoMaxDuration: options.maxDuration ?? 60 } : {}),
  };

  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission required", "Allow camera access in device settings to take a photo or video.");
      return null;
    }
    return ImagePicker.launchCameraAsync(pickerOptions);
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Gallery permission required", "Allow photo and video access in device settings to choose media.");
    return null;
  }
  return ImagePicker.launchImageLibraryAsync(pickerOptions);
}
