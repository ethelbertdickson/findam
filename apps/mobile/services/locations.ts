import { apiClient } from "./api";
import type { LocationSuggestion } from "../types";

export async function autocompleteLocations(
  q: string,
  bias?: { latitude: number; longitude: number },
) {
  const { data } = await apiClient.get<LocationSuggestion[]>(
    "/locations/autocomplete",
    {
      params: {
        q,
        limit: 6,
        latitude: bias?.latitude,
        longitude: bias?.longitude,
      },
      timeout: 35000,
    },
  );
  return data;
}
