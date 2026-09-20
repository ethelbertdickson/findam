import { apiClient } from "./api";
import { Platform } from "react-native";
import type {
  HouseholdCategory,
  Listing,
  ListingType,
  PropertyType,
  PropertyOfferType,
  LandTenure,
  CurrencyCode,
} from "../types";

export interface ListingPage {
  items: Listing[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}
export interface ListingFilters {
  q?: string;
  type?: ListingType;
  page?: number;
  limit?: number;
  propertyType?: PropertyType;
  offerType?: PropertyOfferType;
  bedrooms?: number;
  tenure?: LandTenure;
  category?: HouseholdCategory;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  isCoRenting?: boolean;
  createdAfter?: string;
}

export async function fetchListings(filters: ListingFilters = {}) {
  const endpoint =
    filters.latitude !== undefined &&
    filters.longitude !== undefined &&
    filters.radiusKm !== undefined
      ? "/listings/nearby"
      : "/listings";
  const { data } = await apiClient.get<ListingPage>(endpoint, {
    params: filters,
  });
  return data;
}

export async function fetchListing(id: string) {
  const { data } = await apiClient.get<Listing>(`/listings/${id}`);
  return data;
}

export async function fetchFavorites() {
  const { data } = await apiClient.get<Listing[]>("/favorites");
  return data;
}

export async function toggleFavorite(id: string, enabled: boolean) {
  await apiClient.request({
    url: `/favorites/${id}`,
    method: enabled ? "POST" : "DELETE",
  });
}

export interface ListingInput {
  type: ListingType;
  title: string;
  description: string;
  price: number;
  currencyCode?: CurrencyCode;
  areaName?: string;
  countryName?: string;
  countryCode?: string;
  stateName?: string;
  cityName?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  locationProvider?: string;
  locationPlaceId?: string;
  images?: string[];
  media?: { url: string; mediaType: "IMAGE" | "VIDEO"; thumbnailUrl?: string }[];
  propertyDetails?: Record<string, unknown>;
  landDetails?: Record<string, unknown>;
  householdDetails?: Record<string, unknown>;
}

export async function createListing(input: ListingInput) {
  const { data } = await apiClient.post<Listing>("/listings", input);
  return data;
}

export async function updateListing(id: string, input: ListingInput) {
  const { data } = await apiClient.patch<Listing>(`/listings/${id}`, input);
  return data;
}

export async function uploadImage(uri: string) {
  const uploaded = await uploadMedia(uri, "image/jpeg");
  return uploaded.url;
}

export async function uploadMedia(uri: string, mimeType?: string) {
  const body = new FormData();
  const isVideo = mimeType?.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(uri);
  const type = mimeType || (isVideo ? "video/mp4" : "image/jpeg");
  const extension = type.split("/")[1] || (isVideo ? "mp4" : "jpg");
  const filename = `listing-${Date.now()}.${extension}`;
  if (Platform.OS === "web") {
    // Expo web returns blob/object URLs. Browser FormData needs the actual
    // Blob, not React Native's native { uri, name, type } file shape.
    const response = await fetch(uri);
    const blob = await response.blob();
    body.append("file", blob, filename);
  } else {
    body.append("file", { uri, name: filename, type } as any);
  }
  const { data } = await apiClient.post<{ url: string; thumbnailUrl?: string }>("/uploads", body, {
    headers: { "Content-Type": "multipart/form-data" },
    // Video uploads are compressed by the media service before the URL is
    // returned. Give that server-side transcode enough time to complete.
    timeout: isVideo ? 120_000 : 30_000,
  });
  return data;
}

export async function fetchMyListings(filters: Pick<ListingFilters, "q" | "type" | "createdAfter"> = {}) {
  const { data } = await apiClient.get<Listing[]>("/my-listings", { params: filters });
  return data;
}
