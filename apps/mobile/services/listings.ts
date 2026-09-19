import { apiClient } from "./api";
import type {
  HouseholdCategory,
  Listing,
  ListingType,
  PropertyType,
  PropertyOfferType,
  LandTenure,
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
  media?: { url: string; mediaType: "IMAGE" | "VIDEO" }[];
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
  return uploadMedia(uri, "image/jpeg");
}

export async function uploadMedia(uri: string, mimeType?: string) {
  const body = new FormData();
  const isVideo = mimeType?.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(uri);
  const type = mimeType || (isVideo ? "video/mp4" : "image/jpeg");
  const extension = type.split("/")[1] || (isVideo ? "mp4" : "jpg");
  body.append("file", {
    uri,
    name: `listing-${Date.now()}.${extension}`,
    type,
  } as any);
  const { data } = await apiClient.post<{ url: string }>("/uploads", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
}

export async function fetchMyListings(filters: Pick<ListingFilters, "q" | "type" | "createdAfter"> = {}) {
  const { data } = await apiClient.get<Listing[]>("/my-listings", { params: filters });
  return data;
}
